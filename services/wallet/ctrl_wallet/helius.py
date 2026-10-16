"""Read-only Helius Enhanced history; no signing or submission endpoints."""
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from hashlib import sha256
import json
import time

import httpx

from .models import NormalizedEvent

SOL_MINT = "So11111111111111111111111111111111111111112"
ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
QUOTES = {"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
          "So11111111111111111111111111111111111111112": "SOL"}


def valid_address(value: str) -> bool:
    if not isinstance(value, str) or not 32 <= len(value) <= 44:
        return False
    n = 0
    for char in value:
        if char not in ALPHABET:
            return False
        n = n * 58 + ALPHABET.index(char)
    return (n.bit_length() + 7) // 8 + len(value) - len(value.lstrip("1")) == 32


@dataclass
class HistoryBatch:
    records: list[dict]
    sources: list[dict]
    exhausted: bool
    cursor: str | None
    warnings: list[str]


class ProviderError(Exception):
    """Contains only a provider name/status, never response bodies or request URLs."""


class HeliusHistory:
    def __init__(self, api_key: str, client: httpx.Client | None = None):
        self.api_key = api_key
        self.client = client

    def collect(self, wallet: str, cursor: str | None = None, budget: int = 2000) -> HistoryBatch:
        if not valid_address(wallet) or not 1 <= budget <= 2000:
            raise ValueError("Invalid wallet or record budget")
        if not self.api_key:
            raise ProviderError("Helius not configured")
        if self.client is not None:
            return self._collect(self.client, wallet, cursor, budget)
        with httpx.Client(timeout=20, follow_redirects=False) as client:
            return self._collect(client, wallet, cursor, budget)

    def _collect(self, client, wallet, cursor, budget):
        records, sources, warnings = {}, [], []
        consumed = 0
        pages = 0
        deadline = time.monotonic() + 120
        seen_cursors = {cursor} if cursor else set()
        while consumed < budget:
            if pages >= 40 or time.monotonic() >= deadline:
                warnings.append("page_budget_reached" if pages >= 40 else "time_budget_reached")
                return HistoryBatch(list(records.values()), sources, False, cursor, warnings)
            limit = min(100, budget - consumed)
            params = {"api-key": self.api_key, "limit": limit, "token-accounts": "all",
                      "commitment": "finalized", "sort-order": "desc"}
            if cursor:
                params["before-signature"] = cursor
            try:
                response = client.get(
                    f"https://api-mainnet.helius-rpc.com/v0/addresses/{wallet}/transactions",
                    params=params, timeout=min(20, max(0.1, deadline-time.monotonic())))
            except httpx.HTTPError:
                raise ProviderError("Helius connection unavailable") from None
            if response.status_code != 200:
                raise ProviderError(f"Helius status {response.status_code}")
            try:
                page = json.loads(response.content, parse_float=Decimal)
            except (ValueError, UnicodeError):
                raise ValueError("Helius response schema invalid") from None
            if not isinstance(page, list) or len(page) > limit or any(
                not isinstance(r, dict) or not isinstance(r.get("signature"), str)
                or not r["signature"] for r in page
            ):
                raise ValueError("Helius response schema invalid")
            sources.append({"provider": "helius", "payloadHash": sha256(response.content).hexdigest(),
                            "fetchedAt": datetime.now(timezone.utc).isoformat(),
                            "recordCount": len(page), "parserVersion": "ctrl-helius-v2"})
            if not page:
                return HistoryBatch(list(records.values()), sources, True, None, warnings)
            consumed += len(page)
            pages += 1
            for row in page:
                prior = records.get(row["signature"])
                if prior is not None and prior != row:
                    raise ValueError("Conflicting provider transaction")
                records[row["signature"]] = row
            next_cursor = page[-1]["signature"]
            if next_cursor in seen_cursors:
                warnings.append("repeated_cursor")
                return HistoryBatch(list(records.values()), sources, False, cursor, warnings)
            seen_cursors.add(next_cursor)
            cursor = next_cursor
        warnings.append("record_budget_reached")
        return HistoryBatch(list(records.values()), sources, False, cursor, warnings)


def token_amount(leg: dict) -> Decimal:
    raw = leg["rawTokenAmount"]
    decimals = int(raw["decimals"])
    if not 0 <= decimals <= 30:
        raise ValueError("Unsupported token decimals")
    amount = Decimal(str(raw["tokenAmount"])) / (Decimal(10) ** decimals)
    if not amount.is_finite() or amount <= 0:
        raise ValueError("Invalid token amount")
    return amount


def native_leg(entry: dict, wallet: str) -> dict:
    """Map a provider native swap leg to SOL units without inferring its USD value."""
    if not isinstance(entry, dict) or entry.get("account") != wallet:
        raise ValueError("Native swap owner unavailable")
    lamports = Decimal(str(entry.get("amount")))
    if (not lamports.is_finite() or lamports <= 0 or lamports > 2**64 - 1
            or lamports != lamports.to_integral_value()):
        raise ValueError("Invalid native amount")
    return {"mint": SOL_MINT, "userAccount": wallet,
            "rawTokenAmount": {"tokenAmount": str(lamports), "decimals": 9}}


def normalize_records(records: list[dict], wallet: str, mint: str):
    events, warnings = [], set()
    for row in records:
        if row.get("transactionError") is not None:
            continue
        transfers = row.get("tokenTransfers") or []
        swap = (row.get("events") or {}).get("swap")
        try:
            if not isinstance(swap, dict) or row.get("type") != "SWAP":
                if any(t.get("mint") == mint for t in transfers):
                    warnings.add("unsupported_token_activity")
                continue
            inputs = list(swap.get("tokenInputs") or [])
            outputs = list(swap.get("tokenOutputs") or [])
            if swap.get("nativeInput") is not None:
                inputs.append(native_leg(swap["nativeInput"], wallet))
            if swap.get("nativeOutput") is not None:
                outputs.append(native_leg(swap["nativeOutput"], wallet))
            # Ambiguous multi-leg routes are intentionally not guessed.
            if len(inputs) != 1 or len(outputs) != 1:
                warnings.add("unsupported_swap_route")
                continue
            incoming, outgoing = outputs[0], inputs[0]
            # SOL wrap/unwrap and same-asset conversions are not economic trades.
            if incoming.get("mint") == outgoing.get("mint"):
                warnings.add("unsupported_swap_route")
                continue
            side = "buy" if incoming.get("mint") == mint else "sell"
            token, quote = (incoming, outgoing) if side == "buy" else (outgoing, incoming)
            if token.get("mint") != mint:
                continue
            if quote.get("mint") not in QUOTES or token.get("userAccount") != wallet or quote.get("userAccount") != wallet:
                warnings.add("unsupported_swap_route")
                continue
            quantity, quote_quantity = token_amount(token), token_amount(quote)
            warnings.add("historical_usd_price_unavailable")
            warnings.add("fees_usd_unavailable")
            events.append(NormalizedEvent(
                normalized_event_id=f"{wallet}:{row['signature']}:0", wallet_address=wallet,
                signature=row["signature"], timestamp=int(row["timestamp"]), event_ordinal=0,
                token_mint=mint, side=side, quantity=quantity, price_usd=None, notional_usd=None,
                dex=row.get("source"), fee_usd=None, input_mint=outgoing["mint"],
                output_mint=incoming["mint"], input_amount_ui=token_amount(outgoing),
                output_amount_ui=token_amount(incoming), source_confidence="parsed_provider",
                slot=int(row["slot"]), provider_name="helius", counter_mint=quote["mint"],
                counter_quantity=quote_quantity, quote_asset_type=QUOTES[quote["mint"]],
                provenance={"transactionIndex": row.get("transactionIndex", 0),
                            "inputAssetRepresentation": "native" if swap.get("nativeInput") is not None else "spl",
                            "outputAssetRepresentation": "native" if swap.get("nativeOutput") is not None else "spl"},
                warning_codes=("historical_usd_price_unavailable", "fees_usd_unavailable"),
            ))
            if row.get("transactionIndex") is None:
                warnings.add("transaction_order_unverified")
        except (KeyError, TypeError, ValueError, InvalidOperation):
            warnings.add("unsupported_token_activity")
    return events, sorted(warnings)

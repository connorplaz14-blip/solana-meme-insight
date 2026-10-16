"""Single-wallet, single-mint facade over the provenance-pinned FIFO core."""
from decimal import Decimal
from dataclasses import replace

from .models import NormalizedEvent
from .reconstruct import reconstruct_trades


def decimal_string(value: Decimal | None) -> str | None:
    if value is None:
        return None
    text = format(value, "f")
    return text.rstrip("0").rstrip(".") if "." in text else text


def analyze_events(events: list[NormalizedEvent]) -> dict:
    identities = {(e.chain, e.wallet_address, e.token_mint) for e in events}
    if len(identities) > 1:
        raise ValueError("Analysis requires one wallet and one token")
    if events and any(e.slot is None for e in events) and any(e.slot is not None for e in events):
        raise ValueError("Mixed verified and unverified chain order")
    unique = {}
    canonical = {}
    warnings = set()
    for event in events:
        for amount in (event.quantity, event.price_usd, event.notional_usd, event.fee_usd):
            if amount is not None and (not amount.is_finite() or amount < 0):
                raise ValueError("Amounts must be finite and nonnegative")
        if event.quantity <= 0:
            raise ValueError("Quantity must be positive")
        identity = (event.chain, event.wallet_address, event.token_mint, event.signature, event.event_ordinal)
        previous = canonical.get(identity)
        if previous is not None:
            if replace(event, normalized_event_id=previous.normalized_event_id) != previous:
                raise ValueError("Conflicting canonical event")
            continue
        canonical[identity] = event
        prior = unique.get(event.normalized_event_id)
        if prior is not None and prior != event:
            raise ValueError("Conflicting event identity")
        unique[event.normalized_event_id] = event
    supported = []
    for event in unique.values():
        warnings.update(event.warning_codes)
        if event.side not in {"buy", "sell"}:
            warnings.add("unsupported_event")
            continue
        if event.slot is None:
            warnings.add("order_unverified")
        supported.append(event)
    # Without transfer basis reconciliation, do not match through an unknown flow.
    unknown_flow = "unsupported_event" in warnings
    result = reconstruct_trades([] if unknown_flow else supported)
    if any("exceeded open inventory" in message for message in result.warnings):
        warnings.add("oversell")
    for cycle in result.trade_cycles:
        warnings.update(cycle.warning_codes)
    matches = []
    gross = Decimal(0)
    net = Decimal(0)
    complete_gross = True
    complete_net = True
    for match in result.closed_lot_matches:
        value = (match.proceeds_usd - match.cost_basis_usd
                 if match.proceeds_usd is not None and match.cost_basis_usd is not None else None)
        if value is None:
            complete_gross = False
        else:
            gross += value
        if match.realized_pnl_usd is None:
            complete_net = False
            warnings.add("fees_or_prices_unavailable")
        else:
            net += match.realized_pnl_usd
        row = match.to_dict()
        row["entry_signature"] = unique[match.entry_event_id].signature
        row["exit_signature"] = unique[match.exit_event_id].signature
        row["gross_pnl_usd"] = decimal_string(value)
        matches.append(row)
    remaining = sum((lot.remaining_quantity for lot in result.inventory_lots), Decimal(0))
    fees = None if not supported or unknown_flow or any(e.fee_usd is None for e in supported) else sum(
        (e.fee_usd for e in supported), Decimal(0))
    invalid = not supported or bool(warnings & {"oversell", "unsupported_event"})
    return {
        "method": "ctrl-fifo-v1", "grossPnlUsd": decimal_string(gross) if complete_gross and not invalid else None,
        "netPnlUsd": decimal_string(net) if complete_net and not invalid else None,
        "knownGrossPnlUsd": decimal_string(gross), "feesUsd": decimal_string(fees),
        "remainingQuantity": None if unknown_flow else decimal_string(remaining), "matches": matches,
        "lots": [lot.to_dict() for lot in result.inventory_lots],
        "warnings": sorted(warnings), "eventCount": len(unique),
    }

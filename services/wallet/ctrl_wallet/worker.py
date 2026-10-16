"""Durable queue consumer; safe to restart and run in parallel with lease isolation."""
from datetime import datetime, timezone
import os
import time

from .accounting import analyze_events
from .helius import HeliusHistory, HistoryBatch, normalize_records
from .store import AnalysisStore


def build_analysis(version: str, wallet: str, mint: str, batch: HistoryBatch) -> dict:
    events, parser_warnings = normalize_records(batch.records, wallet, mint)
    accounting = analyze_events(events)
    warnings = set(batch.warnings + parser_warnings + accounting["warnings"])
    # Even an exhausted indexer response does not independently verify historical
    # token-account ownership or Token-2022 program support.
    warnings.add("token_account_history_unverified")
    if not events:
        warnings.add("no_supported_priced_trades")
    if warnings & {"unsupported_token_activity", "unsupported_swap_route", "transaction_order_unverified"}:
        accounting["matches"] = []
        accounting["lots"] = []
        accounting["remainingQuantity"] = None
    accounting["grossPnlUsd"] = None
    accounting["netPnlUsd"] = None
    times = [r["timestamp"] for r in batch.records if isinstance(r.get("timestamp"), int)]
    observed = datetime.fromtimestamp(max(times), timezone.utc).isoformat() if times else None
    fetched = batch.sources[-1]["fetchedAt"] if batch.sources else None
    return {
        "version": version, "wallet": wallet, "mint": mint,
        "method": "ctrl-fifo-v1", "accounting": accounting,
        "coverage": {"status": "partial", "historyExhausted": batch.exhausted,
                     "transactionCount": len(batch.records), "recordBudget": 2000,
                     "warnings": sorted(warnings)},
        "sources": batch.sources, "resumeCursor": batch.cursor,
        "events": [event.to_dict() for event in events],
        "observedAt": observed, "fetchedAt": fetched,
        "computedAt": datetime.now(timezone.utc).isoformat(),
    }


def run_once(store: AnalysisStore, provider: HeliusHistory) -> bool:
    job = store.claim()
    if job is None:
        return False
    try:
        batch = provider.collect(job["wallet"])
        result = build_analysis(job["id"], job["wallet"], job["mint"], batch)
        store.complete(job["id"], job["lease"], result)
    except Exception:
        # Provider URLs, keys, SQL and raw bodies must never become job errors.
        store.fail(job["id"], job["lease"], "analysis_unavailable")
    return True


def main():
    url = os.environ.get("CTRL_DATABASE_URL")
    key = os.environ.get("HELIUS_API_KEY")
    if not url or not key:
        raise SystemExit("Configure CTRL_DATABASE_URL and HELIUS_API_KEY before starting worker")
    store = AnalysisStore(url)
    provider = HeliusHistory(key)
    while True:
        if not run_once(store, provider):
            time.sleep(2)


if __name__ == "__main__":
    main()

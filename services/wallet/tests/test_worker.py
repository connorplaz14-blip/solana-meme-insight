from ctrl_wallet.helius import HistoryBatch


def test_worker_withholds_totals_when_history_is_partial():
    from ctrl_wallet.worker import build_analysis
    batch = HistoryBatch([], [{"provider": "helius", "payloadHash": "abc", "fetchedAt": "2026-10-16T00:00:00Z"}], False, "cursor", ["record_budget_reached"])
    result = build_analysis("version", "wallet", "mint", batch)
    assert result["version"] == "version"
    assert result["coverage"]["status"] == "partial"
    assert result["accounting"]["netPnlUsd"] is None
    assert result["accounting"]["grossPnlUsd"] is None
    assert result["observedAt"] is None
    assert result["resumeCursor"] == "cursor"


def test_unsupported_token_activity_withholds_inaccurate_lot_links():
    from ctrl_wallet.worker import build_analysis
    batch = HistoryBatch([{"signature": "transfer", "type": "TRANSFER", "tokenTransfers": [{"mint": "mint"}]}], [], True, None, [])
    result = build_analysis("version", "wallet", "mint", batch)
    assert result["accounting"]["matches"] == []
    assert result["accounting"]["remainingQuantity"] is None


def test_worker_runs_one_claim_and_persists_before_returning(store):
    from ctrl_wallet.worker import run_once
    import uuid
    job = store.enqueue("wallet", "mint", str(uuid.uuid4()))
    class Provider:
        def collect(self, wallet):
            return HistoryBatch([], [], True, None, [])
    assert run_once(store, Provider()) is True
    result = store.get(job["id"])
    assert result["status"] == "complete"
    assert result["analysis"]["wallet"] == "wallet"

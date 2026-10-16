import uuid
import pytest


def test_job_idempotency_and_analysis_survives_new_connection(store):
    from ctrl_wallet.store import AnalysisStore
    key = str(uuid.uuid4())
    job = store.enqueue("wallet", "mint", key)
    assert store.enqueue("wallet", "mint", key)["id"] == job["id"]
    with pytest.raises(ValueError):
        store.enqueue("other", "mint", key)
    claimed = store.claim()
    assert claimed["id"] == job["id"]
    result = {"version": job["id"], "netPnlUsd": "7", "sources": [{"payloadHash": "abc"}]}
    store.complete(job["id"], claimed["lease"], result)
    fresh = AnalysisStore(store.database_url)
    assert fresh.get(job["id"])["analysis"] == result
    with pytest.raises(ValueError):
        fresh.complete(job["id"], claimed["lease"], {"netPnlUsd": "999"})


def test_claim_excludes_other_workers_and_rejects_wrong_lease(store):
    job = store.enqueue("wallet", "mint", str(uuid.uuid4()))
    claimed = store.claim()
    assert claimed["id"] == job["id"]
    assert store.claim() is None
    with pytest.raises(ValueError):
        store.complete(job["id"], str(uuid.uuid4()), {"netPnlUsd": "999"})
    store.fail(job["id"], claimed["lease"], "provider_unavailable")
    assert store.get(job["id"])["error"] == "provider_unavailable"


def test_unknown_job_returns_none(store):
    assert store.get(str(uuid.uuid4())) is None

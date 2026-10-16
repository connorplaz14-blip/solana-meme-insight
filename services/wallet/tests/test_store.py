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


def test_expired_lease_reclaimed_and_old_worker_cannot_mutate_result(store):
    job = store.enqueue("wallet", "mint", str(uuid.uuid4()))
    original = store.claim()
    with store.connect() as conn:
        conn.execute("UPDATE ctrl_wallet_jobs SET lease_until=now()-interval '1 second' WHERE id=%s", (job["id"],))
    # Exercise expiry independently of lease replacement: the UUID still matches.
    store.fail(job["id"], original["lease"], "expired_worker")
    assert store.get(job["id"])["status"] == "running"
    with pytest.raises(ValueError):
        store.complete(job["id"], original["lease"], {"version": "expired"})
    replacement = store.claim()
    assert replacement["id"] == original["id"]
    assert replacement["lease"] != original["lease"]
    store.fail(job["id"], original["lease"], "stale_worker")
    assert store.get(job["id"])["status"] == "running"
    with pytest.raises(ValueError):
        store.complete(job["id"], original["lease"], {"version": "stale"})
    expected = {"version": job["id"], "netPnlUsd": None}
    store.complete(job["id"], replacement["lease"], expected)
    store.fail(job["id"], replacement["lease"], "late_failure")
    assert store.get(job["id"])["analysis"] == expected
    assert store.enqueue("wallet", "mint", job_key(store, job["id"]))["analysis"] == expected


def job_key(store, job_id):
    with store.connect() as conn:
        return conn.execute("SELECT request_key FROM ctrl_wallet_jobs WHERE id=%s", (job_id,)).fetchone()["request_key"]


def test_concurrent_workers_claim_each_job_once(store):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    barrier = Barrier(8)
    expected = {store.enqueue("wallet", "mint", str(uuid.uuid4()))["id"] for _ in range(8)}
    def claim(_):
        barrier.wait(timeout=10)
        return store.claim()

    with ThreadPoolExecutor(max_workers=8) as pool:
        claimed = list(pool.map(claim, range(8)))
    assert {job["id"] for job in claimed} == expected
    assert len({job["lease"] for job in claimed}) == 8
    assert store.claim() is None


def test_admission_limit_preserves_idempotency_and_serializes_concurrent_requests(store):
    from concurrent.futures import ThreadPoolExecutor
    from ctrl_wallet.store import QueueFull
    key = str(uuid.uuid4())
    first = store.enqueue("wallet", "mint", key)

    def enqueue(_):
        try:
            return store.enqueue("wallet", "mint", str(uuid.uuid4()))["id"]
        except QueueFull:
            return None

    with ThreadPoolExecutor(max_workers=8) as pool:
        accepted = list(pool.map(enqueue, range(25)))
    assert sum(value is not None for value in accepted) == 19
    assert store.enqueue("wallet", "mint", key)["id"] == first["id"]
    with pytest.raises(QueueFull):
        store.enqueue("wallet", "mint", str(uuid.uuid4()))


def test_failed_payload_insert_rolls_back_job_completion(store):
    job = store.enqueue("wallet", "mint", str(uuid.uuid4()))
    claimed = store.claim()
    # Jsonb cannot serialize a set: failure occurs after the status UPDATE.
    with pytest.raises(TypeError):
        store.complete(job["id"], claimed["lease"], {"invalid": {1, 2}})
    persisted = store.get(job["id"])
    assert persisted["status"] == "running"
    assert persisted["analysis"] is None
    expected = {"version": job["id"], "netPnlUsd": None}
    store.complete(job["id"], claimed["lease"], expected)
    assert store.get(job["id"])["analysis"] == expected

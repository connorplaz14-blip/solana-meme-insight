from fastapi.testclient import TestClient

WALLET = "So11111111111111111111111111111111111111112"
MINT = "11111111111111111111111111111111"


def test_api_requires_authorization_and_configuration():
    from ctrl_wallet.api import create_app
    client = TestClient(create_app(None, "a" * 32))
    assert client.post("/jobs", json={"wallet": WALLET, "mint": MINT}).status_code == 401
    assert client.post("/jobs", headers={"Authorization": "Bearer wrong"}, json={"wallet": WALLET, "mint": MINT}).status_code == 401
    response = client.post("/jobs", headers={"Authorization": "Bearer " + "a" * 32}, json={"wallet": WALLET, "mint": MINT, "requestKey": "key"})
    assert response.status_code == 503
    assert "database" not in response.text.lower()


def test_api_validates_public_keys_before_storage():
    from ctrl_wallet.api import create_app
    client = TestClient(create_app(None, "a" * 32))
    response = client.post("/jobs", headers={"Authorization": "Bearer " + "a" * 32}, json={"wallet": "bad", "mint": MINT, "requestKey": "key"})
    assert response.status_code == 422


def test_default_configuration_denies_access():
    from ctrl_wallet.api import create_app
    client = TestClient(create_app(None, ""))
    assert client.get("/jobs/00000000-0000-0000-0000-000000000000", headers={"Authorization": "Bearer "}).status_code == 401


def test_queue_capacity_is_returned_as_backpressure():
    from ctrl_wallet.api import create_app
    from ctrl_wallet.store import QueueFull
    class FullStore:
        def enqueue(self, *args):
            raise QueueFull()
    client = TestClient(create_app(FullStore(), "a" * 32))
    response = client.post("/jobs", headers={"Authorization": "Bearer " + "a" * 32}, json={"wallet": WALLET, "mint": MINT, "requestKey": "key"})
    assert response.status_code == 429

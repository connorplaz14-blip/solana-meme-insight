import httpx
import pytest

WALLET = "So11111111111111111111111111111111111111112"
MINT = "11111111111111111111111111111111"
USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"


def history(handler):
    from ctrl_wallet.helius import HeliusHistory
    return HeliusHistory("private-test-key", httpx.Client(transport=httpx.MockTransport(handler)))


def test_history_paginates_dedupes_and_records_sources():
    pages = [[{"signature": "a", "timestamp": 2, "slot": 2},
              {"signature": "b", "timestamp": 1, "slot": 1}], []]
    def handle(request):
        assert request.url.params["token-accounts"] == "all"
        if len(pages) == 1:
            assert request.url.params["before-signature"] == "b"
        return httpx.Response(200, json=pages.pop(0))
    result = history(handle).collect(WALLET, budget=3)
    assert len(result.records) == 2
    assert result.exhausted is True
    assert result.cursor is None
    assert len(result.sources[0]["payloadHash"]) == 64
    assert "private-test-key" not in str(result.sources)


def test_record_budget_is_total_not_unique_and_preserves_resume():
    def handle(request):
        assert request.url.params["limit"] == "2"
        return httpx.Response(200, json=[{"signature": "a"}, {"signature": "b"}])
    result = history(handle).collect(WALLET, budget=2)
    assert result.cursor == "b"
    assert result.exhausted is False
    assert "record_budget_reached" in result.warnings


def test_repeated_cursor_stops_with_partial_coverage():
    provider = history(lambda request: httpx.Response(200, json=[{"signature": "a"}]))
    result = provider.collect(WALLET, budget=5)
    assert result.exhausted is False
    assert "repeated_cursor" in result.warnings
    assert len(result.records) == 1


@pytest.mark.parametrize("status", [403, 429, 500])
def test_provider_errors_are_secret_safe(status):
    with pytest.raises(Exception) as error:
        history(lambda request: httpx.Response(status, text="private-test-key")).collect(WALLET)
    assert "private-test-key" not in str(error.value)
    assert str(status) in str(error.value)


def test_malformed_provider_schema_rejected():
    with pytest.raises(ValueError):
        history(lambda request: httpx.Response(200, json={"bad": True})).collect(WALLET)


def test_oversized_response_rejected_without_losing_cursor():
    with pytest.raises(ValueError):
        history(lambda request: httpx.Response(200, json=[{"signature": "a"}, {"signature": "b"}])).collect(WALLET, budget=1)


def test_invalid_keys_rejected_without_network():
    with pytest.raises(ValueError):
        history(lambda request: pytest.fail("network called")).collect("0-not-base58")


def test_stable_swap_preserves_gross_and_unknown_native_fee():
    from ctrl_wallet.helius import normalize_records
    record = {"signature": "buy", "timestamp": 1, "slot": 1, "fee": 5000,
              "feePayer": WALLET, "transactionError": None, "type": "SWAP", "source": "JUPITER",
              "tokenTransfers": [], "nativeTransfers": [], "accountData": [],
              "events": {"swap": {"tokenInputs": [{"mint": USDC, "userAccount": WALLET,
                  "rawTokenAmount": {"tokenAmount": "10000000", "decimals": 6}}],
                  "tokenOutputs": [{"mint": MINT, "userAccount": WALLET,
                  "rawTokenAmount": {"tokenAmount": "100", "decimals": 0}}]}}}
    events, warnings = normalize_records([record], WALLET, MINT)
    assert events[0].quantity == 100
    assert events[0].notional_usd is None
    assert events[0].counter_quantity == 10
    assert events[0].fee_usd is None
    assert "historical_usd_price_unavailable" in warnings


def test_failed_transaction_and_transfer_cannot_create_pnl():
    from ctrl_wallet.helius import normalize_records
    events, warnings = normalize_records([
        {"signature": "failed", "transactionError": {"error": "failure"}},
        {"signature": "transfer", "type": "TRANSFER", "tokenTransfers": [{"mint": MINT}]},
    ], WALLET, MINT)
    assert events == []
    assert "unsupported_token_activity" in warnings


def test_tiny_unique_pages_cannot_trigger_thousands_of_requests():
    calls = 0
    def handle(request):
        nonlocal calls
        calls += 1
        return httpx.Response(200, json=[{"signature": f"sig-{calls}"}])
    result = history(handle).collect(WALLET)
    assert calls <= 40
    assert result.exhausted is False
    assert "page_budget_reached" in result.warnings

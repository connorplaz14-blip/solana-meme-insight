from dataclasses import replace
from decimal import Decimal as D

from ctrl_wallet.models import NormalizedEvent
from ctrl_wallet.reconstruct import reconstruct_trades
import pytest


def event(name, side, quantity="10", price="1", fee="1", **kwargs):
    return NormalizedEvent(
        normalized_event_id=name, wallet_address="wallet", signature=name,
        timestamp=1 if side == "buy" else 2, event_ordinal=0, token_mint="mint",
        side=side, quantity=D(quantity), price_usd=D(price) if price else None,
        notional_usd=D(quantity) * D(price) if price else None, dex=None,
        fee_usd=D(fee) if fee is not None else None,
        input_mint="quote" if side == "buy" else "mint",
        output_mint="mint" if side == "buy" else "quote",
        input_amount_ui=D(quantity), output_amount_ui=D(quantity),
        source_confidence="synthetic-test", **kwargs,
    )


def test_cycle_counts_entry_fee_once():
    result = reconstruct_trades([event("b", "buy"), event("s", "sell", price="2", fee="2")])
    assert result.trade_cycles[0].total_fees_usd == D("3")
    assert result.closed_lot_matches[0].realized_pnl_usd == D("7")


def test_unknown_fees_withhold_net_profit():
    result = reconstruct_trades([event("b", "buy", fee=None), event("s", "sell", price="2")])
    assert result.closed_lot_matches[0].realized_pnl_usd is None


def test_model_serialization_keeps_exact_decimal():
    result = event("b", "buy", quantity="0.000000000000000001").to_dict()
    assert result["quantity"] == "0.000000000000000001"


def analyze(events):
    from ctrl_wallet.accounting import analyze_events
    return analyze_events(events)


def test_facade_deduplicates_and_preserves_gross_and_net():
    buy = event("b", "buy")
    result = analyze([buy, buy, event("s", "sell", price="2", fee="2")])
    assert result["grossPnlUsd"] == "10"
    assert result["netPnlUsd"] == "7"
    assert result["feesUsd"] == "3"
    assert result["remainingQuantity"] == "0"
    assert result["matches"][0]["entry_signature"] == "b"
    assert result["matches"][0]["exit_signature"] == "s"


def test_partial_fifo_and_missing_fees_are_separate():
    result = analyze([event("a", "buy", quantity="10", fee="1"),
                      event("b", "buy", quantity="5", price="2", fee="1"),
                      event("c", "sell", quantity="12", price="3", fee="2")])
    assert result["grossPnlUsd"] == "22"
    assert result["netPnlUsd"] == "18.6"
    assert result["remainingQuantity"] == "3"
    assert len(result["matches"]) == 2


def test_unknown_fee_and_oversell_withhold_complete_totals():
    unknown = analyze([event("b", "buy", fee=None), event("s", "sell", price="2")])
    assert unknown["netPnlUsd"] is None
    assert unknown["grossPnlUsd"] == "10"
    oversell = analyze([event("b", "buy", quantity="2"), event("s", "sell", price="3")])
    assert oversell["netPnlUsd"] is None
    assert "oversell" in oversell["warnings"]


@pytest.mark.parametrize("mutation", [
    {"wallet_address": "another"}, {"token_mint": "another"},
    {"quantity": D("NaN")}, {"quantity": D("-1")}, {"fee_usd": D("-1")},
])
def test_invalid_or_mixed_input_is_rejected(mutation):
    with pytest.raises(ValueError):
        analyze([event("b", "buy"), replace(event("s", "sell"), **mutation)])


def test_conflicting_duplicate_rejected():
    buy = event("b", "buy")
    with pytest.raises(ValueError):
        analyze([buy, replace(buy, quantity=D("9"))])


def test_slot_order_precedes_signature_order():
    buy = replace(event("z-buy", "buy", slot=1), timestamp=1)
    sell = replace(event("a-sell", "sell", price="2", slot=2), timestamp=1)
    result = analyze([sell, buy])
    assert result["grossPnlUsd"] == "10"


def test_unknown_transfer_basis_not_treated_as_buy():
    result = analyze([event("t", "transfer_in"), event("s", "sell", price="2")])
    assert result["netPnlUsd"] is None
    assert "unsupported_event" in result["warnings"]


def test_sell_without_acquisition_is_unknown_not_zero_profit():
    result = analyze([event("s", "sell", price="3")])
    assert result["netPnlUsd"] is None
    assert result["grossPnlUsd"] is None
    assert "oversell" in result["warnings"]


def test_transfer_out_cannot_leave_a_profitable_match():
    result = analyze([event("b", "buy"), event("t", "transfer_out"),
                      event("s", "sell", price="2")])
    assert result["matches"] == []
    assert result["remainingQuantity"] is None


def test_mixed_chain_order_is_rejected_instead_of_comparing_slot_to_unix_time():
    with pytest.raises(ValueError):
        analyze([replace(event("b", "buy", slot=123), timestamp=1700000000),
                 replace(event("s", "sell"), timestamp=1700000001)])


def test_empty_events_do_not_imply_zero_fees_or_profit():
    result = analyze([])
    assert result["feesUsd"] is None
    assert result["netPnlUsd"] is None


def test_same_chain_event_with_alternate_id_cannot_double_inventory():
    buy = event("b", "buy")
    result = analyze([buy, replace(buy, normalized_event_id="alternate"),
                      event("s", "sell", price="2", fee="2")])
    assert result["eventCount"] == 2
    assert result["remainingQuantity"] == "0"


def test_canonical_duplicate_with_conflicting_quantity_is_rejected():
    buy = event("b", "buy")
    with pytest.raises(ValueError):
        analyze([buy, replace(buy, normalized_event_id="alternate", quantity=D("20"))])

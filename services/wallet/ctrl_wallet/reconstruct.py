from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from decimal import Decimal

from .models import (
    ClosedLotMatch,
    FieldResolutionRecord,
    InventoryLot,
    NormalizedEvent,
    OpenLot,
    ReconstructionResult,
    ReconstructedWalletTrade,
    TradeCycle,
    WalletEvent,
)
from .truth import DERIVED_FROM_SOURCE, UNRESOLVED_NOT_EXPOSED

ZERO = Decimal("0")
HUNDRED = Decimal("100")


@dataclass(slots=True)
class _CycleAccumulator:
    trade_cycle_id: str
    wallet_address: str
    token_mint: str
    first_entry_time: int
    first_entry_signature: str
    entry_count: int = 0
    exit_count: int = 0
    total_tokens_bought: Decimal = ZERO
    total_tokens_sold: Decimal = ZERO
    remaining_inventory: Decimal = ZERO
    entry_price_weighted_sum: Decimal = ZERO
    exit_price_weighted_sum: Decimal = ZERO
    total_usd_spent_sum: Decimal = ZERO
    total_usd_received_sum: Decimal = ZERO
    realized_pnl_sum: Decimal = ZERO
    realized_cost_basis_sum: Decimal = ZERO
    total_fees_usd_sum: Decimal = ZERO
    has_entry_price_samples: bool = False
    has_exit_price_samples: bool = False
    usd_spent_complete: bool = True
    usd_received_complete: bool = True
    realized_pnl_complete: bool = True
    realized_cost_basis_complete: bool = True
    fees_complete: bool = True
    last_matched_exit_time: int | None = None
    last_exit_signature: str | None = None
    warning_codes: list[str] = field(default_factory=list)

    def add_warning(self, code: str) -> None:
        if code and code not in self.warning_codes:
            self.warning_codes.append(code)


def reconstruct_trades(events: list[NormalizedEvent] | list[WalletEvent]) -> ReconstructionResult:
    normalized_events = [_coerce_normalized_event(event) for event in events]
    ordered_events = sorted(
        normalized_events,
        key=lambda value: (
            value.slot if value.slot is not None else value.timestamp,
            value.provenance.get("transactionIndex", 0),
            value.event_ordinal,
            value.signature,
        ),
    )

    open_lot_state: dict[str, list[dict[str, object]]] = defaultdict(list)
    inventory_lot_state: dict[str, dict[str, object]] = {}
    active_cycles: dict[str, _CycleAccumulator] = {}
    closed_lot_matches: list[ClosedLotMatch] = []
    trade_cycles: list[TradeCycle] = []
    warnings: list[str] = []
    field_records: list[FieldResolutionRecord] = []

    for event in ordered_events:
        if event.side == "buy":
            cycle = active_cycles.get(event.token_mint)
            if cycle is None or cycle.remaining_inventory <= ZERO:
                cycle = _open_cycle(event)
                active_cycles[event.token_mint] = cycle

            cycle.entry_count += 1
            cycle.total_tokens_bought += event.quantity
            cycle.remaining_inventory += event.quantity
            _accumulate_entry_metrics(cycle=cycle, event=event)

            lot_state = {
                "inventory_lot_id": event.normalized_event_id,
                "wallet_address": event.wallet_address,
                "token_mint": event.token_mint,
                "source_event_id": event.normalized_event_id,
                "trade_cycle_id": cycle.trade_cycle_id,
                "opened_at": event.timestamp,
                "opened_signature": event.signature,
                "opened_event_ordinal": event.event_ordinal,
                "opened_quantity": event.quantity,
                "remaining_quantity": event.quantity,
                "entry_unit_price_usd": event.price_usd,
                "entry_notional_usd": event.notional_usd,
                "entry_fee_usd": event.fee_usd,
                "status": "open",
                "warning_codes": tuple(event.warning_codes),
                "provenance": {"entry_event_id": event.normalized_event_id},
            }
            open_lot_state[event.token_mint].append(lot_state)
            inventory_lot_state[event.normalized_event_id] = lot_state
            continue

        if event.side != "sell":
            warnings.append(f"Skipped event {event.signature}: unsupported side {event.side!r}.")
            continue

        lots = open_lot_state[event.token_mint]
        cycle = active_cycles.get(event.token_mint)
        remaining_quantity = event.quantity
        matched_quantity_total = ZERO
        match_ordinal = 0

        while remaining_quantity > ZERO and lots:
            lot_state = lots[0]
            lot_remaining = Decimal(lot_state["remaining_quantity"])
            matched_quantity = min(remaining_quantity, lot_remaining)
            if matched_quantity <= ZERO:
                lots.pop(0)
                continue

            entry_unit_price = lot_state["entry_unit_price_usd"]
            exit_unit_price = event.price_usd
            cost_basis = _matched_notional(
                total_notional=lot_state["entry_notional_usd"],
                matched_quantity=matched_quantity,
                total_quantity=Decimal(lot_state["opened_quantity"]),
                unit_price=entry_unit_price,
            )
            proceeds = _matched_notional(
                total_notional=event.notional_usd,
                matched_quantity=matched_quantity,
                total_quantity=event.quantity,
                unit_price=exit_unit_price,
            )
            entry_fee_usd = _allocate_fee(
                total_fee=lot_state.get("entry_fee_usd"),
                matched_quantity=matched_quantity,
                total_quantity=Decimal(lot_state["opened_quantity"]),
            )
            exit_fee_usd = _allocate_fee(
                total_fee=event.fee_usd,
                matched_quantity=matched_quantity,
                total_quantity=event.quantity,
            )
            realized_pnl = None
            if (cost_basis is not None and proceeds is not None
                    and entry_fee_usd is not None and exit_fee_usd is not None):
                realized_pnl = proceeds - cost_basis - entry_fee_usd - exit_fee_usd

            realized_roi_pct = None
            if realized_pnl is not None and cost_basis is not None and cost_basis > ZERO:
                realized_roi_pct = (realized_pnl / cost_basis) * HUNDRED

            hold_duration_seconds = max(0, event.timestamp - int(lot_state["opened_at"]))
            match_warning_codes = _build_match_warning_codes(
                entry_unit_price=entry_unit_price,
                exit_unit_price=exit_unit_price,
                cost_basis=cost_basis,
                proceeds=proceeds,
                event=event,
                lot_state=lot_state,
            )

            match = ClosedLotMatch(
                closed_lot_match_id=_build_closed_lot_match_id(
                    exit_event_id=event.normalized_event_id,
                    entry_lot_id=str(lot_state["inventory_lot_id"]),
                    match_ordinal=match_ordinal,
                ),
                wallet_address=event.wallet_address,
                token_mint=event.token_mint,
                trade_cycle_id=str(lot_state["trade_cycle_id"]),
                entry_lot_id=str(lot_state["inventory_lot_id"]),
                entry_event_id=str(lot_state["source_event_id"]),
                exit_event_id=event.normalized_event_id,
                entry_time=int(lot_state["opened_at"]),
                exit_time=event.timestamp,
                matched_quantity=matched_quantity,
                entry_unit_price_usd=entry_unit_price,
                exit_unit_price_usd=exit_unit_price,
                cost_basis_usd=cost_basis,
                proceeds_usd=proceeds,
                realized_pnl_usd=realized_pnl,
                warning_codes=tuple(match_warning_codes),
                realized_roi_pct=realized_roi_pct,
                hold_duration_seconds=hold_duration_seconds,
                entry_fee_usd=entry_fee_usd,
                exit_fee_usd=exit_fee_usd,
                provenance={
                    "entry_event_id": lot_state["source_event_id"],
                    "exit_event_id": event.normalized_event_id,
                    "derived_from": ["cost_basis_usd", "proceeds_usd", "entry_fee_usd", "exit_fee_usd"],
                },
            )
            closed_lot_matches.append(match)
            field_records.extend(_match_field_records(match))

            if cycle is not None:
                _accumulate_exit_metrics(cycle=cycle, event=event, match=match)

            lot_state["remaining_quantity"] = lot_remaining - matched_quantity
            lot_state["status"] = "closed" if Decimal(lot_state["remaining_quantity"]) <= ZERO else "open"
            remaining_quantity -= matched_quantity
            matched_quantity_total += matched_quantity
            match_ordinal += 1

            if Decimal(lot_state["remaining_quantity"]) <= ZERO:
                lots.pop(0)

        if cycle is not None and matched_quantity_total > ZERO:
            cycle.exit_count += 1

        if remaining_quantity > ZERO:
            warning_message = (
                f"Sell {event.signature} exceeded open inventory for {event.token_mint}; "
                f"skipped {remaining_quantity.normalize()} units."
            )
            warnings.append(warning_message)
            if cycle is not None:
                cycle.add_warning("oversell")

        if cycle is not None and cycle.remaining_inventory <= ZERO:
            trade_cycle = _build_trade_cycle(cycle, status="closed")
            trade_cycles.append(trade_cycle)
            field_records.extend(_cycle_field_records(trade_cycle))
            active_cycles.pop(event.token_mint, None)

    for token_mint, cycle in active_cycles.items():
        if cycle.remaining_inventory > ZERO:
            trade_cycle = _build_trade_cycle(cycle, status="open")
            trade_cycles.append(trade_cycle)
            field_records.extend(_cycle_field_records(trade_cycle))
        open_lot_state[token_mint] = [
            lot for lot in open_lot_state[token_mint] if Decimal(lot["remaining_quantity"]) > ZERO
        ]

    inventory_lots = [
        InventoryLot(
            inventory_lot_id=str(lot["inventory_lot_id"]),
            wallet_address=str(lot["wallet_address"]),
            token_mint=str(lot["token_mint"]),
            source_event_id=str(lot["source_event_id"]),
            trade_cycle_id=str(lot["trade_cycle_id"]),
            opened_at=int(lot["opened_at"]),
            opened_signature=str(lot["opened_signature"]),
            opened_event_ordinal=int(lot["opened_event_ordinal"]),
            opened_quantity=Decimal(lot["opened_quantity"]),
            remaining_quantity=Decimal(lot["remaining_quantity"]),
            entry_unit_price_usd=lot["entry_unit_price_usd"],
            entry_notional_usd=lot["entry_notional_usd"],
            status=str(lot["status"]),
            warning_codes=tuple(lot["warning_codes"]),
            entry_fee_usd=lot.get("entry_fee_usd"),
            provenance=dict(lot.get("provenance") or {}),
        )
        for lot in sorted(
            inventory_lot_state.values(),
            key=lambda value: (
                int(value["opened_at"]),
                str(value["opened_signature"]),
                int(value["opened_event_ordinal"]),
            ),
        )
    ]
    open_lots = _build_open_lot_compatibility_view(inventory_lots)
    trade_cycles.sort(key=lambda value: (value.first_entry_time, value.first_entry_signature, value.trade_cycle_id))
    closed_trades = [
        trade_cycle_to_reconstructed_trade(cycle)
        for cycle in trade_cycles
        if cycle.status == "closed"
    ]

    return ReconstructionResult(
        closed_trades=closed_trades,
        open_lots=open_lots,
        inventory_lots=inventory_lots,
        closed_lot_matches=closed_lot_matches,
        trade_cycles=trade_cycles,
        warnings=warnings,
        field_resolution_records=_dedupe_field_records(field_records),
    )


def trade_cycle_to_reconstructed_trade(cycle: TradeCycle) -> ReconstructedWalletTrade:
    warning_codes = list(cycle.warning_codes)
    status = "closed"
    pnl_usd = cycle.realized_pnl_usd
    if pnl_usd is None:
        status = "closed_missing_price"
        if "missing_cycle_pnl" not in warning_codes:
            warning_codes.append("missing_cycle_pnl")
    if cycle.avg_entry_price is None and "missing_entry_price" not in warning_codes:
        status = "closed_missing_price"
        warning_codes.append("missing_entry_price")
    if cycle.avg_exit_price is None and "missing_exit_price" not in warning_codes:
        status = "closed_missing_price"
        warning_codes.append("missing_exit_price")

    return ReconstructedWalletTrade(
        wallet_address=cycle.wallet_address,
        token_mint=cycle.token_mint,
        entry_signature=cycle.first_entry_signature,
        exit_signature=cycle.last_exit_signature or cycle.first_entry_signature,
        entry_time=cycle.first_entry_time,
        exit_time=cycle.last_exit_time or cycle.first_entry_time,
        quantity=cycle.total_tokens_sold,
        entry_price_usd=cycle.avg_entry_price,
        exit_price_usd=cycle.avg_exit_price,
        entry_notional_usd=cycle.total_usd_spent,
        exit_notional_usd=cycle.total_usd_received,
        pnl_usd=pnl_usd,
        roi_pct=cycle.realized_roi_pct,
        hold_seconds=cycle.hold_duration_seconds or 0,
        status=status,
        warning_codes=tuple(warning_codes),
        total_fees_usd=cycle.total_fees_usd,
        path_analytics=cycle.path_analytics,
        execution_proxy=cycle.execution_proxy,
    )


def _open_cycle(event: NormalizedEvent) -> _CycleAccumulator:
    return _CycleAccumulator(
        trade_cycle_id=_build_trade_cycle_id(event),
        wallet_address=event.wallet_address,
        token_mint=event.token_mint,
        first_entry_time=event.timestamp,
        first_entry_signature=event.signature,
    )


def _accumulate_entry_metrics(*, cycle: _CycleAccumulator, event: NormalizedEvent) -> None:
    if event.price_usd is None:
        cycle.add_warning("missing_entry_price")
    else:
        cycle.entry_price_weighted_sum += event.quantity * event.price_usd
        cycle.has_entry_price_samples = True
    if event.notional_usd is None:
        cycle.usd_spent_complete = False
        cycle.add_warning("missing_entry_notional")
    else:
        cycle.total_usd_spent_sum += event.notional_usd
    if event.fee_usd is None:
        cycle.fees_complete = False
    else:
        cycle.total_fees_usd_sum += event.fee_usd
    for warning_code in event.warning_codes:
        cycle.add_warning(warning_code)


def _accumulate_exit_metrics(*, cycle: _CycleAccumulator, event: NormalizedEvent, match: ClosedLotMatch) -> None:
    cycle.total_tokens_sold += match.matched_quantity
    cycle.remaining_inventory -= match.matched_quantity
    cycle.last_matched_exit_time = event.timestamp
    cycle.last_exit_signature = event.signature
    if event.price_usd is None:
        cycle.add_warning("missing_exit_price")
    else:
        cycle.exit_price_weighted_sum += match.matched_quantity * event.price_usd
        cycle.has_exit_price_samples = True
    if match.proceeds_usd is None:
        cycle.usd_received_complete = False
        cycle.add_warning("missing_exit_notional")
    else:
        cycle.total_usd_received_sum += match.proceeds_usd
    if match.cost_basis_usd is None:
        cycle.realized_cost_basis_complete = False
    else:
        cycle.realized_cost_basis_sum += match.cost_basis_usd
    if match.realized_pnl_usd is None:
        cycle.realized_pnl_complete = False
    else:
        cycle.realized_pnl_sum += match.realized_pnl_usd
    if match.entry_fee_usd is None or match.exit_fee_usd is None:
        cycle.fees_complete = False
    else:
        # Entry fees were counted when inventory was acquired, including open lots.
        cycle.total_fees_usd_sum += match.exit_fee_usd
    for warning_code in match.warning_codes:
        cycle.add_warning(warning_code)
    for warning_code in event.warning_codes:
        cycle.add_warning(warning_code)


def _build_trade_cycle(cycle: _CycleAccumulator, *, status: str) -> TradeCycle:
    avg_entry_price = cycle.entry_price_weighted_sum / cycle.total_tokens_bought if cycle.has_entry_price_samples and cycle.total_tokens_bought > ZERO else None
    avg_exit_price = cycle.exit_price_weighted_sum / cycle.total_tokens_sold if cycle.has_exit_price_samples and cycle.total_tokens_sold > ZERO else None
    total_usd_spent = cycle.total_usd_spent_sum if cycle.usd_spent_complete else None
    total_usd_received = cycle.total_usd_received_sum if cycle.usd_received_complete else None
    realized_pnl_usd = cycle.realized_pnl_sum if cycle.realized_pnl_complete else None
    realized_roi_pct = None
    if cycle.realized_pnl_complete and cycle.realized_cost_basis_complete and cycle.realized_cost_basis_sum > ZERO:
        realized_roi_pct = (cycle.realized_pnl_sum / cycle.realized_cost_basis_sum) * HUNDRED
    hold_duration_seconds = None
    last_exit_time = cycle.last_matched_exit_time if status == "closed" else None
    if status == "closed" and cycle.last_matched_exit_time is not None:
        hold_duration_seconds = max(0, cycle.last_matched_exit_time - cycle.first_entry_time)
    return TradeCycle(
        trade_cycle_id=cycle.trade_cycle_id,
        wallet_address=cycle.wallet_address,
        token_mint=cycle.token_mint,
        status=status,
        first_entry_time=cycle.first_entry_time,
        last_exit_time=last_exit_time,
        first_entry_signature=cycle.first_entry_signature,
        last_exit_signature=cycle.last_exit_signature,
        entry_count=cycle.entry_count,
        exit_count=cycle.exit_count,
        total_tokens_bought=cycle.total_tokens_bought,
        total_tokens_sold=cycle.total_tokens_sold,
        avg_entry_price=avg_entry_price,
        avg_exit_price=avg_exit_price,
        total_usd_spent=total_usd_spent,
        total_usd_received=total_usd_received,
        realized_pnl_usd=realized_pnl_usd,
        realized_roi_pct=realized_roi_pct,
        hold_duration_seconds=hold_duration_seconds,
        remaining_inventory=max(cycle.remaining_inventory, ZERO),
        warning_codes=tuple(cycle.warning_codes),
        total_fees_usd=cycle.total_fees_usd_sum if cycle.fees_complete else None,
        pricing_valid=realized_pnl_usd is not None and avg_entry_price is not None and avg_exit_price is not None,
        reconstruction_valid="oversell" not in cycle.warning_codes,
        provenance={
            "closed": status == "closed",
            "fee_complete": cycle.fees_complete,
            "realized_cost_basis_complete": cycle.realized_cost_basis_complete,
        },
    )


def _build_open_lot_compatibility_view(inventory_lots: list[InventoryLot]) -> dict[str, list[OpenLot]]:
    open_lots: dict[str, list[OpenLot]] = defaultdict(list)
    for lot in inventory_lots:
        if lot.remaining_quantity <= ZERO:
            continue
        open_lots[lot.token_mint].append(
            OpenLot(
                wallet_address=lot.wallet_address,
                token_mint=lot.token_mint,
                entry_time=lot.opened_at,
                entry_price_usd=lot.entry_unit_price_usd,
                entry_notional_usd=lot.entry_notional_usd,
                quantity=lot.opened_quantity,
                remaining_quantity=lot.remaining_quantity,
                signature=lot.opened_signature,
                original_index=lot.opened_event_ordinal,
            )
        )
    return dict(open_lots)


def _coerce_normalized_event(event: NormalizedEvent | WalletEvent) -> NormalizedEvent:
    if isinstance(event, NormalizedEvent):
        return event
    return NormalizedEvent(
        normalized_event_id=f"{event.wallet_address}:{event.signature}:{event.original_index}",
        wallet_address=event.wallet_address,
        signature=event.signature,
        timestamp=event.timestamp,
        event_ordinal=event.original_index,
        token_mint=event.token_mint,
        side=event.side,
        quantity=event.quantity,
        price_usd=event.price_usd,
        notional_usd=event.notional_usd,
        dex=event.dex,
        fee_usd=event.fee_usd,
        input_mint="",
        output_mint=event.token_mint,
        input_amount_ui=event.quantity,
        output_amount_ui=event.quantity,
        source_confidence="compatibility",
        pricing_source=None,
        warning_codes=(),
    )


def _build_trade_cycle_id(event: NormalizedEvent) -> str:
    return f"{event.wallet_address}:{event.token_mint}:{event.normalized_event_id}"


def _build_closed_lot_match_id(*, exit_event_id: str, entry_lot_id: str, match_ordinal: int) -> str:
    return f"{exit_event_id}:{entry_lot_id}:{match_ordinal}"


def _matched_notional(
    *,
    total_notional: Decimal | None,
    matched_quantity: Decimal,
    total_quantity: Decimal,
    unit_price: Decimal | None,
) -> Decimal | None:
    if total_notional is not None and total_quantity > ZERO:
        return total_notional * (matched_quantity / total_quantity)
    if unit_price is None:
        return None
    return matched_quantity * unit_price


def _allocate_fee(
    *,
    total_fee: object,
    matched_quantity: Decimal,
    total_quantity: Decimal,
) -> Decimal | None:
    if total_quantity <= ZERO:
        return None
    if total_fee is None:
        return None
    fee_value = total_fee if isinstance(total_fee, Decimal) else Decimal(str(total_fee))
    return fee_value * (matched_quantity / total_quantity)


def _build_match_warning_codes(
    *,
    entry_unit_price: Decimal | None,
    exit_unit_price: Decimal | None,
    cost_basis: Decimal | None,
    proceeds: Decimal | None,
    event: NormalizedEvent,
    lot_state: dict[str, object],
) -> list[str]:
    warning_codes: list[str] = []
    if entry_unit_price is None:
        warning_codes.append("missing_entry_price")
    if exit_unit_price is None:
        warning_codes.append("missing_exit_price")
    if cost_basis is None:
        warning_codes.append("missing_cost_basis")
    if proceeds is None:
        warning_codes.append("missing_proceeds")
    for warning_code in lot_state["warning_codes"]:
        if warning_code not in warning_codes:
            warning_codes.append(str(warning_code))
    for warning_code in event.warning_codes:
        if warning_code not in warning_codes:
            warning_codes.append(warning_code)
    return warning_codes


def _match_field_records(match: ClosedLotMatch) -> list[FieldResolutionRecord]:
    return [
        FieldResolutionRecord(
            resolution_id=f"closed_lot_match:{match.closed_lot_match_id}:realized_pnl_usd",
            entity_type="closed_lot_match",
            entity_id=match.closed_lot_match_id,
            field_name="realized_pnl_usd",
            resolution_status=DERIVED_FROM_SOURCE if match.realized_pnl_usd is not None else UNRESOLVED_NOT_EXPOSED,
            direct_or_derived="derived" if match.realized_pnl_usd is not None else "unresolved",
            formula_used="proceeds_usd - cost_basis_usd - entry_fee_usd - exit_fee_usd" if match.realized_pnl_usd is not None else None,
            dependency_fields=("proceeds_usd", "cost_basis_usd", "entry_fee_usd", "exit_fee_usd"),
        ),
        FieldResolutionRecord(
            resolution_id=f"closed_lot_match:{match.closed_lot_match_id}:realized_roi_pct",
            entity_type="closed_lot_match",
            entity_id=match.closed_lot_match_id,
            field_name="realized_roi_pct",
            resolution_status=DERIVED_FROM_SOURCE if match.realized_roi_pct is not None else UNRESOLVED_NOT_EXPOSED,
            direct_or_derived="derived" if match.realized_roi_pct is not None else "unresolved",
            formula_used="realized_pnl_usd / cost_basis_usd * 100" if match.realized_roi_pct is not None else None,
            dependency_fields=("realized_pnl_usd", "cost_basis_usd"),
        ),
    ]


def _cycle_field_records(cycle: TradeCycle) -> list[FieldResolutionRecord]:
    return [
        FieldResolutionRecord(
            resolution_id=f"trade_cycle:{cycle.trade_cycle_id}:realized_pnl_usd",
            entity_type="trade_cycle",
            entity_id=cycle.trade_cycle_id,
            field_name="realized_pnl_usd",
            resolution_status=DERIVED_FROM_SOURCE if cycle.realized_pnl_usd is not None else UNRESOLVED_NOT_EXPOSED,
            direct_or_derived="derived" if cycle.realized_pnl_usd is not None else "unresolved",
            formula_used="sum(closed_lot_match.realized_pnl_usd)" if cycle.realized_pnl_usd is not None else None,
            dependency_fields=("closed_lot_match.realized_pnl_usd",),
        ),
        FieldResolutionRecord(
            resolution_id=f"trade_cycle:{cycle.trade_cycle_id}:realized_roi_pct",
            entity_type="trade_cycle",
            entity_id=cycle.trade_cycle_id,
            field_name="realized_roi_pct",
            resolution_status=DERIVED_FROM_SOURCE if cycle.realized_roi_pct is not None else UNRESOLVED_NOT_EXPOSED,
            direct_or_derived="derived" if cycle.realized_roi_pct is not None else "unresolved",
            formula_used="realized_pnl_usd / realized_cost_basis * 100" if cycle.realized_roi_pct is not None else None,
            dependency_fields=("realized_pnl_usd", "realized_cost_basis"),
        ),
    ]


def _dedupe_field_records(records: list[FieldResolutionRecord]) -> list[FieldResolutionRecord]:
    return list({record.resolution_id: record for record in records}.values())


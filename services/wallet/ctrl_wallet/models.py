from __future__ import annotations

from dataclasses import dataclass, field, fields, is_dataclass
from decimal import Decimal
from typing import Any

from .truth import WANTED_BUT_UNAVAILABLE_DEFAULTS


def to_serializable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return format(value, "f")
    if is_dataclass(value):
        return {
            model_field.name: to_serializable(getattr(value, model_field.name))
            for model_field in fields(value)
        }
    if isinstance(value, dict):
        return {
            str(key): to_serializable(item)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [to_serializable(item) for item in value]
    return value


class SerializableMixin:
    def to_dict(self) -> dict[str, Any]:
        serialized = to_serializable(self)
        if not isinstance(serialized, dict):
            raise TypeError("SerializableMixin.to_dict() expects a dataclass dictionary.")
        return serialized


@dataclass(frozen=True, slots=True)
class WalletProfile(SerializableMixin):
    wallet_address: str
    label: str | None = None


@dataclass(frozen=True, slots=True)
class SourcePayload(SerializableMixin):
    payload_id: str
    provider_name: str
    payload_kind: str
    endpoint_name: str | None = None
    run_id: str | None = None
    wallet_address: str | None = None
    signature: str | None = None
    entity_type: str | None = None
    entity_id: str | None = None
    target_timestamp: int | None = None
    source_timestamp: int | None = None
    fetched_at: str | None = None
    http_status: int | None = None
    success: bool | None = None
    payload_hash: str | None = None
    raw_payload_json: str | None = None


@dataclass(frozen=True, slots=True)
class RawTransactionRecord(SerializableMixin):
    raw_transaction_id: str
    wallet_address: str
    signature: str
    timestamp: int | None
    slot: int | None
    success: bool | None
    provider_name: str
    fee_lamports: int | None = None
    priority_fee_lamports: int | None = None
    fee_payer: str | None = None
    transaction_version: str | None = None
    compute_units: int | None = None
    source_name: str | None = None
    transaction_type: str | None = None
    parser_source: str | None = None
    error_detail: dict[str, Any] | None = None
    account_keys: tuple[str, ...] = ()
    loaded_addresses: tuple[str, ...] = ()
    native_transfers: tuple[dict[str, Any], ...] = ()
    token_transfers: tuple[dict[str, Any], ...] = ()
    native_balance_deltas: tuple[dict[str, Any], ...] = ()
    token_balance_deltas: tuple[dict[str, Any], ...] = ()
    instructions: tuple[dict[str, Any], ...] = ()
    inner_instructions: tuple[dict[str, Any], ...] = ()
    log_messages: tuple[str, ...] = ()
    return_data: dict[str, Any] | None = None
    swap_data: dict[str, Any] | None = None
    ambiguity_status: str = "resolved"
    enhanced_payload_id: str | None = None
    parse_payload_id: str | None = None
    canonical_payload_id: str | None = None
    raw_payload_json: str | None = None


@dataclass(frozen=True, slots=True)
class WalletEvent(SerializableMixin):
    wallet_address: str
    signature: str
    timestamp: int
    original_index: int
    token_mint: str
    side: str
    quantity: Decimal
    price_usd: Decimal | None
    notional_usd: Decimal | None
    dex: str | None
    fee_usd: Decimal | None


@dataclass(frozen=True, slots=True)
class PricingLookupAttempt(SerializableMixin):
    attempt_id: str
    run_id: str | None
    wallet_address: str
    normalized_event_id: str
    token_mint: str
    step_name: str
    source_name: str
    endpoint_name: str
    resolution_status: str
    reason_code: str | None = None
    pair_address: str | None = None
    target_event_time: int | None = None
    lookup_time: int | None = None
    source_timestamp: int | None = None
    nearest_match_distance_seconds: int | None = None
    request_params: dict[str, Any] = field(default_factory=dict)
    warning_codes: tuple[str, ...] = ()
    raw_payload_reference: str | None = None


@dataclass(frozen=True, slots=True)
class FieldResolutionRecord(SerializableMixin):
    resolution_id: str
    entity_type: str
    entity_id: str
    field_name: str
    resolution_status: str
    direct_or_derived: str
    source_name: str | None = None
    endpoint_name: str | None = None
    target_timestamp: int | None = None
    source_timestamp: int | None = None
    match_distance_seconds: int | None = None
    raw_payload_reference: str | None = None
    formula_used: str | None = None
    dependency_fields: tuple[str, ...] = ()
    reason_code: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class EventSnapshotLink(SerializableMixin):
    normalized_event_id: str
    snapshot_id: str
    role: str


@dataclass(frozen=True, slots=True)
class TradeCycleSnapshotLink(SerializableMixin):
    trade_cycle_id: str
    snapshot_id: str
    role: str


@dataclass(frozen=True, slots=True)
class TradeCyclePathAnalytics(SerializableMixin):
    trade_cycle_id: str
    peak_price_usd_during_hold: Decimal | None = None
    trough_price_usd_during_hold: Decimal | None = None
    mfe_usd: Decimal | None = None
    mfe_pct: Decimal | None = None
    mae_usd: Decimal | None = None
    mae_pct: Decimal | None = None
    captured_move_pct: Decimal | None = None
    missed_upside_pct: Decimal | None = None
    avoided_downside_pct: Decimal | None = None
    time_to_peak_seconds: int | None = None
    time_to_trough_seconds: int | None = None
    methodology: str | None = None
    confidence: str | None = None


@dataclass(frozen=True, slots=True)
class TradeCycleExecutionProxy(SerializableMixin):
    trade_cycle_id: str
    delayed_entry_price_5s: Decimal | None = None
    delayed_entry_price_15s: Decimal | None = None
    delayed_entry_price_30s: Decimal | None = None
    delayed_entry_price_60s: Decimal | None = None
    delayed_exit_price_5s: Decimal | None = None
    delayed_exit_price_15s: Decimal | None = None
    delayed_exit_price_30s: Decimal | None = None
    delayed_exit_price_60s: Decimal | None = None
    slippage_proxy_pct: Decimal | None = None
    execution_penalty_pct: Decimal | None = None
    copyability_confidence: str | None = None
    methodology: str | None = None
    derived_proxy: bool = True


@dataclass(frozen=True, slots=True)
class NormalizedEvent(SerializableMixin):
    normalized_event_id: str
    wallet_address: str
    signature: str
    timestamp: int
    event_ordinal: int
    token_mint: str
    side: str
    quantity: Decimal
    price_usd: Decimal | None
    notional_usd: Decimal | None
    dex: str | None
    fee_usd: Decimal | None
    input_mint: str
    output_mint: str
    input_amount_ui: Decimal
    output_amount_ui: Decimal
    source_confidence: str
    provider_name: str | None = None
    route_hops: int | None = None
    raw_transaction_id: str | None = None
    pricing_source: str | None = None
    warning_codes: tuple[str, ...] = ()
    slot: int | None = None
    chain: str = "solana"
    source_provider: str | None = None
    parser_source: str | None = None
    ingestion_run_id: str | None = None
    symbol: str | None = None
    counter_mint: str | None = None
    counter_quantity: Decimal | None = None
    quote_asset_type: str | None = None
    route_programs: tuple[str, ...] = ()
    route_hop_count: int | None = None
    market_address: str | None = None
    pair_address: str | None = None
    price_resolution_method: str | None = None
    price_reference_asset: str | None = None
    fee_lamports: int | None = None
    token_fee_amount: Decimal | None = None
    token_fee_usd: Decimal | None = None
    native_fee_amount: Decimal | None = None
    native_fee_usd: Decimal | None = None
    confidence: str | None = None
    ambiguity_status: str = "resolved"
    provenance: dict[str, Any] = field(default_factory=dict)
    unresolved_fields: dict[str, Any] = field(default_factory=dict)
    source_payload_ids: tuple[str, ...] = ()
    market_snapshot_ids: tuple[str, ...] = ()


@dataclass(slots=True)
class OpenLot(SerializableMixin):
    wallet_address: str
    token_mint: str
    entry_time: int
    entry_price_usd: Decimal | None
    entry_notional_usd: Decimal | None
    quantity: Decimal
    remaining_quantity: Decimal
    signature: str
    original_index: int


@dataclass(frozen=True, slots=True)
class InventoryLot(SerializableMixin):
    inventory_lot_id: str
    wallet_address: str
    token_mint: str
    source_event_id: str
    trade_cycle_id: str
    opened_at: int
    opened_signature: str
    opened_event_ordinal: int
    opened_quantity: Decimal
    remaining_quantity: Decimal
    entry_unit_price_usd: Decimal | None
    entry_notional_usd: Decimal | None
    status: str
    warning_codes: tuple[str, ...] = ()
    entry_fee_usd: Decimal | None = None
    provenance: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class ClosedLotMatch(SerializableMixin):
    closed_lot_match_id: str
    wallet_address: str
    token_mint: str
    trade_cycle_id: str
    entry_lot_id: str
    entry_event_id: str
    exit_event_id: str
    entry_time: int
    exit_time: int
    matched_quantity: Decimal
    entry_unit_price_usd: Decimal | None
    exit_unit_price_usd: Decimal | None
    cost_basis_usd: Decimal | None
    proceeds_usd: Decimal | None
    realized_pnl_usd: Decimal | None
    warning_codes: tuple[str, ...] = ()
    realized_roi_pct: Decimal | None = None
    hold_duration_seconds: int | None = None
    entry_fee_usd: Decimal | None = None
    exit_fee_usd: Decimal | None = None
    provenance: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class TradeCycle(SerializableMixin):
    trade_cycle_id: str
    wallet_address: str
    token_mint: str
    status: str
    first_entry_time: int
    last_exit_time: int | None
    first_entry_signature: str
    last_exit_signature: str | None
    entry_count: int
    exit_count: int
    total_tokens_bought: Decimal
    total_tokens_sold: Decimal
    avg_entry_price: Decimal | None
    avg_exit_price: Decimal | None
    total_usd_spent: Decimal | None
    total_usd_received: Decimal | None
    realized_pnl_usd: Decimal | None
    realized_roi_pct: Decimal | None
    hold_duration_seconds: int | None
    remaining_inventory: Decimal
    warning_codes: tuple[str, ...] = ()
    total_fees_usd: Decimal | None = None
    entry_liquidity_usd: Decimal | None = None
    exit_liquidity_usd: Decimal | None = None
    entry_fdv: Decimal | None = None
    exit_fdv: Decimal | None = None
    entry_market_cap: Decimal | None = None
    exit_market_cap: Decimal | None = None
    path_analytics: TradeCyclePathAnalytics | None = None
    execution_proxy: TradeCycleExecutionProxy | None = None
    pricing_valid: bool | None = None
    reconstruction_valid: bool | None = None
    provenance: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class ReconstructedWalletTrade(SerializableMixin):
    wallet_address: str
    token_mint: str
    entry_signature: str
    exit_signature: str
    entry_time: int
    exit_time: int
    quantity: Decimal
    entry_price_usd: Decimal | None
    exit_price_usd: Decimal | None
    entry_notional_usd: Decimal | None
    exit_notional_usd: Decimal | None
    pnl_usd: Decimal | None
    roi_pct: Decimal | None
    hold_seconds: int
    status: str
    warning_codes: tuple[str, ...] = ()
    total_fees_usd: Decimal | None = None
    path_analytics: TradeCyclePathAnalytics | None = None
    execution_proxy: TradeCycleExecutionProxy | None = None


@dataclass(frozen=True, slots=True)
class WalletSummary(SerializableMixin):
    wallet_address: str
    total_swaps: int
    total_buys: int
    total_sells: int
    distinct_tokens: int
    first_seen: str | None
    last_seen: str | None
    avg_hold_seconds: float | None
    closed_trades: int
    realized_pnl_usd: float | None


@dataclass(frozen=True, slots=True)
class FetchResult(SerializableMixin):
    items: list[dict[str, Any]]
    warnings: list[str] = field(default_factory=list)
    unresolved_ambiguous_signatures: tuple[str, ...] = ()
    enhanced_transactions: list[dict[str, Any]] = field(default_factory=list)
    parsed_transactions: list[dict[str, Any]] = field(default_factory=list)
    canonical_transactions: list[dict[str, Any]] = field(default_factory=list)
    raw_transaction_records: list[RawTransactionRecord] = field(default_factory=list)
    source_payloads: list[SourcePayload] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class NormalizationResult(SerializableMixin):
    events: list[WalletEvent]
    normalized_events: list[NormalizedEvent] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    field_resolution_records: list[FieldResolutionRecord] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class ReconstructionResult(SerializableMixin):
    closed_trades: list[ReconstructedWalletTrade]
    open_lots: dict[str, list[OpenLot]]
    inventory_lots: list[InventoryLot] = field(default_factory=list)
    closed_lot_matches: list[ClosedLotMatch] = field(default_factory=list)
    trade_cycles: list[TradeCycle] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    trade_cycle_snapshot_links: list[TradeCycleSnapshotLink] = field(default_factory=list)
    trade_cycle_path_analytics: list[TradeCyclePathAnalytics] = field(default_factory=list)
    trade_cycle_execution_proxies: list[TradeCycleExecutionProxy] = field(default_factory=list)
    field_resolution_records: list[FieldResolutionRecord] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class WalletMetrics(SerializableMixin):
    wallet_address: str
    total_swaps: int
    total_buys: int
    total_sells: int
    distinct_tokens: int
    first_seen: str | None
    last_seen: str | None
    realized_pnl_usd: float | None
    closed_trade_count: int
    priced_closed_trade_count: int
    win_rate: float | None
    median_roi_pct: float | None
    expectancy_usd: float | None
    avg_hold_seconds: float | None
    median_hold_seconds: float | None
    largest_token_share: float | None
    missing_price_trade_count: int
    average_roi_pct: float | None = None
    expectancy_pct: float | None = None
    avg_hold_minutes: float | None = None
    median_hold_minutes: float | None = None
    total_fees_usd: float | None = None
    unresolved_event_count: int = 0
    unresolved_trade_count: int = 0
    pricing_coverage_pct: float | None = None
    source_completeness_pct: float | None = None
    reconstruction_completeness_pct: float | None = None
    pricing_valid: bool = False
    source_completeness_valid: bool = False
    reconstruction_valid: bool = False
    ranking_eligibility: bool = False


@dataclass(frozen=True, slots=True)
class WalletAggregate(SerializableMixin):
    wallet_address: str
    total_normalized_events: int
    distinct_tokens: int
    closed_cycle_count: int
    open_cycle_count: int
    realized_pnl_usd: float | None
    win_rate: float | None
    median_roi_pct: float | None
    expectancy_usd: float | None
    avg_hold_seconds: float | None
    median_hold_seconds: float | None
    total_cycles: int = 0
    priced_closed_trade_count: int = 0
    average_roi_pct: float | None = None
    expectancy_pct: float | None = None
    average_hold_minutes: float | None = None
    median_hold_minutes: float | None = None
    total_fees_usd: float | None = None
    unresolved_event_count: int = 0
    unresolved_trade_count: int = 0
    pricing_coverage_pct: float | None = None
    source_completeness_pct: float | None = None
    reconstruction_completeness_pct: float | None = None
    pricing_completeness_pct: float | None = None
    ranking_valid: bool = False
    pricing_valid: bool = False
    source_completeness_valid: bool = False
    reconstruction_valid: bool = False
    ranking_eligibility: bool = False
    provenance_summary: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class MarketSnapshot(SerializableMixin):
    snapshot_id: str
    mint: str
    timestamp: int
    source: str
    price_usd: Decimal | None
    confidence: str | None = None
    raw_payload_json: str | None = None
    pair_address: str | None = None
    liquidity_usd: Decimal | None = None
    fdv: Decimal | None = None
    market_cap: Decimal | None = None
    circulating_supply: Decimal | None = None
    total_supply: Decimal | None = None
    holder_count: int | None = None
    top10_holder_concentration: Decimal | None = None
    smart_money_count: int | None = None
    volume_30m: Decimal | None = None
    volume_1h: Decimal | None = None
    volume_2h: Decimal | None = None
    volume_4h: Decimal | None = None
    volume_8h: Decimal | None = None
    volume_24h: Decimal | None = None
    trades_30m: int | None = None
    trades_1h: int | None = None
    trades_2h: int | None = None
    trades_4h: int | None = None
    trades_8h: int | None = None
    trades_24h: int | None = None
    buy_count_30m: int | None = None
    sell_count_30m: int | None = None
    buy_count_1h: int | None = None
    sell_count_1h: int | None = None
    price_change_30m_pct: Decimal | None = None
    price_change_1h_pct: Decimal | None = None
    price_change_2h_pct: Decimal | None = None
    price_change_4h_pct: Decimal | None = None
    price_change_8h_pct: Decimal | None = None
    price_change_24h_pct: Decimal | None = None
    security_flags: dict[str, Any] = field(default_factory=dict)
    creation_metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class WalletEligibility(SerializableMixin):
    eligible: bool
    reason_codes: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class WalletScoreBreakdown(SerializableMixin):
    sample_support_score: float
    profitability_score: float
    consistency_score: float
    behavior_score: float
    risk_control_score: float
    shrinkage_multiplier: float
    total_score: float


@dataclass(frozen=True, slots=True)
class RankedWallet(SerializableMixin):
    wallet_profile: WalletProfile
    wallet_quality_score: float
    score_breakdown: WalletScoreBreakdown
    eligibility: WalletEligibility
    metrics: WalletMetrics
    classification_tags: tuple[str, ...]
    wallet_aggregate: WalletAggregate | None = None
    rank: int | None = None
    provenance_summary: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class FailedWallet(SerializableMixin):
    wallet_address: str
    error: str


@dataclass(frozen=True, slots=True)
class SnapshotMetadata(SerializableMixin):
    generated_at: str
    input_wallet_count: int
    processed_wallet_count: int
    eligible_wallet_count: int
    failed_wallet_count: int
    start_time: str
    end_time: str
    provider_name: str
    schema_version: str
    run_id: str | None = None
    pricing_valid: bool = False
    ranking_valid: bool = False
    data_layers: tuple[str, ...] = ()
    enrichment_coverage: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    source_completeness_pct: float | None = None
    pricing_completeness_pct: float | None = None
    reconstruction_completeness_pct: float | None = None
    wanted_but_unavailable: tuple[str, ...] = WANTED_BUT_UNAVAILABLE_DEFAULTS


@dataclass(frozen=True, slots=True)
class WalletAnalysis(SerializableMixin):
    profile: WalletProfile
    raw_events: list[WalletEvent]
    normalized_events: list[NormalizedEvent]
    reconstruction: ReconstructionResult
    metrics: WalletMetrics
    eligibility: WalletEligibility
    score_breakdown: WalletScoreBreakdown
    classification_tags: tuple[str, ...]
    wallet_aggregate: WalletAggregate | None = None
    run_id: str | None = None
    warnings: list[str] = field(default_factory=list)
    raw_transactions: list[RawTransactionRecord] = field(default_factory=list)
    source_payloads: list[SourcePayload] = field(default_factory=list)
    market_snapshots: list[MarketSnapshot] = field(default_factory=list)
    pricing_lookup_attempts: list[PricingLookupAttempt] = field(default_factory=list)
    field_resolution_records: list[FieldResolutionRecord] = field(default_factory=list)
    normalized_event_snapshot_links: list[EventSnapshotLink] = field(default_factory=list)
    wanted_but_unavailable: tuple[str, ...] = WANTED_BUT_UNAVAILABLE_DEFAULTS

    @property
    def wallet_quality_score(self) -> float:
        return self.score_breakdown.total_score


@dataclass(frozen=True, slots=True)
class WalletDetailSnapshot(SerializableMixin):
    profile: WalletProfile
    rank: int | None
    wallet_quality_score: float | None
    raw_events: list[WalletEvent]
    reconstructed_trades: list[ReconstructedWalletTrade]
    open_positions: dict[str, list[OpenLot]]
    metrics: WalletMetrics
    eligibility: WalletEligibility
    score_breakdown: WalletScoreBreakdown | None
    classification_tags: tuple[str, ...]
    pricing_valid: bool
    ranking_valid: bool
    score_status: str
    warnings: list[str]
    metadata: SnapshotMetadata
    normalized_events: list[NormalizedEvent] = field(default_factory=list)
    inventory_lots: list[InventoryLot] = field(default_factory=list)
    closed_lot_matches: list[ClosedLotMatch] = field(default_factory=list)
    trade_cycles: list[TradeCycle] = field(default_factory=list)
    wallet_aggregate: WalletAggregate | None = None
    raw_transactions: list[RawTransactionRecord] = field(default_factory=list)
    market_snapshots: list[MarketSnapshot] = field(default_factory=list)
    pricing_lookup_attempts: list[PricingLookupAttempt] = field(default_factory=list)
    field_resolution_records: list[FieldResolutionRecord] = field(default_factory=list)
    normalized_event_snapshot_links: list[EventSnapshotLink] = field(default_factory=list)
    trade_cycle_snapshot_links: list[TradeCycleSnapshotLink] = field(default_factory=list)
    trade_cycle_path_analytics: list[TradeCyclePathAnalytics] = field(default_factory=list)
    trade_cycle_execution_proxies: list[TradeCycleExecutionProxy] = field(default_factory=list)
    wanted_but_unavailable: tuple[str, ...] = WANTED_BUT_UNAVAILABLE_DEFAULTS


@dataclass(frozen=True, slots=True)
class WalletRankingResult(SerializableMixin):
    metadata: SnapshotMetadata
    ranked_wallets: list[RankedWallet]
    failed_wallets: list[FailedWallet] = field(default_factory=list)
    wanted_but_unavailable: tuple[str, ...] = WANTED_BUT_UNAVAILABLE_DEFAULTS


ReconstructedTrade = ReconstructedWalletTrade


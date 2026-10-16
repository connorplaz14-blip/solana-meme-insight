from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

DIRECT_FROM_SOURCE = "direct_from_source"
DERIVED_FROM_SOURCE = "derived_from_source"
UNRESOLVED_NOT_EXPOSED = "unresolved_not_exposed"
UNRESOLVED_LOOKUP_FAILED = "unresolved_lookup_failed"
UNRESOLVED_RATE_LIMITED = "unresolved_rate_limited"
UNRESOLVED_AMBIGUOUS = "unresolved_ambiguous"
UNRESOLVED_INSUFFICIENT_INPUTS = "unresolved_insufficient_inputs"

RESOLUTION_DIRECT = "direct"
RESOLUTION_DERIVED = "derived"

RUN_STATUS_FETCHING = "fetching"
RUN_STATUS_FETCHED = "fetched"
RUN_STATUS_PRICING = "pricing"
RUN_STATUS_NORMALIZING = "normalizing"
RUN_STATUS_RECONSTRUCTING = "reconstructing"
RUN_STATUS_AGGREGATING = "aggregating"
RUN_STATUS_COMPLETED = "completed"
RUN_STATUS_FAILED = "failed"
RUN_STATUS_INTERRUPTED = "interrupted"

REASON_NOT_EXPOSED = "not_exposed_by_sources"
REASON_LOOKUP_FAILED = "lookup_failed"
REASON_RATE_LIMITED = "rate_limited"
REASON_AMBIGUOUS_SWAP = "ambiguous_swap_legs"
REASON_AMBIGUOUS_MARKET = "ambiguous_market_resolution"
REASON_INSUFFICIENT_INPUTS = "insufficient_inputs"
REASON_MISSING_PRICE = "missing_price"
REASON_MISSING_NOTIONAL = "missing_notional"
REASON_NO_REFERENCE_LEG = "missing_reference_leg"
REASON_NO_TRADE_LEG = "missing_traded_leg"
REASON_NO_TIMESTAMP = "missing_timestamp"
REASON_NO_BIRDEYE_KEY = "missing_birdeye_api_key"
REASON_NO_MARKET_MATCH = "no_market_match"
REASON_NO_HISTORICAL_PRICE = "no_historical_price"
REASON_NO_TRADE_MATCH = "no_trade_match"
REASON_NO_OHLCV_MATCH = "no_ohlcv_match"
REASON_WANTED_UNAVAILABLE = "wanted_but_not_source_obtainable"

WANTED_BUT_UNAVAILABLE_DEFAULTS = (
    "guaranteed historical holder snapshots at arbitrary event time",
    "guaranteed historical liquidity or security state snapshots at arbitrary event time",
    "exact hypothetical copy-trade fills",
    "uniquely resolved market identity when Helius and BirdEye remain ambiguous",
)


@dataclass(frozen=True, slots=True)
class ResolutionInfo:
    status: str
    reason_code: str | None = None
    source_name: str | None = None
    endpoint_name: str | None = None
    target_timestamp: int | None = None
    source_timestamp: int | None = None
    match_distance_seconds: int | None = None
    raw_payload_reference: str | None = None
    formula_used: str | None = None
    dependency_fields: tuple[str, ...] = ()
    metadata: dict[str, Any] = field(default_factory=dict)


def merge_reason_codes(*reason_code_groups: object) -> tuple[str, ...]:
    merged: list[str] = []
    for group in reason_code_groups:
        if isinstance(group, str):
            values = [group]
        elif isinstance(group, (list, tuple, set)):
            values = list(group)
        else:
            continue
        for value in values:
            if isinstance(value, str) and value and value not in merged:
                merged.append(value)
    return tuple(merged)


def build_unresolved_field(
    *,
    field_name: str,
    reason_code: str,
    source_attempts: list[dict[str, Any]] | tuple[dict[str, Any], ...] = (),
    endpoint_attempts: list[str] | tuple[str, ...] = (),
    lookup_time: int | None = None,
    target_event_time: int | None = None,
    nearest_match_distance_seconds: int | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload = {
        "field_name": field_name,
        "reason_code": reason_code,
        "source_attempts": list(source_attempts),
        "endpoint_attempts": list(endpoint_attempts),
        "lookup_time": lookup_time,
        "target_event_time": target_event_time,
        "nearest_match_distance_seconds": nearest_match_distance_seconds,
    }
    if extra:
        payload.update(extra)
    return payload


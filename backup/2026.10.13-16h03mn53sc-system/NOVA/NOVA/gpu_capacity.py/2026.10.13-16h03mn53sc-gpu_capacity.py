#!/usr/bin/env python3
"""Evidence-gated accounting for the combined NOVA GPU provider ecosystem.

This module is deterministic and offline. It never contacts providers, activates
accounts, starts GPU jobs, or infers GPU time from authentication, token limits,
generic compute credits, or an advertised quota.

Only fresh, source-backed capacity that passes every required gate is counted.
Recurring capacity and one-time credit-backed capacity remain separate.
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping
from urllib.parse import urlsplit


DEFAULT_PLANNING_REFERENCE_GPU_MINUTES_PER_MONTH = 86_400
ACCOUNTING_UNIT = "one GPU allocated for one minute"
CURRENT_INTENDED_USE_MODE = "noncommercial_research_and_development"
SUPPORTED_USE_MODES = {
    "noncommercial_research_and_development",
    "commercial_production",
}
REQUIRED_GATE_STATES = {
    "account_eligibility": "VERIFIED",
    "free_without_payment_method": "VERIFIED",
    "intended_use_terms_compatible": "VERIFIED",
    "automated_access": "VERIFIED",
    "workload_compatibility": "VERIFIED",
    "data_handling_approved": "VERIFIED",
    "allocation_test": "PASS",
}
EXCLUDED_GATE_STATES = {
    "account_eligibility": {"INELIGIBLE", "REJECTED", "DISALLOWED"},
    "free_without_payment_method": {"PAYMENT_METHOD_REQUIRED", "DISALLOWED"},
    "intended_use_terms_compatible": {"DISALLOWED", "REJECTED"},
    "automated_access": {"DISALLOWED", "REJECTED"},
    "workload_compatibility": {"DISALLOWED", "REJECTED"},
    "data_handling_approved": {"DISALLOWED", "REJECTED"},
    "allocation_test": {"FAIL", "REJECTED"},
}


def _parse_aware_timestamp(value: Any) -> datetime | None:
    """Parse an ISO timestamp only when it identifies a timezone-aware instant."""
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(timezone.utc)


def _nonnegative_number(value: Any) -> int | float | None:
    """Accept finite JSON numbers; reject strings, booleans, negatives and infinity."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if not math.isfinite(float(value)) or value < 0:
        return None
    return int(value) if float(value).is_integer() else float(value)


def _https_urls(values: Any) -> list[str]:
    """Return well-formed HTTPS evidence URLs from strings or {url: ...} records."""
    if not isinstance(values, list):
        return []
    result: list[str] = []
    for item in values:
        url = item.get("url") if isinstance(item, Mapping) else item
        if not isinstance(url, str):
            continue
        try:
            parsed = urlsplit(url.strip())
        except ValueError:
            continue
        if (
            parsed.scheme.lower() == "https"
            and parsed.hostname
            and parsed.username is None
            and parsed.password is None
            and url.strip() not in result
        ):
            result.append(url.strip())
    return result


def _temporal_evidence_reasons(
    observed_at: Any,
    valid_until: Any,
    evidence_urls: Any,
    *,
    now: datetime,
    expiration_field: str = "valid_until",
) -> list[str]:
    reasons: list[str] = []
    observed = _parse_aware_timestamp(observed_at)
    expires = _parse_aware_timestamp(valid_until)
    if observed is None:
        reasons.append("capacity_observation_timestamp_missing_or_invalid")
    elif observed > now:
        reasons.append("capacity_observation_is_in_the_future")
    if expires is None:
        reasons.append(f"{expiration_field}_missing_or_invalid")
    elif observed is not None and expires <= observed:
        reasons.append("capacity_evidence_expiry_not_after_observation")
    elif expires <= now:
        reasons.append("capacity_evidence_expired")
    if not _https_urls(evidence_urls):
        reasons.append("capacity_evidence_sources_missing_or_invalid")
    return reasons


def _gate_results(qualification: Any) -> tuple[list[str], list[str]]:
    """Return unresolved and explicit-exclusion reasons for qualification gates."""
    if not isinstance(qualification, Mapping):
        qualification = {}
    unresolved: list[str] = []
    excluded: list[str] = []
    for gate, required in REQUIRED_GATE_STATES.items():
        observed = str(qualification.get(gate, "UNKNOWN")).strip().upper()
        if observed in EXCLUDED_GATE_STATES.get(gate, set()):
            excluded.append(f"{gate.lower()}_{observed.lower()}")
        elif observed != required:
            unresolved.append(f"{gate.lower()}_not_verified")
    return unresolved, excluded


def _assess_capacity(
    *,
    status: Any,
    minutes_value: Any,
    observed_at: Any,
    expires_at: Any,
    evidence_urls: Any,
    qualification_reasons: list[str],
    exclusion_reasons: list[str],
    active: bool,
    now: datetime,
    capacity_label: str,
    expiry_field: str,
) -> dict[str, Any]:
    reasons = list(qualification_reasons)
    exclusions = list(exclusion_reasons)
    normalized_status = str(status or "UNKNOWN").strip().upper()
    minutes = _nonnegative_number(minutes_value)

    if exclusions:
        return {
            "status": "EXCLUDED",
            "gpu_minutes": None,
            "reason_codes": sorted(set(exclusions)),
        }

    if normalized_status != "VERIFIED":
        reasons.append(f"{capacity_label}_not_verified")
    if minutes is None or minutes <= 0:
        reasons.append(f"{capacity_label}_minutes_missing_or_not_positive")
    reasons.extend(
        _temporal_evidence_reasons(
            observed_at,
            expires_at,
            evidence_urls,
            now=now,
            expiration_field=expiry_field,
        )
    )
    if reasons:
        return {
            "status": "BLOCKED",
            "gpu_minutes": None,
            "reason_codes": sorted(set(reasons)),
        }

    return {
        "status": "OPERATIONAL_CAPACITY_VERIFIED" if active else "QUALIFIED_NOT_ACTIVE",
        "gpu_minutes": minutes,
        "reason_codes": [] if active else ["provider_not_active_in_gpu_roster"],
    }


def _assess_provider(
    provider: Mapping[str, Any],
    *,
    active_names: set[str],
    now: datetime,
    intended_use_mode: str,
) -> dict[str, Any]:
    name = str(provider.get("name", "")).strip()
    qualification = provider.get("qualification", {})
    unresolved_gates, excluded_gates = _gate_results(qualification)
    qualification_use_mode = provider.get("qualification_use_mode")
    if qualification_use_mode != intended_use_mode:
        unresolved_gates.append("provider_terms_not_qualified_for_current_use_mode")
    is_active = bool(name and name in active_names)
    sources = _https_urls(provider.get("official_sources", []))

    advertised = provider.get("advertised", {})
    advertised_minutes = None
    if isinstance(advertised, Mapping):
        candidate = _nonnegative_number(advertised.get("normalized_monthly_gpu_minutes"))
        if candidate is not None and sources:
            advertised_minutes = candidate

    recurring = provider.get("recurring_capacity", {})
    if not isinstance(recurring, Mapping):
        recurring = {}
    recurring_result = _assess_capacity(
        status=recurring.get("status"),
        minutes_value=recurring.get("usable_gpu_minutes_per_month"),
        observed_at=recurring.get("observed_at"),
        expires_at=recurring.get("valid_until"),
        evidence_urls=recurring.get("evidence_urls"),
        qualification_reasons=unresolved_gates,
        exclusion_reasons=excluded_gates,
        active=is_active,
        now=now,
        capacity_label="recurring_capacity",
        expiry_field="recurring_capacity_valid_until",
    )

    one_time = provider.get("one_time_capacity", {})
    if not isinstance(one_time, Mapping):
        one_time = {}
    one_time_result = _assess_capacity(
        status=one_time.get("status"),
        minutes_value=one_time.get("gpu_minutes_available"),
        observed_at=one_time.get("observed_at"),
        expires_at=one_time.get("expires_at"),
        evidence_urls=one_time.get("evidence_urls"),
        qualification_reasons=unresolved_gates,
        exclusion_reasons=excluded_gates,
        active=is_active,
        now=now,
        capacity_label="one_time_capacity",
        expiry_field="one_time_capacity_expires_at",
    )

    if excluded_gates:
        overall_status = "EXCLUDED"
    elif recurring_result["status"] == "OPERATIONAL_CAPACITY_VERIFIED":
        overall_status = "OPERATIONAL_CAPACITY_VERIFIED"
    elif recurring_result["status"] == "QUALIFIED_NOT_ACTIVE":
        overall_status = "QUALIFIED_NOT_ACTIVE"
    elif one_time_result["status"] == "OPERATIONAL_CAPACITY_VERIFIED":
        overall_status = "ONE_TIME_CAPACITY_VERIFIED"
    elif one_time_result["status"] == "QUALIFIED_NOT_ACTIVE":
        overall_status = "ONE_TIME_CAPACITY_QUALIFIED_NOT_ACTIVE"
    else:
        overall_status = "BLOCKED"

    return {
        "provider": name or "UNKNOWN_PROVIDER",
        "display_name": str(provider.get("display_name", name or "Unknown provider")),
        "allocation_type": str(provider.get("allocation_type", "UNKNOWN")),
        "qualification_use_mode": qualification_use_mode,
        "current_intended_use_mode": intended_use_mode,
        "active_in_gpu_roster": is_active,
        "status": overall_status,
        "advertised_monthly_gpu_minutes_not_counted": advertised_minutes,
        "recurring_capacity": recurring_result,
        "one_time_capacity": one_time_result,
        "qualification": dict(qualification) if isinstance(qualification, Mapping) else {},
        "official_sources": sources,
    }


def _aggregate_usage(
    providers: list[Mapping[str, Any]],
    *,
    active_names: set[str],
    now: datetime,
) -> dict[str, Any]:
    month = now.strftime("%Y-%m")
    if not active_names:
        return {
            "month": month,
            "status": "NO_ACTIVE_PROVIDERS",
            "completed_useful_gpu_minutes": None,
            "idle_gpu_minutes": None,
            "reserved_gpu_minutes": None,
        }

    by_name = {
        str(provider.get("name", "")).strip(): provider
        for provider in providers
        if str(provider.get("name", "")).strip()
    }
    if not active_names.issubset(by_name):
        return {
            "month": month,
            "status": "INCOMPLETE_PROVIDER_COVERAGE",
            "completed_useful_gpu_minutes": None,
            "idle_gpu_minutes": None,
            "reserved_gpu_minutes": None,
        }

    fields = (
        "completed_useful_gpu_minutes",
        "idle_gpu_minutes",
        "reserved_gpu_minutes",
    )
    values: dict[str, list[int | float]] = {field: [] for field in fields}
    for name in sorted(active_names):
        usage = by_name[name].get("usage_month_to_date", {})
        if not isinstance(usage, Mapping) or str(usage.get("status", "")).upper() != "VERIFIED":
            return {
                "month": month,
                "status": "NOT_METERED_OR_INCOMPLETE",
                "completed_useful_gpu_minutes": None,
                "idle_gpu_minutes": None,
                "reserved_gpu_minutes": None,
            }
        if usage.get("month") != month:
            return {
                "month": month,
                "status": "USAGE_MONTH_MISMATCH",
                "completed_useful_gpu_minutes": None,
                "idle_gpu_minutes": None,
                "reserved_gpu_minutes": None,
            }
        temporal_reasons = _temporal_evidence_reasons(
            usage.get("observed_at"),
            usage.get("valid_until"),
            usage.get("evidence_urls"),
            now=now,
            expiration_field="usage_valid_until",
        )
        if temporal_reasons:
            return {
                "month": month,
                "status": "USAGE_EVIDENCE_INCOMPLETE_OR_STALE",
                "completed_useful_gpu_minutes": None,
                "idle_gpu_minutes": None,
                "reserved_gpu_minutes": None,
            }
        for field in fields:
            value = _nonnegative_number(usage.get(field))
            if value is None:
                return {
                    "month": month,
                    "status": "USAGE_METRIC_MISSING_OR_INVALID",
                    "completed_useful_gpu_minutes": None,
                    "idle_gpu_minutes": None,
                    "reserved_gpu_minutes": None,
                }
            values[field].append(value)

    return {
        "month": month,
        "status": "VERIFIED",
        **{field: sum(items) for field, items in values.items()},
    }


def build_capacity_report(
    evidence: Mapping[str, Any] | None,
    *,
    active_provider_names: set[str] | list[str] | tuple[str, ...] = (),
    now: datetime | None = None,
    intended_use_mode: str = CURRENT_INTENDED_USE_MODE,
) -> dict[str, Any]:
    """Build a report; active providers must come from the roster.

    A later change from non-commercial R&D to commercial production must use
    a distinct intended_use_mode; qualifications made for the prior mode then
    become blocked until each provider is deliberately requalified.
    The planning reference is a configurable, provisional comparison baseline. Its
    realism and availability are not assumed; recurring capacity must exclude
    one-time credits to prevent double counting.
    """
    if intended_use_mode not in SUPPORTED_USE_MODES:
        raise ValueError("Unsupported intended GPU provider use mode")
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    current = current.astimezone(timezone.utc)
    active_names = {str(name).strip() for name in active_provider_names if str(name).strip()}

    source = evidence if isinstance(evidence, Mapping) else {}
    records = source.get("providers", [])
    if not isinstance(records, list):
        records = []
    providers = [record for record in records if isinstance(record, Mapping)]
    assessments = [
        _assess_provider(
            record,
            active_names=active_names,
            now=current,
            intended_use_mode=intended_use_mode,
        )
        for record in providers
    ]

    verified_recurring = [
        item for item in assessments
        if item["recurring_capacity"]["status"] in {
            "OPERATIONAL_CAPACITY_VERIFIED", "QUALIFIED_NOT_ACTIVE"
        }
    ]
    active_recurring = [
        item for item in verified_recurring
        if item["recurring_capacity"]["status"] == "OPERATIONAL_CAPACITY_VERIFIED"
    ]
    verified_one_time = [
        item for item in assessments
        if item["one_time_capacity"]["status"] in {
            "OPERATIONAL_CAPACITY_VERIFIED", "QUALIFIED_NOT_ACTIVE"
        }
    ]
    active_one_time = [
        item for item in verified_one_time
        if item["one_time_capacity"]["status"] == "OPERATIONAL_CAPACITY_VERIFIED"
    ]

    advertised_values = [
        item["advertised_monthly_gpu_minutes_not_counted"]
        for item in assessments
        if item["advertised_monthly_gpu_minutes_not_counted"] is not None
    ]
    providers_with_unknown_advertised = [
        item["provider"] for item in assessments
        if item["advertised_monthly_gpu_minutes_not_counted"] is None
    ]

    def sum_capacity(items: list[dict[str, Any]], field: str) -> int | float:
        return sum(
            item[field]["gpu_minutes"] for item in items
            if isinstance(item[field].get("gpu_minutes"), (int, float))
        )

    eligible_recurring_minutes = sum_capacity(verified_recurring, "recurring_capacity")
    active_recurring_minutes = sum_capacity(active_recurring, "recurring_capacity")
    eligible_one_time_minutes = sum_capacity(verified_one_time, "one_time_capacity")
    active_one_time_minutes = sum_capacity(active_one_time, "one_time_capacity")
    current_period_minutes = active_recurring_minutes + active_one_time_minutes
    usage = _aggregate_usage(providers, active_names=active_names, now=current)

    reference_field = "planning_reference_gpu_minutes_per_month"
    reference_source = "default"
    reference_configuration_status = "DEFAULT_REFERENCE_USED"
    if reference_field in source:
        raw_reference = source.get(reference_field)
        reference_source = "evidence_register"
        reference_configuration_status = "VALID"
    elif "target_gpu_minutes_per_month" in source:
        # Temporary migration support: older evidence records treated this as a target.
        # It is interpreted only as a provisional planning reference, never as a requirement.
        raw_reference = source.get("target_gpu_minutes_per_month")
        reference_source = "legacy_target_field"
        reference_configuration_status = "LEGACY_FIELD"
    else:
        raw_reference = DEFAULT_PLANNING_REFERENCE_GPU_MINUTES_PER_MONTH

    parsed_reference = _nonnegative_number(raw_reference)
    if parsed_reference is None or parsed_reference <= 0:
        planning_reference = DEFAULT_PLANNING_REFERENCE_GPU_MINUTES_PER_MONTH
        reference_configuration_status = "INVALID_DEFAULT_REFERENCE_USED"
    else:
        planning_reference = parsed_reference

    declared_use_mode = source.get("intended_use_mode", CURRENT_INTENDED_USE_MODE)
    use_mode_mismatch = declared_use_mode != intended_use_mode
    warnings = []
    if reference_configuration_status == "INVALID_DEFAULT_REFERENCE_USED":
        warnings.append(
            "Planning reference is missing a valid positive finite number; the provisional code default is shown for comparison only."
        )
    if reference_configuration_status == "LEGACY_FIELD":
        warnings.append(
            "Legacy target_gpu_minutes_per_month field is treated as a provisional planning reference; migrate to planning_reference_gpu_minutes_per_month."
        )
    if use_mode_mismatch:
        warnings.append("Evidence register intended_use_mode differs from the code's current intended-use policy.")
    return {
        "schema_version": 1,
        "observed_at": current.isoformat(),
        "intended_use_mode": intended_use_mode,
        "planning_reference_gpu_minutes_per_month": planning_reference,
        "planning_reference_status": "PROVISIONAL_UNVALIDATED",
        "planning_reference_is_requirement": False,
        "reference_feasibility_status": "NOT_ESTABLISHED",
        "planning_reference_source": reference_source,
        "planning_reference_configuration_status": reference_configuration_status,
        "accounting_unit": ACCOUNTING_UNIT,
        "provider_evidence_count": len(assessments),
        "operational_provider_count": len(active_names),
        "reference_comparison_status": (
            "REFERENCE_REACHED_BY_VERIFIED_ACTIVE_RECURRING_CAPACITY"
            if active_recurring_minutes >= planning_reference
            else "REFERENCE_NOT_REACHED_BY_VERIFIED_ACTIVE_RECURRING_CAPACITY"
        ),
        "known_advertised_gpu_minutes_per_30_day_month_not_counted": sum(advertised_values),
        "providers_with_no_comparable_advertised_monthly_gpu_minutes": providers_with_unknown_advertised,
        "verified_eligible_recurring_gpu_minutes_per_month": eligible_recurring_minutes,
        "verified_active_recurring_gpu_minutes_per_month": active_recurring_minutes,
        "verified_eligible_one_time_gpu_minutes_available": eligible_one_time_minutes,
        "verified_active_one_time_gpu_minutes_available": active_one_time_minutes,
        "verified_active_capacity_available_for_current_month_gpu_minutes": current_period_minutes,
        "difference_to_reference_after_verified_active_recurring_capacity_gpu_minutes_per_month": max(
            0, planning_reference - active_recurring_minutes
        ),
        "difference_to_reference_after_verified_active_current_month_capacity_gpu_minutes": max(
            0, planning_reference - current_period_minutes
        ),
        "useful_work_and_allocation_usage_month_to_date": usage,
        "counting_rules": [
            "Only fresh, source-backed capacity with verified account eligibility, no-payment-method access, terms compatible with the current intended-use mode, automated access, workload compatibility, approved data handling and a passed allocation test can qualify.",
            "Only capacity activated in the current NOVA GPU roster counts as operationally available.",
            "Advertised allowances are displayed separately and never count as verified usable capacity.",
            "The planning reference is provisional and unvalidated; it is a comparison baseline, not a provider-availability claim or a mandatory requirement.",
            "One-time credit-backed GPU-minutes are reported separately and do not count as recurring monthly capacity.",
            "Unknown, stale, malformed, expired or unmetered values remain unknown and never become a zero-usage claim.",
            "GPU-minute means one GPU allocated for one minute; simultaneous GPUs contribute one GPU-minute per GPU per minute.",
        ],
        "providers": assessments,
        "warnings": warnings,
    }


def load_capacity_evidence(path: str | Path) -> dict[str, Any]:
    """Load the evidence register; malformed or missing content is an explicit error."""
    evidence_path = Path(path)
    with evidence_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("GPU capacity evidence root must be a JSON object")
    if not isinstance(data.get("providers"), list):
        raise ValueError("GPU capacity evidence must contain a providers list")
    return data


def main() -> int:
    """Print the report for manual review; workflow integration supplies live roster state."""
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--evidence",
        default="NOVA/gpu_capacity_evidence.json",
        help="path to the provider evidence JSON register",
    )
    args = parser.parse_args()
    evidence = load_capacity_evidence(args.evidence)
    report = build_capacity_report(evidence)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Rolling NOVA health-probe scheduling and expiry-aware preemption.

The health probe interval is a spacing rule between completed provider checks,
not a set of immutable wall-clock slots. When a required provider check is
legitimately moved forward to reuse capacity that would otherwise expire, that
provider is moved to the end of the rolling queue and the remaining providers
keep the configured spacing from the actual completed check.

No work is created merely to consume expiring capacity.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Mapping

try:
    from .capacity import provider_capacity_opportunity
    from .health import load_health_state, load_json, provider_health_status
except ImportError:
    from capacity import provider_capacity_opportunity
    from health import load_health_state, load_json, provider_health_status


ROOT = Path(__file__).resolve().parent
HEALTH_STATE_PATH = ROOT / "health_state.json"
HEALTH_POLICY_PATH = ROOT / "health_policy.json"
CAPACITY_POLICY_PATH = ROOT / "capacity_policy.json"
SCHEDULE_NAMESPACE = "ai-heart"
DEFAULT_INTERVAL_SECONDS = 6 * 60 * 60


def _parse_time(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat()


def _active_names(providers: list[dict[str, Any]]) -> list[str]:
    return [
        str(provider["name"])
        for provider in providers
        if provider.get("status") == "active" and provider.get("name")
    ]


def _provider_map(providers: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {
        str(provider["name"]): provider
        for provider in providers
        if provider.get("name")
    }


def _policy() -> tuple[float, float]:
    health_policy = load_json(HEALTH_POLICY_PATH, {})
    scheduler = health_policy.get("scheduler", {})
    interval = float(
        scheduler.get("interval_seconds", DEFAULT_INTERVAL_SECONDS)
    )
    safety_margin = float(
        scheduler.get("opportunistic_preemption_safety_margin_seconds", 60)
    )
    return max(interval, 1.0), max(safety_margin, 0.0)


def ensure_probe_schedule(
    state: dict[str, Any],
    providers: list[dict[str, Any]],
    *,
    now: datetime | None = None,
    interval_seconds: float | None = None,
) -> dict[str, Any]:
    """Ensure a backward-compatible rolling schedule exists in health state."""
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    current = current.astimezone(timezone.utc)

    policy_interval, _ = _policy()
    interval = max(float(interval_seconds or policy_interval), 1.0)

    rotation = state.setdefault("provider_rotation", {}).setdefault(
        SCHEDULE_NAMESPACE,
        {},
    )
    active_names = _active_names(providers)
    existing_queue = rotation.get("probe_queue")
    if (
        isinstance(existing_queue, list)
        and existing_queue
        and set(str(name) for name in existing_queue) == set(active_names)
        and len(existing_queue) == len(active_names)
    ):
        queue = [str(name) for name in existing_queue]
    else:
        next_provider = rotation.get("next_provider")
        if isinstance(next_provider, str) and next_provider in active_names:
            index = active_names.index(next_provider)
        else:
            try:
                index = int(rotation.get("next_index", 0)) % len(active_names)
            except (TypeError, ValueError):
                index = 0
        queue = active_names[index:] + active_names[:index] if active_names else []

    schedule = rotation.get("probe_schedule")
    if not isinstance(schedule, Mapping):
        schedule = {}

    if queue and not all(
        _parse_time(schedule.get(name)) is not None for name in queue
    ):
        # Initial state: the first provider is due immediately; the rest follow
        # at the configured spacing. Subsequent real probes rewrite this schedule.
        schedule = {
            name: _iso(current + timedelta(seconds=interval * offset))
            for offset, name in enumerate(queue)
        }

    rotation["probe_queue"] = queue
    rotation["probe_schedule"] = dict(schedule)
    rotation["schedule_interval_seconds"] = interval
    return rotation


def next_probe_due(
    state: dict[str, Any],
    providers: list[dict[str, Any]],
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Return the current head of the rolling queue and its absolute due time."""
    rotation = ensure_probe_schedule(state, providers, now=now)
    queue = rotation.get("probe_queue", [])
    if not queue:
        return {
            "provider": None,
            "due_at": None,
            "due": False,
            "queue": [],
        }

    provider = str(queue[0])
    due_at = _parse_time(rotation.get("probe_schedule", {}).get(provider))
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    current = current.astimezone(timezone.utc)

    return {
        "provider": provider,
        "due_at": _iso(due_at) if due_at else None,
        "due": bool(due_at is not None and due_at <= current),
        "queue": list(queue),
    }


def select_probe_candidate(
    providers: list[dict[str, Any]],
    state: dict[str, Any],
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Select the next health check, including legitimate expiry preemption.

    Preemption is permitted only when:
    1. the provider has an observed expiring capacity opportunity;
    2. the normal next check would occur after the capacity deadline;
    3. the work is an already-required health probe (no synthetic work);
    4. the provider is not already UNACCEPTABLE.
    """
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    current = current.astimezone(timezone.utc)

    rotation = ensure_probe_schedule(state, providers, now=current)
    queue = [str(name) for name in rotation.get("probe_queue", [])]
    schedule = rotation.get("probe_schedule", {})
    provider_by_name = _provider_map(providers)

    if not queue:
        return {
            "provider": None,
            "reason": "NO_ACTIVE_PROVIDERS",
            "preempted": False,
            "details": {},
        }

    scheduled_name = queue[0]
    scheduled_due = _parse_time(schedule.get(scheduled_name))

    policy = load_json(CAPACITY_POLICY_PATH, {})
    allocation = policy.get("runtime_allocation", {})
    urgency = float(allocation.get("urgency_window_seconds", 300))
    reserve = float(allocation.get("minimum_remaining_reserve_fraction", 0.2))
    max_age = allocation.get("maximum_capacity_observation_age_seconds")

    _, safety_margin = _policy()
    opportunities: list[dict[str, Any]] = []
    for name in queue:
        provider = provider_by_name.get(name)
        if provider is None:
            continue
        status = provider_health_status(
            state,
            provider=name,
            namespace=SCHEDULE_NAMESPACE,
            max_observation_age_seconds=load_json(
                HEALTH_POLICY_PATH, {}
            ).get("freshness", {}).get("heart_observation_max_age_seconds"),
        )
        if status == "UNACCEPTABLE":
            continue

        opportunity = provider_capacity_opportunity(
            state.get("targets"),
            provider=name,
            namespace=SCHEDULE_NAMESPACE,
            now=current,
            urgency_window_seconds=urgency,
            minimum_remaining_reserve_fraction=reserve,
            max_observation_age_seconds=(
                float(max_age) if max_age is not None else None
            ),
            allow_required_work_reuse=True,
        )
        if opportunity.get("state") != "EXPIRING_SOON":
            continue

        seconds_to_deadline = opportunity.get("seconds_to_deadline")
        if seconds_to_deadline is None:
            continue
        deadline = current + timedelta(seconds=float(seconds_to_deadline))
        due = _parse_time(schedule.get(name))

        # Only preempt when the normal check lies after the observed capacity
        # deadline. A small safety margin prevents a deadline race.
        if due is not None and deadline + timedelta(
            seconds=safety_margin
        ) >= due:
            continue

        opportunities.append({
            "provider": name,
            "deadline_at": _iso(deadline),
            "seconds_to_deadline": float(seconds_to_deadline),
            "normal_due_at": _iso(due) if due else None,
            "priority": float(opportunity.get("priority", 0.0)),
            "opportunity": opportunity,
        })

    if not opportunities:
        return {
            "provider": scheduled_name,
            "reason": "SCHEDULED_DUE" if (
                scheduled_due is not None and scheduled_due <= current
            ) else "SCHEDULED_PENDING",
            "preempted": False,
            "due_at": _iso(scheduled_due) if scheduled_due else None,
            "details": {},
        }

    # The earliest unavoidable deadline wins. Priority breaks a tie.
    opportunities.sort(
        key=lambda item: (
            item["deadline_at"],
            -item["priority"],
            queue.index(item["provider"]),
        )
    )
    selected = opportunities[0]
    if scheduled_due is not None and scheduled_due <= current:
        # A scheduled check is already due. Preemption still wins only if the
        # expiry is inside the short safety horizon and would be endangered by
        # doing the scheduled probe first.
        if selected["seconds_to_deadline"] > max(120.0, safety_margin):
            return {
                "provider": scheduled_name,
                "reason": "SCHEDULED_DUE",
                "preempted": False,
                "due_at": _iso(scheduled_due),
                "details": {},
            }

    return {
        "provider": selected["provider"],
        "reason": "EXPIRY_REALLOCATION",
        "preempted": selected["provider"] != scheduled_name,
        "due_at": selected["normal_due_at"],
        "details": {
            "deadline_at": selected["deadline_at"],
            "seconds_to_deadline": selected["seconds_to_deadline"],
            "normal_due_at": selected["normal_due_at"],
            "priority": selected["priority"],
            "opportunity": selected["opportunity"],
        },
    }


def reschedule_after_probes(
    state: dict[str, Any],
    providers: list[dict[str, Any]],
    probed_provider_names: list[str],
    *,
    completed_at: datetime | None = None,
    interval_seconds: float | None = None,
) -> dict[str, Any]:
    """Move every checked provider to the end and preserve 6h-style spacing."""
    current = completed_at or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    current = current.astimezone(timezone.utc)

    policy_interval, _ = _policy()
    interval = max(float(interval_seconds or policy_interval), 1.0)

    rotation = ensure_probe_schedule(
        state,
        providers,
        now=current,
        interval_seconds=interval,
    )
    old_queue = [str(name) for name in rotation.get("probe_queue", [])]
    active_names = _active_names(providers)

    probed_order = []
    seen = set()
    for name in probed_provider_names:
        value = str(name)
        if value in active_names and value not in seen:
            probed_order.append(value)
            seen.add(value)

    # Preserve the existing queue order for untouched providers, then append
    # the providers that were actually checked. This is the rolling ring.
    new_queue = [
        name for name in old_queue
        if name in active_names and name not in seen
    ]
    new_queue.extend(
        name for name in probed_order if name not in new_queue
    )
    new_queue.extend(
        name for name in active_names
        if name not in new_queue
    )

    # The checked providers become last in the next cycle. Each future check is
    # exactly one interval after the previous one, measured from completion.
    new_schedule = {
        name: _iso(current + timedelta(seconds=interval * (offset + 1)))
        for offset, name in enumerate(new_queue)
    }

    rotation["probe_queue"] = new_queue
    rotation["probe_schedule"] = new_schedule
    rotation["schedule_interval_seconds"] = interval
    rotation["next_provider"] = new_queue[0] if new_queue else None
    rotation["next_index"] = (
        active_names.index(new_queue[0]) if new_queue and new_queue[0] in active_names else 0
    )
    rotation["last_probe_providers"] = list(probed_order)
    rotation["last_completed_at"] = _iso(current)
    rotation["last_schedule_reason"] = (
        "EXPIRY_REALLOCATION" if (
            probed_order
            and old_queue
            and probed_order[0] != old_queue[0]
        ) else "ROLLING_INTERVAL"
    )
    return rotation


def should_run_heartbeat(
    providers: list[dict[str, Any]],
    state: dict[str, Any],
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    decision = select_probe_candidate(providers, state, now=now)
    return {
        "run": decision.get("provider") is not None
        and decision.get("reason") in {"SCHEDULED_DUE", "EXPIRY_REALLOCATION"},
        **decision,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--should-run", action="store_true")
    parser.add_argument("--github-output")
    args = parser.parse_args()

    if not args.should_run:
        parser.error("--should-run is required")
        return 2

    roster = load_json(ROOT / "roster.json", {"providers": []})
    providers = [
        provider
        for provider in roster.get("providers", [])
        if provider.get("status") == "active"
    ]
    state = load_health_state(HEALTH_STATE_PATH)
    decision = should_run_heartbeat(providers, state)

    print(json.dumps(decision, indent=2, sort_keys=True))
    if args.github_output:
        path = Path(args.github_output)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(
                "run_heartbeat="
                + ("true" if decision["run"] else "false")
                + "\n"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

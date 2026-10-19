"""Portable domain logic and JSON-file persistence for banner scheduling.

This module uses only the Python standard library. It is a development
prototype, not a production authentication or publishing system.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
import threading
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from typing import Any

SCHEMA_VERSION = 1
MAX_STATE_BYTES = 1_000_000
_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$")
_SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
_WRITE_LOCK = threading.Lock()


class BannerStateError(ValueError):
    """A supplied or stored banner state violates the documented schema."""


class RevisionConflict(RuntimeError):
    """A stale revision attempted to overwrite newer state."""

    def __init__(self, current_revision: str) -> None:
        super().__init__("banner state changed since it was loaded")
        self.current_revision = current_revision


def initial_state() -> dict[str, Any]:
    """Return a small valid starting state, without writing it to disk."""
    return {
        "schema_version": SCHEMA_VERSION,
        "default_banner_id": "regular",
        "banners": [
            {
                "id": "regular",
                "name": "Regular announcements",
                "slots": [
                    {
                        "id": "slot-1",
                        "add_link": False,
                        "destination_url": "",
                        "composition": {},
                    }
                ],
            }
        ],
        "schedules": [],
    }


def _require_object(value: Any, field: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise BannerStateError(f"{field} must be an object")
    return value


def _require_keys(value: dict[str, Any], allowed: set[str], field: str) -> None:
    unknown = sorted(set(value) - allowed)
    if unknown:
        raise BannerStateError(f"{field} contains unsupported field(s): {', '.join(unknown)}")


def _validate_id(value: Any, field: str) -> str:
    if not isinstance(value, str) or not _ID_PATTERN.fullmatch(value):
        raise BannerStateError(f"{field} must be a 1–80 character identifier using letters, digits, '-' or '_'")
    return value


def parse_instant(value: Any, field: str) -> datetime:
    """Parse an ISO-8601 timestamp and require an explicit UTC offset."""
    if not isinstance(value, str) or not value.strip():
        raise BannerStateError(f"{field} must be an ISO-8601 timestamp with a time-zone offset")
    candidate = value.strip()
    if candidate.endswith("Z"):
        candidate = candidate[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError as exc:
        raise BannerStateError(f"{field} is not a valid ISO-8601 timestamp") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise BannerStateError(f"{field} must include a time-zone offset")
    return parsed.astimezone(timezone.utc)


def _format_instant(value: datetime) -> str:
    value = value.astimezone(timezone.utc)
    if value.microsecond:
        return value.isoformat(timespec="microseconds").replace("+00:00", "Z")
    return value.isoformat(timespec="seconds").replace("+00:00", "Z")


def validate_destination_url(value: Any) -> str:
    """Allow HTTPS URLs or same-origin absolute paths; reject unsafe schemes."""
    if not isinstance(value, str):
        raise BannerStateError("destination_url must be a string")
    value = value.strip()
    if not value:
        raise BannerStateError("destination_url is required when add_link is enabled")
    if any(ord(ch) < 0x20 or ord(ch) == 0x7F for ch in value) or "\\" in value:
        raise BannerStateError("destination_url contains unsafe characters")
    if value.startswith("/"):
        if value.startswith("//"):
            raise BannerStateError("protocol-relative destination URLs are not allowed")
        parsed = urlsplit(value)
        if parsed.scheme or parsed.netloc:
            raise BannerStateError("relative destination must be a same-origin absolute path")
        return value
    try:
        parsed = urlsplit(value)
        # Access .port to validate malformed ports as well.
        _ = parsed.port
    except ValueError as exc:
        raise BannerStateError("destination_url is malformed") from exc
    if parsed.scheme.lower() != "https" or not parsed.hostname:
        raise BannerStateError("destination_url must use HTTPS or a same-origin absolute path")
    if parsed.username is not None or parsed.password is not None:
        raise BannerStateError("destination_url must not contain embedded credentials")
    return value


def validate_state(value: Any) -> dict[str, Any]:
    """Validate and return a normalized, JSON-compatible banner state."""
    root = _require_object(value, "state")
    _require_keys(root, {"schema_version", "default_banner_id", "banners", "schedules"}, "state")
    if root.get("schema_version") != SCHEMA_VERSION or isinstance(root.get("schema_version"), bool):
        raise BannerStateError(f"schema_version must equal {SCHEMA_VERSION}")

    raw_banners = root.get("banners")
    if not isinstance(raw_banners, list) or not raw_banners:
        raise BannerStateError("banners must be a non-empty list")
    if len(raw_banners) > 100:
        raise BannerStateError("no more than 100 banner definitions are supported in this prototype")

    banners: list[dict[str, Any]] = []
    banner_ids: set[str] = set()
    for index, raw_banner in enumerate(raw_banners):
        field = f"banners[{index}]"
        banner = _require_object(raw_banner, field)
        _require_keys(banner, {"id", "name", "slots"}, field)
        banner_id = _validate_id(banner.get("id"), f"{field}.id")
        if banner_id in banner_ids:
            raise BannerStateError(f"duplicate banner id: {banner_id}")
        banner_ids.add(banner_id)
        name = banner.get("name")
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 120:
            raise BannerStateError(f"{field}.name must contain 1–120 characters")
        raw_slots = banner.get("slots")
        if not isinstance(raw_slots, list) or not raw_slots:
            raise BannerStateError(f"{field}.slots must be a non-empty list")
        if len(raw_slots) > 100:
            raise BannerStateError(f"{field}.slots may contain at most 100 slots")

        slots: list[dict[str, Any]] = []
        slot_ids: set[str] = set()
        for slot_index, raw_slot in enumerate(raw_slots):
            slot_field = f"{field}.slots[{slot_index}]"
            slot = _require_object(raw_slot, slot_field)
            _require_keys(slot, {"id", "add_link", "destination_url", "composition"}, slot_field)
            slot_id = _validate_id(slot.get("id"), f"{slot_field}.id")
            if slot_id in slot_ids:
                raise BannerStateError(f"duplicate slot id {slot_id} in banner {banner_id}")
            slot_ids.add(slot_id)
            add_link = slot.get("add_link")
            if not isinstance(add_link, bool):
                raise BannerStateError(f"{slot_field}.add_link must be a boolean")
            destination = slot.get("destination_url", "")
            if add_link:
                destination = validate_destination_url(destination)
            else:
                # Do not retain a dormant destination when the checkbox is off.
                destination = ""
            composition = slot.get("composition", {})
            if not isinstance(composition, dict):
                raise BannerStateError(f"{slot_field}.composition must be an object")
            try:
                json.dumps(composition, allow_nan=False)
            except (TypeError, ValueError) as exc:
                raise BannerStateError(f"{slot_field}.composition must contain valid JSON data") from exc
            slots.append({
                "id": slot_id,
                "add_link": add_link,
                "destination_url": destination,
                "composition": composition,
            })
        banners.append({"id": banner_id, "name": name.strip(), "slots": slots})

    default_banner_id = _validate_id(root.get("default_banner_id"), "default_banner_id")
    if default_banner_id not in banner_ids:
        raise BannerStateError("default_banner_id must reference an existing banner")

    raw_schedules = root.get("schedules", [])
    if not isinstance(raw_schedules, list):
        raise BannerStateError("schedules must be a list")
    if len(raw_schedules) > 500:
        raise BannerStateError("no more than 500 schedules are supported in this prototype")

    schedules: list[dict[str, Any]] = []
    schedule_ids: set[str] = set()
    parsed_schedules: list[tuple[datetime, datetime | None, str, str]] = []
    for index, raw_schedule in enumerate(raw_schedules):
        field = f"schedules[{index}]"
        schedule = _require_object(raw_schedule, field)
        _require_keys(schedule, {"id", "banner_id", "opens_at", "closes_at", "confirmed_default_change"}, field)
        schedule_id = _validate_id(schedule.get("id"), f"{field}.id")
        if schedule_id in schedule_ids:
            raise BannerStateError(f"duplicate schedule id: {schedule_id}")
        schedule_ids.add(schedule_id)
        banner_id = _validate_id(schedule.get("banner_id"), f"{field}.banner_id")
        if banner_id not in banner_ids:
            raise BannerStateError(f"{field}.banner_id must reference an existing banner")
        opens = parse_instant(schedule.get("opens_at"), f"{field}.opens_at")
        close_raw = schedule.get("closes_at")
        closes = parse_instant(close_raw, f"{field}.closes_at") if close_raw not in (None, "") else None
        confirmed = schedule.get("confirmed_default_change", False)
        if not isinstance(confirmed, bool):
            raise BannerStateError(f"{field}.confirmed_default_change must be a boolean")
        if closes is not None:
            if closes <= opens:
                raise BannerStateError(f"{field}.closes_at must be later than opens_at")
            if confirmed:
                raise BannerStateError(f"{field}.confirmed_default_change must be false when a closing time is set")
        elif not confirmed:
            raise BannerStateError(
                f"{field} has no closing time; explicit confirmation to make it the default is required"
            )
        schedules.append({
            "id": schedule_id,
            "banner_id": banner_id,
            "opens_at": _format_instant(opens),
            "closes_at": _format_instant(closes) if closes else None,
            "confirmed_default_change": confirmed,
        })
        parsed_schedules.append((opens, closes, schedule_id, "temporary" if closes else "default"))

    # A temporary banner may not overlap another temporary banner; otherwise
    # the displayed result would be ambiguous. An open-ended default change is
    # allowed during a temporary event and is applied when that event closes.
    temporary = [(start, end, sid) for start, end, sid, kind in parsed_schedules if kind == "temporary"]
    for i, (start_a, end_a, id_a) in enumerate(temporary):
        assert end_a is not None
        for start_b, end_b, id_b in temporary[i + 1:]:
            assert end_b is not None
            if start_a < end_b and start_b < end_a:
                raise BannerStateError(f"temporary schedules {id_a} and {id_b} overlap")
    default_starts = [start for start, end, _sid, kind in parsed_schedules if kind == "default" and end is None]
    if len(default_starts) != len(set(default_starts)):
        raise BannerStateError("two open-ended default changes cannot have the same opening time")

    schedules.sort(key=lambda item: (item["opens_at"], item["id"]))
    normalized = {
        "schema_version": SCHEMA_VERSION,
        "default_banner_id": default_banner_id,
        "banners": banners,
        "schedules": schedules,
    }
    try:
        encoded = json.dumps(normalized, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")
    except (TypeError, ValueError) as exc:
        raise BannerStateError("state must be valid JSON data") from exc
    if len(encoded) > MAX_STATE_BYTES:
        raise BannerStateError(f"state exceeds the {MAX_STATE_BYTES}-byte prototype limit")
    return normalized


def state_revision(state: Any) -> str:
    normalized = validate_state(state)
    encoded = json.dumps(normalized, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def resolve_active_banner(state: Any, at: datetime | str | None = None) -> dict[str, Any]:
    """Resolve the banner effective at a point in time using UTC comparisons."""
    normalized = validate_state(state)
    if at is None:
        current = datetime.now(timezone.utc)
    elif isinstance(at, str):
        current = parse_instant(at, "at")
    elif isinstance(at, datetime):
        if at.tzinfo is None or at.utcoffset() is None:
            raise BannerStateError("at must be timezone-aware")
        current = at.astimezone(timezone.utc)
    else:
        raise BannerStateError("at must be an ISO-8601 string or timezone-aware datetime")

    default_banner_id = normalized["default_banner_id"]
    latest_change: tuple[datetime, str, str] | None = None
    active_temporary: dict[str, Any] | None = None
    for schedule in normalized["schedules"]:
        opens = parse_instant(schedule["opens_at"], "opens_at")
        close_text = schedule["closes_at"]
        if close_text is None:
            if opens <= current and (latest_change is None or opens > latest_change[0]):
                latest_change = (opens, schedule["banner_id"], schedule["id"])
        else:
            closes = parse_instant(close_text, "closes_at")
            if opens <= current < closes:
                if active_temporary is not None:
                    # validate_state should make this unreachable; keep a hard guard.
                    raise BannerStateError("multiple temporary banners are active at the same time")
                active_temporary = schedule
    if latest_change is not None:
        default_banner_id = latest_change[1]
    if active_temporary is not None:
        return {
            "banner_id": active_temporary["banner_id"],
            "is_temporary": True,
            "schedule_id": active_temporary["id"],
            "default_banner_id": default_banner_id,
        }
    return {
        "banner_id": default_banner_id,
        "is_temporary": False,
        "schedule_id": latest_change[2] if latest_change is not None else None,
        "default_banner_id": default_banner_id,
    }


def load_state(path: str | Path) -> dict[str, Any]:
    """Load and validate a JSON state, or return the initial state if absent."""
    location = Path(path)
    if not location.exists():
        return initial_state()
    try:
        if location.stat().st_size > MAX_STATE_BYTES:
            raise BannerStateError(f"stored state exceeds the {MAX_STATE_BYTES}-byte prototype limit")
        with location.open("r", encoding="utf-8") as stream:
            raw = json.load(stream)
    except json.JSONDecodeError as exc:
        raise BannerStateError("stored state is not valid JSON") from exc
    except UnicodeDecodeError as exc:
        raise BannerStateError("stored state is not valid UTF-8 JSON") from exc
    except OSError:
        raise
    return validate_state(raw)


def save_state(path: str | Path, state: Any, expected_revision: str) -> tuple[dict[str, Any], str]:
    """Atomically persist state if expected_revision still matches current state."""
    normalized = validate_state(state)
    if not isinstance(expected_revision, str) or not _SHA256_PATTERN.fullmatch(expected_revision):
        raise BannerStateError("revision must be a 64-character lowercase SHA-256 digest")
    location = Path(path)
    parent = location.parent
    with _WRITE_LOCK:
        current = load_state(location)
        current_revision = state_revision(current)
        if expected_revision != current_revision:
            raise RevisionConflict(current_revision)
        try:
            payload = json.dumps(normalized, indent=2, ensure_ascii=False, allow_nan=False) + "\n"
            data = payload.encode("utf-8")
            if len(data) > MAX_STATE_BYTES:
                raise BannerStateError(f"state exceeds the {MAX_STATE_BYTES}-byte prototype limit")
            parent.mkdir(parents=True, exist_ok=True)
            temp_name: str | None = None
            try:
                with tempfile.NamedTemporaryFile("wb", dir=parent, prefix=".banner-state-", suffix=".tmp", delete=False) as stream:
                    temp_name = stream.name
                    stream.write(data)
                    stream.flush()
                    os.fsync(stream.fileno())
                os.replace(temp_name, location)
                temp_name = None
            finally:
                if temp_name is not None:
                    try:
                        os.unlink(temp_name)
                    except FileNotFoundError:
                        pass
        except OSError as exc:
            raise OSError(f"could not persist banner state to {location}") from exc
    return normalized, state_revision(normalized)

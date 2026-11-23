from __future__ import annotations

import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from development.admin.banner_backend.service import (
    BannerStateError,
    RevisionConflict,
    initial_state,
    load_state,
    resolve_active_banner,
    save_state,
    state_revision,
    validate_state,
)


def add_banner(state: dict, banner_id: str, name: str) -> None:
    state["banners"].append({
        "id": banner_id,
        "name": name,
        "slots": [{
            "id": "slot-1",
            "add_link": False,
            "destination_url": "",
            "composition": {"elements": []},
        }],
    })


class BannerStateValidationTests(unittest.TestCase):
    def test_initial_state_is_valid_and_has_one_default_banner(self) -> None:
        state = validate_state(initial_state())
        self.assertEqual(state["default_banner_id"], "regular")
        self.assertEqual(len(state["banners"]), 1)
        self.assertEqual(state["banners"][0]["slots"][0]["add_link"], False)

    def test_legacy_banner_defaults_direction_to_left_to_right(self) -> None:
        state = initial_state()
        del state["banners"][0]["carousel_direction"]
        normalized = validate_state(state)
        self.assertEqual(normalized["banners"][0]["carousel_direction"], "left-to-right")

    def test_all_carousel_directions_are_accepted(self) -> None:
        for direction in ("left-to-right", "top-to-bottom", "right-to-left", "bottom-to-top"):
            with self.subTest(direction=direction):
                state = initial_state()
                state["banners"][0]["carousel_direction"] = direction
                self.assertEqual(validate_state(state)["banners"][0]["carousel_direction"], direction)

    def test_invalid_carousel_direction_is_rejected(self) -> None:
        state = initial_state()
        state["banners"][0]["carousel_direction"] = "diagonal"
        with self.assertRaisesRegex(BannerStateError, "carousel_direction"):
            validate_state(state)

    def test_slot_link_requires_safe_destination(self) -> None:
        state = initial_state()
        slot = state["banners"][0]["slots"][0]
        slot["add_link"] = True
        slot["destination_url"] = "/acrown/releases"
        self.assertEqual(validate_state(state)["banners"][0]["slots"][0]["destination_url"], "/acrown/releases")

    def test_disabled_link_clears_hidden_destination(self) -> None:
        state = initial_state()
        slot = state["banners"][0]["slots"][0]
        slot["destination_url"] = "https://example.org/old"
        normalized = validate_state(state)
        self.assertEqual(normalized["banners"][0]["slots"][0]["destination_url"], "")

    def test_unsafe_destinations_are_rejected(self) -> None:
        for url in ("javascript:alert(1)", "//example.org/path", "http://example.org", "https://user:pass@example.org", "https://example.org\n.evil"):
            with self.subTest(url=url):
                state = initial_state()
                slot = state["banners"][0]["slots"][0]
                slot["add_link"] = True
                slot["destination_url"] = url
                with self.assertRaises(BannerStateError):
                    validate_state(state)

    def test_naive_time_is_rejected(self) -> None:
        state = initial_state()
        add_banner(state, "event", "Special event")
        state["schedules"] = [{
            "id": "schedule-1", "banner_id": "event",
            "opens_at": "2026-10-25T18:00:00", "closes_at": "2026-10-25T21:00:00",
            "confirmed_default_change": False,
        }]
        with self.assertRaisesRegex(BannerStateError, "time-zone offset"):
            validate_state(state)

    def test_close_must_be_after_open(self) -> None:
        state = initial_state()
        add_banner(state, "event", "Special event")
        state["schedules"] = [{
            "id": "schedule-1", "banner_id": "event",
            "opens_at": "2026-10-25T18:00:00+05:30", "closes_at": "2026-10-25T18:00:00+05:30",
            "confirmed_default_change": False,
        }]
        with self.assertRaisesRegex(BannerStateError, "later than opens_at"):
            validate_state(state)

    def test_missing_close_requires_explicit_default_change_confirmation(self) -> None:
        state = initial_state()
        add_banner(state, "event", "New default")
        state["schedules"] = [{
            "id": "schedule-1", "banner_id": "event",
            "opens_at": "2026-10-25T18:00:00+05:30", "closes_at": None,
            "confirmed_default_change": False,
        }]
        with self.assertRaisesRegex(BannerStateError, "explicit confirmation"):
            validate_state(state)
        state["schedules"][0]["confirmed_default_change"] = True
        self.assertEqual(validate_state(state)["schedules"][0]["confirmed_default_change"], True)

    def test_two_temporary_schedules_may_not_overlap(self) -> None:
        state = initial_state()
        add_banner(state, "event-a", "Event A")
        add_banner(state, "event-b", "Event B")
        state["schedules"] = [
            {"id": "a", "banner_id": "event-a", "opens_at": "2026-10-25T10:00:00Z", "closes_at": "2026-10-25T13:00:00Z", "confirmed_default_change": False},
            {"id": "b", "banner_id": "event-b", "opens_at": "2026-10-25T12:00:00Z", "closes_at": "2026-10-25T14:00:00Z", "confirmed_default_change": False},
        ]
        with self.assertRaisesRegex(BannerStateError, "overlap"):
            validate_state(state)

    def test_temporary_event_returns_to_latest_default(self) -> None:
        state = initial_state()
        add_banner(state, "important", "Important event")
        add_banner(state, "new-regular", "New regular banner")
        state["schedules"] = [
            {"id": "temporary", "banner_id": "important", "opens_at": "2026-10-25T18:00:00Z", "closes_at": "2026-10-25T21:00:00Z", "confirmed_default_change": False},
            {"id": "default-change", "banner_id": "new-regular", "opens_at": "2026-10-25T19:00:00Z", "closes_at": None, "confirmed_default_change": True},
        ]
        during_event = resolve_active_banner(state, "2026-10-25T20:00:00Z")
        after_event = resolve_active_banner(state, "2026-10-25T21:00:00Z")
        self.assertEqual(during_event["banner_id"], "important")
        self.assertTrue(during_event["is_temporary"])
        self.assertEqual(during_event["default_banner_id"], "new-regular")
        self.assertEqual(after_event["banner_id"], "new-regular")
        self.assertFalse(after_event["is_temporary"])

    def test_start_and_close_boundaries_are_deterministic(self) -> None:
        state = initial_state()
        add_banner(state, "important", "Important event")
        state["schedules"] = [{
            "id": "temporary", "banner_id": "important",
            "opens_at": "2026-10-25T18:00:00Z", "closes_at": "2026-10-25T21:00:00Z",
            "confirmed_default_change": False,
        }]
        self.assertEqual(resolve_active_banner(state, "2026-10-25T17:59:59Z")["banner_id"], "regular")
        self.assertEqual(resolve_active_banner(state, "2026-10-25T18:00:00Z")["banner_id"], "important")
        self.assertEqual(resolve_active_banner(state, "2026-10-25T21:00:00Z")["banner_id"], "regular")

    def test_naive_datetime_argument_is_rejected(self) -> None:
        with self.assertRaisesRegex(BannerStateError, "timezone-aware"):
            resolve_active_banner(initial_state(), datetime(2026, 10, 25, 18, 0))


class BannerStateStorageTests(unittest.TestCase):
    def test_load_missing_file_returns_valid_initial_state(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "nested" / "state.json"
            self.assertEqual(load_state(path), initial_state())
            self.assertFalse(path.exists())

    def test_save_is_restorable_and_revision_checked(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "state.json"
            first = initial_state()
            initial_revision = state_revision(first)
            second = dict(first)
            second["banners"] = [dict(first["banners"][0], name="Updated regular banner")]
            saved, revision = save_state(path, second, initial_revision)
            self.assertEqual(load_state(path), saved)
            self.assertEqual(state_revision(saved), revision)
            with self.assertRaises(RevisionConflict):
                save_state(path, first, initial_revision)

    def test_corrupt_stored_json_is_not_silently_reset(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "state.json"
            path.write_text("{broken", encoding="utf-8")
            with self.assertRaisesRegex(BannerStateError, "not valid JSON"):
                load_state(path)


if __name__ == "__main__":
    unittest.main()

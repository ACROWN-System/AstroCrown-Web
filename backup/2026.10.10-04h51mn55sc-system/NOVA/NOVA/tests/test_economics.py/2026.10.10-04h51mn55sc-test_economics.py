import unittest
from decimal import Decimal

from NOVA.capacity import extract_rate_limit_snapshot
from NOVA.economics import record_transaction, transition_status


class EconomicsTests(unittest.TestCase):
    def test_groq_headers_capture_remaining_and_reset(self):
        snapshot = extract_rate_limit_snapshot(
            "groq",
            {
                "x-ratelimit-limit-requests": "1000",
                "x-ratelimit-remaining-requests": "900",
                "x-ratelimit-reset-requests": "59s",
                "x-ratelimit-limit-tokens": "200000",
                "x-ratelimit-remaining-tokens": "190000",
                "x-ratelimit-reset-tokens": "7.5s",
            },
        )
        self.assertEqual(snapshot["metrics"]["tokens"]["remaining"], 190000)
        self.assertEqual(snapshot["metrics"]["requests"]["limit"], 1000)
        self.assertEqual(snapshot["measurement_state"], "OBSERVED")

    def test_free_resource_does_not_reduce_public_price(self):
        state = {"operating_pool": "0"}
        entry = record_transaction(
            state,
            service="image_generation",
            public_price_amount=Decimal("0.50"),
            public_price_asset="USDC",
            provider_name="free-provider",
            provider_cost_amount=Decimal("0"),
            provider_cost_asset="USDC",
            free_resource=True,
            resource_usage={"tokens": 1200},
        )
        self.assertEqual(entry["public_price"]["amount"], "0.50")
        self.assertEqual(state["operating_pool"], "0.50")

    def test_transition_warns_before_pool_exhaustion(self):
        state = {"operating_pool": "10"}
        self.assertEqual(
            transition_status(
                state,
                projected_paid_cost=Decimal("8"),
                replenish_target=Decimal("5"),
                minimum_runway_ratio=1,
            ),
            "CONTINUITY_FUNDED",
        )
        self.assertEqual(
            transition_status(
                state,
                projected_paid_cost=Decimal("8"),
                replenish_target=Decimal("20"),
                minimum_runway_ratio=1,
            ),
            "RUNWAY_WARNING",
        )


if __name__ == "__main__":
    unittest.main()

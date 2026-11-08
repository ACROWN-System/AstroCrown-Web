"""Real ML-DSA assertion-signature tests for the pinned WebAuthn verifier.

Keys are generated ephemerally during the test. No real authenticator, user key,
production credential, browser, or external service is involved.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import unittest

import cbor2
from cryptography.hazmat.primitives.asymmetric.mldsa import (
    MLDSA44PrivateKey,
    MLDSA65PrivateKey,
    MLDSA87PrivateKey,
)

from pathlib import Path
import sys

PROTOTYPE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROTOTYPE_DIR))

from passkey_auth import PasskeyAuthService, PasskeyVerificationError


def b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


class RealMlDsaAssertionVerificationTests(unittest.TestCase):
    def test_all_supported_ml_dsa_variants_verify_real_signatures(self):
        rp_id = "accounts.example.test"
        origin = "https://accounts.example.test"
        service = PasskeyAuthService(
            rp_id=rp_id,
            rp_name="AstroCrown test",
            origin=origin,
        )

        algorithms = (
            (-48, MLDSA44PrivateKey, 1312, 2420),
            (-49, MLDSA65PrivateKey, 1952, 3309),
            (-50, MLDSA87PrivateKey, 2592, 4627),
        )

        for algorithm_id, key_type, public_key_size, signature_size in algorithms:
            with self.subTest(algorithm_id=algorithm_id):
                private_key = key_type.generate()
                public_key = private_key.public_key()
                public_key_bytes = public_key.public_bytes_raw()
                self.assertEqual(len(public_key_bytes), public_key_size)

                cose_public_key = cbor2.dumps({
                    1: 7,                 # COSE kty: ML-DSA
                    3: algorithm_id,      # Experimental WebAuthn COSE algorithm
                    -1: public_key_bytes, # COSE pub
                })
                self.assertEqual(
                    service.credential_algorithm_id(cose_public_key),
                    algorithm_id,
                )

                challenge = os.urandom(32)
                sign_count = 8
                authenticator_data = (
                    hashlib.sha256(rp_id.encode("utf-8")).digest()
                    + bytes([0x05])  # User Present + User Verified
                    + sign_count.to_bytes(4, "big")
                )
                client_data_json = json.dumps(
                    {
                        "type": "webauthn.get",
                        "challenge": b64url(challenge),
                        "origin": origin,
                        "crossOrigin": False,
                    },
                    separators=(",", ":"),
                ).encode("utf-8")
                signature_base = (
                    authenticator_data
                    + hashlib.sha256(client_data_json).digest()
                )
                signature = private_key.sign(signature_base)
                self.assertEqual(len(signature), signature_size)

                raw_credential_id = os.urandom(32)
                credential = {
                    "id": b64url(raw_credential_id),
                    "rawId": b64url(raw_credential_id),
                    "type": "public-key",
                    "response": {
                        "authenticatorData": b64url(authenticator_data),
                        "clientDataJSON": b64url(client_data_json),
                        "signature": b64url(signature),
                    },
                    "clientExtensionResults": {},
                }

                verified = service.verify_authentication(
                    credential=credential,
                    challenge=challenge,
                    credential_public_key=cose_public_key,
                    current_sign_count=7,
                )
                self.assertEqual(verified.new_sign_count, sign_count)
                self.assertTrue(verified.user_verified)

                wrong_challenge = os.urandom(32)
                with self.assertRaises(PasskeyVerificationError):
                    service.verify_authentication(
                        credential=credential,
                        challenge=wrong_challenge,
                        credential_public_key=cose_public_key,
                        current_sign_count=7,
                    )

                altered_credential = dict(credential)
                altered_credential["response"] = dict(credential["response"])
                altered_signature = bytearray(signature)
                altered_signature[-1] ^= 0x01
                altered_credential["response"]["signature"] = b64url(
                    bytes(altered_signature)
                )
                with self.assertRaises(PasskeyVerificationError):
                    service.verify_authentication(
                        credential=altered_credential,
                        challenge=challenge,
                        credential_public_key=cose_public_key,
                        current_sign_count=7,
                    )


if __name__ == "__main__":
    unittest.main()

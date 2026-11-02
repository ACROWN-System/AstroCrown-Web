"""WebAuthn relying-party boundary for the local AstroCrown account prototype.

Private keys never enter this module or the application database. The maintained
Duo Labs 'webauthn' package performs standards-level parsing and cryptographic
verification. RP ID and origin are supplied by the loopback server configuration.
"""
from __future__ import annotations

import json
from typing import Any

try:
    from webauthn import (
        base64url_to_bytes,
        generate_authentication_options,
        generate_registration_options,
        options_to_json,
        verify_authentication_response,
        verify_registration_response,
    )
    from webauthn.helpers.structs import (
        AttestationConveyancePreference,
        AuthenticatorSelectionCriteria,
        ResidentKeyRequirement,
        UserVerificationRequirement,
    )
except ImportError as error:  # Fail closed when the reviewed dependency is absent.
    WEBAUTHN_IMPORT_ERROR = type(error).__name__
    base64url_to_bytes = None
    generate_authentication_options = None
    generate_registration_options = None
    options_to_json = None
    verify_authentication_response = None
    verify_registration_response = None
    AttestationConveyancePreference = None
    AuthenticatorSelectionCriteria = None
    ResidentKeyRequirement = None
    UserVerificationRequirement = None
else:
    WEBAUTHN_IMPORT_ERROR = None


class PasskeyUnavailable(RuntimeError):
    """Raised when the WebAuthn relying-party dependency is not installed."""


class PasskeyVerificationError(ValueError):
    """Raised when a WebAuthn response cannot be verified."""


class PasskeyAuthService:
    """Strict WebAuthn registration and discoverable-credential authentication."""

    CHALLENGE_BYTES = 32
    BROWSER_TIMEOUT_MS = 60_000

    def __init__(self, *, rp_id: str, rp_name: str, origin: str):
        if WEBAUTHN_IMPORT_ERROR is not None:
            raise PasskeyUnavailable(
                "The pinned WebAuthn verification library is not installed."
            )
        if not isinstance(rp_id, str) or not rp_id or len(rp_id) > 253:
            raise ValueError("A valid WebAuthn RP ID is required.")
        if not isinstance(origin, str) or not origin.startswith(("https://", "http://localhost")):
            raise ValueError("A secure WebAuthn origin is required.")
        if not isinstance(rp_name, str) or not rp_name.strip():
            raise ValueError("A WebAuthn RP display name is required.")
        self.rp_id = rp_id
        self.rp_name = rp_name.strip()
        self.origin = origin

    @staticmethod
    def _options_dict(options: Any) -> dict[str, Any]:
        result = json.loads(options_to_json(options))
        if not isinstance(result, dict):
            raise PasskeyVerificationError("The WebAuthn library returned invalid options.")
        return result

    def registration_options(
        self,
        *,
        user_id: bytes,
        user_name: str,
        user_display_name: str,
        challenge: bytes,
        exclude_credential_ids: list[bytes] | None = None,
    ) -> dict[str, Any]:
        if not isinstance(user_id, bytes) or len(user_id) != 16:
            raise ValueError("The account user handle must be exactly 16 random bytes.")
        if not isinstance(challenge, bytes) or len(challenge) != self.CHALLENGE_BYTES:
            raise ValueError("The WebAuthn challenge must contain 32 random bytes.")
        if not user_name or len(user_name) > 64 or not user_display_name:
            raise ValueError("A non-sensitive account label is required.")
        excluded = []
        if exclude_credential_ids:
            from webauthn.helpers.structs import PublicKeyCredentialDescriptor

            excluded = [PublicKeyCredentialDescriptor(id=item) for item in exclude_credential_ids]
        options = generate_registration_options(
            rp_id=self.rp_id,
            rp_name=self.rp_name,
            user_id=user_id,
            user_name=user_name,
            user_display_name=user_display_name,
            challenge=challenge,
            timeout=self.BROWSER_TIMEOUT_MS,
            attestation=AttestationConveyancePreference.NONE,
            authenticator_selection=AuthenticatorSelectionCriteria(
                resident_key=ResidentKeyRequirement.REQUIRED,
                user_verification=UserVerificationRequirement.REQUIRED,
            ),
            exclude_credentials=excluded,
        )
        return self._options_dict(options)

    def authentication_options(self, *, challenge: bytes) -> dict[str, Any]:
        if not isinstance(challenge, bytes) or len(challenge) != self.CHALLENGE_BYTES:
            raise ValueError("The WebAuthn challenge must contain 32 random bytes.")
        options = generate_authentication_options(
            rp_id=self.rp_id,
            challenge=challenge,
            timeout=self.BROWSER_TIMEOUT_MS,
            user_verification=UserVerificationRequirement.REQUIRED,
        )
        # This is a discoverable-credential ceremony. Omitting allowCredentials
        # lets the authenticator choose a resident credential without an email
        # address or account identifier being supplied to AstroCrown.
        result = self._options_dict(options)
        result.pop("allowCredentials", None)
        return result

    def verify_registration(self, *, credential: dict[str, Any], challenge: bytes):
        if not isinstance(credential, dict):
            raise PasskeyVerificationError("A WebAuthn registration response is required.")
        try:
            return verify_registration_response(
                credential=credential,
                expected_challenge=challenge,
                expected_rp_id=self.rp_id,
                expected_origin=self.origin,
                require_user_presence=True,
                require_user_verification=True,
            )
        except Exception as error:
            raise PasskeyVerificationError("The passkey registration proof was not accepted.") from error

    def verify_authentication(
        self,
        *,
        credential: dict[str, Any],
        challenge: bytes,
        credential_public_key: bytes,
        current_sign_count: int,
    ):
        if not isinstance(credential, dict):
            raise PasskeyVerificationError("A WebAuthn authentication response is required.")
        try:
            return verify_authentication_response(
                credential=credential,
                expected_challenge=challenge,
                expected_rp_id=self.rp_id,
                expected_origin=self.origin,
                credential_public_key=credential_public_key,
                credential_current_sign_count=current_sign_count,
                require_user_verification=True,
            )
        except Exception as error:
            raise PasskeyVerificationError("The passkey authentication proof was not accepted.") from error

    @staticmethod
    def credential_id_from_response(credential: dict[str, Any]) -> tuple[str, bytes]:
        if not isinstance(credential, dict):
            raise PasskeyVerificationError("A WebAuthn credential response is required.")
        credential_id = credential.get("id")
        raw_id = credential.get("rawId")
        if not isinstance(credential_id, str) or not isinstance(raw_id, str):
            raise PasskeyVerificationError("The WebAuthn credential identifier is missing.")
        try:
            decoded_id = base64url_to_bytes(credential_id)
            decoded_raw_id = base64url_to_bytes(raw_id)
        except Exception as error:
            raise PasskeyVerificationError("The WebAuthn credential identifier is malformed.") from error
        if not decoded_id or decoded_id != decoded_raw_id or len(decoded_id) > 1024:
            raise PasskeyVerificationError("The WebAuthn credential identifier is invalid.")
        return credential_id, decoded_id

    @staticmethod
    def user_handle_from_response(credential: dict[str, Any]) -> bytes | None:
        try:
            user_handle = credential["response"].get("userHandle")
        except (KeyError, AttributeError, TypeError):
            return None
        if user_handle is None:
            return None
        if not isinstance(user_handle, str):
            raise PasskeyVerificationError("The WebAuthn user handle is malformed.")
        try:
            value = base64url_to_bytes(user_handle)
        except Exception as error:
            raise PasskeyVerificationError("The WebAuthn user handle is malformed.") from error
        if len(value) != 16:
            raise PasskeyVerificationError("The WebAuthn user handle is invalid.")
        return value

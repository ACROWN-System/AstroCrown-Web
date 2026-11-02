#!/usr/bin/env python3
"""Owner-operated, development-only administrator provisioning utility.

There is deliberately no HTTP endpoint for granting roles or enrolling admin
wallets. This command requires local operating-system/database access, an
explicit confirmation string, and a reason recorded in the audit table.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import uuid
from pathlib import Path
from typing import Any

PROTOTYPE_DIR = Path(__file__).resolve().parent
if str(PROTOTYPE_DIR) not in sys.path:
    sys.path.insert(0, str(PROTOTYPE_DIR))

from server import AccountApplication, DEFAULT_DATABASE, normalize_account_identifier, utc_iso  # noqa: E402

ADDRESS_SHAPE = re.compile(r"^0x[0-9a-fA-F]{40}$")
MAX_ADMIN_WALLETS = 3
ADMIN_PERMISSION_NAMES = frozenset({"admin.roles.grant", "admin.roles.revoke"})
GRANT_CONFIRMATION = "GRANT LOCAL ADMIN"
REVOKE_CONFIRMATION = "REVOKE LOCAL ADMIN"


def _validated_wallet(address: object, chain_id: object) -> tuple[str, int]:
    if not isinstance(address, str) or not ADDRESS_SHAPE.fullmatch(address):
        raise ValueError("Provide a valid 0x-prefixed 40-hex-character wallet address.")
    if type(chain_id) is not int or chain_id <= 0 or chain_id > (2**64 - 1):
        raise ValueError("Chain ID must be a positive integer in the supported range.")
    try:
        from wallet_auth_core import parse_address, parse_chain_id
    except ImportError:
        raise ValueError(
            "The pinned SIWE dependencies are unavailable. Install "
            "development/auth-prototype/requirements.txt before provisioning an administrator."
        ) from None
    try:
        return parse_address(address), parse_chain_id(chain_id)
    except Exception as error:
        raise ValueError(str(error)) from None


def _validated_reason(reason: object) -> str:
    if not isinstance(reason, str):
        raise ValueError("A provisioning reason is required.")
    value = " ".join(reason.split())
    if len(value) < 12 or len(value) > 500:
        raise ValueError("Provide a clear audit reason (12 to 500 characters).")
    return value


def _validated_permissions(value: object, label: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, (list, tuple)):
        raise ValueError(label + " must be a list of recognized permissions.")
    items = list(value)
    if len(items) > len(ADMIN_PERMISSION_NAMES):
        raise ValueError(label + " contains too many permissions.")
    if any(not isinstance(item, str) or item not in ADMIN_PERMISSION_NAMES for item in items):
        raise ValueError(label + " contains an unknown permission.")
    if len(set(items)) != len(items):
        raise ValueError(label + " must not contain duplicates.")
    return sorted(items)


def grant_admin(
    application: AccountApplication,
    *,
    account_identifier: str,
    wallet_address: str,
    chain_id: int,
    reason: str,
    actor: str = "local-owner-cli",
    permissions: list[str] | tuple[str, ...] | None = None,
    delegable_permissions: list[str] | tuple[str, ...] | None = None,
) -> dict[str, Any]:
    """Assign the role and provision one wallet through local operator authority.

    This is intentionally a local CLI operation, not a public API. A wallet is
    an allowlisted candidate for the step-up flow; it receives no access until
    it proves control through a fresh server-issued SIWE challenge.
    """
    normalized_identifier = normalize_account_identifier(
        account_identifier,
        allow_legacy_email=application.enable_legacy_email_auth,
    )
    address, validated_chain = _validated_wallet(wallet_address, chain_id)
    audit_reason = _validated_reason(reason)
    supplied_permissions = None if permissions is None else _validated_permissions(permissions, "Permissions")
    supplied_delegable = None if delegable_permissions is None else _validated_permissions(
        delegable_permissions, "Delegable permissions"
    )
    if supplied_delegable is not None and supplied_permissions is None:
        raise ValueError("Specify the permission list when marking permissions as delegable.")
    if supplied_permissions is not None and supplied_delegable is not None and not set(supplied_delegable).issubset(supplied_permissions):
        raise ValueError("A permission cannot be marked delegable unless it is also granted.")
    if not isinstance(actor, str) or not actor.strip() or len(actor) > 120:
        raise ValueError("Actor must be a non-empty label of at most 120 characters.")
    actor = actor.strip()

    with application.connect() as db:
        account = db.execute(
            "SELECT account_id, username, role FROM accounts WHERE username = ? COLLATE NOCASE",
            (normalized_identifier,),
        ).fetchone()
        if account is None:
            raise ValueError("No local account exists for that account identifier.")
        account_id = account["account_id"]

        duplicate = db.execute(
            "SELECT account_id, chain_id, active FROM admin_wallets WHERE address = ? COLLATE NOCASE",
            (address,),
        ).fetchone()
        if duplicate is not None:
            if duplicate["account_id"] != account_id:
                raise ValueError("That wallet is already associated with a different local admin account.")
            if duplicate["active"]:
                if int(duplicate["chain_id"]) == validated_chain:
                    raise ValueError("That wallet is already enrolled for this local admin account.")
                raise ValueError("That wallet is enrolled with a different chain ID; use an explicit reviewed change.")
            # Re-activation is deliberately blocked in this prototype so that a
            # previously revoked address cannot be silently restored.
            raise ValueError("That wallet was previously revoked; provision a newly reviewed wallet entry.")

        active_count = int(
            db.execute(
                "SELECT COUNT(*) FROM admin_wallets WHERE account_id = ? AND active = 1",
                (account_id,),
            ).fetchone()[0]
        )
        if active_count >= MAX_ADMIN_WALLETS:
            raise ValueError("An administrator may have no more than three active wallets.")

        now = utc_iso()
        db.execute(
            "UPDATE accounts SET role = 'admin' WHERE account_id = ?",
            (account_id,),
        )
        # Supplying permissions explicitly replaces the local bootstrap permission
        # set. Omitting them preserves an existing administrator's permission set
        # when this CLI is used only to add a second or third test wallet.
        if supplied_permissions is not None or account["role"] != "admin":
            db.execute("DELETE FROM account_admin_permissions WHERE account_id = ?", (account_id,))
            for permission in supplied_permissions or []:
                db.execute(
                    """INSERT INTO account_admin_permissions(
                           account_id, permission, can_delegate, granted_by_account_id, reason, created_at
                       ) VALUES (?, ?, ?, NULL, ?, ?)""",
                    (
                        account_id, permission,
                        int(permission in (supplied_delegable or [])),
                        audit_reason, now,
                    ),
                )
        db.execute(
            """INSERT INTO admin_wallets(
                   wallet_id, account_id, address, chain_id, created_at, active, provisioning_source
               ) VALUES (?, ?, ?, ?, ?, 1, 'local-owner-provisioning')""",
            (str(uuid.uuid4()), account_id, address, validated_chain, now),
        )
        # Any prior step-up state is invalidated when authority/wallet inventory
        # changes; an account must prove control again.
        db.execute(
            """UPDATE sessions SET admin_wallet_address = NULL,
                   admin_authenticated_at = NULL, admin_expires_at = NULL
               WHERE account_id = ?""",
            (account_id,),
        )
        bootstrap_detail = json.dumps(
            {
                "role_assigned": account["role"] != "admin",
                "permissions_assigned": supplied_permissions,
                "delegable_permissions_assigned": supplied_delegable,
                "permissions_preserved": supplied_permissions is None and account["role"] == "admin",
                "wallet_provisioned": address,
                "chain_id": validated_chain,
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        db.execute(
            """INSERT INTO account_admin_audit(
                   audit_id, event_type, actor, target_account_id,
                   target_wallet_address, reason, created_at, detail
               ) VALUES (?, 'admin_wallet_provisioned', ?, ?, ?, ?, ?, ?)""",
            (str(uuid.uuid4()), actor, account_id, address, audit_reason, now, bootstrap_detail),
        )
    return {
        "account_id": account_id,
        "account_identifier": account["username"],
        "role": "admin",
        "wallet_address": address,
        "chain_id": validated_chain,
        "active_wallet_count": active_count + 1,
        "audit_reason": audit_reason,
    }


def revoke_admin(
    application: AccountApplication,
    *,
    account_identifier: str,
    reason: str,
    actor: str = "local-owner-cli",
) -> dict[str, Any]:
    """Revoke the local prototype admin role, wallets and all admin step-up states."""
    normalized_identifier = normalize_account_identifier(
        account_identifier,
        allow_legacy_email=application.enable_legacy_email_auth,
    )
    audit_reason = _validated_reason(reason)
    if not isinstance(actor, str) or not actor.strip() or len(actor) > 120:
        raise ValueError("Actor must be a non-empty label of at most 120 characters.")
    actor = actor.strip()

    with application.connect() as db:
        account = db.execute(
            "SELECT account_id, username, role FROM accounts WHERE username = ? COLLATE NOCASE",
            (normalized_identifier,),
        ).fetchone()
        if account is None:
            raise ValueError("No local account exists for that account identifier.")
        account_id = account["account_id"]
        active_count = int(db.execute(
            "SELECT COUNT(*) FROM admin_wallets WHERE account_id = ? AND active = 1",
            (account_id,),
        ).fetchone()[0])
        previous_permissions = [
            row["permission"] for row in db.execute(
                "SELECT permission FROM account_admin_permissions WHERE account_id = ? ORDER BY permission",
                (account_id,),
            ).fetchall()
        ]
        previous_role = account["role"]
        now = utc_iso()
        db.execute(
            "UPDATE admin_wallets SET active = 0 WHERE account_id = ? AND active = 1",
            (account_id,),
        )
        db.execute(
            "UPDATE accounts SET role = 'user' WHERE account_id = ?",
            (account_id,),
        )
        db.execute("DELETE FROM account_admin_permissions WHERE account_id = ?", (account_id,))
        db.execute(
            """UPDATE sessions SET admin_wallet_address = NULL,
                   admin_authenticated_at = NULL, admin_expires_at = NULL
               WHERE account_id = ?""",
            (account_id,),
        )
        revoke_detail = json.dumps(
            {
                "role_before": previous_role,
                "role_after": "user",
                "permissions_revoked": previous_permissions,
                "wallets_disabled": active_count,
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        db.execute(
            """INSERT INTO account_admin_audit(
                   audit_id, event_type, actor, target_account_id,
                   target_wallet_address, reason, created_at, detail
               ) VALUES (?, 'admin_role_revoked', ?, ?, NULL, ?, ?, ?)""",
            (str(uuid.uuid4()), actor, account_id, audit_reason, now, revoke_detail),
        )
    return {
        "account_id": account_id,
        "account_identifier": account["username"],
        "role": "user",
        "revoked_wallet_count": active_count,
        "audit_reason": audit_reason,
    }


def _confirm(expected: str, supplied: str | None) -> None:
    if supplied == expected:
        return
    if supplied:
        raise ValueError(f"Confirmation must be exactly: {expected}")
    if not sys.stdin.isatty():
        raise ValueError(f"Supply --confirm \"{expected}\" in non-interactive mode.")
    typed = input(f"This operation changes local administrator authority. Type exactly '{expected}' to continue: ")
    if typed != expected:
        raise ValueError("Confirmation did not match; no changes were made.")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Owner-operated local admin provisioning for the development-only prototype.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DATABASE, help="Same SQLite database used by server.py.")
    parser.add_argument("--actor", default="local-owner-cli", help="Audit label for the authorized local operator.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    grant = subparsers.add_parser("grant", help="Grant local admin role and provision one wallet.")
    grant.add_argument("--account-identifier", required=True, help="Existing member's AC- account identifier.")
    grant.add_argument("--wallet", required=True, help="Public wallet address only; never a seed/private key.")
    grant.add_argument("--chain-id", required=True, type=int)
    grant.add_argument("--reason", required=True)
    grant.add_argument(
        "--permission", action="append", choices=sorted(ADMIN_PERMISSION_NAMES), default=None,
        help="Explicitly grant this permission to the bootstrapped administrator; repeat as needed.",
    )
    grant.add_argument(
        "--delegable-permission", action="append", choices=sorted(ADMIN_PERMISSION_NAMES), default=None,
        help="Allow this bootstrap permission to be delegated onward; repeat as needed.",
    )
    grant.add_argument("--confirm", default=None)

    revoke = subparsers.add_parser("revoke", help="Revoke local admin role and disable all enrolled wallets.")
    revoke.add_argument("--account-identifier", required=True, help="Existing member's AC- account identifier.")
    revoke.add_argument("--reason", required=True)
    revoke.add_argument("--confirm", default=None)

    args = parser.parse_args(argv)
    try:
        _confirm(GRANT_CONFIRMATION if args.command == "grant" else REVOKE_CONFIRMATION, args.confirm)
        application = AccountApplication(args.db)
        if args.command == "grant":
            result = grant_admin(
                application, account_identifier=args.account_identifier, wallet_address=args.wallet,
                chain_id=args.chain_id, reason=args.reason, actor=args.actor,
                permissions=args.permission, delegable_permissions=args.delegable_permission,
            )
        else:
            result = revoke_admin(
                application, account_identifier=args.account_identifier, reason=args.reason, actor=args.actor
            )
    except (ValueError, OSError) as error:
        print("No admin change was completed: " + str(error), file=sys.stderr)
        return 2
    print("Development-only administrator provisioning completed.")
    print("Account identifier: " + result["account_identifier"])
    print("Role: " + result["role"])
    if args.command == "grant":
        print("Wallet: " + result["wallet_address"] + " (chain ID " + str(result["chain_id"]) + ")")
        print("Active wallets: " + str(result["active_wallet_count"]) + "/3")
        print("Granted permissions: " + (", ".join(args.permission or []) if args.permission is not None else "preserved"))
        print("Delegable permissions: " + (", ".join(args.delegable_permission or []) if args.delegable_permission is not None else "unchanged"))
        print("A fresh signature from this registered wallet is still required for admin access.")
    else:
        print("Disabled admin wallets: " + str(result["revoked_wallet_count"]))
        print("Existing ordinary account credentials remain; admin access is revoked.")
    print("Audit reason recorded. No wallet secret or private key was requested or stored.")
    print("This script is for an isolated local development database only.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

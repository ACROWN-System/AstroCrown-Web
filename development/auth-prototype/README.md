# AstroCrown Local Wallet Authentication Test

**Status:** local development prototype only; not production authentication.

This prototype checks the basic EOA / EIP-191 message-signing flow using the ERC-4361 / Sign-In with Ethereum (SIWE) message format. It is deliberately isolated from the announcement editor and does not depend on PR #140 being merged.

## Safety boundaries

- The server binds only to \`127.0.0.1\` and serves the UI at \`http://localhost:8765/\`.
- It does not create blockchain transactions, require funds/gas, use email or an external identity provider, call a blockchain RPC from the application, or use a wallet relay.
- The wallet is asked to sign a short-lived SIWE login message only after an explicit click. Read the full message before approving.
- Never enter or share a seed phrase/private key. The server has no field or endpoint for either.
- It uses in-memory challenges and sessions only. Restarting the server clears them. This is not suitable for real accounts, remote users, production data, or network exposure.
- Only injected EIP-1193 EOA wallets are in scope. Smart-contract wallets (ERC-1271), wallet linking/recovery, roles, account creation, persistent storage and publishing are excluded.
- The Python SIWE library candidate has not undergone a formal security audit. Passing these tests is prototype evidence, not a security certification or production approval.

## Run locally

Use Python 3.12 or another supported version after installing the pinned requirements.

**Windows PowerShell:**

\`\`\`powershell
cd development/auth-prototype
py -3.12 -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
python -m pip install -r requirements.txt
python server.py
\`\`\`

Then open exactly \`http://localhost:8765/\` in the browser profile containing the test wallet. Do not substitute a LAN IP, forwarded port, tunnel, public hostname or different local domain.

1. Click **Connect test wallet**. The browser wallet will ask you to connect an account, then the page will display the server-issued SIWE message.
2. Read the entire message. Confirm that it identifies \`localhost:8765\`, the account you selected and the chain ID reported by the wallet.
3. Click **Sign in with wallet** only when the wallet's signing prompt matches the message on the page. This is a message signature, not a transaction. Cancel is safe.
4. Confirm that the local page reports a verified address and temporary session; then use **End local session** to test revocation.
5. Stop the server with Ctrl+C.

The user-wallet test should happen only after the dedicated workflow passes the full offline/HTTP test suite on the exact candidate commit. If the browser wallet shows an unexpected domain, message, transaction request or seed/private-key request, reject it and report what happened without sharing secrets.

## Tests

From the repository root, the current workflow runs the prototype's unit and loopback HTTP tests plus JavaScript syntax validation. The deterministic keys in \`tests/test_auth.py\` are public test fixtures only; they are not user credentials.

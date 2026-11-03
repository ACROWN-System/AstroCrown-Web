# Temporary HTTPS live-test environment

**Purpose:** test the passkey-first prototype in a real browser using synthetic details and disposable credentials.  
**Not:** production hosting, public account launch, production data storage, formal security certification or permission to use real account/recovery/wallet information.

## Why a separate runner is needed

The ordinary prototype server intentionally binds to 127.0.0.1 and its WebAuthn configuration is bound to localhost. GitHub Pages and HTML preview proxies publish static files; they do not run the Python account backend. This runner starts the same backend locally, then exposes it through a temporary HTTPS Cloudflare Quick Tunnel so WebAuthn sees a secure origin and an exact RP ID.

Cloudflare describes Quick Tunnels as temporary trycloudflare.com URLs that require no Cloudflare account or custom domain. The URL works only while cloudflared runs. It is internet-reachable, so this runner adds an HTTP Basic Authentication gate. Read Cloudflare's [Quick Tunnel documentation](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

## Windows setup

1. Use Python 3.12 and a current Chrome or Edge browser.
2. Download the official Windows cloudflared executable from the [Cloudflare downloads page](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/). Use the 64-bit executable for a typical modern Windows PC and add its directory to PATH.
3. Open PowerShell in a local checkout of the docs/provider-independent-wallet-auth-plan-2026-10-20 branch of ACROWN-System/AstroCrown-Web.
4. Install the pinned prototype requirements:

    py -3.12 -m pip install -r .\development\account-continuity\prototype\requirements.txt -r .\development\auth-prototype\requirements.txt

5. Start the temporary HTTPS test site:

    py -3.12 .\development\account-continuity\prototype\live_test_tunnel.py

## Opening the live test website

The terminal prints the temporary HTTPS URL, the Basic Authentication username acrown-test and a freshly generated random access code. Open the printed URL with ?account-live-test=1 already included. When the browser asks for HTTP Basic Authentication, enter the username and code.

Do not post or share the URL and access code together. The access code is generated for one run and is never saved in the repository or GitHub secrets. Eight incorrect supplied codes lock that run until it is restarted. Keep the terminal open while testing.

The page displays a prominent warning. The Wallet control is disabled because this shared test is limited to ordinary passkey accounts.

## What is isolated

- Each run gets a new temporary SQLite database. It does not open the usual local prototype database or a production database.
- The Python backend listens only on 127.0.0.1. No router port-forwarding or inbound firewall opening is needed.
- The browser-facing Host and Origin must exactly match the generated HTTPS URL. The WebAuthn RP ID is the exact temporary hostname; it is not wildcarded.
- Session cookies are Secure, HttpOnly and SameSite=Strict.
- Every page and API request is gated by the temporary Basic Authentication code. Request bodies, cookies and credentials are not written to access logs by the adapter.
- No email, SMS, external identity provider, production credential, production database, real wallet secret or paid AI/API provider is involved.
- The session ends on Ctrl+C or after four hours. Normal shutdown removes the temporary database directory.

## What to test

1. Open Account → Sign Up and create an account using a new test-only passkey.
2. Save the generated test account identifier and one-time recovery key temporarily and privately for this test. Never reuse a production recovery key.
3. Sign out and use discoverable passkey sign-in.
4. Open the User dashboard and inspect the passkey and recovery status.
5. Use the one-time recovery key to replace the passkey. Verify that the old passkey/session is revoked and a replacement recovery key is issued.
6. Stop the runner with Ctrl+C. The temporary URL should stop responding and the local temporary database is removed on normal shutdown.

This shared temporary test path covers ordinary account passkey registration, sign-in, dashboard and recovery only. It does not provision an administrator role or enable administrator wallet step-up. Those privileged scenarios remain covered by local tests pending a separate disposable-wallet procedure.

## Important limitations

- A Quick Tunnel is internet-reachable. The Basic Authentication code is a temporary barrier, not a production identity/access system. Do not share the URL and code together.
- Cloudflare terminates public HTTPS and carries the traffic to the local connector. Cloudflare therefore processes traffic at its public edge. Only synthetic details are allowed.
- Passkeys created on the random test hostname are scoped to that hostname. They cannot be transferred to the production RP ID. Public users will enrol fresh passkeys after the production domain and origin are established.
- Normal temporary-directory cleanup is not a certified secure-erasure process. Abrupt termination may leave a temporary directory in the OS temp area; confirm that the runner is stopped before removing any acrown-passkey-live-test-* directory.
- This is an operator-started temporary test session, not a continuously available website or a service-level uptime commitment. Do not deploy this runner or Quick Tunnel as the production account service.

For the WebAuthn secure-context and RP ID rules, see the [W3C Web Authentication specification](https://www.w3.org/TR/webauthn/).

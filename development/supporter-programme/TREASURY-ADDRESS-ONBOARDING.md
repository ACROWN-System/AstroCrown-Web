# ACROWN Genesis Programme — Treasury Address Onboarding

**Status:** Three owner-supplied public addresses passed format checks; custody verification and treasury staging remain pending; no payments accepted.  
**Last reviewed:** 17 November 2026  
**Applies to:** The isolated `acrown-supporters-mainnet` D1 database only.

## 1. Required receiving addresses

The programme needs one public receiving address for each supported mainnet:

| Network | Transfer standard | Canonical USD₮ identifier |
|---|---|---|
| Ethereum Mainnet | ERC-20 | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| Tron Mainnet | TRC-20 | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` |
| Solana Mainnet | SPL Token | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` |

These are three network-specific destinations. Do not assume that an address on one network is a receiving address on another. The programme's ACROWN delivery wallet remains a separate Solana wallet selected and verified by each participant.

Only the public receiving addresses are required by the application. Never put a seed phrase, private key, hardware-wallet recovery material, signing export or password into ChatGPT, GitHub, source code, D1, Worker variables or CI.

## 2. Offline address staging utility

The Worker package contains:

`development/account-continuity/worker/scripts/prepare-genesis-treasuries.mjs`

It accepts a JSON object through standard input and validates:
- Ethereum address syntax/checksum;
- Tron mainnet Base58Check address and prefix;
- Solana canonical Base58 32-byte public-key format;
- the exact three-network allowlist and canonical USD₮ identifiers.

Example input file, created and kept locally (do not commit it):

```json
{
  "ethereum": "YOUR_ETHEREUM_PUBLIC_RECEIVING_ADDRESS",
  "tron": "YOUR_TRON_PUBLIC_RECEIVING_ADDRESS",
  "solana": "YOUR_SOLANA_PUBLIC_RECEIVING_ADDRESS"
}
```

Run from `development/account-continuity/worker`:

```sh
node scripts/prepare-genesis-treasuries.mjs < /secure/local/path/genesis-treasuries.json > /secure/local/path/genesis-treasuries.sql
```

The utility prints SQL that stages the addresses in the existing `supporter_network_config` rows. For every network, it explicitly:
- writes only the public address;
- sets `enabled=0`;
- clears `decimals_verified_at` and `config_version` so previous verification cannot be reused after an address change;
- retains the canonical network and token identifiers.

The SQL does not enable intake, create a payment intent, broadcast a transfer, verify custody, prove control of the address, or verify live token decimals. The utility performs no RPC/network call and does not contact Cloudflare. Its address checks are format checks only.

## 2.1 Local Ethereum treasury ownership proof

A preliminary local-only Ethereum proof utility is provided at:

`development/account-continuity/worker/scripts/genesis-ethereum-treasury-proof.mjs`

From `development/account-continuity/worker`, run:

```sh
npm run genesis:treasury-proof:ethereum
```

The tool asks only for the public Ethereum receiving address, then starts a server bound to `127.0.0.1:8765`. Open the exact printed URL in the Edge profile containing the Genesis MetaMask wallet. It checks that the connected account matches the supplied address and that MetaMask reports Ethereum Mainnet (chain ID 1). If either check fails, it does not request a signature.

The challenge is generated locally with a random one-use nonce, a five-minute expiry, the exact wallet address, Ethereum Mainnet chain ID, the loopback origin and an explicit statement that the signature authorizes no transaction, token approval, transfer, payment or spending. The tool requests EIP-191 `personal_sign` only, then independently recovers and compares the signer using the existing `viem` dependency.

A successful result is saved as a local JSON evidence file under:

`Documents/AstroCrown/Genesis/TreasuryProofs/`

The evidence file contains the public address, challenge, message signature and verification metadata. Keep it locally; do not commit it to GitHub. This proves control of the address at the recorded time only. It is a preliminary local custody attestation, not proof of legal ownership, continuing control, operational payment readiness or a production-domain authentication flow. The tool does not contact an RPC provider, Cloudflare, a website backend or any external service. It sends no transaction.

**Stop and reject the prompt** if MetaMask displays a transaction, token approval, spending permission or any request other than signing the exact readable message shown by the local page. Do not sign a message you have not reviewed.

This tool covers Ethereum only. Solana and TRON require separate proof paths. The TRON process must account for MetaMask's documented lack of extension dapp-connectivity for TRON; do not assume the Ethereum `personal_sign` flow works for TRON.

## 3. Where the generated SQL may be applied

Apply the generated SQL only after the dedicated mainnet D1 database has been separately provisioned and its exact database identity has been verified. The intended database name is `acrown-supporters-mainnet`; never apply this file to `acrown-account-staging`, the ordinary account database, or a test database.

The current repository's Wrangler configuration still contains unprovisioned zero-UUID D1 placeholders. This is not evidence that a remote database exists or is ready. No remote database creation, binding, migration, Worker deployment or Cloudflare setting change is included in this code change.

The public status endpoint deliberately never returns an address. It reports only whether an address is present, whether its syntax passes the network-specific format check, and whether the network configuration is enabled. Payment acceptance remains hard-coded disabled regardless of these status values.

## 4. Required work after address staging

**Current owner-input state — 17 November 2026:** One public address for each of the three networks has now been supplied outside the repository. Each passes the same network-specific format criteria implemented by the offline utility. The address values are intentionally not reproduced in this guide or committed to GitHub. A local Ethereum proof utility is now available but has not been run; no proof evidence has yet been created. No generated SQL has been applied, no address has been configured in D1, and independent custody/control and live token-state verification remain outstanding.

Address staging is not proof that AstroCrown controls the wallet. Before a network can be enabled, the operator must complete and preserve evidence for all of the following:

1. **Custody/control verification:** independently demonstrate control of each receiving address using an approved, domain-bound off-chain signing challenge or an equivalent custody attestation. No transfer of funds is required merely to prove message-signing control.
   - MetaMask Connect currently documents off-chain message signing for EVM and Solana. MetaMask's current TRON help page says TRON dapp connectivity is not yet available in the Extension; therefore, do not assume the same MetaMask dapp-signing flow can prove control of the TRON address. Use a separately reviewed TRON-compatible signing or custody-attestation route. See the official [MetaMask Connect multichain message-signing guide](https://docs.metamask.io/metamask-connect/multichain/guides/sign-transactions/) and [MetaMask TRON guide](https://support.metamask.io/configure/networks/tron/).
2. **Live token verification:** query the intended mainnet and independently verify the canonical USD₮ token contract/mint, token-program identity where applicable, and six-decimal precision.
   - MetaMask's current TRON guidance also says newly created TRON accounts must be activated before use, and that receiving USDT does not activate an account. Define and qualify the activation method and who supplies any required TRX/TRC-10 before TRON payment intake can be enabled. Do not perform an activation transfer as part of this address-format stage.
3. **Independent RPC quorum:** qualify at least two independently operated RPC sources per network; compare normalized transaction/account evidence and define provider disagreement, outage, quota and failover behaviour.
4. **Receiving and reconciliation tests:** implement and qualify transaction discovery, exact sender/destination/token/amount parsing, finality, reorganisation handling, duplicate/event-index prevention, underpayment, overpayment, incorrect-token and wrong-network handling.
5. **Custody and operations:** document offline backups, signing separation, approval thresholds, incident handling, expense controls, treasury segregation and reconciliation.
6. **Release gates:** complete legal, privacy, refund/remedy, security and operational reviews. Payment acceptance requires a separate explicit owner authorization after the actual deployed build and bindings are verified.

A successful address-format check must never be described as wallet ownership verification, on-chain verification, payment readiness or operational payment acceptance.

## 5. Current operational boundary

As of 17 November 2026:

- no Ethereum, Tron or Solana receiving address is committed to the repository;
- no wallet private key or seed phrase is needed by this integration;
- the database migrations seed the three canonical token identities with empty receiving addresses and disabled networks;
- the Worker status endpoint is read-only;
- payment-intent, transfer-submission, chain-monitoring and entitlement-credit endpoints are not implemented;
- payment acceptance remains disabled;
- the programme page remains a prelaunch information and wallet-ownership prototype. Visitors must not send funds.

The three public receiving addresses have now been supplied. The remaining prerequisites are independent custody/control proof, live mainnet token and decimal verification, and provision plus identity verification of the dedicated D1 database. No private key or recovery phrase should be shared.

# Genesis Mainnet USDT Payment Evidence Verification

**Status:** local, read-only evidence parsing and reconciliation foundation.  
**Payment acceptance:** disabled.  
**Entitlement credit:** not implemented by this module.  
**Remote deployment / remote D1 migration:** not performed.

## Purpose

This module defines deterministic checks for whether a submitted transaction reference corresponds to one exact USDT transfer from a wallet already verified by Genesis to the configured Genesis treasury. It is deliberately not an HTTP payment endpoint, payment-intent service, RPC client, contribution writer or entitlement ledger.

Source code:
- `../account-continuity/worker/src/genesis-payment-evidence.js`
- `../account-continuity/worker/tests/genesis-payment-evidence.test.mjs`

## Canonical assets

All values are chain-specific and must be re-read from the appropriate mainnet before activation. Ticker, icon, token name or wallet display label is never sufficient.

| Network | Network identity | Canonical USDT asset | Required decimals |
|---|---|---|---:|
| Ethereum | EIP-155 chain id 1 | ERC-20 `0xdAC17F958D2ee523a2206206994597C13D831ec7` | 6 |
| TRON | TRON Mainnet | TRC-20 `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` | 6 |
| Solana | Mainnet Beta genesis hash `5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | SPL mint `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`, classic Token Program `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` | 6 |

The parsers require caller-supplied on-chain metadata:
- Ethereum: canonical contract address, chain id 1 and `decimals() = 6`.
- TRON: canonical contract address, Mainnet tag and six-decimal token metadata.
- Solana: canonical mint, expected classic Token Program owner and six-decimal mint metadata. Parsed transferChecked instructions and pre/post token balances must also report six decimals.

The caller must obtain those fields from the appropriate on-chain RPC methods on the same independently qualified mainnet source; the values must not come from a browser, participant request, cached static configuration alone or a user-provided JSON payload.

## Chain-specific evidence

### Ethereum Mainnet

`parseEthereumUsdtTransferEvidence` requires:
1. RPC chain id 1 and canonical USDT contract metadata with six decimals.
2. Successful transaction receipt, with the exact submitted transaction hash.
3. Canonical block hash at the receipt's block height; the hash must match the receipt.
4. A `safe` or `finalized` block head at or beyond the receipt's block height.
5. Exactly one canonical USDT `Transfer(address,address,uint256)` log whose indexed sender and recipient are the verified source wallet and configured Genesis treasury, and whose exact integer value equals the payment intent amount in six-decimal base units.

The event's log index is retained as the transfer index. A receipt being returned by an RPC is not by itself proof of finality.

### TRON Mainnet

`parseTronUsdtTransferEvidence` requires:
1. A trusted transport result explicitly classified as TRON Mainnet and obtained from the SolidityNode solidified-receipt method, not merely a FullNode transaction lookup.
2. Canonical USDT contract metadata with six decimals.
3. The returned transaction id must match the submitted transaction id and the smart-contract receipt result must be `SUCCESS`.
4. The canonical USDT contract, sender and Genesis treasury addresses must pass Base58Check validation; the TRON mainnet prefix must be correct.
5. Exactly one matching canonical USDT `Transfer` event must have the verified sender, configured treasury and exact six-decimal base-unit amount.

The SolidityNode receipt is the solidified transaction evidence. A solidified transaction can still have failed execution, so the smart-contract receipt result must independently be successful. The transaction's event array position is retained as its transfer index.

**Trust boundary:** `networkTag` and `receiptSource` must be created by the trusted RPC transport adapter from the actual endpoint used. They must never be accepted from a participant or inferred from the submitted transaction hash.

### Solana Mainnet Beta

`parseSolanaUsdtTransferEvidence` requires:
1. Exact Mainnet Beta genesis hash and canonical USDT mint metadata.
2. The mint's account owner must be the classic SPL Token Program and decimals must equal six.
3. A successful parsed transaction, exact transaction signature, and a separate signature-status observation at `finalized` commitment.
4. The exact classic Token Program transfer instruction, and six-decimal precision for `transferChecked`.
5. Pre/post token-balance records for the source and destination token accounts, with canonical mint, explicit token-account owners, and exact debit and credit deltas.
6. The source token account owner must equal the independently verified payment wallet; the destination token account owner must equal the configured Genesis treasury wallet.
7. Exactly one matching instruction must carry the exact payment amount.

The verifier does not equate an SPL token-account address with its owning wallet address. When the RPC does not provide the ownership and balance metadata needed for the checks, the evidence is rejected rather than guessed. Transfers performed through unsupported or opaque instruction shapes must be separately qualified before support is added.

## Independent RPC reconciliation

`reconcileGenesisRpcEvidence` accepts only normalized parser results and requires at least two observations, each with a unique provider identifier and a unique independently qualified operator identifier.

The normalized records must agree on:
- network identity and canonical asset identifier/precision;
- transaction hash/signature;
- source wallet and treasury destination;
- exact base-unit amount;
- event/instruction index;
- block/slot inclusion reference;
- chain-specific finality status.

The reconciliation function separately checks that the agreed record still matches the expected transaction id, verified source wallet, configured treasury and expected amount. It rejects duplicate provider IDs, duplicate operator IDs, mismatching records, non-canonical token metadata and finality values outside the chain-specific accepted set.

**Two labels are not proof of independent infrastructure.** A future RPC registry must establish that the two endpoints are operated by separately controlled organizations/operations, with distinct upstream infrastructure, credentials, administrative control and outage/finality failure domains. Two URLs backed by one vendor, a shared white-label endpoint, or two API keys on the same backend do not meet this requirement. Provider identity and operator independence must be determined by NOVA-reviewed configuration and external evidence, not by fields supplied at request time.

The result is intentionally marked:

- `status = RPC_EVIDENCE_AGREES_FINALIZED_TRANSFER`
- `creditApplied = false`
- `evidenceStatus = CHAIN_RESPONSE_PARSED_NOT_CREDITED`

No database write, allowance update, badge award, public-directory event, payment confirmation or ACROWN purchase/delivery instruction is made.

## Rejection and idempotency requirements for the future payment service

The evidence parser is one stage only. Before any future payment route can call it, the payment-intent service must also bind the evidence to:
- a unique, unexpired, server-created payment intent;
- the already verified primary wallet or explicitly verified linked payment wallet;
- the exact supported network, canonical token, treasury, exact six-decimal base-unit amount and intent purpose;
- an immutable intent/rules version and a unique transaction + transfer/event index key.

The eventual database constraint must make network + transaction id + transfer index unique. A payment hash alone is insufficient because one transaction can contain multiple token transfers. Duplicate observations must be idempotent and must not credit twice. Corrections must be compensating append-only events; a verified financial event must never be silently deleted or rewritten.

The future reconciler must remain pending/blocked when either RPC source is unavailable, stale, disagrees, reports a reorg/canonical-block mismatch, omits ownership or precision fields, or cannot prove the accepted finality state. It must not infer success from a wallet popup, a block explorer, a mempool/broadcast acknowledgement, a transaction-submitted form or a single RPC.

## Automated tests and their limits

The deterministic Node test suite uses synthetic chain responses. It includes:
- Ethereum positive transfer and rejection cases for wrong chain, precision, receipt status, token, finality, canonical block hash and duplicate matching events.
- TRON Base58Check, SolidityNode-vs-FullNode, network, successful execution, event and amount cases.
- Solana cluster, mint owner/decimals, finalized status, successful transaction, token-account owner and exact debit/credit balance delta cases.
- Multi-operator agreement, duplicate-operator rejection, source disagreement and rejection of fabricated token/finality metadata.
- Explicit assertion that reconciliation never applies an entitlement credit.

These tests establish parser behavior against controlled fixtures only. They do not establish live RPC provider reliability, RPC independence, actual mainnet asset state, wallet provider behavior, real transfer receipt, treasury custody or payment acceptance.

## Activation gates not satisfied

Before this foundation could be connected to a live payment-intent endpoint, the programme must still complete:
1. Evidence-backed $0/no-card RPC provider and commercial-use qualification for two independent operators on each network.
2. Live re-check of canonical token/mint address, decimals, Solana mint owner program and each owner-controlled Genesis treasury address.
3. Adversarial fixtures captured from real mainnet RPC responses (redacted/curated and independently reviewed), plus testnet controlled transfer tests.
4. Reorg, duplicate, multi-transfer, fee-on-transfer, malformed log/instruction, newly created token-account, CPI/inner-instruction and RPC disagreement test coverage.
5. An immutable contribution/payment-intent schema and append-only entitlement event transaction with unique transfer/event-index constraints.
6. A separate, owner-approved activation review covering treasury custody, spending authority, incident response, legal/commercial obligations, public disclosures and operational monitoring.

Until those gates and the distinct ACS floor/purchase/delivery gates have passed, all three Genesis payment networks remain disabled. This file and module do not authorize deployment, remote database migration, payment collection, token approval, transfer, mint, entitlement credit or treasury activation.

## Official protocol references

- [Ethereum JSON-RPC and transaction receipt/block methods](https://ethereum.org/developers/docs/apis/json-rpc/)
- [TRON gettransactioninfobyid](https://developers.tron.network/reference/gettransactioninfobyid-1)
- [TRON event logs and address encoding](https://developers.tron.network/docs/event)
- [TRON confirmation semantics](https://developers.tron.network/docs/confirmation-semantics)
- [Solana RPC JSON structures](https://solana.com/docs/rpc/json-structures)
- [Solana transaction retrieval](https://solana.com/docs/rpc/http/gettransaction)
- [Solana transaction/signature commitment](https://solana.com/docs/rpc/http/getsignaturestatuses)

These protocol references describe the underlying response formats and semantics. They do not qualify any RPC operator, wallet application, token custody arrangement or programme activation.

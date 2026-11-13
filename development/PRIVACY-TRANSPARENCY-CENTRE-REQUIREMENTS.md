# Privacy & Transparency Centre — Requirements and Maintenance

**Status:** Development specification for a preview page; not an approved legal Privacy Policy.  
**Created:** 2026-11-14  
**Implementation target:** `preview/privacy-transparency.html`  
**Integration target:** `preview/index.html` only; no production-root promotion in this work.

## 1. Purpose

Provide an accessible, accurate, continuously maintainable user-education centre explaining:

- what AstroCrown is designed to protect;
- what remains publicly observable on transparent blockchains;
- what wallets, RPC providers, indexers, hosting services and AI providers may observe;
- common and emerging privacy misconceptions;
- concrete actions users can take before connecting, signing, paying or publishing;
- the difference between requirements, preview behaviour, locally qualified components and production capabilities.

This centre supports user understanding and trust. It is not a legal privacy notice, a security certification, a guarantee of anonymity or a substitute for actual product disclosures.

## 2. Governing rules

1. **Truth before reassurance.** Never imply that AstroCrown can hide information recorded on public ledgers or controlled by third parties.
2. **Privacy is layered.** Distinguish application data, on-chain data, network metadata and third-party processing.
3. **No absolute anonymity claim.** Describe the exact information, threat model, observer and limitation.
4. **Separate account from wallet.** Account identity, pseudonym/profile, authenticator, wallet, network address, payment and eligibility records are distinct.
5. **Minimum necessary information.** Do not collect or publish identifying information without a defined purpose and proportionate basis.
6. **Sensitive users are not a class to exclude.** Do not use profession, political view, journalism, human-rights work or geography alone as a reason to deny secure access. Apply narrowly scoped controls to evidenced conduct and applicable requirements.
7. **No bypass claim.** A privacy or global-facing design does not cancel a mandatory restriction that actually applies to a specific service or transaction.
8. **Provider-specific data handling.** Requalify each exact provider, model, endpoint, plan, route, account setting and purpose before sending personal or confidential data.
9. **No invented product capability.** Mock, candidate, local-only, planned or unverified controls must never be presented as live or production-qualified.
10. **No misleading disclaimer.** A warning does not cure inaccurate claims elsewhere on the page.

## 3. Page information architecture

The page must include these independently navigable sections:

1. Plain-language meaning of privacy, confidentiality, pseudonymity, anonymity, authentication and self-custody.
2. Transparent public blockchain information: addresses, token identifiers, balances, transaction participants, amounts, timing, fees, contract activity and public associations, as applicable to the exact network.
3. Third-party observations before and during interactions: wallet, dApp, RPC/node, indexer, hosting, analytics and AI inference.
4. AstroCrown design commitments: minimization, separation of identifiers, secrets off-chain, pre-action disclosures, proportionate security, protection for sensitive people and provider qualification.
5. Common misconceptions: crypto anonymity, no-KYC anonymity, self-custody, passkeys, address rotation, Tor/VPN, ZK proofs, confidential transfers, account deletion, network/token identity and stablecoin issuer controls.
6. Emerging technology with exact scope and limitations: Solana Token-2022 Confidential Balances; Ethereum private reads/writes/proving roadmap; selective disclosure and ZK.
7. Accurate as-of status for current AstroCrown preview, account system, supporter programme and broad security baseline.
8. A practical before-connect/sign/send/publish checklist.
9. Primary sources, review date and update triggers.

## 4. Contextual navigation and disclosure

- The Wallet dropdown on the preview homepage must link directly to the public-chain explanation at `privacy-transparency.html#public-blockchains`.
- The preview footer must link to the Centre.
- Before any future real wallet connection, transaction, payment, profile/address publication or sensitive AI submission, the corresponding feature must provide an in-context disclosure explaining:
  - exact network and token/mint/contract where relevant;
  - which details become public;
  - which external service receives the request;
  - what is locally stored versus transmitted;
  - which risks cannot be mitigated by AstroCrown;
  - how to cancel without completing the action.
- The current preview has no live wallet connection or payment. Do not simulate an operational disclosure flow before there is a real feature to disclose.

## 5. Factual scope and source requirements

Use official primary sources for changing technical claims. At initial implementation, sources include:

- Ethereum privacy: `https://ethereum.org/privacy/ethereum`
- Ethereum privacy roadmap: `https://ethereum.org/roadmap/privacy/`
- Solana financial-application privacy: `https://solana.com/docs/finance/privacy`
- Solana Confidential Balances: `https://solana.com/docs/tokens/extensions/confidential-transfer`
- Tether supported protocols: `https://tether.to/en/supported-protocols/`
- Gemini API Additional Terms: `https://ai.google.dev/gemini-api/terms`
- Groq data handling: `https://console.groq.com/docs/your-data`

Each changing claim must identify the exact protocol, asset, provider, product, plan or API route and the date reviewed. A roadmap is not evidence of deployed capability. A protocol feature is not evidence that a particular token or wallet uses it.

### Non-negotiable Solana disclosure

Confidential Balances is a Token-2022 extension and is not automatically enabled for all SPL assets. Public account addresses, mint, owners and transaction participation remain visible; a mint can configure an auditor key. AstroCrown must not claim that ACROWN or USD₮ transfers are confidential unless the exact mint, programme, accounts, wallet route and auditor model are qualified.

### Non-negotiable payment disclosure

“USDT” alone is not a sufficient payment network identifier. Future AstroCrown UI must distinguish each supported chain/token pair and verify the exact canonical asset identifier and receiving route. Tether's official supported-protocol page must be revisited before adding or retiring any USD₮ route.

### Issuer-specific stablecoin controls

The page must explain that self-custody does not remove issuer-level powers attached to an issued token. The current example is Tether's Terms of Sale and Service, last updated 26 February 2026, which state that Tether may freeze Tether Tokens, blacklist digital-token addresses and suspend services in circumstances described in those terms. Attribute this example only to Tether; do not generalize it to all stablecoins or all blockchain networks.

### Heightened-risk user disclosure and scoped restrictions

The page must state that the current preview is not an operational secure environment for sensitive activity. It must also preserve the design requirement that journalists, human-rights defenders, whistleblowers, investigators, judges and other people facing elevated risks are not excluded solely because of occupation, political view, geography or a generalized risk label. Where a mandatory rule actually applies, identify the particular service, entity or transaction and the scope; a selectable privacy-oriented experience is not a bypass.

## 6. AstroCrown implementation-state disclosures

The page must present the following evidence distinctions as-of the review date and refresh them before promotion:

- Current `preview/index.html` wallet menu says the preview cannot connect wallets, sign messages, submit orders or move assets.
- Passkey-first account foundation PR #141 was merged, but account Worker/D1 evidence is locally qualified; remote staging and real-user production service are not enabled.
- Supporter programme PR #176 is an unmerged draft; it has no live payment/receiving/treasury route.
- `development/SECURITY-BASELINE.md` records broad security review areas as UNVERIFIED. No system-wide certification or production security status is implied.
- Existing `preview/privacy-policy.html` is a different development-only draft written for the earlier account prototype. It must not be overwritten or represented as the new Centre or a complete current Privacy Policy.

Before page promotion, compare these states with current main and PRs again.

## 7. Accessibility and technical implementation

- Semantic HTML landmarks, logical heading order and one `h1`.
- Skip link, keyboard-visible focus, descriptive link labels and accessible navigation.
- Responsive layout down to 320 CSS px without horizontal page overflow.
- Table containers may scroll horizontally; the entire page must not.
- Native `details/summary` for expandable misconceptions; no JavaScript required.
- Respect `prefers-reduced-motion`.
- Sufficient contrast; information is not conveyed by colour alone.
- No third-party JS framework, remote font, analytics script, tracking pixel or external asset dependency.
- External links use safe `rel` attributes.
- Preview carries noindex/nofollow/noarchive until an explicit publication decision.
- The page itself must load as a static local file and remain useful if scripts are disabled or external sources are unavailable.

## 8. Maintenance procedure

Review the content:
- before any public release;
- before each new wallet, RPC, payment, AI or analytics integration;
- after a material provider policy or data-retention change;
- after a blockchain/token-standard change;
- after a privacy or security incident;
- at least quarterly while the page is public-facing, unless a more frequent risk-based schedule is adopted.

For each update:
1. identify the exact claim and user decision affected;
2. retrieve the current primary source;
3. check source date, version, route and applicability;
4. reproduce or test the AstroCrown-specific behaviour where possible;
5. distinguish source claim from direct observation and inference;
6. update the page and this record with the review date;
7. run static, browser, accessibility and responsive checks appropriate to the change;
8. preserve a dated record and correct outdated language rather than silently hiding it.

Monthly or quarterly source review is a maintenance task, not evidence that a review has occurred automatically. No automatic monitor is implied by this document.

## 9. Promotion gates

The preview page may be reviewed as a static educational preview after its tests pass. It must not be promoted as a formal policy or production security statement until:

- the actual production data-flow inventory exists;
- the identity/controller and provider roles are determined;
- purposes, retention, deletion, rights, transfers and incident handling are documented;
- all wallet, payment, profile, analytics and AI routes are verified;
- contextual notices exist in the actual features;
- security/accessibility review has suitable evidence;
- the formal privacy notice is separately reviewed for applicable jurisdictions;
- claims on the page match actual deployed behaviour.

## 10. Known limitations

- This work does not deploy the root production site.
- It does not implement account, wallet, payment, analytics, RPC or AI integrations.
- It does not provide legal advice or a legal opinion.
- It does not establish that any user is anonymous or that any transaction is confidential.
- It does not replace the user's wallet security, provider assessment or independent verification.

## 11. Verification record

Record the exact commit and tests in the active audit work item. Use PASS / FAIL / N/A / BLOCKED only. A static markup check does not establish screen-reader conformance, full WCAG conformance, legal sufficiency or production security.

# Privacy & Transparency Centre — Active Work Record

**Status:** ACTIVE — preview implementation and verification  
**Created:** 2026-11-14  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Base commit:** `706f873e460f3c82f42659b43de79462146416b7`  
**Working branch:** `feature/privacy-transparency-centre-2026-11-14`

> This is a task-specific development/audit work record. The canonical `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not found in the accessible AstroCrown-Web or NOVA repository trees during this review. This record does not claim to replace or satisfy those unavailable canonical documents. The existing AstroCrown Development & Audit Convention is used for evidence and verification discipline.

## Objective

Continue the preserved system reassessment at Block 8 without repeating completed Blocks 1–7, while implementing a clear, useful Privacy & Transparency Centre in the AstroCrown preview. The page must communicate what AstroCrown is designed to protect, what public networks reveal, what third parties may observe, common misconceptions and emerging privacy technology. It must accurately disclose current implementation status.

## Scope

- Continue Block 8 AI provider and data-handling assessment from current NOVA repository evidence.
- Add `preview/privacy-transparency.html` as a static, self-contained education page.
- Add a separate educational guide link to the preview account consent dialog without conflating it with either legal policy.
- Link it from the preview Wallet dropdown and footer.
- Add requirements/maintenance documentation and a deterministic, dependency-free static smoke test.
- Preserve the current homepage and account consent UI before changing their navigation links.
- Keep the page in preview only; no production-root promotion.

## Explicit exclusions

- Do not rewrite Blocks 1–7.
- Do not enable Strong RSI or run live provider calls.
- Do not activate provider/GPU candidates.
- Do not enable real wallet, payment, treasury or account operations.
- Do not modify the old `preview/privacy-policy.html` or `preview/terms-of-use.html`.
- Do not turn the guide into an account consent or legal agreement.
- Do not modify PR #176 or claim it is live.
- Do not alter production root, authentication backend, NOVA code or current security controls.
- Do not claim legal review, certification, anonymity or production readiness.

## Repository discoveries

1. Current `main` commit is `706f873e460f3c82f42659b43de79462146416b7`.
2. Existing `preview/privacy-policy.html` is a development-only draft for a legacy account prototype, not a complete policy for current or future system data flows.
3. The current preview Wallet menu explicitly states it cannot connect wallets, sign messages, submit orders or move assets.
4. The account consent UI is a legacy preview dialog; the guide is linked separately and does not replace the legal-policy links. The account modal is a browser-memory demonstration and requires fictional details only.
5. Passkey-first account foundation PR #141 is merged. The Worker/D1 account README still limits its qualification to local synthetic testing; remote staging and real-user production deployment are not enabled.
6. Supporter programme PR #176 remains open/draft; its current preview is not a live payment or treasury feature.
7. `development/SECURITY-BASELINE.md` has broad review areas marked UNVERIFIED. No overall security status may be inferred.
8. Canonical Navigation Protocol/template were not located in the accessible active repository trees. Formal Navigation Protocol compliance is therefore UNKNOWN/BLOCKED, not PASS.

## Block 8 — current provider evidence

Source records: `ACROWN-System/NOVA` main `NOVA/roster.json`, `NOVA/gpu_roster.json`, `NOVA/gpu_capacity_evidence.json`, `NOVA/DEVELOPMENT-RESOURCE-READINESS.md`, and branch `nova-operational-state` `NOVA/health_state.json`.

Latest operational observation set reviewed: 2026-11-13 23:00:32 UTC.

- Groq `openai/gpt-oss-20b`: latest HTTP 200, exact structured health response valid, 294 ms. This is bounded response-contract health only.
- Gemini `gemini-3.1-flash-lite`: latest HTTP 200, exact response valid, 763 ms; an earlier observation timed out at 18,051 ms and earlier 503s occurred.
- Cloudflare `@cf/meta/llama-3.1-8b-instruct-fast`: previously qualified for the bounded JSON contract; latest heartbeat skipped it as already qualified. This is not a fresh live pass.
- Groq `openai/gpt-oss-120b` and Gemini `gemini-3.8-flash`: model-specific structured response contracts remain BLOCKED_UNVERIFIED.
- Cloudflare `@cf/zai-org/glm-4.7-flash`: not included in the checked official JSON Mode support list; keep blocked for that structured-output requirement.
- Mistral Free API: deferred by user decision after repeated 429/code 1300; last requalification record remains rate-limited. Do not probe or restore to active capacity without explicit requalification authorization.
- Cerebras: not eligible under current $0/no-payment-method requirement because the documented promotional credit requires a valid payment method.
- GPU roster has no active providers. Nosana and Hugging Face ZeroGPU remain candidates with account/no-card eligibility, terms, capacity, workload or data-handling questions unresolved.
- OpenRouter Free currently lists 25+ free models from four providers and a 50-request/day plan rate limit. Its free plan has no data-policy-based routing, budgets/spend controls or contractual SLA; provider/model-specific handling still applies. It remains a gateway candidate, not independent model capacity. Official pricing: https://openrouter.ai/pricing.
- Requesty Free currently lists 8 free models and 200 requests/day without a payment method. Its 14 August 2026 terms distinguish Requesty's own handling from upstream model-provider rules; certain models labelled Training Permitted can be used by Requesty to improve its service/routing/evaluation models, and prompts to those upstream models may be used by the provider. The licence applies to free accounts and survives termination for already submitted content. Do not send confidential or sensitive information to those marked models. Requesty says it does not accept cryptocurrency for paid credits (currently processed via Stripe), so it is not a candidate for future crypto-paid tier. Review exact model flags and the full Terms before any use. Official sources: https://www.requesty.ai/pricing, https://www.requesty.ai/models, https://www.requesty.ai/terms.
- Puter.js User-Pays is a different optional route: each end user signs into their own Puter account, consumes their own monthly allowance, and may be prompted to upgrade after it is exhausted. Current docs show GPT-6 and multiple Claude/Gemini/DeepSeek/Grok integrations, but do not state a fixed universal free quota. This does not provide a centrally controlled free NOVA backend API; it shifts the usage and billing relationship to each user and adds a third-party login/data processor. Consider only as an explicitly optional, separately consented, privacy-qualified connector. Official docs: https://docs.puter.com/user-pays-model/, https://docs.puter.com/AI/.
- These three routes must not be presented as free, unrestricted proprietary GPT/Claude model access for AstroCrown's central infrastructure. There remains no verified unrestricted free central API for paid proprietary model families.
- OpenRouter's current privacy policy states that user inputs are sent to selected or automatically selected providers; those providers may retain or use prompts and outputs for training/improvement under their own terms. The Free pricing tier exposes no data-policy-based routing, so there is no central free-plan control to force privacy-eligible upstream routes. OpenRouter's paid Standard plan currently advertises crypto among payment options with a 5.5% service fee, but accepted coins/network, signup/KYC conditions, limits and account requirements were not verified. Do not treat this as a currently qualified no-KYC crypto-payment route.
- Requesty's free tier advertises 200 requests/day without a payment method and has 8 free model listings at the current review. Its Terms (last updated 2026-08-14) introduce Training Permitted model labels; for free-plan requests to those models Requesty's own licence covers use of inputs/outputs for operation, security, evaluation and improvement/training of its service models, and the upstream provider may also train. Requesty says its own no-training commitment for paid customers does not remove upstream provider processing. Its terms prohibit sending confidential data to a Training Permitted model and restrict special-category/criminal-conviction, children's, government-ID and payment-card data. Requesty's paid credits are processed by Stripe and it does not accept cryptocurrency. Account/KYC conditions for the free plan were not verified. Treat only as a candidate for low-risk synthetic/public R&D, model by model, after terms and provider flags are reviewed.
- Puter.js current user-pays docs mean each end user must sign into a separate Puter account; each user's monthly free allowance pays for their use and can be exhausted, after which the user may need to upgrade. This adds a third-party account and causes costs/terms to follow each user rather than a NOVA central API. Docs list GPT-6 and Claude/Gemini/DeepSeek/Grok models, but do not publish a stable universal free quota. The published Puter privacy policy page still shows an effective date of 2022-07-18 and the Terms say Puter may access, process, store and scan User Data; the exact current AI-request route, provider-level handling and whether the outdated policy is superseded are unresolved. Candidate only as an explicitly optional user-directed connector for public/synthetic content after requalification, never a central private model or identity dependency.
- The paid proprietary-model question remains unresolved for AstroCrown's centralized backend. User-facing subscriptions to ChatGPT/Claude are not equivalent to an API key. User-pays delegation may offer a voluntary user-funded alternative, but it changes the account, privacy and cost model and cannot be relied on as core capacity.
- Free vs paid use rights remain separate. Current actual research use must be permitted; future commercial production must be requalified. Do not automatically reject a provider merely because future commercial use has not yet been established, but do not use it in breach of a known restriction.
- Strong RSI readiness remains incomplete and its lifecycle suspended. Weak RSI remains manual/human-in-the-loop/report-only. No live model calls were made during this task.

## Decisions

1. Privacy education is a product and user-rights requirement, not only reputation protection.
2. Explain privacy, confidentiality, pseudonymity, anonymity, authentication and self-custody separately.
3. Public-chain data, third-party metadata and issuer-specific stablecoin controls must be described without absolute guarantees.
4. The current preview must explicitly warn high-risk users that it is not a production-secure operational environment; protection for sensitive users remains a design requirement, not a current guarantee.
5. Protect journalists, human-rights defenders, whistleblowers, investigators, judges and other sensitive users through universal security/minimization; do not use occupation, politics or geography alone as an exclusion rule.
6. Keep the Centre separate from the formal Privacy Policy. A legal policy must match real production data flows and be separately reviewed.
7. Attribute issuer-level token controls to the exact issuer and current terms; do not generalize them to all stablecoins.
8. Assess AI data handling per exact API route and plan; do not treat gateway routing or user-pays as equivalent to private or centrally free inference. Requesty's free Training Permitted models and Puter's per-user third-party account model require explicit limits and disclosures. Gemini unpaid-service inputs/outputs may be used for product/model improvement and human review, with 18+ and non-consumer API-client conditions; Groq differentiates usage metadata from inference data and offers optional ZDR; Cloudflare Workers AI distinguishes stateless no-content-retention/no-training from operational metadata and stateful/logging exceptions.
9. Use official primary sources for changing protocol/provider claims and date the review.
10. Keep page static/no-dependency, accessible and self-contained; no external tracking, JavaScript framework or third-party assets.
11. The current page is a noindex preview. Production promotion requires its own decision and a complete data-flow/legal/accessibility/security review.
12. The repository Security Policy is a security-vulnerability route only; no product privacy-request contact is published yet. Production promotion remains blocked until a verified privacy/support route and handling workflow exist.

## Dependencies / source links

- `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`
- `development/audit/FACT-OBSERVATION-AND-EVIDENCE-GOVERNANCE.md`
- `development/audit/PUBLIC-CLAIMS-AND-LEGAL-COMMUNICATIONS.md`
- `development/SECURITY-BASELINE.md`
- `development/PRIVACY-TRANSPARENCY-CENTRE-REQUIREMENTS.md`
- Official technical sources linked in the page requirements file.
- OpenRouter: https://openrouter.ai/pricing, https://openrouter.ai/privacy/
- Requesty: https://www.requesty.ai/pricing, https://www.requesty.ai/models, https://www.requesty.ai/terms
- Puter: https://docs.puter.com/user-pays-model/, https://docs.puter.com/AI/, https://puter.com/privacy, https://puter.com/terms

## Impact analysis

### If modified

- Users gain a clear explanation of public ledger visibility and provider metadata.
- The Wallet menu and footer expose the guide at relevant decision points.
- Risks of false expectations about anonymity, privacy tokens, passkeys, stablecoins and deleting accounts are reduced.
- The preview homepage and new page remain explicitly non-production.

### If not modified

- Users may incorrectly equate no-KYC with anonymity, self-custody with privacy, or passkeys with private payments.
- Users may not realise that wallet/RPC/AI-provider activity can reveal metadata or that a privacy-request contact is not yet published.
- The project may appear to promise protections it has not implemented, or fail to explain the limitations of public-chain payments.
- The old legacy Privacy Policy draft may be mistaken for a complete current privacy statement.

## Verification plan

- [ ] Back up the exact pre-change homepage and account consent script; verify both source SHAs.
- [ ] Verify the new page has unique IDs and valid internal anchor targets.
- [ ] Verify essential content, source references, preview status, account-demo limitations, security-report route and missing privacy contact disclosure.
- [ ] Confirm privacy-request contact remains a production gate until an approved channel exists.
- [ ] Verify no scripts, trackers, external assets or unapproved dependencies were added.
- [ ] Run the wired static smoke test and HTML structure checks.
- [ ] Run the existing Chromium workflow against the account dialog, linked guide, desktop layout and 320px mobile layout.
- [ ] Inspect the complete diff and backup.
- [ ] Create a draft pull request; do not merge or promote to the production root without review.

## Outcome / evidence

The feature branch tree was reconstructed from the full verified `main` tree after an intermediate Git-tree update failed to preserve the base file set. Verification confirmed 2,236 entries before the latest account/browser integration commit; preserve the full tree on subsequent updates.

The current work extends the existing pull-request-triggered Chromium smoke workflow (`preview/**`) to exercise the guide and account consent link. The run for commit `362e1f184b6899ac15724487db4ef2786e3b99e9` completed successfully: static checks passed, Chromium smoke passed 85 tests with 0 failures and 0 blocked tests. The screenshot-reset refinement timed out after all content, account, route and responsive assertions passed; screenshot capture was changed to reload the guide at its clean URL before each capture. The corrected capture still requires a rerun.

To be completed after implementation and tests. Record commit, pull-request number, exact test commands, results and any remaining BLOCKED manual checks. Keep this work item ACTIVE until review requirements are settled.

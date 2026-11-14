# Cross-Repository Readiness and PR Reconciliation

**Review date:** 2026-10-12  
**Status:** COMPLETED — bounded audit and verified remediation; follow-up controls remain BLOCKED pending maintainer interaction  
**Repositories:** [AstroCrown-Web](https://github.com/ACROWN-System/AstroCrown-Web) · [NOVA](https://github.com/ACROWN-System/NOVA)

## 1. Objective and scope

Analyze the current state of AstroCrown-Web and NOVA together, reconcile the previously reported pull-request queue with live GitHub state, inspect security and operational seams, and implement narrow evidence-supported corrections.

Reviewed repository metadata and default branches; active pull requests and historical targets; licensing and brand notices; AstroCrown-Web’s GitHub Pages build artifact and existing branch rules; NOVA's provider roster, health state, provider rotation, GPU state, workflows, action references, and automated-state write paths.

No credentials were read or changed. No live external model or GPU calls were triggered by this audit. No paid resource, billing configuration, production activation, branding grant, or RSI promotion gate was changed.

## 2. Governance / protocol limitation

The canonical `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` could not be located in either repository's current default-branch tree, the connected repository list, the user library exact-title search, or the remembered `ASDBradford-HSIAN/NOVA-Core/Dependency-Navigation/` path (GitHub returned 404). Do not interpret this absence as proof that the documents do not exist elsewhere.

The audit therefore used AstroCrown-Web's available `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` and audit-record conventions as fallback. The initial API state discovery preceded creating this plan; this was a deviation from the requested "plan before navigation" order and is documented rather than represented as strict protocol compliance.

**Result:** BLOCKED for canonical protocol compliance until the maintainer points to the current authoritative protocol/template location or restores access to it. No replacement protocol was invented.

## 3. Current state and pull-request reconciliation

### AstroCrown-Web

- The earlier seven-PR list was historical, not current.
- Historical PRs #84, #92–#96, and #102–#105 were already merged before this review's changes. No duplicates were reopened.
- PR [#106 — CodeQL upload-sarif v4.38.3](https://github.com/ACROWN-System/AstroCrown-Web/pull/106) was reviewed as a one-line SHA update against the official upstream v4.38.3 commit `24c54180a607b1449ed407dd24f251e4e9147c8d`. Its five recorded CI/security checks passed. Merged at `18f8846f1ae81cde0384c9aa1ad6b790253168b8`.
- PR [#107 — exclude development and backup material from Pages](https://github.com/ACROWN-System/AstroCrown-Web/pull/107) was created from direct artifact evidence, passed CodeQL plus both CI jobs, and was merged at `d04a24fe4989152647e4a57ba3216c902fbe2ba2`.
- The final live API query returned zero open AstroCrown-Web pull requests.

### NOVA

- The initial live API query showed zero open PRs.
- PR [#72 — defer Cerebras under the no-payment-method policy](https://github.com/ACROWN-System/NOVA/pull/72) was created and merged at `ef0976044bbea19ec20cd7bacfb9939a0e9dac0e`; its NOVA Health Tests run passed.
- PR [#73 — pin workflow actions to verified full SHAs](https://github.com/ACROWN-System/NOVA/pull/73) was created and merged at `59d9322406817d6f62c8e6df83acedfb7f02357f`; its PR test and post-merge main test runs passed.
- The final live API query returned zero open NOVA pull requests.

## 4. Verified findings and actions

### F-01 — Public Pages artifact included internal development and backup trees

**Status before fix:** FAIL  
**Severity:** High publication-scope mismatch; no evidence of source credentials in the artifact was asserted.

The actual GitHub Pages artifact for pre-fix main commit `18f8846f1ae81cde0384c9aa1ad6b790253168b8` was downloaded and inspected. Its 6.2 MB ZIP contained 1,585 `backup/` paths and 332 `development/` paths, including active audit plans. Repository documentation says development-only material is not regular site content; backup mirrors are historical archive material. The source repository was already public, so this finding is about unwanted rendered publication and artifact size—not a newly discovered confidential repository.

**Action:** merged PR #107, adding root `_config.yml` Jekyll exclusions for `backup`, `development`, `.github`, and standard tool/vendor directories. No source, backup or development file was deleted or moved.

**Verification:** post-merge Pages build/deploy [run #38166746443](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38166746443) passed on `d04a24fe4989152647e4a57ba3216c902fbe2ba2`. Its downloaded `github-pages` artifact is 17 KB (compared with the prior 6.2 MB ZIP), contains 9 entries, zero `backup/` paths, zero `development/` paths, and retains root `index.html`. The landing page is still generated from README; a production AstroCrown UI has not been inferred or substituted by this audit. OpenSSF Scorecard [run #38166746987](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38166746987) also passed.

### F-02 — Cerebras active roster contradicted the project's explicit free/no-card rule

**Status before fix:** FAIL  
**Severity:** Medium policy and quota-control mismatch.

NOVA's existing `PROVIDER-ACQUISITION-READINESS.md` and `DEVELOPMENT-RESOURCE-READINESS.md` already classify Cerebras as blocked or optional only if the no-payment-method rule changes. The actual runtime roster nevertheless marked Cerebras active and the AI heartbeat/reasoning and opportunistic probe workflows injected its credential. Current official pricing, checked 2026-10-12, says the Developer promotional credit requires a valid payment method, is a one-time $5 credit, expires after 30 days, and API access pauses when it is expired/exhausted unless PayGo credits are purchased. Source: https://www.cerebras.ai/pricing

**Action:** merged PR #72. Cerebras is now `DEFERRED`, with a documented reason/requalification gate in `NOVA/roster.json`; its credential environment injection was removed from live LLM workflows. The secret was not deleted or rotated, and historical evidence was preserved.

**Verification:** PR and main NOVA Health Tests passed. The change follows the existing policy; it does not claim the account's actual credit or payment method was inspected.

### F-03 — NOVA workflow actions used mutable major-version tags

**Status before fix:** FAIL  
**Severity:** Medium supply-chain reproducibility concern.

Five NOVA workflows used mutable `actions/checkout@v7` and/or `actions/setup-python@v7` references.

**Action:** merged PR #73, pinning all checkout references to official upstream `actions/checkout` v7.0.1 SHA `3d3c42e5aac5ba805825da76410c181273ba90b1` and setup-python v7.0.0 SHA `5fda3b95a4ea91299a34e894583c3862153e4b97`. These SHAs were verified against upstream tag references. Only workflow action references/comments changed.

**Verification:** NOVA Health Tests passed on both PR and main. The five corrected files are `.github/workflows/nova_GPU_heartbeat.yml`, `nova_heartbeat.yml`, `nova_health_tests.yml`, `nova_probe_scheduler.yml`, and `nova_validation.yml`.

### F-04 — License and brand boundary

**Status:** PASS for inspected repository statements.

Both root LICENSE files contain MIT terms for covered software. Both READMEs explicitly preserve separate file-specific rights and state that MIT does not grant AstroCrown brand rights; NOVA's README also identifies NOVA and HSIAN brands. No conflicting license or branding claim was found in this bounded review.

Snyk program eligibility and co-branding remain only a candidate assessment. No program application, logo/content license, promotional link, or branding permission was granted. OpenSSF Alpha–Omega licensing eligibility may now be satisfied by the MIT license, but ecosystem-impact evidence/application remain unresolved.

### F-05 — NOVA heartbeat and GPU runtime state

**Status:** PASS for implemented exclusion and current documented configuration; BLOCKED/UNKNOWN for live-provider availability.

- Mistral remains deferred under the explicit user decision from 2026-10-10; the audit did not restore it.
- GPU heartbeat `UNCONFIGURED` is consistent with an empty active GPU roster and two candidates (Nosana and Hugging Face ZeroGPU). No generic health result was treated as evidence that a GPU workload can run.
- The most recent committed AI observations are not fresh enough to represent current live provider health. Earlier records include a valid Gemini 3.1 Flash Lite response, invalid JSON from Gemini 3.8 Flash despite HTTP 200, a healthy Groq GPT-OSS-20b response, and a Groq GPT-OSS-120b tool-contract error. These are historical observations, not new live tests. Avoid live quota consumption; follow up with bounded contract tests only when needed.
- Capacity-aware scheduling includes tests for rolling intervals, expiration preemption and correct rescheduling. No scheduler code change was justified by this audit.
- Provider quotas/capacities can be scoped to account/project/organization; they must not be misreported as per-key unless evidence establishes that scope.

### F-06 — Code protection and autonomous state writes require a design decision

**AstroCrown-Web:** The active `Protect main` ruleset requires PRs, blocks deletion/non-fast-forward updates and requires review-thread resolution, but sets required approval count to zero and has no required CI checks configured. The current integration cannot edit the ruleset through its supported actions. The relevant PR check workflows currently produce:
- `NOVA RSI Engine CI / test`
- `External Review Pipeline CI / test`
- `NOVA RSI CodeQL Security Analysis / CodeQL analysis (Python)`

**NOVA:** The repository currently reports no rulesets and `main` as unprotected. Its AI heartbeat, GPU heartbeat and opportunistic scheduler workflows use `contents: write` and push operational-state commits directly to `main`. Turning on strict PR-only protection without redesigning that write path or explicitly configuring an Actions bypass would disrupt autonomous state persistence.

**Result:** BLOCKED pending maintainer decision. No branch rule was changed because the available choices have materially different security/automation consequences. See handoff.

### F-07 — Production homepage scope remains unconfirmed

The current Pages artifact's root `index.html` is a Jekyll-generated README landing page, not the AstroCrown product interface. `development/index-section/README.md` describes section requirements as active specifications, not implementation files. PR #107 preserves that page while preventing internal development/backup documents from appearing on the site.

**Result:** BLOCKED pending explicit scope approval to implement the production UI from `development/index-section/` and replace the README landing page. This audit did not invent a UI, infer unapproved behaviors, or make development infrastructure part of the homepage.

## 5. Impact analysis

### IF modified

- Pages build now excludes development plans and backup mirrors without source deletions; artifact size dropped from 6.2 MB ZIP to 17 KB.
- Active NOVA provider roster now respects its already-documented $0/no-payment-method acquisition rule; no secret was deleted and no billing choice was made.
- NOVA workflow dependencies are identified by verified immutable commit SHAs instead of mutable major-version refs.
- MIT / brand boundary and Mistral deferral remain intact. RSI implementation readiness, promotion gates and independent-review requirements remain unchanged.

### IF not modified

- Internal development and backup materials would continue to be rendered into the public Pages artifact.
- NOVA's live workflow would continue to consider/inject Cerebras despite its current policy classification.
- Mutable action tags would continue to make executed action revisions dependent on tag movement.
- Unresolved branch protection and production UI scope must remain undecided; applying an unchosen path could either break autonomous state writes or publish unapproved behavior.

## 6. Result summary

| Area | Result | Evidence / next boundary |
|---|---|---|
| Pull-request queue | PASS | Both repositories have zero open PRs at final reconciliation |
| CodeQL upload-sarif update | PASS | Astro PR #106 merged; five recorded checks passed |
| Public Pages exclusion | PASS | Astro PR #107 merged; rebuilt artifact inspected |
| $0 provider activation policy | PASS | NOVA PR #72 merged; CI passed |
| Immutable workflow action references | PASS | NOVA PR #73 merged; CI passed |
| License / brand statement consistency | PASS | Root LICENSE and README statements inspected |
| Current live AI/GPU availability | BLOCKED / NOT VERIFIED | No live paid/free quota requests made; observations are historical |
| Canonical NAV protocol/template | BLOCKED | Canonical paths returned 404 / not located |
| Astro required CI rules | BLOCKED | Requires repository Settings action |
| NOVA main protection strategy | BLOCKED | Requires choice for direct automated state persistence |
| Production homepage activation | BLOCKED | Requires explicit scope approval |

## 7. Verified main commits and PRs

- AstroCrown-Web PR #106 → `18f8846f1ae81cde0384c9aa1ad6b790253168b8`
- AstroCrown-Web PR #107 → `d04a24fe4989152647e4a57ba3216c902fbe2ba2`
- NOVA PR #72 → `ef0976044bbea19ec20cd7bacfb9939a0e9dac0e`
- NOVA PR #73 → `59d9322406817d6f62c8e6df83acedfb7f02357f`

No open pull requests remained in either repository at the final live API check before closing this audit branch.

## 8. Next authorized work after maintainer interaction

1. Establish the canonical Navigation Protocol/template location; do not invent its contents.
2. Configure required AstroCrown-Web PR checks in the `Protect main` GitHub Settings page.
3. Choose a safe NOVA operational-state persistence design before enabling strict main protection.
4. Obtain explicit scope authorization before turning the current README landing page into the production AstroCrown interface.
5. Continue with bounded, low-quota provider verification only if evidence freshness/quality warrants it; leave Mistral deferred and GPU providers unconfigured until individually eligible and tested.

# Active Navigation Plan — Free AI Provider Pool Research and Qualification

**Date:** 2026-10-12  
**Status:** ACTIVE — initial live credential qualification completed; account eligibility, free-only overage behavior, provider activation and production readiness remain unresolved  
**Objective:** Establish a diversified, auditable AI inference pool that maximizes legitimate no-payment-method capacity without relying on one provider, exposing secrets, enabling accidental paid usage, or activating an unqualified endpoint.

## Mode and source of truth

**Mode:** Cross-repository research, credential qualification, bounded implementation, automated verification, and evidence capture.  
**Repositories:**  
- https://github.com/ACROWN-System/NOVA  
- https://github.com/ACROWN-System/AstroCrown-Web

**Source of truth:** Current default-branch files, repository workflows and recorded decisions, current official provider documentation and account terms, and actual sanitized API probe results.

The requested `NAVIGATION-PROTOCOL.md`, `NAVIGATION-PLAN-TEMPLATE.md`, and a current Roadmap file were not found in the active repository trees searched on 2026-10-12. This plan follows the available `development/Prompt-Guide.md`, `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, and existing `development/audit/Active/` plan format. This records a governance gap; it does not claim the missing documents were followed.

## Objective and completion conditions

1. Distinguish an API key's presence from authentication success, endpoint/model availability, remaining quota, payment-method eligibility, terms/licensing, data handling, and production suitability.
2. Test the existing Groq and Gemini credentials with one small, non-sensitive request each when the test workflow runs.
3. Re-qualify the listed Mistral key only in an isolated, low-cost/no-charge candidate probe because the current user request asks to test the listed keys. This does not automatically restore Mistral to NOVA's active production roster; explicit pass criteria and the previously recorded deferral still apply.
4. Treat the GitHub token as a repository-management credential, not an inference provider. The GitHub Models inference service was retired on 2026-07-30.
5. Identify additional providers whose official offers allow access without a credit/debit card or another payment-method registration. Separate ongoing free tiers, daily allowances, one-time trials, aggregators, and specialist APIs.
6. Do not test, activate, or imply eligibility for a candidate where current official terms conflict or the no-payment-method condition is not verified.
7. Never print, persist, upload, or return any secret value. Store only the environment-variable name, configured/present state, endpoint/model, response status, coarse latency, sanitized error class, allowed rate-limit/quota headers, and verification timestamp.
8. Keep provider qualification separate from NOVA routing and health lifecycle. A passing diagnostic alone must not alter the active provider roster or clear any persisted down marker.
9. Add bounded fail-closed provider-use protections so exhaustion, 402/429, missing usage metadata, or uncertain billing status cannot silently trigger paid usage.
10. Produce a dated evidence matrix and a recommendation for development workloads versus public-service workloads, including task-specific routing and fair-use limits.

## Navigation targets

- https://github.com/ACROWN-System/NOVA/blob/main/NOVA/roster.json
- https://github.com/ACROWN-System/NOVA/blob/main/NOVA/credential_readiness.py
- https://github.com/ACROWN-System/NOVA/blob/main/NOVA/KEY-READINESS.md
- https://github.com/ACROWN-System/NOVA/blob/main/.github/workflows/nova_validation.yml
- https://github.com/ACROWN-System/NOVA/blob/main/.github/workflows/nova_heartbeat.yml
- https://github.com/ACROWN-System/NOVA/blob/main/.github/workflows/nova-provider-qualification.yml
- https://github.com/ACROWN-System/NOVA/blob/main/NOVA/PROVIDER-QUALIFICATION.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/audit/Active/2026-10-12-Free-Provider-Pool-Evidence-Matrix.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/Prompt-Guide.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/DEVELOPMENT-AND-AUDIT-CONVENTION.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/rsi_policy.json
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://console.groq.com/docs/rate-limits
- https://ai.google.dev/gemini-api/docs/pricing
- https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key
- https://openrouter.ai/pricing/
- https://www.requesty.ai/pricing
- https://kilo.ai/docs/gateway/authentication
- https://huggingface.co/docs/inference-providers/en/pricing
- https://github.blog/changelog/2026-07-30-github-models-is-now-retired/

## Scope and preservation

**In scope**
- Add a bounded, secret-safe diagnostic workflow to NOVA that tests only configured provider credentials, with minimal fixed prompts and one attempt per provider per run.
- Keep tests read-only with respect to provider roster, persisted health markers, billing settings, and production routing.
- Add or update provider-candidate evidence and no-payment-method eligibility records using evidence states such as VERIFIED, CANDIDATE, UNKNOWN, BLOCKED, DEFERRED, and REJECTED.
- Include model-specific and modality-specific restrictions, data-use/privacy caveats, quota type, quota reset/expiry, and over-quota behavior.
- Add automated tests for masking, error classification, timeouts, redirects, response-size limits, and fail-closed results.
- Submit changes through pull requests and verify CI and the exact changed-file scope.

**Out of scope**
- Exposing, copying, rotating, or creating account credentials.
- Enabling billing, linking any payment method, purchasing credits, or allowing automatic paid fallback.
- Activating a provider in production solely because one request passed.
- Sending source code, confidential project material, personal data, secrets, or proprietary prompts to providers whose data-handling terms have not been explicitly accepted.
- Claiming the free pool can guarantee public-production capacity, unlimited availability, an SLA, or always-hot GPU capacity.
- Changing RSI implementation readiness, commercial eligibility, benchmark approval, or auto-merge settings.
- Re-adding Mistral or Cerebras to the active free-tier roster without a separate evidence-backed eligibility and reliability decision.

## Provider state and test rules

- **Existing keys:** Groq and Gemini are configured in NOVA's latest recorded presence report but still require current live verification. Mistral is recorded as deferred; the current request authorizes a bounded requalification test, not automatic activation. Cloudflare's API key/account ID were absent in the latest recorded readiness report and must stay BLOCKED until configured.
- **GitHub:** A GitHub PAT is for repository/API access. GitHub Models' inference API was retired on 2026-07-30 and is not a valid provider candidate.
- **No-payment-method rule:** “Free model”, “free credits”, and “free API tier” are not interchangeable. Account creation can be acceptable; a required card, payment profile, auto-pay fallback, purchased credits, or paid-plan dependency disqualifies a candidate unless the provider exposes a verified free-only fail-closed mode that needs no payment method.
- **Aggregators:** OpenRouter, Requesty, and Kilo can increase route/model diversity but are not necessarily independent underlying capacity. Record upstream provider, model, privacy terms, limits, and routing transparency.
- **Specialist services:** Embedding/reranking, speech, OCR, image/video generation, and GPU execution count only toward the specific tasks they actually support.
- **Operational safeguards:** Never send user/project content in the qualification probe. Keep prompts fixed, trivial, and non-sensitive; cap output tokens and timeout. Do not auto-retry 401, 402, or 429. Do not persist raw response bodies or headers except an explicit allowlist of quota/rate-limit headers.

## Acceptance criteria

- Every candidate has an evidence-backed lifecycle status, provider type, API endpoint/model or modality, card/payment-method status, quota scope and expiry/reset information, terms/data-handling caveat, source URL, and verification timestamp or explicit UNKNOWN.
- Provider qualification calls are low-volume and bounded; failures cannot print secret values or raw response bodies.
- Tests and workflows never activate/deactivate a provider or mutate health state from a diagnostic run.
- No paid fallback is possible; usage beyond verified free-only allocation must fail closed.
- The report distinguishes configured, authenticated, response-valid, quota-available, no-card-eligible, commercial-use-eligible, and production-qualified states rather than collapsing them into a single “working” label.
- CI and security checks pass on pull requests.
- Public deployment recommendations include fair-use caps, quotas, concurrency controls, caching, queues, per-task routing, rate limits, abuse prevention, monitoring, and graceful unavailability when the free pool is exhausted.
- No claim of sufficient GPU capacity is made unless actual sustainable GPU allocation is separately proven.

## Impact Analysis

**IF modified:** NOVA gains a reproducible, risk-bounded path to verify existing keys and compare more independent or aggregated free endpoints; AstroCrown can make routing, user limits, and feature availability decisions from measured quotas rather than assumptions.

**IF not modified:** provider status remains based on stale presence/history, the project risks relying on a single uncertain key, and provider candidates may be activated or advertised without evidence of payment-method eligibility, quota, privacy, licensing, or production suitability.

## Interim execution findings — 2026-10-12

### NOVA implementation and CI

- PR [#77 — Add secret-safe live provider qualification probes](https://github.com/ACROWN-System/NOVA/pull/77) merged as `5a45c627d4cef43f3b3aeb8330d60a8159dfa0b3`.
- The pull request CI initially identified a missing report-builder interface; this was corrected before merge. [NOVA Health Tests #311](https://github.com/ACROWN-System/NOVA/actions/runs/38229331476) passed all 66 unit tests.
- PR [#78 — Refine provider qualification diagnostics](https://github.com/ACROWN-System/NOVA/pull/78) merged as `2eb00c35d994f128b2501f9e98ff40b249ae37ed`.
- [Follow-up NOVA Health Tests](https://github.com/ACROWN-System/NOVA/actions/runs/38229809228) passed. The post-merge validation, credential-readiness and qualification jobs all completed successfully.

### Sanitized live probe evidence

- [Initial provider qualification run](https://github.com/ACROWN-System/NOVA/actions/runs/38229425403), observed at 2026-10-12 09:22 UTC: Groq returned HTTP 200 but did not produce the expected marker within a 32-output-token cap; Gemini passed; Mistral returned 429; GitHub API returned 403; Cloudflare was skipped due to missing API key/account ID.
- The initial Groq result was not treated as a dead key. A follow-up changed the qualification request to use low reasoning effort and a bounded 64-output-token cap, then distinguished response-shape validity from marker matching.
- [Follow-up qualification run](https://github.com/ACROWN-System/NOVA/actions/runs/38229853401), observed at 2026-10-12 09:26 UTC: Groq PASS (HTTP 200, marker present, 106 reported total tokens; 999 requests and 7,851 tokens remaining in returned rate-limit headers); Gemini PASS (HTTP 200, marker present, 22 reported total tokens); Mistral returned 429 with `x-ratelimit-limit-req-minute: 0` and `x-ratelimit-remaining-req-minute: 0`; GitHub API returned 403 with 4,998 core API requests remaining in headers; Cloudflare remained skipped.
- The Mistral headers show a zero request-per-minute allowance at the time of observation. They do not establish whether a daily/monthly quota is exhausted, the plan/account is capacity-limited, or some other provider-side policy is responsible. Mistral remains DEFERRED.
- GitHub API's 403 cause remains unresolved. The returned rate-limit headers are consistent with an authenticated API rate-limit bucket, but do not prove the token can perform the required repository operations. GitHub Models inference is retired and is not a candidate.
- The qualification script does not emit credentials, response text, or raw provider error bodies and did not change the active roster, stored health markers, billing or routing.
- The new evidence matrix is a dated research artifact. It retains CANDIDATE/UNKNOWN/BLOCKED states for providers whose card requirements, paid fallback behavior, data-use terms or production entitlements have not been established.

## Verification and handoff

1. Review all current official provider evidence and classify disagreements as UNKNOWN/BLOCKED rather than guessing.
2. Run deterministic tests without live provider credentials.
3. Run one live low-volume probe for each configured eligible credential on the default branch; report sanitized results only.
4. Confirm only allowlisted diagnostics are retained and no source tree, secret, billing setting, or active provider roster is changed by the probe.
5. Review PR checks and changed-file scope; keep provider candidates inactive until independently reviewed qualification requirements pass.
6. Move this plan to the repository's Completed area only after the implementation and evidence review are complete. Do not mark an external provider qualified merely because the plan or probe workflow merged.

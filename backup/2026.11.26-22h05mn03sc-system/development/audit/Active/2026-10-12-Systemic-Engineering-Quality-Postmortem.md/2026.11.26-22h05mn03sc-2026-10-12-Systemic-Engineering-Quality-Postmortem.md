# Systemic Engineering Quality — Findings and Prevention Plan

**Date:** 2026-10-12  
**Status:** FINDINGS RECORDED — preventive controls proposed; repository-wide enforcement remains incomplete  
**Related plan:** [Systemic Engineering Quality Investigation Plan](./2026-10-12-Systemic-Engineering-Quality-Investigation-Plan.md)  
**Scope:** NOVA Cloudflare smoke-test incident, the adjacent production-router changes, and reusable prevention across current/future AstroCrown and NOVA work.

## Executive finding

The incident was not an authentication or HTTP-transport failure. The Cloudflare credential check passed, inference returned HTTP 200, and the failure occurred after inference because the generated model response did not satisfy NOVA's strict health-response contract.

The systemic failure was **assuming and testing the behavior we expected, instead of establishing and enforcing the external contract first**. Several factors allowed that assumption to reach `main`: model-level capability was not checked against Cloudflare's documented list; a prompt was treated as a reliable structured-output mechanism; a bespoke smoke script duplicated the production request/parsing logic; offline mocks used a fabricated valid answer; changes were committed directly to NOVA's `main`; and the CI path filter did not run NOVA's unit suite when only the smoke-test workflow changed.

This is an evidence-based postmortem, not a claim that every custom implementation is wrong. Raw HTTP can be justified where it reduces dependencies and follows a documented contract. It must not be used as a reason to skip contract discovery, shared implementation, and realistic verification.

## Incident evidence and timeline

| Evidence | Confirmed observation | What it proves / does not prove |
|---|---|---|
| Initial smoke test [run 38287087585](https://github.com/ACROWN-System/NOVA/actions/runs/38287087585) | Token verification passed with HTTP 200; chat-completions endpoint returned HTTP 200; response contract failed | Authentication and transport worked for that request; expected output was not established |
| Diagnostic smoke test [run 38287456480](https://github.com/ACROWN-System/NOVA/actions/runs/38287456480), job [114939135256](https://github.com/ACROWN-System/NOVA/actions/runs/38287456480/job/114939135256) | Envelope and choices were objects/lists; the message had reasoning-related fields; `message.content` was `None` | It was a response-shape/content problem. The precise cause of the empty content cannot be proved from the sanitized evidence alone |
| Request-settings change [commit 0a2f53f](https://github.com/ACROWN-System/NOVA/commit/0a2f53fc5f40d4f1046036adec189791c338c593) | The router added model-specific token/reasoning parameters for Cloudflare GLM-4.7-Flash | This was an unverified candidate change, not evidence of compatibility |
| New unit test [commit e9db6d8](https://github.com/ACROWN-System/NOVA/commit/e9db6d8cddef70048681cebad7cab1b755868a6e) | The full test job failed because the new test incorrectly asserted that the formatted request URL must not contain the account identifier | The regression test itself encoded an incorrect expectation; it was corrected in [commit afb28c7](https://github.com/ACROWN-System/NOVA/commit/afb28c74df119ea7b9298b666adf7eb16b1ac66b), after which [run 38288033743](https://github.com/ACROWN-System/NOVA/actions/runs/38288033743) passed |
| Latest smoke test [run 38288535689](https://github.com/ACROWN-System/NOVA/actions/runs/38288535689) | Token verification passed; inference returned HTTP 200; message content existed; no reasoning field was reported; completion count was 26; JSON parsing failed | The response now contained text, but that text still did not satisfy the health JSON contract. The model's raw text was not logged, appropriately avoiding accidental content disclosure, but the investigation consequently cannot say what exact non-JSON text it returned |
| Latest smoke workflow [commit 4164140](https://github.com/ACROWN-System/NOVA/commit/4164140e4820e071d840082c37ad3bf1500fa7fe) | The workflow was a separate, inline Python HTTP client/parser | It did not execute the same production adapter path as `NOVA/router.py` |
| Current NOVA test workflow | The push `paths` include `NOVA/**` and selected workflow files, but omit `.github/workflows/nova_cloudflare_smoke_test.yml`; the PR trigger has no path filter | A push changing only the smoke workflow does not trigger `NOVA Health Tests`. A PR would trigger the test workflow, but NOVA accepted the recent direct writes to `main` |
| Repository governance observation | AstroCrown-Web rejected direct main-branch file creation with a rule violation requiring a pull request. Branch-protection API queries for both repositories returned 403. NOVA accepted the incident commits through the connected GitHub write path | AstroCrown's PR-only gate is evidenced. NOVA's exact setting cannot be read through this integration; nevertheless, no effective PR gate stopped these writes for the connected identity. Do not claim the exact underlying protection configuration was inspected |

No evidence supports a claim that the Cloudflare token is invalid. The remaining issue for this model is functional compatibility with NOVA's response contract.

## Findings

### SQ-001 — Model capability was not established before relying on structured output

**Result: FAIL — primary cause**

NOVA's health validator requires a JSON object with exact fields `nova_health: "OK"` and `ack: "NOVA_HEALTH_PROBE"`. The smoke test relied on ordinary prompt text to guarantee that format. That is not a guaranteed interface.

Cloudflare's official [OpenAI-compatible API documentation](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/) demonstrates the endpoint and recommends the OpenAI SDK as a compatible client. Cloudflare's official [JSON Mode documentation](https://developers.cloudflare.com/workers-ai/features/json-mode/) enumerates the models that support JSON Mode; the configured `@cf/zai-org/glm-4.7-flash` is not on that list. Cloudflare also states that even JSON Mode does not guarantee every schema can always be satisfied. Source checked 2026-10-12.

The documented absence does **not** prove GLM-4.7-Flash is incapable of generating JSON text. It does mean NOVA cannot treat JSON output as a provider-enforced contract for this model on current evidence.

**Impact:** A successful HTTP response was incorrectly treated as a candidate for a strict machine-readable health protocol without establishing support for the required output mode.

### SQ-002 — Production and smoke-test request paths were duplicated

**Result: FAIL — contributing cause**

NOVA already had a reusable OpenAI-compatible request path in `NOVA/router.py` (`call_openai_compatible`) and a bounded diagnostic qualification implementation in `NOVA/provider_qualification.py`. The smoke workflow instead embedded another HTTP helper, payload construction, response parser, and marker validation in a large inline Python block.

As a result, the smoke workflow and normal routing could drift and needed separate fixes. A test that validates one implementation does not automatically validate the other.

**Impact:** More custom code to maintain, more places for assumptions to diverge, and more surface for diagnostic or regression errors.

### SQ-003 — Mock tests proved the implementation's assumption, not provider compatibility

**Result: FAIL — contributing cause**

The new Cloudflare unit test supplied a fabricated successful response containing the exact JSON NOVA expected. It proved that the router could accept that fixture and that certain fields appeared in the outgoing payload. It could not establish that the live provider/model supports the requested behavior.

The test's first version also had a faulty URL assertion; CI exposed that mistake, but only after the test and router code had been committed to NOVA `main`.

**Impact:** Passing offline tests provided false confidence about an unverified external model capability. Unit tests remain necessary; their evidence was overinterpreted.

### SQ-004 — CI path coverage did not include the changed smoke workflow

**Result: FAIL — contributing cause**

`.github/workflows/nova_health_tests.yml` runs on all pull requests, but its push path filter does not include `.github/workflows/nova_cloudflare_smoke_test.yml`. The smoke test itself runs only through manual dispatch and gates on `main`.

**Impact:** A smoke-workflow-only push to `main` does not automatically run compilation and unit tests. More generally, workflow changes must be part of their own verification scope.

### SQ-005 — There was no effective pre-merge control on the NOVA change sequence

**Result: FAIL for this sequence; exact repository setting BLOCKED**

The GitHub write integration accepted the sequence of direct commits to NOVA `main`, including an unverified router change and a briefly failing test. The connected API cannot read the exact branch-protection settings because the endpoint returned 403; therefore this record does not assert which setting was absent or whether an actor exception applies.

**Impact:** CI could report failures after the code was already on the main branch, rather than acting as a control that prevents unverified changes from entering it.

### SQ-006 — The diagnostic loop changed multiple factors and lacked sufficient safe evidence

**Result: FAIL — contributing cause**

The request update changed the token budget field, reasoning settings, prompt wording, and template kwargs in a single experiment. The result changed from missing `message.content` to non-JSON text; that experiment cannot attribute which individual change caused which portion of the result.

The log correctly avoided printing generated text or secrets. However, the first diagnostic pass did not capture enough safe response metadata to classify the empty-content result fully, which caused another manual run.

**Impact:** The investigation consumed extra user effort and could not isolate causality. Secret-safe diagnostics must still record enough structured evidence to distinguish failure classes.

### SQ-007 — Existing guidance was not translated into a common, enforceable cross-repository gate

**Result: FAIL — process-level cause**

AstroCrown-Web already documents source-of-truth discipline, evidence requirements, explicit PASS/FAIL/BLOCKED states, remediation/re-test, change minimization, and risk-based candidate evaluation in `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`. Its `development/Prompt-Guide.md` also calls for authoritative sources, observable success criteria, verification, and uncertainty handling. Those principles were not consistently applied to the NOVA integration, and there is no single mandatory cross-repository provider-contract gate that turns them into required pre-implementation evidence.

The canonical `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not found in the active AstroCrown-Web tree; a prior cross-repository audit recorded the same limitation. This remains BLOCKED rather than a reason to invent a replacement protocol.

**Impact:** Correct guidance remained advisory and repo-specific rather than an enforceable, repeatable process across the work that mattered.

## Root-cause classification

| Cause | Classification | Confidence |
|---|---|---|
| Strict JSON response was required without documented JSON Mode support for the selected model | Primary contract/design failure | HIGH — confirmed by current Cloudflare supported-model list and live contract failures |
| Initial empty `message.content` caused by a specific reasoning/token parameter interaction | Candidate explanation | UNKNOWN — first response is sanitized; exact mechanism not established |
| Prompt-only formatting failed to guarantee JSON | Direct observed failure | HIGH — latest live run reached `CONTENT_NOT_JSON` |
| Duplicate smoke logic, optimistic mock fixture, and wrong test assertion | Contributing implementation/test defects | HIGH — verified in repository source and CI logs |
| Path-filter gap and direct-main changes | Contributing process/control failures | HIGH for observed behavior; exact branch-rule configuration remains BLOCKED |
| API transport, token, or account configuration failure | Not supported by this incident's latest evidence | REFUTED for these particular requests, not a blanket guarantee of future availability |

## Prevention matrix

| Priority | Preventive control | Acceptance evidence | Enforcement |
|---|---|---|---|
| P0 | **External contract first.** Before implementing an SDK/API/model feature, record exact endpoint, API/model ID, supported request parameters, documented response shape/capability, pricing/eligibility boundary, official source URL, and access date. Unsupported or unverified mandatory behavior is BLOCKED. | Reviewable contract note linked from the implementation/PR; capability claim matches official docs | Mandatory review checklist and PR evidence |
| P0 | **Capability-qualified model selection.** Record whether each model supports the required output mode (JSON Mode / strict schema / tools / vision, etc.). Do not infer capability from a model family name or general OpenAI compatibility. | Active model's required capability has authoritative support evidence; otherwise provider lifecycle remains non-production/blocked for that task | Offline roster/config validation where feasible; explicit review for capabilities not machine-checkable |
| P0 | **One production adapter.** The smoke/qualification path must reuse the production adapter or a shared request-contract module. Avoid a second inline HTTP implementation of the same behavior. | Test/smoke path imports or invokes the same adapter; any deliberate separate implementation has a written security/architecture reason | Code review + architecture test where practical |
| P0 | **Protect main and require verified PR checks.** Require changes through PRs, and require the full offline suite for source/config/workflow changes. A green check on an older SHA is not evidence for a later commit. | Branch rule and required check verified from repository settings; latest candidate SHA passes before merge | GitHub repository rules; branch settings need maintainer/admin access |
| P1 | **Differentiate test evidence.** Unit tests validate deterministic logic; contract fixtures validate parser/adapter shapes; live integration tests validate the current external provider/model contract. Never describe a mock-only suite as a live integration pass. | Test report labels coverage type and shows commit/version, actual result, and limitations | Test names, CI summaries, audit record |
| P1 | **Test failures, not just the happy path.** Include empty content, reasoning-only/alternate response channels, malformed JSON, missing required markers, non-2xx errors, timeout, and unsupported capability states when relevant. Test assertions must reflect real URL/auth/schema requirements. | Regression tests include positive and negative cases derived from documented contracts and sanitized observations | Required automated suite |
| P1 | **Safe, discriminating diagnostics.** Record status, provider/model, finish reason, token usage, response-shape classification, error code/request ID, and allowlisted headers as relevant. Never log secrets or raw user/model content by default. Change one factor at a time and define the decision each experiment can settle. | Failed run uniquely narrows the cause or explicitly says UNKNOWN/BLOCKED; no sensitive output emitted | Test workflow and incident template |
| P1 | **Pre-promotion live verification.** Where secret safety permits, test a reviewed candidate against the live service using a least-privilege credential and a protected environment. Never expose production secrets to untrusted pull-request code. If a safe pre-merge live test is impossible, identify that limitation and require a deliberate post-merge promotion gate instead of claiming pre-merge verification. | Result references exact candidate revision and reports transport, response contract, quota/cost boundary, and result separately | Manual/protected-environment gate |
| P1 | **Change trigger coverage.** CI path filters must include every affected workflow and configuration file, or core verification should use broader triggers. Workflow edits need YAML/workflow validation where feasible in addition to application tests. | A workflow-only change triggers a visible check; test demonstrates correct path coverage | Workflow-level tests / CI |
| P1 | **Stop repeated speculative loops.** Every manual request to the user must be necessary, discriminating, and based on the prior logs. After a failed experiment, inspect evidence before asking for another run; if the next test cannot separate hypotheses, research first. | Incident log records question, hypothesis, observation, classification, next step | Operational procedure / review |
| P2 | **Cross-repository adoption.** Keep one canonical set of shared rules and link it from repository-local conventions. Tailor the evidence to UI, Python, workflows, prompts, GPU, or provider integrations without duplicating the entire policy. | Each active repository identifies the same canonical quality gate and its stricter local additions | Repository documentation and PR template |

## Required lifecycle for future changes

1. **Plan:** state the observable outcome, risks, affected repositories/files, preservation constraints, and stop conditions.
2. **Prove the external or internal contract:** inspect current authoritative documentation and maintained SDK/examples; record unsupported and unknown capabilities.
3. **Choose the simplest justified implementation:** prefer shared project code and a maintained SDK/client when compatible and worth the dependency; raw HTTP is acceptable only with a documented reason and tests.
4. **Test offline first:** static/compile/schema/config checks, unit tests, representative fixtures, negative cases, and regressions.
5. **Review the exact diff:** check payload semantics, errors, secrets/logging, permissions, workflow triggers, test assertion logic, and source claims.
6. **Verify at the correct layer:** clearly separate mock, contract, end-to-end, live-provider, visual/browser, and human verification.
7. **Gate promotion:** require the applicable checks on the exact candidate commit and enforce PR-based main changes.
8. **Re-test and close with evidence:** record unresolved items as BLOCKED/UNKNOWN; code modification alone does not close a finding.

This lifecycle is risk-based. A documentation-only typo does not require a live provider test; a model/API contract change does. The purpose is to add the smallest control that catches the particular class of failure—not to create another elaborate test framework.

## Immediate remediation priorities

1. **Do not call Cloudflare GLM-4.7-Flash JSON-compatible for NOVA's health protocol.** Keep this model/capability pairing BLOCKED for strict JSON until its documented support is established or a JSON Mode-supported model is selected under the $0/no-payment-method policy.
2. **Review the unverified model-specific router options in commit `0a2f53f`.** They must remain a candidate adjustment, not a verified fix, until documentation and a suitable integration contract support them.
3. Add the omitted smoke workflow path to NOVA's unit-test push coverage.
4. Introduce the cross-repository quality gate in existing development/audit guidance, then apply it to future changes.
5. Have a maintainer enable/verify NOVA main-branch rules requiring PRs and the correct successful status check. This action is not available through the current GitHub integration permissions.

No further live inference run is justified until priority 1 is resolved. The last run already distinguishes this from an authentication/transport failure.

## Standards and authoritative sources checked

- Cloudflare, [OpenAI-compatible API endpoints](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/) — official endpoint shape and maintained SDK example. Accessed 2026-10-12.
- Cloudflare, [JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/) — supported-model list and limitations. Accessed 2026-10-12.
- GitHub Docs, [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) — PR reviews and required status checks are available as repository enforcement controls. Accessed 2026-10-12.
- NIST, [SP 800-218 Secure Software Development Framework (SSDF) v1.1](https://csrc.nist.gov/pubs/sp/800/218/final) — recommends integrating secure development practices and addressing root causes to prevent recurrence. Accessed 2026-10-12.

## Impact Analysis

**IF modified:** External assumptions become explicit and reviewable before coding; unit tests are not mistaken for live compatibility; duplicated request paths are reduced; CI covers workflow changes; main-branch promotion can be gated; failures lead to a controlled evidence cycle rather than repeated speculative edits.

**IF not modified:** Prompt-level expectations can continue to be mistaken for API guarantees, mock fixtures may continue to validate invented behavior, workflow-only changes can bypass local regression tests on push, and unverified changes can reach `main` before CI reports a failure.

## Closure conditions

The investigation can close when its findings have been reviewed and preserved. **Systemic remediation is not closed** until: the relevant process guidance is adopted, NOVA's CI path coverage is corrected and passes, a maintainer verifies enforced PR/status-check gates, and the Cloudflare model/health-contract pairing is either verified from authoritative evidence or explicitly blocked/replaced. The current Cloudflare inference fix is **not verified**.

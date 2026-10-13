## Change summary

<!-- What observable behavior, requirement, or defect does this change address? -->

## Scope and preservation

- [ ] I inspected the current implementation, tests, conventions, and relevant prior findings before adding another mechanism.
- [ ] The change is limited to the stated scope; unrelated files and operational state are preserved.
- [ ] Existing behavior, safety constraints, $0/no-payment-method rules, licensing, and provider lifecycle decisions are preserved unless this change explicitly addresses them.

## External contract (complete for APIs, providers, models, SDKs, workflows, runtimes, or other externally controlled behavior)

- [ ] Exact endpoint/API version, SDK/client version, model/capability, and request/response contract are documented in the change or linked audit record.
- [ ] Current official documentation or provider-maintained SDK/examples were checked; source URLs and date checked are recorded.
- [ ] Required capabilities (for example JSON Mode/schema, tools, vision, completion-token controls) are verified for this exact model/API combination, not inferred from a compatible endpoint or model family.
- [ ] Quota, cost, no-payment-method eligibility, licence, and permission constraints were checked when relevant.
- [ ] Unsupported or unverified mandatory capabilities are labelled BLOCKED, not assumed supported.

Not applicable because: <!-- Explain briefly, if the external-contract section does not apply. -->

## Implementation and verification evidence

- [ ] The simplest existing implementation or shared production adapter is reused. Any new dependency or duplicate request path has a documented reason.
- [ ] Unit tests cover the changed deterministic logic and relevant negative/error cases.
- [ ] Contract fixtures are based on official examples and/or sanitized observed behavior; fabricated success fixtures are not presented as proof of live compatibility.
- [ ] Static, unit, contract, live-integration, and promotion results are distinguished. A mock pass or HTTP 2xx is not claimed as complete functional verification.
- [ ] Relevant compile/lint/schema/workflow checks and regression tests passed on the exact candidate commit, or the blockers are listed below.
- [ ] Workflow/config changes trigger the required CI checks.
- [ ] For failures, the prior evidence was examined and the next test answers a specific question; unresolved causes remain UNKNOWN/BLOCKED.

## Security and operational safety

- [ ] No credentials, tokens, raw sensitive inputs/outputs, or unapproved headers are logged or committed.
- [ ] Live tests use approved, least-privilege credentials and do not expose production secrets to untrusted pull-request code.
- [ ] Permissions, external side effects, cost/quota boundaries, provider lifecycle, and operational-state writes were reviewed.
- [ ] No production activation, paid usage, secret changes, or broad permission changes are hidden inside an unrelated change.

## Results

**Checks run and evidence (include URLs and exact commit SHA):**

<!-- List verified evidence. Label tests that were not run as BLOCKED. -->

**Failures / unknowns / blockers:**

<!-- Do not claim success when the relevant evidence is missing. -->

**Impact Analysis**

- **IF merged:**
- **IF not merged:**

## Review rule

A checklist is evidence navigation, not a substitute for review. Do not mark a box merely because the code contains an implementation or test. Reviewers should verify high-risk external claims against authoritative evidence. The shared baseline is documented in the [Development & Audit Convention — External API, SDK, Platform, and AI-Model Contract Gate](https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/DEVELOPMENT-AND-AUDIT-CONVENTION.md#external-api-sdk-platform-and-ai-model-contract-gate). NOVA's root-cause and shared-knowledge requirements are documented in [NOVA Root-Cause Prevention and Shared-Knowledge Governance](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/ROOT-CAUSE-PREVENTION-AND-SHARED-KNOWLEDGE-GOVERNANCE.md). These documents are review and design baselines, not proof that universal runtime enforcement or repository branch protection is active.

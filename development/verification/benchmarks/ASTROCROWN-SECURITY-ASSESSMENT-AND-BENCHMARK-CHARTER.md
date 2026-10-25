# AstroCrown Security Assessment Service and Benchmark Governance Charter

**Document ID:** ACW-SEC-BENCH-001  
**Version:** 0.1.0  
**Status:** PROPOSED — INTERNAL DESIGN ONLY; NOT A LIVE SERVICE, CERTIFICATION, OR APPROVED PUBLIC PRICE LIST  
**Prepared:** 2026-10-24  
**Scope:** Proposed security assessment service, optional public benchmark and awards, Council independence, pricing, user protection, and launch gates.

> **Status warning:** This document describes a proposed system. It does not prove that scanning, monitoring, billing, report delivery, ranking, appeals, prize funding or human-review capabilities currently exist. Do not advertise a proposed capability or price as available until its launch gates are verified.

## 1. Executive decision

Build the security service around one promise: **help people understand and improve the security of systems they own or are authorized to test. Public ranking is optional and secondary.**

A user must be able to receive useful security findings and remediation guidance without entering a competition, seeking an award, buying a badge, paying to unlock a critical finding or publicly disclosing their system. The service and the Benchmark must be separate functions.

The proposed system has five parts:

1. **Free baseline:** accessible, low-impact checks and understandable next steps.
2. **Private assessment:** scoped checks, evidence-backed findings, severity and confidence, remediation guidance, and retesting where included.
3. **Optional monitoring:** checks on a clearly stated schedule, change and advisory alerts, and a retained assessment history.
4. **Optional Security Benchmark:** an opt-in, date-bound public achievement programme with comparable categories and hard eligibility gates.
5. **Independent governance:** disclosed conflicts, recusals, preserved historical records, independent appeals, and sanctions proportionate to proven misconduct.

The first release should be deliberately narrow: external website posture and GitHub repository checks where technically verified. APIs, authenticated application testing, cloud integrations, mobile applications, and smart contracts should be added only after their individual methods, authorization controls, safety boundaries, and verification have been completed.

## 2. Non-negotiable principles

### 2.1 Security value comes before recognition

The service exists for users who want to improve security, including users who never want a public listing. Their reports must be useful in their own right.

### 2.2 Access to findings is not a prize

A finding discovered within the scope purchased or offered to the user must not be concealed merely to push the user to a higher plan. Paid plans may provide greater scope, frequency, history, integrations, collaboration or human-review services after those services are verified. They must not purchase a better score, a higher rank, suppression of a finding, or a higher probability of winning.

### 2.3 Assessment is not certification

A scan, score, badge, report or passing automated workflow is not proof that a system is secure, immune to attack, compliant with every law, or certified by an external authority. Reports must identify the asset, scope, method, version, date, limitations, and tests not performed.

### 2.4 Scope and authorization precede active tests

No active test may run without recorded authorization from a person with authority over the target and an explicit scope. A public, passive snapshot must stay within its documented low-impact checks; it must not silently escalate into active vulnerability testing.

### 2.5 Evidence before claims

Unknown or untested conditions are not passes. AI-generated explanations are advisory until checked against evidence. Findings must distinguish confirmed evidence, likely conditions, possible false positives, and untested areas.

### 2.6 Privacy by default

Detailed findings, reproductions, affected endpoints, secrets and remediation history are private to the authorized customer. Public recognition must not disclose secrets, exploit details, sensitive weaknesses, account data, or a failure-specific reason for absence from a ranking.

### 2.7 Same methodology regardless of payment

The security method, eligibility gates, score calculation, ranking, appeals and awards must not improve because someone pays more, contributes money, is a Council member, is a partner, or is well known.

### 2.8 AstroCrown does not compete in its own Benchmark

AstroCrown and entities under its control must never claim, accumulate, display, publish or promote points, scores, rankings, placements, badges, awards or other competitive recognition from the AstroCrown Security Benchmark. They may assess their own systems internally for improvement. Any approved public disclosure of those assessments must be a non-competitive transparency report, with scope and limitations and without a Benchmark score, badge, placement, award or promotional claim of Benchmark achievement.

## 3. Service scope and user journey

### 3.1 Initial target classes

**Initial candidates for release qualification**

- Public website posture: HTTPS/TLS, certificate and redirect observations, response security headers, publicly observable configuration and selected DNS checks.
- GitHub repository posture: dependency/advisory matching, repository security configuration, selected static-analysis checks, and secret-detection results with sensitive material redacted.

The exact check list must be documented and tested before use. A check should be enabled only when its request behavior, rate limits, expected results, false-positive handling, evidence and remediation guidance are understood.

**Later target classes — not to be marketed as live until separately qualified**

- APIs and authenticated web applications.
- Cloud and infrastructure configuration through permission-minimal, preferably read-only integrations.
- Mobile applications and packaged software.
- Smart contracts and blockchain infrastructure.
- Other systems supported by a validated asset-specific method.

A website posture scan must never be presented as a full penetration test, source-code review, smart-contract audit, compliance assessment or end-to-end security guarantee.

### 3.2 User journey

1. **Choose a goal:** get a quick baseline, assess a verified asset, monitor changes, or request a deeper assessment.
2. **Define the target:** identify the asset, its owner/operator, environment, and permitted scope.
3. **Choose the testing level:** show exactly what is passive, active, authenticated, excluded, and potentially disruptive.
4. **Verify authority:** for active tests, prove ownership/control or obtain recorded authorization from an authorized representative. A domain challenge, repository permission, or equivalent evidence may be used as appropriate to the target.
5. **Confirm rules:** record allowed targets, excluded systems, time window where applicable, rate limit, stop conditions, contact channel, data handling and consent.
6. **Run bounded checks:** prefer deterministic and low-impact checks first. Do not allow an AI agent to expand scope by interpreting an unexpected result as permission.
7. **Deliver a private report:** provide findings, supporting evidence, impact, confidence, remediation, limitations and the test date/version.
8. **Retest:** verify a fix when included, and preserve the original finding and retest evidence separately.
9. **Optional monitoring:** explain the actual check frequency and alert latency. Do not claim 24/7 monitoring unless the operations and response capability support that precise claim.
10. **Optional Benchmark entry:** separately request public competitive consideration. Declining public listing must not prevent use of the service.

### 3.3 Active-test safety boundary

The service must prohibit denial-of-service or stress testing, destructive changes, persistence, data exfiltration, phishing, social engineering, unauthorized credential use, lateral movement, and testing outside the approved scope by default. Any exceptional high-risk method requires separate, explicit authorization, a suitable controlled environment and human review; it is not part of the initial product.

Implement hard target allowlists, request and concurrency limits, timeouts, rate limits, an emergency stop, scope revalidation, sensitive-data redaction and an auditable action log. No automated agent may change a customer's production system, merge code, deploy a fix, rotate credentials or alter access controls without a separate customer-approved action and review.

## 4. Assessment methodology and reports

### 4.1 Report contents

Every completed report should state:

- unique report ID and assessment date;
- verified asset identity and scope;
- method and version, including relevant standard/control references;
- checks performed, not performed, blocked and excluded;
- finding title, severity, evidence, confidence and impact;
- reproduction details only to the extent safe for the private customer report;
- recommended remediation and any relevant trade-offs;
- false-positive status or unresolved uncertainty;
- any retest, with original and retest results kept distinct;
- limitations, dependencies and the date after which the report should be considered stale.

Use a consistent severity methodology. CVSS may inform suitable technical findings when the underlying issue fits its scope, but it must not be applied mechanically to every configuration issue or substituted for contextual risk analysis. Severity and confidence must be separate fields.

### 4.2 Standards and external methods

Use recognized public resources as references, not as marketing decorations:

- OWASP Application Security Verification Standard (ASVS) v5.0.0 for applicable web-application security requirements.
- OWASP Web Security Testing Guide (WSTG) v4.2 stable release for web-testing methodology.
- OWASP Top 10:2025 as an awareness and risk taxonomy, not a complete testing checklist.
- NIST Cybersecurity Framework 2.0 for risk-management outcomes.
- NIST SP 800-218 SSDF v1.1 for secure-development practices.
- CISA/partner coordinated vulnerability disclosure guidance where applicable.
- OpenSSF Scorecard and Best Practices Badge as separate existing tools for relevant open-source repository checks.

Every reference must identify the version and the way it is used. Mapping selected tests to a standard does not prove complete compliance with that standard. The Benchmark is an AstroCrown-developed methodology, not an OWASP, NIST, CISA, ISO or OpenSSF certification.

### 4.3 Independent evidence and AI boundaries

- Prefer deterministic checks and established scanners where they answer the requirement.
- AI may help explain, triage, cluster or draft remediation for evidence already collected; it must not invent a finding or mark an unverified claim as confirmed.
- High-impact findings and all proposed public award decisions require human review.
- Never send customer source code, credentials, secrets, private reports or sensitive evidence to an external AI/provider by default. Any later provider processing needs an explicit documented data-flow assessment and appropriate customer consent.
- Avoid duplicative provider calls and overlapping scans. Share observations only when they satisfy the same test contract; do not count a single observation as independent evidence for multiple untested claims.
- Keep source findings and public-safe summaries separate.

## 5. Benchmark design

### 5.1 Optional, separate and opt-in

The Benchmark is an optional public recognition programme, not the reason a user must buy the security service. Customers who do not seek recognition must receive the same report quality for the same assessment scope.

There must be no separate Benchmark entry fee, ranking surcharge, paid score or higher award probability by subscription tier. The same benchmark suite must be applied to all entrants in the category. If that suite cannot be offered without requiring a paid upgrade, the competitive edition must be postponed or supported by a disclosed, neutral, no-cost allocation policy. Paid-tier access must never buy a ranking advantage.

Public participation requires separate, affirmative opt-in and verified authority over the assessed asset. Service registration, payment, a security scan, or accepting general terms must not automatically enroll a customer in the public Benchmark.

### 5.2 Comparable categories

Do not rank unlike asset classes in one table. A public website, API, open-source repository, cloud environment, mobile app and smart contract have different threat models and methods. Create separate categories only after the corresponding method and minimum coverage have been validated.

For initial launch, qualify a single web-asset category first. Add other categories only after category-specific verification, safe test coverage, comparable sample design and review capacity are demonstrated.

### 5.3 Eligibility gates cannot be offset by points

An excellent aggregate score must never cancel a disqualifying critical finding or insufficient assessment coverage.

The published rules for each edition must define, before testing begins:

- exact category, scope, test method and methodology version;
- minimum coverage and evidence freshness;
- critical-finding / qualification gates;
- score mapping, weighting, normalization and tie handling;
- participant consent and public information;
- review, correction and appeal procedures.

A provisional freshness rule is that the qualifying assessment be completed within 90 days of the edition cutoff. Confirm this against operational capacity before announcing the first edition; any approved change must be published before the next edition, not retroactively after results are seen.

### 5.4 Scoring

Where scoring is justified, use a 0–100 total only after test-specific scoring adapters have been documented and calibrated. Each adapter must score its own test on evidence relevant to that test. Normalization across tests may be used only to combine justified measures; it must not create false equivalence between asset classes.

Mandatory eligibility gates are evaluated before ranking. A failed or blocked mandatory gate makes the entry ineligible; a missing test is not a zero, and an untested condition is not a pass. Do not use a weighted average to conceal a critical failure. Publish the aggregate score only for eligible, opted-in entries where publication is safe. Keep per-test scores, exact findings and technical reproductions private.

The initial score, weights and thresholds are **proposed**, not validated. They must not be used to award prizes until pilot data, edge cases, inter-reviewer consistency, false-positive rates, and manipulation resistance have been examined and the method is frozen for that edition.

### 5.5 Historical snapshots, not a live failure feed

The public Benchmark is a date-bound achievement record, not a live status dashboard.

- Publish final rankings only after the edition's review and appeal window.
- Public records show the edition, category, assessment date, method version and earned placement.
- Publish only the award recipients in the public competitive listing. Do not publish scores or standings for non-winners under this charter.
- Do not label non-entrants, non-winning entrants, withdrawn entrants or non-qualifying entries as failed, held, suspicious or unsafe.
- Absence from a public listing never means that an asset failed, was tested, declined assessment, or is currently less secure.
- Do not turn routine private score declines into public downgrade notices or disappearance signals.
- A historical award does not prove present-day security. The date, assessed scope and method version must remain visible with the award record.

Public total scores may be displayed only if the relevant edition's publication-safety review permits them. If an overall ranking or score itself would expose sensitive information or invite a misleading inference, withhold it. When in doubt, withhold the public detail and give the customer the private report.

### 5.6 Awards

The proposed annual award names are:

- **AstroCrown Security Benchmark — 1st Place — [Edition]**
- **AstroCrown Security Benchmark — 2nd Place — [Edition]**
- **AstroCrown Security Benchmark — 3rd Place — [Edition]**

Each award belongs to a defined category and edition. Award only positions actually earned; never manufacture a second- or third-place winner to fill a graphic. Do not award a placement solely because the entrant paid more, donated money, holds a Council position, or has a relationship with AstroCrown.

Badges should be verifiable against the historical award record, should not imply external certification, and must show the category, edition and assessment date. They must not say “currently secure”, “unhackable”, “certified secure”, or imply that the winner's entire organization and all of its systems were tested.

### 5.7 Publication safety is mandatory

No public result or badge may publish sensitive findings, secrets, exploitable details, private customer information or a failure-specific reason for exclusion. A participant's consent does not override the duty not to expose third-party data, secrets, or dangerous attack instructions.

When a result is withheld for publication safety, do not publish the fact of withholding or an explanation that exposes the underlying weakness. Preserve the detailed decision in restricted audit records. A public absence must remain non-diagnostic.

## 6. Conflict-of-interest and Council governance

### 6.1 General conflict rule

All Council members, assessors, award adjudicators and appeals reviewers must disclose actual, potential and reasonably perceived conflicts. Material interests include relevant ownership, employment, financial relationships, control, consultancy, close personal relationships, customer/supplier relationships, and affiliation with an entrant or a directly competing entity.

A person with a material conflict must not participate in the affected discussion, access restricted decision material beyond what is strictly necessary to declare the conflict, influence the outcome informally, vote, or count toward a decision quorum. Record the declared conflict, recusal and resulting decision. Recusal applies to a specific decision; it does not automatically terminate unrelated Council membership.

### 6.2 Three-year separation

A person must not exercise Benchmark-related Council voting or decision-making rights during the three years immediately before or after their competitive participation or receipt of a Benchmark award. Conversely, a person exercising Benchmark-related Council decision-making rights must not compete for or receive competitive Benchmark recognition during the corresponding three-year separation period.

“Benchmark-related decision” includes rules, categories, eligibility, methods, scoring, qualification gates, entrant selection, awards, prize funding, public disclosure, appeals, sanctions and changes that materially benefit or disadvantage a particular entrant or related entity.

The restriction covers indirect influence and not just the final vote. It applies to related entities under the person's control where allowing an entity to compete would recreate the same conflict.

### 6.3 Voluntary Non-Award Election

A participant may elect to forgo competitive recognition through a **Voluntary Non-Award Election**.

- The election must be recorded in writing and becomes irrevocable for the covered edition or elected period.
- It removes the person's entry from public competitive recognition for that period: no published score, ranking position, award, badge or competitive listing. The entry must not be publicly labeled as a withdrawal or failure.
- The person's private assessment and remediation report remain available under the normal service rules. The election does not remove security findings or permit them to be concealed from the customer.
- The award is allocated to the next eligible participant under the rules published before the edition.
- The election remains binding even if the person is not appointed to the Council, withdraws their candidacy or later changes their mind.
- To prevent outcome-shopping, an election for a current edition must be filed before its results or awards are disclosed. The precise cut-off must be published before entries open.

For Council voting eligibility, a member or candidate may request retroactive non-competitive status covering the preceding three years **only for editions for which no award was already granted to them or their relevant entity**. The person must accept permanent non-listing for the covered non-awarded period; private evidence records remain intact and access-controlled. A retroactive status change must never invent a history that an assessment occurred when it did not.

### 6.4 Protection of awards already earned

A legitimate award granted during the preceding three years must not be erased, suppressed, hidden, or voluntarily revoked to manufacture immediate Council voting eligibility. The original dated award and its scope remain in the historical record.

A recipient with an existing award in the three-year period must respect the ordinary separation period; a later voluntary election cannot erase the historical fact of the win. The service may correct an objectively erroneous report through a dated, neutral correction, but an honest mistake alone is not proof of fraud and must not be publicly described as dishonesty.

### 6.5 AstroCrown and controlled entities

AstroCrown and entities under its control are permanently ineligible for Benchmark points, competitive rankings, placements, awards, prizes, badges and promotional claims of achievement. They must never enter the public competitive listing, including via a proxy or nominally separate entity that remains under AstroCrown control.

Internal assessments may still be used to improve AstroCrown systems. If results are disclosed publicly, they must be presented as an evidence-led, non-competitive transparency report without a Benchmark score or promotional comparison.

### 6.6 Honest mistakes versus misconduct

The process must distinguish prompt, good-faith correction from knowing or reckless abuse.

- **Honest and promptly disclosed mistake:** correct the record, require recusal or repeat the affected vote when appropriate, document the correction, and assess any impact proportionately. Do not automatically accuse, sanction severely or publish an adverse allegation.
- **Material unresolved conflict:** suspend the affected person from the specific decision while facts are checked; preserve evidence; use an independent review.
- **Proven serious breach:** where a person knowingly or recklessly participates in a prohibited decision, intentionally conceals a material conflict, manipulates scores/eligibility, misuses confidential findings, retaliates against a complainant, or repeatedly breaches the rules after documented notice, impose the sanctions in §6.7.

A security finding or allegation alone does not prove misconduct. The affected person must receive the substance of the allegation and a reasonable opportunity to respond, subject to necessary protection of confidential information.

### 6.7 Sanctions for a proven serious breach

Following independent review and a documented finding of a serious, material breach:

1. **Ten-year exclusion** from participating in the AstroCrown Security Benchmark and receiving its competitive recognition; and
2. **Lifetime exclusion** from all Benchmark-related Council deliberations, governance responsibilities, voting rights, eligibility decisions, scoring decisions, awards, appeals and publication decisions.

The lifetime restriction concerns Benchmark-related Council authority; it does not automatically prohibit participation in unrelated Council business.

The sanctions must not be imposed merely because of a good-faith disagreement, a disclosed conflict handled under the rules, an unsubstantiated allegation, or an honest and promptly corrected mistake. Any separate legal or contractual obligations remain unaffected.

### 6.8 Award revocation and independent review

An award may be revoked only when intentional fraud materially connected with obtaining or retaining that award is substantiated against the winner or a person acting for or on behalf of the winning entity, and an independent review confirms the connection.

The process must include documented evidence, notice, a reasonable opportunity to respond, written reasons, and an appeal to reviewers who were not involved in the original decision. Do not infer fraud merely from error, a failed later assessment, disagreement with the score, a conflict disclosed late, or voluntary non-participation.

A neutral correction to an assessment record is distinct from a disciplinary finding and from award revocation. Keep the original record and the correction in an auditable history. Protect the affected person from unsupported public allegations.

### 6.9 Independent decision and appeals

A conflicted person cannot select their own reviewer, decide their own appeal, vote on whether their conflict exists, or decide the consequences for their own award or entity.

Before the first award edition, establish an independent review panel whose members declare conflicts, do not participate in cases involving their own interests, and can obtain independent technical or legal advice when necessary. If no independent quorum is available, pause the decision rather than manufacture independence.

Publish the appeal window and expected process before entries open. Provide at least one written appeal route, a reviewer independent of the initial decision, written outcomes and a restricted audit trail. Public explanations must not reveal private vulnerabilities. Obtain qualified legal review of the final sanctions, terms, privacy obligations and award conditions before commercial operation.

## 7. Provider-cost-backed pricing and resource policy

**No fixed prices are approved yet.** Earlier price ideas are withdrawn as unvalidated hypotheses; they must not be used in a proposal, website, checkout, invoice or financial forecast. We will not choose low prices first and hope cheaper providers make them work. We will measure the bounded workload, price it using the most expensive eligible paid execution path, allocate our own service-operation usage, add a cost-volatility reserve, and only then set the price.

### 7.1 Absolute separation from limited free quotas

The Security Assessment service must not consume NOVA's, AstroCrown's or the maintainer's limited free AI/API allowances for customer assessments, production monitoring, internal service health probes, model qualification, regression evaluation, failure investigation or maintenance.

- Use a dedicated production billing project/account and separate credentials for all service-provider calls. Keep development and service operating costs separated in accounts, ledgers, credentials and reports.
- Every production AI/API call, including our own service-operation calls, must be routed through an explicitly paid/prepaid path whose billing behavior has been verified. Do not use a provider's free tier, trial credit, free daily token/neuron/request allocation or development allowance as if it were a sustainable production resource.
- If a provider cannot offer a verified paid route that preserves the protected development quotas, that provider/model is ineligible for the security service until an acceptable paid arrangement is established.
- Mistral remains deferred in the current NOVA roster and must not be counted as an active fallback or included in the service's eligible rate pool until it is explicitly requalified and approved.
- If the paid account has no available budget/credits, use deterministic checks that require no external AI inference, or stop/block the AI-dependent action before the call. Do not silently fall back to a free quota.
- Do not send customer source code, secrets or private findings to any external AI provider by default. A paid route does not replace data-flow review, task-specific qualification or customer consent requirements.

### 7.2 Separate cost centres

Every provider call and meaningful workload must be accounted for as one of these categories:

1. **Customer delivery:** provider inference, tools and infrastructure used for the customer's explicitly authorized job.
2. **Service operations:** provider health/availability checks, monitoring, incident diagnosis, production qualification, security regression tests, false-positive analysis and service-quality evaluation.
3. **NOVA/AstroCrown internal use:** the service owner's own use and internal experiments associated with operating or improving the product.
4. **Development/test:** offline fixtures and local tests by default; any funded paid test call must be tagged separately.

Internal use must never be hidden inside customer quotas or funded by consuming limited development free allocations. Allocate the expected service-operation and internal-use cost to the service cost model and recover it through revenue, or reduce/disable that usage until separately funded. Free-user service costs must also be explicitly budgeted; do not assume free access has zero cost.

### 7.3 Price every plan against the highest-cost eligible paid route

Maintain a versioned rate card containing provider, exact model/service ID, billing tier/region, input/output or equivalent unit rates, tool fees, caching/context bands, minimums, rate source, date verified, billing path and commercial eligibility. Recheck the source before launch and after any provider/model/plan change.

For each proposed plan and one-time assessment, define a hard maximum usage envelope: supported assets/pages/files, checks, model input/output tokens, tool/search/embedding/vision units, scan cadence, attempts, retries/failover, retained history, storage/egress, report generation and retests. Do not estimate cost only from an average customer's usage.

Calculate the maximum chargeable execution path for that capped envelope using the highest-priced *eligible paid route for the actual task*, including the sum of all billable attempts across failover/retry paths. Use published standard paid rates or a verified written quotation. Do not rely on free credits, introductory credits, temporary discounts, batch/caching discounts or assumed volume discounts. If a route has no published rate or its exact model price/billing route cannot be verified, exclude it from a fixed-price plan until a rate is established.

**Provider cost ceiling for a plan** = the highest cost of any permitted execution/failover sequence at the maximum included usage and current verified paid rate card. A fallback sequence can incur several provider charges, so its cost must be summed; it is not simply the most expensive single call.

### 7.4 Formula and proposed financial guardrails

For each plan or billable task, define:

- `C_provider_max`: maximum paid provider/API/tool cost at the rate-card ceiling for the full included usage cap and every allowed retry/failover attempt.
- `C_platform`: hosting/runner/compute, data transfer, database, storage, logging/observability, monitoring, report delivery, customer support and other direct service costs; payment fixed fees are itemized separately in the formula.
- `C_internal_alloc`: conservative per-unit allocation for service-owned provider use, maintenance checks, qualification, security regression work and internal NOVA use needed to deliver/operate the service.
- `C_free_alloc`: the explicitly funded cost allocation for any free baseline, free-user infrastructure or free monitoring promised to users.
- `C_risk`: initially `0.20 × (C_provider_max + variable portion of C_platform)` as a proposed contingency on variable provider/platform costs, until measured operating history justifies a different buffer.
- `p`: the variable payment processing rate, verified for the selected payment method and region.
- `m`: a proposed minimum 30% contribution margin after the costs above and payment processing, before income tax and any corporate-level costs not already allocated.

Calculate the pre-indirect-tax price floor as:

`P_floor = ROUND_UP((C_provider_max + C_platform + C_internal_alloc + C_free_alloc + C_risk + fixed_payment_fees) / (1 - p - m))`

This is a proposed operating rule, not a claim that 20% is a statistically calibrated risk reserve or 30% is an industry standard. Validate the assumptions with representative runs and sensitivity analysis. Include any additional costs required to operate legally and safely in the applicable jurisdictions. Indirect taxes are handled as required by the customer's jurisdiction; do not silently treat tax collected for authorities as margin.

Do not set a fixed monthly price until the included maximum usage fits within that floor. If the resulting price is too high for the intended customer, lower the plan's included workload or frequency, simplify/localize the computation, select a cheaper provider only after equivalent qualification, or offer transparent pay-per-assessment pricing. Do not simply reduce the price below cost.

### 7.5 Spend limits, free access and safe degradation

- Put hard per-job, per-customer, per-day and per-month spend caps ahead of provider calls. Count failed calls/retries conservatively unless invoice evidence proves they were not billed.
- Set alerts at 50%, 75%, 90% and 100% of the approved budget. At the cap, open no further provider-dependent jobs without explicit budget authorization; do not allow retries or fallback to bypass the cap.
- Monthly subscription tiers must contain explicit scan/AI credits and maximum per-job usage. No unbounded scanning or hidden overages. When the allowance is exhausted, show it clearly; preserve prior reports and offer deterministic, no-inference checks where available. Never auto-upgrade or charge a surprise overage.
- The free Quick Check may use a carefully bounded deterministic path with no external AI call. Any hosted compute or storage still has a cost and must remain within a measured, funded free-service budget.
- The Community Watch / free monitoring plan is disabled until a paid-revenue allocation or separately funded operating budget covers its infrastructure and support. It must not consume free API quotas.
- Internal NOVA/provider health and qualification jobs are separately budgeted. If there is no paid operational budget, use offline fixtures/local tests and do not make live model calls for this service.
- Review actual provider bills and unit economics monthly. If actual costs exceed the forecast envelope, stop new sales or reduce future allowances immediately, protect existing customer data, and correct pricing/limits before resuming.

### 7.6 Current official rate-card observations (not yet the production service rate card)

Official vendor pages checked on 2026-10-26 illustrate why a provider-agnostic cost ceiling is necessary:

| Published route example | Observed published rate | Important qualification |
|---|---|---|
| Groq `openai/gpt-oss-20b` | $0.075 / 1M input tokens; $0.30 / 1M output tokens | The current NOVA roster has this model qualified for a bounded health response only. Security-assessment suitability and commercial billing must be qualified separately. |
| Google Gemini `gemini-3.1-flash-lite` | Standard paid tier: $0.25 / 1M text input tokens; $1.50 / 1M output tokens | Current NOVA qualification relates to a specific bounded health contract, not to general security analysis. Verify the paid billing tier and exact task before production use. |
| Cloudflare Workers AI | Billing is model-specific; pricing documentation states $0.011 per 1,000 neurons and also describes a 10,000-neuron daily no-charge allocation. Prepaid AI Gateway credits are documented as a paid route. | Do not assume the no-charge allocation is available for this service. Confirm the exact deployed model SKU and verify that the chosen paid billing path does not consume protected development quota before allowing this provider. |

These are observed snapshots, not a permanent price guarantee or a complete list of permitted routes. Models with a contract failure, preview/retirement risk, unknown billing, or unverified production entitlement must not enter the cost calculation as eligible routes. Reconfirm prices and terms from the linked official pages immediately before approving the production rate card.

### 7.7 Plan structure while the price is being calculated

Keep the customer-facing plan concepts, but show **“price and allowance not set—cost validation pending”** internally until the calculation above is complete:

| Plan concept | Intended purpose | Economic gate |
|---|---|---|
| **Quick Check** | Free, bounded, deterministic public-website baseline | No external AI/API inference; infrastructure bounded by a funded free-service cap |
| **Community Watch** | Limited passive checks/history for one verified asset | Do not launch until its real infrastructure and support cost is funded without using free AI/API quotas |
| **Starter** | One website; scheduled checks, report and remediation guidance | Monthly price must cover the maximum included paid-provider path, operation/internal-cost allocation, contingency and target margin |
| **Builder** | Multiple supported assets and a qualified repository | Explicit asset/check/AI credits; same cost-floor rule |
| **Team** | Collaboration, private shared reports and audit history | Explicit seats and resource limits; no implied 24/7 response |
| **Extended automated assessment** | One explicitly authorized, capped, non-destructive assessment and a defined retest | Price per task computed from its measured maximum workload and paid-provider rate ceiling |

Annual discounts may be introduced only after the cost model is validated across the whole commitment term. An annual discount must not reduce the price below the worst-case contracted workload cost plus the required margin. Human-led professional assessments remain separate and scope-quoted only after qualified reviewers, capacity, contracts and liability/data-handling arrangements are established.

### 7.8 The user must never pay for a hidden test

- Never hide or blur a confirmed in-scope finding to push an upgrade.
- Identify any unperformed or plan-excluded check; untested is not PASS.
- Users keep their private findings and remediation guidance; the Benchmark and public listing remain optional.
- Paid plans buy greater verified scope, frequency, retention, collaboration or qualified service—not a better grade, a suppressed vulnerability or a higher chance of winning.
- Show plan limits, maximum usage, retest conditions, cancellation, taxes and any separately authorized cost before confirmation.
- Price changes apply prospectively with clear notice and consent where required; never silently increase costs already committed under a fixed term.

## 8. Prize funding and commercial independence

Do not promise cash prizes or announce a prize amount before funds are available and segregated.

**Proposed formula:** allocate 10% of annual net realized Benchmark-related surplus to the prize reserve, calculated only after refunds/chargebacks, applicable taxes, payment-processing costs, directly attributable delivery costs and the approved minimum operating reserve have been provided for. The percentage and accounting definition must be approved and published before a prize season begins.

- If the available pool is zero, do not create an unfunded prize obligation. The edition may provide non-monetary recognition only if that condition was clearly published before entries opened.
- If funded, a proposed split is 50% for first place, 30% for second and 20% for third within each funded award pool.
- If fewer placements are validly earned, do not invent recipients; keep unused allocations in the restricted prize reserve for a later published cycle or handle them under a prepublished reserve rule.
- No entry fee, subscription tier, donation or payment may influence the winner or award amount.
- Record the funding formula, realized pool, allocation, any carry-forward and final disbursements. Publish an appropriate aggregate accounting summary without exposing user/customer information.
- Obtain jurisdiction-specific tax, consumer-protection and prize/competition legal review before offering cash, crypto-assets or token-denominated awards.

## 9. Presentation-ready description

### Short public pitch

**Security assessments that help you improve—even if you never want an award.**

AstroCrown is developing an evidence-led security assessment service for websites, applications and software systems. Start with an accessible baseline, receive private findings and practical remediation guidance, and add scheduled checks as your needs grow. Public Benchmark recognition is optional; your security results are valuable even when you never enter a ranking.

We aim to make security assessment understandable, private by default and priced for smaller projects. We test only within the scope and authority granted, explain what was and was not checked, and never sell a higher score or hide an in-scope finding to encourage an upgrade.

**No badge is required. No public ranking is required. The objective is better security.**

### Simple plan presentation

- **Free — Start safely.** Get a basic baseline and understand the next steps.
- **Starter — Stay aware.** Weekly checks for one website and practical remediation guidance.
- **Builder — Cover more.** Bring several assets and a supported repository into one view.
- **Team — Coordinate.** Share private reports and review history across a small team.
- **Benchmark — Optional recognition.** Choose separately whether to compete under published, independent rules. It is not a paid tier.

### Presentation language to avoid

Do not say “guaranteed secure”, “unhackable”, “certified by OWASP/NIST/ISO”, “24/7 protection”, “complete coverage”, “zero false positives”, or “fully autonomous security” unless a specific, independently supported claim justifies the exact wording. Do not describe the proposed pricing as live, the benchmark as operational, or any plan as available until the relevant gates pass.

## 10. Release gates

The service and the public Benchmark remain **NOT APPROVED FOR PUBLIC LAUNCH** until the applicable gates are evidenced. A proposal, document, successful workflow or prototype is not sufficient.

### Gate A — useful and bounded prototype
- [ ] Exact supported target types and check list frozen for the prototype.
- [ ] Tests limited to assets owned by AstroCrown or explicitly authorized controlled test assets.
- [ ] Deterministic checks, finding schema, evidence references, severity/confidence and safe report rendering work end to end.
- [ ] Tests for timeouts, rate limits, out-of-scope targets, malformed input, false positives and stop conditions pass.
- [ ] Secrets and sensitive report data are redacted from logs and excluded from public outputs.
- [ ] Findings include a clear distinction between FAIL, PASS, N/A and BLOCKED; no missing check silently becomes PASS.

### Gate B — pilot with external users
- [ ] Target ownership/authority verification and scoped consent tested.
- [ ] Terms, privacy notice, retention/deletion rules, responsible disclosure channel and incident procedure reviewed.
- [ ] Customer reports are isolated by account and authorization; access controls are tested.
- [ ] A user can opt out of the Benchmark without losing their private report or remediation guidance.
- [ ] Cost, processing quotas, reliability, false-positive rates and support burden are measured.

### Gate C — paid service
- [ ] Unit economics justify each published price under expected usage and a conservative abuse scenario.
- [ ] Billing, tax disclosures, cancellation, refund/chargeback handling, overage limits and no-card free access are tested.
- [ ] Pricing and plan boundaries are visible before the customer commits.
- [ ] No customer-facing feature or support response implies service levels not operationally provided.
- [ ] Legal and privacy review completed for target jurisdictions and data flow.

### Gate D — public Benchmark and awards
- [ ] Test adapters, category definitions, weights, hard gates, tie handling, freshness window and appeal process independently reviewed and published before the edition opens.
- [ ] Pilot evidence supports reproducible score calculation, evaluator consistency and reasonable false-positive handling.
- [ ] Non-compensatory critical gates and publication-safety checks pass dedicated tests.
- [ ] Council declarations, recusals, voluntary elections, award preservation, sanctions and independent appeals have been exercised in tabletop scenarios.
- [ ] Prize reserve and accounting process verified; no unfunded award promises.
- [ ] Public badge verification, dated scope statement, archive behavior and safe omission rules tested.
- [ ] AstroCrown and controlled entities are technically and procedurally excluded from competitive recognition.

Until these gates are passed, the correct external status is **proposed / development-stage**, not available, independently validated, certified, or production-ready.

## 11. Decisions preserved by this charter

1. Security utility and private remediation are primary; public ranking is optional.
2. Findings and scores are separate. Qualification gates cannot be offset by a high aggregate.
3. Public rankings are dated achievements, not live disclosure of failure or a guarantee of current security.
4. AstroCrown and controlled entities never receive their own Benchmark recognition.
5. Voluntary Non-Award Election is irrevocable for the elected period, removes public competitive recognition without suppressing the user's private assessment, and must be made before results are disclosed.
6. A legitimate award already granted within the three-year period cannot be voluntarily erased to manufacture Council voting eligibility.
7. Honest mistakes are corrected proportionately; serious sanctions require substantiated serious misconduct and fair process.
8. A proven serious breach may result in ten-year Benchmark exclusion and lifetime exclusion from Benchmark-related Council decision-making.
9. Award revocation requires substantiated, materially relevant intentional fraud; allegations and honest errors alone are insufficient.
10. Fixed plan prices are not approved until each workload is capped and priced at the highest eligible paid-provider route, with the service's own operating/internal usage, free-plan allocation, 20% contingency and 30% target contribution margin included.
11. No service or internal provider call may consume limited development/free-tier quotas. Production provider use requires a separately budgeted paid route; if funding is unavailable, use deterministic/offline checks or stop.
12. The launch must not depend on paid AI APIs or third-party commercial services unless their costs and terms have been explicitly approved.

## 12. References

External sources reviewed on 2026-10-26; provider rates and terms change and must be rechecked before approving a rate card. No rate card or customer price has been approved.

### Security methods and governance
- OWASP ASVS 5.0.0: https://asvs.owasp.org/
- OWASP Web Security Testing Guide, stable v4.2: https://owasp.org/www-project-web-security-testing-guide/v42/
- OWASP Top 10:2025: https://top10.owasp.org/2025/
- NIST Cybersecurity Framework 2.0: https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20
- NIST SP 800-218 SSDF v1.1: https://csrc.nist.gov/pubs/sp/800/218/final
- CISA and partner guidance on coordinated vulnerability disclosure (July 2026 notice): https://content.govdelivery.com/accounts/USDHSCISA/bulletins/420a485
- OpenSSF Scorecard: https://openssf.org/scorecard/
- OpenSSF Best Practices Badge: https://openssf.org/projects/best-practices-badge/
- UK Charity Commission, conflicts of interest (jurisdiction-specific governance guidance): https://www.gov.uk/government/publications/identifying-and-managing-conflicts-of-interest-in-a-charity-cc29
- OECD conflict-of-interest guidance: https://legalinstruments.oecd.org/public/doc/130/body-text.en.html

### Pricing reference pages
- Wordfence pricing: https://lp.wordfence.com/en/wordfence-plans-pricing
- Sucuri security platform: https://www.sucuri.net/
- Intruder pricing (market reference only; not a cost proxy for this service): https://www.intruder.io/pricing

### Provider rate-card sources
- Groq supported models/pricing: https://console.groq.com/docs/models
- Google Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Cloudflare Workers AI pricing and billing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Mistral API pricing (Mistral remains deferred in the current NOVA provider roster and is not an approved route for this proposal): https://docs.mistral.ai/inference/pricing

This is a project proposal and planning document, not legal advice. Obtain appropriate legal, privacy, tax and security-professional review before operating paid assessments or awarding prizes.

# AstroCrown Security Assessment and Benchmark — Starting Point

**Document ID:** ACW-SEC-BENCH-START-001  
**Version:** 0.1.0  
**Date:** 2026-10-25  
**Status:** PROPOSED STARTING POINT — NOT APPROVED FOR PUBLIC LAUNCH  
**Detailed rules:** [Security Assessment Service and Benchmark Governance Charter](ASTROCROWN-SECURITY-ASSESSMENT-AND-BENCHMARK-CHARTER.md)

## 1. Purpose in one sentence

**Help people make their websites, applications, repositories and other supported systems safer, whether or not they want public recognition.**

The security service is the primary product. The public Benchmark is a separate, optional recognition programme. A customer must receive useful private assessment findings and remediation guidance without competing, buying a badge, or disclosing their system publicly.

## 2. What a user should experience

1. Choose a quick baseline, a scoped assessment, or monitoring.
2. Identify the target and verify ownership or written authorization when required.
3. See exactly which checks will run, which are passive or active, what is excluded, and any limitations.
4. Receive a private report with evidence, severity, confidence, practical remediation, test dates, scope, and the checks not performed.
5. Retest fixes when the plan includes it, preserving the original findings and retest evidence.
6. Optionally enable recurring checks or separately opt in to an eligible Benchmark edition.

**Core user promise:** no public listing is required, no result is hidden to force an upgrade, and paying more never buys a higher score or award.

## 3. Initial feature scope

**First release candidates — not yet a claim of availability**

- Public website posture: TLS/HTTPS, redirects, security headers and selected DNS/configuration checks.
- Supported GitHub repository checks: dependency advisories, repository security configuration, selected static analysis and redacted secret-detection findings.
- Evidence-backed private reports with clear PASS / FAIL / N/A / BLOCKED treatment.
- Practical remediation guidance and scoped retesting.
- Optional, clearly scheduled low-impact monitoring after reliability, alert latency and operating cost are verified.

Later candidates—APIs, authenticated applications, cloud environments, mobile applications and smart contracts—must each have a separately validated method and authorization/safety gate. A website check must never be marketed as a full penetration test, smart-contract audit, compliance verification or guarantee of security.

Active tests require recorded authority and explicit scope. No uncontrolled destructive test, denial-of-service activity, scope expansion, data exfiltration or autonomous production change is allowed. AI may help explain and triage evidence; it cannot invent findings, authorize tests or silently change customer systems.

## 4. Provider-cost-backed pricing — no fixed prices yet

The earlier $4.99 / $14.99 / $39.99 monthly ideas and $19 assessment idea are **withdrawn as unvalidated**. Do not publish or use them in financial forecasts. Fixed prices will be set only after representative workloads have been measured and each plan has a hard usage cap.

**Non-negotiable resource rule:** do not consume NOVA/AstroCrown's limited free AI/API quotas for customer assessments, monitoring, service health probes, provider qualification, regression testing, internal analysis or maintenance. Every production provider call, including our own use, needs an approved paid/prepaid route, a separate budget and a metered cost record. If it cannot be funded, use deterministic/offline checks without external inference or stop the AI-dependent action.

### Pricing formula

For each capped plan/task, calculate:

- `C_provider_max`: the full maximum paid cost of the most expensive eligible provider route for the actual task, including input/output tokens, tools, all allowed retries and the sum of charges across any failover sequence.
- `C_platform`: compute/runner, hosting, database, storage, egress, logging, monitoring, payment fixed fees, support and other direct service costs.
- `C_internal_alloc`: conservative share of our own service-operation and NOVA use, qualification, live monitoring, regression/security checks and maintenance required to deliver the service.
- `C_free_alloc`: the explicit funded cost of any free-user allowance/monitoring we choose to offer.
- `C_risk`: initially 20% contingency on variable provider/platform costs, until evidence supports a different buffer.
- `p`: the verified variable payment-processing rate; `m`: a proposed minimum 30% operating contribution margin after all direct and allocated service costs and payment processing; allocate internal use, maintenance, support and service-specific overhead rather than leaving them unfunded. Handle applicable taxes separately.

`P_floor = ROUND_UP((C_provider_max + C_platform + C_internal_alloc + C_free_alloc + C_risk + fixed_payment_fees) / (1 - p - m))`

This is a starting financial control, not a statistically proven industry margin. Check costs with representative runs, high-usage customers, failure/retry paths and downside volume. Add legally required taxes as applicable. If the floor is too high, reduce the included workload or cadence, optimize/localize the method, or use clear per-assessment pricing; do not price below cost.

### Operational safeguards

- Price using the highest eligible *paid* route for the specific task and the maximum included usage, never average usage or free credits.
- The plan catalog must name each task's asset/check/AI credits, request/token and retry ceilings, schedule, retention and support scope.
- Alert on usage budgets and stop new provider-dependent jobs at the hard cap; no hidden overages, surprise billing or automatic upgrades. Count failed attempts as billable unless actual provider billing proves otherwise.
- Separate accounting for customer delivery, service operations, internal NOVA/AstroCrown usage and development/test use. Allocate internal/free-service costs to the price or a funded reserve; never hide them in free quotas or customer balances.
- Free Quick Check may use bounded deterministic checks with no external AI/API call. Free Community Watch is disabled until its infrastructure/support cost is explicitly funded.
- If a production paid billing path cannot be verified for a provider/model, it is not eligible. The current NOVA roster has Groq, Gemini and Cloudflare as active providers, but their existing health-probe qualification does not qualify them for security assessments. Mistral is currently deferred and must not be assumed available.
- Review actual invoices and unit economics monthly. If a plan can lose money under its documented maximum workload, stop new sales or reduce future caps before resuming.

### Current price-card observations (examples only, checked 2026-10-26)

| Provider example | Published paid rate observed | Limitation |
|---|---|---|
| Groq GPT-OSS 20B | $0.075 / 1M input tokens and $0.30 / 1M output tokens | NOVA's current model qualification is for a bounded health-response contract, not security analysis. |
| Gemini 3.1 Flash-Lite Standard | $0.25 / 1M text input tokens and $1.50 / 1M output tokens | Security-workload qualification and production paid billing still need separate verification. |
| Cloudflare Workers AI | Model-specific; provider documentation states $0.011 per 1,000 neurons and a 10,000-neuron daily no-charge allocation | The exact model SKU and a paid billing path that does not consume protected development quota must be verified before use. |

Rate cards change. These examples are not a complete eligible-route list and are not enough to set customer prices. Use the linked official pricing pages and record exact route, model, tier, region, billable units, price, date, and evidence in a versioned cost register before launch.

### Plan concepts (price/allowance not set)

| Plan | Intended purpose | Release/cost condition |
|---|---|---|
| Quick Check | Free, bounded, deterministic public-website baseline | No external AI/API call; infrastructure within a funded cap |
| Community Watch | Limited passive monitoring/history for one verified asset | Do not launch until its real cost is funded without using free AI/API quotas |
| Starter | One website, scheduled checks, private report and remediation | Price at provider-cost ceiling plus internal/operating cost and margin |
| Builder | Multiple supported assets and a qualified repository | Explicit asset/check/AI credits and the same floor formula |
| Team | Collaboration, private shared reports and history | Explicit seat/resource caps; no 24/7 response implied |
| Extended automated assessment | One authorized, bounded non-destructive assessment and defined retest | Set a per-task price only after the task's maximum paid cost is measured |

No fixed monthly price, annual discount or paid assessment price is approved until this model is validated. The detailed formula and launch gates are in the [full charter](ASTROCROWN-SECURITY-ASSESSMENT-AND-BENCHMARK-CHARTER.md).

## 5. Benchmark: optional, dated and independent

- Benchmark participation is a separate opt-in; service registration or payment does not enroll a customer.
- No separate Benchmark entry fee, paid score, paid ranking advantage or increased award probability by plan.
- If a genuinely equivalent no-cost assessment cannot be offered to entrants, postpone the competitive edition rather than make it pay-to-rank.
- Begin with one validated web-asset category. Do not rank unlike systems together. Add categories only after each method and its coverage are validated.
- Mandatory qualification gates apply before points; a high total cannot offset a disqualifying critical finding, missing coverage or blocked mandatory check.
- Candidate scoring is 0–100 only after each test adapter, weights, thresholds, coverage and publication rules are calibrated and frozen before an edition.
- Publish award recipients only. Non-winners, non-entrants, withdrawn entrants and non-qualifying entries are not given public scores or failure labels.
- Results are dated historical achievements, not a live failure feed, an external certification or proof of present-day security. Each award states its edition, category, assessment date and scope.
- Publication safety is mandatory. No public score or award may disclose secrets, private findings, exploit details or failure-specific reasons for absence.

Proposed award labels: **AstroCrown Security Benchmark — 1st Place — [Edition]**, likewise for second and third place. Award only placements actually earned. No entry fee, subscription, donation, relationship or Council position can affect the outcome.

## 6. Independence and fairness rules

### AstroCrown never competes

AstroCrown and entities under its control can assess their own systems internally, but must never accumulate, claim, publish, display or promote Benchmark points, scores, rankings, placements, badges, prizes or awards. Any permitted public self-assessment is a non-competitive transparency report, not a Benchmark achievement.

### Council separation

- Disclose actual, potential and reasonably perceived conflicts.
- A conflicted person cannot access unnecessary restricted material, influence deliberations, vote, count toward quorum or decide their own case.
- Benchmark-related decisions include rules, eligibility, scoring, rankings, awards, prize funding, publications, appeals, sanctions and related rule changes.
- The proposed ordinary separation is three years before and after competitive participation or receipt of an award. The detailed charter defines how this applies to Council decision rights and entity participation.
- A proven serious, material breach, after independent review and opportunity to respond, may result in ten-year Benchmark exclusion and lifetime exclusion from Benchmark-related Council deliberation and voting. This does not automatically remove unrelated Council rights.

### Voluntary Non-Award Election

- A participant can irrevocably forgo all public competitive recognition for an edition, with the election recorded before results or awards are known.
- The election removes public competitive recognition for the covered period but never removes the participant's private assessment report or conceals its security findings.
- The award passes to the next eligible participant under the prepublished rules. The election remains binding even if the person is not appointed to the Council or changes their mind.
- Retroactive non-competitive status may be requested for the preceding three years only for periods in which no award was granted to the person or relevant entity, subject to verification and the detailed charter.
- A legitimate award already granted within the three-year period is preserved; it cannot be voluntarily erased to manufacture immediate voting eligibility.
- Award revocation is separate from correcting an assessment record. It is allowed only after a fair, independent process substantiates intentional fraud materially related to obtaining or retaining the award. An honest mistake or allegation alone is not proof of fraud.
- Correct good-faith mistakes proportionately, maintain an auditable record, and provide an independent appeal. Do not make unsupported public allegations or expose private vulnerabilities.

## 7. Prize funding — proposed only

Do not promise an award pool before funds exist and are accounted for. Candidate rule: allocate 10% of annual net realized Benchmark-related surplus to a restricted prize reserve, after refunds, taxes, processing and directly attributable delivery costs, and an approved minimum operating reserve. If funded, a candidate split is 50% / 30% / 20% for first / second / third place. These percentages are unapproved options; disclose and approve a final formula before an edition opens, and obtain applicable tax and legal review. The pool may be zero; never create an unfunded obligation.

## 8. Method and public-claim boundaries

Use recognized references where relevant: OWASP ASVS 5.0.0, OWASP WSTG v4.2, OWASP Top 10:2025, NIST CSF 2.0 and NIST SSDF v1.1, plus suitable existing repository tools. Version and scope each mapping. Reference alignment does not confer certification.

Never claim “unhackable”, “guaranteed secure”, “zero false positives”, “certified by OWASP/NIST/ISO”, “complete coverage”, or “24/7 protection” without exact evidence for that exact claim. A scan or CI pass is not an independent human audit. A BLOCKED or untested control must never become PASS.

## 9. Launch order and go/no-go gates

1. **Prototype:** freeze the initial checks and finding schema; test only owned or explicitly authorized targets; verify scope enforcement, safe limits, evidence, redaction, reports and remediation.
2. **Controlled pilot:** verify authorization, privacy, data retention/deletion, report isolation, false-positive handling, support burden, operating cost and user experience.
3. **Paid service:** validate unit economics, capacity, quotas, billing, cancellations, refunds, taxes and plan boundaries before advertising prices.
4. **Benchmark pilot:** validate scoring reproducibility, category comparability, eligibility gates, publication safety, conflict/recusal workflows, appeals, record preservation and prize accounting before announcing winners.

**No launch claim or public price is approved until its corresponding gate has evidence and a separate promotion decision has been made.** Keep this proposal in development; do not modify the live homepage or enable the Benchmark as part of the documentation change.

## 10. Open decisions to resolve before launch

- Which exact first-release checks are safe, reproducible and feasible at $0 operating cost?
- Can the free monitoring allowance be sustainably supported, and what exact cadence/retention caps apply?
- What are the measured maximum customer workload and maximum eligible paid-provider failover costs for each proposed plan?
- Does a dedicated paid production provider path avoid the limited free/development quotas for every customer and internal service call?
- Do prices cover customer usage, our own operational/internal usage, free-service allocation, infrastructure, a 20% variable-cost contingency and the proposed 30% contribution margin?
- Which independent people can safely serve as assessors and appeal reviewers?
- What exact score adapters, category eligibility thresholds, tie-breaks and evidence-freshness period will be validated in pilot testing?
- What final prize-reserve formula is financially and legally appropriate in the applicable jurisdictions?

## 11. Source of truth and next step

This document is the concise memory and orientation point. The [detailed governance charter](ASTROCROWN-SECURITY-ASSESSMENT-AND-BENCHMARK-CHARTER.md) remains the fuller specification and controls where detail is necessary. Existing competitor research in [11-COMPETITOR-VERIFICATION-BENCHMARK.md](../11-COMPETITOR-VERIFICATION-BENCHMARK.md) remains research about other systems; it is not proof that AstroCrown's product is operational.

**Next step:** review and reconcile the proposal, then build the smallest safe, deterministic prototype and validate it against assets AstroCrown owns or is explicitly authorized to test. Public ranking, pricing, awards and homepage promotion come later.

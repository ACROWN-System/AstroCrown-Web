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

## 4. Proposed pricing to validate

These are planning hypotheses, not live offers or approved financial commitments.

| Plan | Proposed price | Intended starting value |
|---|---:|---|
| Quick Check | Free | One on-demand, low-impact public website baseline; no card required |
| Community Watch | Free | One verified asset, limited passive rechecks and 30-day history, only if capacity can support it |
| Starter | $4.99/month or $49/year | One website, weekly checks, alerts, report and remediation guidance |
| Builder | $14.99/month or $149/year | Up to five assets plus one supported repository; weekly checks and longer history |
| Team | $39.99/month or $399/year | Up to ten assets, three seats, shared reports and audit history |
| Extended automated assessment | $19 one-time | One authorized, deeper non-destructive assessment and one follow-up recheck within 30 days |

All plan limits, prices, quotas, support duties, taxes, false-positive handling, data retention, hosting/API costs and free-tier sustainability must be validated before the prices are published. These automated offers do not include or imply expert-led penetration testing, guaranteed response, or 24/7 protection. Professional human-led assessments require a separate, properly staffed and scoped service.

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
- Do the candidate paid prices cover real processing, hosting, support, taxes, data retention and abuse costs?
- Which independent people can safely serve as assessors and appeal reviewers?
- What exact score adapters, category eligibility thresholds, tie-breaks and evidence-freshness period will be validated in pilot testing?
- What final prize-reserve formula is financially and legally appropriate in the applicable jurisdictions?

## 11. Source of truth and next step

This document is the concise memory and orientation point. The [detailed governance charter](ASTROCROWN-SECURITY-ASSESSMENT-AND-BENCHMARK-CHARTER.md) remains the fuller specification and controls where detail is necessary. Existing competitor research in [11-COMPETITOR-VERIFICATION-BENCHMARK.md](../11-COMPETITOR-VERIFICATION-BENCHMARK.md) remains research about other systems; it is not proof that AstroCrown's product is operational.

**Next step:** review and reconcile the proposal, then build the smallest safe, deterministic prototype and validate it against assets AstroCrown owns or is explicitly authorized to test. Public ranking, pricing, awards and homepage promotion come later.

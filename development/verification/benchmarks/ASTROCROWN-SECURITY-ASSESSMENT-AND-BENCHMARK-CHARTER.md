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
- Do not publish non-winning entrants by default; do not label non-entrants, withdrawn entrants or non-qualifying entries as failed, held, suspicious or unsafe.
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

## 7. Proposed pricing

**All prices below are planning proposals in USD, not current offers.** These deliberately low entry prices are for bounded, primarily automated checks, not a substitute for managed incident response or a professional penetration test. Verify actual delivery cost, processing fees, taxes, free-tier capacity, false-positive burden, support time and retention cost before announcing or accepting payment.

| Proposed plan | Monthly | Annual | Intended limits and value |
|---|---:|---:|---|
| **Quick Check** | $0 | $0 | On-demand, low-impact public website baseline; one target per run; no card and no account required for a basic result. Only what was actually checked is reported. |
| **Community Watch** | $0 | $0 | One verified asset; a low-frequency passive recheck, 30-day history and basic change notice. Launch only after capacity and cost tests prove this can be reliably supported within a published cap. |
| **Starter** | $4.99 | $49 | One verified website; weekly scheduled non-destructive checks, 90-day history, alerts, downloadable report and remediation guidance. |
| **Builder** | $14.99 | $149 | Up to five supported assets, plus one connected repository for qualified dependency/configuration/static checks; weekly schedule, change alerts and 180-day history. |
| **Team** | $39.99 | $399 | Up to ten supported assets and three seats; shared private reports, role-specific access, activity/audit history, a monthly summary and 365-day history. No 24/7 response is implied. |
| **Extended automated assessment** | — | **$19 one-time** | Proposed deeper, explicitly authorized, non-destructive assessment of one supported asset, with a structured private report and one follow-up recheck within 30 days. Do not call this a human penetration test. |

Annual amounts are proposed discounts of roughly 17–18% compared with paying monthly. Applicable taxes and the precise included limits must be disclosed before sale. Do not require a card for a $0 plan. Paid plans should be cancellable without hidden exit charges; no automatic plan upgrade or surprise overage is allowed. Show the target count and schedule before a customer confirms a purchase.

**Professional human-led assessment:** do not include it in the initial self-serve plan table or promise it until qualified reviewers, scope controls, report quality, contracting, liability/insurance, data handling, capacity and retest responsibility have been established. When that service is ready, quote it against the actual target scope and assessor effort. A published supplier currently advertises AI-powered web-application penetration tests starting at $3,500 per test; this is a supplier-specific price, not a universal market average.

### 7.1 Why these prices are plausible—but still need validation

Public vendor pages observed on 2026-10-24 show examples such as Wordfence Premium at $149/year, Sucuri Basic at $229/year, and Intruder offering a free tier alongside application penetration tests advertised from $3,500/test. These products do not provide identical functions: some include firewall protection, malware cleanup, incident response or broader infrastructure testing. They are price references, not like-for-like equivalence.

The proposed entry plans are intentionally lower-cost and have narrower scope. They should compete on transparent evidence, helpful remediation, clear limits and accessibility—not on unsupported claims that they replace a firewall, malware-removal service or expert-led pentest.

### 7.2 Protect users from pressure to upgrade

- Never hide or blur a confirmed in-scope finding to sell a more expensive plan.
- Show the user when a result is unavailable because a particular check is outside their plan; do not represent an unperformed test as a pass.
- Basic remediation guidance and downloadable results for checks actually performed remain available at the free level.
- Paid plans buy greater scope, monitoring frequency, retention, collaboration and qualified service—not better grades or the suppression of risk.
- Do not require public listing, award participation, marketing permission, or use of a badge to purchase or use the service.
- Publish clear limits, retention periods, cancellation, tax, recheck and support terms before payment.

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
10. Proposed prices remain unapproved until unit economics and service capability are validated.
11. The launch must not depend on paid AI APIs or third-party commercial services unless their costs and terms have been explicitly approved.

## 12. References

External sources reviewed on 2026-10-24; the vendor pricing pages can change and must be rechecked before the price list is approved.

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
- Intruder pricing: https://www.intruder.io/pricing

This is a project proposal and planning document, not legal advice. Obtain appropriate legal, privacy, tax and security-professional review before operating paid assessments or awarding prizes.

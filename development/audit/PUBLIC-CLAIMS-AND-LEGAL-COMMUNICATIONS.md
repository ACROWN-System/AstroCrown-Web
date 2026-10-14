# Public Claims and Legal Communications — Evidence, Fairness and Preservation

**Status:** Proposed operational guidance; not legal advice and not counsel-approved  
**Scope:** Public website copy, product and model capability claims, documentation, benchmark reports, marketing, social posts, investor materials, public comparisons, responses to legal demands, and other external communications made for or about AstroCrown/NOVA.

## 1. Purpose and limits

Present information truthfully, with material context, an evidence trail, and proportionate protection of confidential know-how. Reduce avoidable risk from unsupported claims, misleading overall impressions, inaccurate allegations, improper disclosure, and mishandled evidence.

No disclaimer, label, citation, careful phrasing, or internal record guarantees immunity from legal action. A disclaimer does not cure an otherwise misleading statement. Applicable requirements depend on the audience, product, conduct and jurisdictions involved. Obtain qualified legal review for material commercial claims, high-risk comparisons, threats or claims of infringement, regulatory statements, and legal disputes.

## 2. Classify each material statement before publication

For each material claim, record one principal type and any necessary subtypes:

- **VERIFIED FACT / MEASUREMENT:** direct observation or independently checked fact, with source, version, date and method.
- **SOURCE CLAIM:** attributed statement made by a vendor, author, model card, benchmark or other source; not yet independently verified.
- **ESTIMATE / FORECAST:** assumption, estimate, target or forecast; disclose relevant assumptions and uncertainty.
- **HYPOTHESIS / OPINION:** analysis or opinion; separate the reasoning and evidence from established fact.
- **UNVERIFIED / BLOCKED:** required support is unavailable or conflicting; do not present it as established.
- **LEGAL ASSESSMENT:** interpretation of law, rights or compliance; identify jurisdiction, scope, assumptions, review status and limits. Do not describe an internal view as a court ruling or formal legal opinion.

Use clear dates and scope. A result that was true for a particular model version, prompt, region, account, plan, configuration or test period must not be generalized to all versions, users, jurisdictions or future conditions without additional evidence.

## 3. Substantiate claims before publication

Before publishing an objective claim about a product, service, technology, performance, price, capacity, safety, rights, quality, commercial readiness or legal status:

1. Define the exact express claim and the reasonable impression the complete page, graphic, headline, table and surrounding text may create.
2. Identify evidence sufficient for that exact claim before publication. Preserve it with its date/version, methodology, limitations and approver.
3. Test that the evidence matches the stated scope; disclose important dependencies, exclusions, uncertainties and known counterevidence.
4. Ensure qualifications are clear and timely, not hidden in a distant page or contradictory footnote.
5. Reassess claims when material inputs change, such as a model revision, provider policy, license, pricing plan, benchmark, product behavior or law.

If evidence does not support the claim, narrow it, label it as an estimate or proposal, or do not publish it.

### Claims requiring heightened scrutiny

Do not use statements such as “fully legally compliant,” “copyright-free,” “patent-free,” “100% open source,” “commercially cleared,” “zero risk,” “secure,” “best,” “fully autonomous,” “unlimited free GPU,” or “production-ready” unless the exact wording, implied meaning, scope and evidence justify it. Prefer a specific, bounded description of what was tested and what remains unresolved.

For AstroCrown/NOVA specifically:

- A successful hosted API call proves only the observed interaction; it does not establish a sustainable quota, independent GPU execution, commercial-use rights, transparency support, general quality, or compliance.
- A model's weight/license label does not automatically resolve the licenses of other checkpoints, encoders, datasets, adapters, source code, model outputs or hosted-service terms.
- A planned, candidate, mocked, offline-tested, or blocked capability must not be presented as deployed or verified.
- Distinguish cumulative capacity targets from measured usable capacity. State the measurement window, allocation type, hardware, uncertainty and evidence.
- Distinguish “we wrote the adapter/orchestration” from “we created or own the underlying model weights.”

## 4. Comparative claims and competitor references

Before comparing products, services, models, providers or competitors, retain the comparison design and evidence, including:

- the question and material criteria chosen before evaluating results;
- model/product identifiers, exact versions, test date, settings, prompts, environment, sample size and exclusions;
- equivalent or justified conditions for all candidates, any differences that could affect outcomes, and reproducible results where feasible;
- selection rationale, limitations, contradictory results and whether external benchmarks were independently reproduced;
- required permissions for screenshots, output samples, logos, source code, datasets or other third-party material used in the comparison.

Do not cherry-pick a result or imply that a limited test proves an overall ranking. State “in these tests, under these conditions” where that is what the evidence supports.

Do not publicly accuse a named competitor, person or organization of fraud, theft, malicious litigation, infringement, dishonesty or unlawful conduct merely because of suspicion, competitive disagreement, an allegation, or an unresolved legal position. If reporting an existing public claim or proceeding is necessary, verify the primary record, accurately distinguish allegations from findings, include procedural status and material context, and obtain legal review before publication. Truth, good faith, privilege, fair comment and other defenses can be fact- and jurisdiction-dependent; do not treat any of them as an automatic shield.

A neutral internal statement such as “the opposing party alleges X; the claim is disputed; counsel is reviewing the evidence” is preferable to an unsupported conclusion about motive or guilt. Public communications about an active dispute should be handled by a designated spokesperson with counsel's advice.

## 5. Sources, citations, quotations and factual summaries

- Prefer primary statutes, official regulatory guidance, published judgments, original model cards, official documentation, signed agreements and reproducible tests.
- Record publisher, title, canonical URL, date/revision, access date, exact version or commit and relevant section.
- Distinguish quotation, paraphrase, inference and our own experiment. Quote only what is justified; retain context and do not imply the source endorses AstroCrown.
- A citation establishes where a statement came from; it does not automatically grant rights to republish the source's protected expression, logo, image, dataset, software or weights.
- Record conflicting authorities and uncertainty. Do not selectively omit a material restriction or adverse finding.
- Verify that a quoted or summarized law remains in force and applies to the relevant jurisdiction and conduct. Use counsel for a material legal interpretation.

## 6. Public presentation versus protected internal evidence

### Public or shareable layer

Provide the relevant conclusion, scope, status, date, material qualifications, public citations and enough methodological description for the reader to assess the claim. Use plain language. Do not imply a formal audit, legal clearance or independent verification when none occurred.

### Restricted evidence layer

Preserve appropriate original source versions, agreements and license copies, experiment inputs/outputs, native artifacts, metadata, configurations, logs, relevant communications, timestamps, commit/workflow identifiers, checksums and review decisions in access-controlled storage.

Identify potential trade secrets and limit access on a need-to-know basis. Use suitable confidentiality labels and technical controls; do not place secrets, private keys, personal information, confidential third-party material or unnecessary proprietary implementation detail in a public repository. A label alone does not create secrecy or legal privilege. WIPO's guidance explains that trade-secret protection commonly depends on reasonable steps to preserve secrecy.

Do not conceal a material risk from an audience who is legally entitled to receive it simply to protect reputation or proprietary information. Ask counsel how to satisfy the duty while making proportionate, lawful disclosures.

## 7. Evidence integrity and changes

- Preserve original records unchanged when practicable. Create annotated/redacted copies separately and link them to their sources.
- Keep repository commits, workflow/run IDs, version identifiers, timestamps, artifact references and cryptographic hashes where appropriate. Hashes aid integrity checks but do not independently prove authorship, truth, permission or ownership.
- Correct inaccurate statements transparently. Record when the correction occurred, what changed, why, which evidence supports it, and whether recipients of the earlier claim need notification.
- Never backdate, fabricate, deceptively relabel, selectively alter or delete evidence to improve a legal narrative. Do not create a retrospective record that pretends to be contemporaneous.
- Apply retention schedules consistently, except where a preservation duty or hold changes the requirements.

## 8. Response to a legal threat, claim or suspected misappropriation

When a credible legal demand, threatened proceeding, takedown, infringement allegation, or suspected theft/disclosure of confidential information arises:

1. Escalate promptly to the designated responsible decision-maker and qualified counsel in the relevant jurisdiction. Do not make a public admission, counter-accusation or legal threat without appropriate review.
2. Identify potentially relevant repositories, branches, commits, artifacts, cloud logs, communications, contracts, model/data versions, staff and vendors with counsel.
3. Follow counsel's preservation instructions. Pause routine deletion/rotation of potentially relevant information where required; preserve relevant native files, metadata and a record of collection/handling. Do not destroy, sanitize, rewrite history or publish sensitive evidence to “prove” a position.
4. Restrict discussion to authorized people; avoid speculation, retaliation, informal promises and unnecessary disclosure of privileged or confidential materials.
5. Prepare a factual chronology that labels known facts, allegations, opinions and unknowns separately. Document the basis and status for each material assertion.
6. Track the response, deadlines, decisions and review approvals in a controlled record.

Preservation, disclosure, litigation holds, privilege and admissibility are jurisdiction-dependent. This workflow is a prompt to obtain legal advice, not a substitute for a jurisdiction-specific litigation plan.

## 9. Pre-publication review checklist

Before a material external statement is released, confirm:

- [ ] Is each important factual claim supported by evidence that predates publication?
- [ ] Does the whole presentation create an impression the evidence actually supports?
- [ ] Are source claims, hypotheses, estimates, test results and legal assessments distinguished?
- [ ] Are version, date, conditions, limitations and material uncertainties clear?
- [ ] Have third-party rights, license terms, confidentiality, personal data and trade secrets been reviewed?
- [ ] Are named-competitor comparisons fair, reproducible and free from unsupported accusations?
- [ ] Are citations accurate and sufficient, without suggesting endorsement or permission that was not granted?
- [ ] Has appropriate legal review occurred where the risk or commercial significance warrants it?
- [ ] Is the source evidence preserved in a suitable location with access controls?
- [ ] Is there an owner and process for correcting the statement if the evidence or circumstances change?

A missing mandatory item means the claim must be narrowed, blocked or escalated—not passed through by adding a generic disclaimer.

## 10. Reference sources

These sources provide starting points and are jurisdiction-specific; verify current law and applicability with counsel.

### India

- Consumer Protection Act, 2019, including the statutory definition of “misleading advertisement”: https://www.indiacode.nic.in/bitstream/123456789/15256/1/eng201935.pdf
- Department of Consumer Affairs, Consumer Protection framework and Guidelines for Prevention of Misleading Advertisements and Endorsements for Misleading Advertisements, 2022: https://consumeraffairs.nic.in/acts-and-rules/consumer-protection/consumer-protection
- Bharatiya Nyaya Sanhita, 2023, section 356 (defamation and specified exceptions): https://www.indiacode.nic.in/bitstream/123456789/20062/1/a2023-45.pdf
- Bharatiya Sakshya Adhiniyam, 2023, sections 61–63 (electronic/digital records): https://www.indiacode.nic.in/indiacode/bitstream/123456789/20063/1/aa202347.pdf
- Intellectual Property India, Copyright FAQs: https://ipindia.gov.in/faqs

### International reference examples

- United States Federal Trade Commission, Policy Statement Regarding Advertising Substantiation: https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation
- EU Unfair Commercial Practices Directive 2005/29/EC, including misleading actions and omissions: https://eur-lex.europa.eu/eli/dir/2005/29/oj
- WIPO, Trade Secret Management: https://www.wipo.int/web-publications/wipo-guide-to-trade-secrets-and-innovation/en/part-iv-trade-secret-management.html
- U.S. Federal Rules of Civil Procedure, Rule 37(e), electronically stored information preservation failures: https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title28a-node89-node131-rule37

## 11. Governance and review

This is proposed operational guidance. It does not certify compliance, create legal privilege, settle disputed facts, or guarantee immunity from litigation. A qualified lawyer should review its application to the entity structure, countries of operation, products, marketing, licenses, and potential disputes before it is treated as approved legal policy.

Revisit the guidance when a material law, regulation, product, model, commercial use, market, or legal dispute changes the risk profile.

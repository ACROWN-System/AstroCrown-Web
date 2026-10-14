# Active Audit Plan — Defensible Research Evidence and Public Legal Communications

**Date:** 2026-10-14  
**Status:** ACTIVE — documentation proposal pending review  
**Objective:** Establish consistent, evidence-centered records and public-communication controls for factual observations, model research, independent technical derivation, claims substantiation, competitor comparisons, confidentiality, and preservation without overstating legal protection.

## Scope

Repository: `ACROWN-System/AstroCrown-Web`  
Base revision: `a73b96863eb37d33c2d9cee43cc7c83e2dccade6`

Additive changes:
1. Add a governance policy for fact observations, independent derivation and evidence.
2. Add a reusable observation-record template.
3. Add public claims and legal communications guidance grounded in official legal/regulatory resources.
4. Link the guides from the audit index and media-generator entry point.
5. Preserve the distinction between public summaries and restricted evidence.

## Process and evidence

Use `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` as the current repository process. The inspected repository tree did not expose `NAVIGATION-PROTOCOL.md` or `NAVIGATION-PLAN-TEMPLATE.md`; this plan does not claim to follow absent documents.

Reference sources used as starting points:
- Intellectual Property India Copyright FAQs: https://ipindia.gov.in/faqs
- Indian Consumer Protection Act, 2019: https://www.indiacode.nic.in/bitstream/123456789/15256/1/eng201935.pdf
- Department of Consumer Affairs, Consumer Protection and advertising guidelines: https://consumeraffairs.nic.in/acts-and-rules/consumer-protection/consumer-protection
- Bharatiya Nyaya Sanhita, 2023, section 356: https://www.indiacode.nic.in/bitstream/123456789/20062/1/a2023-45.pdf
- Bharatiya Sakshya Adhiniyam, 2023: https://www.indiacode.nic.in/indiacode/bitstream/123456789/20063/1/aa202347.pdf
- FTC Policy Statement Regarding Advertising Substantiation: https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation
- EU Unfair Commercial Practices Directive 2005/29/EC: https://eur-lex.europa.eu/eli/dir/2005/29/oj
- WIPO Trade Secret Management: https://www.wipo.int/web-publications/wipo-guide-to-trade-secrets-and-innovation/en/part-iv-trade-secret-management.html
- U.S. Federal Rules of Civil Procedure, Rule 37(e): https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title28a-node89-node131-rule37

These are jurisdiction-specific authorities and guidance, not a universal legal conclusion. Current applicability and relevant jurisdiction(s) must be verified by qualified counsel for material commercial or disputed matters.

## Acceptance criteria

- Separate facts, source claims, hypotheses, inferences, protected expression/code, licensed components, confidential information and unknown/restricted inputs.
- Record sources, versions/dates, lawful access channel/terms, exact tested model/component identity, experiment conditions, reproducibility, multiplicity/independence, limitations, and derived implementation references as relevant.
- Require evidence before material objective public claims; match wording and implied impression to the evidence and disclose material scope, date, assumptions, limitations and uncertainty.
- Cover fair technical comparisons, claims about capabilities/licenses/capacity/compliance, competitor references, citations, correction and dispute escalation.
- Do not treat a fact-observation label or disclaimer as a legal safe harbor or as a way to disguise copied expression, restricted use, misleading claims or unsupported accusations.
- Separate public-facing summaries from restricted evidence and trade secrets; protect credentials, personal data and confidential third-party information.
- Preserve originals, hashes, source snapshots and history accurately; forbid backdating, fabrication, deceptive relabeling or destruction/alteration intended to impair review.
- Include legal-hold escalation and jurisdiction-dependent legal review.
- Keep changes additive; do not alter product code, provider credentials, model weights, existing evidence artifacts or backups.
- Submit a draft PR; do not represent it as legal advice, certification, or counsel-approved policy.

## Impact Analysis

**IF modified:** research records and public claims can use a consistent evidence-backed framework; confidential know-how can be appropriately protected; unsupported marketing statements, misleading comparisons and mishandled dispute evidence become easier to prevent and detect.

**IF not modified:** facts may be confused with allegations or hypotheses; public claims may exceed their evidence; critical caveats may be omitted; third-party restrictions and confidential material may be mishandled; and relevant evidence may not be preserved consistently.

## Implementation and verification status

- Created `development/audit/FACT-OBSERVATION-AND-EVIDENCE-GOVERNANCE.md`.
- Created `development/audit/templates/FACT-OBSERVATION-RECORD.md`.
- Created `development/audit/PUBLIC-CLAIMS-AND-LEGAL-COMMUNICATIONS.md`.
- Linked governance from `development/audit/README.md` and `development/ai-media-generator/README.md`.
- Draft PR: https://github.com/ACROWN-System/AstroCrown-Web/pull/123
- Changes are documentation-only. No product code, credentials, model weights, previously collected evidence or backups are changed.
- Offline media-generator tests and external-review-pipeline CI passed on the previous PR head; recheck final head after these added documentation changes. Other checks must be inspected before claiming all CI has passed.
- PR remains draft pending review. Counsel review is appropriate before treating these guides as approved legal policy.

**Closure condition:** inspect the final diff and all relevant CI conclusions; address findings; obtain the appropriate jurisdiction-specific legal review before declaring the policy approved.

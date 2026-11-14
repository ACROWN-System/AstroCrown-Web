# AstroCrown Web Development & Audit Convention

## 1. Purpose

This convention defines the development and verification method for AstroCrown Web.

It is intended to keep implementation, testing, security verification, evidence, findings, remediation, and re-testing traceable to recognized external standards rather than to an ad-hoc project checklist.

This convention applies to development work performed inside `development/`.

The regular website at the repository root is not modified by this convention unless and until a verified development result is intentionally promoted.

## 2. External Reference Standards

### 2.1 Secure development

Primary reference:

- NIST SP 800-218, Secure Software Development Framework (SSDF) Version 1.1.

Use SSDF as the development-process reference for secure development practices, risk reduction, vulnerability prevention, and recurrence prevention.

Reference:
https://csrc.nist.gov/pubs/sp/800/218/final

### 2.2 Web application security verification

Primary reference:

- OWASP Application Security Verification Standard (ASVS) Version 5.0.0.

Use the stable ASVS release as the principal application-security verification reference for the web application.

ASVS requirement references must include the version, using the form:

`v5.0.0-<chapter>.<section>.<requirement>`

Example:

`v5.0.0-1.2.5`

Do not use an unversioned ASVS identifier when recording an audit result.

Reference:
https://owasp.org/projects/asvs

### 2.3 Software product quality

Quality reference:

- ISO/IEC 25010:2023, Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model.

Use this as the reference model for software/product quality characteristics where applicable.

Reference:
https://committee.iso.org/standard/78176.html

ISO/IEC 25010 is a reference model, not a claim of ISO certification.

## 3. Methodology

Development follows this traceable sequence:

Requirement
→ Design / decision
→ Implementation
→ Automated verification
→ Manual verification
→ Security verification
→ Quality verification
→ Evidence
→ Finding or pass
→ Remediation
→ Re-test
→ Promotion

A verification result must not be considered closed merely because code was changed.

A finding is closed only after the applicable verification has been repeated and the result supports closure.

## 4. Requirement Traceability

Each auditable requirement or project requirement should be traceable to:

- requirement identifier or project requirement;
- external standard reference, when applicable;
- affected file/component;
- verification method;
- evidence;
- result;
- finding identifier, if applicable;
- remediation;
- re-test result.

Where no external standard directly applies, identify the criterion as a project-specific requirement rather than presenting it as an external standard requirement.

## 5. Verification Methods

Use the least complex verification method that provides sufficient evidence.

Possible methods include:

- static inspection;
- automated test;
- HTML/CSS/JavaScript validation;
- browser functional testing;
- responsive-layout testing;
- accessibility testing;
- security testing;
- dependency/component analysis;
- manual inspection;
- negative testing;
- regression testing;
- reproducibility testing.

No single automated tool is considered sufficient to establish overall correctness or security.

Automated findings require interpretation and, where appropriate, manual confirmation.

## 6. Evidence Convention

Every significant verification should produce or reference evidence sufficient for another person to understand what was tested and what was observed.

Evidence may include:

- test output;
- command/tool result;
- browser observation;
- captured page state;
- source-code reference;
- repository commit;
- reproducible test procedure;
- relevant log;
- before/after comparison.

Evidence must identify the version or commit against which it was produced whenever that distinction matters.

Do not claim that a test was performed when no evidence or reproducible basis exists.

## 7. Result States

Use only these primary verification states:

- PASS — the applicable criterion was tested and the evidence supports the requirement.
- FAIL — the criterion was tested and the evidence demonstrates that the requirement is not satisfied.
- N/A — the criterion genuinely does not apply; record the reason.
- BLOCKED — the criterion could not be tested because a required dependency, environment, capability, or evidence source was unavailable.

Do not convert BLOCKED into PASS.

Do not silently omit an applicable requirement.

## 8. Findings

A finding should contain, at minimum:

- Finding ID
- affected component/file
- criterion or reference
- observed condition
- expected condition
- evidence
- reproduction method
- impact/risk description
- status

Severity must be based on documented impact and evidence rather than on intuition or appearance.

If a severity model is needed, its definition must be recorded before it is used to classify findings.

## 9. Remediation and Re-test

A remediation should identify:

- the finding being addressed;
- the change made;
- affected files/components;
- the verification required after the change.

After remediation:

1. repeat the original failing verification;
2. verify that the failure is resolved;
3. perform relevant regression checks;
4. record the new evidence;
5. close the finding only when the evidence supports closure.

A fix that creates a new failure remains unresolved.

## 10. Change Discipline

Development should minimize unnecessary code and structure.

Before adding code, determine whether the required behavior can be achieved with existing code or a simpler implementation.

Avoid:

- duplicate mechanisms;
- redundant event listeners;
- unnecessary dependencies;
- speculative abstractions;
- compatibility code without a demonstrated requirement;
- temporary fixes that become permanent without review;
- development artifacts outside `development/`.

Every added mechanism should have an identifiable purpose.

## 11. Technology and Implementation Candidate Evaluation

When multiple technologies, libraries, implementation approaches, or code candidates are considered, evaluate them using evidence-based verification rather than numerical scoring.

Use only these result states:

- PASS — the candidate satisfies the applicable criterion and the evidence supports that conclusion.
- FAIL — the candidate was tested and does not satisfy the applicable criterion.
- N/A — the criterion genuinely does not apply; record the reason.
- BLOCKED — the criterion could not be verified because required evidence, capability, or environment was unavailable.

Do not use:

- point scores;
- weighted averages;
- compensating scores;
- percentage-based acceptance;
- rankings or tiers as substitutes for requirement verification.

Mandatory criteria are eligibility gates. A candidate with a mandatory FAIL is not eligible for implementation. A mandatory BLOCKED result prevents a final acceptance decision until the missing evidence is obtained or the criterion is otherwise resolved. N/A requires a recorded justification.

Candidate evaluation follows:

Requirement
→ Candidate
→ Test
→ Evidence
→ PASS / FAIL / BLOCKED / N/A
→ Eligibility decision
→ Implementation
→ Re-test

Where several candidates satisfy all mandatory requirements, the decision should be based on the documented project requirements and evidence, including simplicity, maintainability, security, performance, compatibility, and unnecessary complexity where applicable. The purpose is to identify a candidate that satisfies the requirements with the least unnecessary mechanism, not to manufacture a numerical measure of quality.

Candidate evaluations should use the template in development/audit/templates/CANDIDATE-EVALUATION.md.

## 12. Development / Regular Website Boundary

Development work belongs under:

`development/`

The regular website remains at repository root.

Development files must not be treated as production/public website files merely because they work locally.

Promotion from development to the regular website is a separate controlled action and requires verification against the applicable criteria before promotion.

## 13. Audit Record Convention

When an audit record is created, use the following minimum structure:

### Scope

What is being examined?

### Criteria

Which project requirements and external references apply?

### Method

How was each criterion verified?

### Evidence

What demonstrates the observed result?

### Result

PASS / FAIL / N/A / BLOCKED

### Findings

What conditions require remediation?

### Remediation

What was changed?

### Re-test

What was tested after remediation and what was the result?

### Closure

Why is the finding considered closed, or why does it remain open?

## 14. Reference Version Policy

Use stable, explicitly identified versions for audit baselines.

Current baseline:

- NIST SSDF: SP 800-218, Version 1.1
- OWASP ASVS: Version 5.0.0
- ISO/IEC 25010:2023

If a reference standard changes, do not silently replace the baseline.

Record the new version and determine whether existing verification records need re-evaluation.

## 15. Important Limitations

Using these references does not constitute certification or accreditation.

AstroCrown Web must not claim:

- NIST certification;
- OWASP certification;
- ISO certification;

merely because these references are used.

The project may state that its development and verification process uses the identified standards as reference criteria when that statement is accurate.

## 16. Core Rule

The audit system exists to establish evidence, not reassurance.

A result must follow the evidence.

If evidence demonstrates a failure, record the failure.

If evidence is insufficient, record BLOCKED rather than assuming success.

If a requirement does not apply, record N/A with its reason.

If a change is made to resolve a failure, re-test it.

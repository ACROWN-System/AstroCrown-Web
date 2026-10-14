# AstroCrown Web Audit

This directory contains development-stage audit records and verification evidence.

## Structure

- `records/` — completed or active audit records.
- `tests/` — reusable verification/test definitions.
- `evidence/` — audit evidence when a repository artifact is required.
- `templates/` — templates for consistent records and tests.
- `Active/` and `Completed/` — plans and audit work organized by lifecycle state.

Do not create additional categories until an actual audit artifact requires them.

## Record rule

Each audit record identifies its scope, criteria, method, evidence, result, findings, remediation, and re-test status.

The audit record is the index of the verification work; evidence should not be duplicated unnecessarily.

## Fact observations and research evidence

Use [Fact Observation, Independent Derivation and Evidence Governance](FACT-OBSERVATION-AND-EVIDENCE-GOVERNANCE.md) for material model research, factual observations, independent technical derivation, component provenance, confidentiality-aware evidence handling, and preservation requirements.

Use [Fact Observation / Research Evidence Record](templates/FACT-OBSERVATION-RECORD.md) as the starting template. Keep public or shareable summaries separate from restricted original evidence and trade secrets. The fact-observation label is not a legal safe harbor; assess the actual material, acquisition method, intended use and applicable rights.

## Baseline references

- NIST SP 800-218 SSDF Version 1.1
- OWASP ASVS Version 5.0.0
- ISO/IEC 25010:2023

External requirement identifiers must include their reference version.

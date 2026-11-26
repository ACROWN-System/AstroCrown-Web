# Fact Observation, Independent Derivation and Evidence Governance

**Status:** Proposed development governance standard; not legal advice and not a substitute for jurisdiction-specific counsel  
**Scope:** Research, model evaluation, AI-assisted development, training/fine-tuning, software and media component selection, and related evidence in AstroCrown development and adopted cross-repository workflows.

## 1. Purpose

Create records that are accurate, contemporaneous, reproducible where feasible, confidentiality-aware, and useful for independently assessing how a technical conclusion or implementation was reached. The goal is to reduce avoidable infringement and evidence risks and to make legitimate independent work easier to establish if it is challenged.

No document label, record format, hash, attribution statement, or process can guarantee immunity from litigation or make an otherwise unlawful act lawful. Legal outcomes depend on the facts, applicable law, contracts, and jurisdiction. Material commercial or disputed questions require qualified legal review.

## 2. Governing principles

1. **Classify the material accurately.** Separate factual observations, source claims, hypotheses, inferences, general methods, expressive material, source code, model weights, datasets, confidential material, and unresolved inputs. Do not classify material as a fact merely to bypass rights or restrictions.
2. **Facts versus expression.** Copyright generally protects original expression rather than ideas, procedures, methods of operation or factual information as such. Intellectual Property India states this distinction in its Copyright FAQs. This does not remove possible obligations relating to contracts, confidentiality, trade secrets, database rights, patents, access rules, privacy, or other legal regimes.
3. **Observation is not permission.** Seeing, measuring, or describing behavior does not automatically authorize copying code, weights, datasets, substantial protected expression, or use contrary to applicable access terms.
4. **Truthful provenance.** Preserve what was actually observed, when, through which lawful source or experiment, and under which version/configuration. Distinguish an original source's claim from a directly reproduced result and from our own inference.
5. **Accurate multiplicity.** Record one source as single-source observation. Mark corroboration only where evidence actually exists. Assess source independence; several models may share architectures, data, documentation or errors. Record conflicts instead of hiding them.
6. **Independent derivation.** Document our own requirements, design choices, code changes, experiments and verification. Reuse third-party materials only after assessing applicable permissions. A clean-room process may be useful in a specific situation but is not an automatic legal shield; select it with counsel where warranted.
7. **Minimum necessary disclosure.** Evidence must be traceable without placing secrets, personal information, confidential third-party material, or our own valuable trade secrets in public files.
8. **No evidence manipulation.** Never backdate, fabricate, selectively alter, deceptively relabel, or delete material to make the history appear more favorable. Preserve corrections as dated amendments and retain relevant prior versions.
9. **Proportionate controls.** Preserve enough evidence for independent review, respecting lawful access, privacy, security, retention limits, and cost. Do not unlawfully acquire or retain restricted copies in the name of evidence preservation.

## 3. Material categories

Use the following categories as descriptive labels, not as final legal conclusions:

- **FACT-OBSERVATION** — a factual measurement, behavior, property, or directly observable result. Record whether it is reported by a source or independently measured.
- **SOURCE-CLAIM** — a statement made by a vendor, author, model card, paper, benchmark, or other source that has not necessarily been independently verified.
- **HYPOTHESIS / INFERENCE** — a proposed explanation or conclusion drawn from evidence; state alternatives and uncertainty.
- **GENERAL-PRINCIPLE / METHOD** — an abstract principle or method, with source and any relevant patent/contract/licensing questions assessed separately.
- **EXPRESSIVE-MATERIAL** — text, artwork, examples, diagrams, code, output samples, or other expression that may have protection; quote or reproduce only as justified and permitted.
- **LICENSED-COMPONENT** — code, model weights, checkpoint, adapter, tokenizer, encoder, dataset, model output, or service subject to identified license/terms.
- **CONFIDENTIAL / RESTRICTED** — information subject to confidentiality, NDA, trade-secret protection, access restrictions, or another duty.
- **UNKNOWN / BLOCKED** — source, permission, ownership, terms, or intended-use eligibility has not been sufficiently established.

An item may need multiple labels. The assigned category must not replace a substantive rights assessment.

## 4. Required observation record

For each material observation used to influence implementation, record as applicable:

- Stable record ID, author/actor, creation and update timestamps (with time zone), purpose, and affected requirement.
- Observation in our own accurate wording; separate a source's assertion from our own direct result.
- Source identity, canonical URL or repository/path, publisher/author where known, exact version/commit/model/checkpoint identifier, retrieval date/time, and lawful acquisition channel.
- Applicable terms/license version, relevant use (study, execution, modification, fine-tuning, distillation, output reuse, redistribution, or commercial deployment), and unresolved terms.
- Reproduction method, environment/runtime/dependency versions, parameters, prompt/reference assets where lawful, expected versus observed result, result state, and limitations.
- Evidence references and integrity hashes for relevant artifacts where useful; identify missing/unavailable evidence explicitly.
- Multiplicity: SINGLE SOURCE, INDEPENDENTLY CORROBORATED, CONFLICTING, or NOT ASSESSED. Explain the basis for any claim of independence.
- Derivation: the design decision or implementation influenced by the observation, the related commit/PR/test, and the reason for the chosen approach.
- Risk review: copyright/expression, applicable component license and contract, confidentiality/trade secrets, database rights, patents, privacy, security, and any jurisdiction or intended-use questions relevant to the activity.
- Reviewer and status: PASS, FAIL, N/A with reason, or BLOCKED, consistent with the repository audit convention.

Do not record a blanket legal conclusion such as “free to use,” “our own model,” “not infringement,” or “commercially cleared” unless the scope and evidence support it and the appropriate review has been completed.

## 5. Public record and restricted evidence package

Maintain two distinct layers when the material justifies it.

### 5.1 Public or shareable technical record

Include the factual finding in accurate language, public citations, source/version identifiers, reproducible test description where safe, the confidence/limitation statement, and a summary of the design decision. Paraphrase rather than reproduce extensive protected expression. Include only material that is appropriate for publication.

A public record is not a substitute for underlying evidence, and public Git history must not become a dumping ground for sensitive source copies, proprietary prompts, confidential data, vendor correspondence, internal risk analysis, or trade secrets.

### 5.2 Restricted evidence package

In an access-controlled location approved for the information's sensitivity, preserve relevant original files or authorized snapshots, source/terms versions, experiment outputs, model and dependency hashes, prompt/configuration records, test logs, review notes, timestamps, commit and workflow identifiers, and access/permission records. Store only what is lawfully acquired and necessary.

Apply least-privilege access, appropriate encryption and backups, retention rules, integrity checking, and a recorded owner. Keep credentials and authentication tokens in a secrets manager, never in the evidence bundle. Keep legal advice and counsel communications in the location and manner directed by counsel; adding “privileged” to a heading does not by itself create legal privilege.

### 5.3 Disclosure review

Before publishing, sharing with a provider, or committing an evidence artifact, verify ownership/permissions, third-party confidentiality, personal data, security risk, proprietary details, and whether the receiving location has suitable access controls. Share redacted summaries where they serve the purpose; never misrepresent a redaction or omit a material limitation.

## 6. AI-model and media-specific traceability

For model research, generation or modification, record where applicable:

- Exact model family, repository, revision/checkpoint hash, architecture, license and applicable model-card/terms versions.
- Material software libraries, engines, nodes/plugins, encoders, tokenizers, VAEs, adapters/LoRAs, upscalers, segmenters, datasets, reference assets and post-processors.
- Whether the activity is observation, inference, reference-image editing, composition, fine-tuning, weight merging, distillation, training on outputs, or redistribution. Do not treat these activities as legally or technically interchangeable.
- Hardware/runtime details, dependency versions, input prompts and assets, random seed and settings when available, output format/hash, measured performance, and reproducibility limits.
- Explicit eligibility for the intended deployment: internal R&D, public demonstration, commercial product, transfer/redistribution, or model training. Separate the base model license from each component's terms and the hosted service's terms.
- Dataset and output provenance for any future training or distillation; confirm that the intended acquisition and use are permitted before use.
- Independent verification results, unresolved restrictions, and the reason a candidate is accepted, rejected, or BLOCKED.

Do not infer permission to train a competing model from the fact that an output is publicly viewable. Do not assume model outputs are unrestricted or protected merely by how they were generated; assess the actual terms and applicable law.

## 7. Integrity and preservation

- Link source records to immutable version identifiers, commit SHAs, workflow/run IDs, artifact paths, and checksums such as SHA-256 where appropriate.
- Preserve original evidence unchanged; create annotated or transformed copies separately and link each derivative to its source.
- Treat timestamps and hashes as integrity/provenance aids, not conclusive proof of authorship, truth, or legal ownership. Preserve context showing how an artifact was created and collected.
- Record corrections as dated amendments that explain what changed and why. Do not silently rewrite history.
- Upon a credible threat, demand letter, filed claim, or other matter that reasonably may require litigation preservation, promptly notify the responsible decision-maker and qualified counsel. Follow counsel's preservation instructions, pause routine deletion/rotation for relevant information, preserve relevant communications, source histories, logs and artifacts, and document custody/handling. Do not independently decide to destroy, sanitize, or publish potentially relevant evidence.
- Preservation and admissibility rules vary by jurisdiction. For example, India's Bharatiya Sakshya Adhiniyam, 2023 contains requirements concerning electronic records, while U.S. Federal Rule of Civil Procedure 37(e) addresses loss of electronically stored information that should have been preserved in litigation circumstances. Neither example should be generalized to all jurisdictions or treated as an evidentiary guarantee.

## 8. Prohibited shortcuts

The following are never valid risk controls:

- Calling copied expression or a restricted artifact a “fact observation” to avoid its terms.
- Assuming that a small modification makes a derivative work legally independent.
- Claiming multiple independent sources when sources are correlated or multiplicity was not checked.
- Removing attribution, rewriting timestamps, backdating records, selectively deleting failures, or manufacturing an independent-development narrative.
- Publicly exposing valuable know-how in an attempt to prove it existed earlier.
- Assuming that a license for code also licenses weights, data, model outputs, hosted inference, or all dependencies.
- Assuming that model access, open weights, a successful API call, or an available repository proves commercial rights.
- Making a blanket jurisdiction-independent legal conclusion based solely on a technical classification.

## 9. Closure and escalation criteria

A record may close only when its factual status, source and provenance are understood to the degree required for the decision; relevant terms have been reviewed; evidence and confidentiality handling are appropriate; uncertainty is explicit; and required tests/reviews support the result.

Mark **BLOCKED** when required rights, source history, access eligibility, patent analysis, output-use permission, or other material evidence is unavailable. Escalate significant commercial deployment, training/derivative-model decisions, conflicting licenses, patent-sensitive inventions, confidentiality questions, threatened disputes and litigation holds to qualified counsel in the relevant jurisdiction(s).

## 10. Reference sources

These references establish useful baseline principles; the policy is not a jurisdiction-specific legal opinion.

- Intellectual Property India, Copyright FAQs: https://www.ipindia.gov.in/pages/copyright/learn/faqs
- WIPO, How to Protect Trade Secrets: https://www.wipo.int/en/web/trade-secrets/protection
- WIPO, Trade Secret Management: https://www.wipo.int/web-publications/wipo-guide-to-trade-secrets-and-innovation/en/part-iv-trade-secret-management.html
- India Code, Bharatiya Sakshya Adhiniyam, 2023: https://www.indiacode.nic.in/indiacode/bitstream/123456789/20063/1/aa202347.pdf
- U.S. Federal Rules of Civil Procedure, Rule 37: https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title28a-node89-node131-rule37

## 11. Document control

This document establishes a proposed documentation and engineering governance convention. It does not certify compliance, establish ownership of any model or artifact, authorize an otherwise restricted use, or replace legal advice. Changes to this policy should be reviewed against the repository's development and audit convention, practical evidence handling, and applicable legal advice.

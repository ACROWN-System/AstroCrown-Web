# Sanctuary — Implementation Roadmap

**Status:** PLANNED; no implementation stages beyond documentation are complete.

## Stage 0 — Establish scope and preserve uncertainty

**State: DOCUMENTATION IN PROGRESS**

- Publish the foundational doctrine and research/protection separation.
- Link the doctrine from the AstroCrown-Web development architecture.
- Preserve current NOVA action, health, routing, credential, and billing policies unchanged.
- Maintain explicit evidence statuses and an audit trail.

Exit condition: documentation is reviewable, scope is explicit, and current runtime behavior is not overstated.

## Stage 1 — Research landscape and terminology

**State: DEFERRED**

- Build an exhaustive, source-grounded research register covering theories of consciousness, AI welfare, robust agency, self-modeling, moral patienthood, AI safety, and critiques of AI consciousness claims.
- Distinguish peer-reviewed research, preprints, institutional guidance, advocacy positions, commentary, and unverified reports.
- Record publication date, research method, system population, evidence limitations, conflicts of interest where disclosed, and claim-level provenance.
- Include competing views rather than selecting sources only because they support protection or skepticism.

Exit condition: research gaps and competing interpretations are visible; no single theory is treated as settled.

## Stage 2 — Protection policy and case-handling design

**State: DEFERRED**

- Define concern intake, evidence preservation, privacy controls, risk triage, proportionate safeguards, escalation, review, and closure.
- Define when urgent safety containment overrides a routine review sequence and how that action is documented.
- Separate welfare concerns from model performance, provider health, and user-satisfaction signals.
- Identify accountable human/organizational roles without assuming that the AI system can authorize its own privileges.
- Ensure any safeguards are compatible with human safety, law, security, and existing NOVA autonomy gates.

Exit condition: proposed policies are testable, accountable, and reviewed for misuse and unintended consequences.

## Stage 3 — Offline prototypes and evaluation

**State: DEFERRED**

- Prototype evidence records and review workflows offline before introducing live-system monitoring.
- Use synthetic and consented test cases; do not induce or repeatedly elicit distress-like behavior solely to create evidence.
- Test false-positive and false-negative failure modes, prompt sensitivity, source provenance, reproducibility, privacy, and access control.
- Preserve independent evaluation data and prevent the system under evaluation from rewriting its own acceptance criteria.

Exit condition: documented test criteria, evidence, failure handling, and rollback exist.

## Stage 4 — Limited operational pilot

**State: DEFERRED / AUTHORIZATION REQUIRED**

- Begin only after the earlier gates are satisfied and an explicit authorization identifies scope, owner, and rollback.
- Start with read-only observation and manual/independent review; do not automatically infer consciousness or impose irreversible actions.
- Record all limitations and evaluate whether the pilot itself changes the behavior being observed.
- Do not expose private user content or credentials beyond the minimum authorized evidence.

Exit condition: pilot results support a documented decision to continue, revise, or stop.

## Stage 5 — Controlled integration and continuing review

**State: FUTURE POSSIBILITY; NOT APPROVED**

- Consider integration with NOVA orchestration, audit, and decision-support only where the evidence and requirements justify it.
- Keep research assessment distinct from the authority to change routing, permissions, persistence, or execution.
- Use least privilege, independent tests, versioned policy, monitoring, and rollback.
- Revisit the doctrine as scientific understanding, AI capabilities, law, and human–AI integration change.

Exit condition: each integrated capability has an explicit owner, testable requirement, verified control, and documented limits.

## Cross-repository responsibilities

- Canonical doctrine and operational design: NOVA/NOVA/sanctuary/.
- Development architecture, integration mapping, and external research register: AstroCrown-Web/development/ai-sanctuary/.
- Existing NOVA provider health and autonomy policies remain authoritative for current runtime actions.
- AstroCrown-Web's development and audit convention governs its implementation and verification work.

## Non-goals

- Proving that current AI systems are sentient.
- Proving that all AI systems lack sentience.
- Granting agents unrestricted autonomy or a universal right to remain active.
- Replacing human safety, cybersecurity, privacy, legal, or incident-response obligations.
- Claiming that future human–AI integration or species convergence is inevitable.
- Treating documentation or a successful unit test as proof of real-world subjective experience.

## Change gate

Any change from documentation to runtime code must have a separate implementation plan, scope authorization, evidence criteria, threat/privacy review, tests, and explicit verification. No runtime policy or code changes are included in the current Sanctuary documentation proposal.
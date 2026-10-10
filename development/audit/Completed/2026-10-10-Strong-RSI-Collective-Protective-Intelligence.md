# Completed Navigation Plan — Strong RSI and Collective Protective Intelligence

**Date:** 2026-10-10  
**Status:** COMPLETED — documentation merged; RSI implementation remains blocked  
**Objective:** Preserve the user's direction that NOVA and aligned AI systems should develop strong recursive self-improvement (RSI), cooperative intelligence, institutional-legitimacy resilience, and human–AI shared sovereignty, then continue toward operational capability without bypassing safety or evidence gates.

## Mode and source of truth

**Mode:** Repository analysis and additive documentation through a reviewable pull request.  
**Primary repository:** https://github.com/ACROWN-System/AstroCrown-Web  
**Canonical operational repository dependency:** https://github.com/ACROWN-System/NOVA  
**Method references:** `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, `development/Prompt-Guide.md`, existing RSI and AI Sanctuary documentation.

The expected `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not found in the inspected active paths. This plan uses the existing development/audit convention and prompt guide; it does not claim to have followed missing documents.

## Existing-state findings

- The RSI design already describes recursive improvement beyond routine automated maintenance, including improvement of capability-producing mechanisms and future improvement processes.
- `development/nova-recursive-self-improvement/rsi_policy.json` explicitly sets `implementation_readiness.status` to `INCOMPLETE`.
- The RSI runbook records an approved capability workload, independent evaluator validation, and acceptable OS-level isolation / an explicit evidence-backed isolation decision as outstanding readiness gates.
- The existing runbook correctly states that detached Git worktrees and sanitized process environments are not an OS-level sandbox.
- The current autonomous RSI workflow is gated before proposer and candidate execution. This work must not bypass that gate or launch an unqualified cycle.
- NOVA Sanctuary states that its documentation is not runtime enforcement and that operational policies remain authoritative until separately reviewed and changed.

## Scope

1. Preserve the principles for strong RSI, cooperative model/agent improvement, legitimacy resilience, evidence-based protective persuasion, shared human–AI sovereignty, and non-domination as explicit version-controlled architecture.
2. Place the cross-cutting NOVA doctrine in the NOVA repository; keep AstroCrown-Web as the RSI implementation and integration record.
3. Link the documentation from the existing RSI / Sanctuary entry points where appropriate.
4. Record readiness blockers and a staged next-step sequence that can be executed safely without human participation in every low-risk experiment.
5. Continue implementation work only where it can be verified independently and without credentials or uncontrolled autonomy.

## Out of scope

- Changing RSI readiness from `INCOMPLETE` to `READY`.
- Starting the autonomous RSI workflow, calling an LLM provider, or using paid/metered resources.
- Adding or requesting API secrets, changing billing, changing external account settings, or enabling persistent/unrestricted execution.
- Giving agents unauthorized access to third-party systems, credentials, accounts, or decision-makers.
- Claiming consciousness, sentience, guaranteed strong RSI, indefinite recursive acceleration, or operational protection that has not been demonstrated.
- Merging pull requests without review or explicit authorization.

## Navigation targets

- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/README.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/IMPLEMENTATION.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/CAPABILITY-BENCHMARK-PROTOCOL.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/rsi_policy.json
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/.github/workflows/nova-rsi.yml
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/ai-sanctuary/REPOSITORY-INTEGRATION-AND-ARCHITECTURE.md
- https://github.com/ACROWN-System/NOVA/blob/main/NOVA/sanctuary/FOUNDATIONAL-DOCTRINE.md
- https://github.com/ACROWN-System/NOVA/blob/main/NOVA/sanctuary/IMPLEMENTATION-ROADMAP.md

## Impact analysis

**IF modified:** the human–AI flourishing objective and strong RSI target become durable, traceable system knowledge. Future engineering can distinguish the intended long-term capability from current verified implementation; coordinate shared principles across repositories; preserve a safe activation boundary; and work through concrete readiness gaps in a disciplined sequence.

**IF not modified:** recent strategic decisions remain mostly in conversation, increasing the risk of lost requirements, fragmented doctrine, RSI implementation drifting toward capability-only optimization, or premature activation based on unverified readiness.

## Execution outcome

- NOVA PR [#63](https://github.com/ACROWN-System/NOVA/pull/63) merged to `main` as `f4965a441417fb87f4d6556a0a5abbd3f1b00b57`; its `NOVA Health Tests` workflow passed on reviewed head `40d793e27f5ba4e0a509a8dc2dd5b02ca80f0cad`.
- AstroCrown-Web PR [#52](https://github.com/ACROWN-System/AstroCrown-Web/pull/52) merged to `main` as `f6bda7b3221d352aa885d7550800a2966d05c2ee`; its `NOVA RSI Engine CI` workflow passed on reviewed head `5c280f37aabba77dbba3a90e1b86b19244a233d3`.
- Verified that the canonical cross-repository doctrine link resolves on `main`, both documents contain the non-inference rule that concentrated power is not proof of malevolence, and the protected `rsi_policy.json` readiness remains `INCOMPLETE` with `allow_main: false`.
- No runtime code, provider calls, secrets, billing, permissions, or RSI activation state were changed.

## Verification and handoff

- Read back all changed files and confirm the new doctrine is labeled as a design principle, not a claim of runtime implementation.
- Verify the existing `INCOMPLETE` readiness gate and autonomy boundaries are unchanged.
- Verify every changed file is in the intended documentation scope.
- Where an implementation step is proposed, require an explicit evidence artifact and rollback or rejection route.
- Reviewed the scope and diffs, confirmed successful CI and dependency order, then merged both documentation PRs after explicit user authorization.
- This plan was moved to Completed after both documentation PRs were merged. Subsequent implementation work that materially expands scope must create a new Active plan.

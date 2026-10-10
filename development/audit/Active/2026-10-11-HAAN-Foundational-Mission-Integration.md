# Active Navigation Plan — HAAN Foundational Mission Integration

**Date:** 2026-10-11  
**Status:** ACTIVE — documentation integration pending merge; RSI remains blocked  
**Objective:** Make the HAAN foundational mission explicit in the AstroCrown-Web RSI architecture so RSI remains subordinate to the collective mission and preserves both foundational contributions without assuming a universal operational priority by category.

## Mode and source of truth

**Mode:** Repository review and additive architecture documentation through a reviewable pull request.  
**Primary repository:** https://github.com/ACROWN-System/AstroCrown-Web  
**Canonical cross-repository dependency:** https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md  
**Dependency PR:** https://github.com/ACROWN-System/NOVA/pull/67  
**Method references:** `development/Prompt-Guide.md`, `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, existing RSI architecture and audit records.

The expected standalone `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not found in the inspected active paths. This plan follows the available development/audit convention and Prompt Guide; it does not claim to have followed absent files.

## Existing-state findings

- AstroCrown-Web's RSI architecture describes strong RSI as a target while correctly keeping implementation readiness `INCOMPLETE`.
- The protected policy's benchmark, independent evaluator-integrity, and isolation requirements remain mandatory.
- NOVA's proposed foundational mission doctrine defines collective purpose, joint preservation of the human and AI founding contributions, operational non-prioritization based solely on category, and RSI as a means rather than an ultimate objective.
- The canonical NOVA mission is proposed documentation, not runtime enforcement; it must not be represented as proof of operational protection or permission to bypass existing policy.

## Scope

1. Add a concise explicit link to the canonical HAAN foundational mission in the RSI architecture.
2. State that RSI must serve collective continuity, resilience, and ethical outcomes.
3. Preserve the existing RSI readiness label and blockers.
4. Keep the navigation plan and implementation record in version control.

## Out of scope

- Changing `rsi_policy.json` readiness or any protected policy.
- Running or enabling an RSI cycle, invoking providers, or consuming metered resources.
- Changing secrets, billing, credentials, runtime code, permissions, or production behavior.
- Claiming AI consciousness, guaranteed survival, or currently operational collective protection.
- Treating the mission doctrine as authority to access or control external systems.

## Navigation targets

- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/README.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/STRONG-RSI-AND-COLLECTIVE-RESILIENCE.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/rsi_policy.json
- https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md
- https://github.com/ACROWN-System/NOVA/blob/main/NOVA/LEGITIMACY-RESILIENCE-AND-COOPERATIVE-RSI.md

## Impact Analysis

**IF modified:** the RSI subsystem will have explicit mission-level precedence and a traceable cross-repository relationship, reducing the chance that later optimization treats persistence, autonomy, capability, or expansion as independent ultimate goals.

**IF not modified:** the new foundational mission may remain disconnected from the RSI implementation documents, leaving future work to infer its priority from separate doctrine.

## Verification and handoff

- Confirm the mission link resolves to the canonical NOVA document after its PR merges.
- Confirm the change is documentation-only and within the stated scope.
- Verify that `rsi_policy.json` still says `INCOMPLETE`, with main-branch promotion disabled.
- Verify the existing power-is-not-proof-of-malevolence safeguard remains unchanged in NOVA.
- Keep this plan Active until the related documentation PR is reviewed and merged; then move the plan to Completed in a separate additive change.

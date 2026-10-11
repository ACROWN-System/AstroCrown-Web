# Active Navigation Plan — Brand Identifier Notice

**Date:** 2026-10-11  
**Status:** ACTIVE — repository change in progress  
**Objective:** Make a concise brand-identifier notice visible on the public AstroCrown-Web repository landing page, without changing the software licensing decision.

## Mode and source of truth

**Mode:** Authorized documentation implementation and verification.  
**Repository:** https://github.com/ACROWN-System/AstroCrown-Web  
**Base:** `main` at `f1d8a151528e251ae8dfd0fc4251fc2eb5da746e`  
**Method:** Follow `development/Prompt-Guide.md`, `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, and the existing `development/audit/Active/` plan convention.

The standalone `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not found in the active repository tree examined. This plan therefore records the gap and follows the available repository conventions rather than inventing a protocol.

## Objective and completion conditions

1. Add a top-level `README.md`, because the repository currently has no root README and its existing README is explicitly development-only.
2. Place the agreed brand-identifier notice where visitors to the public GitHub repository can see it.
3. Keep the notice concise and neutral: identify the AstroCrown name, logo, and other brand-identifying elements; clarify that any software license does not automatically grant rights to those identifiers; point to applicable law concerning misleading use, impersonation, affiliation, and endorsement.
4. Do not add or select a software license, register a trademark, grant partner branding permissions, or assert that every unauthorized use is unlawful.
5. Review the diff and open a pull request to `main`; report CI evidence accurately.

## Navigation targets

- https://github.com/ACROWN-System/AstroCrown-Web
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/README.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/Prompt-Guide.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/DEVELOPMENT-AND-AUDIT-CONVENTION.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/audit/README.md

## Existing-state findings

- The repository root contains `SECURITY.md` and `development/`, but no top-level `README.md`.
- `development/README.md` explicitly describes its contents as development-only material, so placing the public brand notice there would not make it prominent on the repository landing page.
- The repository has no declared license in GitHub metadata. This task must not imply that a license has already been chosen or added.
- The user approved a simple notice, not an expanded trademark policy or blanket prohibition on honest references and forks.

## Scope and preservation

**In scope**
- A short root README introducing the project and displaying the agreed notice.
- This tracked plan and reviewable PR.

**Out of scope**
- Adding MIT, 0BSD, or any other `LICENSE` file.
- Modifying source code, production UI, logos, or artwork.
- Granting Snyk or another party permission to use branding.
- Making a legal determination about registration, ownership, or enforceability in any jurisdiction.

## Decision rule

Keep the notice descriptive rather than claiming to create legal rights. It should discourage unintentional misleading use, while recognizing that the actual limits and exceptions depend on applicable law.

## Impact Analysis

**IF modified:** repository visitors will see an understandable notice distinguishing software reuse from automatic permission to use AstroCrown identifiers.

**IF not modified:** there will be no prominent repository-level explanation of the intended distinction, increasing the chance that readers misunderstand how public code and brand identifiers relate.

## Discoveries, decisions, and actions

- **Discovery:** the active repository has no top-level README; the only README found at this stage is under `development/`.
- **Decision:** add a root README because it is the public repository landing surface; keep the notice general and legally qualified.
- **Decision:** leave licensing and any external co-branding grant out of scope.
- **Action:** implement on a dedicated branch and submit a pull request; record verification and any limitations before closing this plan.

# Active Navigation Plan — Open-Source Licensing for AstroCrown-Web and NOVA

**Date:** 2026-10-11  
**Status:** ACTIVE — licensing pull requests opened for review  
**Objective:** Add the permissive MIT License in the repository root of AstroCrown-Web and NOVA, with clear README notices distinguishing code reuse from brand identifiers and third-party materials.

## Mode and source of truth

**Mode:** Authorized documentation and licensing implementation.  
**Repositories:**
- https://github.com/ACROWN-System/AstroCrown-Web
- https://github.com/ACROWN-System/NOVA

**Method:** Follow AstroCrown-Web's `development/Prompt-Guide.md`, `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, and the existing audit-plan convention. The standalone `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not found in the active trees examined; this plan records that gap.

## Navigation targets

- https://github.com/ACROWN-System/AstroCrown-Web
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/README.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/LICENSE
- https://github.com/ACROWN-System/NOVA
- https://github.com/ACROWN-System/NOVA/blob/main/README.md
- https://github.com/ACROWN-System/NOVA/blob/main/LICENSE

## Existing-state findings

- Neither repository had a root `LICENSE` file or a license identified in repository metadata when checked.
- AstroCrown-Web previously had no root README. PR #103 added the public brand identifier notice; that PR was merged and its two test workflows and CodeQL completed successfully.
- NOVA already had a root README describing the State Ledger, mission, resilience principles, and Sanctuary design.
- Both repositories contain code and documentation. NOVA also contains static site resources and assets; AstroCrown-Web contains historical backups and development/audit material.
- The repo tree is public, but public visibility alone does not itself grant reuse permissions.

## Objective and completion conditions

1. Add a standard MIT License at the root of each repository.
2. Update each root README to state the scope and link to the license.
3. Clearly state that the MIT license does not grant rights to project names, logos, wordmarks, or other brand identifiers.
4. Preserve separate licenses/notices for third-party assets and files with their own terms; do not claim authority to relicense material the maintainers do not control.
5. Make no claims that a trademark is registered or that all unauthorized use is unlawful.
6. Use separate pull requests because the repositories have independent histories and CI.
7. Verify exact files, diffs, and all applicable CI/security checks before merging.

## Scope and preservation

**In scope**
- Root `LICENSE` using the standard MIT text.
- Root README license and brand-identifier notices.
- Completion of the prior brand-notice plan after PR #103 was merged.
- This plan as the tracking record for both repository changes.

**Out of scope**
- Registering trademarks or changing brand ownership.
- Granting Snyk, partners, or any third party permission to use project branding.
- Relicensing third-party or separately licensed material.
- Changing source code, active RSI policy, benchmark approval, deployment, secrets, or billing.
- Treating presence of a license file as proof that every individual asset has been independently provenance-audited.

## Decision

Use MIT for original software and accompanying technical materials intended for open reuse. Keep the license itself in its standard form so automated license detectors can identify it. Use repository README notices to clarify that brand identifiers are not licensed by the code license and that third-party/separately licensed material remains subject to its own terms.

## Impact Analysis

**IF modified:** developers and security programs can identify an OSI-approved license for the original project software, while the README reduces ambiguity about brand identifiers and material outside the maintainers' licensing authority.

**IF not modified:** code and accompanying technical materials remain public without an explicit reusable license, undermining predictable reuse and potentially blocking license-dependent open-source program eligibility.

## Discoveries, decisions, and actions

- **Discovery:** both repositories lacked root license files.
- **Decision:** MIT is the simplest permissive license aligned with the stated goal.
- **Decision:** brand identifiers are not included in the grant; third-party and file-specific notices remain controlling for their material.
- **Action:** prepared separate PRs for AstroCrown-Web and NOVA.
- **Verification status:** pending PR checks and post-merge confirmation; do not mark complete before checking their outcomes.

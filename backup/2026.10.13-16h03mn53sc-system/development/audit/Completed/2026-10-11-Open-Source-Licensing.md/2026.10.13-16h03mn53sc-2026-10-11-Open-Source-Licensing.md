# Completed Navigation Plan — Open-Source Licensing for AstroCrown-Web and NOVA

**Date:** 2026-10-11  
**Status:** COMPLETED — MIT licenses merged and GitHub recognized both repositories as MIT  
**Objective:** Add a permissive, OSI-approved MIT License at the root of AstroCrown-Web and NOVA, while distinguishing reusable software from brand identifiers and third-party materials.

## Mode and source of truth

**Mode:** Authorized documentation and licensing implementation with post-merge verification.  
**Repositories:**
- https://github.com/ACROWN-System/AstroCrown-Web
- https://github.com/ACROWN-System/NOVA

The standalone `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not found in the active AstroCrown-Web tree examined. This plan followed the available Prompt Guide, Development and Audit Convention, and existing audit-plan structure.

## Navigation targets and merged changes

- AstroCrown-Web root license: https://github.com/ACROWN-System/AstroCrown-Web/blob/main/LICENSE
- AstroCrown-Web README: https://github.com/ACROWN-System/AstroCrown-Web/blob/main/README.md
- NOVA root license: https://github.com/ACROWN-System/NOVA/blob/main/LICENSE
- NOVA README: https://github.com/ACROWN-System/NOVA/blob/main/README.md
- AstroCrown-Web licensing PR [#104](https://github.com/ACROWN-System/AstroCrown-Web/pull/104) merged as `aaea92b5a7232686ce4f3c00ede9ead0609c2f72`.
- NOVA licensing PR [#70](https://github.com/ACROWN-System/NOVA/pull/70) merged as `6406733afbde9185865d0c5d4c6aeed6490f8ef2`.
- Preceding brand-notice PR [#103](https://github.com/ACROWN-System/AstroCrown-Web/pull/103) merged as `1c990bfc8040af85174f8b632ec351eec4c76c89`.

## Implementation

- Added the standard MIT License text to the root of each repository.
- Updated each root README to link to the license and state that the license does not grant rights to the AstroCrown, NOVA, or HAAN name/logo/brand identifiers.
- Preserved separate file-specific licenses/notices and noted that third-party assets or materials not licensed by the maintainers are not relicensed.
- Moved the brand-notice plan to `development/audit/Completed/`.
- No source code, runtime behavior, provider credentials, deployment settings, billing, or RSI readiness/benchmark/promotion policy was changed.

## Verification

- Post-merge GitHub repository metadata reports `MIT License` and SPDX identifier `MIT` for both repositories.
- The exact root LICENSE text and README license/brand sections were fetched from each repository's `main` branch and verified.
- AstroCrown-Web PR #104: both `test` check runs passed; CodeQL checks passed.
- NOVA PR #70: no check runs were attached because existing health-test workflow path filters target `NOVA/**` and selected heartbeat workflow files, not root-only README/LICENSE modifications. This is reported as not triggered, not as a test pass. No source-code paths were changed by PR #70.
- AstroCrown-Web PR #103 branding-notice checks passed before merge.
- GitHub branch-protection details could not be read through the connected integration; licensing changes were therefore submitted and merged through pull requests.

## Decision

MIT was selected as the practical permissive license for original software and accompanying technical documentation. The standard license text was kept unmodified for compatibility with license recognition. Repository README notices make the intended distinction around brand identifiers explicit and preserve the effect of separate third-party/file-specific terms.

## Impact Analysis

**IF modified:** developers have explicit permission to reuse and adapt the original project software under MIT; repositories now expose a recognized OSI-approved license; brand identifiers and third-party materials remain called out separately.

**IF not modified:** the public repositories would remain without explicit reuse terms, leaving community reuse and licensing-dependent security-program eligibility unnecessarily unclear.

## Closure

Both root MIT licenses are merged and recognized by GitHub. README notices are present on `main`, and the licensing implementation is complete. No Snyk branding permission or trademark registration was granted or claimed.

# Development Security Baseline Audit

## Scope

Development environment baseline for `ACROWN-System/AstroCrown-Web`.

## Verification Time

2026-09-20T18:36:44+05:30

Time standard: India Standard Time (IST)

## Results

| ID | Result | Evidence |
|---|---|---|
| SEC-001 Repository Visibility | PASS | Repository metadata reports public visibility. |
| SEC-002 Repository Write Permissions | PASS | Repository metadata reports admin/maintain/push permissions for the active connection. |
| SEC-003 Branch Protection / Rules | PASS | Repository ruleset `Protect main` (ID `23728412`) is active and targets the default branch. Verified rules: restrict deletions, block non-fast-forward/force pushes, require a pull request, require conversation resolution, with 0 required approvals and merge/squash/rebase allowed. |
| SEC-004 Authentication / MFA | BLOCKED | Account MFA state is outside the repository evidence available to this audit. |
| SEC-005 Secret Exposure | BLOCKED | No secrets were identified in the reviewed development artifacts, but a comprehensive repository secret scan has not been verified. |
| SEC-006 GitHub Actions Exposure | PASS | `.github/workflows` is absent; no workflow files are currently present. |
| SEC-007 Dependency Exposure | PASS | Current development foundation has no package/dependency evidence. |
| SEC-008 Backup Exposure | BLOCKED | Backups exist and are repository-visible. Whether this exposure is acceptable requires an explicit security decision for the backup contents. |
| SEC-009 Development/Public Boundary | PASS | `development/` is separated from the root/public website. |
| SEC-010 Unauthorized Modification | PASS | Operational test attempted a direct file creation on `main`; GitHub rejected it with HTTP 409 and `Repository rule violations found — Changes must be made through a pull request.` No test file was created. |
| SEC-011 Supply-Chain Risk | PASS | No third-party dependencies or GitHub Actions are currently identified in the development foundation. |
| SEC-012 Developer-Machine Boundary | BLOCKED | Developer-machine security cannot be established from repository evidence. |
| SEC-013 Future Web Attack Surface | N/A | Current development foundation is minimal HTML and does not yet contain the future application attack surface. |
| SEC-014 Logging/Evidence | PASS | Audit records and test definitions exist in `development/audit/`. |
| SEC-015 Recovery After Compromise | PASS | Versioned backup structure and recovery-oriented backup copies exist. |

## Overall Status

BLOCKED

## Closure Conditions

The baseline cannot be declared complete until:

2. Account MFA is verified.
3. A comprehensive secret-exposure check is completed, with evidence recorded.
4. Backup visibility/exposure is explicitly reviewed and accepted or remediated.
5. Developer-machine security controls are verified or the boundary is explicitly documented as an external prerequisite.

## Current Limitation

Repository configuration that requires account-level GitHub security settings cannot be completed through the currently available repository connector actions. No repository code change should be used as a substitute for those controls.

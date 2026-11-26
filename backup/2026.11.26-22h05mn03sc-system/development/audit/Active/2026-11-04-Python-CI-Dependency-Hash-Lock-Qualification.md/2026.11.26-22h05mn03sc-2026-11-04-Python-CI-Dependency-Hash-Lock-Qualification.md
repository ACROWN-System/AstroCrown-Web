# Active Navigation Plan — Python CI Dependency Hash-Lock Qualification

**Date:** 2026-11-04  
**Status:** **TWO CI INSTALL PATHS CONVERTED TO HASH-VERIFIED, WHEEL-ONLY LOCKS; ARTIFACT INSTALLATION QUALIFIED; DEFAULT-BRANCH SCORECARD RE-SCAN PENDING**  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Working branch:** `docs/provider-independent-wallet-auth-plan-2026-10-20`  
**Related PR:** [#141 — Passkey-first account foundation; optional wallet backup (draft)](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)

## 1. Objective and findings

Remediate the two OpenSSF Scorecard `Pinned-Dependencies` findings which reported `pipCommand not pinned by hash` in:
- `.github/workflows/account-continuity-prototype-tests.yml`
- `.github/workflows/wallet-auth-prototype-tests.yml`

The previous source requirement files pinned exact package versions but did not specify artifact hashes. Scorecard's guidance distinguishes version pinning from hash pinning and recommends hashes to protect against altered/replaced distribution artifacts. pip's secure-install guidance requires every requirement and dependency to be pinned and hashed when hash-checking mode is enabled.

This block adds a hash-locked install path while retaining the source version lists. It does not change the selected library versions or the account/wallet implementation.

References:
- OpenSSF Scorecard Pinned-Dependencies: https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- OpenSSF Scorecard FAQ — hash pinning versus version pinning: https://github.com/ossf/scorecard/blob/main/docs/faq.md
- pip secure installs / hash-checking mode: https://pip.pypa.io/en/stable/topics/secure-installs/
- pip install `--require-hashes`: https://pip.pypa.io/en/stable/cli/pip_install/

## 2. Source requirements and committed locks

The original files remain the human-reviewed source of exact package/version pins:
- `development/auth-prototype/requirements.txt`
- `development/account-continuity/prototype/requirements.txt`

Added platform-specific wheel locks:
- `development/dependencies/requirements-wallet-auth-py312-ubuntu24-x86_64.lock` — **41 package pins, each with a SHA-256 hash**.
- `development/dependencies/requirements-account-continuity-py312-ubuntu24-x86_64.lock` — **49 package pins, each with a SHA-256 hash**; it covers the combined auth-prototype and passkey-account dependency lists.

The lockfiles contain the SHA-256 digests of the exact wheel files downloaded for the supported CI target. They were regenerated using `pip download --no-cache-dir --only-binary=:all: --no-deps` on a GitHub-hosted Ubuntu 24.04 / CPython 3.12 x86_64 runner. Fresh uncached downloads produced hashes identical to the committed locks for every package. No source distribution was accepted by the bootstrap process.

**Platform scope is intentional:** the lockfiles are for CPython 3.12 on Ubuntu 24.04 x86_64. They are not universal Windows, macOS, ARM or alternate-Python locks. If the CI runner OS, CPU architecture or Python ABI changes, regenerate and review the appropriate lock before changing the runner.

## 3. Drift prevention

Added the standard-library-only checker:
- `development/dependencies/verify_ci_dependency_locks.py`

It canonicalizes package names, checks that source and lock package/version sets match exactly, rejects duplicates and unpinned entries, and requires a SHA-256 digest for every locked package. It supports `wallet`, `account` and `all` scopes.

The checker does not calculate or validate the downloaded artifact bytes. pip performs the artifact verification during installation via `--require-hashes`. This separation is deliberate: the script detects package-list/version drift; pip validates wheel integrity.

## 4. Workflow changes

Both permanent CI workflows now:
1. Use `ubuntu-24.04`, matching the locked wheel target.
2. Verify source requirement pins against the appropriate lock with `verify_ci_dependency_locks.py`.
3. Install from the checked-in lock using both `--require-hashes` and `--only-binary=:all:`.
4. Trigger when `development/dependencies/**` changes, so lock updates rerun the relevant workflows.

The wallet workflow uses the 41-package wallet lock. The account workflow uses the 49-package combined lock. The source `requirements.txt` files remain the authoritative package/version lists; the hash locks provide the platform-specific artifact integrity layer for CI.

No new runtime package, external action, paid provider, credential, secret, email service, deployment or production dependency was added.

## 5. Verification evidence

### Fresh artifact hash regeneration

[Temporary Python Dependency Hash Bootstrap — run 6](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41705124059) completed successfully on a GitHub-hosted Ubuntu 24.04 / Python 3.12 runner. The job bypassed pip's cache, downloaded wheels only, and computed SHA-256 from the downloaded file bytes. All 41 wallet-lock hashes and all 49 account-lock hashes matched the committed files.

The bootstrap workflow was temporary and has been removed from the branch.

### Hash-verified package installation

[Local Wallet Authentication Prototype Tests — run 531](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41705620853) completed successfully on code/test head `ecddd68988c11f75a43bf5284fb86da6cfbac96f`.

The job:
- Matched the wallet source requirements to all 41 wallet lock entries.
- Installed all 41 packages with `--require-hashes --only-binary=:all:`.
- Matched the combined account source requirements to all 49 account lock entries.
- Force-reinstalled the complete 49-package combined account lock with `--require-hashes --only-binary=:all:`. pip reported successful installation of all packages, including `webauthn==3.0.1`, `cryptography==50.0.2`, `siwe==4.4.0` and their pinned dependencies.
- Completed Python compilation, browser JavaScript syntax checks, all 17 wallet authentication unit/HTTP tests, the headless-browser wallet journey and the static no-transaction/no-relay guard.

The temporary combined-lock force-reinstall step was removed from the permanent wallet workflow after this validation. The permanent workflow retains only its intended 41-package wallet lock install.

### Consistency comparison

An independent repository-content comparison also confirmed:
- 41/41 source wallet package/version pins match the wallet lock.
- 49/49 combined account package/version pins match the account lock.
- Every lock entry has one valid 64-hex-character SHA-256 digest.
- No package versions changed between source requirements and locks.

## 6. Scorecard alert status

The two PR review threads that originally reported `pipCommand not pinned by hash` are not being manually closed on the strength of this local remediation alone.

The repository's official `scorecard-analysis.yml` workflow is intentionally configured for pushes to `main` and a weekly schedule; it does not run an authoritative Scorecard assessment on this draft branch. Therefore:
- **Code-level remediation is committed in PR #141.**
- **The two existing Scorecard review threads remain pending re-evaluation.**
- Confirm closure only after a fresh default-branch Scorecard report evaluates the changed workflow commands.

The PR must not be merged merely to force the Scorecard re-scan. Existing review and release gates remain in force.

## 7. Security boundaries and limitations

- Hash-checking verifies that the wheel pip installs matches the SHA-256 digest stored in the reviewed lock. It does not prove that the upstream publisher, build system or initial package upload is trustworthy.
- This is artifact-integrity control, not package provenance attestation, SBOM approval, vulnerability clearance or independent dependency review.
- The hashes are target-specific. A future Windows, macOS, ARM or alternate-Python workflow needs its own compatible wheel hashes and regression evidence.
- The source version lists and hash locks must be updated together. CI's lock consistency step intentionally fails if package names or versions drift.
- The account prototype remains loopback-only. The locks do not authorize production account hosting, real user credentials, real wallet usage or public onboarding.

## 8. Preservation and impact analysis

No file in `backup/`, `Backup/` or any case variant was changed, moved or deleted. No main-branch content, production service, credential, wallet, blockchain transaction, paid provider, domain, DNS setting or deployment was changed.

**Positive impact:** the two targeted CI install paths no longer rely on version pins alone. They request hash verification for every package, refuse source distributions, and fail closed when the committed source list and lock disagree.

**Remaining action:** obtain the next official Scorecard result when the change is eventually promoted through the normal owner-approved process. Retain this record and all earlier evidence; do not rewrite historical findings as though they never existed.


## 9. Final permanent-workflow verification update — 2026-11-04

**Final inspected code/workflow head:** `478fbd79db8950a3972575792470424955d7ed33`.

The permanent Local Wallet Authentication workflow passed on this head:
- [Local Wallet Authentication Prototype Tests — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41706091456) — run #534.
- The exact permanent install command used the 41-package SHA-256 lock with `--require-hashes --only-binary=:all:`.
- The source/lock consistency step passed.
- Python compilation and JavaScript syntax checks passed.
- All 17 unit/HTTP tests passed.
- The headless-browser wallet smoke test passed.
- The static no-transaction/no-relay guard passed.

On this head, External Review Pipeline CI (run [41706091313](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41706091313)) and NOVA RSI Engine CI (run [41706091595](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41706091595)) also passed. NOVA RSI CodeQL run [41706091527](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41706091527) was still in progress at the time of this update; do not count it as a pass until the run concludes.

The account-continuity 49-package lock's pip installation was independently exercised by the successful temporary force-reinstall in wallet workflow run #531 (run [41705620853](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41705620853)). That temporary check was removed after success. The permanent Account Continuity workflow now uses the account lock directly, and its source/lock consistency was independently checked. Do not represent run #531 as an exact-head account-suite run.

The last inspected review-thread state still shows the Account Continuity Scorecard finding unresolved and the Wallet Authentication finding outdated. This is expected until the configured default-branch Scorecard workflow performs a fresh scan after an owner-approved promotion. No manual thread resolution was applied.

# Dependency inventory and supply-chain controls

**Operating target:** public GitHub repository, GitHub-hosted Ubuntu 24.04 runners, CPython 3.12, x86_64.  
**Budget:** $0 additional provider/service budget. The controls use open-source Python tooling, public PyPI metadata, and GitHub Actions in this public repository.  
**Status:** hash-locked CI installation, source/lock parity, SPDX snapshots, scheduled vulnerability audit and publisher-license metadata collection are implemented in the draft branch. The GitHub Dependency Graph feature is currently disabled, so GitHub Dependency Review cannot yet run.

## 1. Source requirements and platform locks

The source package/version lists are:
- `../auth-prototype/requirements.txt`
- `../account-continuity/prototype/requirements.txt`

The platform-specific, wheel-only hash locks are:
- `requirements-wallet-auth-py312-ubuntu24-x86_64.lock` — 41 exact package versions and SHA-256 wheel hashes.
- `requirements-account-continuity-py312-ubuntu24-x86_64.lock` — 49 exact package versions and SHA-256 wheel hashes.
- `requirements-pip-audit-py312-ubuntu24-x86_64.lock` — pip-audit 2.10.1 plus its 28-package dependency closure; 29 exact package versions and SHA-256 wheel hashes.

The app locks are scoped to CPython 3.12 / Ubuntu 24.04 / x86_64. Do not copy them to Windows, macOS, ARM or a different Python ABI. CI installs use pip `--require-hashes` and `--only-binary=:all:`; this rejects missing hashes and source-distribution fallback.

### Dependabot update procedure

Weekly Dependabot updates are enabled for the two Python requirement directories and GitHub Actions. Dependency update PRs do not automatically bypass hash-lock controls:
1. Review the proposed exact version changes and upstream release/security information.
2. In that same PR, regenerate both platform locks using `python development/dependencies/generate_ci_dependency_locks.py` on CPython 3.12 / Ubuntu 24.04 / x86_64.
3. Or run **Actions → Python CI Wheel-Lock Refresh** on the branch with mode `regenerate`, then apply the uploaded candidate lock files to the PR.
4. Run `python development/dependencies/verify_ci_dependency_locks.py all`.
5. Run the account/wallet tests and dependency audit. Do not merge a version update while source pins and hash locks disagree.

To test whether today's PyPI wheel artifacts still match the committed digests without rewriting files:
```bash
python development/dependencies/generate_ci_dependency_locks.py --check
```
A hash mismatch is a stop condition. Investigate whether the artifact was removed, replaced, or the runner's wheel selection changed; do not automatically bless the new digest.

## 2. SPDX SBOM snapshots

Committed SPDX 2.3 inventories:
- `SBOM-Python-CI.spdx.json` — 49 application/account-continuity dependencies.
- `SBOM-Python-Audit-Toolchain.spdx.json` — 29 packages used by the security scanner.

Both include package names, exact versions, PURLs and the SHA-256 wheel digests. The license fields are deliberately `NOASSERTION`: an SBOM must not turn incomplete publisher metadata into a legal conclusion.

Regenerate and verify:
```bash
python development/dependencies/generate_spdx_sbom.py
python development/dependencies/generate_spdx_sbom.py --check
python development/dependencies/generate_spdx_sbom.py \
  --lock development/dependencies/requirements-pip-audit-py312-ubuntu24-x86_64.lock \
  --output development/dependencies/SBOM-Python-Audit-Toolchain.spdx.json
python development/dependencies/generate_spdx_sbom.py \
  --lock development/dependencies/requirements-pip-audit-py312-ubuntu24-x86_64.lock \
  --output development/dependencies/SBOM-Python-Audit-Toolchain.spdx.json --check
```

The generator uses only the Python standard library. It does not guess transitive dependency edges; the document describes each exact package contained in its complete wheel lock.

## 3. Vulnerability and license-metadata audit

`.github/workflows/python-ci-lock-refresh.yml` is the single dependency-governance workflow. It runs on dependency-related PR changes, weekly (Saturday 03:17 UTC), and by manual dispatch. It separates lock refresh/parity from the full audit job so ordinary account/wallet regression runs remain lightweight. It:
- Installs the audit toolchain from its own SHA-256 lock.
- Audits the full application lock with pip-audit `--no-deps --require-hashes --strict`.
- Separately audits the toolchain lock, including pip-audit itself.
- Emits JSON vulnerability reports and CycloneDX JSON SBOMs.
- Queries public PyPI release metadata for each exact package version, confirms the lock digest matches a file in that release, and captures the publisher-declared license expression/text and license classifiers.
- Uploads evidence as a 14-day GitHub Actions artifact, including reports when an audit step fails.

No API key, PAT, paid scanner, private index, paid provider or new application-runtime dependency is required. PyPI metadata requests are unauthenticated. GitHub's standard hosted runners are free for public repositories; this design deliberately avoids larger runners and third-party hosted services.

The license report is not a legal review. PyPI fields and classifiers are publisher-supplied data, may be absent or inaccurate, and do not establish the licence of all bundled/transitive material. `NOASSERTION` and `NOT ASSESSED` are retained when evidence is missing. Before public redistribution, commercial use, certification or a licence compliance claim, review the exact upstream LICENSE/COPYING texts and applicable notices for every package, including transitive dependencies.

## 4. GitHub Dependency Graph limitation

The first execution of the proposed GitHub Dependency Review Action returned:

`Dependency review is not supported on this repository. Please ensure that Dependency graph is enabled.`

The workflow was removed rather than left as a permanently failing or misleading gate. The repository's Dependency Graph setting must be enabled by an administrator under **Settings → Code security and analysis → Dependency graph** before GitHub's PR-diff vulnerability/license review can be reintroduced. This is a repository feature setting, not a reason to buy a scanner. Until enabled, rely on the active pip-audit + PyPI metadata workflow and record this limitation in release evidence.

GitHub Dependency Review, when enabled, is available for public repositories. It compares dependency changes in PRs; it is not a substitute for the complete locked-inventory scan above.

## 5. Review policy and stop conditions

- Do not auto-merge Dependabot PRs.
- Do not automatically run pip-audit `--fix`; review each proposed package update and its lock changes.
- Treat any known vulnerability as an issue requiring severity, exploitability, affected code path, fix availability and retest evidence.
- A missing PyPI license field is `NOASSERTION`, not automatic permission or automatic rejection.
- A new or changed license expression requires a human decision against the eventual project distribution and commercial-use policy.
- Keep both the application and audit toolchain in the inventory.
- Re-run audits before release/certification and preserve the dated output artifact or committed audit record.
- Hash verification proves byte-level equality with the recorded digest; it does not prove publisher identity, trusted build provenance, absence of malware, or legal compliance.
- All current account/passkey components remain development-only; a green dependency audit does not authorize production account hosting or onboarding.

## 6. Evidence links

See [Python CI Dependency Hash-Lock Qualification](../audit/Active/2026-11-04-Python-CI-Dependency-Hash-Lock-Qualification.md) and the [2026-11-04 Dependency Vulnerability, License, SBOM and Supply-Chain Review](../audit/Active/2026-11-04-Dependency-Vulnerability-License-SBOM-Supply-Chain-Review.md).


## Initial scan outcome — 2026-11-04

The first live full-inventory scan found no known vulnerabilities in either locked inventory: 49 application/account-continuity packages and 29 audit-tool packages. PyPI release metadata matched 49/49 and 29/29 locked wheel hashes. This is a point-in-time advisory result, not a guarantee that the packages are vulnerability-free.

The license reporter now emits explicit review flags for composite SPDX expressions, classifier-only license signals, non-canonical or mixed free-text declarations, and `Other/Proprietary` classifier conflicts. Publisher metadata is never treated as legal approval. The dated audit record identifies the SIWE metadata/provenance exception and composite-license handling.

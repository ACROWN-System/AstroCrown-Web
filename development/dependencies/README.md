# Python dependency governance

**Scope:** the isolated Python security-audit toolchain only.  
**Target:** Ubuntu 24.04, CPython 3.12, x86_64.  
**Runtime account architecture:** AstroCrown ordinary accounts and Genesis wallet identity are implemented in the Cloudflare Worker. There are no Python account-authentication servers or wallet/passkey runtimes.

## Retained source pin and wheel lock

- `requirements-pip-audit.txt` contains the direct source pin for `pip-audit`.
- `requirements-pip-audit-py312-ubuntu24-x86_64.lock` contains the complete dependency closure with exact versions and SHA-256 hashes for target wheels.
- `SBOM-Python-Audit-Toolchain.spdx.json` records the retained scanner toolchain as SPDX 2.3. License fields remain `NOASSERTION` until independently reviewed.

The scanner is not an application runtime dependency. It runs only in GitHub Actions and is installed into an isolated virtual environment using `--require-hashes --only-binary=:all:`.

## Verify or refresh

On the supported target runner:

```bash
python development/dependencies/generate_ci_dependency_locks.py --check
python development/dependencies/verify_ci_dependency_locks.py all
python development/dependencies/generate_spdx_sbom.py --check
```

To create a lock candidate after reviewing a Dependabot version change:

```bash
python development/dependencies/generate_ci_dependency_locks.py
python development/dependencies/verify_ci_dependency_locks.py all
python development/dependencies/generate_spdx_sbom.py
```

A hash change is a stop condition. Review the exact upstream wheel and release metadata before accepting a new digest. Do not automatically bless changed hashes or run `pip-audit --fix`.

## CI audit evidence

`.github/workflows/python-ci-lock-refresh.yml` verifies the scanner wheel lock, runs `pip-audit` against the complete scanner-tool dependency closure, generates a CycloneDX report, and collects publisher-declared PyPI license metadata. The output is uploaded as a 14-day GitHub Actions artifact.

This workflow audits only the scanner itself. The AstroCrown Cloudflare Worker has its own locked Node dependencies and account/Genesis qualification suite. The remaining standalone case-management module uses the Python standard library and is tested separately.

PyPI declarations and classifiers are publisher-supplied, may be incomplete or inaccurate, and do not constitute legal advice. Missing metadata remains `NOASSERTION`; human review is required before legal or redistribution claims.

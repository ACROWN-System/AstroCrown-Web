# Security Policy

AstroCrown-Web includes development tooling for NOVA's recursive self-improvement (RSI) subsystem. Do not assume that passing CI or automated scanning proves the sandbox is escape-proof.

## Reporting a vulnerability

Please do not publish exploit steps, payloads, credentials, tokens, or other sensitive reproduction details in a public issue or pull request.

1. Try [GitHub's private vulnerability report form](https://github.com/ACROWN-System/AstroCrown-Web/security/advisories/new). If private vulnerability reporting is enabled for this repository, submit the report there.
2. If private reporting is unavailable, open a minimal public issue titled **Request for private security reporting channel**. Do not include the vulnerability details or a working exploit. A maintainer can then provide a private route.

This fallback is intentionally designed to avoid disclosing technical details publicly. It is not a promise of a staffed response time.

## In-scope concerns

Security-sensitive findings include, but are not limited to:

- Docker container escape or unauthorized host/runner access;
- exposure of API keys, credentials, runner tokens, or protected evidence;
- bypasses of the protected evaluator, benchmark policy, or readiness/promotion gate;
- unexpected network, filesystem, privilege, or resource access from candidate-controlled code;
- GitHub Actions workflow permissions or token misuse that could allow unreviewed changes.

## Evidence handling

Automated reports from CodeQL, OpenSSF Scorecard, or AI-based scanners must be validated before being treated as confirmed vulnerabilities. Preserve minimal reproducible evidence, identify the affected commit and environment, assess impact, and record remediation and re-test results. Do not include secrets in reports or test fixtures.

The RSI readiness gate remains authoritative: automated scan success does not constitute independent human review or permit autonomous RSI promotion.

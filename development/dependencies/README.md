# Dependency Policy

This directory contains dependency governance guidance for development tools.

The former Python WebAuthn/passkey and SIWE login prototypes have been retired from the active workspace. Their application dependency pins, platform wheel locks, SBOM snapshots and associated audit tooling were removed with those prototypes; they must not be reintroduced as active account dependencies.

## Dependency admission

Before adding a third-party dependency:

1. Identify the concrete requirement that cannot be met adequately by the existing standard library or an already-approved project dependency.
2. Check whether the dependency is permitted under the project's $0-first constraints and whether it requires an account, card, paid plan, usage commitment or external service.
3. Review the exact package, transitive dependencies, license, maintenance, provenance, known vulnerabilities, platform compatibility and data/network behavior.
4. Keep the dependency isolated to the smallest subsystem that needs it.
5. Pin exact versions and use reproducible locks appropriate to the actual runtime and platform.
6. Add tests and automated vulnerability/supply-chain checks proportionate to the risk.
7. Update the relevant subsystem README and record why the dependency is necessary.

Do not introduce a dependency merely because it is popular or convenient. Prefer standard-library or existing qualified functionality where that meets the requirement. Do not silently reuse a retired passkey/SIWE lock as the dependency policy for the wallet-primary Worker; the Worker has its own Node package manifest and qualification workflow.

Passing a package audit does not establish license compliance, safety, production readiness or approval to deploy. Record unknowns as BLOCKED rather than assuming they pass.

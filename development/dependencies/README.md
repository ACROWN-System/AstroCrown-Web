# Dependency boundaries

AstroCrown's deployed account, wallet authentication, Genesis integration and Worker APIs run on Cloudflare Workers with a pinned Node.js dependency set in `development/account-continuity/worker/package.json`.

The remaining Python case-management module uses only the Python standard library. It has no third-party package requirements. No Python account server, passkey server, wallet-authentication server or Python application runtime is retained.

Third-party dependency update automation is therefore limited to GitHub Actions. Worker dependencies are locked and installed by the Worker qualification and staging-deployment workflows. Any future introduction of a Python package must be justified by a concrete product need, reviewed for attack surface and added with a pinned, reproducible dependency process.

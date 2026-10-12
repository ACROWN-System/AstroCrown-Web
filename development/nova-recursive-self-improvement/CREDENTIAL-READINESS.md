# RSI credential readiness workflow

The NOVA Credential Readiness workflow performs a presence-only check of the AstroCrown-Web repository's Actions secrets and variables. It is triggered by relevant main-branch configuration changes or by manual dispatch from the main branch.

It reports presence-only status for the potential reusable LLM slots GROQ_API_KEY_01, GEMINI_API_KEY_01, CLOUDFLARE_API_KEY_01 and CLOUDFLARE_ACCOUNT_ID, the RSI provider slot GROQ_API_KEY_01, the GitHub App client ID/private key, RSI configuration variables, the benchmark command and the auto-merge switch. It also reports the protected implementation-readiness status.

This workflow performs no provider calls, creates no branches or pull requests, and does not change settings. It cannot establish that a configured key works or that a provider's offer is free, commercial-use eligible, or sufficiently available.

Important distinction: the current The default RSI provider is Groq, whose Free plan has explicit rate limits. A non-empty GROQ_API_KEY_01 must not be treated as unlimited capacity, live health, or a permanent no-cost entitlement. The policy and readiness gate must remain closed until the provider/account meets the project constraints and the protected benchmark and implementation checks are independently verified.

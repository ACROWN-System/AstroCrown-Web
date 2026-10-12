# RSI credential readiness workflow

The NOVA Credential Readiness workflow performs a presence-only check of the AstroCrown-Web repository's Actions secrets and variables. It is triggered by relevant main-branch configuration changes or by manual dispatch from the main branch.

It reports whether the following are present without printing their values: NOSANA_LLM_API_KEY_01, NOVA_RSI_APP_CLIENT_ID, NOVA_RSI_APP_PRIVATE_KEY, RSI_AI_BASE_URL, RSI_AI_MODEL, RSI_AI_COMMERCIAL_ELIGIBILITY, RSI_BENCHMARK_COMMAND and NOVA_RSI_AUTOMERGE_ENABLED. It also reports the protected implementation-readiness status.

This workflow performs no provider calls, creates no branches or pull requests, and does not change settings. It cannot establish that a configured key works or that a provider's offer is free, commercial-use eligible, or sufficiently available.

Important distinction: the current Nosana LLM inference documentation describes per-token billing against credits. A non-empty NOSANA_LLM_API_KEY_01 must not be treated as proof of $0 eligibility. The policy and readiness gate must remain closed until the provider/account meets the project constraints and the protected benchmark and implementation checks are independently verified.

# NOVA key readiness

The credential-readiness report distinguishes whether a secret is present from whether the provider works.

## States

- REQUIRED_NOT_CONFIGURED: the expected environment slot was empty in that workflow run.
- CONFIGURED_NOT_VERIFIED: the slot was non-empty; authentication, API behavior, licensing, and quota have not been inferred.
- CANDIDATE_NOT_ACTIVATED: lifecycle status is independent of key presence. A configured GPU candidate remains inactive until its API adapter, account eligibility, and workload path are verified.

The NOVA Validation workflow reports presence for the active LLM slots (Groq, Gemini, Cloudflare plus its account ID) and the two GPU candidates (Nosana and Hugging Face ZeroGPU). It prints environment-variable names and presence states only—never credential values—and does not call providers. A push to main affecting the readiness files generates a current report. It is also manually dispatchable from GitHub Actions.

## Known separations

- An LLM API key and a GPU allocation key are not interchangeable. Nosana LLM inference and Nosana GPU job/market APIs are separate operational paths, even if the vendor account may issue related credentials.
- The qualification diagnostic actively probes Groq and Gemini only. Mistral remains deferred and is excluded from the health-test environment. Cloudflare inference qualification is BLOCKED without another live request until the exact model/API response contract is verified; credential presence and ordinary routing are separate evidence.
- No GPU candidate is placed into providers merely because a token exists.
- Credential presence does not establish $0 eligibility, no-card access, commercial rights, free-tier persistence, or available GPU minutes. Those require their own evidence and runtime checks.
- RSI in AstroCrown-Web uses a separate repository's Actions secrets/variables; the NOVA report cannot see or infer their values.

## Live heartbeat behavior

The LLM heartbeat runs on its six-hour schedule and may also run after relevant changes to `NOVA/provider_qualification.py`, `NOVA/health.py`, or `NOVA/roster.json` on `main`. Its own workflow file is deliberately excluded from the push paths so merging a trigger change does not itself cause an incidental live LLM run. The qualification step probes Groq and Gemini only; Mistral is excluded, and Cloudflare inference qualification remains `BLOCKED_CONTRACT_UNVERIFIED` pending evidence for the exact model/API response contract.

The GPU heartbeat keeps its six-hour schedule and manual dispatch, and can additionally run after changes to its adapter, candidate roster, shared health primitives, or own workflow. Candidate checks use allowlisted, read-only endpoints; they do not create GPU jobs or infer available credits or GPU capacity from undocumented fields. The official Nosana endpoint is `GET https://api.nosana.com/credits/balance` (official API reference: https://api.nosana.com/api/docs). A successful credential check is not evidence of zero-cost eligibility or available compute.


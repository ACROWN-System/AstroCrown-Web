# NOVA Provider Qualification

This diagnostic evaluates configured provider credentials with one bounded, non-sensitive request per eligible endpoint. It reports presence, authentication/response status, latency and allowlisted rate-limit headers only. It never prints credential values, response text, raw error bodies or unapproved headers. It does not modify provider lifecycle, persisted down markers, billing settings or live routing. When NOVA_PERSIST_HEALTH_STATE=true (the LLM heartbeat only), it stores a sanitized snapshot under credential_health in NOVA/health_state.json, separate from provider-routing targets. A passing request is a timestamped observation, not proof of free-tier eligibility, remaining quota, commercial rights or production suitability.

Mistral is probed only for diagnostic health because the user requested visibility across existing API keys; its production lifecycle remains DEFERRED and it is never used by normal routing. Cerebras is presence-only while the current offer is deferred by the no-payment-method policy; the diagnostic makes no Cerebras inference call. GitHub_Token is not probed here and is not counted as inference capacity. GitHub Actions automatically issues a short-lived, repository-scoped GITHUB_TOKEN for workflow operations, while Codex uses its own approved GitHub integration path. A manual GET /user 403 is insufficient to claim that Codex/GitHub integration is broken. GitHub Models inference was retired on 2026-07-30.

## Heartbeat persistence

The scheduled six-hour LLM heartbeat executes this diagnostic after its regular AI/reasoning tasks and before publishing operational state. It probes Groq, Gemini, Mistral as diagnostic-only, and Cloudflare only when its key and account ID are present. Cerebras is recorded as presence-only/deferred and is not called. The result contains no secret values, raw response bodies or generated response text.

Sanitized snapshots are retained in NOVA/health_state.json under credential_health and last_llm_key_heartbeat and are published only to nova-operational-state through the existing operational-state writer. These fields do not live in the ai-heart provider-routing namespace and cannot activate providers or clear persistent down markers.

The GPU heartbeat independently records candidate credential presence and uses provider-specific read-only authentication endpoints when configured. Token validity, model inference health, and actual GPU compute/quota remain independent states.

# Active Navigation Plan — Cloudflare Image MVP Implementation

**Date:** 2026-10-14  
**Status:** ACTIVE — first image-provider adapter and offline contract tests  
**Objective:** Build a small, replaceable, auditable first image-generation path for AstroCrown website/UI and token-generator logo assets, without spending money or claiming unverified provider capacity.

## Navigation and source of truth

**Repository:** https://github.com/ACROWN-System/AstroCrown-Web  
**Base commit:** `d809a6fde99197249cba54027215301af5d6374e`  
**Branch:** `work/cloudflare-image-mvp-2026-10-14`  
**Mode:** Additive development-only implementation, deterministic tests, and a manually triggered integration-test entry point. No changes to the regular website, existing backups, account billing, or secrets.

The previously inspected active tree did not contain `NAVIGATION-PROTOCOL.md` or `NAVIGATION-PLAN-TEMPLATE.md`. This record uses the existing `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, its external API contract gate, and the now-merged image-first architecture as the active fallback. It does not claim to follow missing files.

## Intent and scope

1. First priority: useful static images for the homepage's deep-space/environment layers and AI Token Generator logos. Transparent foreground assets are a separately verified output requirement; do not assume an opaque text-to-image endpoint emits real alpha.
2. Build one AstroCrown-owned service boundary with provider-specific code isolated in an adapter. Initial adapter: Cloudflare Workers AI `@cf/bytedance/stable-diffusion-xl-lightning`, because this account already has Cloudflare Workers AI LLM credentials and the provider documents an image endpoint. Existing LLM access does not prove image entitlement or operation.
3. Keep image generation separate from optional LLM prompt/metadata assistance; no LLM call is required to invoke the image adapter.
4. No payment method, no spend, no paid fallback, no unattended provider calls. The real-provider integration test must be manually triggered on `main` only and only after the project repository contains a narrowly scoped token and Account ID.
5. Use no new Python runtime dependencies. Validate the exact HTTPS API host, binary image/png response contract, PNG structure/dimensions/checksums, and output path behavior. Do not log credential values.
6. Record provenance beside each saved asset. Generated assets are not automatically added to the regular website or promoted commercially.
7. Keep video in the same target system but separate its adapter/runtime/capacity qualification; do not block the image MVP on a still-unqualified video GPU pool.

## External contract record

- Provider/API: Cloudflare Workers AI REST API, `POST https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/bytedance/stable-diffusion-xl-lightning`.
- Authentication/configuration: the qualification workflow runs inside NOVA and reads NOVA's existing repository secrets `CLOUDFLARE_API_KEY_01` and `CLOUDFLARE_ACCOUNT_ID`. The workflow maps the token value to the adapter's process environment variable `ASTROCROWN_CLOUDFLARE_AI_TOKEN` without copying the value into AstroCrown-Web. Do not add AstroCrown-Web token/account secrets or print/store credential values.
- Request: `prompt`, optional `negative_prompt`, `width`, `height`, `num_steps`, optional `seed`; verify against official model docs at implementation/test time.
- Expected output: the official SDXL-Lightning model schema declares a binary `image/png` output. Accept only that content type with valid PNG bytes. Fail closed on unexpected content type, malformed PNG/chunk CRC/compressed data, HTTP errors, redirects, excessive response size or output dimension mismatch.
- Eligibility: model page's zero-per-step display does not prove this account's no-card entitlement, quota, hosted terms, or output suitability. Preserve those as BLOCKED until a bounded live test and rights review produce evidence.
- Current research use mode: internal/non-commercial R&D. Requalify the route and assets before public paid features or commercial production.

## Acceptance criteria

- Offline tests prove request construction, no-secret errors, safe HTTP/error handling, strict parsing and image validation, no accidental overwrite, and provenance output.
- No workflow other than a manual dispatch may contact Cloudflare for image generation. No real provider credentials are provided to pull-request tests.
- The manually dispatched image qualification workflow lives in NOVA, is restricted to the NOVA `main` ref and explicit no-payment confirmation, consumes NOVA repository secrets only, checks out the adapter at a reviewed immutable AstroCrown-Web commit, writes output to a temporary artifact path, and records no token in workflow logs. The old direct-live workflow in AstroCrown-Web must be removed to leave one clear entry point.
- The PR and CI must pass before merge. The first live test remains a separate gate and must not be described as passed until run and evidenced.
- The audit stays ACTIVE/BLOCKED until account eligibility, endpoint response, actual usage, image quality, latency and rights checks are recorded.
- Keep the initial result as a candidate, not an approved public/production service.

## Impact Analysis

**IF modified:** AstroCrown gains a bounded, dependency-light first implementation path with reusable provider isolation, offline contract coverage and a clear path to the first controlled live test. It reduces repetition and keeps sensitive credentials out of PR code execution.

**IF not modified:** the project remains at architecture documents and cannot produce a testable generated asset through its own code; an operator may continue relying on guessed request contracts or confusing an LLM token with image-model access.

## Explicit non-goals

- Do not generate or publish an asset during CI or this implementation PR.
- Do not create or modify API credentials/secrets.
- Do not implement public UI, multi-user queues, paid fallback, model-weight merging, video runtime or an assumed 86,400 GPU-minute capacity.
- Do not mark Cloudflare image generation, alpha transparency, video, or commercial-use rights as qualified without evidence.

## Implementation checkpoint (2026-10-14)

- Added `development/ai-media-generator/cloudflare_image.py`: fixed Cloudflare endpoint, bounded request inputs, secret-safe errors, redirect rejection, the documented binary-PNG response contract, PNG chunk CRC/bounded decompression/dimension validation, no-overwrite output and provenance sidecar.
- Added deterministic tests under `development/ai-media-generator/tests/test_cloudflare_image.py` for success variants, malformed output, provider errors, redirects, dimensions, checksums and no-overwrite behavior.
- Added the offline-test CI workflow in AstroCrown-Web. The original direct-live workflow required AstroCrown-Web repository secrets that are not present; the follow-on credential-owned qualification runner is being moved to NOVA to use the existing NOVA secrets. The NOVA runner will upload only the image and provenance as a 7-day artifact.
- No live provider call has been made, and this adapter is not yet qualified. The current PR check suite must run against its exact head before merge; a successful PR suite would establish offline/code correctness only.

## Handoff

After code and deterministic tests pass, review and merge through pull requests. Do not create AstroCrown-Web secrets for this test. The qualification runner in NOVA uses the existing `CLOUDFLARE_API_KEY_01` and `CLOUDFLARE_ACCOUNT_ID` secrets and checks out the reviewed AstroCrown-Web adapter commit. Only manually dispatch the NOVA workflow after confirming the account remains on its no-payment configuration and entering a non-sensitive prompt. Record request outcome, actual usage, latency, output dimensions/quality and applicable rights before changing the route from BLOCKED.
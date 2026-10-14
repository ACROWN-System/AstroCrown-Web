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
4. No payment method, no spend, no paid fallback, no unattended provider calls. The real-provider integration test must be manually triggered from NOVA `main` only, using the existing NOVA repository secrets and an explicit no-payment confirmation.
5. Use no new Python runtime dependencies. Validate the exact HTTPS API host, bounded PNG or JPEG response contract, PNG chunk CRC/compressed data or JPEG segment/signature/dimension structure, and output path behavior. Do not log credential values or provider response bodies.
6. Record provenance beside each saved asset. Generated assets are not automatically added to the regular website or promoted commercially.
7. Keep video in the same target system but separate its adapter/runtime/capacity qualification; do not block the image MVP on a still-unqualified video GPU pool.

## External contract record

- Provider/API: Cloudflare Workers AI REST API, `POST https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/bytedance/stable-diffusion-xl-lightning`.
- Authentication/configuration: the qualification workflow runs inside NOVA and reads NOVA's existing repository secrets `CLOUDFLARE_API_KEY_01` and `CLOUDFLARE_ACCOUNT_ID`. The workflow maps the token value to the adapter's process environment variable `ASTROCROWN_CLOUDFLARE_AI_TOKEN` without copying the value into AstroCrown-Web. Do not add AstroCrown-Web token/account secrets or print/store credential values.
- Request: `prompt`, optional `negative_prompt`, `width`, `height`, `num_steps`, optional `seed`; verify against official model docs at implementation/test time.
- Expected output: Cloudflare's SDXL-Lightning API schema declares binary `image/png`, while its published usage example labels the stream `image/jpg`; Cloudflare's public documentation issue #21022 also records REST output observed as JPEG despite the PNG schema (https://github.com/cloudflare/cloudflare-docs/issues/21022; model docs: https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-lightning/). The failed controlled call logged `Provider output is not a valid PNG image` after accepting the `image/png` response header, but did not preserve the body or its signature; therefore JPEG is the leading hypothesis, not a confirmed observation from that run. Revise the adapter to identify file format from bounded image signatures and container structure, accept valid PNG or JPEG outputs only, record both the provider's declared Content-Type and the detected format, and choose the saved extension/MIME from actual bytes. Permit the known JPEG-vs-PNG declaration inconsistency only for structurally validated JPEG bytes; fail closed on JSON/HTML/unknown bodies, disallowed content types, malformed containers, HTTP errors, redirects, excessive response size or output dimension mismatch.
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



## Failure evidence and remediation checkpoint (2026-10-14)

- NOVA workflow run: https://github.com/ACROWN-System/NOVA/actions/runs/38573541271
- Result: secret-presence check passed; the reviewed adapter fetch passed; the live image call returned exit code 2 with `Provider output is not a valid PNG image`; artifact upload was skipped.
- Safety boundary held: no token value or full response body was logged; the workflow did not upload a malformed/unvalidated image. The response body was not persisted, so the run alone cannot establish whether it was JPEG, a mislabeled error payload, or other malformed data.
- External evidence: Cloudflare’s model docs contain a conflicting `image/jpg` usage header and PNG output schema; public issue #21022 reports JPEG bytes from the REST API despite the schema. The correction must support only explicitly validated PNG/JPEG signatures, expose safe diagnostics for unknown signatures without body logging, record declared versus detected format in provenance, and select the actual file extension.
- **Impact Analysis addendum — IF modified:** the adapter can tolerate the documented format inconsistency while preserving bounded parsing and truthful provenance, allowing the controlled qualification to continue without adding dependencies or copying secrets. **IF not modified:** a valid JPEG response can remain rejected as a supposed invalid PNG, while future operators lack enough safe diagnostic data to distinguish provider format drift from a malformed/error response.
- Re-test gate: deterministic offline tests must cover PNG success, JPEG bytes under the documented mismatched header, mismatched/unknown/JSON response rejection, dimension/structure validation, accurate sidecar MIME and filename, no-overwrite behavior, and no secret/body leakage. After PR checks pass, update NOVA’s pinned immutable adapter SHA in a separate PR. Do not rerun live inference until both changes are merged and the revised workflow is verified.

## Process root cause and recurrence prevention

- **Direct technical cause:** the adapter's output contract accepted only PNG bytes. The live response passed the `image/png` header check but did not have a valid PNG signature/container, so validation stopped and intentionally withheld the artifact. Because the response body was not persisted, the exact returned format remains unconfirmed by this run.
- **Why the defect escaped before the live gate:** implementation treated the model's API output schema as the complete contract, even though the same model page's usage example uses `image/jpg`. Offline fixtures only represented PNG, so tests proved the implementation matched its assumption—not that the assumption fully represented the provider.
- **Recurrence prevention:** before integrating external model APIs, compare output schema, official usage examples, and relevant provider issue/changelog history; record conflicts as contract uncertainty; create offline fixtures for each documented/observed output variant and MIME discrepancy; keep live provider calls behind the separate manual gate; never infer successful live output from offline tests; inspect the downloaded artifact before declaring image generation operational. For failures, preserve only bounded non-sensitive diagnostics (header, byte count, recognized signature class, status), never raw bodies or secrets.
- **Residual limitation:** JPEG marker validation is not a full JPEG pixel decode. A successful workflow plus correct dimensions does not by itself prove decodability, visual quality, alpha transparency, commercial permission, or account/quota stability. Manual artifact inspection remains mandatory.


## Implementation checkpoint (2026-10-14)

- Updated `development/ai-media-generator/cloudflare_image.py`: fixed Cloudflare endpoint, bounded request inputs, secret-safe errors, redirect rejection, PNG chunk CRC/bounded decompression/dimension validation, bounded JPEG marker/frame/scan-structure/dimension validation, MIME-drift recording, format-correct output extension, no-overwrite behavior and a provenance sidecar. JPEG validation is explicitly structural, not a full entropy decode; manual viewability still must be verified from the returned artifact.
- Expanded deterministic tests under `development/ai-media-generator/tests/test_cloudflare_image.py` for raw PNG success, JPEG bytes with the known image/png declaration drift, JSON/unknown response rejection without body disclosure, JPEG marker/dimension checks, format-correct file naming/provenance, malformed PNG checksums/compression, provider errors, redirects and no-overwrite behavior.
- Added the offline-test CI workflow in AstroCrown-Web. The direct-live workflow is being removed from AstroCrown-Web because its repository secrets are intentionally not duplicated there. The credential-owning qualification runner is being moved to NOVA to use existing NOVA secrets. The NOVA runner checks out the reviewed adapter commit anonymously by immutable SHA and uploads only the image and provenance as a 7-day artifact.
- NOVA run #38573541271 made the first live provider call. The request reached the adapter but failed safely at the response-format check; no artifact was uploaded. Cloudflare entitlement, output quality and this adapter remain unqualified. The updated PR check suite must run against its exact head before merge; a successful PR suite establishes offline/code correctness only.

## Handoff

After code and deterministic tests pass, review and merge through pull requests. Do not create AstroCrown-Web secrets for this test. The qualification runner in NOVA uses the existing `CLOUDFLARE_API_KEY_01` and `CLOUDFLARE_ACCOUNT_ID` secrets and checks out the reviewed AstroCrown-Web adapter commit. Only manually dispatch the NOVA workflow after confirming the account remains on its no-payment configuration and entering a non-sensitive prompt. Record request outcome, actual usage, latency, output dimensions/quality and applicable rights before changing the route from BLOCKED.
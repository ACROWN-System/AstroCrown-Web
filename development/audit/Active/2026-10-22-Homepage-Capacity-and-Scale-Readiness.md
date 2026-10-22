# Homepage Capacity, Provider Exit, and Revenue-Gated Scale Readiness

**Date:** 2026-10-22  
**Status:** ACTIVE DESIGN / MEASUREMENT BASELINE — no production host, paid plan, data provider, AI provider, or GPU service selected  
**Scope for this work block:** public-facing homepage and its static delivery/performance. User account creation, administrator authentication, wallet enrollment, and the announcement editor are explicitly out of scope for this block.

## 1. Purpose

Make the homepage viable for a future public commercial deployment without committing early to a vendor or waiting until a free-tier limit, quota, or service failure harms visitors. Capacity increases must be funded by evidence and planned before limits are reached, with a comfortable operating margin. The development preview must remain easy to inspect and test in a real browser.

This record defines architecture and acceptance rules. It does not claim production scale, live-origin performance, paid-provider eligibility, or revenue readiness.

## 2. Verified current state

- Repository: ACROWN-System/AstroCrown-Web.
- Current main after the homepage-header PR merge: a08220b66830b467a6be7fc93c403d5c84be02f2.
- Current public test route: https://acrown-system.github.io/AstroCrown-Web/preview/.
- Pages build/deployment run 39807222283 completed successfully against the current main commit.
- Post-merge Homepage Browser Smoke run 39807222430: 63 PASS, 0 FAIL, 0 BLOCKED. Its report had no page exceptions, no console errors, and no blocked non-loopback requests. Artifact 12437958064 was retrieved and inspected.
- Source footprint measured at the current baseline: preview/index.html 89,662 bytes; preview/account-prototype.css 10,292 bytes; preview/account-ui.js 23,578 bytes. Combined critical source is 123,532 bytes before HTTP compression and headers. This is a source measurement, not a live network-transfer measurement.
- The current preview uses illustrative market data and a disposable browser-memory account demo. It has no production API, live market-data adapter, durable account backend, or production authentication.
- The site root remains separate from the prototype. No root publishing-source switch was made by the header merge. The current Pages artifact must not be treated as an approved commercial deployment.
- OpenSSF Scorecard run 39807222453 failed with a GitHub GraphQL internal error during ListCommits. Its job log identifies the API/internal query error; it did not return a project-specific finding. Record this as an infrastructure/tool result, not a successful Scorecard assessment. Re-run only when needed to establish the current Scorecard status.

## 3. Important hosting-policy finding

GitHub's official Pages limits documentation states that GitHub Pages is not intended or permitted as free hosting for an online business, e-commerce site, or site primarily directed at commercial transactions or commercial SaaS. It also documents a 1 GB published-site limit and a soft 100 GB/month bandwidth limit. Official source checked 2026-10-22:

- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

Therefore:
- Keep GitHub Pages as the current development/test preview, with the existing visible prototype warning and noindex metadata.
- Do not promote AstroCrown's commercial homepage or future transactional features as a GitHub Pages production site.
- Select and qualify a different production host before public commercial launch. A passing GitHub Pages deployment proves only that that preview artifact was deployed.

Cloudflare is a candidate to investigate, not an approved provider. Current official documentation reports that Cloudflare Pages static asset requests are free and unlimited on Pages' plans, while Functions are billed as Workers; current Workers Free limits include 100,000 requests/day and 10 ms CPU/request. The Workers Paid plan currently has a $5/month minimum and no additional data-transfer/throughput charge, and Workers AI currently publishes 10,000 Neurons/day of free allocation followed by metered usage on Paid. Relevant sources checked 2026-10-22:

- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers-ai/platform/pricing/

These published features do not establish that signup for the owner's account will be no-card, that the host accepts crypto payments, that a specific AI model supports the required capability, or that the service meets commercial needs. Those remain explicit qualification gates.

## 4. Capacity principles

### 4.1 Make the public shell cheap to serve

- Keep the homepage static-first: HTML, CSS, JavaScript, approved visual assets, and non-sensitive public content should be build artifacts that can be served from a global cache.
- Keep critical first-render behavior independent of market APIs, AI/SI providers, GPU jobs, account authentication, and analytics.
- Avoid making one external service or one dynamic API request a mandatory dependency for each visitor.
- Batch and cache public data at the edge or in a controlled shared snapshot. Do not make each visitor independently call AI, GPU, or a third-party quote provider for the same result.
- Keep content/data schemas and deployment configuration separate from a particular host. Never put private provider secrets in browser code.
- Prefer progressive enhancement. If an optional source fails, preserve browsing and display a specific stale/unavailable state; do not show old values as live.
- Use immutable/versioned static assets when extraction from the HTML produces a demonstrated caching or maintenance benefit. Do not split files or add a build system solely for abstraction's sake.

### 4.2 Separate workload and failure domains

1. Static homepage and static assets — global cache; must remain viewable without AI, GPU, or account services.
2. Market-data ingestion and shared snapshots — provider adapters, timestamps, provenance, quotas and stale-data behavior.
3. Interactive data APIs — bounded execution, rate limits, response caching, timeouts, circuit breakers and graceful degradation.
4. AI/SI reasoning — asynchronous jobs and provider routing; invoke only when reasoning adds value, not on every page view.
5. GPU/image/video jobs — queued work, explicit concurrency and spend caps, retry limits, and job-status responses that do not block the homepage.
6. Future account/admin features — distinct identity and authorization services; never let account state or an admin outage make public browsing unavailable.
7. Monetization and settlement — a separately verified revenue ledger and payment route; never equate unrealized token price, a queued payment, or gross receipts with spendable operating income.

No single provider, database, domain, identity system, AI vendor, GPU marketplace, or payment rail should become an unrecorded single point of failure. Do not deploy the services above merely because they appear in this design; each requires its own scoped contract and acceptance tests.

## 5. Repeatable homepage budgets added in this work block

The existing Playwright test will record performance timings as diagnostics and enforce source/request-count budgets. Initial budgets are deliberately conservative and should change only with measured evidence and a reviewed diff:

| Measure | Initial budget | Why |
|---|---:|---|
| Homepage HTML source | at most 112 KiB | Keep the initial document lightweight with roughly 20% or more room above the measured baseline. |
| Critical runtime CSS + JavaScript source | at most 48 KiB combined | Bound the two currently loaded support assets; this is a source budget, not the production auth design. |
| HTML + critical CSS + JavaScript source | at most 160 KiB combined | Control the total uncompressed critical source footprint. |
| Initial decoded navigation resources | at most 160 KiB combined | Catch unplanned critical resources in the browser harness. |
| Initial browser resource entries | at most 8 | Detect accidental dependency/resource proliferation. |
| External HTTP(S) dependencies in the loopback test | zero | Preserve independent offline rendering; any new external contract requires separate review. |

At the current baseline, the combined source is approximately 120.6 KiB, below the 160 KiB budget. Local browser timings are reported for comparison but do not gate a build on unstable wall-clock values. Local-loopback timing is not a substitute for field data, CDN timing, load tests, or real-origin cache/header verification.

The existing browser suite continues to check interactions and layout at 1440, 1280, 1024, 768, 390, and 320 CSS pixels. Its synthetic sample dataset does not prove behavior with large live datasets.

## 6. Production observability and headroom policy

Before a commercial launch, select telemetry that minimizes personal data and measures service behavior rather than building invasive identity tracking. At minimum, aggregate:

- requests/visits and bytes served by route and asset;
- CDN cache-hit/miss ratio and origin fetch rate;
- 4xx, 429, and 5xx rates; edge and origin latency percentiles;
- field Core Web Vitals when collected lawfully and with an appropriate privacy notice;
- data-source age, ingestion failures and fallback frequency;
- API quota consumption, AI tokens/neurons/cost, GPU time/queue depth, storage, egress and retry volume;
- income received and cleared, payment fees, chargeback/refund exposure, and committed recurring expenses.

Use the following initial engineering triggers as starting policy, then validate them with measured traffic and provider contracts:

- Warning: forecast demand or the rolling 7-day peak reaches 40% of a hard quota; investigate growth and identify the alternate provider/plan.
- Start the migration/upgrade decision: a service uses more than 50% of a daily/monthly hard limit on at least 3 of 7 days, or a trend forecast reaches 60% of the limit within the next 30 days.
- Protect users: do not plan ordinary operation above 70% of a hard quota. If a surge approaches this threshold, reduce or pause optional AI/GPU workloads, increase shared caching, use a qualified fallback, and keep public static content available.
- Availability/latency: alert on sustained 5xx above 1% for 5 minutes, repeated 429 responses, a breached provider quota, or material latency regression over two consecutive monitoring windows. Set route-specific p95 latency targets only after establishing a realistic production measurement baseline.
- Paid capacity: do not wait for an actual quota error as the trigger. Qualify and rehearse the destination environment before a migration is needed.

A quota percentage is useful only if the provider's quota definition is known and measured correctly. Some plans cap daily API requests; others cap CPU time, simultaneous work, bandwidth, tokens/neurons, GPU seconds, database reads/writes, or concurrency. Track each meter separately.

## 7. Revenue and payment readiness for paid capacity

The homepage should not assume that future traffic will produce enough income. Before committing to paid services, define and test a lawful, transparent revenue model and calculate its net available contribution to operating costs. Possible models require separate product and compliance review; none is activated by this plan.

Upgrade funding gate:
- Use cleared net revenue, not token-market capitalization, unrealized ACROWN value, unconfirmed sponsorship, future forecasts, or gross receipts.
- Keep a separately tracked operating reserve. Before a recurring paid commitment, the forecast should cover the next three months of expected hosting, data, AI/SI and GPU costs plus migration costs and at least 30% contingency.
- Model payment-processor/exchange fees, network fees, FX volatility, provider taxes, minimum commitments, cancellation, billing interval, and a failed or delayed crypto settlement.
- Qualify crypto payment at the exact provider and account: supported assets/network, confirmation rules, recurring renewal method, refund/chargeback policy, invoices, access to receipts, and what happens if renewal is missed. Do not assume “accepts crypto” means automatic renewals are supported.
- Never let a token purchase or speculative return be a prerequisite for basic user access. Keep paid capacity decisions under an explicit budget and owner approval until a stable net-revenue history supports a different policy.

Before the free limit is approached, decide whether to upgrade, optimize, or degrade a noncritical feature. If funding is not available, keep static browsing available and apply deliberate optional-workload limits; do not silently incur charges or allow background retries to consume an unlimited budget.

## 8. Provider-independent migration sequence

1. Baseline the static build and critical source budgets in CI.
2. Select candidate production hosts only after confirming business-use terms, origin/domain support, export portability, no-card requirements, and crypto-payment feasibility.
3. Build the same static artifact for a staging hostname. Externalize secrets/configuration from the client bundle; keep all public pages usable with data providers disabled.
4. Test caching, compression, HTML/CSS/JS MIME types, HTTPS, CSP/security headers, CDN behavior, error responses, stale data and no-provider states on the actual destination origin.
5. Load-test the static route and the specific dynamic service separately. Test burst, sustained traffic, cache miss, cold start, provider timeout, quota exhaustion, 429/5xx, and simultaneous AI/GPU job requests. Do not infer concurrency capacity from a single browser smoke run.
6. Rehearse data export/restore, rollback to the prior version, DNS/domain cutover, cache invalidation, key rotation, and provider failure before public promotion.
7. Set threshold alarms and verify a human/automated response can act before the 70% hard-quota protection threshold.
8. Roll out incrementally and keep the previous route/artifact recoverable. Compare errors, latency, cache hit rate, conversion, and cost per successful session before completing migration.
9. Only after the homepage deployment path is stable should separate work add live data, identity/account services, monetization integrations, AI/SI jobs, or GPU media jobs. Each remains an independently gated service.

## 9. What this work does not claim

- No realistic multi-user/load or soak test has been executed.
- No actual production-origin response headers, cache-hit behavior, global latency, or CDN traffic logs have been inspected.
- No commercial hosting provider has been qualified in the user's account.
- No crypto-payment renewal path has been tested.
- No revenue or monetization model has been activated or validated.
- No live market data, account backend, admin authorization, AI service or GPU queue has been connected.
- Browser CI and a successful Pages deployment validate the test preview only. They do not certify production capacity or permission to use a provider commercially.

## 10. Impact analysis

**If the source budgets and migration gates are applied:** visual development stays lightweight, external dependencies are deliberate, the system can be migrated before quota exhaustion, and paid capacity is connected to measured demand and cleared revenue rather than assumptions.

**If they are not applied:** the page can gradually accumulate heavy assets and per-visitor API calls; provider quotas can be reached before the team notices; AI/GPU retries may consume funds without producing user value; and late migration may force rushed changes or cause downtime.

## 11. Next actions

1. Run the augmented browser smoke workflow on the exact PR head and inspect the JSON source/resource-size budgets alongside the screenshots.
2. Verify current main deployment status and keep the public preview route visibly labeled as a prototype.
3. Finish the remaining homepage visual work in separate tested changes (information-bar spacing/divider, hero hierarchy, then background-layer candidates). Do not mix account/admin implementation into this workstream.
4. Before using GitHub Pages for anything beyond development preview, qualify a commercial production host. Cloudflare Pages/Workers is a candidate only; no-card and crypto-payment requirements remain unverified.
5. Establish live-origin metrics and perform controlled load/soak tests only after a candidate commercial host has been qualified. Do not treat source budgets as a substitute for those tests.

## 12. Authoritative source record

- GitHub Pages policy and limits, checked 2026-10-22: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- GitHub Pages static-site scope, checked 2026-10-22: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- Cloudflare Pages static asset / Functions pricing distinction, checked 2026-10-22: https://developers.cloudflare.com/pages/functions/pricing/
- Cloudflare Workers limits, checked 2026-10-22: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Workers pricing, checked 2026-10-22: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Workers AI pricing, checked 2026-10-22: https://developers.cloudflare.com/workers-ai/platform/pricing/

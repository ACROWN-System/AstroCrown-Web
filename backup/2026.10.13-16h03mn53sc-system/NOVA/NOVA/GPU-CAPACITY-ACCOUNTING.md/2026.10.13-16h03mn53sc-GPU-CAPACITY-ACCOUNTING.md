# Aggregate GPU-Capacity Accounting

**Status:** Initial evidence register and deterministic accounting implementation  
**Last reviewed:** 2026-10-13  
**Current intended use:** **Non-commercial research and development in the GitHub development environment**  
**Provisional planning reference (unvalidated):** **86,400 GPU-minutes/month across the combined provider ecosystem**  
**Requirement status:** **Not established; not a dogmatic or binding requirement**

## Objective and accounting unit

One GPU-minute means one GPU allocated for one minute. Two GPUs allocated concurrently for one minute contribute two GPU-minutes. Under this convention, 86,400 GPU-minutes over a 30-day period would equal two continuously allocated GPU equivalents. This arithmetic explains the scale of the provisional reference; it does not establish that this volume is realistic, needed, or available. The reference is aggregate only for comparison across providers; it is not an obligation for one provider or the ecosystem to meet.

The evidence register is **NOVA/gpu_capacity_evidence.json**. The deterministic report engine is **NOVA/gpu_capacity.py**. The GPU heartbeat adds the report to **last_gpu_heartbeat.aggregate_capacity**. The capacity code performs no provider requests and cannot activate an account or spend credits. The 86,400 figure is a provisional comparison baseline only: neither its realism nor the availability of that much eligible free capacity has been established. It can be revised or abandoned as evidence accumulates.

## What counts

A recurring contribution counts only when all of the following are evidenced and current:

1. The account and its eligibility for the specific free allocation are verified.
2. The allocation is available without a payment method and has no cash cost under the agreed policy.
3. The provider's terms permit the current non-commercial R&D activity, including personal/internal-use, research, third-party-benefit, acceptable-use and workload restrictions. Commercial-use rights are **not required now**.
4. Automated access is supported for the intended system operation.
5. GPU type, VRAM, concurrency/queue behavior and workload compatibility have been tested sufficiently for the intended use.
6. Handling of the specific input/output data has been approved; community-hosted volunteer inference is not implicitly authorized.
7. A real allocation test passed and its evidence identifies the tested configuration.
8. Usable recurring GPU-minutes/month, the observation time, an expiry/validity time, and HTTPS evidence links are recorded.
9. The provider is activated in the current **NOVA/gpu_roster.json** before its amount counts as operationally available.

A missing field, unknown state, stale timestamp, invalid number, or unsupported claim blocks that contribution. Explicitly disallowed current R&D use or a required payment method excludes a candidate. Absence of commercial-use rights alone does not exclude a provider during this research phase.

## Separate quantities; never double-count

| Quantity | Meaning | Counts toward recurring monthly target? |
|---|---|---:|
| Advertised monthly GPU allowance | Public quota or normalized estimate | No; tracked separately from verified capacity |
| Verified eligible recurring GPU-minutes/month | Current account-level recurring allocation passing every gate | Not until active in the GPU roster |
| Verified active recurring GPU-minutes/month | Eligible recurring allocation integrated and active | Measured supply; compare with the provisional reference |
| Verified one-time GPU-minutes available | Current unused credits translated into measured GPU-minutes with evidence and expiry | Only for the current period; tracked separately from recurring capacity |
| Reserved GPU-minutes | Capacity reserved for running or scheduled work, according to explicit metering | Tracked separately |
| Idle allocated GPU-minutes | GPU time allocated but not completing useful work | Tracked separately |
| Completed useful GPU-minutes | Instrumented GPU allocation used to complete useful work | Tracked separately |
| Unknown or unmetered usage | Insufficient trustworthy usage measurements | Remains unknown, never silently converted to zero |

Recurring capacity values must exclude one-time credits. The aggregate engine will not convert a dollar balance, provider credit unit, CPU-hour or API call allowance to GPU-minutes without a sourced price/allocation measurement. An authenticated credential is not proof of allocation.

## Intended-use boundary

The current phase is research and development in GitHub and related development infrastructure; this is not yet a commercial service. Commercial-use rights are therefore not a qualification gate for current use. The gate is whether the provider's terms permit this specific non-commercial R&D activity, including restrictions on personal/internal use, benefit to third parties, acceptable use, data handling, automation and the intended workload.

This does not permit bypassing provider terms. If a term's application to AstroCrown R&D is ambiguous, mark the candidate BLOCKED until clarified. When the intended use changes to commercial production, every provider must be requalified. The accounting engine compares each provider's `qualification_use_mode` against the code policy's current intended-use mode; old R&D evidence cannot qualify a provider for commercial production without a new assessment.

## Fluid R&D continuity: make useful progress before completing discovery

**Operating objective:** keep AstroCrown/NOVA R&D and diverse studies moving with the smallest practical set of usable paths. Exhaustive provider discovery is not a prerequisite for starting useful work. Provider discovery is progressive and driven by an actual study, blocker or need for resilience.

The 86,400 GPU-minute figure remains only a provisional comparison reference. We do not need to reach it, prove the entire ecosystem first, or find every candidate before R&D can continue.

### Route work by what it actually needs

| R&D activity | First path to consider | Fallback / boundary |
|---|---|---|
| Design, literature review, data preparation, Python/CPU tests, documentation, small preprocessing and pipeline validation | Continue immediately in the existing GitHub/local development environment; do not wait for a GPU | Defer only the GPU-dependent segment and keep its inputs, acceptance criteria and expected outputs ready |
| Short, interactive GPU experiments and notebook-based studies | Google Colab's free notebook runtime when a suitable GPU is available; treat it as a manual, opportunistic session | Runtime availability and limits change and sessions may terminate; save work incrementally and keep experiments restartable. [Official Colab FAQ](https://research.google.com/colaboratory/faq.html) |
| Development workspace, dependency setup and code debugging | Lightning AI's free CPU Studio is a possible workspace path; prepare on CPU before any GPU allocation | Its GPU free-credit terms are unresolved in the evidence register. Use GPU only after the account confirms the actual no-card allowance and applicable terms. [Pricing](https://lightning.ai/pricing) · [AI Studio guide](https://lightning.ai/docs/overview/ai-studio/) |
| Very small hosted inference / integration smoke test | An AstroCrown-owned Hugging Face ZeroGPU Space, if the account and intended deployment qualify | The official free-account quota is 5 GPU-minutes/day with shared queueing; this is a narrow test path, not a general compute pool. Do not send sensitive prompts to community-operated Spaces. [Official ZeroGPU guide](https://huggingface.co/docs/hub/main/spaces-zerogpu) |
| Automated jobs or repeated batch studies | Keep Nosana and Modal as candidates to qualify against the actual workload | Verify account eligibility, no-card access, terms, workload fit and measured resource price before credit requests, deployment or activation |
| Kaggle notebook work | Do not rely on it yet for project work | Remain blocked until Kaggle's personal/internal-use and no-third-party-benefit terms are reconciled with the specific intended activity. [Terms](https://www.kaggle.com/terms) |

These are **candidate routes, not declarations of account access or provider approval**. A manually started notebook or free CPU workspace can be useful to R&D without being counted as verified recurring or automated GPU capacity. The operational capacity report measures a narrower question: what capacity has passed the relevant gates and can safely be relied upon for the intended operating mode.

### Progressive qualification loop

1. Choose the next concrete study and write down its compute, VRAM, data, runtime and output requirements.
2. Split CPU-capable preparation and validation from genuinely GPU-dependent work; continue the former immediately.
3. Try the lowest-friction eligible no-cost path for one bounded, replaceable, non-sensitive experiment.
4. Record the observed hardware, setup/queue time where available, runtime, interruption, result, and any eligibility/terms limit. Never infer recurring capacity from a single run.
5. If the path is unavailable or unsuitable, record the specific cause and move to the next plausible route. Do not repeat the same failed attempt without a new hypothesis or changed condition.
6. Add more providers when they remove a demonstrated study bottleneck, provide a useful independent fallback, or broaden supported workload types. Stop searching for its own sake once the current studies have workable routes; resume discovery when evidence identifies a gap.

**Continuity rule:** aim for a usable primary route and a practical alternate for each important recurring study when feasible, but never block all R&D on achieving redundancy or finishing a complete provider inventory. Preserve checkpointing, reproducible inputs and restartable jobs to reduce the cost of intermittent free resources.

## Initial provider assessment — official-source review on 13 October 2026

| Candidate | Evidence found | Accounting treatment now |
|---|---|---|
| Hugging Face ZeroGPU | Official documentation specifies 5 GPU-minutes/day for a free account and shared/queued Space access. Five minutes/day multiplied by 30 days gives a theoretical 150-minute allowance, not reserved capacity. [Official ZeroGPU documentation](https://huggingface.co/docs/hub/main/en/spaces-zerogpu) | Advertised estimate recorded as 150; **0 verified minutes counted** until account eligibility, no-card terms, current R&D terms compatibility, approved data handling, workload path and real allocation are proven. |
| Nosana | The official Credits API documents balance and free-credit eligibility/request endpoints; requests are subject to eligibility. [Credits API](https://learn.nosana.com/api/credits.html) · [Terms](https://www.nosana.com/terms-and-conditions/) | Candidate retained; account credit balance, no-card eligibility, workload pricing, recurring allowance and a real qualifying allocation remain unverified. |
| Lightning AI | The [official pricing page](https://lightning.ai/pricing) says up to 30 starter credits can yield about 80 GPU hours to start, but its FAQ says only 5 credits are issued at registration and 25 more require a card. The separate [AI Studio guide](https://lightning.ai/docs/overview/ai-studio/) conflicts, claiming 80 GPU hours and 15 credits each month after phone verification. GPU cost varies by selected GPU. | Keep the actual no-card allowance and recurrence **UNRESOLVED**. Do not count the 80-hour headline as recurring capacity; first verify the current account dashboard, no-card credit balance, selected GPU rate, terms and bounded allocation. |
| Modal Starter | The official page advertises $30 of included compute each month; that is a dollar balance across resource types, not a fixed GPU-minute allowance. The official startup page exposes a payment-method FAQ, but the retrieved evidence does not settle this account's no-card eligibility. [Pricing](https://modal.com/pricing) · [Startup program](https://frontend.modal.com/startups) | Candidate research only; no amount counted until no-card eligibility, terms, GPU rate/resource mix and tested usable capacity are documented. |
| Google Colab free | Official FAQ states that free GPU access is dynamically limited, not guaranteed, and hardware/runtime limits vary. [Official FAQ](https://research.google.com/colaboratory/faq.html) | Not counted as unattended production capacity. It may still be a manual development/test tool. |
| Kaggle notebooks | The [Terms of Use](https://www.kaggle.com/terms) restrict usage to personal, internal, non-commercial use and prohibit use on behalf of or for the benefit of a third party. | Not excluded merely for lacking commercial rights. **BLOCKED** until we determine whether this R&D activity fits the personal/internal-use and no-third-party-benefit restrictions. |
| Vast.ai | The [official FAQ](https://console.vast.ai/faq/) states that a verified credit card is required to receive test credit. | Excluded from the current no-payment-method path unless a qualifying no-card allocation is evidenced independently. |

This is an ecosystem shortlist, not a claim that every candidate is eligible for the current R&D use or currently available. Account-specific observations are still required.

## Current verified result and planning-reference status

At the latest checked operational-state observation, no GPU provider was active in **NOVA/gpu_roster.json**; Nosana and Hugging Face credentials were unconfigured. Consequently, verified active recurring capacity is **0 GPU-minutes/month** in that observation. The arithmetic difference from the provisional reference is 86,400 minutes, but it is not a target shortfall or evidence that 86,400 minutes are available or required. This is a verified-evidence accounting result, **not a claim that no other GPU capacity could exist**. See the [dedicated operational-state record](https://github.com/ACROWN-System/NOVA/blob/nova-operational-state/NOVA/health_state.json).

The actual useful GPU work completed month-to-date remains **UNKNOWN / NOT METERED**. It is not reported as zero, because no complete usage-metering source has yet been connected.

## Discoveries, decisions, unresolved items

### Discoveries

- The provisional reference can be compared against the combined contributions of eligible providers; the achievable aggregate remains unknown.
- Hugging Face ZeroGPU's free tier has a useful but small documented daily allowance; shared/queued behavior prevents treating its theoretical allowance as reserved minutes.
- Nosana's credits API exposes a balance shape and separate eligibility path; neither establishes this account's available credits by itself.
- Lightning AI's current pricing page and its AI Studio guide conflict: the pricing FAQ says 5 credits at registration and 25 additional credits only with a card, while the guide says 80 GPU hours and 15 credits each month after phone verification. Keep monthly recurrence and the no-card allowance unresolved; do not count the headline.
- Modal's included amount is dollar-denominated compute, not GPU time.
- The free-provider policy is scoped to non-commercial R&D. Kaggle's personal/internal-use and no-third-party-benefit restrictions require a use-specific check; they must not be converted into a blanket commercial-rights gate.

### Decisions

- Retain 86,400 GPU-minutes/month only as an initial provisional planning reference; permit scenario changes, revision or abandonment based on measured demand, eligible supply, cost and reliability.
- Keep advertised allowances, verified recurring capacity, one-time credit capacity, reserved/idle time and completed useful work separate.
- Never promote candidate credentials, an HTTP 200, an advertised quota, account credits or an unmeasured GPU price into verified usable GPU-minutes.
- Keep providers inactive until the external contract for the current R&D use, account eligibility, free/no-card condition, data boundary, workload path and allocation evidence pass.
- Do not require commercial-use rights during the current R&D phase; requalify providers if the intended use changes to commercial production.
- Do not send sensitive or private prompts to unapproved community-operated providers.
- Optimize for reliability through eligible provider diversity, bounded allocation tests, observed success/failure rates, queue/runtime evidence and preserved fallbacks; advertised quota alone is not a reliability signal.

### Unresolved / blocked

- Nosana's account credits, no-card eligibility, current GPU-minute cost and usable recurring allocation.
- Hugging Face account eligibility, current R&D terms/data fit for the proposed Space, the actual app's compatibility, and tested daily/monthly usable allocation.
- Lightning account eligibility and the no-card GPU-credit balance; official pricing and AI Studio documentation conflict on 5 versus 15 free credits and starter-only versus monthly 80 GPU hours. Also unresolved: selected GPU price conversion, intended-use terms, data handling, automation qualification and real allocation.
- Modal's no-card eligibility for this account, current selected-GPU costs and tested monthly capacity.
- An approved instrumented route for completed/idle/reserved GPU-minute measurements.
- The required navigation protocol/template are unavailable in the active repository tree; this limitation must not be replaced by a claim that the canonical plan workflow was followed. The 86,400-minute reference is likewise not a validated requirement; feasibility and need remain open research questions.

## Next actions

1. Verify a candidate's exact account eligibility and terms before adding credentials or activating it.
2. Run a bounded, approved allocation test for a selected workload and capture GPU type, VRAM, runtime, queue time, limits, cost, result and expiry.
3. Enter a recurring capacity observation only with a trustworthy monthly-minute amount, observation timestamp, expiry and evidence URLs. Enter one-time credits separately.
4. Re-test current capacity when evidence expires; do not count stale values.
5. Connect provider-specific usage meters before claiming completed useful GPU-minutes.
6. Update this register additively, run the full NOVA health suite, review the resulting PR, then inspect post-merge heartbeat state.

## Impact Analysis

**IF merged:** NOVA can present a consistent, auditable total over the combined provider portfolio while preventing advertised, unknown, expired, card-dependent, terms-incompatible or untested allocations from inflating the target.

**IF not merged:** Capacity will remain scattered across provider-specific observations, making it easier to confuse public allowances, credentials, dollar credits and actual usable GPU time; there will be no deterministic way to compare measured provider capacity against an explicitly provisional planning reference.

## Reliability measurement boundary

The accounting report measures evidence-qualified capacity; it does not yet calculate an empirical long-term provider reliability score. To select the most stable combination, NOVA still needs time-series measurements for API/allocator availability, successful and failed GPU allocations, queue wait, runtime interruptions, GPU type/VRAM, and workload completion. Do not claim high reliability based only on an advertised quota or a single successful allocation.

## Planning reference versus proven feasibility

The report's `planning_reference_gpu_minutes_per_month` defaults to 86,400 only to make early comparisons consistent. Its status is `PROVISIONAL_UNVALIDATED`, `planning_reference_is_requirement` is `false`, and `reference_feasibility_status` is `NOT_ESTABLISHED`. The value may be changed in the evidence register for scenario analysis without a policy-mismatch warning. Reports show a comparison against verified active capacity, not a claim that a mandatory target has failed.

Neither a reported difference nor the present lack of active providers demonstrates that the reference is achievable or unachievable. Establish feasibility only from account-eligible capacity, actual GPU allocation and workload throughput observations collected over an appropriate period. Revise or abandon the planning reference if measured demand, provider access, cost, reliability or workload needs do not support it.

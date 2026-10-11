# External Security Review Pipeline

This is a development-only, no-cost process for finding evidence—not a claim that an outside review has already happened.

## Current findings (2026-10-11)

- **Anthropic OSS Scanner:** the published service is free, but it accepts established projects with critical infrastructure/user-security impact case by case, considering factors including remote-attack exposure and dependent users/projects. The service requires a primary email in its public enrollment configuration; reports are model-generated and are not human-reviewed. AstroCrown-Web's current public evidence does not establish the required project maturity or dependent-project footprint. Enrollment is therefore **BLOCKED pending stronger eligibility evidence or written program guidance**. Do not submit an enrollment PR based only on the existence of security-sensitive experimental code.
- **CodeQL:** a free, independently operated static-analysis workflow is being added for the RSI subsystem and this pipeline. It can identify classes of source-code vulnerability but cannot establish that Docker/runner isolation is escape-proof or count as independent human approval.
- **OpenSSF Scorecard:** a free workflow is being added to assess repository-level security practices and publish SARIF findings in the GitHub Security/code-scanning view. It assesses repository posture, not the validity of the RSI sandbox and not independent human approval.
- **Human review:** still mandatory under the existing RSI policy. The separate four-gate review package stays authoritative. Automated findings are supporting evidence only.

## Official program sources

- [Anthropic OSS Scanner README](https://github.com/anthropics/oss-scanner)
- [Eligibility and service overview](https://red.anthropic.com/oss-scanner/)
- [OSS Scanner Agreement](https://red.anthropic.com/oss-scanner/terms/)
- [GitHub CodeQL code scanning availability](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning)
- [CodeQL Action releases](https://github.com/github/codeql-action/releases)
- [OpenSSF Scorecard action](https://github.com/ossf/scorecard-action)

Accessed 2026-10-11. The program owner retains discretion to accept or decline each project. The eligibility inquiry is not an enrollment and does not accept the agreement.

## Decision gates for free external analysis

1. Preserve current project and user-authorization evidence; do not claim a broad installed base or dependent projects without sources.
2. Ask OSS Scanner staff whether an early-stage but security-focused RSI subsystem is in scope before exposing a personal email in a public project config or submitting their enrollment agreement.
3. If written guidance or new evidence supports eligibility, prepare the project-specific Docker build and threat model; run the provider's own validator/build procedure before submitting its separate enrollment PR.
4. Treat any OSS Scanner report as unvalidated model-generated output. Reproduce findings, assess impact, apply and retest fixes, and do not call it independent human approval.
5. Continue repository CodeQL, OpenSSF Scorecard, and RSI CI scans in parallel. Neither changes the protected RSI readiness state.

## Reviewer prioritization: evidence score, not probability

Score each candidate from 0–5 in the six factors below. Each non-null score requires at least one dated source/evidence reference. Missing evidence remains **UNKNOWN**, not zero.

| Factor | Weight |
|---|---:|
| Demonstrated history of relevant independent reviews | 30% |
| Technical fit for the specific gate | 20% |
| Observable collaboration and follow-through | 15% |
| Alignment of professional/research incentives | 15% |
| Recent activity and evidence of availability | 10% |
| Low participation friction | 10% |

The fit score is the weighted mean of known factor ratings, normalized to 100, and is returned as rankable only when at least 70% of factor weight is evidenced. A high fit score does **not** mean a high probability of accepting unpaid work. Hard gates must be assessed separately: technical competence for the requested gate, reviewer independence/conflicts, scope agreement, and zero-cost feasibility.

Behavioral evidence to gather includes recent security reviews or accepted fixes, explicit history of voluntary contributions, response/follow-through on public technical commitments, recent activity, published engagement terms, declared interests, and the effort requested. Regional/contextual base rates may be used only where directly relevant, documented, lawful, and supported by comparable cohort data; nationality alone is not an individual prediction.

## Conversion measurement

The pipeline keeps separate stages:

1. reply given an outreach;
2. acceptance given a reply;
3. completion given scope acceptance;
4. qualified independent evidence given completion;
5. end-to-end qualified review given a closed outreach.

The calculator groups observations by both **route** and **scope** (for example, direct cold outreach for a full review versus a formal program or one-gate task). It reports observed percentages and 95% Wilson intervals only for outcomes actually known. An outreach still awaiting a reply is not counted as a failure. The end-to-end denominator includes only closed outreach attempts.

Thirty completed comparable outcomes is a minimum before even showing a historical rate as more than a low-sample descriptive result; it is **not sufficient by itself to prove calibration**. Forecasts must be recorded before outreach and checked against later outcomes using Brier score and an out-of-sample review. If comparable evidence is absent, the result is `NO_ELIGIBLE_OUTCOMES` / `NOT_TESTABLE`, not an invented percentage.

Run:

```bash
python development/audit/external-review/pipeline.py \
  --ledger development/audit/external-review/ledger.json
```

Optional candidate scoring accepts a JSON file with `candidate_id`, `factor_scores`, and optionally `hard_gates`. Example shape:

```json
{
  "candidate_id": "candidate-001",
  "factor_scores": {
    "technical_scope_fit": {
      "score": 4,
      "evidence": ["https://example.org/relevant-security-review"]
    }
  },
  "hard_gates": {
    "independence": "UNKNOWN",
    "zero_cost": "UNKNOWN",
    "gate_scope_competence": "PASS"
  }
}
```

Because the current ledger has one open outreach and no completed comparable outcomes, this tool deliberately cannot produce a calibrated conversion probability today. The user's 0.0001% assessment for the full individual pro-bono request is preserved as a **user-supplied, unvalidated sensitivity scenario**; it is not used as a training observation or propagated to other routes.

## Current status

- The first individual outreach is recorded as sent and still unresolved; this environment cannot read the user's Gmail inbox.
- OSS Scanner eligibility is unresolved and enrollment has not been submitted.
- CodeQL is an automated-analysis supplement only.
- RSI readiness must stay `INCOMPLETE`, main promotion must remain disabled, and the benchmark profile remains disabled/unapproved.

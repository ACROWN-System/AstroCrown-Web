# External Security Review Pipeline

This is a development-only, no-cost process for finding evidence—not a claim that an outside review has already happened.

## Current findings (2026-10-11)

- **Anthropic OSS Scanner:** the published service is free, but it accepts established projects with critical infrastructure/user-security impact case by case, considering factors including remote-attack exposure and dependent users/projects. The service requires a primary email in its public enrollment configuration; reports are model-generated and are not human-reviewed. AstroCrown-Web's current public evidence does not establish the required project maturity or dependent-project footprint. Enrollment is therefore **BLOCKED pending stronger eligibility evidence or written program guidance**. Do not submit an enrollment PR based only on the existence of security-sensitive experimental code.
- **CodeQL:** a free, scoped static-analysis workflow now runs against the RSI Python subsystem and this pipeline on relevant changes, weekly, and manually. It can identify classes of source-code vulnerability but cannot establish that Docker/runner isolation is escape-proof or count as independent human approval.
- **OpenSSF Scorecard:** a free workflow now assesses repository-level security practices on pushes to `main` and weekly, and uploads SARIF findings to GitHub code scanning. It assesses repository posture, not the validity of the RSI sandbox and not independent human approval.
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

## First OpenSSF Scorecard baseline — 2026-10-11

The first post-merge run completed successfully and uploaded its results: [run #38109541051](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38109541051). A successful scan means the analysis ran; it does not mean the repository received a clean result.

Important findings:

- **Main branch ruleset is incomplete.** The active `Protect main` ruleset exists and requires pull requests, blocks branch deletion and non-fast-forward updates, and requires review-thread resolution. However, its observed configuration has `required_approving_review_count: 0`, no required status checks, `require_code_owner_review: false`, `dismiss_stale_reviews_on_push: false`, and `require_last_push_approval: false`. Scorecard gave branch protection 3/10 and reported that `main` does not require approvers, code-owner review, or status checks. This is a material governance gap, not evidence of a container escape. The existing ruleset was read but not edited in this change.
- **Workflow token permissions needed a safer default.** Scorecard flagged no top-level read-only permission default in the RSI workflow and a top-level `security-events: write` permission in CodeQL. The follow-up remediation changes set the RSI workflow's default to `contents: read` and scope CodeQL's `security-events: write` to the analysis job. The candidate-retention job's narrower `contents: write`/PR write permissions remain necessary to retain a separately verified candidate and open a PR.
- **Security policy was not detected.** A repository-root `SECURITY.md` now documents private reporting options and explicit limitations.
- **Dependency update automation was not detected.** A weekly GitHub Actions Dependabot configuration is now present. It opens reviewable update PRs; it does not automatically merge them.
- **No license file was detected.** No license is being selected automatically because that choice has legal and reuse consequences and is a maintainer decision.
- **No fuzzing integration or OpenSSF Best Practices badge was detected.** Treat these as future improvement candidates, not as proof of a particular vulnerability. The repository-age warning is not actionable by changing code.
- **SAST was detected on 14 of the 30 recent commits checked by Scorecard (score 8/10).** The new CodeQL workflow will build more history over time; the score may not immediately reach 10/10.

The Scorecard job's SARIF upload completed, but GitHub's upload log emitted warnings for several report-level findings that had no associated source file path. That limitation should be kept in mind when navigating the alerts. Review the full job output and the code-scanning view rather than assuming every finding maps to a file.

### Manual GitHub settings handoff required

The available integration can inspect but cannot change repository rulesets. To close the remaining branch-governance gap, the maintainer must open [Settings → Rules → Protect main](https://github.com/ACROWN-System/AstroCrown-Web/rules/23728412) and configure required status checks for the existing RSI CI, external-review pipeline CI, and CodeQL analysis workflows. Enable dismissal of stale approvals when a new commit is pushed. Requiring an independent approver and code-owner review is desirable for security-sensitive changes, but with a single active maintainer it can intentionally prevent all merges until another reviewer is available; choose that trade-off consciously rather than silently disabling the review gate.

The workflow names are:
- `NOVA RSI Engine CI` — compile, RSI tests, immutable sandbox-image check, Docker-isolation smoke test;
- `External Review Pipeline CI` — score/ledger calculator tests;
- `NOVA RSI CodeQL Security Analysis` — scoped CodeQL analysis.

Do not claim branch protection is complete until the active ruleset itself confirms the selected checks and review settings.

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

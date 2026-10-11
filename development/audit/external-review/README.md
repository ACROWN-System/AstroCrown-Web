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

## OpenSSF Scorecard baseline and remediation — 2026-10-11

The first post-merge run completed successfully and uploaded its results: [run #38109541051](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38109541051). A successful scan means the analysis ran; it does not mean the repository received a clean result.

The follow-up run after PR #91 completed successfully and uploaded results: [run #38109929326](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38109929326). The third run, after PR #97, is [run #38110251043](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38110251043).

### Findings and what changed

- **Main branch ruleset is incomplete.** The active `Protect main` ruleset exists and requires pull requests, blocks branch deletion and non-fast-forward updates, and requires review-thread resolution. Its observed configuration has `required_approving_review_count: 0`, no required status checks, `require_code_owner_review: false`, `dismiss_stale_reviews_on_push: false`, and `require_last_push_approval: false`. Scorecard's BranchProtection check remained 3/10 and reported that `main` does not require approvers, code-owner review, or status checks. This is a material governance gap, not proof of a code vulnerability or sandbox escape. The ruleset was inspected but could not be edited by the connected GitHub integration.
- **Workflow token permissions improved.** The first scan flagged a missing top-level read-only default on the RSI workflow and CodeQL's top-level `security-events: write`. PR #91 set the RSI workflow default to `contents: read` and moved CodeQL's `security-events: write` to its analysis job. Those findings no longer appeared in the second report. RSI's write permission in the separate candidate-retention job remains deliberately narrow and is used after verified evidence to retain a candidate branch and open a PR.
- **Security-policy discoverability improved but needs another look.** The first scan reported no policy file; after adding root `SECURITY.md`, the second report detected it but scored SecurityPolicy 4/10 because it did not find a linked reporting destination. The current main branch links the direct GitHub private-vulnerability reporting form. Whether the form can receive reports still depends on the repository's private-vulnerability-reporting setting. No unverified mailbox or response-time promise is published. The third Scorecard report no longer emitted a SecurityPolicy finding.
- **Dependency update automation improved.** The first scan did not detect a dependency-update tool. After the weekly GitHub Actions Dependabot configuration was added, that finding no longer appeared in the second report. Updates still arrive as reviewable PRs; they are not auto-merged.
- **Static-analysis coverage improved.** The first report saw SAST on 14 of 30 recent commits (8/10); the second saw 22 of 30 (9/10); the third saw 27 of 30 (9/10). This is a detection metric, not a count of vulnerabilities or proof of a clean codebase.
- **Other current findings remain.** The repository has no detected license file, recognized fuzzing integration, OpenSSF Best Practices badge, or approved changesets in Scorecard's inspected window. It also reports that the repository is under 90 days old; age itself is not a code-remediation task. No license is being selected automatically because that choice has legal and reuse consequences and requires the maintainer's decision. CodeReview remains 0 (0/4 approved changesets in the latest window) and CI tests were detected on 3 of 4 inspected merged PRs (7/10 in the latest run). The sample denominator shifts as new PRs arrive, so compare context as well as raw counts.
- **SARIF source-location limitation.** Both Scorecard runs succeeded and uploaded results, but the logs warned that some report-level findings used the placeholder `no file associated with this alert` as a source URI. Some findings may therefore not link to a particular source file. Review the original job output and the GitHub code-scanning view rather than assuming every result is a line-level vulnerability.

### Manual GitHub settings handoff required

Open [Settings → Rules → Protect main](https://github.com/ACROWN-System/AstroCrown-Web/rules/23728412). The current integration can inspect rulesets but cannot mutate them.

PR #97 is now merged, and the three pull-request checks run on every PR (push triggers remain path-filtered), so their check contexts are available for selection in the ruleset. Configure these required status checks:

- `NOVA RSI Engine CI / test` — compile, RSI unit tests, immutable sandbox-image verification, Docker-isolation smoke test;
- `External Review Pipeline CI / test` — reviewer-score and conversion-ledger tests;
- `NOVA RSI CodeQL Security Analysis / CodeQL analysis (Python) (python, none)` — scoped static analysis.

Also enable dismissal of stale approvals when new commits are pushed and consider requiring the branch to be up to date before merge. Requiring an independent approver and CODEOWNERS review is desirable for security-sensitive code, but with only one active maintainer it can intentionally prevent all merges until another reviewer exists. Choose that trade-off consciously; do not claim external approval or ruleset enforcement before settings confirm it.

Do not treat the successful scan jobs as a clean report, and do not claim branch protection is complete until the active ruleset itself confirms the required checks and review settings.

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

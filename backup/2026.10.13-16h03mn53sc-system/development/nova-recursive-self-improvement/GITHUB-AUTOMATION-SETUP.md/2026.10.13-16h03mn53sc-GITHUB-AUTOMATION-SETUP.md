# GitHub PR automation setup

This guide records the administrative controls for a possible future RSI candidate-retention workflow. **Strong RSI is currently SUSPENDED**; its workflow template is outside `.github/workflows/`. Do not enable candidate retention or auto-merge until all criteria in `STRONG-RSI-STATUS.md` have been completed and human-approved. Auto-merge remains disabled by project decision.

## 1. Install a dedicated GitHub App

Create a GitHub App owned by an account allowed to install apps on ACROWN-System. Install it on **AstroCrown-Web only** initially; the workflow's installation token is explicitly repository-scoped.

Grant these repository permissions:

- **Contents: Read and write** — create the candidate branch and push its verified patch.
- **Pull requests: Read and write** — open the PR and request auto-merge.
- Keep the default **Metadata: Read-only** permission. The public-branch rules endpoint used by the auto-merge preflight requires only Metadata read access; additional Administration access is not needed.

Do not grant organization-wide or unrelated repository access. Do not place the private key in the repository, a commit, a pull-request body, an issue, or chat.

## 2. Add the RSI LLM key and GitHub App credentials

In **AstroCrown-Web → Settings → Secrets and variables → Actions**, add the RSI provider key and GitHub App credentials:

| Type | Name | Value |
|---|---|---|
| Repository secret | `GROQ_API_KEY_01` | The Groq API key for the account you authorize AstroCrown-Web to use |
| Repository variable | `NOVA_RSI_APP_CLIENT_ID` | The GitHub App's **Client ID** from its General settings |
| Repository secret | `NOVA_RSI_APP_PRIVATE_KEY` | The App private key PEM from the downloaded private-key file |

The RSI policy uses the Groq OpenAI-compatible endpoint and defaults to `openai/gpt-oss-20b`. Copy or enter the Groq key into this repository's secret settings yourself; GitHub secrets are not automatically shared across repositories. If you reuse NOVA's Groq key, usage shares the Groq account's rate limits. Do not paste the key into a commit, issue, pull request, or chat.

The workflow checks the GitHub App values without printing them. It mints a short-lived installation token, requests only AstroCrown-Web, and pins the token action to a verified immutable commit. It does not need `RSI_AI_BASE_URL` or `RSI_AI_MODEL` overrides for the protected defaults.

Set `RSI_AI_COMMERCIAL_ELIGIBILITY` to `PASS` only after you have reviewed the current provider terms, privacy/data-use conditions, and applicable commercial eligibility. Leave it unset otherwise. `RSI_BENCHMARK_COMMAND` also remains required: the protected benchmark profile is still disabled pending independent review, so do not invent a command or bypass that gate.

Do not set `NOVA_RSI_AUTOMERGE_ENABLED` yet.

## 3. Require checks on AstroCrown-Web main

The existing [Protect main ruleset](https://github.com/ACROWN-System/AstroCrown-Web/rules/23728412) already requires pull requests and resolved review conversations. Edit that ruleset and add these exact required status checks:

- `NOVA RSI Engine CI / test`
- `External Review Pipeline CI / test`
- `NOVA RSI CodeQL Security Analysis / CodeQL analysis (Python)`

Keep the existing pull-request and conversation-resolution rules. For unattended merging, a human approval requirement is optional and should be chosen deliberately; it is not equivalent to the required test and security checks.

In **AstroCrown-Web → Settings → General → Pull Requests**, enable **Allow auto-merge**.

## 4. Protect NOVA main separately

Open [NOVA repository rulesets](https://github.com/ACROWN-System/NOVA/settings/rules) and create an active ruleset targeting the `main` branch. Require pull requests, resolved review conversations, and the `NOVA Health Tests / tests` status check. Block branch deletion and force pushes. The operational-state split must remain in place so scheduled workflows can write telemetry to `nova-operational-state` rather than code on `main`.

The NOVA Health Tests workflow now runs for every pull request (without PR path filters), so its check is suitable as a required check. Do not protect `nova-operational-state` with the same PR-only rule; the heartbeat workflows need to update that data branch directly.

## 5. Do not enable automation during suspension

Strong RSI is currently `SUSPENDED`. Do not set `NOVA_RSI_AUTOMERGE_ENABLED=true`, create/activate the GitHub App credentials for Strong RSI, or move its workflow back to `.github/workflows/` as a shortcut. Keep automatic merge disabled.

Only after every requirement in [Strong RSI Status](STRONG-RSI-STATUS.md) has supporting evidence and a human explicitly approves reactivation should the preserved workflow be restored and the candidate-retention path re-verified. Even then, PR review should remain mandatory and auto-merge must remain off unless the owner separately decides otherwise after the operational-readiness decision.

## Remaining independent readiness gate

GitHub PR automation does **not** declare RSI operationally ready. `development/nova-recursive-self-improvement/rsi_policy.json` intentionally remains `INCOMPLETE`; its Strong RSI lifecycle is also `SUSPENDED`. Provider credentials, data-use/commercial eligibility, an independently approved task-matched benchmark, runtime isolation review, evidence verification, actual candidate-PR retention, effective required checks, end-to-end proof, and rollback readiness must all be verified before reactivation. Neither the readiness gate nor the benchmark requirement may be relaxed simply to make the workflow run.


## 6. Keep Weak RSI and Strong RSI separate

- **Weak RSI** remains manually triggered from the NOVA repository. It uses only the selected provider's key in NOVA's own Actions secrets and produces a report artifact with read-only permissions. It cannot modify AstroCrown-Web, execute candidate code, create PRs, or merge.
- **Strong RSI** is **SUSPENDED**. Its previous monthly workflow is preserved in `development/nova-recursive-self-improvement/suspended/STRONG-RSI-MONTHLY-WORKFLOW.yml`, outside the active Actions directory. No schedule or manual trigger is active.
- Repository secrets are scoped independently. Neither workflow copies secret values between repositories. A key must be entered by its owner in the intended repository's secret settings.
- GitHub Actions `GITHUB_TOKEN`, a dedicated GitHub App installation token, and the Codex/GitHub integration are GitHub-management authentication paths, not LLM inference-provider keys.
- Do not enable the Strong workflow or its candidate-retention automation until [Strong RSI Status](STRONG-RSI-STATUS.md) is complete and explicitly approved by a human.

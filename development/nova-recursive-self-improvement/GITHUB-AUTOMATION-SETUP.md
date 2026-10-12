# GitHub PR automation setup

This guide configures the administrative controls required before NOVA RSI may queue automatic merging. The workflow defaults to leaving a PR open. Its automatic-merge option is opt-in and includes a runtime check of effective branch rules and required check names.

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

## 5. Enable automatic merge last

After the App installation, secrets, required checks, and branch rules have been verified:

1. Set repository variable `NOVA_RSI_AUTOMERGE_ENABLED` to the string `true` in AstroCrown-Web.
2. The next successfully qualified RSI candidate will create its PR using the App token.
3. The workflow will read effective rules for `main` and refuse to request auto-merge unless a pull-request rule and all three required AstroCrown-Web checks are present.
4. If the preflight passes, GitHub auto-merge waits for the protected checks/rules to pass before merging. If the variable is unset or false, or the rule preflight cannot validate requirements, the PR remains open or auto-merge is not requested.

The variable is deliberately the final switch; do not set it before the settings above are complete.

## Remaining independent readiness gate

GitHub PR automation does **not** declare RSI operationally ready. `development/nova-recursive-self-improvement/rsi_policy.json` intentionally remains `INCOMPLETE` and keeps promotion blocked until protected benchmarks, independent evaluation, and runtime verification are complete. The bounded workflow requires its configured Groq provider secret and a reviewed benchmark. Neither the readiness gate nor the benchmark requirement should be relaxed simply to make the workflow run.

# NOVA operational-state branch

## Purpose

NOVA code and provider policy belong on main and change through pull requests. Runtime telemetry and automatic provider-health observations must not create commits on the protected code branch.

The nova-operational-state branch is a persistence channel for only these runtime paths:

- NOVA/health_state.json
- NOVA/roster.json (provider-down markers maintained by the heartbeat; current provider policy is still loaded from the current main checkout)

Do not merge this branch into main. It is not a development branch and must not be used for feature work.

## Runtime contract

Each operational workflow:

1. Runs only when the workflow ref is main.
2. Fetches the latest nova-operational-state commit.
3. Loads the persisted health state and merges only provider status=down / marked_down_at markers onto the current repository roster. Provider list, model IDs, endpoint configuration, candidate/deferred lists, and other policy data always come from the current code checkout.
4. Runs the regular health/observation operation.
5. Publishes only the two state paths to nova-operational-state, using a separate Git worktree. The workflow never commits or pushes operational changes to main.

Operational writer jobs share a concurrency group to avoid overlapping writes to the state branch. The publisher fails closed if the branch or expected JSON files are missing or malformed; it does not silently replace operational state with defaults.

## Permissions

The AI heartbeat, GPU heartbeat, and scheduled probe job require the workflow GITHUB_TOKEN contents: write permission only to update the state branch. The AI and GPU heartbeats also need issues: write to publish operational alerts. Test-only workflows use read-only permissions. No provider key values are stored in the state branch; only health observations and credential environment variable names are expected.

## Provider status recovery

An automatic permanent-failure marker is intentionally persistent. To explicitly restore a provider that is now verified to work, edit NOVA/roster.json on the nova-operational-state branch for that provider: set status to active and remove marked_down_at. Do not copy the state branch into main. A normal provider-policy change (models, URL, eligibility, or provider list) still goes through a pull request to main; the runtime loader merges the current policy with the persisted down markers so a stale state snapshot cannot undo policy changes.

## Main-branch protection sequence

After this state split is merged and operationally verified:

- Protect main against direct pushes, force pushes, and deletion.
- Require pull requests and the NOVA Health Tests check on every pull request.
- Use a GitHub App installation token for automation that creates pull requests, so downstream pull-request checks can start under the App identity instead of being held by the default GITHUB_TOKEN approval behavior.
- Enable auto-merge only after the required checks are configured and observed passing on a real pull request.

These last repository settings and App installation/secret configuration are administrative tasks that are not part of a code pull request.

# Active Plan — System Snapshot with NOVA and RSI Cycle Detection

**Status:** ACTIVE  
**Created:** 2026-10-11T05:29:34+05:30 (Asia/Kolkata)  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Working branch:** `rsi/system-snapshot-nova-2026-10-11`

## Objective

Create a new immutable `backup/<timestamp>-system/` snapshot following the existing mirror convention exactly, include the current `ACROWN-System/NOVA` repository under a clearly identified `NOVA/` root inside that snapshot, and make repeat-state comparisons practical for detecting RSI cycles such as B → C → D → B.

## Authority and evidence

- Preserve existing backup directories and all files within them without edits or deletions.
- Follow `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` and `development/Prompt-Guide.md`.
- RSI design references: `development/nova-recursive-self-improvement/README.md`, `IMPLEMENTATION.md`, and `CAPABILITY-BENCHMARK-PROTOCOL.md`.
- The referenced `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not found in the inspected default branches of AstroCrown-Web or NOVA. Strict conformance to those missing files is therefore BLOCKED; this task plan records scope, decisions, actions, and impact instead of inventing their contents.

## Scope

1. Mirror all tracked AstroCrown-Web paths outside its `backup/` directory, preserving original directory paths and the established file-as-directory plus timestamp-prefixed-file convention.
2. Mirror the full NOVA repository under `NOVA/`, preserving the NOVA repository's internal paths and applying the same file mirror convention.
3. Add a timestamped snapshot manifest recording source repositories, source commits/tree identifiers, original paths, Git blob identifiers and sizes, mirror destinations, exclusions, and a stable combined source-state fingerprint suitable for comparing later snapshots.
4. Verify the new mirror against both source trees and prove no older `backup/*-system/` path is modified.
5. Move this plan from `Active/` to `Completed/` with observed evidence and limitations after verification.

## Decisions

- Timestamp format: `YYYY.MM.DD-HHhMMmnSSc-system`, using Asia/Kolkata time.
- Do not include AstroCrown-Web's existing `backup/` directory inside the new source mirror; doing so would recurse through older snapshots and inflate or contaminate each snapshot.
- Use `NOVA/` as the explicit root for the NOVA-repository mirror. Any original `NOVA/` directory within that repository remains nested, preserving source paths.
- Keep both repository commit identities in the manifest. The combined source-state fingerprint must be independent of the snapshot's timestamped destination names and must exclude backup history and task-plan lifecycle records so a repeated operational state remains comparable.
- Do not change application code or RSI readiness/promotion policy in this snapshot-only task.

## Execution

- [x] Inspect current repository trees and the established mirror convention.
- [x] Create an isolated branch; do not write directly to protected `main`.
- [ ] Capture exact source commit/tree identifiers for both repositories.
- [ ] Generate the new mirrored snapshot and manifest.
- [ ] Verify mirrored file counts, path mappings, content identifiers, source-state fingerprint, and old-backup immutability.
- [ ] Record final evidence, move plan to `Completed/`, and open a pull request.

## Verification gates

- Every included source file has exactly one mirrored copy at the expected destination, with matching Git blob SHA and size.
- The NOVA repository mirror covers every tracked NOVA path, including dotfiles and workflow files.
- No path under any pre-existing `backup/*-system/` snapshot changes.
- Manifest records all deliberate exclusions and both source identities.
- The combined fingerprint is computed from canonical source-relative paths and content blobs, not timestamp-prefixed mirror paths; equal source states therefore produce an equal fingerprint.
- Any mismatch is BLOCKED/FAIL and must not be represented as a successful snapshot.

## Impact analysis

### IF modified

- The new snapshot preserves evidence for the current AstroCrown-Web and NOVA states.
- Source hashes and stable state fingerprint make later comparisons more reliable and allow repeated states to be recognized despite new snapshot timestamps.
- Existing snapshots remain as historical points of comparison.

### IF not modified

- NOVA remains absent from the established system backup mirror.
- RSI cycle review would have less direct evidence for determining whether apparently different passes actually returned to the same source state.
- Historical states and the diagnostic basis for a B → C → D → B loop would remain fragmented across repositories.

## Findings and limitations

- Existing backup paths use a deliberate file-as-directory layout and timestamp-prefixed file copies; the new snapshot must preserve it.
- Strict protocol/template conformance is BLOCKED because those referenced files were not found during this inspection.
- A state fingerprint enables later comparison; one snapshot alone cannot prove a cycle. Cycle detection requires recording/comparing fingerprints across multiple RSI passes.

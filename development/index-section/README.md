# Homepage Section Requirements

This directory is the active source for homepage section-specific requirements, discoveries, decisions, candidate states, unresolved items, and implementation-oriented documentation.

The homepage is decomposed into independent section documents so that requirements can be inspected, tested, refined, and implemented without recreating a second monolithic requirements file.

## Section documents

- `BACKGROUND.md`
- `HEADER.md`
- `DISCOVERY-INFORMATION-BAR.md`
- `HERO-CARDS.md`
- `MARKET-DATA-BAR.md`
- `DIRECTORY-FILTER.md`
- `DIRECTORY.md`
- `PAGINATION.md`
- `SECONDARY-NAVIGATION.md`
- `FOOTER.md`

## Source and authority

These documents are the active homepage section sources. Shared visual and interaction conventions belong in `../index-reference/`.

The historical pre-migration monolithic homepage source remains preserved in:

`backup/2026.10.04-11h43mn00sc-system/development/index-archive/HOMEPAGE-REQUIREMENTS.md`

The backup is historical provenance only. It is not an active requirements location.

## Status discipline

Preserve the distinction between approved requirements, candidates, discoveries, unresolved items, blocked verification, deferred work, rejected alternatives, and historical material.

Do not silently convert a candidate or discovery into an approved implementation requirement.

## Implementation boundary

This directory documents homepage-specific behavior and presentation. Reusable platform infrastructure such as GPU acquisition, AI media generation, NOVA orchestration, context/memory optimization, and recursive self-improvement remains in its dedicated subsystem directories.

Mobile-specific implementation remains subject to the documented responsive and verification evidence rather than being inferred from desktop requirements.

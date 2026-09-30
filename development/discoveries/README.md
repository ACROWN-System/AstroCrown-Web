# Development Discoveries and Methodology

This directory preserves development discoveries that materially affect AstroCrown Web development, auditability, operability, research, source acquisition, decision quality, prompt/workflow effectiveness, or future reuse.

It is a development knowledge archive, not a replacement for approved requirements.

## Relationship to other development records

- `development/HOMEPAGE-REQUIREMENTS.md` remains the authoritative homepage specification and contains homepage-specific requirements, discoveries, candidate states, decisions, and explicit undefined items.
- `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` remains the authoritative development and verification convention.
- This directory preserves broader or cross-cutting discoveries and methodology improvements that should remain available even when a homepage requirement is later refined, promoted, deferred, rejected, or reorganized.

A discovery stored here does not automatically become an approved requirement.

## What belongs here

Record discoveries when they materially improve one or more of:

- understanding of the system or its environment;
- research methodology;
- source discovery and acquisition;
- technical or operational feasibility;
- legal/access distinction;
- evidence quality;
- human-AI collaboration;
- prompt or workflow efficiency;
- verification methodology;
- reuse and dependency reduction;
- continuity across conversations or development stages;
- future capability or architecture.

## Preservation rule

Do not delete a discovery merely because a later approach is preferred.

When a discovery becomes outdated, contradicted, superseded, or no longer applicable:

1. preserve the original record;
2. add the newer evidence or status;
3. identify the relationship between the old and new findings;
4. preserve dates and provenance where material.

Historical knowledge may be superseded without becoming worthless.

## Status distinction

Use explicit states where applicable:

- DISCOVERY
- VERIFIED DISCOVERY
- CANDIDATE
- RESEARCH QUESTION
- UNRESOLVED
- BLOCKED
- SUPERSEDED
- REJECTED
- DEFERRED
- HISTORICAL
- FUTURE OPPORTUNITY

These statuses describe state, not quality ranking.

## Evidence rule

A discovery should identify its evidence when the evidence materially affects interpretation.

Useful provenance includes:

- source/document;
- URL or repository path;
- observed date/time;
- version/commit;
- acquisition method;
- test/reproduction method;
- limitations;
- confidence or unresolved questions.

Do not convert an observation into a stronger claim than its evidence supports.

## AI and prompt continuity

Prompt and workflow discoveries are treated as development assets because they can change the quality, completeness, efficiency, and safety of later work.

A prompt-methodology entry should preserve:

- the development problem;
- what was inefficient or error-prone;
- the discovered improvement;
- why the improvement works;
- when it applies;
- constraints or failure modes;
- reusable wording/patterns where appropriate;
- relation to existing project conventions.

The goal is to improve future work without turning one conversation-specific workaround into an unquestioned permanent rule.

## Source and acquisition continuity

Source discoveries should preserve the difference between:

- information source;
- acquisition channel;
- technical accessibility;
- provider policy;
- contractual status;
- legal status;
- downstream-use rights/constraints;
- cost;
- reliability;
- provenance.

A source can remain useful even when one acquisition route becomes unavailable.

## Intended machine use

This directory is designed to be understandable by both humans and machines.

A machine using these records should:

- preserve status distinctions;
- avoid silent inference;
- follow source provenance;
- distinguish discovery from approved requirement;
- distinguish technical failure from source unavailability;
- distinguish provider policy from applicable law;
- preserve unresolved questions;
- prefer current evidence when making current operational decisions;
- preserve historical evidence for regression and continuity;
- never infer authorization from incomplete metadata.

## Change discipline

Changes to these records should preserve historical meaning.

Avoid rewriting a discovery merely to make current prose shorter or cleaner when doing so would remove provenance, alternatives, uncertainty, rejected approaches, or reasoning that may be useful later.

# Product Development Memory — Record Governance

**Status:** Active repository policy for this subsystem  
**Version:** 1.0

## 1. Purpose and boundary

The registers preserve product-development knowledge in a form that can be reviewed, retrieved and validated. They do not replace source requirements, implementation records, audits, benchmark registries or NOVA's operational memory.

A register entry is not proof that its contents are true. Structural validation only verifies the integrity of the record and its references.

## 2. Registers and identifier namespaces

| Register | ID prefix | Purpose |
|---|---|---|
| `capabilities.json` | `CAP-` | Product capabilities and services |
| `decisions.json` | `DEC-` | Decisions, rationale, alternatives and supersession |
| `research.json` | `SRC-` | External research source records |
| `roadmap.json` | `RM-` | Work packages and dependency ordering |

IDs are stable and never reused. Titles must be unique within each register after Unicode normalization, case folding and punctuation/whitespace normalization.

## 3. Controlled states

### Capability status

- `approved` — explicit owner-approved product direction or requirement.
- `in_progress` — implementation is evidenced as underway.
- `candidate` — a proposal requiring evaluation.
- `research_required` — material evidence or feasibility research is missing.
- `deferred` — intentionally postponed.
- `blocked` — a named dependency or authority prevents progress.
- `rejected` — evaluated and not selected.
- `superseded` — replaced by a newer decision or capability record.
- `completed` — implemented and verified for the specified scope.

### Decision status

- `accepted` — accepted decision with explicit approval provenance.
- `proposed` — recommendation not yet accepted.
- `rejected` — explicitly rejected alternative or decision.
- `deferred` — held for a later decision.
- `superseded` — replaced by a newer decision linked through `supersedes`.

An accepted decision requires `owner_approval.approved=true`, approval date and a non-empty basis. Model confidence or validator success cannot substitute for owner approval.

### Research status

- `observed` — the source was inspected and the limited claim is supported by its content.
- `partial` — only part of the claim is supported or source detail is insufficient.
- `candidate` — lead or source requiring further inspection.
- `conflicting` — relevant sources disagree.
- `stale` — information requires refresh.
- `superseded` — replaced by newer research.
- `not_applicable` — source was examined and does not apply; reason must be recorded in limitations.

### Roadmap status

- `not_started`, `in_progress`, `blocked`, `completed`, `deferred`, `candidate`, `research_required`.

Roadmap priority is a scheduling label (`launch_critical`, `next`, `exploratory`), not a score. Do not use numerical rankings, weighted averages or compensating scores.

## 4. Required reasoning and evidence

Capabilities state the problem, user benefit, distinctive value, stage, repeat-use mechanism, distribution mechanism, dependencies, risks and acceptance criteria.

Decisions state context, exact decision, rationale, alternatives, consequences, both `if_modified` and `if_not_modified` impact, verification and approval provenance.

Research records state publisher, exact HTTPS URL, source type, access date, the narrow claim supported, observations, limitations, related capabilities/decisions, independence and licence note. Vendor marketing statements must be labelled as vendor statements, not independent proof.

Roadmap records state objective, referenced capabilities/decisions, dependencies, entry gates, exit criteria, blockers and supporting evidence.

Owner direction can authorize a decision but is not an external research source. Repository evidence must name an exact path or pull request. External research must refer to an existing `SRC-` record.

## 5. Promotion and history rules

- Candidate and research-required entries must not be presented as approved implementation requirements.
- An approved capability must link to an accepted decision.
- An accepted decision must contain explicit approval provenance and evidence.
- Do not silently edit the rationale of an accepted decision to reflect later thinking.
- When the context or decision changes, add a new decision with a unique ID and list the former decision in `supersedes`.
- Preserve Git history. Do not delete rejected decisions, research conflicts or important limitations to make the current direction appear cleaner.
- A completed roadmap item needs evidence and exit criteria; merge alone does not prove product functionality.

## 6. Garbage-entry and duplication controls

The validator rejects:
- duplicate JSON object keys;
- unknown fields and unsupported status values;
- missing or blank mandatory fields;
- invalid dates and non-HTTPS external source URLs;
- malformed or duplicate IDs, including non-string identifiers;
- duplicate normalized titles inside a register;
- invalid nested value types and malformed URLs without validator crashes;
- dangling capability, decision, research or roadmap references;
- approved capabilities without an accepted, owner-approved decision;
- completed capabilities or roadmap packages without repository implementation/test evidence;
- accepted decisions without owner approval and evidence;
- external evidence references to missing source records;
- orphan research entries not used by another record;
- capabilities that are not linked to any roadmap package;
- capability dependency, roadmap dependency and decision-supersession cycles, including long dependency chains without recursion-limit failures.

The validator does not decide whether a research conclusion is substantively correct or whether a feature is commercially valuable. Human and independent evidence review remains necessary.

## 7. Loop prevention

Two separate directed graphs are checked:
1. `roadmap.depends_on` — work-package dependencies.
2. `decisions.supersedes` — decision history.

Each graph must be acyclic. A cyclic roadmap cannot be scheduled; a cyclic supersession chain makes the decision history ambiguous. Cycles are hard failures, not warnings.

## 8. Regression controls

The validator is tested against intentionally malformed fixtures:
- duplicate keys and IDs;
- duplicate titles;
- unknown properties;
- invalid statuses;
- unsupported approval;
- dangling references;
- orphan source records;
- roadmap dependency cycle;
- decision supersession cycle;
- invalid URLs and dates;
- malformed value types and malformed IPv6-style URLs;
- deep valid dependency chains and completed-state evidence gates.

The same tests and validator run in GitHub Actions when this subsystem or its development index changes. Tests must not be weakened merely to accept a failing record; correct the record or update the rule with documented rationale and regression coverage.

## 9. Efficient use

- Keep detailed domain requirements in their existing subsystem.
- Store concise summaries and exact links in these registers.
- Retrieve only records related to the current task and follow references only when needed.
- Do not copy entire conversations into Git.
- Do not create records for trivial transient observations.
- Add a record only when it improves durable strategy, decision traceability, evidence, dependency clarity or future work.
- Prefer a small number of well-structured records over a large volume of speculative entries.

## 10. Verification commands

```sh
python -m py_compile development/product-memory/validate.py
python -m unittest discover -s development/product-memory/tests -p 'test_*.py' -v
python development/product-memory/validate.py
```

Only Python's standard library is required.

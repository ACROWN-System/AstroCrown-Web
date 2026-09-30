# Prompt and Workflow Methodology

## Purpose

Preserve reusable discoveries that improve the efficiency, completeness, accuracy, continuity, and auditability of human-AI development work on AstroCrown Web.

These are methodology assets, not hidden instructions and not automatic product requirements.

## Core principle

Treat the working prompt as part of the development architecture.

A prompt can determine:

- what the system inspects;
- what it preserves;
- what it assumes;
- what it verifies;
- what it treats as unknown;
- which tools or sources it considers;
- how it handles conflicting evidence;
- whether it distinguishes discovery from decision;
- whether it preserves continuity between conversations.

Prompt improvement is therefore an engineering-quality activity when it materially changes these outcomes.

## High-value workflow discoveries

### 1. Source of truth first

Before making a substantive conclusion about repository content:

**identify the authoritative source → inspect it directly → establish its current version/state → reason from that evidence**

Do not reconstruct repository state from memory when the source of truth is accessible.

### 2. Capability/tool availability before claiming impossibility

Before stating that a repository, connector, external source, or capability is unavailable:

**inspect available tools/connectors → identify the relevant action → attempt the supported route → classify the result precisely**

Distinguish:

- unavailable;
- inaccessible;
- unauthorized;
- unsupported;
- blocked;
- not found;
- temporarily failing;
- environment-limited;
- genuinely unavailable.

### 3. Research current or niche facts

When a decision depends on information that may have changed or is specialized:

**search current authoritative sources → compare sources → record date/version → preserve limitations**

Do not convert stale knowledge into current operational fact.

### 4. Preserve uncertainty explicitly

Use explicit states instead of filling gaps with plausible assumptions.

Examples:

- candidate;
- unresolved;
- blocked;
- unknown;
- not applicable;
- verified;
- superseded.

### 5. Separate discovery from approval

A useful discovery should be preserved before deciding whether it becomes:

- an approved requirement;
- a candidate;
- a design decision;
- a reusable capability;
- a rejected approach;
- a deferred opportunity.

Do not delete the discovery because the immediate implementation chooses another path.

### 6. Investigate the information objective before the preferred mechanism

When a desired capability is blocked or expensive:

**define the information objective → identify its underlying information → enumerate acquisition paths → compare sources → evaluate technical/legal/contractual status → determine whether a derived result can be constructed**

Do not let the availability of one API define the boundary of the product.

### 7. Separate legal analysis from access analysis

Treat these independently:

**What the law permits**

**What a provider contractually permits or restricts**

**What the provider technically exposes**

**What anti-automation controls permit operationally**

**What AstroCrown's runtime can actually retrieve**

A disagreement in one layer does not automatically resolve another.

### 8. Preserve provenance in synthesis

For derived information:

**source → observation → transformation → calculation → synthesis → result**

Preserve source identity, timestamps, methodology, freshness, dependencies, conflicts, and uncertainty.

### 9. Search for complementary sources, not only alternatives

When one source fails, investigate:

- original/first-party sources;
- independent aggregators;
- public archives;
- downloadable datasets;
- official filings;
- protocol-native data;
- human-verifiable public evidence.

The objective is not always to replace one provider with an equivalent provider. It may be better to combine complementary evidence.

### 10. Use evidence before optimization

Do not prematurely optimize architecture, code, data flows, prompts, or visual composition before the relevant requirement and evidence are understood.

Preserve candidates and rejected alternatives when they contain reusable reasoning.

## Prompt-efficiency pattern

For substantial work, a high-value working prompt should make the following explicit:

**Objective**

What is being solved?

**Source of truth**

Which repository/document/version is authoritative?

**Mode**

Audit only, research only, candidate analysis, or authorized implementation?

**Preservation constraints**

What must not be deleted, simplified, overwritten, or silently reinterpreted?

**Evidence expectations**

What facts require current verification?

**Tool expectations**

Which available tools/connectors should be inspected and attempted before declaring a limitation?

**Status model**

Which items are approved, candidate, unresolved, blocked, historical, deferred, or rejected?

**Decision boundary**

What may be concluded now, and what must remain open?

**Deliverable**

What exact artifact or evidence should be produced?

This structure reduces repeated clarification and prevents the working method from silently changing as the conversation grows.

## Repository continuity pattern

For a new development conversation, the working prompt should preferably identify:

- repository;
- source-of-truth files;
- relevant historical state;
- current objective;
- established conventions;
- current candidate/decision state;
- known unresolved questions;
- preservation constraints;
- allowed modification scope;
- required verification;
- next intended stage.

The prompt should not rely on the model remembering all of these from an earlier conversation when the authoritative artifact can state them explicitly.

## Handoff pattern

A substantial work handoff should preserve:

**Objective → verified facts → discoveries → decisions → assumptions → unresolved questions → risks → sources → reusable assets → methodology improvements → repository state → next actions**

This makes continuity an explicit artifact rather than a memory assumption.

## Avoided failure patterns

Do not:

- claim repository access is unavailable before inspecting available connectors;
- treat memory as more authoritative than the repository;
- silently turn a candidate into a requirement;
- silently turn a provider policy into law;
- silently turn a technical block into source unavailability;
- silently turn a legal possibility into technical authorization;
- replace unknown values with zero/neutral values;
- use source-count as a substitute for evidence independence;
- optimize for benchmark scores instead of product purpose;
- compress away rejected candidates or useful uncertainty;
- treat a research-tool failure as proof of application-runtime failure.

## Continuous methodology improvement

When a repeated problem is solved by a better workflow, record:

1. the original failure mode;
2. the observed cause;
3. the improved method;
4. evidence that the method improves the workflow;
5. applicability and limitations;
6. whether the method should become a repository convention.

A methodology improvement should remain a candidate practice until its usefulness is sufficiently established. Once established, it may be promoted into the relevant repository convention without deleting its historical origin.

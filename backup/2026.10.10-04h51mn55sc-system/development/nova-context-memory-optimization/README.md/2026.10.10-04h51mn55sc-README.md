# NOVA Context & Memory Optimization

This directory contains the development-only evaluation and integration architecture for reducing unnecessary context transmission, repeated model computation, external AI calls, and token consumption across NOVA.

The subsystem is deliberately technology-neutral at the architectural level. It evaluates and combines established memory, compression, retrieval, caching, and context-management techniques rather than defining a new memory technology.

## Purpose

NOVA should not repeatedly ask external AI systems to rediscover information that is already available in reliable local knowledge or prior verified work.

The objective is to maximize useful intelligence per:

- external AI call;
- input token;
- output token;
- local inference computation;
- repeated context-processing operation;
- unit of GPU or hosted compute.

Optimization must not reduce correctness merely to reduce token usage.

## Architectural Scope

The subsystem may evaluate or integrate:

- semantic structured compression;
- recursive or online memory consolidation;
- query-aware retrieval planning;
- hybrid semantic, lexical, and symbolic retrieval;
- context pruning and relevance filtering;
- token-budget-aware context construction;
- prompt compression;
- semantic caching;
- response/result caching;
- prefix and KV-cache reuse;
- deduplication of retrieved context;
- temporal freshness and supersession;
- provenance-preserving compression;
- multimodal memory and context optimization;
- local knowledge reuse before external AI consultation;
- efficiency measurement and regression testing.

These mechanisms solve different cost problems and should not be treated as interchangeable.

## Core Decision Principle

Use an established implementation when it satisfies the applicable requirements.

Do not invent a custom memory or compression algorithm merely because NOVA needs integration, orchestration, or project-specific policy.

A NOVA-specific layer should primarily:

1. select and configure appropriate established components;
2. define interfaces between components;
3. enforce NOVA provenance, security, governance, and freshness rules;
4. measure real effectiveness;
5. replace components when evidence shows a better candidate.

## Candidate Technology Families

The following are evaluation candidates, not approved implementation choices.

### SimpleMem

SimpleMem is a 2026 memory framework built around semantic lossless compression. Its published architecture combines Semantic Structured Compression, Online Semantic Synthesis, and Intent-Aware Retrieval Planning. The ICML 2026 publication reports improved benchmark accuracy and retrieval efficiency with substantially lower inference-time token consumption. The project is released under the MIT License.

Reference:
https://proceedings.mlr.press/v306/liu26dx.html

Repository:
https://github.com/aiming-lab/SimpleMem

Related research from the same project includes EvolveMem and Omni-SimpleMem, which extend the research direction toward self-evolving and multimodal memory.

### LLMLingua

LLMLingua is an established prompt-compression family for reducing the amount of context presented to an LLM while attempting to preserve task-relevant information. The current repository supports context-level and token-level compression controls and target-token or compression-rate approaches. It is released under the MIT License.

Reference:
https://github.com/microsoft/LLMLingua

### vLLM Automatic Prefix Caching

For NOVA-integrated or locally hosted models served through vLLM, Automatic Prefix Caching can reuse previously computed KV-cache blocks when requests share a prefix. This reduces repeated prefill computation and can improve throughput and latency. It does not reduce newly generated output tokens and therefore addresses a different cost dimension from prompt compression.

Reference:
https://docs.vllm.ai/en/latest/design/prefix_caching/

vLLM is released under the Apache-2.0 license.

### MemoryOS

MemoryOS is an alternative memory-management architecture based on hierarchical storage and dynamic movement between short-, mid-, and long-term memory. It remains a candidate reference for memory lifecycle design, but the presence of hierarchical memory alone is not sufficient reason to adopt it.

Reference:
https://aclanthology.org/2025.emnlp-main.1318/

## Memory Is Not One Thing

NOVA should distinguish at least:

- working context;
- reusable semantic knowledge;
- episodic/task history;
- decisions and governance records;
- research findings;
- provider/model knowledge;
- media-generation history;
- verification evidence;
- temporal and superseded knowledge.

The underlying storage mechanism may differ by workload. No graph database, vector database, relational database, file store, or other technology is mandated by this architecture.

## Cost Model

Efficiency measurements should distinguish at least:

### External AI cost

- input tokens transmitted;
- output tokens generated;
- number of external model calls;
- repeated calls for already-known information.

### Local inference cost

- prompt-prefill computation;
- decode computation;
- GPU time;
- GPU memory utilization;
- cache utilization.

### Retrieval/context cost

- memory items examined;
- tokens retrieved;
- tokens retained after pruning;
- duplicate tokens;
- compression ratio;
- retrieval latency.

A reduction in one metric must not be represented as an overall improvement unless the relevant quality criteria remain satisfied.

## Retrieval Decision Flow

A representative NOVA flow is:

Request
→ classify task and freshness requirement
→ inspect local memory/context
→ retrieve only relevant knowledge
→ remove duplicates and low-value context
→ determine whether evidence is sufficient
→ if sufficient, continue without unnecessary external calls
→ if insufficient, consult selected external or integrated AI participants
→ distill and evaluate new information
→ consolidate reusable knowledge
→ return the result

A request requiring fresh external information must not be answered from stale memory merely because memory is cheaper.

## Compression Rules

Compression must preserve information required for the task.

Where semantic compression is applied, retain or preserve the information necessary to reconstruct or audit:

- important facts and relationships;
- dates and temporal qualifiers;
- source/provenance information;
- uncertainty;
- contradictions;
- scope and applicability;
- decisions and their rationale where relevant;
- references to original evidence;
- supersession relationships.

A compressed representation that loses material evidence or changes meaning is a failed optimization, even when it uses fewer tokens.

## Caching Rules

Caching may include:

- deterministic or semantically equivalent request/result caching;
- retrieved-context caching;
- embedding/retrieval caching;
- prompt/prefix caching;
- local model KV caching.

Cache eligibility must consider:

- freshness;
- privacy;
- tenant/user isolation;
- authorization;
- model/version changes;
- prompt/context changes;
- provider changes;
- security risk.

Cache hits must never bypass a required freshness or authorization check.

## Commercial and Licensing Eligibility

A candidate dependency must be evaluated separately for:

- software license;
- model license;
- dataset license;
- provider terms;
- commercial-use permission;
- redistribution requirements;
- attribution requirements;
- acceptable-use restrictions;
- data-handling implications.

An open-source software license does not by itself establish that every model, dataset, hosted service, or generated output used with it is commercially permissible.

## Verification

Candidate evaluation must follow the repository development and audit convention:

Requirement
→ Candidate
→ Test
→ Evidence
→ PASS / FAIL / BLOCKED / N/A
→ Eligibility decision
→ Implementation
→ Re-test

The evaluation must not use point scores, weighted averages, or rankings as substitutes for requirement verification.

At minimum, candidate testing should consider:

- token reduction;
- answer quality / task accuracy;
- retrieval relevance;
- information loss;
- latency;
- external-call reduction;
- memory growth;
- update and supersession behavior;
- reproducibility;
- privacy and security;
- dependency complexity;
- commercial-use eligibility.

## Relationship to NOVA AI Orchestration

This subsystem is complementary to:

`development/nova-ai-orchestration/`

The orchestration layer decides how AI participants are used and how their outputs are compared, challenged, and distilled.

The context/memory optimization layer determines what information should be supplied to those participants and how previously acquired information can be reused efficiently.

Conceptually:

NOVA request
→ Context & Memory Optimization
→ selected compact context
→ NOVA AI Orchestration
→ multiple AI participants where justified
→ distillation
→ validated result
→ context/memory consolidation

## Relationship to Other Development Subsystems

GPU compute infrastructure belongs in:

`development/gpu-infrastructure/`

AI image and video generation belongs in:

`development/ai-media-generator/`

NOVA AI orchestration belongs in:

`development/nova-ai-orchestration/`

Homepage requirements remain in:

`development/index-section/`

and shared homepage reference material remains in:

`development/index-reference/`

This subsystem may consume any of those capabilities where appropriate, but it is not defined by a particular workload.

## Development Status

Status: **candidate / initial subsystem structure**

The subsystem boundary and optimization objectives are established.

No specific memory framework, prompt compressor, cache, retrieval engine, storage technology, model, provider, or algorithm is approved by this document alone.

Selection requires evidence from project-relevant tests and the repository's candidate-evaluation process.

## Core Rule

Reduce unnecessary tokens and external computation without reducing the quality, traceability, freshness, security, or reliability of NOVA's intelligence.

The objective is not minimum tokens.

The objective is **maximum useful, auditable intelligence per unit of computation and context**.

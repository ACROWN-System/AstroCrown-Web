# AstroCrown Product Strategy and Service Architecture

**Version:** 1.0  
**Recorded:** 2026-11-20  
**Status:** Initial product strategy baseline; individual future capabilities retain their own approval states.

## 1. Product identity

AstroCrown is intended to become a digital-asset intelligence and discovery ecosystem that helps people understand markets, investigate developments, monitor selected activity, conduct research and participate in an integrated knowledge community.

The product should be more than a price dashboard, a generic crypto directory or an AI chatbot placed over third-party data. Its value should come from useful services, credible information, connected research and an experience that encourages meaningful return use.

This is a strategic direction, not a claim that all listed services currently exist.

## 2. Immediate delivery priority

The owner's immediate priority remains the public AstroCrown homepage and Genesis Programme experience. These must be completed and qualified before speculative service expansion is allowed to displace them.

The canonical homepage section requirements are maintained in `development/index-section/`. Genesis wallet identity, treasury, qualifying-payment and purchase rules remain in `development/supporter-programme/` and `development/account-continuity/`. Product-memory entries do not override those files.

Keep the existing hard boundaries:
- Illustrative or stale market values must not be represented as live data.
- Mainnet Genesis qualifying payments and ACROWN purchases remain disabled until their separate gates are approved and qualified.
- Wallet connection, off-chain ownership proof, message signing and on-chain transactions are distinct actions.
- A proposed service is not implemented merely because it appears in the product strategy.

## 3. Service architecture

The six product pillars below organise the intended ecosystem. Their presence here does not make every feature approved for implementation.

### 3.1 Market Intelligence

Purpose: provide useful, source-transparent understanding of market conditions.

Candidate capabilities include the market overview, asset directory, sector comparisons, Winners & Losers, Fear & Greed Consensus, Market Signals and an evidence-linked Influence Map.

Qualification requirements:
- define each metric and ranking method;
- identify source, observation time, freshness and licensing;
- disclose missing, conflicting or illustrative data;
- preserve calculation methodology and version history;
- separate observation, correlation, hypothesis and causation.

### 3.2 Research and Discovery

Purpose: help users investigate assets, protocols, events and ecosystems beyond their quoted price.

Candidate capabilities include asset and project research, tokenomics analysis, source-linked reports, historical events, on-chain investigations and ecosystem maps.

A research conclusion must be traceable to evidence. Competing explanations, unknowns and corrections remain visible.

### 3.3 Personal Intelligence Workspace

Purpose: let users organise their research and monitor areas of interest.

Candidate capabilities include watchlists, saved investigations, personalised dashboards, alerts and read-only wallet monitoring.

Private information remains private by default. A public link or embed must never expose a private wallet, portfolio or saved research object without an explicit, scoped publishing action.

### 3.4 Blockchain Intelligence

Purpose: make on-chain activity and relationships understandable across qualified networks.

Candidate capabilities include transfer and contract activity, wallet monitoring, network and protocol comparisons, liquidity observations and evidence-linked flow analysis.

Address attribution is not identity verification. Read-only intelligence must not imply custody or transaction authority.

### 3.5 First-Party Community and Knowledge Network

Purpose: provide AstroCrown's own official environment for members, specialist communities, collaboration and governance.

The owner has approved the first-party direction. External social networks may be optional user-controlled sharing surfaces, not the authoritative AstroCrown community.

Profiles, posts, specialist groups, moderation, member contribution records and governance processes require their own approved product, privacy, security and constitutional rules. Binding council elections remain blocked until their constitutional rules are approved.

### 3.6 Developer and Integration Infrastructure

Purpose: allow other developers, researchers and authorized AI systems to consume AstroCrown capabilities.

Candidate capabilities include versioned APIs, data exports, SDKs, embeddable widgets and machine-readable or MCP interfaces.

Build these only after internal service contracts, data provenance, access scopes, licensing and quotas are stable.

## 4. Differentiation candidates

### 4.1 "Why is this moving?" evidence-linked investigations

Develop the existing Influence Map concept into an investigation experience that connects market observations with on-chain data, liquidity, protocol events, governance, news and alternative explanations.

Every node should indicate whether it is an observed fact, a correlation, an interpretation or a causal hypothesis. Each material claim should link to evidence and a timestamp. The system should actively search for counter-evidence rather than defend its first explanation.

This is a candidate product differentiator, not a guarantee that AstroCrown can infer causation.

### 4.2 Reproducible market intelligence indices

Extend the Fear & Greed Consensus and related signals only after their inputs, calculation method, weights, data coverage, versioning and historical snapshot process are defined.

The methodology should be independently reconstructable. A score without transparent inputs and caveats is not sufficient.

### 4.3 Public research and shareable dashboards

Allow users to publish selected, read-only research pages and dashboards. Each public artifact should show its author, publication/update time, sources, method and revision state.

Publishing is explicit. Private watchlists, wallets and workspace data remain private unless the user chooses to share a clearly described scope.

### 4.4 Embeddable intelligence widgets

Consider widgets that publishers can place on their own sites: selected market summaries, asset comparisons, signals or evidence maps. Attribution, timestamps, link-back, data rights, caching and quotas must be built in.

Embeddable financial widgets are already an established pattern. The opportunity is to distribute AstroCrown-owned intelligence, not to claim that embedding itself is new. See research records `SRC-0001` and `SRC-0002`.

### 4.5 Living Market Laboratory — research candidate

The proposed Living Market Laboratory would connect a bounded digital-asset ecosystem model with autonomous investigation, evidence verification, counterfactual simulation, continuous re-evaluation and a versioned public research archive.

It should not be described as globally unique. Bitquery and Nansen already publicly market overlapping AI/on-chain intelligence capabilities (see `SRC-0003` and `SRC-0004`). A deeper competitor map and hands-on capability comparison are required before any differentiation or superiority claim.

A first prototype should cover a narrow market/network perimeter and be evaluated on reproducibility, source coverage, false positives, counter-evidence, simulation validity and historical correctness.

### 4.6 Market Time Machine — research candidate

A related idea is to reconstruct what evidence was actually available at a past date, apply a strict historical information cutoff and compare the contemporaneous analysis with subsequent outcomes.

This would help detect look-ahead bias and distinguish a plausible hindsight explanation from information that was knowable at the time. It depends on retained historical source versions and accurate timestamps; feasibility is not yet established.

## 5. Adoption as a development requirement

For every major capability, the capability record should describe:
- the concrete user problem and benefit;
- why a user would return;
- how a user could share or introduce the service to another person;
- privacy and moderation boundaries;
- measurable activation, retention, sharing or referral outcomes.

Useful work should naturally be discoverable and shareable. Do not rely on fake urgency, fabricated counters, misleading popularity, guaranteed viral growth or unapproved financial incentives.

Public sharing is not mandatory for every object. Sensitive or personal information must remain under user control.

## 6. Build sequence

The current staged sequence is:

1. Complete and qualify the homepage and Genesis Programme experience.
2. Qualify market-data providers, identities, methodology, licensing and freshness.
3. Develop a bounded evidence-linked market investigation prototype.
4. Add safe public research and dashboard publishing.
5. Expand the personal workspace and read-only blockchain intelligence.
6. Complete the first-party Community Network under its separate requirements and gates.
7. Expose stable developer interfaces and embed capabilities.
8. Research and prototype the Living Market Laboratory and Market Time Machine only after their dependencies and evaluation criteria are ready.

This is a dependency-aware sequence, not a weighted score or a promise that all stages will be implemented.

## 7. Product quality principles

- Evidence before claims; preserve provenance, time and uncertainty.
- Real utility before novelty or visual spectacle.
- AI-generated output is a candidate until independently verified.
- Prefer a reliable bounded service over a fake complete ecosystem.
- Keep model providers, market-data providers and hosting adapters replaceable.
- Qualify licensing, commercial-use, quotas, no-card conditions and redistribution rights.
- Use the minimum complexity that satisfies the requirements.
- Do not introduce new dependencies before existing free and built-in options are evaluated.
- Preserve rejected alternatives and superseded decisions so the reasoning history remains understandable.

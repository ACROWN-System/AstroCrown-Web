# Cards Conventions

## Purpose

Cross-section reference index for hero-card composition, whole-card interaction, candidate cards, provenance, failure states, and historical candidate register. This is an extracted navigation aid, not a replacement for the originating subsystem requirements.

**Status rule:** extracted values retain their original status. A candidate/TBD/undefined item is not promoted merely by appearing here.

## Extracted references

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1572–1762

## R-021 — Homepage Hero Card System

### Purpose

The hero card system shall provide a compact, high-information discovery layer between the homepage information bar and market data bar. Cards shall answer high-value market questions quickly and provide direct navigation into deeper information.

Initial three-card architecture:

1. **Fear & Greed Consensus** — How does the market feel?
2. **Winners & Losers** — What is moving?
3. **Top Influences / Influence Map** — What appears to be influencing movement?

Names may be refined without changing the underlying intent.

### R-021.1 — Card Composition and Information Hierarchy

Card composition shall be determined from user task, information density, decision/action value, comprehension, retention/discovery value, interaction cost, evidence, relationship to deeper sections, and responsive constraints.

Dimensions shall not be selected solely as arbitrary viewport percentages.

Fear & Greed Consensus may receive a larger visual area where required by its gauge/speedometer and information hierarchy.

### R-021.2 — Whole-Card Interaction

Actionable cards shall behave as coherent interactive surfaces.

For navigation cards:

- the card should be the primary interaction;
- a small generic downward arrowhead may sit partly inside/partly outside the lower border;
- the arrowhead shall not create a competing destination;
- a separate large CTA shall not be introduced unless a distinct action exists;
- keyboard/assistive-technology users shall have an equivalent accessible interaction;
- hover, focus, pressed, and unavailable states shall remain distinguishable.

### R-021.3 — Fear & Greed Consensus

#### Product intent

The card shall summarize market sentiment across multiple independent sentiment sources rather than presenting one provider as the complete market view.

The principal value is the relationship among source scores, consensus, agreement, spread, and evidenced direction/trend.

#### Candidate sources

Candidate systems include Alternative.me, CoinMarketCap, CoinGecko, CFGI, and other publicly accessible sources discovered and evaluated later.

Selection depends on data availability, usage/licensing conditions, methodology transparency, update reliability, historical availability, semantic compatibility, access constraints, reproducibility, cost, security, and reuse potential.

#### Information model

Candidate displayed information includes:

- consensus score;
- classification;
- source scores;
- agreement;
- spread;
- short evidence-based insight;
- methodology access.

#### Consensus methodology

"Consensus" is intentionally undefined until evaluated.

Candidate methods include arithmetic mean, median, weighted mean, robust/normalized aggregation, or another evidence-supported method.

The selected method must account for differences in provider scales, classifications, update times, and semantic meaning. Numeric values shall not be combined merely because they are numeric.

#### Agreement and spread

Agreement and spread shall be explicitly defined before implementation. Normalization, calculation, missing-source behavior, edge cases, and tests must be established first.

#### Data integrity

The system shall distinguish, where relevant, current, stale, missing, conflicting, and insufficient source data. A missing provider shall not silently become zero or otherwise distort the result.

### R-021.4 — Winners & Losers

The card shall identify meaningful positive and negative market movers without relying on price change alone.

Preferred compact composition:

- Winners;
- Losers;
- Price Change;
- Volume Change;
- compact overlaid mini-chart.

Price Change and Volume Change should be beside the chart rather than automatically stacked when space permits.

The exact ranking methodology remains undefined pending evaluation of:

- timeframe;
- eligible universe;
- liquidity/volume minimums;
- price-change calculation;
- volume-change calculation;
- outlier handling;
- stale/missing data;
- wrapped/duplicate assets;
- update cadence.

The system shall not imply that the largest percentage move is automatically the most meaningful mover.

### R-021.5 — Top Influences / Influence Map

The card shall summarize observable market influence signals and connect them to meaningful categories/themes that users can explore further.

It shall communicate **observed influence**, not unverified causation.

Candidate dimensions include:

- Trend;
- Capital Activity;
- Derivatives;
- Whale Activity;
- ETF Flow;
- News;
- Regulation;
- Technology;
- Macro;
- Narrative.

Candidate evidence inputs include TVL growth, capital flows, whale activity, ETF activity, derivatives activity, sector rotation, narrative activity, news, and other evidence-backed signals.

These inputs are candidates, not automatic definitions. Capital Activity must not silently become TVL growth; influence must not silently become causation or correlation.

Where useful, thematic outputs should align with directory filters, for example:

- Capital Activity → DeFi;
- Technology → AI;
- News → Gaming;
- Macro → BTC;
- Regulation → Payments.

Individual tokens may be shown when they are the appropriate evidence-bearing entity, but influence should not be reduced to individual tokens by default.

The final influence model must define score/strength, evidence sources, lookback period, weighting, confidence, minimum evidence, conflict handling, and stale-data behavior before implementation.

### R-021.6 — Card Data Provenance

For all data-bearing cards:

- each externally derived value shall have an identifiable source;
- calculations shall have documented methodology;
- derived values shall be distinguishable from source values;
- relevant timestamps/freshness shall be considered;
- licensing/usage conditions shall be reviewed;
- unavailable/stale behavior shall be defined;
- source substitution shall not silently change metric meaning.

### R-021.7 — Card Failure and Boundary States

Each card shall be evaluated for applicable loading, no-data, partial-source, stale, conflicting, malformed, insufficient-data, calculation-failure, source/API-failure, delayed-update, unavailable-destination, reduced-motion, keyboard/focus, and recovery states.

Missing evidence shall not be represented as zero, neutral, healthy, or positive unless the approved methodology explicitly defines that meaning.

### R-021.8 — Card Reuse and Data Architecture

Card data should be reusable by homepage cards, market directory, analytics, research, NOVA evidence systems, and future intelligence/governance services.

Preferred pattern where justified:

**validated fetch/evidence → normalized data → reusable derived data → multiple consumers**

Reuse must not become premature centralization or complexity.

### R-021.9 — Card Explicitly Undefined Items

Remain intentionally undefined pending evidence:

- exact dimensions/ratios/width distribution;
- responsive stacking/contraction;
- typography;
- chart implementation;
- Fear & Greed aggregation/weighting;
- agreement/spread formulas;
- Winners & Losers ranking, universe, timeframe, outlier policy;
- Influence Map score, weighting, confidence, evidence threshold;
- exact source set;
- update cadence/cache policy;
- fetch architecture;
- animation;
- arrowhead geometry;
- destinations.

### R-021.10 — Card Verification

Verification shall cover, as applicable, visual hierarchy, data correctness, provenance, calculation correctness, edge/failure states, stale/missing behavior, keyboard/focus, screen-reader semantics, responsive behavior, reduced motion, destination behavior, performance, dependency/redundancy, and historical regression.


### Origin: HOMEPAGE-REQUIREMENTS.md lines 3084–3236

## Active Hero-Card Candidate and Discovery Register

### Status

**Current state:** CANDIDATE / UNDER INVESTIGATION.

This register preserves the current homepage hero-card discoveries that have been established during exploration but must not be interpreted as final approved implementation requirements merely because they are documented here.

The preferred hero architecture remains **three cards**, with each card answering a different high-value user question:

1. **How does the market feel?** → Fear & Greed Consensus
2. **What is moving?** → Winners & Losers
3. **What appears to be influencing movement?** → Top Influences / Influence Map

The three-card structure is the current preferred direction. The detailed composition, data methodology, exact dimensions, provider selection, and implementation remain subject to evidence and verification.

### Candidate Hero-Row Composition

The current design discovery is that the hero row should remain a compact horizontal discovery layer rather than a vertical stack.

Candidate visual/layout principles:

- Cards should be sized from information density, readability, user behavior, retention/discovery value, action triggers, interaction efficiency, and available viewport space rather than arbitrary equal-width percentages.
- The row should preserve meaningful background visibility toward the right side.
- A current layout target under investigation is to preserve approximately **20% or more of the desktop viewport as intentional visual space between the right edge of the final card and the viewport edge**, subject to later visual/layout verification.
- The hero-card region should retain a horizontal rounded/rectangular presentation; vertical card composition is not the current direction.
- The left edge of the card row should remain aligned with the homepage's established content geometry.
- The space retained to the right of the card row should help preserve visibility of the homepage's background/nebula composition rather than being treated as unused accidental space.

These are candidate layout discoveries and shall not be promoted to fixed pixel dimensions or final proportions until evaluated against the actual homepage composition.

### Candidate Interaction Pattern

The current preferred interaction model is whole-card interaction rather than a conventional CTA-button model.

Additional interaction discoveries to preserve:

- The entire actionable card should communicate one coherent destination/action.
- The lower arrowhead/chevron is a visual affordance associated with the card, not a separate competing CTA.
- A candidate treatment places the arrowhead partly inside and partly outside the lower card boundary, using the card's fill so that it reads as part of the card rather than as an independent button.
- The lower-border treatment may visually terminate around the crossing arrowhead rather than creating a conventional button/container separation.
- Exact arrowhead geometry, border treatment, hover/pressed/focus treatment, and responsive behavior remain undefined pending implementation-independent evaluation.
- Any visual affordance must have an equivalent accessible interaction for keyboard and assistive-technology users.

### Card 1 — Fear & Greed Consensus: Additional Candidate Discoveries

**Status:** CANDIDATE / UNDER INVESTIGATION.

Potential information hierarchy remains:

- consensus sentiment;
- individual provider observations;
- agreement;
- spread;
- evidence-based directional/change insight;
- methodology access.

Candidate source set remains:

- Alternative.me;
- CoinMarketCap;
- CoinGecko;
- CFGI;
- additional publicly accessible sources discovered during future research.

For methodology comparison, established market interfaces including **TradingView** and **Binance** may also be inspected as reference systems. Reference comparison does not make them approved data providers for the consensus calculation.

The candidate should make it possible to distinguish provider observations from the derived consensus and to inspect how provider methodologies differ.

A **$0 external-data-acquisition target** may be investigated for the prototype where technically, legally, and operationally feasible. Cost is an evaluation criterion, not a presumption that every source is free or unrestricted.

Previously discussed example numerical scores are exploratory examples only and shall not be treated as requirements, historical facts, or fixed test values unless independently verified and explicitly adopted.

### Card 2 — Winners & Losers: Additional Candidate Discoveries

**Status:** CANDIDATE / UNDER INVESTIGATION.

The current preferred compact composition remains:

- Winner information;
- Loser information;
- Price Change;
- Volume Change;
- compact line/mini-chart relationship.

Additional visual candidate:

- positive and negative mover states may use distinct semantic treatments (for example, green/positive and red/negative) supplemented by text/icon semantics so that meaning is not communicated by color alone;
- short broken separators may be used to preserve compact grouping without creating unnecessary full borders;
- a generic directional arrow may serve as a visual cue where it does not compete with the whole-card interaction model.

The exact visual treatment is not approved and remains subject to accessibility, contrast, readability, and user-task evaluation.

The ranking methodology remains explicitly undefined until timeframe, eligible universe, minimum liquidity/volume, outlier handling, duplicate/wrapped-asset handling, missing/stale-data behavior, and update cadence are established and tested.

### Card 3 — Top Influences / Influence Map: Additional Candidate Discoveries

**Status:** CANDIDATE / UNDER INVESTIGATION.

The current direction is to express **measurable influence dimensions and evidence-backed themes/categories**, not to claim proven causality.

Candidate dimensions currently preserved include:

- Trend;
- Capital Activity;
- Derivatives;
- Whale Activity;
- ETF Flow;
- News;
- Regulation;
- Technology;
- Macro;
- Narrative.

For an initial prototype, investigation may prioritize approximately **4–5 dimensions with sufficiently accessible, measurable, and reproducible data**, including a $0-cost acquisition target where feasible, rather than assuming all candidate dimensions must be implemented simultaneously.

This narrowing is a prototype investigation strategy, not a final exclusion of the remaining dimensions.

Category/theme relationships remain an important candidate because they can connect the influence system to the homepage directory taxonomy. Examples already identified include:

- Capital Activity → DeFi;
- Technology → AI;
- News → Gaming;
- Macro → BTC;
- Regulation → Payments.

Such relationships must remain evidence-bearing associations or observed influence relationships unless sufficient evidence exists for a stronger causal claim.

Individual tokens may appear when they are the appropriate evidence-bearing entity, but prominent-token selection alone must not become the definition of market influence.

### Preserved Alternative and Predecessor Candidates

The following concepts remain preserved as useful knowledge even though they are not currently the preferred standalone third hero card:

- **TVL Growth** — retained as a potential evidence input to broader capital-activity/influence analysis.
- **Sector Rotation** — retained as a potential influence/category/directory relationship.
- **Wallet / Giant Flows** — retained as a potential evidence input where sufficiently verifiable.
- **Market Drivers** — retained as a predecessor framing for the influence problem.
- **Why It's Moving** — retained as a user-question framing and explanatory objective, while avoiding an automatic causal claim.
- **Investigative / AI-assisted market analysis** — retained as a future research/intelligence opportunity or deeper destination rather than automatically increasing homepage-card complexity.

Preservation of these concepts does not imply rejection of their future use. Their status may be promoted, merged, deferred, or rejected later based on evidence and compatibility analysis.

### Candidate Promotion Safeguard

No item in this register shall become an approved homepage requirement solely because it appears in the current candidate state.

Promotion should continue through:

**Discovery → Candidate → Evidence / Research → Composition / Methodology → Compatibility → Reuse / Redundancy Analysis → Verification → Decision → Approved Requirement or Preserved Alternative → Implementation → Testing → Evidence**

This register exists to prevent loss of newly discovered homepage knowledge while preserving the distinction between **current direction**, **candidate requirement**, and **approved requirement**.


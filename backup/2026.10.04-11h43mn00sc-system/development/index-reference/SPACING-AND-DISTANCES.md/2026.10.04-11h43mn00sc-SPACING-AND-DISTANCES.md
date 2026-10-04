# Spacing and Distances

## Purpose

Cross-section reference index for spacing and distance references explicitly present in the source. This is an extracted navigation aid, not a replacement for the originating subsystem requirements.

**Status rule:** extracted values retain their original status. A candidate/TBD/undefined item is not promoted merely by appearing here.

## Extracted references

### Origin: HOMEPAGE-REQUIREMENTS.md lines 798–807

- Exact spacing and dimensional system.
- Exact interactive behaviors beyond their required outcomes.
- Mobile-specific layout behavior and device verification.
- Runtime data sources, if any homepage element will use live data.
- Exact implementation technique for each visual layer.
- Exact asset file formats, dimensions, and delivery variants until implementation comparison is performed.
- Exact final artwork composition and positioning until the desktop layout is sufficiently calibrated.

These must be resolved before the relevant implementation is built, rather than guessed during coding.


### Origin: HOMEPAGE-REQUIREMENTS.md lines 872–889

#### R-019.1 — Dimensions and Full-Width Surface

The header shall occupy approximately 59 px in height, span the full viewport width, remain visually integrated with the homepage, and remain continuously available as required by the homepage scroll model. The exact implementation mechanism is not prescribed.

#### R-019.2 — Header Visual System

The header surface shall use a new approved AstroCrown Space Blue palette color positioned between AstroCrown Deep Space Blue and AstroCrown Light Space Blue. AstroCrown Space Blue shall be distinct from both existing colors.

The header shall:

- use an opaque, non-transparent surface;
- use AstroCrown Light Space Blue for the bottom border;
- use a transparent or partially transparent treatment for the bottom border;
- provide subtle visual delimitation between header and background without excessive contrast.

The header shall use the approved AstroCrown Space Blue as its primary opaque surface. The Space Blue value must be established before implementation and must satisfy the R-005 three-level blue hierarchy and the applicable accessibility verification requirements. It must not be selected solely by name, midpoint arithmetic, or visual preference without evaluation evidence.

#### R-019.3 — Brand Elements

### Origin: HOMEPAGE-REQUIREMENTS.md lines 966–986

- have meaningful spacing from navigation and right-side controls;
- use the placeholder text "Search";
- continuously adapt its width according to available horizontal space;
- not move to another structural region or change order merely because viewport width changes;
- remain part of the right-side control group while its own width varies.

Search suggestions shall begin only after at least two entered characters.

The search system shall:

- update suggestions as the query changes;
- show no suggestions for an empty query or one-character query;
- provide selectable suggestions through mouse and keyboard interaction where suggestions exist;
- allow Tab to reach the field;
- provide the appropriate Enter action;
- allow arrow-key navigation of suggestions where applicable;
- allow Escape to close the suggestion list without unexpectedly clearing the query;
- avoid presenting fake functionality when no corresponding search system exists.
The exact runtime search source remains undefined until the search system is specified.

#### R-019.8 — Wallet Control

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1264–1298

#### Specification Baseline

The homepage information bar is a candidate homepage subsystem to be evaluated and refined as development evidence becomes available.

The following specification records the current UI intent and design baseline. It is not an immutable implementation specification. Dimensions, techniques, technologies, animation mechanisms, icon systems, content sources, and other details may be refined, replaced, merged, or rejected after compatibility, accessibility, redundancy, performance, and interaction testing.

#### R-020.1 — Position, Width, and Container

The information bar shall:

- be positioned below the homepage header;
- leave an empty space of approximately 45 px between the header and the information bar so that the underlying Space Art/background remains visible;
- span the available homepage content width;
- begin approximately 45 px from the left edge of the available content area;
- end approximately 22% of the available space before the right edge;
- have an initial target height of approximately 53 px;
- use rounded corners;
- provide a clearly identifiable container region distinct from the header and main content areas;
- remain structurally suitable for future automated and manual insertion, removal, or replacement of informational content without requiring a redesign of the homepage structure.

The exact geometry remains subject to responsive testing and implementation evaluation.

#### R-020.2 — Information Bar Surface and Border

The information bar shall use:

| Property | Specification |
|---|---|
| Background | AstroCrown Black `#050914`, with transparency |
| Outer border | Approximately 5 px |
| Border color | AstroCrown Warning Yellow `#FFD24A` |
| Corners | Rounded |

The transparency level is intentionally undefined and shall be evaluated against readability, background visibility, visual hierarchy, and accessibility requirements.


### Origin: HOMEPAGE-REQUIREMENTS.md lines 1365–1400

#### R-020.6 — Responsive Behavior Baseline

The information bar shall use a desktop-first implementation baseline.

When the viewport is shortened:

- the information bar shall remain in its established location while sufficient space exists;
- when the distance from the right side of the information bar to the viewport/content edge approaches approximately 45 px, the bar may begin reducing its size;
- size reduction shall follow available-space movement continuously where technically practical rather than relying on unnecessary abrupt state changes;
- the priority/type section and carousel section must remain structurally coherent while the bar contracts;
- content must not become unreadable, inaccessible, or unexpectedly clipped;
- the exact contraction mechanism, minimum dimensions, and breakpoint behavior remain implementation decisions.

Mobile-specific refinement shall be verified separately when appropriate device testing becomes available.

#### R-020.7 — Content Management and Future Integration

The information-bar structure shall support future informational content management without requiring structural redesign.

Candidate content sources include:

- manually authored static message definitions;
- a local JSON message feed;
- an application-managed message queue;
- an API-provided message feed;
- an existing approved application/content mechanism.

Candidate content-management patterns include:

- FIFO queue;
- priority queue;
- explicit information-type categories;
- structured message objects containing priority, type, icon, message, destination, active state, and timing metadata.

These are candidates only. A more complex content-management system shall not be introduced unless an actual operational requirement justifies it.


### Origin: HOMEPAGE-REQUIREMENTS.md lines 1500–1510

The following remain intentionally undefined pending evaluation:

- exact information-bar width calculation;
- exact spacing values after responsive testing;
- exact minimum width and height during contraction;
- exact transparency/alpha value;
- exact border radius;
- exact border width if testing demonstrates that approximately 5 px is unsuitable;
- exact priority/type section width if approximately 150 px proves unsuitable;
- exact typography;
- exact icon assets/library;

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1572–1607

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

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1730–1758

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


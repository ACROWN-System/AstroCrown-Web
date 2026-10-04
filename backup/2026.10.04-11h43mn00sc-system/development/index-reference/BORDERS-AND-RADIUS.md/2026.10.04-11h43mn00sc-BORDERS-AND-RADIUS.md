# Borders and Radius

## Purpose

Cross-section reference index for border, radius, and reusable geometry references. This is an extracted navigation aid, not a replacement for the originating subsystem requirements.

**Status rule:** extracted values retain their original status. A candidate/TBD/undefined item is not promoted merely by appearing here.

## Extracted references

### Origin: HOMEPAGE-REQUIREMENTS.md lines 878–899

The header surface shall use a new approved AstroCrown Space Blue palette color positioned between AstroCrown Deep Space Blue and AstroCrown Light Space Blue. AstroCrown Space Blue shall be distinct from both existing colors.

The header shall:

- use an opaque, non-transparent surface;
- use AstroCrown Light Space Blue for the bottom border;
- use a transparent or partially transparent treatment for the bottom border;
- provide subtle visual delimitation between header and background without excessive contrast.

The header shall use the approved AstroCrown Space Blue as its primary opaque surface. The Space Blue value must be established before implementation and must satisfy the R-005 three-level blue hierarchy and the applicable accessibility verification requirements. It must not be selected solely by name, midpoint arithmetic, or visual preference without evaluation evidence.

#### R-019.3 — Brand Elements

The header shall contain separate AstroCrown Logo and AstroCrown Title elements.

The logo shall:

- use the approved AstroCrown logo asset;
- have a target rendered height of approximately 51 px within the approximately 59 px header;
- have approximately 4 px clearance above and below within the header;
- have approximately 15–20 px clearance from the left viewport edge.


### Origin: HOMEPAGE-REQUIREMENTS.md lines 1286–1310

#### R-020.2 — Information Bar Surface and Border

The information bar shall use:

| Property | Specification |
|---|---|
| Background | AstroCrown Black `#050914`, with transparency |
| Outer border | Approximately 5 px |
| Border color | AstroCrown Warning Yellow `#FFD24A` |
| Corners | Rounded |

The transparency level is intentionally undefined and shall be evaluated against readability, background visibility, visual hierarchy, and accessibility requirements.

#### R-020.3 — Priority and Information-Type Section

The left side of the information bar shall contain a separate section, divided from the carousel section by a border approximately 5 px wide using the same AstroCrown Warning Yellow `#FFD24A` treatment as the outer border.

The separated section shall:

- have a target width of approximately 150 px;
- contain an icon and text identifying the highest-importance information currently represented by the carousel and its information type;
- remain visually distinct from the carousel content;
- use the same border dimensions and color as the outer information-bar border.

Candidate information types and associated visual treatments include:

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1401–1425

#### R-020.8 — Candidate Technologies, Patterns, and APIs

The following candidates may be evaluated against the specification baseline. Listing them does not approve their implementation.

**Layout and sizing**

- CSS Grid Layout.
- Flexbox.
- CSS intrinsic sizing.
- `min()`, `max()`, and `clamp()`.
- CSS Container Queries.
- CSS Overflow and clipping.
- CSS logical properties.

**Shape and visual treatment**

- CSS `border-radius`.
- CSS custom properties for the approved palette, semantic message colors, border width, and reusable geometry values.
- CSS transparency/alpha for the translucent AstroCrown Black surface.

**Icons**

- Inline SVG.
- Font Awesome, because `fa-dot-circle` is an explicitly identified current icon candidate.
- Existing AstroCrown icon system, if an approved reusable mechanism is found.

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1482–1509

#### R-020.10 — Candidate Evaluation Objections

The following are evaluation objections to consider, not final prohibitions:

- **jQuery:** potentially unnecessary if native HTML/CSS/JavaScript can provide the required behavior.
- **Dedicated third-party carousel library:** potentially excessive for the specialized synchronized two-region motion model.
- **React/component framework introduced solely for this bar:** potentially unnecessary if the existing AstroCrown stack already provides an adequate component mechanism.
- **Independent animation timers:** potential synchronization drift; shared timeline or equivalent coordinated state should be evaluated instead.
- **GIF or video as the primary animation mechanism:** poor fit for responsive content, accessibility control, dynamic message insertion/removal, and synchronized semantic UI state.
- **Many hard-coded responsive breakpoints:** potential duplication and abrupt layout changes where intrinsic CSS sizing could satisfy the requirement.
- **Large icon libraries when only a few icons are required:** potential overhead; Font Awesome remains a valid candidate because `fa-dot-circle` is explicitly part of the current baseline.
- **Unnecessary JavaScript resize listeners:** potential complexity when native CSS layout can provide the required adaptation.
- **Complex priority/message backend before an operational content requirement exists:** potential overbuilding.

These objections must be tested against the real repository architecture and requirements rather than treated as assumptions.

#### R-020.11 — Explicitly Undefined Decisions

The following remain intentionally undefined pending evaluation:

- exact information-bar width calculation;
- exact spacing values after responsive testing;
- exact minimum width and height during contraction;
- exact transparency/alpha value;
- exact border radius;
- exact border width if testing demonstrates that approximately 5 px is unsuitable;
- exact priority/type section width if approximately 150 px proves unsuitable;
- exact typography;

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

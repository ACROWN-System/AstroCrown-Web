# Visual Design System

## Purpose

Cross-section reference index for cross-section visual identity, hierarchy, and major surface conventions. This is an extracted navigation aid, not a replacement for the originating subsystem requirements.

**Status rule:** extracted values retain their original status. A candidate/TBD/undefined item is not promoted merely by appearing here.

## Extracted references

### Origin: HOMEPAGE-REQUIREMENTS.md lines 438–462

### R-005 — Visual system

The homepage must use the approved AstroCrown palette:

| Name | HEX | Intended semantic use |
|---|---|---|
| AstroCrown Gold | `#FFD700` | Brand identity and primary emphasis |
| AstroCrown Black | `#050914` | Deepest background |
| AstroCrown Deep Space Blue | `#081426` | Foundational deep-space environment |
| AstroCrown Space Blue | TBD | Primary dark UI surfaces, including the homepage header and navigation controls |
| AstroCrown Light Space Blue | `#16345A` | Borders, demarcation, separators |
| AstroCrown Green | `#20C878` | Positive financial state |
| AstroCrown Red | `#E5484D` | Negative financial state |
| AstroCrown Warning Yellow | `#FFD24A` | Warning, alert, caution |
| AstroCrown Warm White | `#FFF7E0` | Primary readable text |

The three blue levels form a deliberate visual hierarchy:
- AstroCrown Deep Space Blue `#081426` is the darkest blue environment layer.
- AstroCrown Space Blue is the intermediate UI-surface blue and must remain visually distinct from both adjacent blue levels.
- AstroCrown Light Space Blue `#16345A` is the lightest structural blue and is used primarily for borders, demarcation, and separators.

The AstroCrown Space Blue HEX value remains TBD until a candidate is evaluated for visual hierarchy, text/UI contrast, header use, navigation-control use, and compatibility with the established palette. It must be darker than `#16345A` and lighter than `#081426` when evaluated by the chosen color model and visual result.

Gold and Warning Yellow must remain semantically distinct.


### Origin: HOMEPAGE-REQUIREMENTS.md lines 846–860

## Palette and Header Color Decision Gate

The homepage palette and header requirements are coupled because the header introduces AstroCrown Space Blue as a required intermediate UI-surface color.

Before header implementation:
1. define candidate AstroCrown Space Blue values;
2. evaluate each candidate against AstroCrown Deep Space Blue `#081426` and AstroCrown Light Space Blue `#16345A`;
3. verify the candidate's intended header/navigation text and UI-state contrast;
4. verify that the candidate remains visually distinguishable from the adjacent blue levels at the intended rendered sizes and surfaces;
5. record the selected value and evidence in the applicable design decision/audit record.

The candidate process must not assume that the arithmetic midpoint between the two existing colors is the correct value. The selected value is a design decision derived from the required semantic hierarchy and verification evidence.

For accessibility, interactive component and state indicators must meet the applicable WCAG 2.2 contrast requirements. WCAG 2.2 identifies a 3:1 minimum for applicable non-text UI components and states, while text contrast requirements are separately applicable; visible keyboard focus must also remain discernible. The detailed accessibility verification should use the project's WCAG/WAI-ARIA references rather than treating the palette decision itself as sufficient evidence.


### Origin: HOMEPAGE-REQUIREMENTS.md lines 866–889

### R-019 — Homepage Header System

#### Purpose

The homepage header shall provide a persistent, coherent navigation and identity system while remaining compatible with the homepage scroll model, responsive desktop behavior, accessibility requirements, security baseline, minimum-code principle, and future homepage systems.

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

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1262–1298

### R-020 — Homepage Information Bar System

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

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1869–1878

## R-025 — Homepage Footer

The footer shall provide supporting navigation, identity, legal/trust information, and applicable ecosystem links without competing with primary discovery and market workspace.

Candidate information includes AstroCrown identity, navigation, legal/privacy/terms, contact/support, ecosystem links, attribution, and status/system information as applicable.

Links shall only be presented when their destination and purpose are established.

The footer shall be keyboard accessible, semantically structured, visually consistent, readable, non-redundant, and compatible with the homepage scroll model.


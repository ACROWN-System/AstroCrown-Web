# Colors

## Purpose

Cross-section reference index for named palette values, semantic color use, and unresolved color decisions. This is an extracted navigation aid, not a replacement for the originating subsystem requirements.

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


### Origin: HOMEPAGE-REQUIREMENTS.md lines 876–899

#### R-019.2 — Header Visual System

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


### Origin: HOMEPAGE-REQUIREMENTS.md lines 1290–1342

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

| Candidate type | Candidate icon/content | Candidate color | Semantic intent |
|---|---|---|---|
| High-priority negative / security | Shield icon with labels such as “Warning, Scam Alert!”, “Crypto Ban”, or “Security Warning” | AstroCrown Red `#E5484D` | High-priority negative information |
| Positive / general information | Globe icon with “Daily Information” | AstroCrown Green `#20C878` | Positive information |
| Warning / governance | Balance-scale icon with “Law & Government” or “Governance” | AstroCrown Warning Yellow `#FFD24A` | Warning, alert, caution, or governance information |

These examples are content candidates, not a fixed final content set.

The longest currently identified candidate label is “Daily Information”, at approximately 17 characters excluding the icon.

#### R-020.4 — Carousel Content Section

The remaining information-bar area shall contain the informational carousel.

The carousel section shall support at least two conceptual content states.

**Non-clickable informational content**

- contains one large “-” when no applicable message/content is available;
- uses AstroCrown Warm White `#FFF7E0` for primary readable text.

**Clickable informational content**

- contains a circular-dot indicator/icon candidate before the message;
- the current icon candidate is Font Awesome `fa-dot-circle`;
- the indicator and related message use the semantic color associated with the priority/type indicator section;
- the message text uses AstroCrown Warm White `#FFF7E0`;
- is followed by underlined “Learn more” text;
- “Learn more” uses AstroCrown Light Space Blue `#16345A` as the candidate link color;
- represents an actual accessible interactive control when it has a real destination or action.


### Origin: HOMEPAGE-REQUIREMENTS.md lines 3157–3178

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


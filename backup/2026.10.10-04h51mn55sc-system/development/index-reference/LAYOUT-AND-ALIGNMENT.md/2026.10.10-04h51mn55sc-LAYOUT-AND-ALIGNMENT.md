# Layout and Alignment

## Purpose

Cross-section reference index for homepage flow, header layout, bar positioning, card layout, and directory flow. This is an extracted navigation aid, not a replacement for the originating subsystem requirements.

**Status rule:** extracted values retain their original status. A candidate/TBD/undefined item is not promoted merely by appearing here.

## Extracted references

### Origin: HOMEPAGE-REQUIREMENTS.md lines 408–526

## Required Outcomes

### R-001 — Valid document foundation

The homepage must be a valid HTML document with:

- HTML5 document declaration.
- Explicit document language.
- Character encoding declaration.
- Responsive viewport declaration.
- Meaningful document title.

### R-002 — AstroCrown identity

The homepage must visibly establish AstroCrown identity.

The final identity treatment must use the approved AstroCrown visual identity and approved assets rather than recreating or inheriting the retired implementation.

### R-003 — Primary navigation

The homepage must provide clear access to the primary areas required by the current AstroCrown Web plan.

The navigation information architecture must be defined before implementation. Links must not be invented merely to fill a navigation bar.

### R-004 — Homepage content structure

The homepage must have a deliberate content hierarchy.

Each visible section must have an identified purpose and must contribute to the intended homepage outcome. Empty decorative sections or placeholder structures must not be added without a documented purpose.

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

### R-006 — Desktop-first implementation baseline

The first implementation target is the desktop/laptop web experience.

Responsive behavior must not be omitted from the design, but mobile-specific refinement is a later verification stage because mobile-device testing is currently unavailable.

### R-007 — Functional behavior

Every interactive element implemented on the homepage must have a defined purpose, expected behavior, destination or state change, and failure/edge condition where applicable.

No non-functional controls may be presented as functional UI.

### R-008 — Accessibility baseline

The homepage must use semantic HTML and accessible names/labels where applicable.

Keyboard access, focus visibility, text readability, image alternative text, heading hierarchy, and appropriate control semantics must be verified before completion.

### R-009 — Security baseline

The homepage must not introduce unnecessary executable code, dependencies, secrets, unsafe inline behavior, or untrusted content handling.

External dependencies must have an identified purpose and verification basis before inclusion.

### R-010 — Minimum-code principle

The implementation must use the smallest implementation that provides the required behavior and presentation.

Redundant CSS, JavaScript, listeners, dependencies, wrappers, compatibility mechanisms, or duplicate structures must not be added without an identified requirement.

### R-011 — Verification before promotion

The homepage must not be promoted from development into the regular/public website until its applicable requirements have corresponding verification evidence and unresolved blocking findings are addressed.

### R-012 — Desktop scroll model and scroll handoff

The desktop homepage must use a continuous page-scrolling model with controlled nested scrolling where a content area requires independent browsing.

For the market-directory interaction already explored and validated during development:

- The primary page/header remains fixed or otherwise continuously available while the page is scrolled.
- Sections that must remain associated with the viewport may use sticky positioning rather than becoming ordinary flowing content.
- The market directory is an independently scrollable content region when its contents exceed its defined desktop workspace.
- Scrolling inside the market directory must remain confined to that directory while it has scrollable content in the requested direction.
- When the directory reaches the relevant scroll boundary, continued user scrolling must hand off naturally to the surrounding page rather than trapping the user inside the nested region.
- The transition between the nested directory scroll and normal page scroll must not require a special control or an artificial page-jump.
- The desktop scroll model must preserve normal browser scrolling and must not depend on a visible page scrollbar as the only indication that the page can be scrolled.
- The exact implementation mechanism is not prescribed; the requirement is the resulting interaction behavior.

This requirement describes the validated interaction pattern as a whole: fixed header, sticky section elements where required, nested scroll container, and scroll handoff. It does not prescribe element-by-element animation or movement.

### R-013 — Scrollbar presentation

The homepage may visually hide the primary page scrollbar while preserving normal page scrolling.

If the page scrollbar is hidden, the following must remain true:

- Page scrolling remains functional with standard desktop input methods.
- Nested scroll regions remain independently usable where required.
- Hiding the scrollbar must not disable, trap, or materially obscure scrolling.
- The visual treatment must not be used as a substitute for defining the underlying scroll behavior.

This is a presentation requirement only; it does not require a particular CSS or JavaScript mechanism.


### Origin: HOMEPAGE-REQUIREMENTS.md lines 866–1072

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

The header shall contain separate AstroCrown Logo and AstroCrown Title elements.

The logo shall:

- use the approved AstroCrown logo asset;
- have a target rendered height of approximately 51 px within the approximately 59 px header;
- have approximately 4 px clearance above and below within the header;
- have approximately 15–20 px clearance from the left viewport edge.

The logo and title shall remain semantically distinct elements and shall not be implemented as one combined button solely for convenience.

#### R-019.4 — Coordinated Brand Controls

The AstroCrown Logo and AstroCrown Title shall each be independent navigation controls to the same destination.

Only the control actually activated by the user shall perform its navigation action. Activation of one control must not cause the other control to perform a second navigation action.

The two controls shall nevertheless behave visually as one coordinated brand interaction area:

- pointer entering either control shall place both controls in coordinated hover presentation;
- pressing either control shall place both controls in coordinated pressed presentation;
- releasing while the pointer remains over either control shall return both controls to coordinated hover presentation;
- releasing after the pointer has left the combined interaction area shall return both controls to normal presentation;
- leaving the combined interaction area shall return both controls to normal presentation.

The required state sequence may therefore be Normal → Hover → Pressed → Hover → Normal.

Keyboard focus and activation must remain individually accessible and must not depend on pointer hover.

#### R-019.5 — Primary Navigation

The initial navigation order shall be:

1. AstroCrown Logo
2. AstroCrown Title
3. Markets & Data
4. Swap & Trade
5. Wallet Tracker
6. Token Studio
7. NOVA
8. ... (More)
9. Adaptive Search width
10. Avatar
11. Wallet
12. approximately 15–20 px right clearance

The navigation buttons shall:

- use the same approved AstroCrown Space Blue surface as the header unless a later requirement explicitly establishes a distinct navigation-surface color;
- have approximately 49 px height;
- have width greater than 49 px;
- use a rounded-corner rectangular form;
- remain structurally ordered unless a later approved requirement changes the information architecture;
- have real destinations or defined state changes before being presented as functional controls.

Each primary navigation item shall include a small downward arrow indicating its expandable menu state.

#### R-019.6 — Navigation Dropdown Behavior

Each expandable navigation control shall open its associated menu when activated, close it when activated again, close an already-open menu when another navigation menu is opened, close on an appropriate outside interaction, close on Escape, return focus appropriately after closure, expose its open/closed state accessibly, and remain keyboard usable.

Hover-only menus shall not be required unless a later approved requirement explicitly introduces one.

#### R-019.7 — Search

The Search control shall be a right-side header element.

The conceptual header geometry shall be:

Logo | Title | Navigation | adaptive Search width | Avatar | Wallet | approximately 15–20 px right clearance

The Search element shall:

- remain in a fixed structural position relative to Avatar and Wallet;
- remain ordered between Navigation and Avatar;
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

Wallet shall be an interactive H1-style header control in the right-side control group.

When disconnected, it shall display the generic "Wallet" identity.

When connected, it shall transform to display the selected wallet logo and/or wallet identity within the same right-side region.

When wallet integration exists, activation of the connected wallet control shall expose applicable wallet actions.

The exact wallet provider, integration protocol, and runtime state-management mechanism remain undefined until evaluated.

#### R-019.9 — Avatar Control

The Avatar shall be a persistent right-side interactive control.

The Avatar shall:

- have fixed size and allocated space;
- remain in the right-side group;
- have an accessible name;
- be keyboard accessible;
- expose visible keyboard focus;
- open the associated account/user menu when the applicable account system exists;
- close its menu on Escape;
- close on an appropriate outside interaction.

Exact authentication, account, identity, and menu semantics remain undefined until the relevant systems are specified.

#### R-019.10 — Header Interaction States

Primary navigation buttons shall provide:

- a normal state;
- a hover state in which the button and content become slightly larger;
- a pressed state in which the button and content become smaller;
- release behavior returning to hover when the pointer remains over the control;
- release behavior returning to normal when the pointer is no longer over the control.

The visual transition must remain usable and must not interfere with keyboard focus or accessible activation.

Sound effects are a candidate behavior rather than an automatic implementation requirement. A push-effect sound and mechanical-release sound may be evaluated, but audio must first be assessed for browser autoplay restrictions, user preferences, accessibility, reduced-motion/reduced-distraction considerations, latency, and whether it provides sufficient value to justify implementation.

#### R-019.11 — Continuous Adaptive Header Space

The desktop header shall use continuous horizontal space negotiation rather than abrupt sequential disappearance of navigation controls wherever the required behavior can be achieved without hard viewport-state switching.

The protected geometry shall be:

Logo | Title | Navigation | adaptive Search width | Avatar | Wallet | approximately 15–20 px right clearance

Protected invariants are:

- Logo size;
- Logo allocated surrounding space;
- Avatar size;
- Avatar allocated surrounding space;
- Wallet size;
- Wallet allocated surrounding space;
- Wallet approximately 15–20 px from the right viewport edge;
- structural position of Search relative to Avatar and Wallet.

The Search field is the adaptive-width element of the right-side group.

The navigation corridor shall adapt continuously as available width changes. Navigation controls should retain normal dimensions while progressively leaving the visible navigation region through continuous spatial displacement or occlusion rather than abrupt one-at-a-time removal wherever technically practical.

When the navigation corridor is exhausted, the AstroCrown Title may progressively slide beneath or behind the Search region as necessary. The Logo shall remain protected.

Exact breakpoints, clipping boundaries, layering order, and mechanism remain implementation decisions to be evaluated.

The preferred evaluation order is to investigate native browser layout and rendering mechanisms before introducing JavaScript viewport measurement or manual responsive state management.

#### R-019.12 — Accessibility

The header shall use semantic HTML and appropriate control semantics and provide accessible names, keyboard access, visible focus indication, appropriate expanded/collapsed state communication, appropriate relationships between controls and menus or suggestion lists, readable text, sufficient visual distinction, and behavior that does not depend exclusively on hover.

The final implementation shall be verified against the applicable accessibility requirements and external references established by this document and the project audit convention.

#### R-019.13 — Scroll Integration

The header shall remain compatible with R-012 and R-013.

It must not disable normal page scrolling, create unintended nested scroll regions, interfere with market-directory scroll handoff, create an artificial page jump, or require visible page-scrollbar presentation for basic scrolling.

Any sticky/fixed behavior must be evaluated together with the established desktop scroll model.

#### R-019.14 — Minimum-Code and Native-Behavior Principle

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1262–1380

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

The exact icon library, icon asset, link destination model, and content schema remain implementation candidates.

#### R-020.5 — Synchronized Carousel Motion

The current motion baseline is:

- content enters from the right;
- moves toward the center;
- stops for approximately 3 seconds;
- moves toward the left;
- the cycle repeats with the next applicable content.

The priority/type element and carousel element shall operate as one coordinated presentation:

- both enter their respective fields at the same time;
- both stop at the center of their respective fields at the same time;
- both begin leaving their respective fields at the same time;
- both disappear from their respective fields at the same time;
- synchronization must not depend on independent timers that can progressively drift apart.

Exact movement distance, duration, easing, timing offsets, and implementation mechanism remain candidates for evaluation.

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

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1787–1858

## R-023 — Homepage Working Market Directory

### Purpose

The working section shall provide the primary market exploration and action workspace.

### Required structure

Current architecture:

Filter Bar → Directory ID Bar/Header → Directory Pages / Market Views → Pagination

Discovery content and the working market workspace shall remain clearly distinguishable.

### Filter taxonomy

Current candidate taxonomy:

- All;
- AI;
- Gaming;
- Meme;
- RWA;
- DePIN;
- Stable.

### Filter intelligence

Where reliable data supports it, filters may expose compact market intelligence such as AI ▲ +8%, Gaming ▼ -2%, Meme ▲ +12%, RWA ▲ +1%.

Such values require defined timeframe, universe, methodology, and source before implementation.

Filter intelligence may be reused by Influence Map, sector analysis, analytics, research, and NOVA evidence systems.

### Directory row information

Candidate/required fields include:

- pin;
- favorite;
- row number;
- token logo;
- symbol;
- name;
- price;
- selected reference-device/currency value;
- 1h/24h/7d change;
- market cap;
- 24h volume;
- circulating supply;
- price-line chart;
- buy;
- sell.

A row click shall navigate to the corresponding token/market section where such a destination exists.

### Reference device and market execution

The selected reference device/currency shall affect displayed price and percentage interpretation consistently.

The NOVA Meta-DEX & Swap concept may expose lowest buy offers, highest sell demand, DEX/swap sources, estimated gas, and paymaster estimates.

Execution-related data shall not be presented as guaranteed executable pricing unless current availability is verified.

### Directory scroll integration

The directory shall conform to R-012/R-013: nested scrolling remains usable, does not trap users, hands off naturally at boundaries, preserves page/header behavior, and works with standard desktop input methods.

### Directory explicitly undefined

Exact layout, row height, columns, sorting, pagination, filtering, search, provider architecture, real-time model, execution integration, chart implementation, and mobile layout remain undefined.


# Homepage Header

## Migration status

Active subsystem requirements document created from the pre-migration homepage requirements. The historical source remains preserved verbatim in `backup/2026.10.04-11h43mn00sc-system/development/index-archive/HOMEPAGE-REQUIREMENTS.md`.

This document preserves source material and does not promote candidates, discoveries, or undefined items into approved requirements.

## Source material

### Source excerpt: lines 846–865

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

## Design Constraint

The homepage should be developed from this requirement baseline and its test definitions. Existing pre-reset website code is reference/recovery material only and must not become an implicit requirement source.



### Source excerpt: lines 866–1261

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

The header shall use the smallest implementation that satisfies the complete header requirements.

Before introducing custom JavaScript, evaluate whether required behavior can be achieved through existing browser capabilities, semantic HTML, CSS layout, CSS state selectors, native controls, or another already-approved mechanism.

Avoid duplicate responsive systems, duplicate interaction-state systems, unnecessary resize listeners, unnecessary event listeners, duplicate dropdown mechanisms, duplicate search mechanisms, unnecessary dependencies, speculative abstractions, and compatibility code without a demonstrated requirement.

#### R-019.15 — Reuse and Cross-System Integration

Header implementation shall be evaluated for reuse with:

- homepage visual system;
- approved color system;
- site typography system;
- existing interaction-state patterns;
- existing dropdown patterns;
- existing search patterns;
- wallet integration;
- account/avatar interaction;
- established desktop scroll model;
- future homepage sections.

A new mechanism should not be introduced when an existing approved mechanism provides the required outcome adequately.

A new mechanism may be introduced where it provides a demonstrated simplification, compatibility improvement, requirement improvement, redundancy reduction, or other meaningful advantage.

#### R-019.16 — Candidate Technologies and Patterns for Future Evaluation

The following are candidates only and are not implementation decisions.

**Structure and layout**

- Semantic HTML header, nav, button, form, input, and related elements.
- CSS Flexible Box Layout (Flexbox).
- CSS Grid Layout.
- CSS intrinsic sizing.
- min-width, max-width, flex-basis, flex-grow, and flex-shrink.
- min(), max(), and clamp().
- CSS Overflow Module.
- CSS logical properties.
- CSS Container Queries.
- CSS clipping and layering.

**Interaction state and coordinated brand controls**

- :hover.
- :active.
- :focus-visible.
- :has().
- Shared parent state.
- Pointer Events API.
- Event delegation.
- Minimal DOM state classes where native state cannot satisfy the requirement.

**Navigation menus**

- Native semantic disclosure structures.
- HTML details/summary.
- HTML Popover API.
- WAI-ARIA Disclosure Pattern.
- WAI-ARIA Menu Pattern where genuinely applicable.
- Minimal JavaScript state management where native mechanisms are insufficient.

**Search**

- Native HTML input/form behavior.
- datalist where its behavior satisfies the requirement.
- WAI-ARIA Combobox Pattern.
- Custom suggestion list where required.
- Keyboard interaction using native or minimal event handling.
- Appropriate query-update strategy where live data is introduced.

**Wallet and account state**

- Native control state where applicable.
- Explicit disconnected/connected UI state.
- Wallet provider APIs and standards once a concrete integration requirement exists.
- Shared account-menu mechanisms where applicable.

**Responsive adaptation**

- Flexbox intrinsic sizing and shrinking.
- CSS overflow and clipping.
- CSS layering.
- Container Queries.
- Media Queries only where a discrete breakpoint is genuinely required.
- JavaScript resize/viewport measurement only if native layout cannot satisfy the observable requirement.

**Motion and audio**

- CSS transitions/animations.
- prefers-reduced-motion.
- Web Audio API.
- HTML media mechanisms.
- User-initiated audio playback.

Each candidate must be evaluated against the actual requirements, compatibility, accessibility, security, code size, reuse, maintainability, and interaction with other selected techniques before implementation.

#### R-019.17 — Explicitly Undefined Header Decisions

The following remain intentionally undefined until candidate evaluation and evidence are completed:

- Exact AstroCrown Space Blue HEX value, subject to the R-005/R-019 hierarchy and accessibility evaluation.
- Exact logo asset/version.
- Exact typography family selections from the approved candidate families.
- Exact font delivery mechanism.
- Exact button widths.
- Exact navigation menu contents and destinations where not yet established by the information architecture.
- Exact search data source.
- Exact wallet provider/integration.
- Exact authentication/account system.
- Exact avatar asset/state source.
- Exact responsive contraction/occlusion mechanism.
- Exact clipping and stacking order.
- Exact breakpoint use, if any.
- Exact audio implementation and whether audio is ultimately retained.
- Exact animation duration/easing values.
- Exact implementation mechanism for each interaction.
- Exact external dependencies, if any.

These decisions must be evaluated rather than guessed during implementation.

#### R-019.18 — Header Verification Requirements

Header implementation shall be verified against at least:

- approximately 59 px rendered height;
- full viewport-width coverage;
- approved three-level blue hierarchy and header/background color relationship;
- sufficient text and UI-control contrast for the selected Space Blue surface;
- bottom border treatment;
- logo size and placement;
- separate Logo and Title controls;
- coordinated Logo/Title interaction states;
- independent navigation activation;
- navigation order;
- menu open/close behavior;
- keyboard navigation;
- search placeholder;
- two-character suggestion threshold;
- search suggestion interaction;
- wallet disconnected state;
- wallet connected state when integration exists;
- avatar interaction;
- normal/hover/pressed/release states;
- continuous adaptive horizontal behavior;
- protected Logo, Avatar, Wallet dimensions and allocated spaces;
- fixed Search structural position relative to Avatar and Wallet;
- adaptive Search width;
- Title occlusion behavior when required;
- absence of abrupt one-at-a-time navigation disappearance where continuous adaptation is achievable;
- page-scroll integration;
- market-directory scroll regression;
- accessibility behavior;
- security and dependency review;
- minimum-code review.

Verification shall record viewport dimensions, relevant input sequence, observed result, and evidence where the behavior is visual or interaction-dependent.

#### R-019.19 — Header Benchmark and External Evaluation Targets

The header shall be evaluated as part of the homepage against applicable external quality references rather than creating duplicate metrics where those references already provide sufficient coverage.

Applicable references may include:

- Lighthouse for performance, accessibility, SEO, and best practices;
- Chrome UX Report / Core Web Vitals for real-user performance where sufficient public data exists;
- WCAG and WAI-ARIA guidance for accessibility;
- OWASP ASVS for applicable web-security controls;
- browser behavior and compatibility references for supported desktop browsers;
- established reference systems for comparable header, navigation, search, and account interactions.

Header-specific internal benchmarks should be created only where an external reference does not adequately measure an AstroCrown-specific requirement, such as coordinated Logo/Title interaction or the continuous adaptive-space model.

#### R-019.20 — Header Reuse and Redundancy Audit

Before final implementation and before promotion, the header shall be reviewed to determine whether:

- more than one mechanism performs the same interaction;
- more than one responsive system controls the same space;
- more than one dropdown mechanism exists without a requirement;
- more than one search mechanism exists without a requirement;
- more than one source of truth controls a header state;
- an existing homepage mechanism could replace newly introduced code;
- a newly introduced mechanism can simplify another homepage system.

Any intentional duplication must have a documented requirement or technical justification.



# Interaction Conventions

## Purpose

Cross-section reference index for scroll behavior, header interaction, synchronized information-bar motion, whole-card interaction, failure states, and cross-cutting interaction constraints. This is an extracted navigation aid, not a replacement for the originating subsystem requirements.

**Status rule:** extracted values retain their original status. A candidate/TBD/undefined item is not promoted merely by appearing here.

## Extracted references

### Origin: HOMEPAGE-REQUIREMENTS.md lines 497–526

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


### Origin: HOMEPAGE-REQUIREMENTS.md lines 899–1058


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

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1322–1365

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

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1586–1607

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

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1724–1759

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

### Origin: HOMEPAGE-REQUIREMENTS.md lines 2625–2659

## R-030 — Homepage Security and Supply-Chain Baseline

The homepage shall minimize executable code/dependencies; avoid client-side secrets; safely handle untrusted external data; avoid unsafe HTML insertion; use secure external-resource practices; review third-party dependencies/scripts and their trust implications; avoid unnecessary network destinations; preserve appropriate browser security controls; consider CSP and related controls when supported by deployment architecture; undergo applicable OWASP ASVS verification; and integrate applicable NIST SSDF practices.

Controls shall be determined by actual architecture rather than mechanically copied from an external standard.

## R-031 — Browser Compatibility and Progressive Degradation

The homepage shall identify its supported desktop browser baseline before release.

Prefer broadly supported platform capabilities when they adequately satisfy requirements.

Advanced capabilities require compatibility evaluation and, where appropriate, graceful degradation. Essential content/navigation must not silently break in supported environments.

Mobile refinement remains a later verification stage where device access is available, but desktop architecture shall not unnecessarily obstruct later responsive adaptation.

## R-032 — Search, Account, and Wallet Trust Boundaries

Where search, avatar/account, or wallet controls exist:

- purpose shall be defined;
- disconnected/loading/connected/unavailable/error states shall be distinguished where applicable;
- authentication/account state shall not be inferred from visual presentation;
- wallet UI shall not imply connection/signing authority without actual provider state;
- external search data shall have an identified trust boundary;
- external wallet/provider scripts require dependency/security evaluation.

These controls remain governed by R-019.

## R-033 — Motion, Animation, and Timing Integrity

All animation shall have a product/communication purpose.

The implementation shall support reduced-motion preferences, avoid unnecessary continuous motion, avoid obscuring essential information, avoid timing drift where elements form one coordinated presentation, avoid independent timers where a shared state/timeline is required, verify normal/reduced-motion states, and preserve usability when motion is reduced or disabled.


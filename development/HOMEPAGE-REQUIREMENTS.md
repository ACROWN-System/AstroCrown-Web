# AstroCrown Homepage Requirements — Development Baseline

## Purpose

Define the minimum auditable requirements for the AstroCrown homepage before substantive implementation begins.

This document defines requirements, not implementation. A requirement may be refined when new evidence appears, but implementation must not be used to silently invent missing requirements.

## Scope

Target: `index.html` / AstroCrown homepage.

Current implementation baseline: minimal HTML foundation in `development/index.html`.

Primary development environment: `development/`.

Regular/public website remains at the repository root and is not changed by this specification.


## Requirement, Evaluation, Reuse, and Benchmark Framework

### Purpose of This Framework

This document is the single source of truth for the requirements of the AstroCrown homepage.

It supports definition of required outcomes, coherent development of the complete homepage as one system, candidate evaluation, reuse analysis, compatibility analysis, external standards, benchmarks, audit expectations, implementation decisions, testing, and verification evidence.

The document remains implementation-neutral where an implementation decision has not yet been evaluated. Naming a technology or technique as a candidate does not approve its use.

### Development Decision Model

Homepage development follows:

Requirement
→ Existing solution / standard / benchmark review
→ Candidate techniques
→ Compatibility and interaction analysis
→ Reuse and redundancy analysis
→ Evidence-based decision
→ Implementation
→ Automated verification
→ Manual verification
→ Security and quality verification
→ Evidence
→ Re-test
→ Promotion

A later implementation may replace an earlier candidate or decision when evidence demonstrates that a simpler, more compatible, less redundant, or otherwise better-aligned solution satisfies the approved requirements.

### Reuse and Redundancy Prevention Principle

Reuse is preferred but is not mandatory.

Existing browser capabilities, standards, benchmarks, technologies, components, behaviors, audits, tests, and processes should be reused when they adequately satisfy the applicable requirements.

A new solution may be introduced when evidence indicates that it:

- simplifies the system;
- provides the same required outcome with less code or complexity;
- improves requirement coverage;
- improves compatibility;
- improves accessibility;
- improves security;
- improves maintainability;
- increases useful reuse;
- reduces total redundancy; or
- otherwise better satisfies approved AstroCrown requirements and needs.

The objective is not maximum reuse. The objective is the simplest, most compatible, least redundant solution that best satisfies the approved requirements.

Before adding a new requirement, benchmark, audit, test, technology, dependency, component, behavior, or process, determine whether an existing approved item already satisfies the same objective.

If an existing item is sufficient, prefer reuse, reference, extension, or integration rather than creating a duplicate.

### Requirement and Subsystem Structure

Future homepage requirements should be organized into coherent subsystems. Each major subsystem should, where applicable, contain:

1. Purpose
2. Requirements
3. Candidate Technologies, Patterns, and APIs
4. Reuse Opportunities
5. Compatibility and Interaction Considerations
6. Industry and External Benchmark References
7. Evaluation Criteria
8. Audit and Verification Requirements
9. Decisions
10. Test Requirements
11. Implementation Status
12. Explicitly Undefined Items

This structure is intended to make future additions predictable without forcing every subsystem to contain sections that do not apply.

### Candidate Evaluation Rule

Candidate technologies and techniques listed in this document are evaluation candidates, not implementation decisions.

Candidate evaluation follows the project's established audit convention:

Requirement → Candidate → Test → Evidence → PASS / FAIL / BLOCKED / N/A → Eligibility decision → Implementation → Re-test

Mandatory criteria remain eligibility gates.

No point score, weighted average, ranking, or tier may substitute for verification.

When several candidates satisfy all mandatory criteria, selection should be based on documented evidence and the approved requirements, including simplicity, compatibility, accessibility, security, performance, maintainability, reuse potential, and unnecessary complexity.

### External Benchmark Inheritance Principle

External benchmarks and professional standards should be referenced rather than duplicated when they already evaluate the applicable quality attribute or requirement adequately.

An internal AstroCrown benchmark should be introduced primarily where:

- no suitable external benchmark exists;
- an external benchmark does not cover an AstroCrown-specific requirement;
- an external benchmark measures an outcome but not an architectural or development property that matters to AstroCrown; or
- an additional internal measure is necessary to connect several requirements into a project-specific engineering control.

The purpose is to avoid evaluation redundancy just as the project avoids implementation redundancy.

### Benchmark Categories

#### Public Ranking and Discovery Platforms

Reference candidates include:

- CoinGecko — cryptocurrency and exchange rankings/listings: https://www.coingecko.com/
- CoinMarketCap — cryptoasset and exchange rankings/listings: https://coinmarketcap.com/
- DefiLlama — protocol and chain rankings/data: https://defillama.com/
- Similarweb — website traffic and industry rankings: https://www.similarweb.com/
- GitHub — public project signals such as stars, forks, contributors, releases, and repository activity: https://github.com/

These are reference systems, not guarantees of eligibility, listing, ranking, or promotional placement.

#### Web Quality and Performance Benchmarks

Reference candidates include:

- Lighthouse — performance, accessibility, SEO, and best-practice auditing: https://developer.chrome.com/docs/lighthouse/
- Chrome UX Report (CrUX) — real-user web experience data: https://developer.chrome.com/docs/crux/
- PageSpeed Insights — page experience and Core Web Vitals analysis: https://pagespeed.web.dev/
- Core Web Vitals — standardized user-experience metrics including LCP, INP, and CLS.

Where an established benchmark already measures a criterion, the homepage should use its result rather than creating an equivalent duplicate metric.

#### Security and Accessibility Evaluation References

Reference candidates include:

- Mozilla Observatory: https://observatory.mozilla.org/
- SecurityHeaders: https://securityheaders.com/
- WCAG: https://www.w3.org/WAI/standards-guidelines/wcag/
- WAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- OWASP Application Security Verification Standard: https://owasp.org/www-project-application-security-verification-standard/

The project must distinguish an external benchmark or audit result from a claim of certification or accreditation.

#### Industry Reference Systems

These are not necessarily formal benchmarks. They are established products or systems that may be inspected for interaction patterns, information architecture, workflows, feature coverage, and user-facing quality.

Reference candidates include:

- CoinGecko
- CoinMarketCap
- Jupiter
- Uniswap
- Arkham
- Dune
- Shopify
- Snapshot
- Tally
- OpenAI
- Microsoft Edge
- Google Chrome

A reference system must not be copied merely because it is established. Its relevant behavior should be analyzed against AstroCrown requirements and available simpler or more compatible alternatives.

### Internal Benchmark Framework

AstroCrown-specific benchmarks should focus on gaps not adequately covered by external systems.

Potential internal benchmark families include:

- Requirement coverage.
- Verification coverage.
- Audit coverage.
- Reuse of approved mechanisms.
- Duplicate implementation detection.
- Dependency minimization.
- Code/structure duplication.
- Interaction-model consistency.
- Cross-subsystem compatibility.
- Requirement-to-test traceability.
- Evidence completeness.
- Regression recurrence.
- Performance or asset characteristics not sufficiently represented by an external benchmark.
- AstroCrown-specific workflow quality.

These are candidate benchmark families, not yet approved metrics.

An internal benchmark must not be created merely because an external benchmark already measures the same outcome.

### Benchmark Discovery and Evolution

External benchmark analysis may reveal requirements or quality dimensions not yet represented in this document.

When a gap is discovered:

1. record the discovery;
2. determine whether an existing requirement already covers it;
3. determine whether an external benchmark already provides sufficient verification;
4. if not, determine whether a new requirement, test, or internal benchmark is justified;
5. document the resulting decision before implementation.

The benchmark framework is therefore also a discovery mechanism for improving the completeness of the homepage requirements.

### Benchmark Result Interpretation

Benchmark results must be recorded with applicable scope, date/version, population or dataset where relevant, and methodology limitations.

A benchmark result must not be presented as a universal measure of homepage quality.

A public ranking may measure visibility or market activity rather than engineering quality. A performance benchmark may measure one aspect of user experience without measuring architecture. A professional audit framework may verify conformance without establishing overall product quality.

### External Comparison Without Redundant Testing

Where an external benchmark already measures a criterion that is also a homepage requirement, the requirement should reference that benchmark as an applicable verification source where appropriate.

The project should not create a second internal test that simply reproduces the same criterion unless the internal test is required for development feedback, regression protection, a different execution environment, a requirement not fully represented by the external benchmark, or traceability to a project-specific implementation detail.

### Industry Benchmark Comparison Method

When comparing AstroCrown with an industry reference system, identify:

- the specific capability being compared;
- the relevant AstroCrown requirement;
- the observed reference behavior;
- the evidence source;
- the AstroCrown behavior or planned behavior;
- any meaningful gap;
- whether the gap is a requirement gap, implementation gap, benchmark gap, or intentional product difference.

Do not create subjective overall rankings of AstroCrown against reference systems as a substitute for requirement verification.


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
| AstroCrown Deep Space Blue | `#081426` | Main dark surfaces |
| AstroCrown Light Space Blue | `#16345A` | Borders, demarcation, separators |
| AstroCrown Green | `#20C878` | Positive financial state |
| AstroCrown Red | `#E5484D` | Negative financial state |
| AstroCrown Warning Yellow | `#FFD24A` | Warning, alert, caution |
| AstroCrown Warm White | `#FFF7E0` | Primary readable text |

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

### R-014 — Deep Space Environment Layer

#### Visual Composition Specification

A Deep Space Environment Layer shall provide the foundational AstroCrown visual environment.

The layer shall consist primarily of deep-space visual content using very dark blue tones approaching black.

The layer shall provide atmosphere, depth, continuity, and AstroCrown visual identity while remaining visually non-distracting and subordinate to application content.

The nominal design envelope shall be approximately:

- 2.45× viewport height.
- 1.3× viewport width.

The design envelope includes safety margins intended to prevent exposure of background boundaries during normal operation.

#### Visual Layer Requirements

The layer shall:

- provide the foundational visual environment for AstroCrown;
- support reuse across multiple pages and compositions;
- remain independent of page-specific content;
- support future page growth without requiring redesign of the environment;
- support content readability and interface clarity.

#### Functional Requirements

The layer shall:

- provide continuous visual coverage throughout the homepage experience;
- support composition with additional background layers;
- support efficient asset reuse and delivery.

#### Interaction Requirements

The layer shall:

- participate in homepage background composition;
- support transition from introductory presentation mode to workspace mode;
- provide a visually stable environment once workspace mode becomes active.

#### Known Techniques and Patterns for Future Evaluation

- Persistent background.
- Fixed environment layer.
- Layered background composition.
- CSS multiple backgrounds.
- Image compositing.
- Layered image composition.
- Responsive image delivery.
- Asset reuse.
- WebP.
- AVIF.

### R-015 — Dimmed Deep-Space Objects Layer

#### Visual Composition Specification

A Dimmed Deep-Space Objects Layer shall provide environmental depth and atmospheric variation above the Deep Space Environment Layer.

The layer may contain:

- sparse stars;
- subtle dust formations;
- subtle gas formations;
- diffuse light variations;
- other dimmed deep-space features.

All elements shall remain visually non-distracting and subordinate to application content and shall avoid becoming dominant focal objects.

The nominal design envelope shall be approximately:

- 2.45× viewport height.
- 1.3× viewport width.

The design envelope includes safety margins intended to prevent exposure of layer boundaries during normal operation.

#### Visual Layer Requirements

The layer shall:

- contribute depth and atmosphere;
- reinforce AstroCrown visual identity;
- avoid distracting the user from application content;
- remain suitable for long-duration use.

#### Functional Requirements

The layer shall:

- support composition with other background layers;
- support reuse across multiple AstroCrown pages;
- support efficient delivery and rendering.

#### Interaction Requirements

The layer shall:

- participate in homepage background composition;
- remain visually coherent during transitions between homepage states;
- support stable workspace presentation.

#### Known Techniques and Patterns for Future Evaluation

- Star-field layer.
- Atmospheric texture layer.
- Layered image composition.
- CSS multiple backgrounds.
- Image compositing.
- Seamless tiling.
- Asset reuse.
- Responsive image delivery.

### R-016 — Primitive Earth System Layer

#### Visual Composition Specification

A Primitive Earth System Layer shall provide a major introductory composition element for the homepage.

The layer shall contain:

- a Primitive Earth;
- the Moon;
- debris resulting from a historical Earth–Moon collision event;
- associated dust and asteroid remnants.

Dust and asteroid remnants shall be concentrated primarily near the lower-left region, following an orbital movement around the Earth–Moon system and progressively decreasing in density above the Earth.

Earth illumination shall originate from the left-rear direction.

The Moon shall exhibit illumination geometrically consistent with the Earth illumination source.

#### Visual Layer Requirements

The layer shall:

- contribute to homepage introduction and first-impression atmosphere;
- reinforce AstroCrown visual identity;
- remain compatible with content readability.

#### Functional Requirements

The layer shall:

- function primarily as an introductory composition element;
- support composition with other homepage background layers.

#### Interaction Requirements

The layer shall:

- progressively leave the primary visual field during page progression;
- clear the workspace area before the directory workspace becomes active;
- avoid remaining a dominant visual element during workspace use.

#### Known Techniques and Patterns for Future Evaluation

- Introductory composition layer.
- Multi-layer parallax.
- Differential scroll rate.
- Layered scrolling behavior.
- Asset compositing.

### R-017 — Rocky Planet Layer

#### Visual Composition Specification

A Rocky Planet Layer shall provide a secondary introductory composition element for the homepage.

The layer shall contain:

- a rocky planetary body;
- colored atmospheric gases;
- golden solar reflection on the upper-right region.

The planet shall present approximately:

- 35% illuminated day-side;
- 65% night-side.

#### Visual Layer Requirements

The layer shall:

- support the overall homepage composition;
- complement the Primitive Earth System Layer;
- remain visually subordinate to application content.

#### Functional Requirements

The layer shall:

- support composition with other introductory layers;
- contribute to homepage atmosphere and identity.

#### Interaction Requirements

The layer shall:

- participate in introductory presentation mode;
- progressively leave the primary visual field before workspace mode becomes active.

#### Known Techniques and Patterns for Future Evaluation

- Introductory composition layer.
- Multi-layer parallax.
- Differential scroll rate.
- Layered image composition.
- Asset compositing.

### R-018 — Spiral Nebula Layer

#### Visual Composition Specification

A Spiral Nebula Layer shall provide a tertiary introductory composition element for the homepage.

The layer shall contain:

- a spiral nebula inspired by spiral-galaxy geometry;
- a central core region;
- radial Hawking radiation rays extending approximately one nebular radius from the center.

The dominant color palette shall consist primarily of:

- gold;
- orange;
- purple;
- deep blue.

The radial rays shall transition primarily from orange near the center toward purple at greater distances.

#### Visual Layer Requirements

The layer shall:

- support homepage atmosphere and visual identity;
- remain compatible with content readability;
- avoid overwhelming application content.

#### Functional Requirements

The layer shall:

- support composition with other introductory layers;
- contribute depth and visual richness to the homepage introduction.

#### Interaction Requirements

The layer shall:

- participate in introductory presentation mode;
- progressively leave the primary visual field before workspace mode becomes active.

#### Known Techniques and Patterns for Future Evaluation

- Introductory composition layer.
- Multi-layer parallax.
- Differential scroll rate.
- Layered image composition.
- Asset compositing.
- Atmospheric composition layer.

## Current Explicitly Undefined Items

These items remain requirements work rather than implementation tasks:

- Exact homepage section order.
- Exact navigation labels and destinations beyond already-established project requirements.
- Exact logo asset/version to use.
- Exact typography choices.
- Exact spacing and dimensional system.
- Exact interactive behaviors beyond their required outcomes.
- Mobile-specific layout behavior and device verification.
- Runtime data sources, if any homepage element will use live data.
- Exact implementation technique for each visual layer.
- Exact asset file formats, dimensions, and delivery variants until implementation comparison is performed.
- Exact final artwork composition and positioning until the desktop layout is sufficiently calibrated.

These must be resolved before the relevant implementation is built, rather than guessed during coding.

## Validated Interaction Discoveries

The following discoveries are now sufficiently supported by the development work to inform the formal homepage requirements rather than remaining only implementation notes.

### D-001 — Desktop nested-scroll handoff pattern

Development of the desktop market area established a reusable interaction pattern consisting of a persistent header, sticky section elements where needed, a finite nested scroll container for the market directory, and handoff from that nested container back to normal page scrolling at its boundary.

Evidence includes the desktop scroll-handoff implementation merged in commit f92626d63d7119d5c58f39f53f9c5b79770d9412 and subsequent work preserving normal scrolling while hiding the page scrollbar in commit 4551813ab5a61e901c8c1e5163a2b8b8f9ea62b4.

The requirement records the interaction outcome, not the historical CSS implementation, so future implementations remain free to use a simpler mechanism that produces the same verified behavior.

### D-002 — Hidden scrollbar does not mean disabled scrolling

The development work established that the page scrollbar can be visually hidden while page scrolling remains active. This is therefore treated separately from the scroll model: scrollbar visibility is presentation; scrolling behavior remains functional and independently testable.

### D-003 — Background environment can be composed from reusable layers

The homepage background has been decomposed conceptually into reusable visual layers rather than requiring one monolithic background image. This permits different artistic compositions to reuse common environment layers while allowing introductory decorative layers to have distinct visual and scroll behavior.

The layer-based model also creates an implementation comparison point for efficient asset delivery, browser compositing, reuse, caching, and code minimization.

### D-004 — Introductory and persistent background behavior are distinct

The introductory decorative composition and the persistent environment serve different purposes and therefore may use different movement behavior. Introductory layers are intended to clear the primary visual field during page progression, while the persistent environment becomes visually stable when the directory workspace is active.

### D-005 — Finite background envelope with safety margins may remove the need for tiling

Current analysis indicates that the required background behavior may be satisfied by finite background assets with sufficient horizontal and vertical safety margins rather than requiring an environment that extends indefinitely with page length.

The nominal design envelope currently identified for the foundational environment and dimmed objects layers is approximately 2.45× viewport height and 1.3× viewport width. These dimensions remain subject to validation during implementation and responsive testing.

### D-006 — Layered asset delivery may improve loading efficiency

Separating visual environment components into independent assets can permit reuse, browser caching, selective loading, responsive delivery, and composition without requiring a single large flattened background asset.

This is an implementation consideration to be compared against the complete homepage requirement set. It does not yet mandate a specific delivery mechanism.

## Design Constraint

The homepage should be developed from this requirement baseline and its test definitions. Existing pre-reset website code is reference/recovery material only and must not become an implicit requirement source.


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

The exact HEX value of AstroCrown Space Blue remains to be established before implementation.

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

- use AstroCrown Space Blue;
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

- Exact AstroCrown Space Blue HEX value.
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
- approved header/background color relationship;
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


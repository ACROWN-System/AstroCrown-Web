# AstroCrown Homepage Requirements — Development Baseline

## Purpose

Define the minimum auditable requirements for the AstroCrown homepage before substantive implementation begins.

This document defines requirements, not implementation. A requirement may be refined when new evidence appears, but implementation must not be used to silently invent missing requirements.

## Scope

Target: `index.html` / AstroCrown homepage.

Current implementation baseline: minimal HTML foundation in `development/index.html`.

Primary development environment: `development/`.

Regular/public website remains at the repository root and is not changed by this specification.

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

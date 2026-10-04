# Homepage Background / Environment

## Migration status

Active subsystem requirements document created from the pre-migration homepage requirements. The historical source remains preserved verbatim in `development/index-archive/HOMEPAGE-REQUIREMENTS.md`.

This document preserves source material and does not promote candidates, discoveries, or undefined items into approved requirements.

## Migration notes

R-012 through R-018 and the related validated discoveries are preserved here as the background/environment subsystem material.

## Current implementation architecture baseline

The homepage background is a compositional system rather than a monolithic page-specific artwork.

The current intended layer model is:

1. **Deep Space Environment Layer** — foundational/base environment.
2. **Dimmed Deep-Space Objects Layer** — reusable sparse stars, dust, gas, and diffuse light variation.
3. **Space Cloud Layer** — independently composable atmospheric/cloud treatment where used.
4. **Primitive Earth System Layer** — reusable Earth, Moon, debris, and associated dust/asteroid composition.
5. **Rocky Planet Layer** — independently reusable secondary planetary composition.
6. **Spiral Nebula Layer** — independently reusable spiral-nebula composition, including its radiation-ray treatment.

Each layer should remain independently replaceable, repositionable, enabled/disabled, delivered, and reusable where the target composition requires it. The exact final asset format, dimensions, delivery strategy, and rendering mechanism remain implementation decisions and must be evaluated rather than guessed.

The background architecture is intended to support continuity of AstroCrown visual identity across different website pages, alternate compositions, and future non-page media uses where appropriate. Reuse must not require flattening independent layers into one irreversible page-specific image.

The layers share a common compositional coordinate envelope where this is useful, but they do not thereby become one asset or one implementation mechanism.

## Source material

### Source excerpt: lines 497–526

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


### Source excerpt: lines 527–640

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


### Source excerpt: lines 641–690

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


### Source excerpt: lines 691–789

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



## Implementation discoveries — 2026-10-04 first coupled pass

### D-BG-001 — First implementation is a calibration environment, not final artwork

The active repository currently contains no confirmed homepage background artwork assets for the Deep Space, Primitive Earth/Moon, Rocky Planet, and Spiral Nebula systems. The first real `index.html` implementation therefore uses CSS-generated prototype forms **inside separate reusable background-layer containers** as a calibration surface.

The prototype currently represents:

- a foundational deep-space environment layer;
- an independent dimmed-space/stars layer;
- an independent diffuse space-cloud layer;
- an independent Primitive Earth / Moon / debris layer;
- an independent rocky-planet layer;
- an independent Spiral Nebula layer with its associated rays.

This implementation preserves the structural composition intent of R-014 through R-018 while explicitly avoiding a monolithic background implementation. The CSS forms are still calibration representations, not final approved artwork assets.

### D-BG-002 — Background and header must be calibrated together

The first implementation confirms the practical need to evaluate the environment and header as one visual composition. The header's opaque Space Blue surface, 59 px geometry, bottom delimitation, protected brand area, and environmental objects must be inspected together at representative desktop viewport dimensions so that the background remains atmospheric without competing with header/content readability.

### D-BG-003 — Final object positions remain implementation evidence

The initial object positions are deliberately provisional. They provide a concrete visual field for testing the documented 2.45× viewport-height and 1.3× viewport-width design envelope, negative space, edge safety, and progressive composition. Rendered inspection is still required before treating any exact object position as final.

### D-BG-004 — Reusable background-layer architecture is an implementation requirement

The first prototype exposed an architectural omission: representing the visual objects inside one general environment container was not sufficient to demonstrate the reusable-layer model already established by D-003.

The corrected implementation now gives each major visual system its own background-layer container and explicit layer identity. This makes the conceptual base environment, dimmed objects, space cloud, Primitive Earth system, Rocky Planet, and Spiral Nebula independently addressable for later asset replacement, composition, scroll treatment, selective reuse, and testing.

The layer identities are intentionally decoupled from the current CSS artwork. Future approved assets may replace individual layer contents without requiring the entire homepage background to be flattened or rebuilt as one asset.

### D-BG-005 — Reuse extends beyond a single homepage composition

The purpose of the layered architecture is not limited to this homepage. The same visual components may be reused in other AstroCrown pages, alternate page compositions, and future media compositions where appropriate. This is a brand-continuity and maintainability objective, while exact reuse mechanisms remain subject to later evidence and asset architecture decisions.

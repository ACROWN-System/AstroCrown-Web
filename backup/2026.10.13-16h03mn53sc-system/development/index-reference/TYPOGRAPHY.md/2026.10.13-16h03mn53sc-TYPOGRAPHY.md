# Typography

## Purpose

Cross-section reference index for typography-related requirements, candidates, and undefined items. This is an extracted navigation aid, not a replacement for the originating subsystem requirements.

**Status rule:** extracted values retain their original status. A candidate/TBD/undefined item is not promoted merely by appearing here.

## Extracted references

### Origin: HOMEPAGE-REQUIREMENTS.md lines 790–807

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


### Origin: HOMEPAGE-REQUIREMENTS.md lines 1080–1098

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


### Origin: HOMEPAGE-REQUIREMENTS.md lines 1171–1194

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


### Origin: HOMEPAGE-REQUIREMENTS.md lines 1463–1509

#### R-020.9 — Reuse Opportunities

Before implementing a dedicated information-bar system, inspect and evaluate reuse of:

- the existing AstroCrown color system;
- existing AstroCrown typography definitions;
- existing icon assets or icon mechanisms;
- existing homepage background/environment layers;
- existing header layout and spacing mechanisms;
- existing interaction-state patterns;
- existing animation/timing systems;
- existing accessibility utilities;
- existing notification, alert, carousel, or message-feed mechanisms elsewhere in the repository;
- existing content schemas or data-fetching mechanisms.

A new implementation should not duplicate an existing approved mechanism when that mechanism can satisfy the information-bar requirement adequately.

Reuse should not be forced when a new mechanism demonstrably simplifies the system, reduces redundancy, improves compatibility, or better satisfies the requirement.

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


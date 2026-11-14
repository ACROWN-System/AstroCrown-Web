# Discovery Information Bar

## Migration status

Active subsystem requirements document created from the pre-migration homepage requirements. The historical source remains preserved verbatim in `development/index-archive/HOMEPAGE-REQUIREMENTS.md`.

This document preserves source material and does not promote candidates, discoveries, or undefined items into approved requirements.

## Source material

### Source excerpt: lines 1262–1571

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

The information-bar structure shall support future informational content management without requiring structural redesign.

Candidate content sources include:

- manually authored static message definitions;
- a local JSON message feed;
- an application-managed message queue;
- an API-provided message feed;
- an existing approved application/content mechanism.

Candidate content-management patterns include:

- FIFO queue;
- priority queue;
- explicit information-type categories;
- structured message objects containing priority, type, icon, message, destination, active state, and timing metadata.

These are candidates only. A more complex content-management system shall not be introduced unless an actual operational requirement justifies it.

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

**Motion**

- CSS transforms.
- CSS keyframe animations.
- CSS transitions.
- Web Animations API.
- A shared animation/timeline state for synchronization of the priority/type and carousel fields.

**Accessibility**

- Semantic HTML.
- `role="region"` with an accessible name where appropriate.
- ARIA live-region behavior where dynamically changing information should be announced.
- Appropriate link/button semantics.
- `prefers-reduced-motion` handling.
- Keyboard-accessible interaction.
- Sufficient text/UI contrast and focus visibility.

**Content management**

- Structured local data.
- FIFO queue.
- Priority queue.
- JSON message feed.
- API message feed.
- Existing approved content-management or notification mechanisms.

**Responsive behavior**

- Flexbox intrinsic adaptation.
- CSS Grid intrinsic adaptation.
- `clamp()`.
- Container Queries.
- Media Queries where a discrete breakpoint is genuinely required.
- JavaScript viewport measurement only if native CSS cannot satisfy the observable requirement.

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
- exact icon assets/library;
- exact message data schema;
- exact message source;
- exact priority ordering;
- exact carousel duration;
- exact 3-second dwell implementation;
- exact easing;
- exact movement distance;
- exact synchronization mechanism;
- exact reduced-motion presentation;
- exact breakpoint use, if any;
- exact desktop browser compatibility target;
- exact automation interface for future message insertion/removal;
- exact link destination and routing mechanism;
- exact implementation framework or component boundary.

#### R-020.12 — Verification and Audit Requirements

The information bar shall be verified for:

- correct position below the header;
- approximately 45 px visible background space between header and information bar where the desktop layout permits;
- intended left and right content-edge relationships;
- approximately 53 px target height;
- rounded corners;
- translucent AstroCrown Black surface;
- approximately 5 px AstroCrown Warning Yellow border;
- approximately 150 px priority/type section;
- correct priority/type color semantics;
- correct icon and text alignment;
- correct carousel content alignment;
- non-clickable empty-state “-” behavior;
- clickable message/link behavior;
- synchronized entrance, dwell, and exit;
- approximately 3-second dwell;
- absence of timing drift between the priority/type field and carousel field;
- responsive contraction behavior;
- readability during contraction;
- keyboard accessibility;
- screen-reader behavior where dynamic content requires announcement;
- reduced-motion behavior;
- contrast and focus visibility;
- content insertion/removal/replacement without structural redesign;
- absence of unnecessary dependencies;
- minimum-code and redundancy compliance;
- regression compatibility with the homepage header and background layers.

Visual/interaction verification should record viewport dimensions, relevant input sequence, observed result, and evidence where applicable.

#### R-020.13 — Benchmark and External Evaluation References

Applicable external references should be reused rather than duplicated where they already verify the relevant quality attribute.

Candidate references include:

- WCAG for accessibility and contrast;
- WAI-ARIA Authoring Practices for applicable dynamic/interactive patterns;
- Lighthouse for accessibility, performance, and best-practice verification;
- Core Web Vitals where the final implementation materially affects measured page experience;
- supported-browser compatibility references for CSS layout, animation, and accessibility features.

Any AstroCrown-specific internal benchmark should be created only where an external reference does not adequately verify an information-bar-specific behavior, such as synchronized two-region motion or project-specific redundancy controls.

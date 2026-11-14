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

These must be resolved before the relevant implementation is built, rather than guessed during coding.

## Design Constraint

The homepage should be developed from this requirement baseline and its test definitions. Existing pre-reset website code is reference/recovery material only and must not become an implicit requirement source.

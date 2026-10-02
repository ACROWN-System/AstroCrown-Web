# Responsive Conventions

## Purpose

Cross-section reference index for desktop-first baseline, adaptive header space, responsive bar behavior, directory undefined items, and browser/progressive-degradation requirements. This is an extracted navigation aid, not a replacement for the originating subsystem requirements.

**Status rule:** extracted values retain their original status. A candidate/TBD/undefined item is not promoted merely by appearing here.

## Extracted references

### Origin: HOMEPAGE-REQUIREMENTS.md lines 463–475

### R-006 — Desktop-first implementation baseline

The first implementation target is the desktop/laptop web experience.

Responsive behavior must not be omitted from the design, but mobile-specific refinement is a later verification stage because mobile-device testing is currently unavailable.

### R-007 — Functional behavior

Every interactive element implemented on the homepage must have a defined purpose, expected behavior, destination or state change, and failure/edge condition where applicable.

No non-functional controls may be presented as functional UI.

### R-008 — Accessibility baseline

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1029–1072

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

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1365–1380

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

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1793–1858

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


### Origin: HOMEPAGE-REQUIREMENTS.md lines 2617–2640

## R-029 — Homepage Accessibility and Inclusive Interaction

The homepage shall be evaluated against applicable WCAG 2.2 requirements and relevant WAI-ARIA guidance.

Verification shall consider semantic structure, accessible names, heading hierarchy, keyboard operation, visible focus, contrast, text scaling/reflow, meaningful alternative text, non-color-only communication, motion preferences, dynamic announcements where genuinely necessary, interactive-state clarity, and usable error/empty states.

The implementation shall prefer native HTML semantics over unnecessary ARIA.

## R-030 — Homepage Security and Supply-Chain Baseline

The homepage shall minimize executable code/dependencies; avoid client-side secrets; safely handle untrusted external data; avoid unsafe HTML insertion; use secure external-resource practices; review third-party dependencies/scripts and their trust implications; avoid unnecessary network destinations; preserve appropriate browser security controls; consider CSP and related controls when supported by deployment architecture; undergo applicable OWASP ASVS verification; and integrate applicable NIST SSDF practices.

Controls shall be determined by actual architecture rather than mechanically copied from an external standard.

## R-031 — Browser Compatibility and Progressive Degradation

The homepage shall identify its supported desktop browser baseline before release.

Prefer broadly supported platform capabilities when they adequately satisfy requirements.

Advanced capabilities require compatibility evaluation and, where appropriate, graceful degradation. Essential content/navigation must not silently break in supported environments.

Mobile refinement remains a later verification stage where device access is available, but desktop architecture shall not unnecessarily obstruct later responsive adaptation.


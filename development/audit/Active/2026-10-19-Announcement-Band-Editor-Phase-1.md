# Active Navigation Plan — Announcement-Band Admin Editor, Phase 1

**Date:** 2026-10-19  
**Status:** ACTIVE — repository inspection and minimum viable editor implementation  
**Repository:** ACROWN-System/AstroCrown-Web  
**Base commit:** 27162a5f8ea91b6c51e9c928851d0da0f1ee6ead  
**Working branch:** admin/announcement-band-editor-phase-1  
**Related prototype:** development/index.html (development-only)  
**Preserved discovery record:** development/audit/Active/2026-10-17-Announcement-Band-Editor-Discovery-Preservation.md

## 1. Objective

Begin implementing a separate development-only administrator dashboard for composing and maintaining the configurable announcement/status band directly above the AstroCrown website header.

The owner accepted the current homepage prototype as a suitable basis to continue development. That acceptance does not authorize production promotion and does not mean an editor already exists.

## 2. Source of truth and navigation limitation

Read and follow development/DEVELOPMENT-AND-AUDIT-CONVENTION.md and the preserved announcement-band discovery record before implementation. The expected development/NAVIGATION-PROTOCOL.md and development/NAVIGATION-PLAN-TEMPLATE.md paths returned NOT_FOUND on 2026-10-19. Do not claim to have followed unavailable documents; use this recorded plan and the available development/audit convention until the authoritative navigation files are located or restored through a separate evidence-based action.

## 3. Scope boundary

Phase 1 should deliver the smallest meaningful, testable editor foundation, not the entire future publishing platform.

- Keep all editor files inside development/.
- Keep the public root homepage, _config.yml, production publishing boundary, wallet/account/transaction/security logic, and live service integrations unchanged.
- Do not add payment/token gating, authentication assumptions, external dependencies, remote calls, uploads, or production publishing.
- Treat edits as local draft state only. Clearly label the dashboard as a prototype with no persistence or live publishing unless a later verified phase explicitly implements those capabilities.
- Do not alter or create anything inside backup/, Backup/, or any case variant of those paths.

## 4. Required first investigation

Before adding implementation code:

1. Inspect the merged development/index.html, the preserved editor requirements, available audit templates, and existing repository conventions.
2. Search for existing reusable CSS/JavaScript patterns or existing editor code so that a duplicate mechanism is not introduced.
3. Identify the smallest safe standalone location for the editor and confirm it remains excluded from public Pages output.
4. Record unresolved design or implementation dependencies before following them; add material dependencies to the project Roadmap first if one exists and is authoritative.
5. Keep requirement maturity explicit: approved requirements, discovered facts, implementation decisions, and open questions must not be conflated.

## 5. Phase 1 functional target

The first increment should establish the three-panel composition and demonstrate basic local editing without pretending to provide persistence or publishing:

1. **Element Library** — contextual categories/picker for basic elements; add an element without replacing existing content.
2. **Announcement Band Canvas** — visible band preview directly representing the strip above the header, with a simple base background and editable foreground text/shape or image placeholder as justified by the existing code.
3. **Layers and Properties** — selected-element identity, visibility, ordering, and basic position/size or text/background properties appropriate to the initial element types.
4. **Draft-only state** — edits affect the in-memory preview only; show a clear unsaved/non-published prototype status.
5. **Accessible alternatives** — keyboard-operable add/select/reorder/remove/property controls; visible focus and accessible names. Dragging must not be the only way to use the editor.
6. **Responsive foundation** — editor layout remains usable at narrow widths and high zoom; preserve the separate band preview viewport and element dimensions.
7. **Safe deletion** — remove only the selected instance, with Undo or a clear recovery mechanism; never delete shared library assets as a side effect.

Do not attempt every advanced feature in the first increment. Defer video loading, upload/storage, authentication, persistence, version history, publish/deploy, scene carousel, advanced crop windows, and emergency runtime controls until their dependencies and verification methods are documented.

## 6. Preserved requirements for later increments

Do not lose or contradict the existing decisions:

- Free-form composition: multiple background/foreground elements can coexist; do not force a mutually exclusive text/image/video mode.
- Three-panel order: Element Library → Announcement Band Canvas → Layers and Properties.
- Picker pop-ups have a visible top-right X, Escape/outside dismissal where appropriate, and closing a picker must not discard or lock an element.
- Element selection uses eight resize handles (four corners and four edge midpoints); keyboard/property controls provide alternatives.
- Canvas zoom, preview viewport width, published band dimensions, element dimensions and media crop remain independent.
- Band sizing should support presets plus a draggable lower border in a later verified increment.
- Image/video crop and focal settings may need per-viewport values; failed/disabled media must not collapse the band or shift the header.
- The band and header should be evaluated as one coordinated sticky stack if sticky behavior is implemented.
- Optional scenes retain the documented +, three-dot Direction, − order and exact four-direction cycle. Do not implement scene carousel until the single-scene editor is stable.
- No audible autoplay; respect reduced motion and maintain text contrast over media.
- Draft preview and explicit safe publishing are separate future capabilities. Do not imply a static GitHub Pages edit is an immediate runtime emergency switch.

## 7. Verification plan

Use the least complex methods that establish evidence:

- Source review for duplicate logic, scope boundary and unsafe DOM behavior.
- HTML/CSS/JavaScript syntax checks.
- Targeted automated tests for adding/selecting/updating/reordering/hiding/removing elements, undo/recovery, and state consistency.
- Responsive checks at content-driven desktop/tablet/mobile widths and narrow reflow.
- Keyboard-only test of the complete basic workflow, visible focus, accessible labels, and focus not obscured.
- Confirm editor files remain under development/ and _config.yml is unchanged.
- Record real-browser verification as BLOCKED if no browser execution/evidence is available; never infer a visual/accessibility PASS from syntax or CI alone.

Use PASS / FAIL / N/A (with reason) / BLOCKED. Record evidence against the tested commit. Fix root causes and rerun affected and regression checks.

## 8. Acceptance gate

Phase 1 is ready for review only when:
- the basic editor workflow works end-to-end in the supported prototype environment;
- no existing homepage prototype behavior or sample-data boundary is unintentionally regressed;
- all applicable automated checks pass;
- the production boundary is unchanged;
- keyboard/responsive/browser checks are evidenced or explicitly marked BLOCKED;
- remaining limitations and deferred features are documented;
- the owner can review the development-only result before any merge/promotion decision.

No production promotion is authorized by this plan.

## 9. Impact Analysis

**IF modified:** A dedicated editor prototype can be developed and tested independently while preserving the accepted homepage prototype and its public publishing boundary. A narrowly scoped phase reduces the risk of mixing canvas behavior, media handling, persistence, authentication and publishing into one untestable change.

**IF not modified:** The project retains only documented editor requirements; there is no implemented dashboard foundation, and future work risks reconstructing decisions or implementing an oversized feature before basic interaction behavior is verified.

## 10. Current status and next actions

- [x] Owner accepted the homepage prototype as a basis for continued development.
- [x] PR #133 merged as development-only; all three workflows passed.
- [x] Existing development/audit convention and discovery record reviewed.
- [x] Missing navigation protocol/template paths recorded without claiming compliance.
- [ ] Inspect existing editor-relevant code and repository structure for reuse.
- [ ] Select and document the smallest standalone editor file/location.
- [ ] Implement the first basic local-draft editing workflow.
- [ ] Add and run targeted verification; record limitations and evidence.
- [ ] Open a review PR only after the scoped increment is ready.


## 13. Page dashboard and reusable component-editor direction (owner discussion, 2026-10-20)

### Preserved direction

The near-term goal remains a high-quality, easy-to-use announcement-band editor for the AstroCrown homepage. The broader dashboard idea should shape clean boundaries, but must not destabilize or overcomplicate the current editor.

The intended longer-term administration flow is:

1. An authenticated, authorized administrator enters a private admin dashboard.
2. The dashboard presents the pages the administrator is allowed to manage; the homepage is the first and current priority.
3. Selecting a page opens a page-layout view showing the page's named sections and the spaces between them.
4. Selecting a section highlights its start, middle/content region, and end in the canvas and loads the section's name and applicable layout properties in a contextual sidebar.
5. Section properties may include spacing values in CSS pixels with direct increment/decrement controls; whether top/bottom spacing and the middle/content region need independent controls must be specified and verified before implementation.
6. An “Add element” control reveals the available element types. Any layout-division option should appear only when enabled, with understandable pattern choices and a live preview.
7. Adding a component creates a configured instance in the selected section. For example, adding an announcement banner exposes an action to open the existing banner editor for that specific instance.

### Reuse rule

Do not generate a separate codebase or one-off editor implementation for every new element. Use a small component-type registry or equivalent explicit mapping from a component type to its configuration and specialized editor. Reuse the same banner editor for each banner instance while maintaining independent data for each instance. A component without a supported editor must be clearly marked unsupported rather than silently receiving an incorrect editor.

### Banner behavior preserved

- The banner editor remains specialized for visual composition, band dimensions, its own carousel slots, and its schedule.
- Each existing carousel slot has exactly one optional “[ ] Add link” control; selecting it reveals that slot's Destination URL field. Each slot's URL is independent. Adding a slot adds a corresponding link setting; removing a slot must not transfer its settings to another slot.
- If a scheduled banner has both Open and Close times, it is a temporary banner and the applicable default resumes at Close.
- If no Close time is entered, show a confirmation dialog before scheduling: confirm to make the banner the new default at its Open time, or return to add a Close time; cancellation makes no schedule change.
- The administrator interface and unpublished drafts remain private. A published banner may be public content and may link to a destination page; authorization for any operation on that destination is enforced by the destination, not by the banner.
- The production admin route must not be exposed to unauthorized users. Production access requires real authentication and server-side authorization; an obscure URL, hidden link, or client-side-only gate is not security.
- Public banner delivery and link navigation are distinct from the private editing interface.

### Implementation sequence

1. Keep PR #140's current scope as the banner-editor foundation. Establish browser-based interaction, keyboard, responsive, and visual evidence before expanding its feature scope. Any unavailable browser verification stays BLOCKED.
2. Correct root causes and stabilize the banner editor, preserving the explicit development-only/non-persistent boundary.
3. In a subsequent scoped increment, introduce the smallest useful dashboard/page-selection shell and a homepage page-layout view. Avoid implementing a fully generic multi-page builder at this stage.
4. Add section selection and spacing controls only after the page layout is accurately represented and the expected start/middle/end geometry is validated.
5. Add the “Add element” flow and component-type mapping; wire the banner component to the reusable banner editor.
6. Add persistent schedule and production access/publishing only under separate backend, security, and verification plans. Do not imply the current local-only prototype provides these capabilities.

### Impact Analysis

**IF modified:** The editor can evolve from a focused homepage tool into a page-aware dashboard without requiring bespoke editors for every component. The stepwise boundary preserves usability and allows the banner editor to be proven before adding page-level complexity.

**IF not modified:** The page-selector, section-spacing, and component-to-editor relationship could be improvised later, causing duplicated editors, inconsistent property panels, or a disruptive rewrite when additional homepage elements need editing.

### Status and evidence

This addendum records owner direction and implementation decisions to guide future work. It does not claim that the dashboard, section editor, component registry, link handling, authentication, persistence, scheduling, or publishing has been implemented or browser-tested.

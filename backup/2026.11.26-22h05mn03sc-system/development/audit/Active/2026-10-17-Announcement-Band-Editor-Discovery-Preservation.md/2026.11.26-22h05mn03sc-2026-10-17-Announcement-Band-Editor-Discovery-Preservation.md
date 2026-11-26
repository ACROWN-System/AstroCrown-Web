# Active Navigation Plan — Announcement-Band Editor Discovery Preservation

**Date:** 2026-10-17  
**Status:** PRESERVED FOR CONTINUATION — discovery/requirements only; editor not implemented  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Related draft PR:** [#133 — Build desktop-first homepage visual review prototype](https://github.com/ACROWN-System/AstroCrown-Web/pull/133)  
**Working branch:** `ui/homepage-visual-review-2026-10-16`  
**Purpose:** Preserve the homepage and administrator-editor discoveries made before the separate brand-language/terminology work, so that a future conversation can resume without reconstructing decisions or confusing requirements with implemented functionality.

## 1. Mode, source of truth, and boundary

**Mode:** Documentation preservation and navigation record only.

The detailed prototype context and design discussion are in the description of draft PR #133. This file gives those discoveries a dedicated, version-controlled repository document in addition to the PR description.

The related prototype at `development/index.html` is development-only. It is not the public production homepage and does not establish that account creation, wallet connection, trading, live market data, token generation, or a working administrator editor exists. The PR remains a draft visual-review proposal.

The standalone `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not found in the inspected active paths. This record follows the available `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` and repository audit-record conventions; it does not claim compliance with unavailable documents.

## 2. Objective and preservation requirements

Preserve the agreed design direction for a future configurable announcement/status band placed directly **above the AstroCrown website header**, including its free-form visual editor, media handling, resize/crop controls, optional scenes, safe publishing, accessibility, performance, and future product-tier considerations.

This is not authorization to implement or deploy that editor, promote the homepage prototype, change the publication boundary, introduce payment gates, or change protected account, wallet, transaction, or security behavior.

**Immutable preservation rule:** do not create, update, move, rename, or delete anything within `backup/`, `Backup/`, or any case variant of those paths. Existing backup/archive folders are immutable and are excluded from this work.

## 3. Existing homepage prototype state

PR #133 currently contains a self-contained desktop-first homepage prototype in `development/index.html`. The PR description records the candidate commit and preview links, component outline, external benchmark research, current verification, and detailed requirements captured below.

The prototype's documented checks so far include a JavaScript syntax compile check and structural checks for 24 illustrative sample assets, 12 secondary discovery cards, directory/pagination anchors, sample-data notices, and absence of external script/image/style dependencies. Full browser rendering, responsive comparison, and interactive keyboard audit were recorded as BLOCKED pending a real browser run. Do not upgrade these results to full UI/accessibility/performance PASS without new evidence.

The root-site publication boundary and `_config.yml` must remain unchanged unless a separate, explicit, reviewed promotion plan authorizes it.

## 4. Future editor: three-panel architecture

The preferred dashboard has three coordinated areas:

1. **Element Library** — categories and contextual pop-ups for available elements, media, assets, and presets.
2. **Announcement Band Canvas** — one free-form composition canvas representing the band.
3. **Layers and Properties** — selected-element settings, layer order, dimensions, visibility, locking, duplication and removal.

Do not force an exclusive choice between text, image, video, or color before editing. Different elements are composable: an image or video may form the background while editable text, icons, and buttons sit in front, and a composition may also be media-only or text-only.

Real text must remain editable HTML, not flattened into a media asset. Adding a new element must not replace or erase existing elements. Use a shared component/asset library where appropriate and distinguish a placed instance from the reusable library asset.

### 4.1 Element picker and pop-ups

- Selecting a category opens the corresponding picker inside or adjacent to the Element Library area.
- Assets or presets can be dragged onto the canvas. A successful drop dismisses the picker and selects the newly placed element. A canceled/invalid drag does not dismiss it or lose state.
- Provide a visible top-right **X** close control, Escape handling and suitable outside-click dismissal. Closing a picker/menu only dismisses it; it must not delete, lock, finalize, reposition or discard the element.
- Do not allow dismissal during a drag to teleport or lose the element. Give controls accessible names, visible keyboard focus and adequate target sizes.

### 4.2 Selection and context actions

- Selection displays an editor-only bounding box with **eight handles**: four corners and the midpoint of each edge.
- Dragging the element's body with the left mouse button moves it. Corner handles resize both dimensions; edge-midpoint handles resize along their respective axis.
- Right-clicking an editor element opens a compact contextual menu with **Select** and **Delete**. Select activates the element and loads its properties. Delete targets only that instance and must have suitable Undo/confirmation protection.
- Preserve the browser's ordinary context menu outside editable elements. Provide the contextual action by keyboard (for example, Shift+F10/context-menu key) as well.
- Deleting an instance must not delete a shared media asset that remains in use elsewhere. Keep selection guides and handles out of visitor-facing output.

### 4.3 Canvas zoom versus element size

The mouse wheel over the canvas should zoom the editor view around the pointer. Outside the canvas, normal page scrolling should continue. Provide visible click/keyboard zoom controls as an accessible alternative and clarify any modifier-key gesture needed to avoid conflicting with ordinary scrolling.

Keep these independent: editor canvas zoom, preview viewport width, actual published element dimensions, band width/height, and media crop/scale. Zooming must not change published size or alter another element's crop. Numeric properties and keyboard-accessible move/resize controls must complement pointer gestures.

## 5. Band sizing and responsive previews

Provide both size presets and manual resizing via the band's **draggable lower border**. Presets and drag-resize are complementary, not mutually exclusive.

Candidate wide-layout height ranges are:

- Compact: approximately **32–40 CSS px**.
- Standard: approximately **48–64 CSS px**.
- Media-rich: approximately **96–160 CSS px**.
- An expanded/full-view mode may be evaluated separately.

These are project design candidates, not externally mandated dimensions or validated final values. Support reasonable min/max constraints, live measurement/resize feedback, reset-to-preset, undo, numerical values, and keyboard-accessible adjustment. Resizing in the editor must not silently publish a change. Any immersive view must have an obvious exit and must not trap scrolling or permanently hide the header/page.

Preview desktop, tablet, mobile and custom viewport widths. Design responsive breakpoints where content requires layout changes, not solely by device brand. Test text wrapping, short landscape viewports, zoom, sticky scrolling, menus and resizing while scrolled.

## 6. Media crop and fallback behavior

When a background image/video is used, show the source preview with the visible band region as a crop window. Support pan, zoom/crop, reset-to-fit, and accurate properties. Where one crop cannot fit all aspect ratios, allow separate desktop/tablet/mobile focal/crop settings.

Prefer an initial candidate using a clipped media container and appropriate `object-fit`/`object-position` behavior. A transparent band over a page-wide video underlay is only an alternative to measure; do not assume it is simpler or faster without testing the stacking, scroll, fallback and performance consequences.

The site's persistent strip and header should behave as one coordinated sticky top stack if sticky visibility is needed. Reserve geometry before media loads. Video disabled or failed should replace only the media layer with a poster/image/color/text fallback while preserving layout, the remaining composition, band geometry and header position. Where practical, do not instantiate/request a video when disabled. Do not autoplay with sound; provide required pause/stop/hide access and respect reduced-motion settings.

Text over media needs a reliable contrast strategy such as a scrim/overlay. Keep controls legible as the crop changes. Cropping changes presentation; it does not reduce original media download bytes. Optimize source dimensions/bitrate and loading strategy separately.

For the special persistent strip, default to text/poster unless video is explicitly enabled. Treat a media-off emergency switch and a deliberate future saved height/layout change as separate actions so disabling video does not abruptly collapse the page.

## 7. Optional multi-scene carousel

The carousel remains optional and uses the same free-form canvas and element model. Do not create a separate carousel editor or require the administrator to choose a scene mode before composing.

Place a small navigator directly beneath the canvas, with `‹ 2/6 ›`-style previous/scene-count/next controls. This navigator is visually secondary to the primary row of three circular buttons in this exact order:

**`+` Add scene · the original three-dot motif for Direction · `−` Delete scene**

The Direction control remains a three-dot motif, not a single dot or a circular-arrow icon. Its leading dot indicates where movement starts. Each click cycles exactly:

1. Left to right (default; horizontal dots, leading dot on the left).
2. Top to bottom (vertical dots, leading dot at the top).
3. Right to left (horizontal dots, leading dot on the right).
4. Bottom to top (vertical dots, leading dot at the bottom).
5. Return to left to right.

Use tooltips and an accessible name/state that spells out the selected direction.

Add creates/selects a new scene without changing existing scenes. Delete targets the selected scene only, with confirmation/Undo, and cannot accidentally delete the last required scene or shared assets. Switching scenes must not change canvas zoom, preview viewport, band dimensions, or other scenes' settings. Manual scene navigation is mandatory. Automatic rotation, if later supported, is optional and off by default, pauses on focus/hover, respects reduced-motion preference and must not leave offscreen controls keyboard-focusable.

## 8. Safe publishing, assets and potential tiers

Treat edits as drafts until the operator deliberately publishes. Future editor capability may include undo, version history/rollback, authenticated administration, reusable approved components, and a safe draft preview. Routine design editing must not enable arbitrary changes to protected account, wallet, transaction or security logic.

Media uploads need validated type/format, size limits, safe storage, access controls, and rights/licence/provenance metadata. Avoid unnecessary dependencies and external requests.

Static GitHub Pages content updates normally require a repository commit/build/deploy. Immediate runtime emergency controls imply a separate evaluation of remote configuration, authentication, reliability, cost, audit and fallback; do not promise instantaneous control from a static workflow alone.

Future Free/Member/VIP tiers could govern explicitly defined quotas such as saved compositions, scene count, advanced media tools, templates or storage. This is exploratory only. Do not implement payment/token gating in the initial editor and do not withhold safety, accessibility, or critical notices in an unsafe way.

A token used to pay for ecosystem services does not automatically qualify as a real-world-asset token. Any public legal classification needs analysis of actual rights, economics, implementation and jurisdiction, followed by qualified review.

## 9. External benchmarks and evidence requirements

Relevant source references preserved in PR #133 include WCAG 2.2, MDN `object-fit`/`object-position` and HTML video documentation, web.dev video-performance and CLS guidance, Google Core Web Vitals/page-experience guidance, and the WAI-ARIA carousel pattern.

Use these benchmarks as criteria for verification, not as claims of automatic compliance:

- WCAG reflow, visible/unobscured keyboard focus, accessible target size, text contrast, and pause/stop/hide for qualifying moving content.
- Google Core Web Vitals good field thresholds: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile when suitable field data exists.
- Validate actual behavior at narrow widths, high zoom, short landscape, keyboard-only operation, reduced motion, media enabled/disabled, video failure, resize during scroll, scene boundary conditions and long/wrapped content.
- Record PASS/FAIL/BLOCKED evidence per criterion. Code syntax, a mock, design appearance or a passing unit test alone does not establish real-browser behavior or compliance.

The detailed URLs, design reasoning and context-specific video notes are retained in the [PR #133 description](https://github.com/ACROWN-System/AstroCrown-Web/pull/133).

## 10. Impact Analysis

**IF preserved:** future implementation can begin from one versioned source of decisions, with clear boundaries between prototype, intended behavior, candidate dimensions, external standards and unresolved verification. This reduces contradictory requirements and repeated discovery.

**IF not preserved:** key editor behavior, the eight-handle interaction, separation of canvas zoom from element sizing, carousel direction cycle, media fallback semantics, and performance/accessibility cautions could remain embedded only in a long PR description and become hard to retrieve or lose continuity.

## 11. Next steps on resumption

1. Retrieve this record and PR #133 before conducting further homepage/editor navigation or implementation.
2. Inspect the current branch head and latest PR body; do not assume the candidate commit named in an older preview URL is still the latest.
3. Create/refresh an explicit implementation plan when actual editor implementation is authorized, with measurable acceptance criteria and exact scope.
4. Compare the current source, repository conventions, prior findings and applicable external documentation before coding. Reuse existing mechanisms; avoid writing a separate mock API contract from scratch.
5. Validate editor interactions in a real browser and verify keyboard/accessibility, responsive behavior, media fallback and performance before promotion.
6. Preserve the public root/`_config.yml` publication boundary until separate promotion is explicitly authorized.
7. Keep all immutable backup/archive paths unchanged.

## 12. Status at preservation

This document saves the discoveries and intended direction for later continuation. It does **not** implement the administrator editor, certify accessibility or performance, promote the homepage, decide all final design dimensions, enable automatic carousel rotation, implement tier/payment logic, or authorize edits to immutable backups.

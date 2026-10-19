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


## 14. Admin dashboard is a home for multiple administration capabilities (owner discussion, 2026-10-20)

### Dashboard information architecture

The AstroCrown Admin Dashboard is a broader administration landing page; it must not be reduced to, or immediately display, the list of pages. Present capabilities as clearly named dashboard cards or equivalent accessible navigation tiles. The Page Editor is one capability among other current or future administration functions.

- The **Page Editor** card opens the list of pages the signed-in administrator is authorized to manage.
- Selecting a page from that list opens the page-layout editor for that page.
- Other dashboard cards may be added when there is an actual project need and defined access model. Their presence in the design does not imply that those tools or backends already exist.
- Show only capabilities appropriate to the user's authorization. Protect every underlying route and operation server-side; UI visibility alone is not authorization.
- Keep the first implementation proportionate: do not invent or implement unrelated dashboard modules simply to fill the landing page. Clearly identify planned or unavailable capabilities rather than presenting them as operational.

### Flow

Admin sign-in and authorization → Admin Dashboard landing page → select **Page Editor** → authorized page list → select a page → page-layout editor → select a section/component → contextual section properties or the appropriate specialized component editor.

The announcement-band editor remains the immediate priority. The dashboard card and page list are a subsequent navigation layer and must not delay browser verification or destabilize the existing banner-editor foundation.

### Impact Analysis

**IF modified:** The dashboard can grow to accommodate multiple administration responsibilities while making page editing an explicit, discoverable tool rather than the only assumed purpose of the whole admin system.

**IF not modified:** Page selection could become the dashboard's entire initial screen, making later admin capabilities harder to organize and encouraging a navigation restructure when new capabilities are introduced.

### Status

This records the intended information architecture only. It does not claim that a dashboard landing page, cards, page list, authentication, authorization, or other admin modules have been implemented.


## 15. One account sign-in with role-gated workspace choice (owner proposal, 2026-10-20)

### Proposed user experience

Use the same normal AstroCrown account sign-in for both ordinary users and administrators. After successful authentication:

- A normal account proceeds to its usual user experience and is never shown an Admin Account choice.
- An account whose administrator role has been verified by the trusted authorization layer sees two workspace choices: **User Account** and **Admin Account**.
- **User Account** opens the ordinary AstroCrown user experience, without the administration dashboard being exposed through user navigation.
- **Admin Account** opens the private AstroCrown Admin Dashboard, whose cards may lead to Page Editor, announcement management, and other implemented administration capabilities.
- Workspace selection is a navigation/context choice, not a permission grant. Selecting, guessing, or calling an admin URL must never grant privileges.

### Mandatory security boundaries

The administrator role must be determined by a trusted backend or identity/authorization source—not a client-side flag, local storage value, editable profile field, hidden link, or user-supplied route parameter. Every protected admin page and mutation must enforce authorization server-side. Unauthorized direct requests must not disclose protected page content or admin operations. Avoid revealing admin routes to ordinary users, but treat route obscurity only as an additional privacy measure, never as access control.

An administrator using the User Account workspace still retains the identity and rights associated with their account, but admin-only operations must require the protected admin context and server-side permission checks. The precise session/mode model should be reviewed during authentication design to ensure the workspace switch cannot accidentally weaken authorization, CSRF protections, audit attribution, or session revocation.

### Scope and sequence

This is a proposed future production sign-in/dashboard behavior. The current PR #140 editor remains a local, in-memory development prototype with no authentication, persistence, or publishing; do not add a decorative/fake login to imply protection. First stabilize and verify the banner editor, then design and implement authentication/authorization under a separate plan before exposing any production admin route.

### Impact Analysis

**IF adopted:** administrators use one familiar account, can access their regular user experience, and receive an Admin Account entry only after verified authorization. This avoids duplicate identities and keeps admin navigation out of ordinary users' interfaces.

**IF not adopted:** separate admin sign-in paths or accounts could create extra friction, duplicate identity management, or inconsistent access handling.

### Status

This records the owner's proposed access direction and its security constraints. It does not indicate authentication, role verification, workspace switching, or admin-route protection is implemented or tested.


## 16. Provider independence and recovery-before-dependency requirement (owner concern, 2026-10-20)

### Requirement

Do not make the AstroCrown homepage, administration access, banner data, or ability to recover the system irreversibly dependent on one provider's free tier, account availability, proprietary runtime, authentication service, or storage service. Free services are acceptable candidates only when their limits and failure modes are understood and a practical exit/recovery path exists.

### Required design constraints

- **Static/public resilience:** the last verified published homepage and its last valid banner configuration should remain available during admin-backend/authentication outages where the static hosting layer remains available. If no new configuration can be obtained, fail safely to the last published valid state; do not blank the banner, expose drafts, or silently publish unverified changes.
- **Portable source:** keep application/business logic separate from provider-specific request handlers, storage bindings, identity adapters, and deployment configuration. Prefer widely used protocols, formats and portable dependencies. Provider-specific adapters require an explicit justification and documented replacement path.
- **Portability evidence:** if evaluating Cloudflare Python Workers or another managed runtime, verify the actual language/runtime compatibility and restrictions against the required dependencies. Cloudflare Python Workers execute through Pyodide/WebAssembly; do not assume a project behaves exactly like a conventional CPython server without testing.
- **Data ownership:** banner compositions, slot-specific links, schedules, default selection, and publication/version history must use documented, exportable formats and have a restoration/import path that does not depend solely on the original provider.
- **Independent backups:** code remains in Git. Operational data and configuration need versioned/exportable backups under owner control and, where practical, an independent copy outside the active application's provider. Never store secrets in the public repository or backup exports.
- **Identity and break-glass recovery:** recovery must not depend solely on the same provider/account being recovered. Document a secure, tested, least-privilege recovery procedure; never solve lockout by failing open or bypassing authorization.
- **Domain and deployability:** maintain owner control of the domain and records required to route it to replacement hosting. Document the minimum replacement deployment steps and environment-variable/secret names, not secret values.
- **Cost/quota handling:** monitor free-tier usage where practical, handle quota errors predictably, and keep published read-only behavior available when appropriate. A quota failure must never grant unauthorised writes or imply that an admin change was saved.
- **No premature multi-provider duplication:** first establish portability, backups, recovery documentation and tested restoration. Do not operate two live backends or introduce multi-cloud synchronization until demonstrated availability needs justify its added complexity.

### Migration acceptance test

Before a production backend is accepted, document and rehearse a provider-exit scenario with a sanitized export/sample dataset:

1. Deploy the same application logic in a local or alternate compatible environment.
2. Restore the banner and schedule data from the provider-independent export/backup.
3. verify default-banner selection, scheduled opening and closing, per-slot link mappings, and retained published state.
4. Verify that the previous host/provider is not required for the replacement instance to read/modify the restored data.
5. Verify that all credentials can be rotated and the authorized administrator can regain access securely.
6. Record exact prerequisites, manual steps, time/cost constraints and remaining provider-specific pieces. Until this is tested, portability is a design intention, not PASS.

### Implementation sequencing

Do not select or implement a production backend merely because a provider currently has a free plan. First finish browser verification and stabilize the local-only banner editor. Before backend selection, evaluate conventional portable Python hosting versus managed runtimes, including no-card/$0 eligibility, quotas, dependencies, auth integration, data export/import, domain migration, operational burden and vendor-specific runtime constraints. The current GitHub Pages/static hosting boundary remains independent of that decision.

### Impact Analysis

**IF followed:** provider outage, quota removal, account loss or plan changes are less likely to erase public availability or lock the owner out permanently; switching hosting becomes a tested migration instead of a rewrite.

**IF not followed:** the project may become coupled to one platform's runtime, identity system or data service, making a free-tier change an emergency migration and potentially preventing timely recovery of the admin account or scheduled banner data.

### Status

This is an owner-directed architecture requirement, not evidence that portability, backups, alternative hosting, account recovery or migration have been implemented or tested. Provider selection remains undecided.


## 17. Python-first implementation experiment: local banner API

### Objective

Following the owner's direction, attempt a Python implementation before selecting an external hosting provider. Keep the implementation dependency-free and within the existing repository/development workflow as far as possible. Do not conclude that Python is unsuitable merely because the static public homepage cannot itself execute a server process.

### Implementation delivered in this increment

A local-only Python API prototype has been added under development/admin/banner_backend/. It uses only the Python standard library and provides:

- A small JSON schema for the default banner, banner carousel slots, per-slot optional destination links, and schedule entries.
- Validation that absolute destination URLs use HTTPS or same-origin absolute paths; unsafe schemes, embedded URL credentials, protocol-relative URLs, and control characters are rejected.
- Explicit time-zone offsets for scheduled instants; UTC-normalized comparisons; deterministic open/close boundaries.
- Temporary banners with an opening and closing time; an open-ended schedule is accepted only when the request explicitly confirms that it will become the new default.
- Validation that temporary schedules do not overlap; an open-ended default change during a temporary event takes effect as the default after that event closes.
- JSON-file persistence using temporary-file replacement, and revision-based conflict detection to prevent stale edits from overwriting newer state.
- A small HTTP API using http.server, bound explicitly to 127.0.0.1, with GET /api/health, GET /api/state, and PUT /api/state.
- Size limits, local Host validation, no CORS permission, no-store responses, safe JSON error responses, and no external dependencies.

### Mandatory limitations

This is a local development experiment only. Authentication and user authorization are not implemented. The API does not yet connect to announcement-band-editor.html. It is not safe to expose over a network, deploy to production, or treat as a protected admin backend. The page/editor, local API, and persistent data path remain separate until the integration is deliberately implemented and tested.

The Python runtime and local HTTP API are proven to execute in a local test environment; this does not prove that a continuously running Python process can be hosted entirely inside GitHub Pages or GitHub Actions. GitHub-native orchestration/hosting possibilities remain a distinct architecture question. Do not jump to an external hosting/API dependency until the current Python implementation and credible GitHub-native options have been investigated against the actual requirements.

### Verification evidence

- Python compilation: PASS in the available local Python 3.13 environment.
- Standard-library unittest suite: PASS, 20 tests, including a real loopback HTTP server, state read/write, revision conflict, corrupt-state preservation, URL validation, timezone enforcement, schedule boundaries, overlapping-event rejection, and confirmed default transitions.
- GitHub Actions workflow [Banner Backend Python Tests](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39333043950): PASS on commit `498b46576f81c41fffec54ebfcecd74cc4f2d5ba`, using Python 3.12. Local Python compilation and all 20 tests also PASS in the available Python 3.13 environment. The NOVA RSI Engine CI, NOVA RSI CodeQL Security Analysis, and External Review Pipeline CI workflows also PASS on that code commit. These results establish the local API/code checks only; they do not establish browser integration, remote deployment, or production security.
- Browser integration of the existing visual editor with this API: NOT IMPLEMENTED.
- Authentication/authorization: NOT IMPLEMENTED.
- Public deployment, provider portability, external access, and production scheduling: BLOCKED / NOT TESTED.
- The active editor prototype and production homepage remain separate; do not modify the root homepage or _config.yml in this increment.

### Next steps

1. Inspect the exact diff and verify GitHub Actions against the new head commit.
2. Integrate the existing editor with GET/PUT state locally, preserving its visual interactions and adding clear save/load/error/conflict feedback without changing production behavior.
3. Run real-browser checks for the complete edit/save/load workflow, keyboard use, responsive layouts, and failed/offline API behavior.
4. Only after the Python integration works locally, investigate the best way to run/deploy the Python application while preferring GitHub-native options and recording each actual blocker. Compare GitHub-native mechanisms with similar practical systems before considering an external provider or service.
5. Before any public deployment, design and test authentication/authorization, persistent-state backup/restore, provider exit, and scheduled published configuration.

### Impact Analysis

**IF modified:** AstroCrown gains a dependency-free Python implementation for core banner validation, scheduling rules, and local persistence, allowing real behavior and tests before a hosting vendor is selected. GitHub CI makes these regressions repeatable without introducing a third-party package.

**IF not modified:** Python would remain only a prospective option; the project would continue discussing runtime constraints without empirical evidence from a working application. Provider choices could be made prematurely, and the banner scheduling rules might be duplicated between frontend and backend.

### Status

The local Python API and its tests are implemented. This is evidence that the domain logic and local HTTP service are feasible in Python; it is not evidence that a production deployment is complete, that the frontend is integrated, or that authorization/security requirements are met.


### Frontend/API integration update (2026-10-20)

- The Python server serves the development-only editor at \`/admin/banner-editor\` on the same loopback origin as \`/api/state\`, avoiding \`file://\` fetch/CORS issues for the local integration.
- The editor now loads the saved default banner composition on startup and has explicit **Save draft** / **Reload saved draft** controls with a live status message.
- Content/property updates, visibility, layer order, band base color/height, pointer movement/resizing, deletion, and undo mark the composition unsaved. Reload prompts before discarding local changes.
- Save uses the last-read revision. A stale write receives HTTP 409; in-page edits remain intact and another save is disabled until the administrator reloads and reviews the newer stored version.
- Save replaces the current default banner's first-slot composition while retaining the rest of the state document, including other banner records, slot link flags/URLs, and schedules.
- The initial local JSON state includes the same starter text element shown by the visual editor.
- Two HTTP test cases cover the served editor route and the root route's explicit not-production-ready boundary. The suite now contains 21 tests, plus Node's inline JavaScript syntax check in CI.
- The Python API remains unauthenticated and bound to 127.0.0.1 only. The integration does not add production publishing, remote hosting, or public homepage changes.
- Browser verification remains BLOCKED until a real browser run demonstrates UI rendering, save/load, conflict prompts, keyboard and responsive behavior. Passing automated tests do not establish browser or production acceptance.

### Updated Impact Analysis

**IF integrated:** the Python domain/persistence implementation and visual editor work together locally with explicit save/load state, recoverable local drafts, and stale-write protection while preserving the production-site boundary.

**IF not integrated:** the editor remains disconnected and non-persistent; the Python API could pass API tests without proving it can support the actual banner-editing workflow.

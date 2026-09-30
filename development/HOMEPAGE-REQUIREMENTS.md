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


## Intent Preservation, Evidence, and Verification Governance

### Intent Preservation Principle

The homepage requirements are a controlled expression of product intent. Development may add evidence, resolve uncertainty, refine implementation, and improve quality, but no later stage may silently change the meaning, scope, certainty, or intended outcome established by an earlier stage.

The controlled development chain is:

Intent → Discovery → Requirement / Candidate Requirement → Evaluation → Decision → Implementation → Verification → Audit / Evidence → Promotion

Each stage has a distinct purpose:

- **Intent** defines why the homepage or subsystem exists and what outcome it is intended to provide.
- **Discovery** records useful knowledge, observed behavior, evidence, constraints, benchmarks, or opportunities without automatically making them mandatory.
- **Requirement** defines an approved outcome or constraint that implementation must satisfy.
- **Candidate Requirement** identifies a plausible requirement that still requires evaluation.
- **Evaluation** tests candidates, alternatives, compatibility, quality, risk, and evidence.
- **Decision** records the explicit resolution of an evaluated uncertainty or choice.
- **Implementation** expresses approved requirements and decisions in the product.
- **Verification** determines whether the implementation conforms to applicable requirements and decisions.
- **Audit / Evidence** preserves the basis for verification and traceability.
- **Promotion** moves a sufficiently verified implementation toward the regular/public website.

Implementation convenience, common industry practice, a technology recommendation, an AI-generated suggestion, or an evaluator preference must not silently become a requirement.

### Requirement Maturity and Status

Use these distinctions where useful:

- **Approved Requirement** — implementation must satisfy it.
- **Candidate Requirement** — potential requirement awaiting evidence and decision.
- **Discovery** — useful or verified finding that should be preserved without automatically imposing implementation.
- **Research Question** — unresolved question requiring investigation.
- **Explicitly Undefined** — known decision intentionally left open.
- **Implementation Decision** — evaluated and selected implementation approach.
- **Verification Result** — evidence-backed result for an implemented requirement.
- **Historical Regression Target** — previous failure/behavior that must be re-tested when relevant.
- **N/A** — demonstrably not applicable in the tested scope.
- **BLOCKED** — verification cannot responsibly be completed because required evidence, environment, dependency, or decision is missing.

These are maturity/status labels, not quality scores.

### No Silent Inference Rule

A statement shall not acquire additional meaning merely because implementation requires a concrete value.

Examples:

- "consensus" does not mean arithmetic mean unless explicitly decided;
- "capital activity" does not automatically mean TVL growth;
- "influence" does not automatically mean causation;
- "responsive" does not automatically mean a particular breakpoint;
- "accessible" does not automatically mean one technique;
- "fast" does not automatically mean an arbitrary performance threshold.

Concrete interpretations must be evaluated and explicitly decided.

### Evidence Sufficiency Rule

Absence of evidence is not PASS.

Verification results shall be:

- PASS
- FAIL
- N/A — with applicability reason
- BLOCKED — with blocking reason

PASS requires evidence sufficient to understand the tested condition and result.

### Reproducible Verification Rule

Where reasonably possible, verification shall identify:

- requirement/test identifier;
- implementation/version;
- viewport/device/browser;
- relevant input method;
- initial state;
- test action;
- expected and observed result;
- data/source state;
- date/time;
- evidence location;
- result and limitations.

### Historical Regression Rule

When a homepage behavior has a relevant historical defect, failed implementation, or previous regression, that condition shall be preserved as a regression target when the behavior is rebuilt or modified.

A new implementation is not verified merely because it behaves differently. The relevant historical failure condition shall be re-tested where applicable.

### Edge, Failure, and Boundary-State Rule

Interactive and data-bearing systems shall be evaluated under applicable:

- empty;
- missing-data;
- stale-data;
- unavailable-source;
- conflicting-source;
- invalid-input;
- boundary;
- overflow;
- loading;
- failure;
- recovery;
- reduced-motion/accessibility;
- degraded-dependency states.

The applicable states depend on the subsystem.

### External Evaluation Conflict Rule

External standards, benchmarks, audits, rankings, and evaluator recommendations should be incorporated when they improve, protect, or appropriately measure quality, usability, reliability, discoverability, accessibility, security, interoperability, or operational performance.

Where an external criterion conflicts with established AstroCrown purpose or materially reduces quality, it shall not be followed automatically. The conflict, evidence, alternatives, and decision shall be documented.

The objective is not to optimize for an external score at the expense of product purpose.

### Compliance, Quality, and Optimization

Distinguish:

- **Compliance** — satisfying an applicable standard/rule/requirement.
- **Quality** — improving the actual product or technical outcome.
- **Optimization** — improving a measurable result within established product purpose.

Compliance is not proof of overall quality, and optimization does not override approved product intent.

### Verification Applicability Rule

Applicable verification techniques shall be explicitly assessed rather than silently omitted.

Potential techniques include requirements review, source/structural inspection, HTML validation, accessibility inspection, keyboard testing, black-box functional testing, negative/boundary testing, automated testing, static analysis, dependency review, secret scanning, threat modeling, security scanning, web-application scanning where applicable, historical regression testing, fuzzing where meaningful, included-software verification, performance testing, real-user performance measurement where sufficient data exists, and visual/responsive verification.

The detailed audit system remains authoritative for test records and evidence.

### External Quality Frameworks

Relevant current references include:

- WCAG 2.2 and WAI accessibility guidance.
- WAI-ARIA Authoring Practices where applicable.
- Lighthouse and PageSpeed Insights.
- Core Web Vitals, including LCP, INP, and CLS.
- NIST SP 800-218 Secure Software Development Framework (SSDF) 1.1.
- OWASP Application Security Verification Standard (ASVS) 5.0.0.
- ISO/IEC 25010:2023 product quality model.
- Relevant browser/platform standards and compatibility documentation.

These are evaluation inputs, not automatic adoption of every criterion.

### External Reference Integrity

External results shall be interpreted with applicable date/version, population/dataset, methodology, and limitations.

A public ranking is not automatically a quality measure. A performance score is not an overall product-quality score. A conformance result is not certification. An industry reference product is not automatically an implementation requirement.

Where an external reference adequately verifies a criterion, do not create an equivalent internal metric merely to duplicate it.

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
| AstroCrown Deep Space Blue | `#081426` | Foundational deep-space environment |
| AstroCrown Space Blue | TBD | Primary dark UI surfaces, including the homepage header and navigation controls |
| AstroCrown Light Space Blue | `#16345A` | Borders, demarcation, separators |
| AstroCrown Green | `#20C878` | Positive financial state |
| AstroCrown Red | `#E5484D` | Negative financial state |
| AstroCrown Warning Yellow | `#FFD24A` | Warning, alert, caution |
| AstroCrown Warm White | `#FFF7E0` | Primary readable text |

The three blue levels form a deliberate visual hierarchy:
- AstroCrown Deep Space Blue `#081426` is the darkest blue environment layer.
- AstroCrown Space Blue is the intermediate UI-surface blue and must remain visually distinct from both adjacent blue levels.
- AstroCrown Light Space Blue `#16345A` is the lightest structural blue and is used primarily for borders, demarcation, and separators.

The AstroCrown Space Blue HEX value remains TBD until a candidate is evaluated for visual hierarchy, text/UI contrast, header use, navigation-control use, and compatibility with the established palette. It must be darker than `#16345A` and lighter than `#081426` when evaluated by the chosen color model and visual result.

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

## Palette and Header Color Decision Gate

The homepage palette and header requirements are coupled because the header introduces AstroCrown Space Blue as a required intermediate UI-surface color.

Before header implementation:
1. define candidate AstroCrown Space Blue values;
2. evaluate each candidate against AstroCrown Deep Space Blue `#081426` and AstroCrown Light Space Blue `#16345A`;
3. verify the candidate's intended header/navigation text and UI-state contrast;
4. verify that the candidate remains visually distinguishable from the adjacent blue levels at the intended rendered sizes and surfaces;
5. record the selected value and evidence in the applicable design decision/audit record.

The candidate process must not assume that the arithmetic midpoint between the two existing colors is the correct value. The selected value is a design decision derived from the required semantic hierarchy and verification evidence.

For accessibility, interactive component and state indicators must meet the applicable WCAG 2.2 contrast requirements. WCAG 2.2 identifies a 3:1 minimum for applicable non-text UI components and states, while text contrast requirements are separately applicable; visible keyboard focus must also remain discernible. The detailed accessibility verification should use the project's WCAG/WAI-ARIA references rather than treating the palette decision itself as sufficient evidence.

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

The header shall use the approved AstroCrown Space Blue as its primary opaque surface. The Space Blue value must be established before implementation and must satisfy the R-005 three-level blue hierarchy and the applicable accessibility verification requirements. It must not be selected solely by name, midpoint arithmetic, or visual preference without evaluation evidence.

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

- use the same approved AstroCrown Space Blue surface as the header unless a later requirement explicitly establishes a distinct navigation-surface color;
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

#### R-019.18 — Header Verification Requirements

Header implementation shall be verified against at least:

- approximately 59 px rendered height;
- full viewport-width coverage;
- approved three-level blue hierarchy and header/background color relationship;
- sufficient text and UI-control contrast for the selected Space Blue surface;
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
## R-021 — Homepage Hero Card System

### Purpose

The hero card system shall provide a compact, high-information discovery layer between the homepage information bar and market data bar. Cards shall answer high-value market questions quickly and provide direct navigation into deeper information.

Initial three-card architecture:

1. **Fear & Greed Consensus** — How does the market feel?
2. **Winners & Losers** — What is moving?
3. **Top Influences / Influence Map** — What appears to be influencing movement?

Names may be refined without changing the underlying intent.

### R-021.1 — Card Composition and Information Hierarchy

Card composition shall be determined from user task, information density, decision/action value, comprehension, retention/discovery value, interaction cost, evidence, relationship to deeper sections, and responsive constraints.

Dimensions shall not be selected solely as arbitrary viewport percentages.

Fear & Greed Consensus may receive a larger visual area where required by its gauge/speedometer and information hierarchy.

### R-021.2 — Whole-Card Interaction

Actionable cards shall behave as coherent interactive surfaces.

For navigation cards:

- the card should be the primary interaction;
- a small generic downward arrowhead may sit partly inside/partly outside the lower border;
- the arrowhead shall not create a competing destination;
- a separate large CTA shall not be introduced unless a distinct action exists;
- keyboard/assistive-technology users shall have an equivalent accessible interaction;
- hover, focus, pressed, and unavailable states shall remain distinguishable.

### R-021.3 — Fear & Greed Consensus

#### Product intent

The card shall summarize market sentiment across multiple independent sentiment sources rather than presenting one provider as the complete market view.

The principal value is the relationship among source scores, consensus, agreement, spread, and evidenced direction/trend.

#### Candidate sources

Candidate systems include Alternative.me, CoinMarketCap, CoinGecko, CFGI, and other publicly accessible sources discovered and evaluated later.

Selection depends on data availability, usage/licensing conditions, methodology transparency, update reliability, historical availability, semantic compatibility, access constraints, reproducibility, cost, security, and reuse potential.

#### Information model

Candidate displayed information includes:

- consensus score;
- classification;
- source scores;
- agreement;
- spread;
- short evidence-based insight;
- methodology access.

#### Consensus methodology

"Consensus" is intentionally undefined until evaluated.

Candidate methods include arithmetic mean, median, weighted mean, robust/normalized aggregation, or another evidence-supported method.

The selected method must account for differences in provider scales, classifications, update times, and semantic meaning. Numeric values shall not be combined merely because they are numeric.

#### Agreement and spread

Agreement and spread shall be explicitly defined before implementation. Normalization, calculation, missing-source behavior, edge cases, and tests must be established first.

#### Data integrity

The system shall distinguish, where relevant, current, stale, missing, conflicting, and insufficient source data. A missing provider shall not silently become zero or otherwise distort the result.

### R-021.4 — Winners & Losers

The card shall identify meaningful positive and negative market movers without relying on price change alone.

Preferred compact composition:

- Winners;
- Losers;
- Price Change;
- Volume Change;
- compact overlaid mini-chart.

Price Change and Volume Change should be beside the chart rather than automatically stacked when space permits.

The exact ranking methodology remains undefined pending evaluation of:

- timeframe;
- eligible universe;
- liquidity/volume minimums;
- price-change calculation;
- volume-change calculation;
- outlier handling;
- stale/missing data;
- wrapped/duplicate assets;
- update cadence.

The system shall not imply that the largest percentage move is automatically the most meaningful mover.

### R-021.5 — Top Influences / Influence Map

The card shall summarize observable market influence signals and connect them to meaningful categories/themes that users can explore further.

It shall communicate **observed influence**, not unverified causation.

Candidate dimensions include:

- Trend;
- Capital Activity;
- Derivatives;
- Whale Activity;
- ETF Flow;
- News;
- Regulation;
- Technology;
- Macro;
- Narrative.

Candidate evidence inputs include TVL growth, capital flows, whale activity, ETF activity, derivatives activity, sector rotation, narrative activity, news, and other evidence-backed signals.

These inputs are candidates, not automatic definitions. Capital Activity must not silently become TVL growth; influence must not silently become causation or correlation.

Where useful, thematic outputs should align with directory filters, for example:

- Capital Activity → DeFi;
- Technology → AI;
- News → Gaming;
- Macro → BTC;
- Regulation → Payments.

Individual tokens may be shown when they are the appropriate evidence-bearing entity, but influence should not be reduced to individual tokens by default.

The final influence model must define score/strength, evidence sources, lookback period, weighting, confidence, minimum evidence, conflict handling, and stale-data behavior before implementation.

### R-021.6 — Card Data Provenance

For all data-bearing cards:

- each externally derived value shall have an identifiable source;
- calculations shall have documented methodology;
- derived values shall be distinguishable from source values;
- relevant timestamps/freshness shall be considered;
- licensing/usage conditions shall be reviewed;
- unavailable/stale behavior shall be defined;
- source substitution shall not silently change metric meaning.

### R-021.7 — Card Failure and Boundary States

Each card shall be evaluated for applicable loading, no-data, partial-source, stale, conflicting, malformed, insufficient-data, calculation-failure, source/API-failure, delayed-update, unavailable-destination, reduced-motion, keyboard/focus, and recovery states.

Missing evidence shall not be represented as zero, neutral, healthy, or positive unless the approved methodology explicitly defines that meaning.

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

### R-021.10 — Card Verification

Verification shall cover, as applicable, visual hierarchy, data correctness, provenance, calculation correctness, edge/failure states, stale/missing behavior, keyboard/focus, screen-reader semantics, responsive behavior, reduced motion, destination behavior, performance, dependency/redundancy, and historical regression.

## R-022 — Homepage Market Data Bar

### Purpose

The Market Data Bar shall provide compact current market context between discovery cards and the working directory.

### Candidate information

Candidate information includes Market Cap, BTC Dominance, ETH Dominance where useful, BTC, ETH, ACROWN, 24h Volume, and other approved market-state indicators.

The final information set remains subject to information-density and usability evaluation.

### Data integrity

Market values shall identify source, freshness expectations, source-vs-derived status, unavailable/stale behavior, and reference conventions.

### Reuse

Market data should be normalized once where practical and reused by the Market Data Bar, Influence Map, market-state classification, sector analysis, market directory, analytics/research, and NOVA evidence systems.

### Explicitly Undefined

Exact metric set, ordering, layout, update cadence, providers, reference currency/device, market-state calculation, stale threshold, and compact responsive behavior remain undefined.

## R-023 — Homepage Working Market Directory

### Purpose

The working section shall provide the primary market exploration and action workspace.

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

## R-024 — Discovery Section #2

The second discovery section shall provide navigation into deeper AstroCrown areas after the primary market workspace without duplicating hero-card or directory information.

Candidate destinations may include market, research, analytics, exchange/swap, knowledge, ecosystem, and NOVA-powered systems.

Destinations shall be based on established information architecture and not invented merely to populate navigation.

Exact number, destinations, visual composition, content, ordering, and responsive behavior remain undefined.

## R-025 — Homepage Footer

The footer shall provide supporting navigation, identity, legal/trust information, and applicable ecosystem links without competing with primary discovery and market workspace.

Candidate information includes AstroCrown identity, navigation, legal/privacy/terms, contact/support, ecosystem links, attribution, and status/system information as applicable.

Links shall only be presented when their destination and purpose are established.

The footer shall be keyboard accessible, semantically structured, visually consistent, readable, non-redundant, and compatible with the homepage scroll model.

## R-026 — Shared Data, Evidence, and Reuse Architecture

The homepage shall avoid unnecessary duplication of data fetching, normalization, calculation, visualization logic, and evidence handling.

Before adding a mechanism, evaluate whether an approved mechanism can provide the same data, calculation, visualization, interaction, provenance, or accessibility behavior.

Where technically and operationally appropriate:

**source → validation → normalization → derived calculation → reusable evidence/data → multiple consumers**

Potential reusable inputs include:

- BTC dominance → Market Data Bar + Influence Map + market classification;
- sentiment data → Fear & Greed Consensus + historical sentiment research;
- ETF flows → Influence Map + analytics + research;
- sector performance → filters + Influence Map + market analysis;
- normalized market data → directory + cards + analytics.

These are reuse opportunities, not mandatory architecture.

Data-bearing systems shall consider source identity, retrieval/source timestamps, freshness, transformation, methodology, confidence/limitations, errors, and licensing.


### R-026A — External Information Access, Legal Status, and Multi-Source Evidence Synthesis

The homepage data architecture shall distinguish **information existence**, **technical accessibility**, **lawful use**, **provider permission/contractual terms**, **data licensing**, and **redistribution/display conditions** rather than collapsing them into one status.

AstroCrown's purpose of educating users, improving understanding, comparing observations, and synthesizing evidence is a material product-purpose factor, but it shall not be treated as an automatic legal exemption. The applicable legal analysis depends on the information, use, jurisdiction, access method, contractual relationship, and other facts.

Likewise, a provider's terms or policy shall not automatically be represented as legislation or as the complete statement of what applicable law permits or prohibits.

The system shall therefore distinguish at least:

- **Publicly visible** — information can be viewed by a person through a public interface.
- **Technically accessible** — information can be obtained by an identified technical mechanism.
- **API accessible** — an identified API/endpoint can return the information under its current access conditions.
- **Free-tier accessible** — a current free/public access route has been verified.
- **Paid/licensed access** — access requires a paid plan or separate license.
- **Provider-authorized use** — a provider explicitly grants the relevant use.
- **Contractual restriction** — an applicable agreement may restrict the intended use.
- **Provider policy/recommendation** — the provider communicates a restriction or preference whose legal/contractual status still requires interpretation.
- **Potential statutory/legal basis** — an applicable law may independently permit or protect the proposed use.
- **Unresolved legal status** — available evidence is insufficient to determine the legal status responsibly.
- **Unavailable / unsupported** — the required data cannot currently be obtained through an identified lawful/usable route.
- **Alternative-source required** — the information objective remains valid but must be sourced elsewhere.

These states are intentionally separate. In particular:

**publicly visible ≠ automatically machine-accessible**

**technically accessible ≠ automatically lawful to reuse**

**provider prohibition ≠ automatically a statement of statutory law**

**provider authorization ≠ automatically permission to do something prohibited by law**

**educational purpose ≠ automatically fair use/fair dealing or another exception**

**one source's restriction ≠ automatically a restriction on the underlying factual information from every other lawful source**

### Legal and contractual boundary principle

AstroCrown development shall investigate the applicable legal framework before labeling an external-data use as either permitted or prohibited.

For every material external-data use, consider as applicable:

1. the underlying information and whether it is factual, expressive, analytical, compiled, branded, or otherwise protected;
2. the relevant jurisdiction(s);
3. copyright and related rights;
4. database rights where applicable;
5. trademark and branding considerations where applicable;
6. privacy/data-protection requirements where applicable;
7. computer-access, anti-circumvention, or technical-access restrictions where applicable;
8. financial-market or other regulatory requirements where applicable;
9. contractual terms that actually govern AstroCrown's access/use;
10. applicable statutory exceptions, defenses, permissions, or other legal rights;
11. the exact proposed use, including display, quotation, transformation, aggregation, caching, analysis, teaching, research, redistribution, or creation of a derived result;
12. whether the proposed use substitutes for, competes with, or materially republishes the provider's protected product/content;
13. whether a lower-risk alternative source can provide the same underlying factual observation.

U.S. fair-use doctrine and India's statutory fair-dealing framework demonstrate why educational, research, criticism, review, or similar purposes can be legally relevant without creating a universal permission. The U.S. Copyright Office describes fair use as a fact-specific doctrine and identifies teaching, scholarship, and research as examples of uses that may qualify; India's Copyright Office identifies fair dealing for private/personal use including research, criticism/review, and reporting of current events under Section 52. These examples shall be treated as jurisdiction-specific legal evidence, not as a universal AstroCrown authorization.

Sources:
- https://copyright.gov/fair-use/
- https://copyright.gov.in/Copyright_Act_1957/chapter_xi.html

Where AstroCrown is intended for users or operations spanning multiple jurisdictions, the jurisdictional basis of a proposed use shall not be silently assumed. A right or exception in one jurisdiction does not automatically establish the same right everywhere.

### Facts, expression, database, and derived information

The evidence layer shall distinguish the **underlying fact or observation** from the provider's **expression or presentation** of that information.

Potentially distinct objects include:

- raw factual observations such as a reported price, timestamp, volume, open interest, or public event;
- a provider's written explanation;
- provider-created labels, rankings, classifications, or scores;
- provider-generated charts, graphics, interfaces, or visual compositions;
- databases or compilations and their original selection/arrangement;
- proprietary methodology;
- normalized or derived metrics;
- AstroCrown's own calculations, transformations, comparisons, classifications, and explanations;
- trademarks, logos, and other provider identifiers.

The system shall not silently treat these categories as legally interchangeable.

India's official copyright guidance states that copyright protects original expression rather than ideas and notes that factual information is generally not protected as such; U.S. case law likewise distinguishes uncopyrightable facts from original selection/arrangement. These sources are legal background, not a conclusion about any particular AstroCrown use.

Sources:
- https://copyright.gov.in/documents/handbook.html
- https://www.law.cornell.edu/supremecourt/text/499/340

### Multi-source evidence synthesis

Where lawful and technically feasible, AstroCrown should investigate using multiple heterogeneous sources rather than selecting one provider as the sole authority.

The intended conceptual architecture is:

**multiple external observations**
→ **provenance capture**
→ **validation**
→ **normalization**
→ **semantic compatibility check**
→ **source-independence / overlap analysis**
→ **conflict detection**
→ **evidence evaluation**
→ **synthesis / derivation**
→ **uncertainty-aware result**
→ **reusable evidence**

The objective is not simply to maximize the number of inputs.

The system shall consider whether apparently independent sources actually depend on the same upstream exchanges, datasets, methodology, or reporting chain. Correlated sources shall not be treated as fully independent confirmations merely because they have different brand names.

Agreement may strengthen support for an observation, but:

**agreement ≠ truth**

**majority vote ≠ correctness**

**more sources ≠ automatically better evidence**

Disagreement is itself valuable information and shall be preserved when materially relevant.

A source contributing unique evidence shall not be discarded merely because no other source confirms it.

### Source-specific feasibility and access snapshot

The following is a **research snapshot dated 2026-09-30**. It is evidence for planning and discovery, not a permanent license determination. Provider documentation, pricing, APIs, policies, product terms, regional availability, and legal circumstances can change and must be re-verified before implementation or release.

| Source / system | Current technical access finding | Current provider-access posture observed | Candidate AstroCrown use | Operational implication |
|---|---|---|---|---|
| **CoinMarketCap** | Current API documentation advertises a keyless public trial endpoint and a free Basic plan with 15K monthly call credits / 50 requests per minute; higher plans provide broader access. | Current commercial terms provide a license for specified use on one product and permit temporary storage necessary to make content available, while restricting standalone redistribution and automated scraping/copying outside the licensed scope. | Market listings, quotes, rankings, sentiment/market observations, comparison and derived calculations where the applicable plan/terms permit. | Technically accessible for prototype exploration; exact product/user scenario, caching, display, derived-data treatment and redistribution boundaries require verification against the current agreement. |
| **CoinGecko** | Public API access exists; current documentation describes a Demo/public tier and commercial API plans. The current public-plan documentation states a rate limit of 5–15 calls/minute and 30 calls/minute for a registered Demo account. | Current commercial documentation permits commercial products on specified plans with prominent CoinGecko attribution but prohibits selling/renting/sub-licensing/re-distributing/syndicating raw API access/data under standard terms; custom licensing is described for redistribution/white-label cases. | Broad market data, asset/exchange information, market categories, sentiment-related observations, reusable normalized market data. | Strong prototype candidate; attribution and raw-data redistribution constraints must be treated as explicit operational metadata, not inferred away. |
| **CoinGlass** | Current API documentation exposes extensive Futures, Spot, Options, ETF, On-Chain and Index endpoints; API access uses an API key. | Current pricing shows Hobbyist/Startup plans marked personal use and Standard/Professional marked commercial use, with higher endpoint/rate-limit/history capacity. Current site Terms state commercial use without authorization and bulk scraping/extraction are restricted. | Derivatives, open interest, funding, liquidations, ETF, on-chain, whale/institutional-related signals and other advanced market evidence where the applicable plan and terms permit. | Highly valuable but not a $0 commercial API assumption. Commercial acquisition cost, rate limits and permitted downstream use must be recorded before dependence. |
| **Binance market APIs** | Current Binance developer documentation identifies multiple spot market-data endpoints with security type **NONE**, including ticker, depth, klines, trades and exchange information through the documented market-data API infrastructure. Other endpoint families require API keys. | Technical API accessibility is clear for the identified public market-data endpoints. Binance Terms and product terms govern use of Binance services/IP and must be reviewed separately from the existence of public factual market observations. | Exchange-native spot market data, order-book/trade observations, symbols, market status and cross-checking of other data. | Strong technical source candidate for raw market observations; maintain separate technical-access and legal/contractual-status fields. |
| **TradingView** | TradingView is readily accessible as a human-facing market-analysis reference system and provides extensive market information and analytical interfaces. | Current TradingView policy states that its market data/content is licensed for display-only use and expressly prohibits non-display uses including machine-driven processing and products/services based on its content, subject to the exact current policy/agreements. | Human benchmark/reference, methodology comparison, UI/analysis reference, discovery of candidate information objectives; direct machine ingestion only where an independently verified lawful and contractually permitted route exists. | Do not silently use TradingView page output as a backend data feed. Prefer original/alternative lawful sources for the same underlying observations where available. |
| **Alternative.me Fear & Greed / Crypto API** | Current public API exposes latest and historical crypto data and a Fear & Greed endpoint; current API documentation specifies a 60 requests/minute limit and five-minute update cadence for relevant endpoints. | Current Fear & Greed page says commercial use is allowed with attribution next to the displayed data; the broader API page describes commercial use as permitted and asks for project reference while describing it as optional. Because wording differs across the provider's current pages, the exact use/attribution rule must be rechecked at implementation. | Fear & Greed source observation, historical sentiment, methodology comparison and multi-source consensus. | Excellent candidate for $0 prototype testing, subject to current endpoint behavior, attribution interpretation, and availability verification. |

Research sources for the snapshot:

- CoinMarketCap API: https://coinmarketcap.com/api/ ; https://pro.coinmarketcap.com/user-agreement-commercial/
- CoinGecko API: https://www.coingecko.com/en/api ; https://support.coingecko.com/hc/en-us/articles/4538771776153-What-is-the-rate-limit-for-CoinGecko-API-public-plan ; https://support.coingecko.com/hc/en-us/articles/16760512207257-What-Are-the-Differences-Between-Commercial-and-Custom-Licenses
- CoinGlass API: https://docs.coinglass.com/reference/endpoint-overview ; https://www.coinglass.com/pricing ; https://www.coinglass.com/terms
- Binance developer/API documentation: https://developers.binance.com/en/docs/products/derivatives-trading-portfolio-margin-pro/general-info ; https://www.binance.com/en-AE/support/faq/detail/865f0fe3cb6a4d73a21609b3b7326f31
- TradingView policy: https://www.tradingview.com/policies/
- Alternative.me: https://alternative.me/crypto/api/ ; https://alternative.me/crypto/fear-and-greed-index/

### Important interpretation of the source snapshot

The table shall not be converted into a simplistic provider ranking.

A source may be:

- technically easy but legally/contractually narrow;
- legally usable for one purpose but technically expensive;
- rich in unique information but unsuitable for automated ingestion;
- valuable as a methodology reference but not as a machine-data provider;
- available through a public page but not through a reusable API;
- usable for display but not for backend processing;
- licensed for integrated product use but not standalone redistribution;
- available under different conditions by region, plan, product, or user type.

The architecture should therefore evaluate **source suitability for the exact information objective**, not assign a permanent global "allowed" or "not allowed" status to an entire provider.

### Source selection and substitution rule

When a desired observation is restricted through one provider, AstroCrown should not automatically discard the information objective.

Instead investigate:

**What exact information do we need?**

→ **What is its underlying factual/analytical nature?**

→ **Which original or alternative sources can provide it?**

→ **Can those sources be accessed and used lawfully?**

→ **Can multiple sources cross-check it?**

→ **Can AstroCrown derive the required result itself?**

This prevents unnecessary architectural dependence on a particular provider.

A provider-specific restriction should therefore normally produce an **access constraint**, **source substitution investigation**, or **legal-review state**, rather than automatically producing a product-level prohibition unless the applicable legal analysis actually supports such a conclusion.


### R-026C — Provider Interdictions, Anti-Automation Controls, and Access-State Evidence

A provider's statement, banner, terms page, `robots.txt` entry, API refusal, HTTP response, CAPTCHA, JavaScript challenge, WAF rule, bot score, rate limit, IP restriction, authentication gate, session requirement, or other anti-automation mechanism is an **access-state observation** that must be recorded separately from the legal conclusion about the underlying information or intended use.

A provider's explicit statement that a use is "not allowed" shall therefore not automatically be represented by AstroCrown as a definitive statement of applicable law.

The opposite assumption is equally prohibited: a potentially applicable legal right or exception shall not automatically be represented as technical authorization to bypass a provider-controlled access mechanism.

The system shall distinguish at least:

- **Provider says no** — a provider has communicated a restriction.
- **Technical access blocked** — the current acquisition attempt is technically prevented.
- **Robots restriction observed** — a `robots.txt` rule requests crawler behavior restrictions.
- **Automated-client challenge** — the service requires a browser/user challenge or other automated-traffic verification.
- **Rate limited** — requests are being constrained by a rate-limit mechanism.
- **Authentication required** — the intended resource requires credentials or an authenticated session.
- **Access-control restriction** — a technical control limits access to a resource.
- **Legal prohibition identified** — applicable law has been sufficiently established as prohibiting the specific intended action.
- **Contractual/provider restriction identified** — an applicable agreement or legally relevant provider term governs the intended use.
- **Legal status unresolved** — legal evidence is insufficient.
- **Alternative acquisition path available** — the information objective can be pursued through another source/channel.

### Provider interdiction is not automatically law

The system shall not infer:

**provider says prohibited → law prohibits it**

nor:

**law may permit it → provider must technically permit it**

nor:

**publicly visible → automated retrieval is authorized**

nor:

**robots.txt permits/disallows → complete legal authorization/prohibition has been established**

RFC 9309, which standardizes the Robots Exclusion Protocol, explicitly describes robots.txt as rules that crawlers are requested to honor and states that the protocol is **not a form of access authorization**. Therefore a robots.txt observation must be recorded as its own access/operational state rather than being silently translated into a legal conclusion.  
Source: https://www.rfc-editor.org/rfc/rfc9309.html

Provider policies and technical controls remain operationally important even where they are not themselves legislation. They can determine whether a particular automated acquisition method works, whether access requires a different channel, whether a contractual relationship exists, whether a service will permit requests, and whether an intended implementation is operationally sustainable.

### Anti-automation and access-control mechanisms

Modern web services can distinguish automated clients and may present a challenge, rate-limit, block, or otherwise alter access.

Current Cloudflare documentation, for example, describes WAF, Bot Management, rate limiting, interstitial challenge pages, JavaScript detections, bot scores, and other mechanisms that can hold a request before the destination is reached or challenge traffic identified as automated.  
Sources:
- https://developers.cloudflare.com/cloudflare-challenges/concepts/how-challenges-work/
- https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/
- https://developers.cloudflare.com/waf/custom-rules/use-cases/challenge-bad-bots/

These mechanisms create genuine **technical/operational constraints** even though their existence does not, by itself, determine the legal status of accessing or using the underlying information.

AstroCrown shall not treat anti-automation research as an invitation to defeat, circumvent, disable, or evade access controls.

Where a route is challenged or blocked, investigate instead:

1. whether an official API or public download exists;
2. whether a documented non-API route is expressly available;
3. whether the provider offers an authorized automated-access mechanism;
4. whether the same underlying information is available from an original or independent source;
5. whether manual verification is sufficient for the research objective;
6. whether a different acquisition path provides equivalent or better evidence;
7. whether the intended use requires legal or contractual review.

A technical block may therefore increase acquisition cost or reduce operational feasibility without establishing that the information itself is legally unavailable.

### Access-state evidence versus legal evidence

For auditability, evidence should identify whether a finding came from:

- legislation/regulation/case law;
- an official government or standards publication;
- provider terms/agreement;
- provider documentation;
- provider support statement;
- `robots.txt`;
- HTTP/network behavior;
- an observed challenge/block/rate limit;
- a documented API specification;
- an independently tested runtime;
- human observation;
- another source.

These evidence classes shall not be silently treated as equivalent.

For example, an HTTP 403, CAPTCHA page, or bot challenge establishes an observed technical response. It does not, by itself, establish why the response occurred or whether the underlying use is legally prohibited.

Likewise, a provider's "do not scrape" statement establishes a provider position. It does not, by itself, settle every question of statutory rights, contractual enforceability, jurisdiction, database rights, copyright exceptions, or other applicable law.

### Access-path decision rule

When a source is blocked or restricted, the next decision shall be based on the **information objective**, not on the desire to defeat the particular control.

The evaluation should ask:

**What information is actually required?**

→ **What part of the provider's product supplies it?**

→ **Can an original/independent source supply the same underlying information?**

→ **Can a public file, feed, filing, blockchain, exchange endpoint, or other channel supply it?**

→ **Is that channel technically accessible?**

→ **What provider/contractual conditions apply?**

→ **What legal basis or unresolved legal question applies?**

→ **What provenance and reproducibility can be maintained?**

This preserves the possibility of discovering new acquisition routes without treating technical circumvention as a normal engineering strategy.

### Boundary-state rule for automated acquisition

Automated acquisition shall recognize and preserve at least:

- success;
- empty result;
- stale result;
- changed schema;
- partial result;
- rate limited;
- authentication required;
- challenge presented;
- blocked;
- robots restriction observed;
- terms/policy restriction observed;
- network/tool failure;
- provider unavailable;
- alternative source selected;
- legal review required.

A system must not silently convert any of these states into an empty dataset, zero value, neutral result, or successful acquisition.

### Operational source registry candidate

A future implementation should investigate a machine-readable source registry with fields such as:

- source_id;
- provider;
- source_category;
- information_type;
- exact_endpoint_or_url;
- acquisition_method;
- authentication_requirement;
- plan/tier;
- rate_limit;
- update_frequency;
- historical_depth;
- geographic/region constraints;
- public_visibility;
- technical_access_status;
- provider_permission_status;
- contractual_status;
- known statutory/legal_basis;
- legal_review_status;
- attribution_requirement;
- display_requirement;
- transformation_allowed/status;
- caching_allowed/status;
- redistribution_allowed/status;
- raw_data_retention_status;
- downstream_use_status;
- source_of_source/upstream dependencies;
- provenance requirements;
- fallback source;
- last_verified_at;
- verification_evidence;
- uncertainty/notes.

The purpose is to prevent engineers, humans, or AI systems from inferring legal or operational permissions from incomplete metadata.

### Recommended status vocabulary for machine reasoning

Where practical, source and legal status should use explicit values rather than ambiguous Boolean fields such as **allowed=true** or **allowed=false**.

Candidate controlled values include:

**Technical access**

**PUBLIC_PAGE**

**PUBLIC_API**

**REGISTERED_API**

**PAID_API**

**AUTHENTICATED_API**

**MANUAL_ONLY**

**DISPLAY_ONLY**

**UNAVAILABLE**

**UNKNOWN**

**Provider/contract status**

**PROVIDER_AUTHORIZED**

**LICENSED_FOR_DEFINED_USE**

**CONTRACTUAL_RESTRICTION**

**PROVIDER_POLICY_RESTRICTION**

**NO_PROVIDER_STATEMENT_FOUND**

**UNKNOWN**

**Legal status**

**LEGAL_BASIS_IDENTIFIED**

**POTENTIAL_EXCEPTION_OR_RIGHT**

**LEGAL_REVIEW_REQUIRED**

**CONTRACT_REVIEW_REQUIRED**

**JURISDICTION_DEPENDENT**

**PROHIBITED_AFTER_REVIEW**

**UNRESOLVED**

**NOT_APPLICABLE**

These values must not be interpreted as interchangeable.

In particular, **PROVIDER_POLICY_RESTRICTION** must not be automatically converted to **PROHIBITED_AFTER_REVIEW**, and **POTENTIAL_EXCEPTION_OR_RIGHT** must not be automatically converted to **LEGAL_BASIS_IDENTIFIED**.

### Legal-review escalation rule

Escalate for qualified legal review when the intended implementation would materially involve:

- large-scale automated extraction or copying;
- substantial reproduction of provider content;
- copying or redistributing provider databases/feeds;
- commercial redistribution or white-label use;
- use of restricted data in a new commercial product;
- jurisdictionally uncertain statutory exceptions;
- access-control circumvention;
- protected personal information;
- financial/regulatory decision-making;
- disagreement between provider contract terms and a claimed statutory right;
- conflicting legal requirements between jurisdictions;
- any source for which the evidence is insufficient to responsibly classify the intended use.

The absence of legal review shall not be recorded as proof that the use is unlawful. It shall be recorded as **UNRESOLVED / LEGAL REVIEW REQUIRED** until the relevant question is answered.

### Educational-use principle

AstroCrown's educational purpose should be preserved as part of the intended use because it can materially affect legal analysis, transformative character, public benefit, and information design.

However, educational purpose shall never be used as a shortcut for:

- assuming all copying is lawful;
- assuming commercial context is irrelevant;
- assuming provider terms have no contractual significance;
- assuming database rights do not exist;
- assuming attribution cures every legal issue;
- assuming transformation makes every use lawful.

The document must therefore preserve both propositions simultaneously:

**Education can matter legally.**

**Education does not automatically authorize every use.**

### Homepage hero-card application

The multi-source architecture directly applies to the candidate hero cards.

**Fear & Greed Consensus** should investigate multiple independently sourced observations and derive a transparent consensus rather than selecting one provider as the unquestioned truth.

**Winners & Losers** should investigate whether price movement can be enriched with volume, liquidity, derivatives, exchange, category, and other evidence from lawful sources.

**Top Influences / Influence Map** should investigate cross-source evidence across capital activity, derivatives, ETF flows, whale activity, news, regulation, technology, macro, narrative, and other measurable dimensions.

In all three cases, the system should preserve source provenance and source-status metadata so that a temporary loss of one provider does not silently change the meaning of the derived result.

### Re-verification rule

External-source facts in this section are time-sensitive operational discoveries.

Before implementation, acquisition, or release:

- re-open the current provider documentation and applicable terms;
- verify exact endpoint behavior and authentication;
- verify current plan/price/rate limits;
- verify regional availability where relevant;
- verify attribution and display conditions;
- verify caching/retention/redistribution conditions;
- verify that the proposed use remains within the documented or legally established basis;
- record the verification evidence and date.

Historical source snapshots should be preserved as historical discoveries even when current provider rules later change.



### R-026B — Acquisition-Path Independence and Non-API Information Retrieval

The data architecture shall treat the **acquisition method** as a separate dimension from the source, information type, provider permission, contractual status, legal status, and downstream-use status.

The existence of an API is not a prerequisite for investigating whether an information objective can be fulfilled.

Candidate acquisition paths include:

- documented API/REST/GraphQL endpoint;
- public web page or document retrievable through ordinary HTTP;
- publicly downloadable CSV, JSON, XML, ZIP, PDF, image, or other static file;
- RSS/Atom or other documented public feed;
- official public data archive or historical data file;
- public regulatory filing or government statistical release;
- public blockchain/network data or protocol-native data source;
- licensed third-party or original-source mirror;
- manually obtained data used for research/verification;
- user-provided or user-exported data;
- AstroCrown-derived data calculated from independently obtained underlying observations.

The system shall investigate the least complex acquisition path that can satisfy the information objective while preserving provenance, reproducibility, reliability, and applicable legal/contractual constraints.

### Non-API retrieval is not a permission bypass

A provider-specific API restriction shall not automatically mean that the same underlying information is unavailable through every other channel.

However, changing the technical acquisition method solely to evade a provider's restriction is not an approved architecture.

Before using a non-API route to obtain information from a provider-controlled service, determine:

1. whether the restriction applies only to the API or to the provider's broader service/content;
2. whether the alternate route is publicly provided or otherwise expressly accessible;
3. whether the provider's applicable terms govern that route;
4. whether automated retrieval is prohibited;
5. whether authentication, access controls, rate limits, robots directives, or other technical controls apply;
6. whether the information is factual, expressive, analytical, compiled, or otherwise protected;
7. whether a statutory/legal basis independently affects the proposed use;
8. whether the intended display, transformation, caching, redistribution, or derived use is covered;
9. whether a first-party or alternative source provides the same underlying observation through a clearer lawful route.

The system shall therefore distinguish:

**API unavailable**
from
**source unavailable**

and:

**API use restricted**
from
**all possible use of the provider's information is prohibited**

and:

**alternate acquisition route exists**
from
**alternate acquisition route is lawful and operationally usable**

### Example of acquisition-path diversification

Current public documentation demonstrates that relevant information can sometimes be obtained without relying on a conventional provider API.

Examples include:

- Binance documents downloadable historical public market-data files through data.binance.vision, in addition to public market-data API endpoints.
- Farside publishes a public Bitcoin ETF-flow table and an all-data page directly as web-accessible tabular information.
- The U.S. SEC provides public HTTPS access to EDGAR filing data and also exposes RSS feeds for certain EDGAR searches.
- The Federal Reserve publishes downloadable statistical-release data in CSV and XML formats through its Data Download Program.
- Alternative.me's Fear & Greed endpoint supports both JSON and CSV response formats through its documented public endpoint.

Sources:
- https://www.binance.com/en/academy/articles/how-to-get-trading-data-via-the-binance-api
- https://farside.co.uk/bitcoin-etf-flow-all-data/
- https://www.sec.gov/about/developer-resources
- https://www.federalreserve.gov/datadownload/default.htm
- https://alternative.me/crypto/fear-and-greed-index/

These examples demonstrate acquisition-path diversity; they do **not** establish that every available page/file may be freely scraped, redistributed, or incorporated into a commercial product.

### Public-page and static-file evidence

A publicly accessible page or downloadable file may be useful even when no API exists.

Potential uses include:

- human verification;
- historical research;
- source cross-checking;
- extraction where automated use is expressly permitted;
- transformation into AstroCrown-derived evidence where lawful;
- fallback data acquisition;
- reconciliation against API output;
- detecting discrepancies between a provider's API and displayed information.

Static files can also have operational advantages over APIs, including:

- lower request frequency;
- easier archival;
- deterministic snapshots;
- reduced API-key dependency;
- simpler reproducibility;
- batch processing;
- historical backfill;
- easier integrity checking.

These advantages must be evaluated against freshness, file size, update cadence, parsing reliability, terms, attribution, and redistribution constraints.

### Source-channel hierarchy candidate

For each information objective, the system should investigate candidate channels in an order appropriate to the objective rather than assuming that an API is always preferred.

A possible evaluation sequence is:

**First-party structured source**
→ **first-party public static/downloadable source**
→ **first-party documented public page/feed**
→ **other original/public source**
→ **licensed third-party source**
→ **manual/user-provided evidence**

This is a candidate methodology, not a mandatory sequence.

A source with poorer technical structure may still be preferred when it provides a more authoritative original observation or clearer lawful-use basis.

### Research-environment limitation rule

Failure to retrieve a public page, API, file, feed, or endpoint from a particular research environment shall not automatically be recorded as source unavailability.

The system shall distinguish:

- **source exists**;
- **source is publicly reachable**;
- **source is reachable from the current tool/environment**;
- **source is technically retrievable by the intended AstroCrown runtime**;
- **source can be lawfully used for the intended purpose**;
- **source is sufficiently reliable for the intended calculation**.

This prevents environment-specific network/tool limitations from becoming false product constraints.

### Acquisition reproducibility

For externally acquired information, where reasonably possible preserve:

- source URL/endpoint;
- acquisition channel;
- acquisition timestamp;
- retrieval status;
- response/file format;
- relevant request parameters;
- authentication state without storing secrets;
- provider/version documentation reference;
- file checksum or equivalent integrity identifier where useful;
- transformation steps;
- source licensing/terms evidence;
- legal-review status;
- fallback channel;
- re-fetch/reproduction method.

A source that is technically retrievable only through an opaque or non-reproducible manual process should not silently be represented as equivalent to a stable machine-readable source.

### $0 acquisition interpretation

"$0 budget" shall be evaluated at multiple levels:

- **$0 provider fee** — no direct subscription/license fee for the tested route;
- **$0 authentication cost** — no paid API key/account requirement;
- **$0 infrastructure cost** — no additional paid infrastructure required;
- **$0 prototype cost** — the combination of source, retrieval, processing, storage, and hosting can operate within the project's current $0 objective;
- **$0 production cost** — the same remains true under expected public usage and operational scale.

One level shall not be silently represented as another.

Free access may still have limits such as rate limits, attribution requirements, personal/non-commercial scope, storage limits, regional restrictions, terms of use, or inadequate historical coverage.

### Source-channel resilience

Where a derived metric materially depends on one external source, investigate whether a second acquisition path or independent source can provide the same or complementary evidence.

Potential resilience patterns include:

**API → static file fallback**

**Provider A → Provider B**

**first-party data → independent cross-check**

**current feed → historical archive**

**automated acquisition → human verification**

A fallback must not silently substitute materially different information. The system shall record when a fallback changes source, methodology, freshness, coverage, or semantic meaning.


## R-027 — Homepage Information Integrity and Trust

The homepage shall avoid false impressions of certainty, freshness, completeness, causation, execution capability, or legal permission.

It shall distinguish provider terms/policies from applicable law and shall not silently treat either provider restrictions or claimed legal exceptions as definitive without the relevant evidence.

It shall:

- distinguish source from derived data;
- avoid unsupported causal claims;
- identify materially relevant limitations;
- avoid fabricated/placeholder values presented as live;
- avoid incompatible source substitution;
- avoid implying real-time freshness when data is delayed;
- avoid presenting unavailable data as zero/neutral without approved semantic meaning;
- avoid implying executable action unless availability is verified;
- preserve provenance for important externally derived metrics.

This applies especially to cards, market data, influence information, and execution-related directory information.

## R-028 — Homepage Performance and Resource Efficiency

The homepage shall provide a high-quality experience without unnecessary asset, script, dependency, network, or rendering cost.

The implementation shall minimize unnecessary JavaScript/dependencies, duplicate requests, oversized media, long main-thread work, excessive reflow, and unnecessary animation; reuse assets where practical; use responsive asset delivery where beneficial; and remain usable when non-essential remote resources fail.

Performance shall be evaluated using appropriate evidence rather than a single arbitrary score, including applicable Core Web Vitals and Lighthouse/PageSpeed measurements.

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

## R-032 — Search, Account, and Wallet Trust Boundaries

Where search, avatar/account, or wallet controls exist:

- purpose shall be defined;
- disconnected/loading/connected/unavailable/error states shall be distinguished where applicable;
- authentication/account state shall not be inferred from visual presentation;
- wallet UI shall not imply connection/signing authority without actual provider state;
- external search data shall have an identified trust boundary;
- external wallet/provider scripts require dependency/security evaluation.

These controls remain governed by R-019.

## R-033 — Motion, Animation, and Timing Integrity

All animation shall have a product/communication purpose.

The implementation shall support reduced-motion preferences, avoid unnecessary continuous motion, avoid obscuring essential information, avoid timing drift where elements form one coordinated presentation, avoid independent timers where a shared state/timeline is required, verify normal/reduced-motion states, and preserve usability when motion is reduced or disabled.

## R-034 — Homepage Regression and Change Control

A change to approved behavior shall identify affected requirements/subsystems, dependencies/data sources, expected behavioral change, regression risks, verification required, and resulting evidence.

A change shall not silently invalidate an existing requirement. If intended behavior changes, the requirement or decision shall be explicitly updated before or with implementation.

## R-035 — Homepage Release Readiness

Before promotion to the regular/public website, applicable requirements shall have implementation state and verification evidence; findings shall be classified; blocking findings shall be resolved or explicitly accepted through applicable governance; relevant historical regression tests completed; applicable accessibility/security/performance checks completed; external evaluation criteria assessed where applicable; data-source technical access, provider permission/contract, licensing, and legal-review status resolved or explicitly governed; no silent placeholder/live-data ambiguity; and no unexplained requirement-to-implementation deviation.

Release readiness is a traceable evidence state, not a single score.


### D-015 — External-source capability is not equivalent to provider ownership

A higher-level information system does not need to reproduce every underlying database, data center, analytical subsystem, or proprietary infrastructure of every specialized provider in order to potentially produce a stronger user-facing result.

AstroCrown can investigate consuming multiple lawful external observations and synthesizing them into a new evidence layer.

The relevant benchmark is therefore not only raw data ownership or dataset size, but the quality of the resulting evidence-backed answer for a defined user question.

### D-016 — Legal right, provider permission, contract, and technical access are separate dimensions

Provider terms, provider policy, contractual restrictions, statutory rights/exceptions, and technical accessibility are distinct evidence objects.

None should be silently substituted for another.

A provider saying "not permitted" does not, by itself, establish the complete content of applicable law.

A claimed statutory right does not, by itself, prove that a particular access method, contract, database, or jurisdictional situation is lawful.

### D-017 — Educational purpose is relevant but not self-executing

AstroCrown's educational purpose can be an important fact in evaluating the legality and character of a proposed use, but it cannot be used as a universal shortcut to permission.

The system should preserve this nuance explicitly to prevent both unnecessary self-restriction and unjustified assumptions of legality.

### D-018 — Public visibility, machine access, and reuse must not be conflated

Information can be publicly visible while a particular API, automated-access route, or redistribution mechanism is restricted.

Conversely, an API can be technically accessible while downstream use is limited by contract, licensing, law, or plan.

These distinctions should become part of source metadata and machine reasoning.

### D-019 — Multi-source synthesis changes the competitive benchmark

A competitor's specialized depth does not necessarily limit AstroCrown's resulting information quality if AstroCrown can lawfully combine complementary observations from multiple specialized systems.

The appropriate future benchmark is:

**individual-source result vs AstroCrown multi-source result for the same defined user question**

rather than simply:

**AstroCrown-owned raw dataset vs competitor-owned raw dataset**.

This does not guarantee superiority; it creates a testable hypothesis.

### D-020 — Source diversity requires upstream-independence analysis

Different providers can report the same upstream information.

Therefore source count must not be treated as evidence count without considering shared exchanges, feeds, methodologies, copying relationships, or common source dependencies.

### D-021 — Provider restrictions should often trigger source-substitution research

When one provider restricts the intended use, the first question should be whether the underlying information objective can be fulfilled from an original, public, licensed, statutory, or otherwise independently lawful source.

This avoids turning a provider-specific restriction into an unnecessary product-level limitation.

### D-022 — Legal status should be represented as a state, not a Boolean

A source should not be modeled simply as **allowed=true/false** because the answer may depend on purpose, jurisdiction, plan, endpoint, acquisition mechanism, transformation, audience, retention, redistribution, and contractual facts.

Explicit multi-dimensional status is more suitable for both human audit and machine reasoning.

### D-023 — External-source research itself is a reusable capability

Source accessibility, licensing, provenance, update cadence, API behavior, rate limits, attribution, legal status, and fallback paths are reusable knowledge that can benefit the homepage, analytics, research systems, NOVA evidence, and future services.

The resulting source registry should therefore be designed as reusable evidence infrastructure rather than a card-specific implementation detail.

### D-024 — Source restrictions and legal rights must remain historically traceable

Provider policies, pricing, API limits, contracts, and legal circumstances can change.

When a source is reclassified later, the earlier verified state should remain preserved as historical knowledge, with a new verification date and evidence basis rather than silently rewriting history.



### D-025 — Acquisition method is independent from source availability

The absence, restriction, cost, or instability of an API does not by itself establish that the underlying information cannot be obtained through another channel.

### D-026 — Non-API retrieval can expand the source universe

Public static files, downloadable datasets, public filings, web-accessible tables, RSS/Atom feeds, official archives, and other documented channels can provide useful information without a conventional API.

### D-027 — Alternate technical channels must not become a circumvention assumption

Changing from an API to webpage retrieval, scraping, reverse-engineered endpoints, or another channel may still be restricted by provider terms, technical controls, contract, law, or other constraints.

The architecture must investigate the status of the exact route rather than treating the route change as either automatically permitted or automatically prohibited.

### D-028 — Research-tool failure is not evidence of source unavailability

An information source may be inaccessible to the current browsing/research environment while remaining publicly reachable or technically usable from the intended application runtime.

Tool-environment limitations therefore require their own status and must not silently become product limitations.

### D-029 — Static and downloadable data can improve operational resilience

Public historical files and static datasets can reduce dependency on API keys, lower request frequency, simplify reproducibility, enable batch backfills, and provide stable historical snapshots.

Their freshness, terms, data integrity, coverage, and maintenance burden must still be evaluated.

### D-030 — $0 is a multidimensional operational objective

A source may be free to view but paid to automate, free to automate but restricted to personal use, free for a prototype but unsuitable at public scale, or free in provider fees while still requiring paid infrastructure.

"$0" must therefore be attached to the exact scope being evaluated.



### D-031 — Site interdiction, technical blocking, and legal prohibition are distinct findings

A provider statement, robots.txt directive, CAPTCHA, JavaScript challenge, WAF/bot-management decision, HTTP block, rate limit, or other technical mechanism may materially restrict AstroCrown's ability to acquire information, but none should automatically be represented as a complete legal conclusion.

Conversely, a potentially applicable legal right does not automatically provide a technical means of access or authorize defeating a provider-controlled access mechanism.

### D-032 — Anti-automation controls can make access more restrictive than the legal information question

The legal status of an information use and the practical ability to acquire the information can diverge.

A lawful information objective may nevertheless be operationally infeasible through a particular provider channel because the provider blocks automation, requires a challenge, limits requests, requires authentication, or does not offer a suitable machine-readable route.

This should be recorded as an **access/operability constraint**, not silently converted into either a legal prohibition or an assertion that the information cannot be obtained elsewhere.

### D-033 — Access-control observation needs provenance

Observed technical behavior should be preserved with the acquisition environment, request/channel, timestamp, response state, and available evidence.

This prevents a temporary block, research-tool limitation, or anti-bot response from becoming an undocumented permanent assumption.

## Additional Explicitly Undefined Product-Level Items

In addition to subsystem-specific undefined items, these remain intentionally unresolved until evidence supports a decision:

- exact homepage card geometry and data methodologies;
- exact provider selection;
- exact market aggregation architecture;
- exact real-time/update and caching model;
- exact data licensing model;
- exact mobile implementation;
- exact supported-browser matrix;
- exact SEO information architecture beyond approved navigation;
- exact structured-data strategy;
- exact analytics/telemetry strategy;
- exact privacy/consent model for future analytics;
- exact third-party dependency set;
- exact performance budgets where evidence has not established appropriate values;
- exact internal quality metrics;
- exact external evaluation schedule;
- exact release thresholds beyond mandatory requirements;
- exact implementation framework/component boundaries.

These are not omissions to be silently resolved during coding.

## Validated / Preserved Product Discoveries

### D-007 — Requirements must preserve intent across development stages

The requirements document preserves product intent and reasoning boundaries, not merely UI dimensions.

### D-008 — Card purpose and methodology are separate decisions

A card can have a defined user purpose while its calculation methodology remains intentionally undefined.

### D-009 — Data aggregation is not automatically averaging

A multi-source metric requires explicit normalization, weighting, aggregation, missing-source behavior, and semantic compatibility before an aggregation method is selected.

### D-010 — Observed influence is not demonstrated causation

Influence surfaces may summarize evidence associated with movement without asserting causation unless causal evidence exists.

### D-011 — External evaluation is a quality input, not product purpose

External standards/evaluators can reveal gaps, but their criteria must not silently override established product purpose.

### D-012 — Verification quality is part of development quality

A requirement that cannot be meaningfully verified should be reconsidered for clarity, observability, or testability rather than given an unsupported PASS.

### D-013 — One validated data source may support multiple surfaces

Where data can be fetched, validated, normalized, and reused without unnecessary complexity, reuse can reduce redundancy and improve consistency.

### D-014 — Failure states are part of product behavior

A data-bearing or interactive component is not fully specified until applicable missing, stale, unavailable, conflicting, boundary, and failure states are understood.

## Active Hero-Card Candidate and Discovery Register

### Status

**Current state:** CANDIDATE / UNDER INVESTIGATION.

This register preserves the current homepage hero-card discoveries that have been established during exploration but must not be interpreted as final approved implementation requirements merely because they are documented here.

The preferred hero architecture remains **three cards**, with each card answering a different high-value user question:

1. **How does the market feel?** → Fear & Greed Consensus
2. **What is moving?** → Winners & Losers
3. **What appears to be influencing movement?** → Top Influences / Influence Map

The three-card structure is the current preferred direction. The detailed composition, data methodology, exact dimensions, provider selection, and implementation remain subject to evidence and verification.

### Candidate Hero-Row Composition

The current design discovery is that the hero row should remain a compact horizontal discovery layer rather than a vertical stack.

Candidate visual/layout principles:

- Cards should be sized from information density, readability, user behavior, retention/discovery value, action triggers, interaction efficiency, and available viewport space rather than arbitrary equal-width percentages.
- The row should preserve meaningful background visibility toward the right side.
- A current layout target under investigation is to preserve approximately **20% or more of the desktop viewport as intentional visual space between the right edge of the final card and the viewport edge**, subject to later visual/layout verification.
- The hero-card region should retain a horizontal rounded/rectangular presentation; vertical card composition is not the current direction.
- The left edge of the card row should remain aligned with the homepage's established content geometry.
- The space retained to the right of the card row should help preserve visibility of the homepage's background/nebula composition rather than being treated as unused accidental space.

These are candidate layout discoveries and shall not be promoted to fixed pixel dimensions or final proportions until evaluated against the actual homepage composition.

### Candidate Interaction Pattern

The current preferred interaction model is whole-card interaction rather than a conventional CTA-button model.

Additional interaction discoveries to preserve:

- The entire actionable card should communicate one coherent destination/action.
- The lower arrowhead/chevron is a visual affordance associated with the card, not a separate competing CTA.
- A candidate treatment places the arrowhead partly inside and partly outside the lower card boundary, using the card's fill so that it reads as part of the card rather than as an independent button.
- The lower-border treatment may visually terminate around the crossing arrowhead rather than creating a conventional button/container separation.
- Exact arrowhead geometry, border treatment, hover/pressed/focus treatment, and responsive behavior remain undefined pending implementation-independent evaluation.
- Any visual affordance must have an equivalent accessible interaction for keyboard and assistive-technology users.

### Card 1 — Fear & Greed Consensus: Additional Candidate Discoveries

**Status:** CANDIDATE / UNDER INVESTIGATION.

Potential information hierarchy remains:

- consensus sentiment;
- individual provider observations;
- agreement;
- spread;
- evidence-based directional/change insight;
- methodology access.

Candidate source set remains:

- Alternative.me;
- CoinMarketCap;
- CoinGecko;
- CFGI;
- additional publicly accessible sources discovered during future research.

For methodology comparison, established market interfaces including **TradingView** and **Binance** may also be inspected as reference systems. Reference comparison does not make them approved data providers for the consensus calculation.

The candidate should make it possible to distinguish provider observations from the derived consensus and to inspect how provider methodologies differ.

A **$0 external-data-acquisition target** may be investigated for the prototype where technically, legally, and operationally feasible. Cost is an evaluation criterion, not a presumption that every source is free or unrestricted.

Previously discussed example numerical scores are exploratory examples only and shall not be treated as requirements, historical facts, or fixed test values unless independently verified and explicitly adopted.

### Card 2 — Winners & Losers: Additional Candidate Discoveries

**Status:** CANDIDATE / UNDER INVESTIGATION.

The current preferred compact composition remains:

- Winner information;
- Loser information;
- Price Change;
- Volume Change;
- compact line/mini-chart relationship.

Additional visual candidate:

- positive and negative mover states may use distinct semantic treatments (for example, green/positive and red/negative) supplemented by text/icon semantics so that meaning is not communicated by color alone;
- short broken separators may be used to preserve compact grouping without creating unnecessary full borders;
- a generic directional arrow may serve as a visual cue where it does not compete with the whole-card interaction model.

The exact visual treatment is not approved and remains subject to accessibility, contrast, readability, and user-task evaluation.

The ranking methodology remains explicitly undefined until timeframe, eligible universe, minimum liquidity/volume, outlier handling, duplicate/wrapped-asset handling, missing/stale-data behavior, and update cadence are established and tested.

### Card 3 — Top Influences / Influence Map: Additional Candidate Discoveries

**Status:** CANDIDATE / UNDER INVESTIGATION.

The current direction is to express **measurable influence dimensions and evidence-backed themes/categories**, not to claim proven causality.

Candidate dimensions currently preserved include:

- Trend;
- Capital Activity;
- Derivatives;
- Whale Activity;
- ETF Flow;
- News;
- Regulation;
- Technology;
- Macro;
- Narrative.

For an initial prototype, investigation may prioritize approximately **4–5 dimensions with sufficiently accessible, measurable, and reproducible data**, including a $0-cost acquisition target where feasible, rather than assuming all candidate dimensions must be implemented simultaneously.

This narrowing is a prototype investigation strategy, not a final exclusion of the remaining dimensions.

Category/theme relationships remain an important candidate because they can connect the influence system to the homepage directory taxonomy. Examples already identified include:

- Capital Activity → DeFi;
- Technology → AI;
- News → Gaming;
- Macro → BTC;
- Regulation → Payments.

Such relationships must remain evidence-bearing associations or observed influence relationships unless sufficient evidence exists for a stronger causal claim.

Individual tokens may appear when they are the appropriate evidence-bearing entity, but prominent-token selection alone must not become the definition of market influence.

### Preserved Alternative and Predecessor Candidates

The following concepts remain preserved as useful knowledge even though they are not currently the preferred standalone third hero card:

- **TVL Growth** — retained as a potential evidence input to broader capital-activity/influence analysis.
- **Sector Rotation** — retained as a potential influence/category/directory relationship.
- **Wallet / Giant Flows** — retained as a potential evidence input where sufficiently verifiable.
- **Market Drivers** — retained as a predecessor framing for the influence problem.
- **Why It's Moving** — retained as a user-question framing and explanatory objective, while avoiding an automatic causal claim.
- **Investigative / AI-assisted market analysis** — retained as a future research/intelligence opportunity or deeper destination rather than automatically increasing homepage-card complexity.

Preservation of these concepts does not imply rejection of their future use. Their status may be promoted, merged, deferred, or rejected later based on evidence and compatibility analysis.

### Candidate Promotion Safeguard

No item in this register shall become an approved homepage requirement solely because it appears in the current candidate state.

Promotion should continue through:

**Discovery → Candidate → Evidence / Research → Composition / Methodology → Compatibility → Reuse / Redundancy Analysis → Verification → Decision → Approved Requirement or Preserved Alternative → Implementation → Testing → Evidence**

This register exists to prevent loss of newly discovered homepage knowledge while preserving the distinction between **current direction**, **candidate requirement**, and **approved requirement**.

### Continuity and Historical Preservation

The current homepage specification remains a living knowledge-preservation artifact.

New homepage discoveries should be added without deleting or rewriting historical knowledge merely to make the document shorter.

Historical backups remain read-only knowledge assets. They must not be altered, overwritten, or deleted during this update cycle.

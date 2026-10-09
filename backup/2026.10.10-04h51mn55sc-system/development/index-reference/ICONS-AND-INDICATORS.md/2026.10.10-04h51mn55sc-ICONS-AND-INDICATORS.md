# Icons and Indicators

## Purpose

Cross-section reference index for indicator semantics, icon candidates, filter intelligence, and positive/negative state communication. This is an extracted navigation aid, not a replacement for the originating subsystem requirements.

**Status rule:** extracted values retain their original status. A candidate/TBD/undefined item is not promoted merely by appearing here.

## Extracted references

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1299–1342

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


### Origin: HOMEPAGE-REQUIREMENTS.md lines 1401–1425

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

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1813–1819

### Filter intelligence

Where reliable data supports it, filters may expose compact market intelligence such as AI ▲ +8%, Gaming ▼ -2%, Meme ▲ +12%, RWA ▲ +1%.

Such values require defined timeframe, universe, methodology, and source before implementation.

Filter intelligence may be reused by Influence Map, sector analysis, analytics, research, and NOVA evidence systems.

### Origin: HOMEPAGE-REQUIREMENTS.md lines 3157–3178

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


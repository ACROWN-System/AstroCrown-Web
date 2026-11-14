# Data Display Conventions

## Purpose

Cross-section reference index for market data, provenance, acquisition paths, evidence synthesis, integrity, and directory data requirements. This is an extracted navigation aid, not a replacement for the originating subsystem requirements.

**Status rule:** extracted values retain their original status. A candidate/TBD/undefined item is not promoted merely by appearing here.

## Extracted references

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1607–1650

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


### Origin: HOMEPAGE-REQUIREMENTS.md lines 1712–1740

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

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1763–1787

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

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1801–1851

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

### Origin: HOMEPAGE-REQUIREMENTS.md lines 1879–2055

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

### Origin: HOMEPAGE-REQUIREMENTS.md lines 2087–2590

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


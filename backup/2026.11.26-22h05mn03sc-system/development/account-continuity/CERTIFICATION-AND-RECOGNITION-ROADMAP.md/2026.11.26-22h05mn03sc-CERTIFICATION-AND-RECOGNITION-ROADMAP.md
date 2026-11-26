# Authentication Certification, Membership and Recognition Roadmap

**Research snapshot:** 2026-11-03  
**Status:** Planning and evidence preparation only. No membership, mark use, paid test, certification or independent assessment has been purchased or claimed.  
**Current budget:** $0 for preparation; paid actions require separate funded approval.

## 1. What applies to AstroCrown

AstroCrown's account prototype is a WebAuthn relying-party implementation. The closest FIDO route is therefore **FIDO Server Functional Certification**, not authenticator certification. Keep these distinct: standards implementation; community participation; FIDO membership; interoperability testing; product certification; and trademark rights. Membership alone does not certify a product.

Official sources:
- [FIDO Membership Benefits and Dues](https://fidoalliance.org/members/become-a-member/)
- [FIDO Certification Fees](https://fidoalliance.org/fido-certification-fees/)
- [Server Functional Certification](https://fidoalliance.org/certification/functional-certification/functional-certification-servers/)
- [Conformance Self-Validation](https://fidoalliance.org/certification/conformance-self-validation-testing/)
- [Interoperability Testing](https://fidoalliance.org/certification/interoperability-testing/)
- [FIDO Certified Products Directory](https://fidoalliance.org/certification/fido-certified-products/)
- [FIDO Certified Showcase](https://fidoalliance.org/certification/fido-certified-showcase/)
- [Certification Mark Usage](https://fidoalliance.org/certification/certification-mark-usage/)
- [Brand and logo guidance](https://fidoalliance.org/about/brand-and-logo-usage/)
- [FIDO Passkey icon](https://fidoalliance.org/passkeys/get-the-fido-passkey-icon/)

Reconfirm the live programme version, eligibility, fees and mark rules directly before applying or paying.

## 2. FIDO membership tiers and cost-effectiveness

The public membership page lists annual USD dues:

| Tier | Published annual dues | Eligibility / entry condition |
|---|---:|---|
| Associate | $3,250 (100 or fewer employees) or $18,000 (101+) | Subject to FIDO eligibility confirmation |
| Government | $18,000 | Only for an entity that genuinely qualifies |
| Sponsor | $30,250 | Higher participation tier |
| Board | $60,500 | Application by a current Sponsor member with at least six months of active FIDO Working Group participation |

The public matrix describes benefits including Plenary participation, member-only co-marketing, discounted FIDO sponsorship (including Authenticate), possible FIDO Executive quotes for approved press releases, eligibility for certification discounts, and rights to use the **FIDO Alliance Member** trademark while membership is current. Applicable tiers have a member-page logo and can participate in Working Groups and contribute to specifications. Sponsor and Board tiers have additional Working Group voting/leadership rights.

**Board-specific value:** Board meeting participation/votes, input into Alliance strategy and WG charters, eligibility to serve as WG Chair, Board Director visibility on FIDO's Leadership page, and company logo on the FIDO Members conference/event slide. These are potential relationship and governance benefits, not product certification or guaranteed publicity.

### Why the $60,500 Board tier is not an initial requirement

Board is a strategic participation route, not a prerequisite for WebAuthn implementation or Server Functional Certification. The public eligibility route is current Sponsor status plus at least six months of active Working Group participation, followed by application.

The certification fee sheet publishes one member rate and one non-member rate. It does not publish a further Board-only Server Certification discount. For a small organization eligible for Associate dues, one Server Functional Certification would be $3,250 + $6,000 = $9,250, compared with $9,000 for non-member certification. This arithmetic excludes wider membership benefits; it shows membership is not automatically cheaper for one certification.

Recommended future sequence: prepare evidence and contribute at $0; confirm eligibility/benefits with FIDO; choose the lowest tier with a practical return; consider Sponsor/Board only when WG participation, Board influence and visibility can genuinely be used. Keep Board as a strategic option for later funded Public Relations/industry participation rather than an immediate cost.

## 3. FIDO certification fee snapshot

| Programme / service | FIDO member | Non-member |
|---|---:|---:|
| Server Functional Certification | $6,000 | $9,000 |
| Server Derivative Certification | $1,000 | $1,500 |
| On-demand interoperability testing | $3,000 | $3,000 |

Fees are assessed per certified implementation. Derivative/delta pricing may apply to related implementations. Certification fees are due before issuance of certificate documentation. Obtain a written quote and confirm lab/proctoring, event, travel, equipment, renewal and other expenses.

The published process describes conformance self-validation, interoperability testing, submission and fees. Confirm the controlling test profile/version: public process pages and linked tools may carry differing dates or labels. Do not spend before the exact profile, tool access, document pack and total cost are confirmed with FIDO.

## 4. Logos, marks and public presentation

Prepare evidence and potential placements, but do **not** display a FIDO mark until the exact permission is in place.

| Mark / placement | What it means | Condition |
|---|---|---|
| FIDO Alliance Member mark | Organization membership | Membership accepted and use rules satisfied; not product certification |
| FIDO Certified mark | Named implementation passed the programme | Certificate awarded and applicable certification mark licence/agreement executed |
| FIDO member-page logo | Directory visibility | Tier includes the placement and membership is current |
| Board event slide / Leadership page | Board-tier visibility | Current Board membership and FIDO publication rules |
| FIDO Certified Showcase | Certified product/company showcase | Actual relevant certification and applicable tier |
| FIDO Passkey icon | Sign-in/passkey indication | Follow icon guidance; do not style as a certification badge |

Never use “FIDO certified”, “FIDO approved”, the seal or equivalent wording before award and permission. The member mark refers to the organization, not the security status of a product.

## 5. $0 recognition and readiness programme

These actions require no membership fee, certification fee or paid AI/provider quota:

1. Maintain [Authentication Assurance Benchmark](AUTHENTICATION-ASSURANCE-BENCHMARK.md), threat model, exact-head CI, browser matrix, limitations and findings history.
2. Map controls to [OWASP ASVS 5.0.0](https://asvs.owasp.org/) and the [OWASP Passkey Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Passkey_Security_Cheat_Sheet.html). A mapping is not OWASP certification.
3. Run repository security practices and [OpenSSF Scorecard](https://scorecard.dev/), then remediate. A SHA-pinned, $0 Scorecard workflow is prepared at `.github/workflows/scorecard-analysis.yml`; the official Action's current branch validation only supports the default branch, so this workflow intentionally runs on `main` pushes and a weekly schedule after an owner-approved merge. The attempted draft-branch run returned “only default branch is supported”; it is not counted as a Scorecard assessment. Results publishing is disabled initially (`publish_results: false`), and no badge is displayed pending report review. The public project viewer is [here](https://scorecard.dev/viewer/?uri=github.com/ACROWN-System/AstroCrown-Web).
4. Prepare for the [OpenSSF Best Practices Badge](https://www.bestpractices.dev/) when criteria are met. It is a free FLOSS self-assessment badge, not an independent audit or FIDO certification.
5. Use [passkeys.dev](https://passkeys.dev/) and public WebAuthn developer resources for technical review and test-matrix planning.
6. Participate in the [W3C WebAuthn Working Group](https://www.w3.org/groups/wg/webauthn/) and [Web Identity & Credentials Adoption Community Group](https://www.w3.org/community/wicg/) where eligible; contribution is not W3C endorsement.
7. Keep repository SECURITY.md useful and accurate. Add production `/.well-known/security.txt` only when a real monitored Contact, response owner and expiry are established. RFC 9116 requires actionable details; no placeholders or invented mailboxes.
8. Prepare a plain-language assurance page, architecture diagram, technical evidence note and non-technical demo. Avoid “unhackable”, “quantum-proof”, “FIDO certified”, “NIST AAL2/3” or “independently audited” without proper evidence.

## 6. Other recognition and contribution venues

| Venue | Value | Cost / qualification |
|---|---|---|
| FIDO Certified Products Directory | Verifiable product discovery | Correct product certification required |
| FIDO member page and co-marketing | Organization visibility and approved communication | Membership and FIDO rules apply |
| Authenticate conference | Practitioner networking, demos, speaking and sponsorship | Some paths may be available without membership; speaking is not certification; sponsorship/travel can cost |
| FIDO Working Groups | Protocol and implementation contributions | Membership/WG rules apply; contribution is not approval |
| W3C WebAuthn WG / WICG | Technical feedback and specification discussion | Not product endorsement |
| OpenSSF Best Practices | Visible checklist for open-source practices | Free self-assessment, not independent audit |
| OpenSSF Scorecard | Automated repository security signals | Not a passkey conformance test |
| OWASP ASVS / Passkey Cheat Sheet | Public control mapping and possible upstream contribution | OWASP does not certify AstroCrown |
| Independent assessor | Scoped independent review and remediation report | Paid when budget/readiness justify it |
| Responsible disclosure / security.txt | Actionable vulnerability-reporting path | Needs monitored contact; not a badge |

## 7. Certification-readiness gates

Do not pay until all are met:
- Production HTTPS, final RP ID/origin and secure cookies.
- Durable account storage, backup/restore, recovery operations, access controls and incident response.
- Complete passkey lifecycle, recovery and administrator authorization.
- All critical benchmark cases pass on the exact release commit; no required workflow failed or was skipped.
- Named cross-browser/platform/synced/FIDO2-key test matrix. ML-DSA needs a separately proven genuine client path.
- Threat model, dependency/SBOM evidence, vulnerability handling and monitored security contact.
- Approved production Terms/Privacy, retention/export/deletion process and accessibility review.
- Exact FIDO Server Functional Certification profile, conformance tools, interop route, documents and written costs confirmed with FIDO.
- Explicit owner approval of membership, certification, lab/event/travel, assessor and marketing costs.

Discuss ML-DSA with FIDO separately: the current WebAuthn mapping is an active IETF draft and its requested COSE values are not final allocations. Do not assume ML-DSA is included in the current Server certification profile.

## 8. Future budget worksheet — planning only

- [ ] $0: benchmark, exact-head tests and evidence preservation.
- [ ] $0: OWASP ASVS mapping and public implementation references.
- [ ] $0: OpenSSF Scorecard and Best Practices preparation.
- [ ] $0: public W3C/FIDO technical participation where eligible.
- [ ] Optional: Associate — $3,250 or $18,000 annual dues by employee band.
- [ ] Optional: Sponsor — $30,250 annual dues.
- [ ] Strategic option: Board — $60,500 annual dues after Sponsor and Working Group participation eligibility.
- [ ] Server Functional Certification — $6,000 member / $9,000 non-member per implementation.
- [ ] On-demand interoperability — $3,000.
- [ ] Lab/event/travel/equipment/derivative/renewal/independent assessor costs — quote required.

All amounts are the public USD snapshot reviewed on 2026-11-03, with member dues published as of January 2026. These are not a quote, future price guarantee or approval to spend.

## 9. Future FIDO outreach pack

Maintain a one-page briefing with applicant legal name/form/country/employee band; product and server architecture; exact WebAuthn functions; supported authenticator matrix; benchmark version and commit; CI links; known gaps; intended Server Functional profile; membership-tier rationale; and budget ceiling.

Ask FIDO Membership and Certification teams to confirm in writing: eligible tier and employee band; current dues; controlling server profile/version; test-tool access and interop dates; whether the experimental ML-DSA profile is in scope; total fees and additional costs; which member/certification mark may be used and which licence agreements apply.

No enquiry, application, certification submission or purchase is made by this roadmap.

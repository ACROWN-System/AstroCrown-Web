# Active Research Record — Sign-In Providers, Trust Signals and Recovery Onboarding

**Date:** 2026-10-21  
**Status:** EVIDENCE GATHERED; no provider selected; strict $0/no-card and public-domain gates remain BLOCKED  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Related decision:** [Authentication Separation and Recovery Decision](2026-10-21-Authentication-Separation-and-Recovery-Decision.md)  
**Related architecture:** [Authentication Separation and Optional Wallet Access](2026-10-20-Provider-Independent-Wallet-Authentication-Plan.md)

## 1. Question and scope

Assess whether a large number of recognized sign-in buttons reliably increases trust; whether to provide familiar alternatives rather than make a novel authentication method the first interaction; which identity providers are plausible candidates under AstroCrown's $0-only/no-card constraint; and how to introduce account-recovery methods without making registration burdensome.

This is an initial research synthesis, not a representative AstroCrown user study, a provider contract review, or a technology approval. Provider terms, API access, branding rules, billing requirements and domain eligibility must be rechecked immediately before implementation.

## 2. Research conclusion on trust and choice

**Finding: more sign-in options are not a proven universal trust signal.** The owner's small informal interviews are a useful hypothesis to test, not enough evidence to base provider selection on.

### 2.1 Directly relevant empirical study

Frik and Mittone (2019), *Factors Influencing the Perception of Website Privacy Trustworthiness and Users' Purchasing Intentions: The Behavioral Economics Perspective*, Journal of Theoretical and Applied Electronic Commerce Research 14(3), pp. 89–125, DOI https://doi.org/10.4067/S0718-18762019000300107. The research used focus groups and an online survey of 117 adults. It reports that famous brands, social-network widgets and social login had no or a negative effect on perceived privacy trustworthiness, although these features positively affected purchase intention in the experiment. This is directly relevant to the hypothesis but has limitations: relatively small sample, e-commerce/privacy framing, and it did not isolate the effect of the *number* of login options.

Accessible source: https://www.scielo.cl/scielo.php?pid=S0718-18762019000300107&script=sci_arttext

### 2.2 Choice overload evidence

Scheibehenne, Greifeneder and Todd (2010), *Can There Ever Be Too Many Options? A Meta-Analytic Review of Choice Overload*, Journal of Consumer Research 37(3), pp. 409–425, DOI https://doi.org/10.1086/651235. Across 50 experiments and 5,036 participants, the mean effect was close to zero, with substantial variance by situation. This is not a social-login-specific experiment; it supports a cautious conclusion that choice count by itself neither guarantees trust nor necessarily harms choice.

Source: https://doi.org/10.1086/651235

### 2.3 Logo misuse and the endorsement misconception

Hout et al., *LogoMotive: Detecting Logos on Websites to Identify Online Scams — A TLD Case Study*, peer-reviewed research using 6.2 million `.nl` domains, documents how scammers use well-known logos to make malicious sites appear legitimate. Familiarity can influence trust, but a logo can be copied and does not establish endorsement or safety.

Source: https://research.tudelft.nl/en/publications/logomotive-detecting-logos-onwebsites-toidentify-online-scams-a-t/

### 2.4 Interpretation

- A genuine provider integration can offer convenience and a recognizable authentication journey. It is better evidence than simply displaying a logo.
- Provider approval or brand verification is limited to the provider's stated requirements. It is not a security audit, business endorsement, or certification of the whole relying website.
- More buttons are justified only if they serve distinct audience needs, are real supported sign-in methods, comply with each provider's rules, and satisfy cost/privacy/maintenance criteria.
- The best test is a comparative prototype test: measure successful registration/sign-in completion, time, errors, understanding of data sharing, trust/confidence, preferred method, and recovery comprehension. Ask whether the UI *looks* trustworthy separately from whether the participant understands the actual security and privacy boundary.

## 3. Familiar first interaction — proposed UI

Do not make passkeys, wallets or any other unfamiliar method the only first-step experience. The proposed initial sign-in/create-account modal, pending implementation and audience testing, is:

1. **Continue with Google** — evaluate a genuine, official integration after the public domain and production branding are verified.
2. **Use username and password** — a familiar option that does not force social identity or mandatory email. A password cannot identify an account by itself; use an internal account ID/unique handle plus password. If email is not collected, forgotten-password recovery must use a separately enrolled authenticator, recovery code or governed recovery process.
3. **More sign-in options** — show only integrations that have passed provider policy, scope, accessibility, and $0/no-card qualification. GitHub may suit technical users; Facebook, LinkedIn and X remain candidates only after audience demand and current access/terms are verified. Do not place Wallet here by default; ask for it within a wallet-dependent feature.
4. **Passkey setup** — offer as a well-explained optional method during account-security setup, when useful on a later sign-in, and in settings. Do not force it on the very first interaction.

Google Identity Services is the first social-login candidate to evaluate, not selected. The documented setup requires an OAuth client ID and owned, authorized origins. Production branding/consent configuration must accurately identify AstroCrown and meet applicable verification requirements. Google also requires official button branding to follow its guidelines. Sources:
- https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
- https://developers.google.com/identity/verification/authentication-verification
- https://developers.google.cn/identity/branding-guidelines?hl=en

Do not conflate **Sign in with Google / Google Identity Services** with **Google Cloud Identity Platform**. The latter has a separate pricing model: the current published schedule lists 0–50,000 monthly active users as free for Tier 1 methods including social sign-in, with charges above that band; OIDC/SAML have a different tier. For this project's strict $0/no-card principle, no provider may be considered eligible merely because a page advertises a free tier. Verify sign-up, required payment method, consent/configuration, limits, current terms and failure behavior.

Source: https://cloud.google.com/identity-platform/pricing

## 4. Provider shortlist (candidate, not approval)

| Provider/method | Why consider it | Initial disposition / mandatory checks |
|---|---|---|
| Google | Familiar, broad reach, official web sign-in flow | **First provider to qualify.** Verify the actual owned public domain, privacy policy, approved scopes, brand verification, no-card setup and current terms. Never request additional Google API scopes just for authentication. |
| GitHub | Recognizable to technical, developer and open-source users | **Secondary candidate.** Requires users to have GitHub accounts; less universal than Google. Use only minimal identity scopes and verify current terms, account recovery and audience demand. Official app setup: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app |
| Apple | Familiar, privacy-oriented account login for Apple users | **Defer under strict $0 policy until eligibility is proved.** Apple lists a US$99/year Apple Developer Program membership. Do not assume a free account provides the required production web sign-in capability. Sources: https://developer.apple.com/help/account/membership/program-enrollment and https://developer.apple.com/sign-in-with-apple/usage-guidelines-for-websites-and-other-platforms/ |
| Facebook | Potentially broad reach in some user groups | **Defer pending audience evidence and current Meta review/permission/privacy checks.** Do not add merely for visual variety. |
| LinkedIn | May serve business/professional audience | **Niche candidate only.** LinkedIn supports OIDC with open permissions through its developer portal, but explicitly states Sign In with LinkedIn does not verify a person's real-world identity. Keep data requests minimal. Sources: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2 and https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access |
| X | Potentially relevant to an AstroCrown community already using X | **Defer until current API access, authentication endpoint, costs and no-card requirements are verified.** Do not make account entry depend on a potentially paid or changeable API plan. |
| AstroCrown username + password | Familiar, not dependent on a social identity provider; can use a handle rather than email | **Candidate ordinary-account route.** Needs safe password verification, rate limiting, compromised-password blocklist and a tested recovery path. Password alone cannot be the account identifier. |
| Passkey/WebAuthn | May reduce password burden and phishing risk | **Optional candidate and progressive enhancement, not the only first interaction.** Test platform sync, device loss, non-biometric access, support matrix and recovery. |
| Crypto wallet | Useful for a feature needing wallet-control proof; mandatory in the admin area by the owner-defined policy | **Never a default ordinary-user sign-in gate.** Request only in a feature that genuinely needs wallet control. Admin wallet policy is documented separately. |

The Apple membership price is in USD and the local price may vary. Provider costs and requirements should be verified at decision time. This document does not authorize a paid service or a payment method.

## 5. Password option — familiarity with sound safeguards

A familiar password-based route is reasonable to evaluate for the first release. If the user wants no mandatory email, use a unique AstroCrown username/handle or internal account ID as the identifier, together with a password. Do not label it “password only” in the architecture: without a username/account ID or a known device-bound account context, a password cannot identify which account to open.

Use current NIST SP 800-63B (SP 800-63-4) as a reference for single-factor password handling:
- minimum 15 characters when a password is the only authentication factor;
- support at least 64 characters and passphrases;
- accept password managers, autofill and paste;
- do not impose arbitrary character-class rules or periodic resets unless compromise evidence warrants a change;
- block common/known-compromised passwords, rate-limit attempts and store salted password hashes using a suitable maintained password-hashing implementation;
- provide clear error messages without disclosing whether a particular account exists unnecessarily.

Source: https://pages.nist.gov/800-63-4/sp800-63b.html

These controls are a proposed baseline to verify, not proof of security or a promise that password-only is appropriate for administrators.

## 6. Recovery onboarding — immediate prompt plus progressive reminders

The owner's observed interaction pattern aligns with established passkey/security-key UX guidance. Google recommends establishing a recovery method when creating a passkey account and offers additional passkey prompts during sign-in, in security settings, after recovery and after reauthorization. FIDO Passkey Central recommends multiple security keys and presenting second-key setup immediately after enrollment or later in account settings.

Sources:
- https://developers.google.com/identity/passkeys/ux/user-journeys
- https://www.passkeycentral.org/design-user-journeys/security-key-patterns/enroll-passkeys-on-security-keys
- NIST SP 800-63B account recovery guidance: https://pages.nist.gov/800-63-4/sp800-63b.html

Proposed flow:
1. Registration stays short and familiar.
2. Immediately after successful account creation, show a compact **Protect your account** step that asks users to establish at least one recovery route. Where safe, let them defer optional strengthening rather than blocking harmless initial use.
3. Put a permanent **Security & recovery** section in account settings. State plainly whether the account has a usable backup.
4. Use a restrained, accessible and dismissible reminder (for example, a small dot or “Backup not set up” label) rather than a persistent alarming red warning. Remind at relevant times—after sign-in, when adding/removing a credential, after recovery, or when an account has only one working authenticator—without repeating on every page view.
5. Stop reminding once the required recovery state is reached. If the user dismisses a non-critical reminder, respect that choice and re-offer only at an appropriate future interaction.
6. Recovery instructions must state what each option can and cannot restore; recovery of account access must not automatically transfer wallet ownership, admin privilege, payout destination or encrypted data keys.

For administrator accounts, this ordinary-user reminder flow does not replace the explicit wallet policy: up to three wallets, any one enrolled wallet for ordinary admin sign-in, and Imperial HSIAN review if all enrolled wallets are lost.

## 7. Owner-defined administrator wallet policy

The separate [Authentication Separation and Recovery Decision](2026-10-21-Authentication-Separation-and-Recovery-Decision.md) defines:
- wallet registration is mandatory for admin access; up to three wallets may be registered;
- any one registered wallet is sufficient for a fresh admin sign-in;
- loss of one wallet does not require recovery if another enrolled wallet remains available;
- loss of every registered wallet requires a request to the **Imperial HSIAN authority** (owner and/or explicitly authorized NOVA-governed process) to restore the existing admin account or authorize a replacement admin account;
- no wallet-first self-service reset, first-wallet role grant, or autonomous NOVA promotion; all restoration must be explicitly authorized and audited.

The exact evidence and incident procedure remain to be specified and tested before production.

## 8. $0/no-card and deployment gates

- **AUTH-001 remains BLOCKED:** the authoritative public domain, publishing source, deployed artifact and DNS/CDN path have not been verified. Do not configure production OAuth origins or WebAuthn relying-party IDs against an assumed host.
- No candidate is eligible until its actual production signup, cost, payment-method requirement, limits, terms, branding/permissions review and operational failure behavior are checked.
- Do not use provider logos outside their official button/brand guidelines, and do not display the provider's name or logo unless the matching integration is functional.
- Keep provider authentication, account recovery and application authorization separated. Provider login is not proof of real-world identity and does not grant roles.
- The current wallet SIWE prototype remains a local optional-feature lab, not ordinary login or production admin authentication.

## 9. Proposed comparative user test

Before deciding that a larger provider list is worth the extra dependencies, test at least these three versions with a small but varied group of intended users:
- **A:** Google + username/password;
- **B:** Google + username/password + “More sign-in options” containing one or two genuinely eligible providers;
- **C:** username/password first, with Google secondary.

Measure completion, time, abandonment, user confidence, what data they think is shared with the provider, recall of the account recovery route, method preference and whether they interpret provider logos as endorsements. Do not present fake/placeholder login buttons or collect unnecessary personal data. Record sample size, participant characteristics, questions, result definitions and limitations. Use the results as directional evidence rather than claiming statistical representativeness unless the design supports it.

## 10. Current outcome

**Recommendation:** begin with a conventional, clearly branded popup offering a qualified Google sign-in and a username/handle + password route; add further provider buttons only after provider eligibility and user demand are evidenced. Offer passkeys progressively, prompt for recovery during account setup, and use unobtrusive settings reminders to help users establish additional safeguards. Ordinary users are never forced to connect a crypto wallet for unrelated features.

No provider is yet approved for production. No authentication UI has been implemented by this research record. AUTH-001 and $0/no-card qualification remain BLOCKED.

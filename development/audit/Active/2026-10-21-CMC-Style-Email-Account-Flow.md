# Active Navigation Plan — Familiar Email Account Entry (CMC-Inspired)

**Date:** 2026-10-21  
**Status:** PLAN / IMPLEMENTATION IN PROGRESS — development prototype only  
**Repository:** ACROWN-System/AstroCrown-Web  
**Branch:** docs/provider-independent-wallet-auth-plan-2026-10-20  
**Parent PR:** [#141 — authentication architecture and optional-wallet lab](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)

## 1. Objective

Replace the unusual username-plus-one-time-recovery-code-first interaction with a familiar, CMC-inspired **Log In / Sign Up** account dialog. The primary sign-up screen should request only the fields the owner specified: email, password, optional Referral ID, an independent optional email-news preference, and acceptance of the Terms of Use and Privacy Policy.

“CMC-inspired” means using a familiar account-entry pattern, not copying CoinMarketCap's branding, assets, or exact implementation. Do not add fake social identity-provider controls or a wallet prompt.

## 2. Owner direction and architecture reconciliation

On 2026-10-21, the owner explicitly requested an email/password account entry with optional referral ID and separate opt-in to receive AstroCrown crypto-universe news by email. This updates the immediate UI requirement from the earlier username-first prototype.

This UI request does not by itself qualify an email-delivery vendor or authorize a production dependency. The existing architecture decision requires that email not be the sole mandatory route forever; this prototype will use email/password as its familiar primary interaction, while future authenticator/recovery options remain a separately evaluated product decision. No external email delivery, account verification, password-reset email, newsletter subscription API, or production persistence may be implied to exist.

## 3. Requirements

- Show **Log In** and **Sign Up** as clear tabs.
- Sign Up fields: required email; required password; optional Referral ID.
- Newsletter/crypto-news preference is a separate, unchecked-by-default opt-in; account creation must not imply marketing consent.
- Terms acceptance is explicit and required for sign-up. The current policy links must resolve to clearly marked development drafts until legal and product review approves production policies.
- Log In uses email and password. Do not ask the user to memorise recovery codes during registration.
- Password reset UI must not pretend to send an email unless a real, qualified delivery mechanism exists. A development prototype should clearly disclose if password reset by email is unavailable.
- Browser preview remains disposable, in-memory, test-only. Never solicit real credentials, assets, wallet secrets or real newsletter consent in that preview.
- Local-only backend stores test accounts on loopback and records optional referral/newsletter consent and terms acceptance for testing. It is not production authentication.
- Preserve public browsing, the existing optional-wallet separation, no fake providers, no external dependency additions, and the $0/no-card constraint.
- Keep production root website unchanged and keep PR #141 in draft.

## 4. Acceptance criteria

| ID | Criterion | Evidence required | State |
|---|---|---|---|
| ACC-UX-EMAIL-001 | Log In / Sign Up tabs and requested field labels render correctly | Browser smoke test and source review | BLOCKED until implementation |
| ACC-UX-EMAIL-002 | Valid email/password registration and sign-in work in local and browser-preview modes | Automated positive/negative test | BLOCKED until implementation |
| ACC-UX-EMAIL-003 | Referral ID is optional, bounded, and recorded only as an unverified reference | Unit/integration tests; UI disclosure | BLOCKED until implementation |
| ACC-UX-EMAIL-004 | Newsletter preference is independent, optional, unchecked by default, and recorded with consent timestamp | Unit/integration tests | BLOCKED until implementation |
| ACC-UX-EMAIL-005 | Terms acceptance is required; policy links resolve to labelled draft policies | Static/browser test | BLOCKED until implementation |
| ACC-UX-EMAIL-006 | Registration does not force or foreground one-time recovery codes | Browser smoke test | BLOCKED until implementation |
| ACC-UX-EMAIL-007 | “Forgot password?” does not claim email delivery without an actual mail mechanism | Browser smoke test and source review | BLOCKED until implementation |
| ACC-UX-EMAIL-008 | Existing loopback/origin, password-hash, session, no-wallet, and preview non-persistence guards remain intact | Existing and updated automated tests | BLOCKED until implementation |
| ACC-UX-EMAIL-009 | Only development files change; no merge/deployment | Changed-file list and PR state | BLOCKED until implementation |

## 5. Scope and boundaries

The change targets `development/index.html`, `development/account-continuity/prototype/account-ui.js`, `account-prototype.css`, the local prototype backend/tests/workflow assertions, README and auditable records. It does not implement production identity, real email verification/reset delivery, production mailing-list subscription, or legal approval.

A typed email address is personal data. The development preview therefore accepts invented values only; newsletter checkbox behavior is tested only as local consent-state handling. Production requires data-retention/deletion, lawful-basis/consent, delivery, abuse, incident, and account-recovery review before activation.

## 6. Method

1. Inspect existing repository conventions, account decision records, backend, tests and workflow guards.
2. Update the UI and local prototype with minimal code; do not add dependencies or provider calls.
3. Add regression tests for input validation, persistence of opt-in/terms/referral metadata, login behavior, and no accidental newsletter subscription or false email-sending claims.
4. Run relevant tests on the exact branch head and inspect all resulting checks.
5. Record remaining blockers honestly. Keep the PR in draft until full diff, security and promotion gates pass.

## 7. Impact analysis

**If implemented as specified:** new users can evaluate a familiar email/password flow without being confronted by a recovery-code ceremony or mandatory wallet; optional marketing consent and referral entry are visibly separated from authentication.

**If not implemented:** first-time users continue to encounter a username-centric flow and must negotiate one-time recovery codes immediately, increasing confusion and undermining trust.

**Residual risk:** this UX prototype cannot protect real user assets. Production account storage, email verification, email-based password reset, newsletter delivery/consent operations, policy approval and host/publishing qualification remain separate mandatory gates.

## 8. Evidence / closure

Record the implementation commit, relevant Actions run URLs/statuses, browser flow result, and any remaining findings below. Do not mark acceptance criteria PASS until test evidence supports the exact implementation; production security remains BLOCKED independently of green prototype tests.

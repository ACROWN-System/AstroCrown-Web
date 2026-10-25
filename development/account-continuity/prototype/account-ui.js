(function () {
  "use strict";

  var dialog = document.getElementById("account-dialog");
  var content = document.getElementById("account-content");
  var feedback = document.getElementById("account-feedback");
  var title = document.getElementById("account-dialog-title");
  var openButton = document.getElementById("open-account-dialog");
  var closeButton = document.getElementById("account-dialog-close");
  var dashboard = document.getElementById("account-dashboard");
  var dashboardContent = document.getElementById("account-dashboard-content");
  var mainContent = document.getElementById("main-content");
  var mode = "signin";
  var successKind = "signup";
  var accountState = { authenticated: false };
  var focusBeforeOpen = null;
  var busy = false;
  var termsVersion = "development-draft-2026-10-21";
  var loopbackHosts = ["localhost", "127.0.0.1", "::1"];
  var forceBrowserDemo = new URLSearchParams(window.location.search).get("account-preview-demo") === "1";
  var browserPreviewMode = forceBrowserDemo || loopbackHosts.indexOf(window.location.hostname) === -1;
  var browserPreviewState = {
    accounts: Object.create(null),
    activeEmail: null,
    sessionExpiresAt: 0,
    failedLogins: Object.create(null)
  };

  // Built-in glyphs only: no user-uploaded image, remote URL or third-party asset.
  // The server independently validates the selected identifier.
  var avatarOptions = {
    person: {
      label: "Classic",
      glyph: '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c.6-3.6 2.8-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/>'
    },
    crown: {
      label: "Crown",
      glyph: '<path d="m4 8 4 4 4-7 4 7 4-4-2 11H6L4 8Z"/><path d="M6 16h12"/>'
    },
    star: {
      label: "Star",
      glyph: '<path d="m12 3 2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.3-4.2 6-.9L12 3Z"/>'
    },
    moon: {
      label: "Moon",
      glyph: '<path d="M20.4 15.2A8.3 8.3 0 0 1 8.8 3.6 8.6 8.6 0 1 0 20.4 15.2Z"/>'
    },
    orbit: {
      label: "Orbit",
      glyph: '<circle cx="12" cy="12" r="2.4"/><ellipse cx="12" cy="12" rx="9" ry="4.8" transform="rotate(-32 12 12)"/><circle cx="19.4" cy="7.7" r="1.2"/>'
    },
    shield: {
      label: "Shield",
      glyph: '<path d="M12 3 19 5.7v5.1c0 4.6-2.9 7.6-7 9.2-4.1-1.6-7-4.6-7-9.2V5.7L12 3Z"/><path d="m8.5 12 2.2 2.2 4.8-4.8"/>'
    }
  };

  function normalizeAvatarId(value) {
    return Object.prototype.hasOwnProperty.call(avatarOptions, value) ? value : "person";
  }

  function avatarSvg(value, className) {
    var avatarId = normalizeAvatarId(value);
    return '<svg class="' + escapeHtml(className || "account-avatar-svg") +
      ' avatar-glyph-' + avatarId + '" data-avatar-id="' + avatarId +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      avatarOptions[avatarId].glyph + '</svg>';
  }

  function renderAvatarChoices(selectedAvatarId) {
    var selected = normalizeAvatarId(selectedAvatarId);
    return Object.keys(avatarOptions).map(function (avatarId) {
      var option = avatarOptions[avatarId];
      var isSelected = avatarId === selected;
      return '<button class="account-avatar-choice" type="button" data-avatar-id="' + avatarId +
        '" aria-pressed="' + (isSelected ? "true" : "false") +
        '" aria-label="Use ' + escapeHtml(option.label) + ' avatar" title="' + escapeHtml(option.label) + '">' +
        avatarSvg(avatarId, "account-avatar-choice-svg") +
        '<span>' + escapeHtml(option.label) + '</span></button>';
    }).join("");
  }

  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function showFeedback(message, kind) {
    feedback.textContent = message || "";
    feedback.dataset.kind = kind || "info";
    feedback.classList.toggle("is-visible", Boolean(message));
  }

  async function requestJson(path, payload) {
    if (browserPreviewMode) return browserPreviewRequest(path, payload || {});
    var response;
    try {
      response = await fetch(path, {
        method: payload === undefined ? "GET" : "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: payload === undefined ? { "Accept": "application/json" } : {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: payload === undefined ? undefined : JSON.stringify(payload)
      });
    } catch (_error) {
      throw new Error("The local account prototype is not running. Start it with the documented local command.");
    }
    var data;
    try { data = await response.json(); }
    catch (_error) { throw new Error("The local preview returned an unexpected response."); }
    if (!response.ok) throw new Error(data.error || "The request could not be completed.");
    return data;
  }

  function applyPreviewFormPrivacy() {
    if (!browserPreviewMode) return;
    Array.prototype.forEach.call(content.querySelectorAll("form"), function (form) {
      form.setAttribute("autocomplete", "off");
    });
    Array.prototype.forEach.call(content.querySelectorAll("input"), function (input) {
      input.setAttribute("autocomplete", "off");
    });
  }

  function previewRandomBytes(size) {
    if (!window.crypto || !window.crypto.getRandomValues || !window.crypto.subtle) {
      throw new Error("This browser does not provide Web Crypto. Open the HTTPS preview in a current browser.");
    }
    var output = new Uint8Array(size);
    window.crypto.getRandomValues(output);
    return output;
  }

  function previewHex(bytes) {
    return Array.prototype.map.call(new Uint8Array(bytes), function (value) {
      return value.toString(16).padStart(2, "0");
    }).join("");
  }

  function previewBytes(hex) {
    var pairs = String(hex).match(/[0-9a-f]{2}/gi) || [];
    return new Uint8Array(pairs.map(function (pair) { return parseInt(pair, 16); }));
  }

  async function previewPasswordHash(password, saltHex) {
    var key = await window.crypto.subtle.importKey(
      "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
    );
    var result = await window.crypto.subtle.deriveBits({
      name: "PBKDF2", salt: previewBytes(saltHex), iterations: 600000, hash: "SHA-256"
    }, key, 256);
    return previewHex(result);
  }

  function normalizeEmail(value) {
    if (typeof value !== "string") throw new Error("Enter a valid email address.");
    var email = value.trim().toLowerCase();
    if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }
    return email;
  }

  function validatePassword(value) {
    if (typeof value !== "string" || value.length < 15 || value.length > 1024) {
      throw new Error("Use a passphrase between 15 and 1024 characters.");
    }
    return value;
  }

  function validateReferralId(value) {
    if (value === undefined || value === null || String(value).trim() === "") return "";
    var referralId = String(value).trim();
    if (referralId.length > 64 || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(referralId)) {
      throw new Error("Enter a valid Referral ID or leave the field blank.");
    }
    return referralId;
  }

  function previewCurrentAccount() {
    if (!browserPreviewState.activeEmail || Date.now() >= browserPreviewState.sessionExpiresAt) {
      browserPreviewState.activeEmail = null;
      browserPreviewState.sessionExpiresAt = 0;
      return null;
    }
    return browserPreviewState.accounts[browserPreviewState.activeEmail] || null;
  }

  function previewSummary(account) {
    var current = Boolean(account && previewCurrentAccount() === account);
    return {
      authenticated: current,
      email: current ? account.email : account.email,
      createdAt: account ? account.createdAt : undefined,
      avatarId: normalizeAvatarId(account && account.avatarId),
      referralId: account ? account.referralId : "",
      newsletterOptIn: Boolean(account && account.newsletterOptIn),
      newsletterConsentAt: account && account.newsletterConsentAt ? account.newsletterConsentAt : null,
      termsAccepted: Boolean(account && account.termsAccepted),
      termsVersion: account ? account.termsVersion : termsVersion,
      termsAcceptedAt: account ? account.termsAcceptedAt : null,
      emailVerified: false,
      passwordResetAvailable: false,
      sessionExpiresAt: current ? new Date(browserPreviewState.sessionExpiresAt).toISOString() : null,
      scope: "browser-preview-memory-only",
      role: "user",
      adminRoleAssigned: false,
      adminWalletAuthenticated: false,
      adminSessionAuthorized: false,
      admin: false
    };
  }

  async function previewVerifyPassword(account, password) {
    if (!account || typeof password !== "string" || password.length > 1024) return false;
    var candidate = await previewPasswordHash(password, account.passwordSalt);
    return candidate === account.passwordHash;
  }

  function previewStartSession(email) {
    browserPreviewState.activeEmail = email;
    browserPreviewState.sessionExpiresAt = Date.now() + 30 * 60 * 1000;
  }

  async function browserPreviewRequest(path, payload) {
    if (path === "/api/account/status") {
      var current = previewCurrentAccount();
      return current ? previewSummary(current) : {
        authenticated: false,
        avatarId: "person",
        role: "user",
        adminRoleAssigned: false,
        adminWalletAuthenticated: false,
        adminSessionAuthorized: false,
        admin: false,
        scope: "browser-preview-memory-only"
      };
    }

    if (path === "/api/account/register") {
      var email = normalizeEmail(payload.email);
      var password = validatePassword(payload.password);
      var referralId = validateReferralId(payload.referralId);
      if (payload.termsAccepted !== true) throw new Error("Accept the Terms of Use and Privacy Policy to create an account.");
      if (typeof payload.newsletterOptIn !== "boolean") throw new Error("Choose whether you want AstroCrown crypto-news emails.");
      if (browserPreviewState.accounts[email]) throw new Error("An account with this email already exists. Try Log In.");
      var salt = previewHex(previewRandomBytes(16));
      var now = new Date().toISOString();
      var account = {
        email: email,
        passwordSalt: salt,
        passwordHash: await previewPasswordHash(password, salt),
        createdAt: now,
        avatarId: "person",
        referralId: referralId,
        newsletterOptIn: payload.newsletterOptIn,
        newsletterConsentAt: payload.newsletterOptIn ? now : null,
        termsAccepted: true,
        termsVersion: termsVersion,
        termsAcceptedAt: now
      };
      browserPreviewState.accounts[email] = account;
      previewStartSession(email);
      return Object.assign(previewSummary(account), {
        authenticated: true,
        message: "Development test account created. Your email is not verified, and no emails or newsletter messages have been sent."
      });
    }

    if (path === "/api/account/login") {
      var loginEmail = normalizeEmail(payload.email);
      if (typeof payload.password !== "string" || payload.password.length > 1024) {
        throw new Error("Enter your email address and password.");
      }
      var attempt = browserPreviewState.failedLogins[loginEmail] || { count: 0, startedAt: Date.now() };
      if (Date.now() - attempt.startedAt > 60000) attempt = { count: 0, startedAt: Date.now() };
      if (attempt.count >= 10) throw new Error("Too many sign-in attempts. Wait a minute before trying again.");
      var loginAccount = browserPreviewState.accounts[loginEmail];
      if (!loginAccount || !(await previewVerifyPassword(loginAccount, payload.password))) {
        attempt.count += 1;
        browserPreviewState.failedLogins[loginEmail] = attempt;
        throw new Error("Email address or password did not match.");
      }
      delete browserPreviewState.failedLogins[loginEmail];
      previewStartSession(loginEmail);
      return previewSummary(loginAccount);
    }

    if (path === "/api/account/avatar") {
      var avatarAccount = previewCurrentAccount();
      if (!avatarAccount) throw new Error("Sign in before changing your test avatar.");
      if (typeof payload.avatarId !== "string" || !Object.prototype.hasOwnProperty.call(avatarOptions, payload.avatarId)) {
        throw new Error("Choose one of the provided account avatars.");
      }
      avatarAccount.avatarId = payload.avatarId;
      return previewSummary(avatarAccount);
    }

    if (path === "/api/account/logout") {
      browserPreviewState.activeEmail = null;
      browserPreviewState.sessionExpiresAt = 0;
      return { authenticated: false, message: "Signed out of this browser-preview demo." };
    }

    throw new Error("Email-based password reset and external sign-in methods are not enabled in this development prototype. No email was sent.");
  }

  function setBusy(value) {
    busy = value;
    [content, dashboardContent].forEach(function (container) {
      Array.prototype.forEach.call(container.querySelectorAll("button, input"), function (element) {
        if (element.dataset.keepEnabled === "true") return;
        element.disabled = value || element.dataset.originalDisabled === "true";
      });
    });
  }

  function renderTabs(selected) {
    return '<div class="account-tabs" role="tablist" aria-label="Account access">' +
      '<button type="button" class="account-tab" role="tab" data-account-mode="signin" aria-selected="' + (selected === "signin" ? "true" : "false") + '">Log In</button>' +
      '<button type="button" class="account-tab" role="tab" data-account-mode="create" aria-selected="' + (selected === "create" ? "true" : "false") + '">Sign Up</button>' +
      '</div>';
  }

  function renderDevelopmentNotice() {
    return '<p class="account-demo-notice" id="account-demo-notice" data-mode="' +
      (browserPreviewMode ? "browser-preview-demo" : "local-server-test") + '">' +
      (browserPreviewMode
        ? "BROWSER PREVIEW DEMO ONLY — account details exist only in this page’s memory and disappear on reload. Use invented details only. No verification, password-reset or newsletter email is sent."
        : "LOCAL DEVELOPMENT TEST ONLY — test account details are stored in this computer’s local SQLite database. No verification, password-reset or newsletter email is sent. This is not production authentication.") +
      '</p>';
  }

  function renderProviderSlots() {
    return '<section class="account-provider-options" aria-label="Reserved space for future external sign-in options">' +
      '<p class="account-provider-heading">External account sign-in <span>PLANNED</span></p>' +
      '<div class="account-provider-placeholders" aria-hidden="true">' +
        '<span class="account-provider-placeholder"></span>' +
        '<span class="account-provider-placeholder"></span>' +
        '<span class="account-provider-placeholder"></span>' +
      '</div>' +
      '<p class="account-provider-caption">Optional provider logos can be placed here later. These circles are visual placeholders only; no external sign-in is enabled.</p>' +
      '</section>';
  }

  function renderOrDivider() {
    return '<div class="account-or-divider" aria-label="Or — use email and password">' +
      '<div class="account-or-divider-line-row" aria-hidden="true">' +
        '<span class="account-or-divider-line"></span>' +
        '<span class="account-or-divider-label">Or</span>' +
        '<span class="account-or-divider-line"></span>' +
      '</div>' +
      '<span class="account-or-divider-arrow" aria-hidden="true"></span>' +
    '</div>';
  }

  function renderSignIn() {
    title.textContent = "AstroCrown account";
    content.innerHTML = renderTabs("signin") + renderDevelopmentNotice() + renderProviderSlots() + renderOrDivider() +
      '<p class="account-dialog-description">Welcome back. Log in to your AstroCrown account with your email and password.</p>' +
      '<form id="account-signin-form" class="account-form" autocomplete="on">' +
        '<label class="account-field" for="account-email">Email' +
          '<input id="account-email" name="email" type="email" autocomplete="email" maxlength="254" required autocapitalize="none" spellcheck="false" placeholder="Enter your email address...">' +
        '</label>' +
        '<label class="account-field" for="account-password">Password' +
          '<input id="account-password" name="password" type="password" autocomplete="current-password" required maxlength="1024" placeholder="Enter your password...">' +
        '</label>' +
        '<div class="account-form-actions"><button class="account-primary" type="submit">Log In</button>' +
          '<button class="account-text-button" type="button" data-account-mode="recover">Forgot password?</button></div>' +
      '</form>' +
      '<p class="account-security-assurance"><a href="./account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">Security assurance</a></p>' +
      '<p class="account-provider-note">A crypto wallet is not required for ordinary account access. This development prototype does not verify email ownership or provide email password-reset delivery.</p>';
  }

  function renderCreate() {
    title.textContent = "AstroCrown account";
    content.innerHTML = renderTabs("create") + renderDevelopmentNotice() + renderProviderSlots() + renderOrDivider() +
      '<p class="account-dialog-description">Create your AstroCrown account using your email address.</p>' +
      '<form id="account-create-form" class="account-form" autocomplete="on">' +
        '<label class="account-field" for="account-email">Email' +
          '<input id="account-email" name="email" type="email" autocomplete="email" maxlength="254" required autocapitalize="none" spellcheck="false" placeholder="Enter your email address...">' +
        '</label>' +
        '<label class="account-field" for="account-password">Password' +
          '<input id="account-password" name="password" type="password" autocomplete="new-password" minlength="15" maxlength="1024" required placeholder="Enter your password...">' +
          '<small>For this test, use an invented passphrase at least 15 characters long. Do not reuse a real password.</small>' +
        '</label>' +
        '<label class="account-field" for="account-referral-id">Referral ID (Optional)' +
          '<input id="account-referral-id" name="referralId" type="text" autocomplete="off" maxlength="64" autocapitalize="characters" spellcheck="false" placeholder="Enter referral ID...">' +
        '</label>' +
        '<label class="account-consent account-newsletter-consent" for="account-newsletter-opt-in">' +
          '<input id="account-newsletter-opt-in" name="newsletterOptIn" type="checkbox">' +
          '<span>Please keep me updated by email with the latest crypto news, and more information from the Crypto universe of AstroCrown.</span>' +
        '</label>' +
        '<label class="account-consent account-terms-consent" for="account-terms-accepted">' +
          '<input id="account-terms-accepted" name="termsAccepted" type="checkbox" required>' +
          '<span>By proceeding, you agree to AstroCrown’s <a href="./account-continuity/prototype/terms-of-use.html" target="_blank" rel="noopener noreferrer">Terms of Use</a> &amp; <a href="./account-continuity/prototype/privacy-policy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>. <small>Both policy pages are marked development drafts and are not approved for production.</small></span>' +
        '</label>' +
        '<button class="account-primary account-create-submit" type="submit">Create an account</button>' +
      '</form>' +
      '<p class="account-security-assurance"><a href="./account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">Security assurance</a></p>' +
      '<p class="account-provider-note">This prototype stores test information only. No verification email or crypto-news newsletter will be sent.</p>';
  }

  function syncAccountButton() {
    var avatarId = normalizeAvatarId(accountState && accountState.avatarId);
    var icon = avatarSvg(avatarId, "account-header-avatar-svg");
    if (accountState && accountState.authenticated) {
      openButton.classList.add("is-authenticated");
      openButton.setAttribute("aria-label", "Open your account, avatar: " + avatarOptions[avatarId].label);
      openButton.setAttribute("title", "Open your account · " + avatarOptions[avatarId].label);
      openButton.setAttribute("data-avatar-id", avatarId);
      openButton.removeAttribute("aria-haspopup");
      openButton.setAttribute("aria-controls", "account-dashboard");
      openButton.innerHTML = icon;
    } else {
      openButton.classList.remove("is-authenticated");
      openButton.setAttribute("aria-label", "Account");
      openButton.setAttribute("title", "Account");
      openButton.setAttribute("data-avatar-id", "person");
      openButton.setAttribute("aria-haspopup", "dialog");
      openButton.setAttribute("aria-controls", "account-dialog");
      openButton.innerHTML = avatarSvg("person", "account-header-avatar-svg") + '<span>Account</span>';
    }
  }

  function renderSuccess() {
    var created = successKind === "signup";
    title.textContent = created ? "Account created" : "Welcome back";
    var heading = created ? "Your account is ready for this test" : "You're signed in";
    var message = created
      ? "A development test account was created. Email ownership has not been verified and no email or newsletter message was sent."
      : "You are signed in to the development test account. This does not grant production access or administrator privileges.";
    var persistenceNote = browserPreviewMode
      ? "You can close this window without signing out. This browser demo keeps the test state only in this page's memory and loses it on reload."
      : "You can close this window without signing out. The local test session remains on the loopback server until it expires or you sign out.";
    content.innerHTML =
      '<div class="account-success-panel">' +
        '<div class="account-success-mark" aria-hidden="true">✓</div>' +
        '<h3 class="account-success-heading">' + escapeHtml(heading) + '</h3>' +
        '<p class="account-success-copy">' + escapeHtml(message) + '</p>' +
        '<button class="account-primary" type="button" id="open-account-hub">Open your account</button>' +
        '<p class="account-success-small">' + escapeHtml(persistenceNote) + '</p>' +
      '</div>';
  }

  function renderAccountDashboard() {
    if (!accountState || !accountState.authenticated) return;
    var email = escapeHtml(accountState.email || "");
    var referral = accountState.referralId
      ? escapeHtml(accountState.referralId) + ' <span class="account-muted-inline">(unverified test value; no reward is applied)</span>'
      : 'Not supplied';
    var verification = accountState.emailVerified
      ? '<span class="account-dashboard-status">Verified by prototype state</span>'
      : '<span class="account-dashboard-status">Email not verified</span>';
    var newsletter = accountState.newsletterOptIn
      ? "Opted in for this test. No newsletter is sent."
      : "Not opted in.";
    var adminCard = accountState.admin === true && accountState.adminWalletAuthenticated === true
      ? '<section class="account-dashboard-card"><h2>Administration</h2><p>Administrative access is enabled by the backend for this session. This prototype contains no production admin actions.</p></section>'
      : '';
    dashboardContent.innerHTML =
      '<div class="account-dashboard-notice"><strong>Development test account.</strong> This page is part of a local/browser prototype. Email verification, email password reset, production account recovery, production profile editing, image uploads, session-management UI and administrator access are not implemented here. Built-in avatar selection is test-only. Use invented details only in the browser demo.</div>' +
      '<div class="account-dashboard-welcome">' +
        '<div class="account-dashboard-avatar account-avatar-' + normalizeAvatarId(accountState.avatarId) + '" aria-hidden="true">' +
          avatarSvg(accountState.avatarId, "account-dashboard-avatar-svg") +
        '</div>' +
        '<div class="account-dashboard-welcome-copy"><strong>' + email + '</strong><span>Signed in · local/browser test account · built-in avatar customization only</span></div>' +
      '</div>' +
      '<div class="account-dashboard-grid">' +
        '<section class="account-dashboard-card account-profile-card"><h2>Profile &amp; avatar</h2><p class="account-dashboard-value">Account created: ' + escapeHtml(accountState.createdAt || "Recorded in test state") + '</p><p>Choose from built-in AstroCrown avatars. No image upload or external image service is used.</p><div id="account-avatar-picker" class="account-avatar-picker" role="group" aria-label="Choose account avatar">' + renderAvatarChoices(accountState.avatarId) + '</div><p id="account-avatar-feedback" class="account-avatar-feedback" role="status">Your selected avatar appears here and in the circular header control.</p></section>' +
        '<section class="account-dashboard-card"><h2>Security &amp; sign-in</h2>' + verification + '<p>Password-reset email is unavailable. No reset email has been sent. Real accounts must not be used with this prototype.</p><a href="./account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">Read security assurance</a></section>' +
        '<section class="account-dashboard-card"><h2>Wallets</h2><p class="account-dashboard-value">No wallet connected</p><p>A crypto wallet is not required for ordinary account access. A wallet must be requested only by a feature that needs proof of wallet control.</p></section>' +
        '<section class="account-dashboard-card"><h2>Preferences</h2><p class="account-dashboard-value">Crypto-news email: ' + escapeHtml(newsletter) + '</p><p>The preference is only recorded for this test; no mailing list or email provider is connected.</p></section>' +
        '<section class="account-dashboard-card"><h2>Referral ID</h2><p class="account-dashboard-value">' + referral + '</p><p>Referral values are not verified and do not trigger rewards or benefits in this prototype.</p></section>' +
        '<section class="account-dashboard-card"><h2>Account recovery</h2><p>Password recovery, email verification, passkeys, recovery management and active-session review are not implemented. Do not rely on this test account for real access.</p></section>' +
        adminCard +
      '</div>' +
      '<div class="account-dashboard-actions"><p>Public listing and wallet connection are not required for ordinary account access. The separate administrator flow is not implemented in this prototype.</p><button class="account-secondary" type="button" id="account-signout">Sign out</button></div>';
  }

  function showHomepage() {
    dashboard.hidden = true;
    mainContent.hidden = false;
  }

  function clearAccountRoute() {
    var cleanUrl = window.location.pathname + window.location.search;
    window.history.replaceState(null, "", cleanUrl);
    showHomepage();
  }

  async function showAccountDashboard() {
    var status = await refreshStatus();
    if (!status.authenticated) {
      clearAccountRoute();
      mode = "signin";
      render();
      if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
      else dialog.setAttribute("open", "open");
      var first = content.querySelector("input, button");
      if (first) first.focus();
      return;
    }
    mainContent.hidden = true;
    dashboard.hidden = false;
    renderAccountDashboard();
    var dashboardTitle = document.getElementById("account-dashboard-title");
    if (dashboardTitle) dashboardTitle.focus();
  }

  function navigateToAccount() {
    if (window.location.hash === "#account") {
      showAccountDashboard();
    } else {
      window.location.hash = "account";
    }
  }

  async function handleRouteChange() {
    if (window.location.hash === "#account") {
      await showAccountDashboard();
    } else {
      showHomepage();
    }
  }

  function renderAccount() {
    title.textContent = "Your AstroCrown account";
    var email = escapeHtml(accountState.email || "");
    var referral = accountState.referralId
      ? '<p class="account-status-copy"><strong>Referral ID:</strong> ' + escapeHtml(accountState.referralId) + ' <span class="account-muted-inline">(recorded as an unverified test value; no reward is applied)</span></p>'
      : '<p class="account-status-copy"><strong>Referral ID:</strong> Not supplied</p>';
    var newsletter = accountState.newsletterOptIn
      ? "You opted in to crypto-news email updates in this test. No newsletter has been sent."
      : "You did not opt in to crypto-news email updates.";
    content.innerHTML =
      '<div class="account-account-card"><p class="account-account-status">Signed in · development test account</p>' +
        '<p class="account-account-name">' + email + '</p>' +
        '<p class="account-status-copy">Email verification is not enabled in this prototype. This account has no production privileges or real asset access.</p></div>' +
      referral +
      '<div class="account-recovery-warning"><strong>Password reset by email is not available yet.</strong><br>No reset email has been sent or will be sent by this prototype. Production email verification and password-reset delivery must be implemented and reviewed before real account use.</div>' +
      '<div class="account-recovery-ok"><strong>Crypto-news preference</strong><br>' + escapeHtml(newsletter) + '</div>' +
      '<div class="account-actions-stack"><button class="account-secondary" type="button" id="account-signout">Sign out</button></div>' +
      '<p class="account-provider-note">This is a development-only interaction test, not production authentication.</p>';
  }

  function renderRecover() {
    title.textContent = "Account recovery";
    content.innerHTML = renderTabs("signin") + renderDevelopmentNotice() +
      '<p class="account-dialog-description">Enter the email address associated with your account. A production service would send a time-limited password-reset link to that inbox.</p>' +
      '<div class="account-recovery-warning"><strong>Email reset is not enabled in this prototype.</strong><br>No email will be sent, and this demo cannot reset the password. We will not ask you to memorise or enter a one-time recovery code.</div>' +
      '<form id="account-reset-request-form" class="account-form" autocomplete="on">' +
        '<label class="account-field" for="account-email">Email' +
          '<input id="account-email" name="email" type="email" autocomplete="email" maxlength="254" required autocapitalize="none" spellcheck="false" placeholder="Enter your email address...">' +
        '</label>' +
        '<button class="account-primary" type="submit">Request password reset</button>' +
      '</form>' +
      '<p class="account-security-assurance"><a href="./account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">Security assurance</a></p>' +
      '<div class="account-form-actions"><button class="account-text-button" type="button" data-account-mode="signin">Back to Log In</button>' +
        '<button class="account-text-button" type="button" data-account-mode="create">Create an account instead</button></div>';
  }

  function render() {
    showFeedback("", "");
    if (mode === "signin") renderSignIn();
    else if (mode === "create") renderCreate();
    else if (mode === "recover") renderRecover();
    else if (mode === "success") renderSuccess();
    else renderSignIn();
    applyPreviewFormPrivacy();
  }

  async function refreshStatus() {
    try {
      accountState = await requestJson("/api/account/status");
      syncAccountButton();
      return accountState;
    } catch (_error) {
      accountState = { authenticated: false };
      syncAccountButton();
      return accountState;
    }
  }

  async function openAccountDialog() {
    var status = await refreshStatus();
    if (status.authenticated) {
      navigateToAccount();
      return;
    }
    focusBeforeOpen = document.activeElement;
    mode = "signin";
    render();
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    else dialog.setAttribute("open", "open");
    var first = content.querySelector("input, button");
    if (first) first.focus();
  }

  function closeDialog() {
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  function setMode(next) {
    mode = next;
    render();
  }

  function formValue(form, name) {
    var item = form.elements.namedItem(name);
    return item ? item.value : "";
  }

  content.addEventListener("submit", async function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (busy) return;

    if (form.id === "account-reset-request-form") {
      showFeedback("No email was sent. Email-based password reset is not connected to this development prototype.", "error");
      return;
    }

    var endpoint;
    var payload;
    if (form.id === "account-signin-form") {
      endpoint = "/api/account/login";
      payload = { email: formValue(form, "email"), password: formValue(form, "password") };
    } else if (form.id === "account-create-form") {
      endpoint = "/api/account/register";
      payload = {
        email: formValue(form, "email"),
        password: formValue(form, "password"),
        referralId: formValue(form, "referralId"),
        newsletterOptIn: Boolean(form.elements.namedItem("newsletterOptIn").checked),
        termsAccepted: Boolean(form.elements.namedItem("termsAccepted").checked),
        termsVersion: termsVersion
      };
    } else {
      return;
    }

    setBusy(true);
    try {
      var result = await requestJson(endpoint, payload);
      accountState = result;
      successKind = form.id === "account-create-form" ? "signup" : "signin";
      mode = "success";
      syncAccountButton();
      render();
      var successAction = document.getElementById("open-account-hub");
      if (successAction) successAction.focus();
    } catch (error) {
      showFeedback(error.message, "error");
    } finally {
      setBusy(false);
    }
  });

  content.addEventListener("click", async function (event) {
    var button = event.target.closest("button");
    if (!button || busy) return;
    if (button.dataset.accountMode) {
      setMode(button.dataset.accountMode);
      return;
    }
    if (button.id === "open-account-hub") {
      closeDialog();
      navigateToAccount();
      return;
    }
    if (button.id === "account-signout") {
      setBusy(true);
      try {
        await requestJson("/api/account/logout", {});
        accountState = { authenticated: false };
        await refreshStatus();
        mode = "signin";
        render();
        showFeedback("Signed out of the development test account.", "success");
      } catch (error) {
        showFeedback(error.message, "error");
      } finally {
        setBusy(false);
      }
    }
  });

  dashboardContent.addEventListener("click", async function (event) {
    var button = event.target.closest("button");
    if (!button || busy) return;
    if (button.hasAttribute("data-avatar-id")) {
      var requestedAvatar = button.getAttribute("data-avatar-id");
      if (!Object.prototype.hasOwnProperty.call(avatarOptions, requestedAvatar)) return;
      setBusy(true);
      try {
        accountState = await requestJson("/api/account/avatar", { avatarId: requestedAvatar });
        syncAccountButton();
        renderAccountDashboard();
        var avatarFeedback = document.getElementById("account-avatar-feedback");
        if (avatarFeedback) avatarFeedback.textContent = "Avatar updated for this test account.";
        var selectedAvatar = dashboardContent.querySelector('#account-avatar-picker [data-avatar-id="' + requestedAvatar + '"]');
        if (selectedAvatar) selectedAvatar.focus();
      } catch (error) {
        var avatarFeedbackOnError = document.getElementById("account-avatar-feedback");
        if (avatarFeedbackOnError) avatarFeedbackOnError.textContent = error.message || "The avatar could not be updated.";
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.id !== "account-signout") return;
    setBusy(true);
    try {
      await requestJson("/api/account/logout", {});
      accountState = { authenticated: false };
      await refreshStatus();
      mode = "signin";
      if (dialog.open) closeDialog();
      clearAccountRoute();
    } catch (error) {
      var message = document.getElementById("account-dashboard-content");
      if (message) {
        var notice = document.createElement("p");
        notice.className = "account-dashboard-notice";
        notice.setAttribute("role", "status");
        notice.textContent = error.message || "Sign-out could not be completed.";
        message.prepend(notice);
      }
    } finally {
      setBusy(false);
    }
  });

  openButton.addEventListener("click", openAccountDialog);
  closeButton.addEventListener("click", closeDialog);
  dialog.addEventListener("close", function () {
    showFeedback("", "");
    if (focusBeforeOpen && typeof focusBeforeOpen.focus === "function") focusBeforeOpen.focus();
  });
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) closeDialog();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && dialog.open) closeDialog();
  });
  window.addEventListener("hashchange", handleRouteChange);

  refreshStatus().then(function (status) {
    if (window.location.hash === "#account") {
      if (status.authenticated) showAccountDashboard();
      else clearAccountRoute();
    }
  });
}());
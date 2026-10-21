(function () {
  "use strict";

  var dialog = document.getElementById("account-dialog");
  var content = document.getElementById("account-content");
  var feedback = document.getElementById("account-feedback");
  var title = document.getElementById("account-dialog-title");
  var openButton = document.getElementById("open-account-dialog");
  var closeButton = document.getElementById("account-dialog-close");
  var mode = "signin";
  var accountState = { authenticated: false };
  var recoveryCodes = [];
  var focusBeforeOpen = null;
  var busy = false;
  var loopbackHosts = ["localhost", "127.0.0.1", "::1"];
  var forceBrowserDemo = new URLSearchParams(window.location.search).get("account-preview-demo") === "1";
  var browserPreviewMode = forceBrowserDemo || loopbackHosts.indexOf(window.location.hostname) === -1;
  var browserPreviewState = { accounts: Object.create(null), activeUsername: null, sessionExpiresAt: 0, failedLogins: Object.create(null) };


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
    if (browserPreviewMode) return browserPreviewRequest(path, payload);
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


  // The hosted HTML preview cannot reach a maintainer's loopback server. Its
  // account journey is deliberately a disposable, in-memory interaction demo.
  // It does not call account APIs or persist account state in browser storage.
  // The local Python/SQLite path stays intact.
  function setEnvironmentDisclosure() {
    var notice = document.getElementById("account-demo-notice");
    if (notice) {
      notice.dataset.mode = browserPreviewMode ? "browser-preview-demo" : "local-server-test";
      notice.textContent = browserPreviewMode
        ? "BROWSER PREVIEW DEMO ONLY — test records exist only in this page's memory and disappear on reload. Use invented credentials only; never enter a real password or valuable recovery material."
        : "LOCAL DEVELOPMENT TEST ONLY — account records are stored in the local SQLite database. Use invented credentials only; this is not production authentication.";
    }
  }

  function environmentDetails() {
    return browserPreviewMode
      ? "Browser-preview demo only: account requests are not sent to a server. Test records exist only in this page's memory and are erased when the page reloads. Never use real credentials or valuable recovery material."
      : "Local development only. No account data is sent to an external identity provider; records are stored in the SQLite database on this computer. This is not production authentication.";
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

  async function previewCodeHash(code) {
    var normalized = String(code).toUpperCase().replace(/[^A-Z0-9]/g, "");
    return previewHex(await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized)));
  }

  function previewEqual(left, right) {
    left = String(left);
    right = String(right);
    var difference = left.length ^ right.length;
    var maximum = Math.max(left.length, right.length);
    for (var i = 0; i < maximum; i++) {
      difference |= (left.charCodeAt(i % Math.max(left.length, 1)) || 0) ^
        (right.charCodeAt(i % Math.max(right.length, 1)) || 0);
    }
    return difference === 0;
  }

  function previewNormalizeUsername(value) {
    if (typeof value !== "string") {
      throw new Error("Enter a username using 3–24 letters, numbers, dots, underscores or hyphens.");
    }
    var username = value.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.-]{2,23}$/.test(username)) {
      throw new Error("Use 3–24 characters: letters, numbers, dot, underscore or hyphen. Start with a letter or number.");
    }
    return username;
  }

  function previewValidatePassword(value) {
    if (typeof value !== "string" || value.length < 15 || value.length > 1024) {
      throw new Error("Use a passphrase between 15 and 1024 characters.");
    }
    return value;
  }

  function previewMakeCodes() {
    var codes = [];
    for (var i = 0; i < 8; i++) {
      var hex = previewHex(previewRandomBytes(12)).toUpperCase();
      codes.push(hex.match(/.{4}/g).join("-"));
    }
    return codes;
  }

  async function previewHashCodes(codes) {
    return Promise.all(codes.map(function (code) { return previewCodeHash(code); }));
  }

  function previewCurrentAccount() {
    if (!browserPreviewState.activeUsername || Date.now() >= browserPreviewState.sessionExpiresAt) {
      browserPreviewState.activeUsername = null;
      browserPreviewState.sessionExpiresAt = 0;
      return null;
    }
    return browserPreviewState.accounts[browserPreviewState.activeUsername] || null;
  }

  function previewSummary(account) {
    var current = Boolean(account && previewCurrentAccount() === account);
    return {
      authenticated: current,
      username: current ? account.username : undefined,
      createdAt: account ? account.createdAt : undefined,
      recoveryConfigured: Boolean(account && account.recoveryEnabled),
      recoveryCodesRemaining: account && account.recoveryEnabled ? account.recoveryHashes.length : 0,
      sessionExpiresAt: current ? new Date(browserPreviewState.sessionExpiresAt).toISOString() : null,
      scope: "browser-preview-memory-only",
      admin: false
    };
  }

  async function previewVerifyPassword(account, password) {
    if (!account || typeof password !== "string" || password.length > 1024) return false;
    return previewEqual(await previewPasswordHash(password, account.passwordSalt), account.passwordHash);
  }

  function previewStartSession(username) {
    browserPreviewState.activeUsername = username;
    browserPreviewState.sessionExpiresAt = Date.now() + 30 * 60 * 1000;
  }

  async function browserPreviewRequest(path, payload) {
    payload = payload || {};
    if (path === "/api/account/status") {
      var current = previewCurrentAccount();
      return current ? previewSummary(current) : { authenticated: false, admin: false, scope: "browser-preview-memory-only" };
    }

    if (path === "/api/account/register") {
      var username = previewNormalizeUsername(payload.username);
      var password = previewValidatePassword(payload.password);
      if (browserPreviewState.accounts[username]) {
        throw new Error("That username is already in use. Choose another one.");
      }
      var codes = previewMakeCodes();
      var salt = previewHex(previewRandomBytes(16));
      var account = {
        username: username,
        passwordSalt: salt,
        passwordHash: await previewPasswordHash(password, salt),
        createdAt: new Date().toISOString(),
        recoveryEnabled: false,
        recoveryHashes: await previewHashCodes(codes)
      };
      browserPreviewState.accounts[username] = account;
      previewStartSession(username);
      return Object.assign(previewSummary(account), {
        authenticated: true,
        recoveryCodes: codes,
        message: "Demo account created in this page's memory. Save the one-time demo codes if you want to test recovery."
      });
    }

    if (path === "/api/account/login") {
      var loginName = previewNormalizeUsername(payload.username);
      if (typeof payload.password !== "string" || payload.password.length > 1024) {
        throw new Error("Enter your username and password.");
      }
      var attempt = browserPreviewState.failedLogins[loginName] || { count: 0, startedAt: Date.now() };
      if (Date.now() - attempt.startedAt > 60000) attempt = { count: 0, startedAt: Date.now() };
      if (attempt.count >= 10) throw new Error("Too many sign-in attempts. Wait a minute before trying again.");
      var loginAccount = browserPreviewState.accounts[loginName];
      if (!loginAccount || !(await previewVerifyPassword(loginAccount, payload.password))) {
        attempt.count += 1;
        browserPreviewState.failedLogins[loginName] = attempt;
        throw new Error("Username or password did not match.");
      }
      delete browserPreviewState.failedLogins[loginName];
      previewStartSession(loginName);
      return previewSummary(loginAccount);
    }

    if (path === "/api/account/logout") {
      browserPreviewState.activeUsername = null;
      browserPreviewState.sessionExpiresAt = 0;
      return { authenticated: false, message: "Signed out of this browser-preview demo." };
    }

    if (path === "/api/account/recover") {
      var recoveryName = previewNormalizeUsername(payload.username);
      var newPassword = previewValidatePassword(payload.newPassword);
      var recoveryAccount = browserPreviewState.accounts[recoveryName];
      if (!recoveryAccount || !recoveryAccount.recoveryEnabled || typeof payload.recoveryCode !== "string") {
        throw new Error("The username or recovery code could not be verified.");
      }
      var suppliedHash = await previewCodeHash(payload.recoveryCode);
      var codeIndex = recoveryAccount.recoveryHashes.findIndex(function (item) { return previewEqual(item, suppliedHash); });
      if (codeIndex < 0) throw new Error("The username or recovery code could not be verified.");
      var replacementSalt = previewHex(previewRandomBytes(16));
      var replacementHash = await previewPasswordHash(newPassword, replacementSalt);
      recoveryAccount.passwordSalt = replacementSalt;
      recoveryAccount.passwordHash = replacementHash;
      recoveryAccount.recoveryHashes.splice(codeIndex, 1);
      recoveryAccount.recoveryEnabled = recoveryAccount.recoveryHashes.length > 0;
      browserPreviewState.activeUsername = null;
      browserPreviewState.sessionExpiresAt = 0;
      return { reset: true, message: "Demo password reset. Sign in with the new passphrase." };
    }

    if (path === "/api/recovery/ack") {
      var ackAccount = previewCurrentAccount();
      if (!ackAccount) throw new Error("Sign in again to manage recovery codes.");
      if (ackAccount.recoveryHashes.length < 1) {
        throw new Error("Generate a new set of recovery codes before confirming it.");
      }
      ackAccount.recoveryEnabled = true;
      return { recoveryConfigured: true, recoveryCodesRemaining: ackAccount.recoveryHashes.length };
    }

    if (path === "/api/recovery/skip") {
      var skipAccount = previewCurrentAccount();
      if (!skipAccount) throw new Error("Sign in again to manage recovery codes.");
      skipAccount.recoveryHashes = [];
      skipAccount.recoveryEnabled = false;
      return { recoveryConfigured: false, message: "Demo recovery codes were deleted." };
    }

    if (path === "/api/recovery/regenerate") {
      var regenAccount = previewCurrentAccount();
      if (!regenAccount) throw new Error("Sign in again to manage recovery codes.");
      if (!(await previewVerifyPassword(regenAccount, payload.password))) {
        throw new Error("Your current password could not be verified.");
      }
      var replacementCodes = previewMakeCodes();
      regenAccount.recoveryHashes = await previewHashCodes(replacementCodes);
      regenAccount.recoveryEnabled = false;
      return {
        recoveryCodes: replacementCodes,
        message: "The previous demo recovery codes have been invalidated. Save the new set before confirming."
      };
    }

    throw new Error("That browser-preview account action is not available.");
  }

  function setBusy(value) {
    busy = value;
    Array.prototype.forEach.call(content.querySelectorAll("button, input"), function (element) {
      if (element.dataset.keepEnabled === "true") return;
      element.disabled = value || element.dataset.originalDisabled === "true";
    });
  }

  function renderTabs(selected) {
    return '<div class="account-tabs" role="tablist" aria-label="Account access">' +
      '<button type="button" class="account-tab" role="tab" data-account-mode="signin" aria-selected="' + (selected === "signin" ? "true" : "false") + '">Sign in</button>' +
      '<button type="button" class="account-tab" role="tab" data-account-mode="create" aria-selected="' + (selected === "create" ? "true" : "false") + '">Create account</button>' +
      '</div>';
  }

  function renderSignIn() {
    title.textContent = "Welcome back";
    content.innerHTML = renderTabs("signin") +
      '<p class="account-dialog-description">Sign in with your AstroCrown username and password. A crypto wallet is not required for ordinary account access.</p>' +
      '<form id="account-signin-form" class="account-form" autocomplete="on">' +
        '<label class="account-field" for="account-username">Username' +
          '<input id="account-username" name="username" type="text" autocomplete="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9][A-Za-z0-9_.-]{2,23}" required autocapitalize="none" spellcheck="false" placeholder="your-username">' +
        '</label>' +
        '<label class="account-field" for="account-password">Password' +
          '<input id="account-password" name="password" type="password" autocomplete="current-password" required maxlength="1024" placeholder="Enter your passphrase">' +
        '</label>' +
        '<div class="account-form-actions"><button class="account-primary" type="submit">Sign in</button>' +
          '<button class="account-text-button" type="button" data-account-mode="recover">Forgot password?</button></div>' +
      '</form>' +
      '<p class="account-provider-note">This local test does not connect Google, Apple, X, Facebook, LinkedIn, or any other identity provider. We will not display pretend provider buttons. Those integrations require separate approval and verification.</p>';
  }

  function renderCreate() {
    title.textContent = "Create your account";
    content.innerHTML = renderTabs("create") +
      '<p class="account-dialog-description">Choose a username and a strong passphrase. No email address or crypto wallet is requested by this prototype.</p>' +
      '<form id="account-create-form" class="account-form" autocomplete="on">' +
        '<label class="account-field" for="account-username">Username' +
          '<input id="account-username" name="username" type="text" autocomplete="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9][A-Za-z0-9_.-]{2,23}" required autocapitalize="none" spellcheck="false" placeholder="your-username">' +
          '<small>3–24 characters: letters, numbers, dot, underscore or hyphen. Usernames are not case-sensitive.</small>' +
        '</label>' +
        '<label class="account-field" for="account-password">Password / passphrase' +
          '<input id="account-password" name="password" type="password" autocomplete="new-password" minlength="15" maxlength="1024" required placeholder="At least 15 characters">' +
          '<small>This local prototype has no email reset. After creating the account, save the one-time recovery codes or you may be unable to recover forgotten access.</small>' +
        '</label>' +
        '<label class="account-field" for="account-confirm-password">Confirm password' +
          '<input id="account-confirm-password" name="confirmPassword" type="password" autocomplete="new-password" minlength="15" maxlength="1024" required placeholder="Enter it again">' +
        '</label>' +
        '<button class="account-primary" type="submit">Create account</button>' +
      '</form>' +
      '<p class="account-provider-note">Local development only. Do not reuse a real or important password here. This is a disposable browser demo or local database test, depending on the preview mode shown above. Never use a real or important password.</p>';
  }

  function renderRecoveryCodes() {
    title.textContent = "Protect your account";
    var codes = recoveryCodes.map(function (code) { return "<code>" + escapeHtml(code) + "</code>"; }).join("");
    content.innerHTML =
      '<p class="account-dialog-description">Save these one-time recovery codes somewhere private and separate from this device. Each code can be used once to reset the password. They are shown only now.</p>' +
      '<div class="account-recovery-warning"><strong>Important:</strong> this prototype has no email reset or passkey yet. If you skip these codes and later forget your password, you cannot use this prototype\'s password-recovery route.</div>' +
      '<div class="account-code-list" id="recovery-code-list">' + codes + '</div>' +
      '<div class="account-form-actions">' +
        '<button class="account-secondary" type="button" id="copy-recovery-codes">Copy codes</button>' +
        '<button class="account-secondary" type="button" id="download-recovery-codes">Download .txt</button>' +
      '</div>' +
      '<div class="account-actions-stack">' +
        '<button class="account-primary" type="button" id="acknowledge-recovery">I have saved these codes</button>' +
        '<button class="account-text-button" type="button" id="skip-recovery">Not now — delete these codes</button>' +
      '</div>' +
      '<p class="account-inline-note">Regenerating codes later invalidates all codes from the previous set. Never send recovery codes to support, NOVA, or anyone else.</p>';
  }

  function renderAccount() {
    title.textContent = "Your account";
    var username = escapeHtml(accountState.username || "");
    var recoveryPanel = accountState.recoveryConfigured
      ? '<div class="account-recovery-ok"><strong>Recovery codes enabled.</strong><br>' +
          String(accountState.recoveryCodesRemaining || 0) + ' unused code(s) remain. Keep them offline and private.</div>'
      : '<div class="account-recovery-warning"><strong>Recovery is not set up.</strong><br>If you forget your password, there is no email or wallet reset in this prototype. Set up recovery codes before relying on this test account.</div>';
    content.innerHTML =
      '<div class="account-account-card"><p class="account-account-status">Signed in · local test account</p>' +
        '<p class="account-account-name">' + username + '</p>' +
        '<p class="account-status-copy">This is an ordinary test account only. It has no admin role, wallet association, real assets or production privileges.</p></div>' +
      recoveryPanel +
      '<div class="account-actions-stack">' +
        '<button class="account-primary" type="button" id="manage-recovery">' + (accountState.recoveryConfigured ? 'Replace recovery codes' : 'Set up recovery codes') + '</button>' +
        '<button class="account-secondary" type="button" id="account-signout">Sign out</button>' +
      '</div>' +
      '<p class="account-provider-note">Browser-preview data remains only in page memory and is erased on reload, or local-backend test data remains in the local database. The local server must not be exposed to a network. This is not production authentication.</p>';
  }

  function renderRecover() {
    title.textContent = "Recover your account";
    content.innerHTML =
      '<p class="account-dialog-description">Use one unused recovery code you saved when setting up the account. The code is consumed when your password is reset.</p>' +
      '<form id="account-recover-form" class="account-form" autocomplete="on">' +
        '<label class="account-field" for="account-username">Username' +
          '<input id="account-username" name="username" type="text" autocomplete="username" minlength="3" maxlength="24" required autocapitalize="none" spellcheck="false">' +
        '</label>' +
        '<label class="account-field" for="recovery-code">One-time recovery code' +
          '<input id="recovery-code" name="recoveryCode" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" required placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX">' +
        '</label>' +
        '<label class="account-field" for="new-password">New password / passphrase' +
          '<input id="new-password" name="newPassword" type="password" autocomplete="new-password" minlength="15" maxlength="1024" required placeholder="At least 15 characters">' +
        '</label>' +
        '<label class="account-field" for="confirm-new-password">Confirm new password' +
          '<input id="confirm-new-password" name="confirmNewPassword" type="password" autocomplete="new-password" minlength="15" maxlength="1024" required>' +
        '</label>' +
        '<button class="account-primary" type="submit">Reset password</button>' +
      '</form>' +
      '<div class="account-form-actions"><button class="account-text-button" type="button" data-account-mode="signin">Back to sign in</button>' +
        '<button class="account-text-button" type="button" data-account-mode="create">Create an account instead</button></div>' +
      '<p class="account-provider-note">Resetting the password revokes existing sessions. It does not recover a crypto wallet, admin access, payout destinations or encrypted data keys.</p>';
  }

  function renderRegenerate() {
    title.textContent = "Replace recovery codes";
    content.innerHTML =
      '<p class="account-dialog-description">Generate a new set of one-time recovery codes. This immediately invalidates all codes from the previous set.</p>' +
      '<form id="account-regenerate-form" class="account-form" autocomplete="on">' +
        '<label class="account-field" for="current-password">Confirm your current password' +
          '<input id="current-password" name="password" type="password" autocomplete="current-password" minlength="15" maxlength="1024" required>' +
        '</label>' +
        '<button class="account-primary" type="submit">Generate new codes</button>' +
      '</form>' +
      '<p class="account-provider-note">The new codes are not active until you confirm that you have saved them. If you skip, the previous set will already have been invalidated.</p>' +
      '<button class="account-text-button" type="button" data-account-mode="account">Cancel</button>';
  }

  function render() {
    showFeedback("", "");
    if (mode === "signin") renderSignIn();
    else if (mode === "create") renderCreate();
    else if (mode === "recover") renderRecover();
    else if (mode === "codes") renderRecoveryCodes();
    else if (mode === "regenerate") renderRegenerate();
    else renderAccount();
    if (browserPreviewMode) {
      var previewNote = document.createElement("p");
      previewNote.className = "account-provider-note";
      previewNote.textContent = environmentDetails();
      content.appendChild(previewNote);
    }
    applyPreviewFormPrivacy();
  }

  async function refreshStatus() {
    try {
      accountState = await requestJson("/api/account/status");
      return accountState;
    } catch (_error) {
      accountState = { authenticated: false };
      return accountState;
    }
  }

  async function openAccountDialog() {
    focusBeforeOpen = document.querySelector('[data-menu="account-menu"]') || document.activeElement;
    var status = await refreshStatus();
    mode = status.authenticated ? "account" : "signin";
    render();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "open");
    var first = content.querySelector("input, button");
    if (first) first.focus();
  }

  function closeDialog() {
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  function setMode(next) {
    if (next === "account" && !accountState.authenticated) next = "signin";
    mode = next;
    recoveryCodes = [];
    render();
  }

  function formValue(form, name) {
    var item = form.elements.namedItem(name);
    return item ? item.value : "";
  }

  function codesText() { return recoveryCodes.join("\n") + "\n"; }

  function downloadCodes() {
    var blob = new Blob([codesText()], { type: "text/plain;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "AstroCrown-Recovery-Codes.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    showFeedback("Recovery-code file prepared. Store it somewhere private and separate from this device.", "success");
  }

  async function regenerateWithPassword(password) {
    var result = await requestJson("/api/recovery/regenerate", { password: password });
    recoveryCodes = result.recoveryCodes;
    mode = "codes";
    render();
    showFeedback(result.message, "success");
  }

  content.addEventListener("submit", async function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (busy) return;
    var payload;
    var endpoint;
    if (form.id === "account-signin-form") {
      endpoint = "/api/account/login";
      payload = { username: formValue(form, "username"), password: formValue(form, "password") };
    } else if (form.id === "account-create-form") {
      var password = formValue(form, "password");
      if (password !== formValue(form, "confirmPassword")) {
        showFeedback("The passwords do not match.", "error");
        return;
      }
      endpoint = "/api/account/register";
      payload = { username: formValue(form, "username"), password: password };
    } else if (form.id === "account-recover-form") {
      var newPassword = formValue(form, "newPassword");
      if (newPassword !== formValue(form, "confirmNewPassword")) {
        showFeedback("The new passwords do not match.", "error");
        return;
      }
      endpoint = "/api/account/recover";
      payload = {
        username: formValue(form, "username"),
        recoveryCode: formValue(form, "recoveryCode"),
        newPassword: newPassword
      };
    } else if (form.id === "account-regenerate-form") {
      setBusy(true);
      try { await regenerateWithPassword(formValue(form, "password")); }
      catch (error) { showFeedback(error.message, "error"); }
      finally { setBusy(false); }
      return;
    } else return;

    setBusy(true);
    try {
      var result = await requestJson(endpoint, payload);
      if (form.id === "account-create-form") {
        accountState = result;
        recoveryCodes = result.recoveryCodes || [];
        mode = "codes";
        render();
        showFeedback("Account created in test mode. Save your recovery codes now.", "success");
      } else if (form.id === "account-signin-form") {
        accountState = result;
        await refreshStatus();
        mode = "account";
        render();
        showFeedback("You are signed in to the test account.", "success");
      } else {
        accountState = { authenticated: false };
        await refreshStatus();
        mode = "signin";
        render();
        showFeedback("Password reset. Sign in with your new password.", "success");
      }
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
      var next = button.dataset.accountMode;
      if (next === "account") {
        await refreshStatus();
        setMode("account");
      } else setMode(next);
      return;
    }
    if (button.id === "acknowledge-recovery") {
      setBusy(true);
      try {
        await requestJson("/api/recovery/ack", {});
        await refreshStatus();
        mode = "account";
        recoveryCodes = [];
        render();
        showFeedback("Recovery codes are enabled for this local account.", "success");
      } catch (error) { showFeedback(error.message, "error"); }
      finally { setBusy(false); }
      return;
    }
    if (button.id === "skip-recovery") {
      setBusy(true);
      try {
        await requestJson("/api/recovery/skip", {});
        await refreshStatus();
        mode = "account";
        recoveryCodes = [];
        render();
        showFeedback("Recovery codes were deleted. Add a recovery method before relying on this test account.", "info");
      } catch (error) { showFeedback(error.message, "error"); }
      finally { setBusy(false); }
      return;
    }
    if (button.id === "download-recovery-codes") { downloadCodes(); return; }
    if (button.id === "copy-recovery-codes") {
      try {
        await navigator.clipboard.writeText(codesText());
        showFeedback("Recovery codes copied. Keep them private.", "success");
      } catch (_error) {
        showFeedback("Clipboard access was unavailable. Use Download .txt or select the codes manually.", "error");
      }
      return;
    }
    if (button.id === "manage-recovery") {
      mode = "regenerate";
      render();
      return;
    }
    if (button.id === "account-signout") {
      setBusy(true);
      try {
        await requestJson("/api/account/logout", {});
        accountState = { authenticated: false };
        await refreshStatus();
        mode = "signin";
        recoveryCodes = [];
        render();
        showFeedback("Signed out of the test account.", "success");
      } catch (error) { showFeedback(error.message, "error"); }
      finally { setBusy(false); }
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

  setEnvironmentDisclosure();
  refreshStatus();
}());
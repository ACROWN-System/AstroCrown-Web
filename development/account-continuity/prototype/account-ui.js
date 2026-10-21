(function () {
  "use strict";

  var dialog = document.getElementById("account-dialog");
  var content = document.getElementById("account-content");
  var feedback = document.getElementById("account-feedback");
  var title = document.getElementById("account-dialog-title");
  var openButton = document.getElementById("open-account-dialog");
  var closeButton = document.getElementById("account-dialog-close");
  var menuStatus = document.getElementById("account-menu-status");
  var menuCopy = document.getElementById("account-menu-copy");
  var mode = "signin";
  var accountState = { authenticated: false };
  var recoveryCodes = [];
  var focusBeforeOpen = null;
  var busy = false;

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
      '<p class="account-provider-note">Local development only. Do not reuse a real or important password here. No account data is sent to AstroCrown servers; records are stored in a local database on this computer.</p>';
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
      '<p class="account-provider-note">Prototype data remains on this computer. The server binds to localhost and must not be exposed to a network. This is not production authentication.</p>';
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
  }

  async function refreshStatus() {
    try {
      accountState = await requestJson("/api/account/status");
      if (accountState.authenticated) {
        menuStatus.textContent = "Signed in";
        menuStatus.style.color = "#78e6b2";
        menuCopy.textContent = "Signed in as " + accountState.username + ". Open your local test account or sign out.";
      } else {
        menuStatus.textContent = "Not signed in";
        menuStatus.style.color = "";
        menuCopy.textContent = "Create a local test account or sign in. Ordinary account access does not need a crypto wallet.";
      }
      return accountState;
    } catch (_error) {
      accountState = { authenticated: false };
      menuStatus.textContent = "Local preview only";
      menuCopy.textContent = "Start the local account server to test account creation and sign-in. No provider or wallet is connected.";
      return accountState;
    }
  }

  async function openAccountDialog() {
    focusBeforeOpen = document.activeElement;
    var slot = openButton.closest(".menu-slot");
    if (slot) {
      slot.classList.remove("is-open");
      var trigger = slot.querySelector("[data-menu]");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    }
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
        showFeedback("Account created locally. Save your recovery codes now.", "success");
      } else if (form.id === "account-signin-form") {
        accountState = result;
        await refreshStatus();
        mode = "account";
        render();
        showFeedback("You are signed in to the local test account.", "success");
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
        showFeedback("Signed out of the local test account.", "success");
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

  refreshStatus();
}());
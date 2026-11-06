(function () {
  "use strict";

  var dialog = document.getElementById("account-dialog");
  var content = document.getElementById("account-content");
  var feedback = document.getElementById("account-feedback");
  var openButton = document.getElementById("open-account-dialog");
  var closeButton = document.getElementById("account-dialog-close");
  var dashboard = document.getElementById("account-dashboard");
  var dashboardContent = document.getElementById("account-dashboard-content");
  var adminDashboard = document.getElementById("admin-dashboard");
  var adminDashboardContent = document.getElementById("admin-dashboard-content");
  var mainContent = document.getElementById("main-content");
  var communicationsButton = document.getElementById("open-communications");
  var communicationsBadge = document.getElementById("communications-unread-count");
  var communicationsPage = document.getElementById("communications-page");
  var communicationsContent = document.getElementById("communications-content");
  var communicationsState = { items: [], unreadCounts: { alerts: 0, messages: 0 }, nextCursor: null };
  var activeCommunicationsSection = "alerts";
  var mode = "signin";
  var successKind = "signup";
  var recoveryKeyAcknowledged = false;
  var accountState = { authenticated: false };
  var accountSecurityData = null;
  var accountSecurityPendingPasskeyOptions = null;
  var securityRecoveryKeyPending = false;
  var focusBeforeOpen = null;
  var busy = false;
  var pendingAdminWalletMessage = null;
  var termsVersion = "development-terms-2026-10-31-v0.3";
  var loopbackHosts = ["localhost", "127.0.0.1", "::1"];
  var queryParams = new URLSearchParams(window.location.search);
  var forceBrowserDemo = queryParams.get("account-preview-demo") === "1";
  var liveTestHost = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.trycloudflare\.com$/i.test(window.location.hostname);
  var liveTestMode = queryParams.get("account-live-test") === "1" &&
    window.location.protocol === "https:" && liveTestHost;
  var browserPreviewMode = forceBrowserDemo ||
    (!liveTestMode && loopbackHosts.indexOf(window.location.hostname) === -1);
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

  function base64urlToArrayBuffer(value) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new Error("The passkey service returned an invalid challenge or credential identifier.");
    }
    var padded = value.replace(/-/g, "+").replace(/_/g, "/");
    while (padded.length % 4) padded += "=";
    var binary;
    try { binary = atob(padded); }
    catch (_error) { throw new Error("The passkey service returned invalid encoded data."); }
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  function arrayBufferToBase64url(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = "";
    for (var i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function webauthnOptionsFromJson(value) {
    var publicKey = Object.assign({}, value);
    publicKey.challenge = base64urlToArrayBuffer(publicKey.challenge);
    if (publicKey.user && typeof publicKey.user.id === "string") {
      publicKey.user = Object.assign({}, publicKey.user, {
        id: base64urlToArrayBuffer(publicKey.user.id)
      });
    }
    ["excludeCredentials", "allowCredentials"].forEach(function (name) {
      if (Array.isArray(publicKey[name])) {
        publicKey[name] = publicKey[name].map(function (item) {
          return Object.assign({}, item, { id: base64urlToArrayBuffer(item.id) });
        });
      }
    });
    return publicKey;
  }

  function serializeWebAuthnCredential(credential, registration) {
    if (!credential || !credential.response) {
      throw new Error("The authenticator returned an incomplete passkey response.");
    }
    if (typeof credential.toJSON === "function") return credential.toJSON();
    var response = credential.response;
    var serialized = {
      id: credential.id,
      rawId: arrayBufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: arrayBufferToBase64url(response.clientDataJSON)
      },
      clientExtensionResults: typeof credential.getClientExtensionResults === "function"
        ? credential.getClientExtensionResults() : {}
    };
    if (credential.authenticatorAttachment) {
      serialized.authenticatorAttachment = credential.authenticatorAttachment;
    }
    if (registration) {
      serialized.response.attestationObject = arrayBufferToBase64url(response.attestationObject);
      if (typeof response.getTransports === "function") {
        serialized.response.transports = response.getTransports();
      }
    } else {
      serialized.response.authenticatorData = arrayBufferToBase64url(response.authenticatorData);
      serialized.response.signature = arrayBufferToBase64url(response.signature);
      serialized.response.userHandle = response.userHandle
        ? arrayBufferToBase64url(response.userHandle) : null;
    }
    return serialized;
  }

  function ensurePasskeyContext() {
    if (browserPreviewMode) {
      throw new Error("This hosted HTML preview cannot create real accounts or passkeys. Start the local AstroCrown account server and open http://localhost:8766/ to test authentication.");
    }
    if (!window.isSecureContext || !navigator.credentials ||
        typeof navigator.credentials.create !== "function" ||
        typeof navigator.credentials.get !== "function" ||
        typeof PublicKeyCredential === "undefined") {
      throw new Error("This browser does not expose WebAuthn in a supported secure context. Use a current browser on localhost or the approved HTTPS site.");
    }
  }


  async function requestSecurityStepUp(purpose) {
    ensurePasskeyContext();
    var options = await requestJson("/api/account/security/step-up/options", { purpose: purpose });
    var credential;
    try {
      credential = await navigator.credentials.get({
        publicKey: webauthnOptionsFromJson(options.publicKey)
      });
    } catch (error) {
      if (error && error.name === "NotAllowedError") {
        throw new Error("Passkey verification was cancelled. No security change was made.");
      }
      throw new Error("The browser could not verify your passkey. No security change was made.");
    }
    if (!credential) throw new Error("Passkey verification was cancelled. No security change was made.");
    var verified = await requestJson("/api/account/security/step-up/verify", {
      challengeId: options.challengeId,
      credential: serializeWebAuthnCredential(credential, false)
    });
    if (verified.purpose !== purpose || typeof verified.stepUpToken !== "string") {
      throw new Error("The server did not return the expected one-use security authorization.");
    }
    return verified.stepUpToken;
  }

  async function prepareAnotherPasskey(label) {
    var stepUpToken = await requestSecurityStepUp("manage-passkeys");
    var options = await requestJson("/api/account/security/passkeys/add/options", {
      stepUpToken: stepUpToken,
      label: label
    });
    return {
      challengeId: options.challengeId,
      publicKey: options.publicKey,
      label: label,
      expiresInSeconds: Number(options.expiresInSeconds || 120)
    };
  }

  async function createPreparedPasskey() {
    if (!accountSecurityPendingPasskeyOptions) {
      throw new Error("Start the additional passkey verification again.");
    }
    ensurePasskeyContext();
    var pending = accountSecurityPendingPasskeyOptions;
    var creation;
    try {
      // Call WebAuthn immediately inside the user's second click; no network
      // request or other await is allowed before navigator.credentials.create.
      creation = navigator.credentials.create({
        publicKey: webauthnOptionsFromJson(pending.publicKey)
      });
    } catch (error) {
      throw new Error("The browser could not start the additional passkey ceremony. No credential was added.");
    }
    var credential;
    try {
      credential = await creation;
    } catch (error) {
      if (error && error.name === "NotAllowedError") {
        throw new Error("Additional passkey creation was cancelled or expired. No credential was added. Start again.");
      }
      throw new Error("The browser could not create the additional passkey. No credential was added.");
    }
    if (!credential) throw new Error("Additional passkey creation was cancelled. No credential was added.");
    return requestJson("/api/account/security/passkeys/add/verify", {
      challengeId: pending.challengeId,
      credential: serializeWebAuthnCredential(credential, true)
    });
  }

  async function renameAccountPasskey(passkeyRef, label) {
    var stepUpToken = await requestSecurityStepUp("manage-passkeys");
    return requestJson("/api/account/security/passkeys/rename", {
      stepUpToken: stepUpToken,
      passkeyRef: passkeyRef,
      label: label
    });
  }

  async function revokeAccountPasskey(passkeyRef) {
    var stepUpToken = await requestSecurityStepUp("manage-passkeys");
    return requestJson("/api/account/security/passkeys/revoke", {
      stepUpToken: stepUpToken,
      passkeyRef: passkeyRef
    });
  }

  async function revokeAccountSession(sessionRef) {
    var stepUpToken = await requestSecurityStepUp("manage-sessions");
    return requestJson("/api/account/security/sessions/revoke", {
      stepUpToken: stepUpToken,
      sessionRef: sessionRef
    });
  }

  async function revokeOtherAccountSessions() {
    var stepUpToken = await requestSecurityStepUp("manage-sessions");
    return requestJson("/api/account/security/sessions/revoke", {
      stepUpToken: stepUpToken,
      revokeOthers: true
    });
  }

  async function rotateOfflineRecoveryKey() {
    var stepUpToken = await requestSecurityStepUp("rotate-recovery-key");
    return requestJson("/api/account/security/recovery/rotate", {
      stepUpToken: stepUpToken
    });
  }

  function securityDateLabel(value) {
    if (!value) return "Not recorded";
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
  }

  function renderSecurityPanel(data) {
    var panel = document.getElementById("account-security-panel");
    if (!panel) return;
    var oneTimeKey = data && typeof data.oneTimeRecoveryKey === "string"
      ? data.oneTimeRecoveryKey : null;
    var safeData = Object.assign({}, data || {});
    delete safeData.oneTimeRecoveryKey;
    delete safeData.message;
    accountSecurityData = safeData;
    var passkeys = Array.isArray(safeData.passkeys) ? safeData.passkeys : [];
    var sessions = Array.isArray(safeData.sessions) ? safeData.sessions : [];
    var passkeyMarkup = passkeys.length ? passkeys.map(function (item) {
      var ref = escapeHtml(item.passkeyRef || "");
      var algorithm = Number(item.algorithm);
      var algorithmLabel = algorithm === -48 ? "ML-DSA-44 · COSE -48"
        : algorithm === -49 ? "ML-DSA-65 · COSE -49"
          : algorithm === -50 ? "ML-DSA-87 · COSE -50"
            : "COSE algorithm " + String(algorithm);
      return '<article class="account-security-item">' +
        '<div class="account-security-item-heading"><strong>' + escapeHtml(item.label || "Passkey") + '</strong>' +
        '<span>' + (item.postQuantum === true ? "Post-quantum credential algorithm" : "Credential algorithm recorded") + '</span></div>' +
        '<p>Added: ' + escapeHtml(securityDateLabel(item.createdAt)) + '</p>' +
        '<p>Last used: ' + escapeHtml(securityDateLabel(item.lastUsedAt)) + '</p>' +
        '<p>' + escapeHtml(algorithmLabel) + ' · Authenticator: ' + escapeHtml(item.deviceType || "unknown") +
        ' · Backup state: ' + (item.backedUp === true ? "reported backed up" : "not reported backed up") + '</p>' +
        '<label class="account-security-label-field">Passkey name' +
        '<input type="text" maxlength="40" value="' + escapeHtml(item.label || "Passkey") +
        '" data-passkey-label-input="' + ref + '"></label>' +
        '<div class="account-security-item-actions">' +
        '<button class="account-secondary" type="button" data-security-action="rename-passkey" data-passkey-ref="' + ref + '">Save name</button>' +
        '<button class="account-secondary" type="button" data-security-action="revoke-passkey" data-passkey-ref="' + ref +
        '"' + (passkeys.length <= 1 ? ' disabled data-original-disabled="true"' : "") + '>Revoke passkey</button>' +
        '</div></article>';
    }).join("") : '<p>No active passkeys were returned by the account service.</p>';
    var sessionMarkup = sessions.length ? sessions.map(function (item) {
      var ref = escapeHtml(item.sessionRef || "");
      return '<article class="account-security-item">' +
        '<strong>' + (item.isCurrent === true ? "Current browser session" : "Other sign-in session") + '</strong>' +
        '<p>Started: ' + escapeHtml(securityDateLabel(item.createdAt)) + '</p>' +
        '<p>Expires: ' + escapeHtml(securityDateLabel(item.expiresAt)) + '</p>' +
        (item.isCurrent === true ? '<span class="account-dashboard-status">This session remains active</span>' :
          '<button class="account-secondary" type="button" data-security-action="revoke-session" data-session-ref="' + ref + '">Revoke this session</button>') +
        '</article>';
    }).join("") : '<p>No active sign-in sessions were returned by the account service.</p>';
    panel.innerHTML =
      '<div class="account-security-panel-heading"><h3>Passkeys</h3><p>Private keys remain with your authenticators. Names are labels you control; AstroCrown does not need a device fingerprint.</p></div>' +
      '<div class="account-security-list">' + passkeyMarkup + '</div>' +
      '<div class="account-security-add">' +
        '<label class="account-security-label-field">Name for the additional passkey' +
        '<input id="account-security-new-passkey-label" type="text" maxlength="40" value="Additional passkey"></label>' +
        '<button class="account-primary" type="button" id="account-security-add-passkey">Verify existing passkey</button>' +
        '<div id="account-security-pending-passkey" class="account-security-pending-passkey" hidden>' +
          '<p>Your existing passkey was verified. Select the next button to open your authenticator and create the additional passkey.</p>' +
          '<button class="account-primary" type="button" id="account-security-create-passkey">Continue to create passkey</button>' +
          '<button class="account-secondary" type="button" id="account-security-cancel-passkey">Cancel</button>' +
        '</div>' +
      '</div>' +
      '<div class="account-security-panel-heading"><h3>Sign-in sessions</h3><p>Only session creation and expiry are shown. No IP address, location or device fingerprint is collected for this list.</p></div>' +
      '<div class="account-security-list">' + sessionMarkup + '</div>' +
      '<button class="account-secondary" type="button" id="account-security-revoke-others"' +
        (sessions.filter(function (item) { return item.isCurrent !== true; }).length === 0 ? ' disabled data-original-disabled="true"' : "") +
        '>Sign out all other sessions</button>' +
      '<div class="account-security-panel-heading"><h3>Offline recovery key</h3><p>' +
        (safeData.activeRecoveryKey === true ? "One unused recovery key is active." : "No unused recovery key is currently registered.") +
        ' Replacing it requires a fresh passkey verification. The new key is shown once.</p></div>' +
      '<button class="account-secondary" type="button" id="account-security-rotate-recovery-key">Replace offline recovery key</button>' +
      '<div id="account-security-recovery-output" class="account-security-recovery-output" hidden></div>' +
      '<p id="account-security-feedback" class="account-avatar-feedback" role="status" aria-live="polite"></p>' +
      '<p class="account-security-note">Each sensitive change requires a fresh passkey assertion. The authorization is short-lived, bound to this signed-in session, and accepted once.</p>';
    panel.hidden = false;
    if (oneTimeKey) {
      securityRecoveryKeyPending = true;
      var output = document.getElementById("account-security-recovery-output");
      if (output) {
        output.hidden = false;
        output.innerHTML =
          '<strong>Save this new recovery key offline now.</strong>' +
          '<p>The previous key has been invalidated. This replacement will not be displayed again after you close or acknowledge this notice.</p>' +
          '<textarea id="account-security-recovery-key-value" rows="2" readonly spellcheck="false">' + escapeHtml(oneTimeKey) + '</textarea>' +
          '<div class="account-security-item-actions">' +
          '<button class="account-secondary" type="button" data-security-action="copy-recovery-key">Copy recovery key</button>' +
          '<button class="account-primary" type="button" data-security-action="acknowledge-recovery-key">I have saved it offline</button>' +
          '</div>';
      }
    }
  }

  async function registerWithPasskey(payload) {
    ensurePasskeyContext();
    var options = await requestJson("/api/passkeys/register/options", payload);
    var credential;
    try {
      credential = await navigator.credentials.create({
        publicKey: webauthnOptionsFromJson(options.publicKey)
      });
    } catch (error) {
      if (error && error.name === "NotAllowedError") {
        throw new Error("Passkey creation was cancelled or not completed. No account was created.");
      }
      throw new Error("The browser could not create a passkey. No account was created.");
    }
    if (!credential) throw new Error("Passkey creation was cancelled. No account was created.");
    return requestJson("/api/passkeys/register/verify", {
      challengeId: options.challengeId,
      credential: serializeWebAuthnCredential(credential, true)
    });
  }

  async function signInWithPasskey() {
    ensurePasskeyContext();
    var options = await requestJson("/api/passkeys/authentication/options", {});
    var credential;
    try {
      credential = await navigator.credentials.get({
        publicKey: webauthnOptionsFromJson(options.publicKey)
      });
    } catch (error) {
      if (error && error.name === "NotAllowedError") {
        throw new Error("Passkey sign-in was cancelled or not completed.");
      }
      throw new Error("The browser could not complete passkey sign-in.");
    }
    if (!credential) throw new Error("Passkey sign-in was cancelled.");
    return requestJson("/api/passkeys/authentication/verify", {
      challengeId: options.challengeId,
      credential: serializeWebAuthnCredential(credential, false)
    });
  }

  async function recoverWithPasskey(payload) {
    ensurePasskeyContext();
    var options = await requestJson("/api/account/recovery/options", payload);
    var credential;
    try {
      credential = await navigator.credentials.create({
        publicKey: webauthnOptionsFromJson(options.publicKey)
      });
    } catch (error) {
      if (error && error.name === "NotAllowedError") {
        throw new Error("Passkey replacement was cancelled. The recovery key has not been consumed.");
      }
      throw new Error("The browser could not create the replacement passkey. The recovery key has not been consumed.");
    }
    if (!credential) {
      throw new Error("Passkey replacement was cancelled. The recovery key has not been consumed.");
    }
    return requestJson("/api/account/recovery/complete", {
      challengeId: options.challengeId,
      credential: serializeWebAuthnCredential(credential, true)
    });
  }

  async function finishPasskeyAuthentication(result, kind) {
    accountState = result;
    successKind = kind;
    recoveryKeyAcknowledged = false;
    syncAccountButton();

    // A returning member's first authenticated page is the shared User
    // dashboard. Only new registration/recovery pauses for the one-time
    // offline recovery-key acknowledgement below.
    if (kind === "signin") {
      mode = "signin";
      if (dialog.open) closeDialog();
      navigateToAccount();
      return;
    }

    mode = "success";
    render();
    var successAction = document.getElementById("open-account-hub");
    if (successAction) successAction.focus();
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
      throw new Error(liveTestMode ? "The temporary HTTPS test service is not responding. Restart the live-test runner." : "The local account prototype is not running. Start it with the documented local command.");
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

  async function browserPreviewRequest(path, payload) {
    if (path === "/api/account/status") {
      return {
        authenticated: false,
        avatarId: "person",
        role: "user",
        adminRoleAssigned: false,
        adminWalletAuthenticated: false,
        adminSessionAuthorized: false,
        admin: false,
        passkeyAvailable: false,
        activeSessionCount: 0,
        scope: "hosted-preview-no-authentication"
      };
    }
    if (path === "/api/account/logout") {
      return { authenticated: false, message: "No account session exists in this hosted preview." };
    }
    throw new Error(
      "The hosted HTML preview is a read-only interface demonstration. It cannot create accounts, store credentials or perform passkey authentication. Use the local loopback server for real WebAuthn tests."
    );
  }

  function setBusy(value) {
    busy = value;
    [content, dashboardContent, adminDashboardContent, communicationsContent].filter(Boolean).forEach(function (container) {
      Array.prototype.forEach.call(container.querySelectorAll("button, input"), function (element) {
        if (element.dataset.keepEnabled === "true") return;
        var recoveryAcknowledgementPending =
          element.id === "open-account-hub" &&
          (successKind === "signup" || successKind === "recovery") &&
          !recoveryKeyAcknowledged;
        element.disabled = value ||
          element.dataset.originalDisabled === "true" ||
          recoveryAcknowledgementPending;
      });
    });
  }

  function syncAccountButton() {
    if (!openButton) return;
    var authenticated = Boolean(accountState && accountState.authenticated === true);
    var counts = accountState && accountState.communicationsUnreadCounts || {};
    var unread = Math.max(0, Number(counts.alerts || 0)) + Math.max(0, Number(counts.messages || 0));
    if (communicationsBadge) {
      communicationsBadge.textContent = unread > 9 ? "9+" : String(unread);
      communicationsBadge.hidden = unread === 0;
    }
    if (communicationsButton) {
      communicationsButton.setAttribute(
        "aria-label",
        unread ? "Open Alerts and Messages, " + unread + " unread or unacknowledged" : "Open Alerts and Messages"
      );
      communicationsButton.setAttribute("title", unread ? unread + " pending communication(s)" : "Alerts and Messages");
    }
    if (authenticated) {
      var avatarId = normalizeAvatarId(accountState.avatarId);
      openButton.classList.add("is-authenticated");
      openButton.dataset.avatarId = avatarId;
      openButton.innerHTML = avatarSvg(avatarId, "account-avatar-trigger-svg");
      openButton.setAttribute("aria-label", "Open your AstroCrown account");
      openButton.setAttribute("title", "Open your AstroCrown account");
      openButton.setAttribute("aria-haspopup", "dialog");
      openButton.setAttribute("aria-controls", "account-dialog");
      return;
    }
    openButton.classList.remove("is-authenticated");
    openButton.removeAttribute("data-avatar-id");
    openButton.removeAttribute("title");
    openButton.setAttribute("aria-label", "Log In to AstroCrown");
    openButton.setAttribute("title", "Log In to AstroCrown");
    openButton.setAttribute("aria-haspopup", "dialog");
    openButton.setAttribute("aria-controls", "account-dialog");
    openButton.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">' +
        '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c.6-3.6 2.8-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/>' +
      '</svg><span>Log In</span>';
  }

  function renderTabs(selected) {
    return '<div class="account-tabs" role="tablist" aria-label="Account access">' +
      '<button type="button" class="account-tab" role="tab" data-account-mode="signin" aria-selected="' + (selected === "signin" ? "true" : "false") + '">Log In</button>' +
      '<button type="button" class="account-tab" role="tab" data-account-mode="create" aria-selected="' + (selected === "create" ? "true" : "false") + '">Sign Up</button>' +
      '</div>';
  }

  function renderDevelopmentNotice() {
    if (browserPreviewMode) return "";
    var noticeMode = liveTestMode ? "https-live-test" : "local-passkey-test";
    var noticeText = liveTestMode
      ? "TEMPORARY HTTPS LIVE TEST — Use only invented test details and a new passkey created for this temporary hostname. Never use production account data, personal recovery keys, wallet secrets or real assets. This is not a production service."
      : "LOCAL PASSKEY TEST — WebAuthn is verified by this computer's local AstroCrown server. No email, SMS or external identity provider is used. Not production authentication.";
    return '<p class="account-demo-notice" id="account-demo-notice" data-mode="' + noticeMode + '">' +
      noticeText + '</p>';
  }

  function renderSignIn() {
    content.innerHTML = renderTabs("signin") + renderDevelopmentNotice() +
      '<div class="account-form">' +
        '<button class="account-primary" type="button" id="account-passkey-signin"' +
          (browserPreviewMode ? ' disabled' : '') + '>Sign in with passkey</button>' +
        '<p class="account-signin-help"><a href="./account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">Why Passkeys?</a></p>' +
      '</div>' +
      '<div class="account-signin-divider" aria-hidden="true"></div>' +
      '<p class="account-signin-recovery"><button class="account-text-button" type="button" id="account-recovery-start">Lost your passkey? Use a recovery key</button></p>' +
      '<p class="account-signin-feedback"><a href="./account-continuity/prototype/cases.html">Feedback, grievances &amp; case access</a></p>';
  }

  function renderCreate() {
    content.innerHTML = renderTabs("create") + renderDevelopmentNotice() +
      '<p class="account-dialog-description">Create your account by registering a passkey. The private key stays with your authenticator.</p>' +
      '<form id="account-create-form" class="account-form" autocomplete="off">' +
        '<label class="account-field" for="account-referral-id">Referral ID (Optional)' +
          '<input id="account-referral-id" name="referralId" type="text" autocomplete="off" maxlength="64" autocapitalize="characters" spellcheck="false" placeholder="Enter referral ID...">' +
        '</label>' +
        '<label class="account-consent account-terms-consent" for="account-terms-accepted">' +
          '<input id="account-terms-accepted" name="termsAccepted" type="checkbox" required>' +
          '<span>By proceeding, you agree to AstroCrown’s <a href="./account-continuity/prototype/terms-of-use.html" target="_blank" rel="noopener noreferrer">Terms of Use</a> &amp; <a href="./account-continuity/prototype/privacy-policy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</span>' +
        '</label>' +
        '<p class="account-provider-note">Passkey registration requires a compatible authenticator and a supported browser. The passkey is tied to the verified AstroCrown site origin.</p>' +
        '<button class="account-primary" type="submit"' + (browserPreviewMode ? ' disabled' : '') + '>Create account with passkey</button>' +
      '</form>' +
      '<p class="account-security-assurance"><a href="./account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">Security assurance</a></p>';
  }

  function renderRecover() {
    content.innerHTML = renderDevelopmentNotice() +
      '<p class="account-dialog-description">Your offline recovery key is a one-time backup for regaining access if you lose your passkey. Enter your account identifier and the currently valid unused key you saved to register a replacement passkey.</p>' +
      '<form id="account-recovery-form" class="account-form" autocomplete="off">' +
        '<label class="account-field" for="account-recovery-identifier">Account identifier' +
          '<input id="account-recovery-identifier" name="accountIdentifier" type="text" required maxlength="32" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="AC-...">' +
        '</label>' +
        '<label class="account-field" for="account-recovery-secret">Offline recovery key' +
          '<input id="account-recovery-secret" name="recoveryKey" type="text" inputmode="text" required maxlength="64" autocomplete="off" spellcheck="false" placeholder="ACR1-...">' +
        '</label>' +
        '<p class="account-provider-note">The key is accepted once. After successful recovery, all previous passkeys and sessions are revoked and a new recovery key is issued for you to save offline.</p>' +
        '<button class="account-primary" type="submit" ' + (browserPreviewMode ? 'disabled' : '') + '>Verify recovery key and replace passkey</button>' +
        '<button class="account-text-button" type="button" data-account-mode="signin">Back to sign in</button>' +
      '</form>';
  }

  function renderSuccess() {
    var created = successKind === "signup";
    var recovered = successKind === "recovery";
    var needsRecoveryKeyAcknowledgement = created || recovered;
    var heading = created ? "Your passkey account is ready"
      : recovered ? "Your account has been recovered"
      : "You're signed in";
    var message = created
      ? "Your AstroCrown account was created using a passkey. Your authenticator keeps the private key; AstroCrown stores the public credential needed for verification."
      : recovered
        ? "Recovery succeeded. Your previous passkeys and active sessions were revoked. The old recovery key has been consumed."
        : "You are signed in to AstroCrown with your passkey. This local prototype does not grant production access or administrator privileges.";
    var persistenceNote = "You can close this window without signing out. The local server keeps your session until it expires or you sign out.";
    var recoveryKey = accountState && typeof accountState.oneTimeRecoveryKey === "string"
      ? accountState.oneTimeRecoveryKey : "";
    content.innerHTML =
      '<div class="account-success-panel">' +
        '<div class="account-success-mark" aria-hidden="true">✓</div>' +
        '<h3 class="account-success-heading">' + escapeHtml(heading) + '</h3>' +
        '<p class="account-success-copy">' + escapeHtml(message) + '</p>' +
        (needsRecoveryKeyAcknowledgement
          ? '<section class="account-recovery-key-panel">' +
              '<h3>Save your account identifier and offline recovery key</h3>' +
              '<p>Keep both items offline and separate from your passkey device. The account identifier is not a secret; the recovery key is a secret and can be used to replace your passkey.</p>' +
              '<label class="account-field" for="account-one-time-account-identifier">Account identifier' +
                '<input id="account-one-time-account-identifier" type="text" readonly spellcheck="false" autocomplete="off" value="' + escapeHtml(accountState.accountIdentifier || "") + '">' +
              '</label>' +
              '<button class="account-secondary" type="button" id="copy-account-identifier">Copy account identifier</button>' +
              '<label class="account-field" for="account-one-time-recovery-key">One-time recovery key' +
                '<input id="account-one-time-recovery-key" type="text" readonly spellcheck="false" autocomplete="off" value="' + escapeHtml(recoveryKey) + '">' +
              '</label>' +
              '<button class="account-secondary" type="button" id="copy-account-recovery-key">Copy recovery key</button>' +
              '<label class="account-consent account-recovery-key-ack" for="account-recovery-key-saved">' +
                '<input id="account-recovery-key-saved" type="checkbox">' +
                '<span>I have saved this recovery key somewhere secure and offline.</span>' +
              '</label>' +
              '<p class="account-provider-note">Do not share this key with AstroCrown staff, administrators, NOVA or anyone else. It will not be shown again.</p>' +
            '</section>'
          : '') +
        '<button class="account-primary" type="button" id="open-account-hub"' +
          (needsRecoveryKeyAcknowledgement ? ' disabled' : '') + '>Open your dashboard</button>' +
        '<p class="account-success-small">' + escapeHtml(persistenceNote) + '</p>' +
      '</div>';
  }

  function renderAccountDashboard() {
    if (!accountState || !accountState.authenticated) return;
    var identifier = escapeHtml(accountState.accountIdentifier || "AstroCrown member");
    var referral = accountState.referralId
      ? escapeHtml(accountState.referralId) + ' <span class="account-muted-inline">(unverified; no reward is applied)</span>'
      : 'Not supplied';
    var activeSessionCount = Math.max(1, Number(accountState.activeSessionCount || 1));
    var passkeyCount = Math.max(0, Number(accountState.passkeyCount || 0));
    var postQuantumPasskeyCount = Math.max(0, Number(accountState.postQuantumPasskeyCount || 0));
    var communicationCounts = accountState.communicationsUnreadCounts || {};
    var unreadCommunicationCount = Math.max(0, Number(communicationCounts.alerts || 0)) +
      Math.max(0, Number(communicationCounts.messages || 0));
    var adminCard = '';
    if (accountState.adminRoleAssigned === true) {
      var walletCount = Number(accountState.adminWalletCount || 0);
      var adminSessionVerified = accountState.adminSessionAuthorized === true;
      var adminWalletRecoveryRequired = accountState.adminWalletRecoveryRequired === true;
      var adminAccessStatus = adminSessionVerified
        ? "Wallet verified for this session"
        : adminWalletRecoveryRequired
          ? "Owner-authorized wallet recovery required"
          : walletCount > 0
            ? "Wallet verification required"
            : "No administrator wallet enrolled";
      var adminAccessDescription = adminSessionVerified
        ? "The server currently confirms a wallet-verified administrator session. Continue through the administrator access dialog to open the separate administrator dashboard."
        : adminWalletRecoveryRequired
          ? "All previously enrolled administrator wallets are now inactive. Your ordinary passkey account and User dashboard remain available, but signing in with a passkey or connecting a new wallet cannot restore administrator access. A separate owner-authorized recovery review is required; this staging interface does not offer a self-service reset."
          : walletCount > 0
            ? "This account has an administrator role assigned by the system. To continue, the server will recheck your account and ask you to choose one of the " +
              escapeHtml(String(walletCount)) +
              " registered administrator wallets, then review a one-time signature request. It is not a blockchain transaction."
            : "This existing account has been granted the administrator role, but has not enrolled an administrator wallet yet. The user-selected backup wallet and administrator wallet remain separate purposes.";
      adminCard =
        '<section class="account-dashboard-card account-admin-access-card">' +
          '<h2>Administrator access</h2>' +
          '<span class="account-dashboard-status">' + escapeHtml(adminAccessStatus) + '</span>' +
          '<p>' + adminAccessDescription + '</p>' +
          '<div class="account-admin-access-actions">' +
            '<button class="account-primary" type="button" id="account-admin-wallet-access"' +
              (adminWalletRecoveryRequired ? ' disabled title="Owner-authorized wallet recovery is required before administrator access can resume."' : '') +
              '>' + (adminWalletRecoveryRequired ? 'Administrator recovery required' : 'Open administrator dashboard') + '</button>' +
            (adminSessionVerified ? '<button class="account-secondary" type="button" id="end-admin-access">End admin access</button>' : '') +
          '</div>' +
          '<p id="account-admin-access-feedback" class="account-avatar-feedback" role="status" aria-live="polite"></p>' +
        '</section>';
    }
    var administratorRevocationNotice = '';
    var revocationNotice = accountState.administratorRevocationNotice;
    if (revocationNotice && typeof revocationNotice.noticeId === "string") {
      administratorRevocationNotice =
        '<section class="account-dashboard-notice account-admin-revocation-notice" role="status" aria-labelledby="admin-revocation-notice-title">' +
          '<strong id="admin-revocation-notice-title">Administrator privileges removed</strong>' +
          '<p>' + escapeHtml(revocationNotice.message || "Your administrator role and registered administrator wallets were revoked. Your ordinary account remains active.") + '</p>' +
          '<p><strong>Recorded reason:</strong> ' + escapeHtml(revocationNotice.reason || "No additional reason was recorded.") + '</p>' +
          '<p class="account-admin-revocation-date">Recorded: ' + escapeHtml(revocationNotice.createdAt || "Date unavailable") + '</p>' +
          '<p id="admin-revocation-notice-feedback" class="account-avatar-feedback" role="status" aria-live="polite"></p>' +
          '<button class="account-secondary" type="button" id="acknowledge-admin-revocation" data-notice-id="' + escapeHtml(revocationNotice.noticeId) + '">Acknowledge notice</button>' +
        '</section>';
    }
    dashboardContent.innerHTML =
      '<div class="account-dashboard-notice"><strong>Development User dashboard.</strong> This is the shared member workspace for ordinary users and administrators. Both use the same user-facing services and personal transaction rules; administrative work is handled in the separate Administrator dashboard. This local prototype tests account access and settings only. Transactions and the wider service catalog are not enabled. The passkey and recovery-key implementation remains a development prototype, not production authentication.</div>' +
      '<div class="account-dashboard-welcome">' +
        '<div class="account-dashboard-avatar account-avatar-' + normalizeAvatarId(accountState.avatarId) + '" aria-hidden="true">' +
          avatarSvg(accountState.avatarId, "account-dashboard-avatar-svg") +
        '</div>' +
        '<div class="account-dashboard-welcome-copy"><strong>' + identifier + '</strong><span>Signed in with passkey · local development account</span></div>' +
      '</div>' +
      '<div class="account-dashboard-grid">' +
        '<section class="account-dashboard-card account-communications-card"><h2>Alerts &amp; Messages</h2><p class="account-dashboard-value">' + String(unreadCommunicationCount) + ' pending</p><p>Important account alerts and private in-app messages are kept in one place, with separate sections and acknowledgement/read status.</p><button class="account-primary" type="button" id="open-account-communications">Open communications</button></section>' +
        '<section class="account-dashboard-card account-user-services-card"><h2>AstroCrown services</h2><p class="account-dashboard-value">Shared member workspace</p><p>Regular users and administrators use the same user-facing AstroCrown services here. Personal activity and transactions belong to this User dashboard and remain subject to the same member rules for every account.</p><p>Transaction workflows and other service modules are not enabled in this account prototype.</p></section>' +
        '<section class="account-dashboard-card account-profile-card"><h2>Profile &amp; avatar</h2><p class="account-dashboard-value">Account created: ' + escapeHtml(accountState.createdAt || "Recorded in test state") + '</p><p>Choose from built-in AstroCrown avatars. No image upload or external image service is used.</p><div id="account-avatar-picker" class="account-avatar-picker" role="group" aria-label="Choose account avatar">' + renderAvatarChoices(accountState.avatarId) + '</div><p id="account-avatar-feedback" class="account-avatar-feedback" role="status">Your selected avatar appears here and in the circular header control.</p></section>' +
        '<section class="account-dashboard-card"><h2>Security &amp; sign-in</h2>' +
          '<span class="account-dashboard-status">WebAuthn passkey authentication</span>' +
          '<p class="account-dashboard-value">Registered passkeys: ' + String(passkeyCount) + '</p>' +
          '<p class="account-dashboard-value">Post-quantum ML-DSA passkeys: ' + String(postQuantumPasskeyCount) + '</p>' +
          '<p>' + (postQuantumPasskeyCount > 0
            ? 'At least one active credential is recorded with an ML-DSA public-key algorithm. This confirms the credential type stored by this local prototype; it is not FIDO certification or a complete post-quantum security claim.'
            : 'ML-DSA algorithms are offered first during registration. The current authenticator did not register an ML-DSA credential, or an older credential has no algorithm record. Existing passkeys remain usable through compatible algorithms.') + '</p>' +
          '<p>The authenticator keeps your private key. AstroCrown verifies a fresh challenge using the registered public credential. No email, password, SMS or external identity provider is used for this account sign-in.</p>' +
          '<p class="account-session-count">Active sign-in sessions: ' + String(activeSessionCount) + '.</p>' +
          (accountState.securityManagementAvailable === true
            ? '<p>Manage registered passkeys, sign-in sessions and the offline recovery key. Sensitive changes require a fresh passkey verification.</p><button class="account-primary" type="button" id="account-security-manage">Manage account security</button><div id="account-security-panel" class="account-security-panel" hidden></div>'
            : '<p>Detailed passkey and session management is not available in this account backend yet. Do not rely on this prototype for real assets.</p>') +
          '<p id="account-session-feedback" class="account-avatar-feedback" role="status" aria-live="polite"></p>' +
          '<a href="./account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">Read security assurance</a></section>' +
        '<section class="account-dashboard-card"><h2>Optional wallet backup</h2><p class="account-dashboard-value">Not required</p><p>A user-controlled wallet may be enrolled as an additional authenticator in a later implementation. Ordinary account access does not require a wallet, balance, deposit or blockchain transaction.</p></section>' +
        '<section class="account-dashboard-card"><h2>Account recovery</h2>' +
          '<p class="account-dashboard-value">' + (accountState.recoveryKeyAvailable === true ? 'One-time offline recovery key is active' : 'No active recovery key is registered') + '</p>' +
          '<p>Your recovery key is displayed only when first issued or replaced after recovery. AstroCrown stores only a salted one-way verifier. Keep the key and account identifier offline; loss of all passkeys and the key can mean permanent account loss.</p>' +
          '</section>' +
        '<section class="account-dashboard-card"><h2>Referral ID</h2><p class="account-dashboard-value">' + referral + '</p><p>Referral values are not verified and do not trigger rewards or benefits in this prototype.</p></section>' +
        '<section class="account-dashboard-card"><h2>Account data</h2><p>Email address and phone number are not collected for account authentication. Terms acceptance is recorded by the local test backend.</p></section>' +
        '<section class="account-dashboard-card"><h2>Feedback &amp; case access</h2><p>Submit a suggestion or grievance, follow case updates, or recover case access independently of your account.</p><a href="./account-continuity/prototype/cases.html">Open feedback &amp; case portal</a></section>' +
        adminCard +
      '</div>' +
      '<div class="account-dashboard-actions"><p>Administrator functions remain separately gated. Your account passkey does not itself grant administrator privileges.</p><button class="account-secondary" type="button" id="account-signout">Sign out</button></div>';
    if (pendingAdminWalletMessage) {
      var walletNotice = document.createElement("p");
      walletNotice.className = "account-dashboard-notice";
      walletNotice.setAttribute("role", "status");
      walletNotice.textContent = pendingAdminWalletMessage;
      dashboardContent.prepend(walletNotice);
      pendingAdminWalletMessage = null;
    }
  }

  function showHomepage() {
    dashboard.hidden = true;
    if (adminDashboard) adminDashboard.hidden = true;
    if (communicationsPage) communicationsPage.hidden = true;
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
    if (adminDashboard) adminDashboard.hidden = true;
    if (communicationsPage) communicationsPage.hidden = true;
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


  function renderCommunicationsPage() {
    if (!communicationsContent) return;
    var items = Array.isArray(communicationsState.items) ? communicationsState.items : [];
    var counts = communicationsState.unreadCounts || {};
    var sectionItems = items.filter(function (item) {
      return item.section === activeCommunicationsSection;
    });
    var isAlerts = activeCommunicationsSection === "alerts";
    var tabHtml =
      '<div class="communications-tabs" role="tablist" aria-label="Communication destination">' +
        '<button class="communications-tab" type="button" role="tab" data-communication-section="alerts" aria-selected="' + (isAlerts ? "true" : "false") + '">Alerts <span>' + String(Number(counts.alerts || 0)) + '</span></button>' +
        '<button class="communications-tab" type="button" role="tab" data-communication-section="messages" aria-selected="' + (!isAlerts ? "true" : "false") + '">Messages <span>' + String(Number(counts.messages || 0)) + '</span></button>' +
      '</div>';
    var itemsHtml = sectionItems.length ? sectionItems.map(function (item) {
      var body = escapeHtml(item.body || "").replace(/\n/g, "<br>");
      var status = isAlerts
        ? (item.acknowledgedAt ? "Acknowledged" : "Acknowledgement required")
        : (item.readAt ? "Read" : "Unread");
      var action = isAlerts
        ? (item.acknowledgedAt ? '<span class="communication-state is-complete">Acknowledged</span>' :
          '<button class="account-primary" type="button" data-communication-action="acknowledge" data-communication-id="' + escapeHtml(item.communicationId) + '">Acknowledge alert</button>')
        : (item.readAt ? '<span class="communication-state is-complete">Read</span>' :
          '<button class="account-secondary" type="button" data-communication-action="read" data-communication-id="' + escapeHtml(item.communicationId) + '">Mark as read</button>');
      return '<article class="communication-item ' + (isAlerts ? 'is-alert' : 'is-message') + (status === "Unread" || status === "Acknowledgement required" ? ' is-unread' : '') + '">' +
        '<div class="communication-item-header"><div><span class="communication-type">' + (isAlerts ? 'Alert' : 'Message') + '</span><h2>' + escapeHtml(item.subject || "Untitled communication") + '</h2></div><span class="communication-state-label">' + status + '</span></div>' +
        '<div class="communication-body">' + body + '</div>' +
        '<div class="communication-meta"><span>From: ' + escapeHtml(item.senderAccountIdentifier || "AstroCrown") + '</span><time>' + escapeHtml(item.createdAt || "") + '</time></div>' +
        '<div class="communication-actions">' + action + '</div>' +
      '</article>';
    }).join("") : '<div class="communication-empty"><strong>No ' + (isAlerts ? 'alerts' : 'messages') + ' yet.</strong><p>' + (isAlerts ? 'Important account and service notices will appear here.' : 'Private in-app messages sent to this account will appear here.') + '</p></div>';
    communicationsContent.innerHTML =
      tabHtml +
      '<div class="communications-list" aria-live="polite">' + itemsHtml + '</div>' +
      (communicationsState.nextCursor
        ? '<div class="communications-load-older"><button class="account-secondary" type="button" data-communications-load-older="true">Load older ' + (isAlerts ? 'Alerts' : 'Messages') + '</button></div>'
        : '') +
      '<p id="communications-feedback" class="account-avatar-feedback" role="status" aria-live="polite"></p>';
  }

  async function loadCommunicationsPage(section, cursor, append) {
    var previousItems = Array.isArray(communicationsState.items) ? communicationsState.items : [];
    var page = await requestJson("/api/account/communications/page", {
      section: section,
      cursor: cursor || null
    });
    if (append) page.items = previousItems.concat(page.items || []);
    communicationsState = page;
    accountState.communicationsUnreadCounts = page.unreadCounts || { alerts: 0, messages: 0 };
    syncAccountButton();
    renderCommunicationsPage();
  }

  async function showCommunicationsPage() {
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
    dashboard.hidden = true;
    if (adminDashboard) adminDashboard.hidden = true;
    if (communicationsPage) communicationsPage.hidden = false;
    activeCommunicationsSection = "alerts";
    try {
      await loadCommunicationsPage("alerts", null, false);
    } catch (error) {
      communicationsContent.innerHTML =
        '<div class="communication-empty"><strong>Communications could not be loaded.</strong><p>' +
        escapeHtml(error.message || "Refresh the page and try again.") + '</p></div>';
    }
    var communicationsTitle = document.getElementById("communications-title");
    if (communicationsTitle) communicationsTitle.focus();
  }

  function replaceRouteHash(route) {
    var suffix = route ? "#" + route : "";
    window.history.replaceState(null, "", window.location.pathname + window.location.search + suffix);
  }

  function renderAdminDashboard(status, walletOptions) {
    var wallet = escapeHtml(status.adminWalletAddress || "");
    var expires = escapeHtml(status.adminSessionExpiresAt || "");
    var registeredWallets = Array.isArray(walletOptions && walletOptions.wallets)
      ? walletOptions.wallets : [];
    var adminPermissions = Array.isArray(status.adminPermissions) ? status.adminPermissions : [];
    var delegablePermissions = Array.isArray(status.adminDelegablePermissions)
      ? status.adminDelegablePermissions : [];
    var roleManagementCard = "";
    var communicationComposer = "";
    if (adminPermissions.indexOf("admin.roles.grant") >= 0) {
      var permissionLabels = {
        "admin.roles.grant": "May appoint other administrators",
        "admin.roles.revoke": "May revoke administrator roles",
        "admin.messages.send": "May send private Messages and Alerts"
      };
      var permissionChoices = delegablePermissions.filter(function (permission) {
        return Object.prototype.hasOwnProperty.call(permissionLabels, permission);
      }).map(function (permission) {
        return '<label class="account-admin-permission-option"><input type="checkbox" name="admin-role-permission" value="' +
          permission + '"><span>' + permissionLabels[permission] + '</span></label>';
      }).join("");
      roleManagementCard +=
        '<section class="account-dashboard-card account-admin-role-management">' +
          '<h2>Appoint an administrator</h2>' +
          '<p>Grant the role to an existing AstroCrown user account. The target keeps the same User dashboard and must enrol a wallet they personally control. Use the account identifier shown in that member\'s User dashboard; it is a reference only, not an authenticator. No email, wallet address, passkey credential ID, password or private key is requested.</p>' +
          '<label class="account-admin-role-field" for="admin-role-grant-account-identifier">Existing member account identifier<input id="admin-role-grant-account-identifier" type="text" maxlength="13" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="AC-…" required></label>' +
          '<label class="account-admin-role-field" for="admin-role-grant-reason">Reason for appointment<input id="admin-role-grant-reason" type="text" maxlength="500" minlength="12" required></label>' +
          (permissionChoices
            ? '<div class="account-admin-permission-list"><p>Optional permissions you are explicitly allowed to delegate:</p>' + permissionChoices + '</div>'
            : '<p class="account-admin-role-hint">You may grant the Administrator role, but no additional permissions are marked as delegable to you.</p>') +
          '<button class="account-primary" type="button" id="admin-role-grant">Grant administrator role</button>' +
          '<p id="admin-role-grant-feedback" class="account-avatar-feedback" role="status" aria-live="polite"></p>' +
        '</section>';
    }
    if (adminPermissions.indexOf("admin.roles.revoke") >= 0) {
      roleManagementCard +=
        '<section class="account-dashboard-card account-admin-role-management">' +
          '<h2>Revoke administrator access</h2>' +
          '<p>Revocation removes the administrator role, delegated permissions and enrolled administrator wallets. The person keeps their ordinary AstroCrown account and User dashboard. Enter the account identifier shown in that member\'s User dashboard.</p>' +
          '<label class="account-admin-role-field" for="admin-role-revoke-account-identifier">Administrator account identifier<input id="admin-role-revoke-account-identifier" type="text" maxlength="13" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="AC-…" required></label>' +
          '<label class="account-admin-role-field" for="admin-role-revoke-reason">Reason for revocation<input id="admin-role-revoke-reason" type="text" maxlength="500" minlength="12" required></label>' +
          '<button class="account-secondary" type="button" id="admin-role-revoke">Revoke administrator role</button>' +
          '<p id="admin-role-revoke-feedback" class="account-avatar-feedback" role="status" aria-live="polite"></p>' +
        '</section>';
    }
    if (adminPermissions.indexOf("admin.messages.send") >= 0) {
      communicationComposer =
        '<section class="account-dashboard-card admin-communication-composer">' +
          '<h2>Send a private communication</h2>' +
          '<p>Choose the destination yourself. Alerts are important notices that require acknowledgement; Messages are ordinary private correspondence marked as read. Each send has one recipient and stays inside AstroCrown.</p>' +
          '<label class="account-admin-role-field" for="admin-communication-recipient">Recipient Account Identifier<input id="admin-communication-recipient" type="text" maxlength="13" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="AC-…" required></label>' +
          '<label class="account-admin-role-field" for="admin-communication-section">Destination<select id="admin-communication-section"><option value="messages">Messages</option><option value="alerts">Alerts</option></select></label>' +
          '<label class="account-admin-role-field" for="admin-communication-subject">Subject<input id="admin-communication-subject" type="text" maxlength="120" required></label>' +
          '<label class="account-admin-role-field" for="admin-communication-body">Message<textarea id="admin-communication-body" rows="5" maxlength="4000" required></textarea></label>' +
          '<button class="account-primary" type="button" id="admin-communication-send">Send communication</button>' +
          '<p id="admin-communication-feedback" class="account-avatar-feedback" role="status" aria-live="polite"></p>' +
        '</section>';
    }
    var walletRows = registeredWallets.map(function (item) {
      var revokeButton = registeredWallets.length > 1
        ? '<button class="account-secondary" type="button" data-admin-wallet-revoke="true" data-wallet-address="' +
          escapeHtml(item.address || "") + '" data-wallet-chain-id="' +
          escapeHtml(String(item.chainId)) + '" aria-label="Revoke administrator wallet ' +
          escapeHtml(item.address || "") + '">Revoke wallet</button>'
        : '<span class="account-admin-wallet-limit">Keep at least one active administrator wallet.</span>';
      return '<li class="account-admin-wallet-row"><span class="account-wallet-address">' +
        escapeHtml(item.address || "") + '</span><span class="account-admin-wallet-chain">Chain ID ' +
        escapeHtml(String(item.chainId)) + '</span>' + revokeButton + '</li>';
    }).join("");
    var enrollmentControl = registeredWallets.length < 3
      ? '<button class="account-primary" type="button" id="admin-add-wallet">Add another wallet</button>'
      : '<p class="account-admin-wallet-limit">Three active wallets are registered. The prototype does not permit a fourth wallet.</p>';
    adminDashboardContent.innerHTML =
      '<div class="account-dashboard-notice"><strong>Restricted Administrator dashboard.</strong> This workspace is separate from the shared User dashboard. The backend verified the assigned role and an enrolled-wallet signature for a short-lived session. Only explicitly granted operations are available; publishing, payments and all-wallet-loss recovery remain disabled.</div>' +
      '<div class="account-dashboard-welcome">' +
        '<div class="account-dashboard-avatar account-avatar-shield" aria-hidden="true">' + avatarSvg("shield", "account-dashboard-avatar-svg") + '</div>' +
        '<div class="account-dashboard-welcome-copy"><strong>Administrator access verified</strong><span>Backend-authorized · development prototype · no production privileges</span></div>' +
      '</div>' +
      '<div class="account-dashboard-grid">' +
        '<section class="account-dashboard-card"><h2>Authority</h2><p class="account-dashboard-value">Role: Administrator</p><p>Role assignment is stored by the server and is separate from the wallet signature. A connected wallet alone cannot create this role.</p></section>' +
        '<section class="account-dashboard-card"><h2>Verified wallet</h2><p class="account-dashboard-value account-wallet-address">' + wallet + '</p><p>Only the public address is shown. No private key, seed phrase or transaction is requested by this prototype.</p></section>' +
        '<section class="account-dashboard-card"><h2>Session expiration</h2><p class="account-dashboard-value">' + expires + '</p><p>Administrator step-up expires after ten minutes or when the underlying account session expires, whichever happens first.</p></section>' +
        '<section class="account-dashboard-card account-admin-wallets-card"><h2>Registered administrator wallets</h2><p>This account may register up to three distinct EVM wallet addresses. A wallet is not added until it signs a separate server-issued enrollment message. Revoke a lost or no-longer-authorized wallet below.</p>' +
          '<ul class="account-admin-wallet-list">' + walletRows + '</ul>' +
          enrollmentControl +
          '<p class="account-admin-wallet-warning">Enrollment ends the current administrator step-up. You must verify a registered wallet again before reopening this dashboard. Revoked wallet addresses cannot be enrolled again. Losing every enrolled wallet requires a separately authorized recovery process that is not yet implemented.</p>' +
          '<p id="admin-wallet-enrollment-feedback" class="account-avatar-feedback" role="status" aria-live="polite"></p></section>' +
        '<section class="account-dashboard-card"><h2>Other operations</h2><p class="account-dashboard-value">Not enabled</p><p>Banner publishing, account-wide management, payments and all-wallet-loss recovery are not available in this console. Administrator appointment and revocation are shown separately only when the server confirms their corresponding permissions.</p><a href="./account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">Read security assurance</a></section>' +
        roleManagementCard +
        communicationComposer +
      '</div>' +
      '<div class="account-dashboard-actions"><p>End administrator access to clear wallet step-up while keeping your ordinary account session active.</p><button class="account-secondary" type="button" id="admin-end-access">End administrator access</button></div>';
  }

  async function showAdminDashboard() {
    var accountStatus = await refreshStatus();
    if (!accountStatus.authenticated) {
      replaceRouteHash("account");
      await showAccountDashboard();
      return;
    }
    if (accountStatus.adminRoleAssigned !== true || accountStatus.adminSessionAuthorized !== true) {
      replaceRouteHash("account");
      await showAccountDashboard();
      if (accountStatus.adminRoleAssigned === true) {
        var accessFeedback = document.getElementById("account-admin-access-feedback");
        if (accessFeedback) accessFeedback.textContent = "Administrator entry was blocked because the server has no active wallet verification for this session.";
      } else {
        var notice = document.createElement("p");
        notice.className = "account-dashboard-notice";
        notice.setAttribute("role", "status");
        notice.textContent = "This account has no administrator role. Connecting a wallet cannot grant administrator privileges.";
        dashboardContent.prepend(notice);
      }
      return;
    }
    try {
      var verified = await requestJson("/api/admin/status");
      if (verified.adminSessionAuthorized !== true || verified.admin !== true) {
        throw new Error("The backend did not confirm administrator access.");
      }
      var walletOptions = await requestJson("/api/admin/wallet-options");
      if (!Array.isArray(walletOptions.wallets) || walletOptions.wallets.length > 3) {
        throw new Error("The backend returned an invalid administrator wallet registry.");
      }
      accountState = verified;
      syncAccountButton();
      mainContent.hidden = true;
      dashboard.hidden = true;
      if (communicationsPage) communicationsPage.hidden = true;
      adminDashboard.hidden = false;
      renderAdminDashboard(verified, walletOptions);
      var adminTitle = document.getElementById("admin-dashboard-title");
      if (adminTitle) adminTitle.focus();
    } catch (_error) {
      replaceRouteHash("account");
      await showAccountDashboard();
      var feedback = document.getElementById("account-admin-access-feedback");
      if (feedback) feedback.textContent = "Administrator access could not be verified. The dashboard remains closed.";
    }
  }

  async function handleRouteChange() {
    if (window.location.hash === "#account") {
      await showAccountDashboard();
    } else if (window.location.hash === "#communications") {
      await showCommunicationsPage();
    } else if (window.location.hash === "#admin") {
      await showAdminDashboard();
    } else {
      showHomepage();
    }
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
    if (mode === "success" && successKind !== "signin" && !recoveryKeyAcknowledged) {
      showFeedback("Save the one-time offline recovery key and confirm before closing this screen.", "error");
      return;
    }
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

    if (form.id === "account-create-form") {
      var termsInput = form.elements.namedItem("termsAccepted");
      var termsAccepted = Boolean(termsInput && termsInput.checked);
      if (!termsAccepted) {
        showFeedback("Accept the Terms of Use and Privacy Policy to create an account.", "error");
        if (termsInput) termsInput.focus();
        return;
      }
      setBusy(true);
      try {
        var result = await registerWithPasskey({
          referralId: formValue(form, "referralId"),
          termsAccepted: true,
          termsVersion: termsVersion
        });
        await finishPasskeyAuthentication(result, "signup");
      } catch (error) {
        showFeedback(error.message || "Passkey account creation could not be completed.", "error");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (form.id === "account-recovery-form") {
      var accountIdentifier = formValue(form, "accountIdentifier").trim();
      var recoveryKey = formValue(form, "recoveryKey").trim();
      if (!accountIdentifier || !recoveryKey) {
        showFeedback("Enter both your account identifier and offline recovery key.", "error");
        return;
      }
      setBusy(true);
      try {
        var recovered = await recoverWithPasskey({
          accountIdentifier: accountIdentifier,
          recoveryKey: recoveryKey
        });
        await finishPasskeyAuthentication(recovered, "recovery");
      } catch (error) {
        showFeedback(error.message || "Account recovery could not be completed.", "error");
      } finally {
        setBusy(false);
      }
    }
  });

  content.addEventListener("change", function (event) {
    if (event.target && event.target.id === "account-recovery-key-saved") {
      recoveryKeyAcknowledged = event.target.checked === true;
      var openButton = document.getElementById("open-account-hub");
      if (openButton) openButton.disabled = !recoveryKeyAcknowledged;
    }
  });

  content.addEventListener("click", async function (event) {
    var button = event.target.closest("button");
    if (!button || busy) return;
    if (button.dataset.accountMode) {
      setMode(button.dataset.accountMode);
      return;
    }
    if (button.id === "account-passkey-signin") {
      setBusy(true);
      try {
        var signInResult = await signInWithPasskey();
        await finishPasskeyAuthentication(signInResult, "signin");
      } catch (error) {
        showFeedback(error.message || "Passkey sign-in could not be completed.", "error");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.id === "account-recovery-start") {
      setMode("recover");
      var recoveryIdentifier = document.getElementById("account-recovery-identifier");
      if (recoveryIdentifier) recoveryIdentifier.focus();
      return;
    }
    if (button.id === "copy-account-identifier" || button.id === "copy-account-recovery-key") {
      var isRecoveryKey = button.id === "copy-account-recovery-key";
      var keyField = document.getElementById(
        isRecoveryKey ? "account-one-time-recovery-key" : "account-one-time-account-identifier"
      );
      if (!keyField) return;
      keyField.focus();
      keyField.select();
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
          await navigator.clipboard.writeText(keyField.value);
          showFeedback(
            isRecoveryKey ? "Recovery key copied. Store it offline and do not share it."
              : "Account identifier copied. Keep it with your offline recovery record.",
            "success"
          );
        } catch (_error) {
          showFeedback("The value is selected. Copy it manually and keep it offline.", "info");
        }
      } else {
        showFeedback("The value is selected. Copy it manually and keep it offline.", "info");
      }
      return;
    }
    if (button.id === "open-account-hub") {
      if ((successKind === "signup" || successKind === "recovery") && !recoveryKeyAcknowledged) {
        showFeedback("Confirm that you saved the offline recovery key before continuing.", "error");
        return;
      }
      delete accountState.oneTimeRecoveryKey;
      closeDialog();
      recoveryKeyAcknowledged = false;
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
    if (securityRecoveryKeyPending && button.dataset.securityAction !== "copy-recovery-key" &&
        button.dataset.securityAction !== "acknowledge-recovery-key") {
      var pendingFeedback = document.getElementById("account-security-feedback");
      if (pendingFeedback) pendingFeedback.textContent = "Save and acknowledge the one-time recovery key before making another security change.";
      return;
    }
    if (button.id === "account-security-manage") {
      var panel = document.getElementById("account-security-panel");
      if (!panel) return;
      panel.hidden = false;
      panel.textContent = "Loading account security information…";
      setBusy(true);
      try {
        var securityData = await requestJson("/api/account/security");
        renderSecurityPanel(securityData);
      } catch (error) {
        panel.textContent = error.message || "Account security information could not be loaded.";
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.id === "account-security-add-passkey") {
      var newPasskeyLabel = document.getElementById("account-security-new-passkey-label");
      var labelValue = newPasskeyLabel ? newPasskeyLabel.value.trim() : "";
      if (!labelValue || labelValue.length > 40) {
        var addFeedbackInvalid = document.getElementById("account-security-feedback");
        if (addFeedbackInvalid) addFeedbackInvalid.textContent = "Enter a passkey name between 1 and 40 characters.";
        return;
      }
      setBusy(true);
      try {
        accountSecurityPendingPasskeyOptions = await prepareAnotherPasskey(labelValue);
        var pendingPasskeyPanel = document.getElementById("account-security-pending-passkey");
        if (pendingPasskeyPanel) pendingPasskeyPanel.hidden = false;
        var addFeedback = document.getElementById("account-security-feedback");
        if (addFeedback) addFeedback.textContent = "Passkey step-up verified. Continue with the second button to open your authenticator.";
      } catch (error) {
        accountSecurityPendingPasskeyOptions = null;
        var addErrorFeedback = document.getElementById("account-security-feedback");
        if (addErrorFeedback) addErrorFeedback.textContent = error.message || "The additional passkey could not be prepared.";
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.id === "account-security-create-passkey") {
      setBusy(true);
      try {
        var addedPasskeyData = await createPreparedPasskey();
        accountSecurityPendingPasskeyOptions = null;
        renderSecurityPanel(addedPasskeyData);
        var addFeedback = document.getElementById("account-security-feedback");
        if (addFeedback) addFeedback.textContent = "The additional passkey was added to this account.";
      } catch (error) {
        var addErrorFeedback = document.getElementById("account-security-feedback");
        if (addErrorFeedback) addErrorFeedback.textContent = error.message || "The additional passkey could not be added.";
        accountSecurityPendingPasskeyOptions = null;
        var pendingPasskeyPanel = document.getElementById("account-security-pending-passkey");
        if (pendingPasskeyPanel) pendingPasskeyPanel.hidden = true;
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.id === "account-security-cancel-passkey") {
      accountSecurityPendingPasskeyOptions = null;
      var pendingPasskeyPanel = document.getElementById("account-security-pending-passkey");
      if (pendingPasskeyPanel) pendingPasskeyPanel.hidden = true;
      var addFeedback = document.getElementById("account-security-feedback");
      if (addFeedback) addFeedback.textContent = "Additional passkey registration cancelled. No credential was added.";
      return;
    }
    if (button.id === "account-security-rotate-recovery-key") {
      setBusy(true);
      try {
        var rotatedRecoveryData = await rotateOfflineRecoveryKey();
        renderSecurityPanel(rotatedRecoveryData);
      } catch (error) {
        var rotateFeedback = document.getElementById("account-security-feedback");
        if (rotateFeedback) rotateFeedback.textContent = error.message || "The offline recovery key could not be replaced.";
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.id === "account-security-revoke-others") {
      if (!window.confirm("Sign out every other active session for this account? The current browser session will remain active.")) return;
      setBusy(true);
      try {
        var sessionsResult = await revokeOtherAccountSessions();
        renderSecurityPanel(sessionsResult);
        var sessionFeedback = document.getElementById("account-security-feedback");
        if (sessionFeedback) sessionFeedback.textContent = "Other active sessions have been revoked. This browser session remains active.";
      } catch (error) {
        var sessionErrorFeedback = document.getElementById("account-security-feedback");
        if (sessionErrorFeedback) sessionErrorFeedback.textContent = error.message || "Other sessions could not be revoked.";
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.dataset.securityAction === "rename-passkey") {
      var passkeyRef = button.dataset.passkeyRef;
      var labelInput = dashboardContent.querySelector('input[data-passkey-label-input="' + passkeyRef + '"]');
      var nextLabel = labelInput ? labelInput.value.trim() : "";
      if (!nextLabel || nextLabel.length > 40) {
        var renameInvalid = document.getElementById("account-security-feedback");
        if (renameInvalid) renameInvalid.textContent = "Enter a passkey name between 1 and 40 characters.";
        return;
      }
      setBusy(true);
      try {
        var renamed = await renameAccountPasskey(passkeyRef, nextLabel);
        renderSecurityPanel(renamed);
        var renameFeedback = document.getElementById("account-security-feedback");
        if (renameFeedback) renameFeedback.textContent = "Passkey name updated.";
      } catch (error) {
        var renameError = document.getElementById("account-security-feedback");
        if (renameError) renameError.textContent = error.message || "The passkey name could not be updated.";
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.dataset.securityAction === "revoke-passkey") {
      if (!window.confirm("Revoke this passkey? It will no longer be able to sign in. Keep at least one usable passkey on the account.")) return;
      setBusy(true);
      try {
        var revokedPasskey = await revokeAccountPasskey(button.dataset.passkeyRef);
        if (revokedPasskey.sessionRevoked === true) {
          securityRecoveryKeyPending = false;
          accountSecurityData = null;
          accountState = { authenticated: false };
          await refreshStatus();
          mode = "signin";
          render();
          showFeedback(
            revokedPasskey.message || "The passkey was revoked and this session was ended. Sign in with another active passkey.",
            "success"
          );
          return;
        }
        renderSecurityPanel(revokedPasskey);
        var revokeFeedback = document.getElementById("account-security-feedback");
        if (revokeFeedback) revokeFeedback.textContent = "The selected passkey was revoked. Sessions established by that passkey were also ended.";
      } catch (error) {
        var revokeError = document.getElementById("account-security-feedback");
        if (revokeError) revokeError.textContent = error.message || "The passkey could not be revoked.";
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.dataset.securityAction === "revoke-session") {
      if (!window.confirm("Sign out the selected session? This action cannot be undone.")) return;
      setBusy(true);
      try {
        var revokedSession = await revokeAccountSession(button.dataset.sessionRef);
        renderSecurityPanel(revokedSession);
        var revokeSessionFeedback = document.getElementById("account-security-feedback");
        if (revokeSessionFeedback) revokeSessionFeedback.textContent = "The selected other session was revoked.";
      } catch (error) {
        var revokeSessionError = document.getElementById("account-security-feedback");
        if (revokeSessionError) revokeSessionError.textContent = error.message || "The session could not be revoked.";
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.dataset.securityAction === "copy-recovery-key") {
      var recoveryKeyField = document.getElementById("account-security-recovery-key-value");
      if (!recoveryKeyField) return;
      recoveryKeyField.focus();
      recoveryKeyField.select();
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
          await navigator.clipboard.writeText(recoveryKeyField.value);
          var copyFeedback = document.getElementById("account-security-feedback");
          if (copyFeedback) copyFeedback.textContent = "Recovery key copied. Store it offline and do not share it.";
        } catch (_error) {
          var copyFallback = document.getElementById("account-security-feedback");
          if (copyFallback) copyFallback.textContent = "The key is selected. Copy it manually and store it offline.";
        }
      } else {
        var copyUnavailable = document.getElementById("account-security-feedback");
        if (copyUnavailable) copyUnavailable.textContent = "The key is selected. Copy it manually and store it offline.";
      }
      return;
    }
    if (button.dataset.securityAction === "acknowledge-recovery-key") {
      var output = document.getElementById("account-security-recovery-output");
      var secretField = document.getElementById("account-security-recovery-key-value");
      if (secretField) secretField.value = "";
      if (output) {
        output.textContent = "The replacement key has been acknowledged. AstroCrown will not display it again.";
        output.setAttribute("role", "status");
      }
      securityRecoveryKeyPending = false;
      return;
    }
    if (button.id === "open-account-communications") {
      window.location.hash = "communications";
      return;
    }
    if (button.id === "account-admin-wallet-access" || button.id === "open-admin-dashboard") {
      document.dispatchEvent(new CustomEvent("astrocrown:request-admin-wallet-access"));
      return;
    }
    if (button.id === "acknowledge-admin-revocation") {
      var noticeId = button.getAttribute("data-notice-id");
      setBusy(true);
      try {
        accountState = await requestJson("/api/account/administrator-notice/acknowledge", {
          noticeId: noticeId
        });
        syncAccountButton();
        renderAccountDashboard();
      } catch (error) {
        var noticeFeedback = document.getElementById("admin-revocation-notice-feedback");
        if (noticeFeedback) noticeFeedback.textContent = error.message || "The administrator notice could not be acknowledged.";
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.id === "end-admin-access") {
      setBusy(true);
      try {
        accountState = await requestJson("/api/admin/wallet-logout", {});
        syncAccountButton();
        renderAccountDashboard();
      } catch (error) {
        var adminFeedbackOnError = document.getElementById("account-admin-access-feedback");
        if (adminFeedbackOnError) adminFeedbackOnError.textContent = error.message || "Administrator access could not be ended.";
      } finally {
        setBusy(false);
      }
      return;
    }
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
    if (securityRecoveryKeyPending) {
      var saveKeyNotice = document.getElementById("account-security-feedback");
      if (saveKeyNotice) saveKeyNotice.textContent = "Save and acknowledge the new recovery key before signing out.";
      return;
    }
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


  communicationsContent.addEventListener("click", async function (event) {
    var button = event.target.closest("button");
    if (!button || busy) return;
    if (button.dataset.communicationSection) {
      var nextSection = button.dataset.communicationSection === "messages" ? "messages" : "alerts";
      if (nextSection === activeCommunicationsSection) return;
      activeCommunicationsSection = nextSection;
      setBusy(true);
      try {
        await loadCommunicationsPage(activeCommunicationsSection, null, false);
      } catch (error) {
        var tabFeedback = document.getElementById("communications-feedback");
        if (tabFeedback) tabFeedback.textContent =
          error.message || "This communication section could not be loaded.";
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.dataset.communicationsLoadOlder === "true") {
      var olderCursor = communicationsState.nextCursor;
      if (!olderCursor) return;
      setBusy(true);
      try {
        await loadCommunicationsPage(activeCommunicationsSection, olderCursor, true);
      } catch (error) {
        var olderFeedback = document.getElementById("communications-feedback");
        if (olderFeedback) olderFeedback.textContent =
          error.message || "Older communications could not be loaded.";
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!button.dataset.communicationAction || !button.dataset.communicationId) return;
    setBusy(true);
    try {
      var stateResult = await requestJson("/api/account/communications/state", {
        communicationId: button.dataset.communicationId,
        action: button.dataset.communicationAction
      });
      var changedItem = communicationsState.items.find(function (item) {
        return item.communicationId === button.dataset.communicationId;
      });
      if (changedItem && button.dataset.communicationAction === "acknowledge") {
        changedItem.acknowledgedAt = changedItem.acknowledgedAt || "acknowledged";
      } else if (changedItem && button.dataset.communicationAction === "read") {
        changedItem.readAt = changedItem.readAt || "read";
      }
      communicationsState.unreadCounts = stateResult.unreadCounts || communicationsState.unreadCounts;
      accountState.communicationsUnreadCounts = communicationsState.unreadCounts;
      syncAccountButton();
      renderCommunicationsPage();
    } catch (error) {
      var communicationFeedback = document.getElementById("communications-feedback");
      if (communicationFeedback) communicationFeedback.textContent =
        error.message || "The communication state could not be updated.";
    } finally {
      setBusy(false);
    }
  });

  adminDashboardContent.addEventListener("click", async function (event) {
    var button = event.target.closest("button");
    if (!button || busy) return;
    if (button.dataset.adminWalletRevoke === "true") {
      var walletAddress = button.dataset.walletAddress || "";
      var walletChainId = Number(button.dataset.walletChainId);
      if (!/^0x[0-9a-f]{40}$/i.test(walletAddress) ||
          !Number.isSafeInteger(walletChainId) || walletChainId <= 0) {
        return;
      }
      if (!window.confirm(
        "Revoke this administrator wallet? It will no longer authorize Administrator access. " +
        "The ordinary account remains active. You must keep at least one other enrolled wallet."
      )) return;
      setBusy(true);
      try {
        var walletRevocation = await requestJson("/api/admin/wallet-revoke", {
          address: walletAddress,
          chainId: walletChainId
        });
        accountState = walletRevocation;
        syncAccountButton();
        if (walletRevocation.adminSessionAuthorized === true) {
          var remainingWallets = await requestJson("/api/admin/wallet-options");
          renderAdminDashboard(walletRevocation, remainingWallets);
        } else {
          window.location.hash = "account";
        }
      } catch (error) {
        var walletFeedback = document.getElementById("admin-wallet-enrollment-feedback");
        if (walletFeedback) walletFeedback.textContent =
          error.message || "The administrator wallet could not be revoked.";
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.id === "admin-communication-send") {
      var recipientInput = document.getElementById("admin-communication-recipient");
      var sectionInput = document.getElementById("admin-communication-section");
      var subjectInput = document.getElementById("admin-communication-subject");
      var bodyInput = document.getElementById("admin-communication-body");
      var communicationFeedback = document.getElementById("admin-communication-feedback");
      var recipientIdentifier = recipientInput ? recipientInput.value.trim().toUpperCase() : "";
      var section = sectionInput ? sectionInput.value : "";
      var subject = subjectInput ? subjectInput.value.trim() : "";
      var messageBody = bodyInput ? bodyInput.value.trim() : "";
      if (!/^AC-[A-F0-9]{10}$/.test(recipientIdentifier) || !["alerts", "messages"].includes(section) ||
          !subject || subject.length > 120 || !messageBody || messageBody.length > 4000) {
        if (communicationFeedback) communicationFeedback.textContent =
          "Enter a valid AC- recipient identifier, choose Alerts or Messages, and provide a subject and message within the stated limits.";
        return;
      }
      setBusy(true);
      try {
        var sent = await requestJson("/api/admin/communications/send", {
          accountIdentifier: recipientIdentifier,
          section: section,
          subject: subject,
          body: messageBody
        });
        if (recipientInput) recipientInput.value = "";
        if (subjectInput) subjectInput.value = "";
        if (bodyInput) bodyInput.value = "";
        if (communicationFeedback) communicationFeedback.textContent =
          "Delivered to " + sent.recipientAccountIdentifier + " in " + (section === "alerts" ? "Alerts" : "Messages") + ".";
      } catch (error) {
        if (communicationFeedback) communicationFeedback.textContent =
          error.message || "The communication could not be sent.";
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.id === "admin-role-grant") {
      var grantIdentifierInput = document.getElementById("admin-role-grant-account-identifier");
      var grantReasonInput = document.getElementById("admin-role-grant-reason");
      var grantFeedback = document.getElementById("admin-role-grant-feedback");
      var grantAccountIdentifier = grantIdentifierInput ? grantIdentifierInput.value.trim().toUpperCase() : "";
      var grantReason = grantReasonInput ? grantReasonInput.value.trim() : "";
      var delegatedPermissions = Array.prototype.map.call(
        adminDashboardContent.querySelectorAll('input[name="admin-role-permission"]:checked'),
        function (input) { return input.value; }
      );
      if (!/^AC-[A-F0-9]{10}$/.test(grantAccountIdentifier) || !grantReason || grantReason.length < 12) {
        if (grantFeedback) grantFeedback.textContent = "Enter the member's AC- account identifier and a clear reason of at least 12 characters.";
        return;
      }
      setBusy(true);
      try {
        var grantResult = await requestJson("/api/admin/roles/grant", {
          accountIdentifier: grantAccountIdentifier,
          reason: grantReason,
          permissions: delegatedPermissions
        });
        if (grantIdentifierInput) grantIdentifierInput.value = "";
        if (grantReasonInput) grantReasonInput.value = "";
        adminDashboardContent.querySelectorAll('input[name="admin-role-permission"]').forEach(function (input) {
          input.checked = false;
        });
        if (grantFeedback) grantFeedback.textContent = grantResult.message || "The existing account was granted the administrator role.";
      } catch (error) {
        if (grantFeedback) grantFeedback.textContent = error.message || "The administrator role could not be granted.";
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.id === "admin-role-revoke") {
      var revokeIdentifierInput = document.getElementById("admin-role-revoke-account-identifier");
      var revokeReasonInput = document.getElementById("admin-role-revoke-reason");
      var revokeFeedback = document.getElementById("admin-role-revoke-feedback");
      var revokeAccountIdentifier = revokeIdentifierInput ? revokeIdentifierInput.value.trim().toUpperCase() : "";
      var revokeReason = revokeReasonInput ? revokeReasonInput.value.trim() : "";
      if (!/^AC-[A-F0-9]{10}$/.test(revokeAccountIdentifier) || !revokeReason || revokeReason.length < 12) {
        if (revokeFeedback) revokeFeedback.textContent = "Enter the administrator's AC- account identifier and a clear reason of at least 12 characters.";
        return;
      }
      setBusy(true);
      try {
        var revokeResult = await requestJson("/api/admin/roles/revoke", {
          accountIdentifier: revokeAccountIdentifier,
          reason: revokeReason
        });
        if (revokeIdentifierInput) revokeIdentifierInput.value = "";
        if (revokeReasonInput) revokeReasonInput.value = "";
        if (revokeFeedback) revokeFeedback.textContent = revokeResult.message || "Administrator access was revoked.";
      } catch (error) {
        if (revokeFeedback) revokeFeedback.textContent = error.message || "Administrator access could not be revoked.";
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.id === "admin-return-account") {
      window.location.hash = "account";
      return;
    }
    if (button.id === "admin-add-wallet") {
      document.dispatchEvent(new CustomEvent("astrocrown:request-admin-wallet-enrollment"));
      return;
    }
    if (button.id !== "admin-end-access") return;
    setBusy(true);
    try {
      accountState = await requestJson("/api/admin/wallet-logout", {});
      syncAccountButton();
      window.location.hash = "account";
    } catch (_error) {
      var notice = document.createElement("p");
      notice.className = "account-dashboard-notice";
      notice.setAttribute("role", "status");
      notice.textContent = "Administrator access could not be ended by the server. Leave this console and sign out if the issue persists.";
      adminDashboardContent.prepend(notice);
    } finally {
      setBusy(false);
    }
  });

  document.addEventListener("astrocrown:admin-wallet-enrolled", function () {
    pendingAdminWalletMessage = "The additional administrator wallet was enrolled successfully. For safety, the previous administrator step-up was ended; verify one of the registered wallets again when you next open the administrator console.";
  });

  openButton.addEventListener("click", openAccountDialog);
  if (communicationsButton) {
    communicationsButton.addEventListener("click", function () {
      window.location.hash = "communications";
    });
  }
  closeButton.addEventListener("click", closeDialog);
  dialog.addEventListener("cancel", function (event) {
    if (mode === "success" && successKind !== "signin" && !recoveryKeyAcknowledged) {
      event.preventDefault();
      showFeedback("Save the one-time offline recovery key and confirm before closing this screen.", "error");
    }
  });
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
    } else if (window.location.hash === "#communications") {
      if (status.authenticated) showCommunicationsPage();
      else clearAccountRoute();
    }
  });
}());
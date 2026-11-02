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
  var adminDashboard = document.getElementById("admin-dashboard");
  var adminDashboardContent = document.getElementById("admin-dashboard-content");
  var mainContent = document.getElementById("main-content");
  var mode = "signin";
  var successKind = "signup";
  var recoveryKeyAcknowledged = false;
  var accountState = { authenticated: false };
  var focusBeforeOpen = null;
  var busy = false;
  var pendingAdminWalletMessage = null;
  var termsVersion = "development-terms-2026-10-31-v0.3";
  var loopbackHosts = ["localhost", "127.0.0.1", "::1"];
  var forceBrowserDemo = new URLSearchParams(window.location.search).get("account-preview-demo") === "1";
  var browserPreviewMode = forceBrowserDemo || loopbackHosts.indexOf(window.location.hostname) === -1;
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
    mode = "success";
    syncAccountButton();
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
      (browserPreviewMode ? "hosted-preview-no-authentication" : "local-passkey-test") + '">' +
      (browserPreviewMode
        ? "HOSTED PREVIEW — this page demonstrates the account interface only. It cannot create accounts or authenticate users. Use the documented local server for passkey testing."
        : "LOCAL PASSKEY TEST — WebAuthn is verified by this computer's local AstroCrown server. No email, SMS or external identity provider is used. Not production authentication.") +
      '</p>';
  }

  function renderSignIn() {
    title.textContent = "AstroCrown account";
    content.innerHTML = renderTabs("signin") + renderDevelopmentNotice() +
      '<p class="account-dialog-description">Sign in to AstroCrown using a passkey saved in your device or security key. No email address or password is required.</p>' +
      '<div class="account-form">' +
        '<button class="account-primary" type="button" id="account-passkey-signin"' +
          (browserPreviewMode ? ' disabled' : '') + '>Sign in with passkey</button>' +
        '<p class="account-provider-note">Your authenticator keeps the private key. AstroCrown verifies a fresh signature and does not receive your biometric, device PIN or private key.</p>' +
      '</div>' +
      '<p class="account-security-assurance"><a href="./account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">Security assurance</a></p>' +
      '<p class="account-security-assurance"><a href="./account-continuity/prototype/cases.html">Feedback, grievances &amp; case access</a></p>' +
      '<p class="account-provider-note">A crypto wallet is optional and is not required for ordinary account access. Your offline recovery key is separate from your passkey.</p>' +
      '<p class="account-security-assurance"><button class="account-text-button" type="button" id="account-recovery-start">Recover account with offline key</button></p>';
  }

  function renderCreate() {
    title.textContent = "Create AstroCrown account";
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
    title.textContent = "Recover AstroCrown account";
    content.innerHTML = renderDevelopmentNotice() +
      '<p class="account-dialog-description">Use the account identifier and your unused offline recovery key to replace lost passkey access. This does not use email, SMS or support approval.</p>' +
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
              '<h3>Save your offline recovery key now</h3>' +
              '<p>This is shown once. AstroCrown does not store the readable key. Keep it offline and separate from your passkey device. Anyone who obtains it may be able to replace your passkey.</p>' +
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
    var adminCard = '';
    if (accountState.adminRoleAssigned === true) {
      var walletCount = Number(accountState.adminWalletCount || 0);
      var adminSessionVerified = accountState.adminSessionAuthorized === true;
      var adminAccessStatus = adminSessionVerified
        ? "Wallet verified for this session"
        : walletCount > 0
          ? "Wallet verification required"
          : "No administrator wallet enrolled";
      var adminAccessDescription = adminSessionVerified
        ? "The server currently confirms a wallet-verified administrator session. Continue through the administrator access dialog to open the separate administrator dashboard."
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
            '<button class="account-primary" type="button" id="account-admin-wallet-access">Open administrator dashboard</button>' +
            (adminSessionVerified ? '<button class="account-secondary" type="button" id="end-admin-access">End admin access</button>' : '') +
          '</div>' +
          '<p id="account-admin-access-feedback" class="account-avatar-feedback" role="status" aria-live="polite"></p>' +
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
        '<section class="account-dashboard-card account-user-services-card"><h2>AstroCrown services</h2><p class="account-dashboard-value">Shared member workspace</p><p>Regular users and administrators use the same user-facing AstroCrown services here. Personal activity and transactions belong to this User dashboard and remain subject to the same member rules for every account.</p><p>Transaction workflows and other service modules are not enabled in this account prototype.</p></section>' +
        '<section class="account-dashboard-card account-profile-card"><h2>Profile &amp; avatar</h2><p class="account-dashboard-value">Account created: ' + escapeHtml(accountState.createdAt || "Recorded in test state") + '</p><p>Choose from built-in AstroCrown avatars. No image upload or external image service is used.</p><div id="account-avatar-picker" class="account-avatar-picker" role="group" aria-label="Choose account avatar">' + renderAvatarChoices(accountState.avatarId) + '</div><p id="account-avatar-feedback" class="account-avatar-feedback" role="status">Your selected avatar appears here and in the circular header control.</p></section>' +
        '<section class="account-dashboard-card"><h2>Security &amp; sign-in</h2>' +
          '<span class="account-dashboard-status">WebAuthn passkey authentication</span>' +
          '<p class="account-dashboard-value">Registered passkeys: ' + String(passkeyCount) + '</p>' +
          '<p>The authenticator keeps your private key. AstroCrown verifies a fresh challenge using the registered public credential. No email, password, SMS or external identity provider is used for this account sign-in.</p>' +
          '<p class="account-session-count">Active sign-in sessions: ' + String(activeSessionCount) + '.</p>' +
          '<p>Additional passkey enrollment, revocation and passkey-confirmed session management are being implemented separately. Do not rely on this prototype for real assets.</p>' +
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
    if (adminPermissions.indexOf("admin.roles.grant") >= 0) {
      var permissionLabels = {
        "admin.roles.grant": "May appoint other administrators",
        "admin.roles.revoke": "May revoke administrator roles"
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
          '<p>Grant the role to an existing AstroCrown user account. The target keeps the same User dashboard and must enrol a wallet they personally control. No wallet address, password or private key is entered here.</p>' +
          '<label class="account-admin-role-field" for="admin-role-grant-email">Existing user account email<input id="admin-role-grant-email" type="email" maxlength="254" autocomplete="off" required></label>' +
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
          '<p>Revocation removes the administrator role, delegated permissions and enrolled administrator wallets. The person keeps their ordinary AstroCrown account and User dashboard.</p>' +
          '<label class="account-admin-role-field" for="admin-role-revoke-email">Administrator account email<input id="admin-role-revoke-email" type="email" maxlength="254" autocomplete="off" required></label>' +
          '<label class="account-admin-role-field" for="admin-role-revoke-reason">Reason for revocation<input id="admin-role-revoke-reason" type="text" maxlength="500" minlength="12" required></label>' +
          '<button class="account-secondary" type="button" id="admin-role-revoke">Revoke administrator role</button>' +
          '<p id="admin-role-revoke-feedback" class="account-avatar-feedback" role="status" aria-live="polite"></p>' +
        '</section>';
    }
    var walletRows = registeredWallets.map(function (item) {
      return '<li class="account-admin-wallet-row"><span class="account-wallet-address">' +
        escapeHtml(item.address || "") + '</span><span class="account-admin-wallet-chain">Chain ID ' +
        escapeHtml(String(item.chainId)) + '</span></li>';
    }).join("");
    var enrollmentControl = registeredWallets.length < 3
      ? '<button class="account-primary" type="button" id="admin-add-wallet">Add another wallet</button>'
      : '<p class="account-admin-wallet-limit">Three active wallets are registered. The prototype does not permit a fourth wallet.</p>';
    adminDashboardContent.innerHTML =
      '<div class="account-dashboard-notice"><strong>Development-only Administrator dashboard.</strong> This workspace is for administrative duties only and is separate from the shared User dashboard. Personal user-facing services and transactions remain in the User dashboard under the same ordinary member rules. The backend verified the assigned role and a wallet signature for a short-lived session. The only administrative operation in this prototype is registering another wallet with a separate signature; publishing, account administration, payments and recovery remain disabled.</div>' +
      '<div class="account-dashboard-welcome">' +
        '<div class="account-dashboard-avatar account-avatar-shield" aria-hidden="true">' + avatarSvg("shield", "account-dashboard-avatar-svg") + '</div>' +
        '<div class="account-dashboard-welcome-copy"><strong>Administrator access verified</strong><span>Backend-authorized · development prototype · no production privileges</span></div>' +
      '</div>' +
      '<div class="account-dashboard-grid">' +
        '<section class="account-dashboard-card"><h2>Authority</h2><p class="account-dashboard-value">Role: Administrator</p><p>Role assignment is stored by the server and is separate from the wallet signature. A connected wallet alone cannot create this role.</p></section>' +
        '<section class="account-dashboard-card"><h2>Verified wallet</h2><p class="account-dashboard-value account-wallet-address">' + wallet + '</p><p>Only the public address is shown. No private key, seed phrase or transaction is requested by this prototype.</p></section>' +
        '<section class="account-dashboard-card"><h2>Session expiration</h2><p class="account-dashboard-value">' + expires + '</p><p>Administrator step-up expires after ten minutes or when the underlying account session expires, whichever happens first.</p></section>' +
        '<section class="account-dashboard-card account-admin-wallets-card"><h2>Registered administrator wallets</h2><p>Your local account may register up to three distinct public wallet addresses. A wallet is not added until it signs a separate server-issued enrollment message.</p>' +
          '<ul class="account-admin-wallet-list">' + walletRows + '</ul>' +
          enrollmentControl +
          '<p class="account-admin-wallet-warning">Enrollment ends the current administrator step-up. You must verify a registered wallet again before reopening this dashboard. A lost-wallet recovery workflow is not implemented.</p>' +
          '<p id="admin-wallet-enrollment-feedback" class="account-avatar-feedback" role="status" aria-live="polite"></p></section>' +
        '<section class="account-dashboard-card"><h2>Other operations</h2><p class="account-dashboard-value">Not enabled</p><p>Banner publishing, account-wide management, payments and all-wallet-loss recovery are not available in this console. Administrator appointment and revocation are shown separately only when the server confirms their corresponding permissions.</p><a href="./account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">Read security assurance</a></section>' +
        roleManagementCard +
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
      var walletOptions = await requestJson("/api/admin/wallet-options", {});
      if (!Array.isArray(walletOptions.wallets) || walletOptions.wallets.length > 3) {
        throw new Error("The backend returned an invalid administrator wallet registry.");
      }
      accountState = verified;
      syncAccountButton();
      mainContent.hidden = true;
      dashboard.hidden = true;
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
    if (button.id === "copy-account-recovery-key") {
      var keyField = document.getElementById("account-one-time-recovery-key");
      if (!keyField) return;
      keyField.focus();
      keyField.select();
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
          await navigator.clipboard.writeText(keyField.value);
          showFeedback("Recovery key copied. Store it offline and do not share it.", "success");
        } catch (_error) {
          showFeedback("The key is selected. Copy it manually and store it offline.", "info");
        }
      } else {
        showFeedback("The key is selected. Copy it manually and store it offline.", "info");
      }
      return;
    }
    if (button.id === "open-account-hub") {
      if ((successKind === "signup" || successKind === "recovery") && !recoveryKeyAcknowledged) {
        showFeedback("Confirm that you saved the offline recovery key before continuing.", "error");
        return;
      }
      delete accountState.oneTimeRecoveryKey;
      recoveryKeyAcknowledged = false;
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
    if (button.id === "account-admin-wallet-access" || button.id === "open-admin-dashboard") {
      document.dispatchEvent(new CustomEvent("astrocrown:request-admin-wallet-access"));
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

  adminDashboardContent.addEventListener("click", async function (event) {
    var button = event.target.closest("button");
    if (!button || busy) return;
    if (button.id === "admin-role-grant") {
      var grantEmailInput = document.getElementById("admin-role-grant-email");
      var grantReasonInput = document.getElementById("admin-role-grant-reason");
      var grantFeedback = document.getElementById("admin-role-grant-feedback");
      var grantEmail = grantEmailInput ? grantEmailInput.value.trim() : "";
      var grantReason = grantReasonInput ? grantReasonInput.value.trim() : "";
      var delegatedPermissions = Array.prototype.map.call(
        adminDashboardContent.querySelectorAll('input[name="admin-role-permission"]:checked'),
        function (input) { return input.value; }
      );
      if (!grantEmail || !grantReason || grantReason.length < 12) {
        if (grantFeedback) grantFeedback.textContent = "Enter the existing account email and a clear reason of at least 12 characters.";
        return;
      }
      setBusy(true);
      try {
        var grantResult = await requestJson("/api/admin/roles/grant", {
          email: grantEmail,
          reason: grantReason,
          permissions: delegatedPermissions
        });
        if (grantEmailInput) grantEmailInput.value = "";
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
      var revokeEmailInput = document.getElementById("admin-role-revoke-email");
      var revokeReasonInput = document.getElementById("admin-role-revoke-reason");
      var revokeFeedback = document.getElementById("admin-role-revoke-feedback");
      var revokeEmail = revokeEmailInput ? revokeEmailInput.value.trim() : "";
      var revokeReason = revokeReasonInput ? revokeReasonInput.value.trim() : "";
      if (!revokeEmail || !revokeReason || revokeReason.length < 12) {
        if (revokeFeedback) revokeFeedback.textContent = "Enter the administrator account email and a clear reason of at least 12 characters.";
        return;
      }
      setBusy(true);
      try {
        var revokeResult = await requestJson("/api/admin/roles/revoke", {
          email: revokeEmail,
          reason: revokeReason
        });
        if (revokeEmailInput) revokeEmailInput.value = "";
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
    }
  });
}());
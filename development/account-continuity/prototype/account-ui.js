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
  var accountState = { authenticated: false };
  var focusBeforeOpen = null;
  var busy = false;
  var pendingAdminWalletMessage = null;
  var termsVersion = "development-terms-2026-10-31-v0.3";
  var walletLossNoticeVersion = "wallet-loss-warning-2026-11-28-v1";
  var discoveredWalletProviders = [];
  var selectedWalletProvider = null;
  var selectedWalletAddress = "";
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
      throw new Error(workerStagingMode ? "The AstroCrown staging account service is not responding. No wallet account action was completed." : "The local AstroCrown account service is not running. No wallet account action was completed.");
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
        element.disabled = value || element.dataset.originalDisabled === "true";
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

  function walletProviderLabel(entry) {
    var name = entry && entry.info && typeof entry.info.name === "string" ? entry.info.name.trim() : "Browser wallet";
    var rdns = entry && entry.info && typeof entry.info.rdns === "string" ? entry.info.rdns : "";
    return { name: name || "Browser wallet", rdns: rdns };
  }

  async function refreshWalletProviderChoices() {
    var providerSelects = [
      document.getElementById("account-wallet-provider")
    ].filter(Boolean);
    if (!providerSelects.length || browserPreviewMode) return;
    discoveredWalletProviders = [];
    var announced = new Map();
    function onAnnounce(event) {
      var detail = event && event.detail;
      if (!detail || !detail.provider || !detail.info || typeof detail.info.uuid !== "string") return;
      announced.set(detail.info.uuid, { id: detail.info.uuid, provider: detail.provider, info: detail.info });
    }
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    try {
      window.dispatchEvent(new Event("eip6963:requestProvider"));
      await new Promise(function (resolve) { window.setTimeout(resolve, 350); });
    } finally {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
    }
    discoveredWalletProviders = Array.from(announced.values());
    if (!discoveredWalletProviders.length && window.ethereum && Array.isArray(window.ethereum.providers)) {
      discoveredWalletProviders = window.ethereum.providers.map(function (provider, index) {
        return {
          id: "injected-" + index,
          provider: provider,
          info: { name: provider.isMetaMask ? "MetaMask" : provider.isRabby ? "Rabby" : "Browser wallet " + (index + 1), rdns: "" }
        };
      });
    }
    if (!discoveredWalletProviders.length && window.ethereum && typeof window.ethereum.request === "function") {
      discoveredWalletProviders = [{
        id: "injected-default",
        provider: window.ethereum,
        info: { name: window.ethereum.isMetaMask ? "MetaMask" : "Injected wallet", rdns: "" }
      }];
    }
    providerSelects.forEach(function (select) {
      var previous = select.value;
      select.innerHTML = '<option value="">Select a wallet provider…</option>';
      discoveredWalletProviders.forEach(function (entry) {
        var label = walletProviderLabel(entry);
        var option = document.createElement("option");
        option.value = entry.id;
        option.textContent = label.name;
        select.appendChild(option);
      });
      if (previous && discoveredWalletProviders.some(function (entry) { return entry.id === previous; })) {
        select.value = previous;
      } else if (discoveredWalletProviders.length === 1) {
        select.value = discoveredWalletProviders[0].id;
        selectedWalletProvider = discoveredWalletProviders[0].provider;
      } else {
        selectedWalletProvider = null;
      }
      var help = document.getElementById("account-wallet-selection-help");
      if (help && !discoveredWalletProviders.length) {
        help.textContent = "No compatible EVM wallet was detected. Install or enable a wallet that supports EIP-1193 and EIP-191 message signing, then reopen this window.";
      } else if (help && discoveredWalletProviders.length > 1) {
        help.textContent = "Choose the wallet provider you want to use. AstroCrown will not select a provider or wallet address for you.";
      }
    });
  }

  function selectedWalletProviderFromForm() {
    var select = document.getElementById("account-wallet-provider");
    var id = select ? select.value : "";
    var entry = discoveredWalletProviders.find(function (candidate) { return candidate.id === id; });
    if (!entry && discoveredWalletProviders.length === 1) entry = discoveredWalletProviders[0];
    if (!entry || !entry.provider || typeof entry.provider.request !== "function") {
      throw new Error("Choose one of the detected wallet providers before continuing.");
    }
    selectedWalletProvider = entry.provider;
    return selectedWalletProvider;
  }

  async function authenticateWithPrimaryWallet(createAccount, referralId, consent) {
    if (browserPreviewMode) {
      throw new Error("Wallet authentication is not available in the read-only hosted preview.");
    }
    var provider = selectedWalletProviderFromForm();
    var granted;
    try {
      granted = await provider.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }]
      });
    } catch (permissionError) {
      if (!permissionError || permissionError.code !== -32601) throw permissionError;
      granted = null;
    }
    var accounts = await provider.request({ method: "eth_accounts" });
    if (!Array.isArray(accounts) || !accounts.length ||
        accounts.some(function (item) { return typeof item !== "string" || !/^0x[0-9a-f]{40}$/i.test(item); })) {
      accounts = await provider.request({ method: "eth_requestAccounts" });
    }
    if (!Array.isArray(accounts) || !accounts.length ||
        accounts.some(function (item) { return typeof item !== "string" || !/^0x[0-9a-f]{40}$/i.test(item); })) {
      throw new Error("The selected wallet did not return a valid EVM account.");
    }
    var accountSelect = document.getElementById("account-wallet-account");
    var accountField = accountSelect ? accountSelect.closest("label") : null;
    var requestedAddress = accountSelect ? accountSelect.value : "";
    if (accountSelect) {
      accountSelect.innerHTML = '<option value="">Choose an address…</option>';
      accounts.forEach(function (address) {
        var option = document.createElement("option");
        option.value = address;
        option.textContent = address.slice(0, 8) + "…" + address.slice(-6);
        accountSelect.appendChild(option);
      });
      if (requestedAddress && accounts.some(function (address) { return address.toLowerCase() === requestedAddress.toLowerCase(); })) {
        accountSelect.value = requestedAddress;
      }
      if (accountField) accountField.hidden = accounts.length < 2;
      if (accounts.length > 1 && !accountSelect.value) {
        selectedWalletAddress = "";
        throw new Error("Your wallet returned more than one address. Choose the address you want as your AstroCrown primary identity, then continue.");
      }
      if (accounts.length > 1 && !accountSelect.value) {
        throw new Error("Choose the wallet address for this AstroCrown account.");
      }
    }
    var address = accountSelect && accountSelect.value ? accountSelect.value
      : selectedWalletAddress && accounts.find(function (item) { return item.toLowerCase() === selectedWalletAddress.toLowerCase(); })
        ? selectedWalletAddress : accounts[0];
    if (accounts.length > 1 && (!accountSelect || !accountSelect.value)) {
      throw new Error("Choose the wallet address for this AstroCrown account.");
    }
    selectedWalletAddress = address;
    var chainHex = await provider.request({ method: "eth_chainId" });
    var chainId = typeof chainHex === "string" && /^0x[0-9a-f]+$/i.test(chainHex)
      ? Number.parseInt(chainHex, 16) : NaN;
    if (!Number.isSafeInteger(chainId) || chainId <= 0) {
      throw new Error("The wallet did not return a valid EVM network identifier.");
    }
    var challenge = await requestJson("/api/account/primary-wallet/options", {
      address: address,
      chainId: chainId
    });
    if (challenge.transactionAuthorized !== false || challenge.signatureOnly !== true ||
        challenge.walletFamily !== "evm-eoa" || typeof challenge.message !== "string" ||
        challenge.address.toLowerCase() !== address.toLowerCase() || challenge.chainId !== chainId) {
      throw new Error("The server returned an invalid wallet sign-in challenge. No account action was performed.");
    }

    var currentAccounts = await provider.request({ method: "eth_accounts" });
    var currentChainHex = await provider.request({ method: "eth_chainId" });
    var currentChainId = typeof currentChainHex === "string" && /^0x[0-9a-f]+$/i.test(currentChainHex)
      ? Number.parseInt(currentChainHex, 16) : NaN;
    if (!Array.isArray(currentAccounts) || !currentAccounts.some(function (item) {
      return typeof item === "string" && item.toLowerCase() === address.toLowerCase();
    }) || currentChainId !== chainId) {
      throw new Error("The selected wallet or network changed during sign-in. Start again with the intended primary wallet.");
    }

    showFeedback("Review the message in your wallet. This is an off-chain signature only; it cannot move assets, approve a contract or authorize a payment.", "info");
    var messageHex = "0x" + Array.prototype.map.call(
      new TextEncoder().encode(challenge.message),
      function (byte) { return byte.toString(16).padStart(2, "0"); }
    ).join("");
    var signature = await provider.request({
      method: "personal_sign",
      params: [messageHex, address]
    });
    if (typeof signature !== "string" || !/^0x[0-9a-f]{130}$/i.test(signature)) {
      throw new Error("The wallet did not return a valid EIP-191 signature.");
    }
    var requestPayload = {
      challengeId: challenge.challengeId,
      message: challenge.message,
      signature: signature,
      createAccount: createAccount === true
    };
    if (createAccount === true) {
      requestPayload.termsAccepted = consent && consent.termsAccepted === true;
      requestPayload.termsVersion = termsVersion;
      requestPayload.walletLossAcknowledged = consent && consent.walletLossAcknowledged === true;
      requestPayload.walletLossNoticeVersion = walletLossNoticeVersion;
      requestPayload.referralId = referralId || "";
    }
    return requestJson("/api/account/primary-wallet/verify", requestPayload);
  }

  function finishPrimaryWalletAuthentication(result, created) {
    accountState = result;
    successKind = created ? "signup" : "signin";
    syncAccountButton();
    if (!created) {
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

  function renderTabs(selected) {
    return '<div class="account-tabs" role="tablist" aria-label="Account access">' +
      '<button type="button" class="account-tab" role="tab" data-account-mode="signin" aria-selected="' + (selected === "signin" ? "true" : "false") + '">Log In</button>' +
      '<button type="button" class="account-tab" role="tab" data-account-mode="create" aria-selected="' + (selected === "create" ? "true" : "false") + '">Sign Up</button>' +
      '</div>';
  }

  function renderDevelopmentNotice() {
    if (browserPreviewMode) return "";
    var noticeMode = workerStagingMode ? "worker-staging-wallet-test" : "local-wallet-test";
    var noticeText = workerStagingMode
      ? "LIVE STAGING WALLET TEST — Use only a disposable EVM test wallet and invented account details. Never use a wallet holding real assets, reveal seed words, or sign a transaction or approval. This is not the production service."
      : "LOCAL WALLET TEST — Primary-wallet sign-in uses an EVM personal-sign challenge. No transaction is submitted. Use a disposable test wallet only.";
    return '<p class="account-demo-notice" id="account-demo-notice" data-mode="' + noticeMode + '">' +
      noticeText + '</p>';
  }

  function walletProviderMarkup() {
    return '<label class="account-field" for="account-wallet-provider">Choose your wallet provider' +
      '<select id="account-wallet-provider" name="walletProvider" required>' +
        '<option value="">Detecting installed wallets…</option>' +
      '</select></label>' +
      '<label class="account-field account-wallet-account-field" for="account-wallet-account" hidden>Choose the wallet address for this AstroCrown account' +
      '<select id="account-wallet-account" name="walletAccount"><option value="">Connect your wallet first</option></select>' +
      '</label>' +
      '<p class="account-provider-note" id="account-wallet-selection-help">AstroCrown will ask your chosen wallet for permission to view the account you select. It will not choose an address on your behalf.</p>';
  }

  function renderSignIn() {
    content.innerHTML = renderTabs("signin") + renderDevelopmentNotice() +
      '<div class="account-form">' +
        walletProviderMarkup() +
        '<button class="account-primary" type="button" id="account-wallet-signin"' +
          (browserPreviewMode ? ' disabled' : '') + '>Sign in with wallet</button>' +
        '<p class="account-signin-help">New to AstroCrown? <button class="account-text-button" type="button" data-account-mode="create">Create an account</button></p>' +
        '<p class="account-signin-help"><a href="./account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">Why wallet sign-in?</a></p>' +
      '</div>' +
      '<details class="account-wallet-recovery-explainer">' +
        '<summary>Lost your wallet?</summary>' +
        '<p>Your primary wallet is your AstroCrown identity. AstroCrown never receives or stores its private keys, seed phrase or recovery words. This protects your control and privacy, but it also means we cannot retrieve, reset or recreate a lost wallet, its secret words or the account it identifies.</p>' +
        '<p>Use the wallet provider’s own recovery process or a backup you created offline to restore the <strong>same wallet and address</strong>. If you permanently lose access to that wallet and every way of restoring it, access to the associated AstroCrown account is permanently lost. AstroCrown staff and administrators cannot bypass wallet proof or move the account to a different wallet.</p>' +
        '<p><strong>Never enter or send your seed phrase or private key to AstroCrown, support staff, NOVA or anyone else.</strong> We will never ask you for it.</p>' +
      '</details>' +
      '<p class="account-signin-feedback">Feedback and case access are not enabled in this staging qualification.</p>';
    refreshWalletProviderChoices();
  }

  function renderCreate() {
    content.innerHTML = renderTabs("create") + renderDevelopmentNotice() +
      '<p class="account-dialog-description">Create one AstroCrown account using the wallet that will be your primary identity. Your Genesis Programme status and any future entitlements will belong to this same account. No transaction or token approval is requested to sign in or create an account.</p>' +
      '<form id="account-wallet-create-form" class="account-form" autocomplete="off">' +
        walletProviderMarkup() +
        '<label class="account-field" for="account-wallet-referral-id">Referral ID (Optional)' +
          '<input id="account-wallet-referral-id" name="referralId" type="text" autocomplete="off" maxlength="64" autocapitalize="characters" spellcheck="false" placeholder="Enter referral ID...">' +
        '</label>' +
        '<section class="account-wallet-consent-panel" aria-labelledby="account-wallet-consent-heading">' +
          '<h3 id="account-wallet-consent-heading">Please read before creating your account</h3>' +
          '<p><strong>Your primary wallet is your AstroCrown identity.</strong> AstroCrown never receives or stores your wallet private key, seed phrase or recovery words. Restore the same wallet and address using your wallet provider or your own offline backup. If you permanently lose that wallet and every way to restore it, access to this AstroCrown account is permanently lost. AstroCrown staff and administrators cannot reset the wallet identity or move it to another address.</p>' +
          '<p><strong>Never enter or send your seed phrase or private key to AstroCrown, support staff, NOVA or anyone else.</strong> We will never ask you for it.</p>' +
          '<label class="account-consent account-required-consent" for="account-wallet-loss-accepted">' +
            '<input id="account-wallet-loss-accepted" name="walletLossAcknowledged" type="checkbox" required>' +
            '<span>I have read and understood the wallet-loss and recovery warning above. I understand that losing access to my primary wallet and all of its backups means losing access to my AstroCrown account.</span>' +
          '</label>' +
          '<label class="account-consent account-required-consent" for="account-wallet-terms-accepted">' +
            '<input id="account-wallet-terms-accepted" name="termsAccepted" type="checkbox" required>' +
            '<span>I have read, understood and agree to AstroCrown’s <a href="./account-continuity/prototype/terms-of-use.html" target="_blank" rel="noopener noreferrer">Terms of Use</a> and <a href="./account-continuity/prototype/privacy-policy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</span>' +
          '</label>' +
        '</section>' +
        '<p class="account-provider-note">Connecting only requests access to the address you choose. Account creation requires an off-chain personal-message signature. It does not send a transaction, approve a token, transfer funds or authorize future payments.</p>' +
        '<button class="account-primary" type="submit"' + (browserPreviewMode ? ' disabled' : '') + '>Create account with wallet</button>' +
        '<p class="account-signin-help">Already have an account? <button class="account-text-button" type="button" data-account-mode="signin">Log in</button></p>' +
      '</form>' +
      '<p class="account-security-assurance"><a href="./account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">How wallet identity and transaction safety work</a></p>';
    refreshWalletProviderChoices();
  }

  function renderSuccess() {
    var created = successKind === "signup";
    var wallet = accountState && accountState.primaryIdentityWallet;
    var address = wallet && typeof wallet.address === "string" ? wallet.address : "";
    var network = wallet && Number.isSafeInteger(Number(wallet.chainId)) ? "EVM chain " + Number(wallet.chainId) : "EVM wallet";
    var message = created
      ? "Your AstroCrown account has been created with the primary wallet you selected. That same wallet is your account identity, recovery anchor and the wallet used to authorize future account actions."
      : "You are signed in to AstroCrown with your primary identity wallet.";
    content.innerHTML =
      '<div class="account-success-panel">' +
        '<div class="account-success-mark" aria-hidden="true">✓</div>' +
        '<h3 class="account-success-heading">' + (created ? "Your wallet account is ready" : "You’re signed in") + '</h3>' +
        '<p class="account-success-copy">' + escapeHtml(message) + '</p>' +
        (address ? '<section class="account-wallet-success-identity"><span>Primary identity wallet · ' + escapeHtml(network) + '</span><strong>' + escapeHtml(address) + '</strong></section>' : '') +
        '<p class="account-success-small">Your wallet remains under your control. The sign-in signature did not submit a transaction, approve a token or authorize spending. Genesis status and entitlements will appear under this same AstroCrown account.</p>' +
        '<button class="account-primary" type="button" id="open-account-hub">Open your AstroCrown account</button>' +
      '</div>';
  }

  function renderAccountDashboard() {
    if (!accountState || !accountState.authenticated) return;
    var identifier = escapeHtml(accountState.accountIdentifier || "AstroCrown account");
    var referral = accountState.referralId
      ? escapeHtml(accountState.referralId) + ' <span class="account-muted-inline">(unverified; no reward is applied)</span>'
      : "Not supplied";
    var primaryWallet = accountState.primaryIdentityWallet || {};
    var primaryAddress = typeof primaryWallet.address === "string" ? primaryWallet.address : "";
    var chainId = Number(primaryWallet.chainId || 0);
    var communicationCounts = accountState.communicationsUnreadCounts || {};
    var unreadCommunicationCount = Math.max(0, Number(communicationCounts.alerts || 0)) +
      Math.max(0, Number(communicationCounts.messages || 0));
    var adminCard = "";
    if (accountState.adminRoleAssigned === true) {
      var walletCount = Number(accountState.adminWalletCount || 0);
      var adminSessionVerified = accountState.adminSessionAuthorized === true;
      var adminWalletRecoveryRequired = accountState.adminWalletRecoveryRequired === true;
      var adminAccessStatus = adminSessionVerified
        ? "Administrator wallet verified for this session"
        : adminWalletRecoveryRequired
          ? "Owner-authorized administrator wallet recovery required"
          : walletCount > 0 ? "Additional administrator wallet verification required" : "No administrator wallet enrolled";
      var adminAccessDescription = adminSessionVerified
        ? "The server confirms a fresh signature from an enrolled administrator wallet. Administrator actions remain separate from ordinary user activity."
        : adminWalletRecoveryRequired
          ? "All previously enrolled administrator wallets are inactive. Ordinary access through your primary account wallet remains available. Administrator authority requires a separate owner-authorized review; ordinary sign-in cannot bypass that control."
          : walletCount > 0
            ? "Administrator access requires a fresh signature from one of the " + escapeHtml(String(walletCount)) +
              " separately enrolled administrator wallets. This is an off-chain proof, not a blockchain transaction."
            : "This account has an administrator role, but an administrator wallet has not yet been enrolled.";
      adminCard =
        '<section class="account-dashboard-card account-admin-access-card">' +
          '<h2>Administrator access</h2>' +
          '<span class="account-dashboard-status">' + escapeHtml(adminAccessStatus) + '</span>' +
          '<p>' + adminAccessDescription + '</p>' +
          '<div class="account-admin-access-actions">' +
            '<button class="account-primary" type="button" id="account-admin-wallet-access"' +
              (adminWalletRecoveryRequired ? ' disabled title="Owner-authorized administrator wallet recovery is required."' : '') +
              '>' + (adminWalletRecoveryRequired ? "Administrator recovery required" : "Open administrator dashboard") + '</button>' +
            (adminSessionVerified ? '<button class="account-secondary" type="button" id="end-admin-access">End admin access</button>' : '') +
          '</div>' +
          '<p id="account-admin-access-feedback" class="account-avatar-feedback" role="status" aria-live="polite"></p>' +
        '</section>';
    }
    var administratorRevocationNotice = "";
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
      '<div class="account-dashboard-notice"><strong>Wallet-first AstroCrown account.</strong> Your primary wallet is your identity and the way you recover access. Genesis programme status, profile, membership and entitlements belong to this same account. There is no separate Genesis account or Genesis sign-in. This is a public staging test environment; use synthetic data only.</div>' +
      '<div class="account-dashboard-welcome">' +
        '<div class="account-dashboard-avatar account-avatar-' + normalizeAvatarId(accountState.avatarId) + '" aria-hidden="true">' +
          avatarSvg(accountState.avatarId, "account-dashboard-avatar-svg") +
        '</div>' +
        '<div class="account-dashboard-welcome-copy"><strong>' + identifier + '</strong><span>Signed in with your primary wallet · AstroCrown staging</span></div>' +
      '</div>' +
      '<div class="account-dashboard-grid">' +
        '<section class="account-dashboard-card account-communications-card"><h2>Alerts &amp; Messages</h2><p class="account-dashboard-value">' + String(unreadCommunicationCount) + ' pending</p><p>Important account alerts and private in-app messages are kept in one place, with separate sections and acknowledgement/read status.</p><button class="account-primary" type="button" id="open-account-communications">Open communications</button></section>' +
        '<section class="account-dashboard-card account-user-services-card"><h2>AstroCrown services</h2><p class="account-dashboard-value">Shared member workspace</p><p>Regular users and administrators use the same user-facing AstroCrown services here. Personal activity and future programme entitlements belong to this account.</p><p>Payments and other asset-moving workflows are not enabled in this staging environment.</p></section>' +
        '<section class="account-dashboard-card account-profile-card"><h2>Profile &amp; avatar</h2><p class="account-dashboard-value">Account created: ' + escapeHtml(accountState.createdAt || "Recorded in test state") + '</p><p>Choose from built-in AstroCrown avatars. No image upload or external image service is used.</p><div id="account-avatar-picker" class="account-avatar-picker" role="group" aria-label="Choose account avatar">' + renderAvatarChoices(accountState.avatarId) + '</div><p id="account-avatar-feedback" class="account-avatar-feedback" role="status">Your selected avatar appears here and in the circular header control.</p></section>' +
        '<section class="account-dashboard-card account-primary-wallet-card"><h2>Primary identity wallet</h2><span class="account-dashboard-status">Sole account identity and recovery anchor</span>' +
          '<p class="account-dashboard-value">' + (primaryAddress ? escapeHtml(primaryAddress) : "Wallet address unavailable") + '</p>' +
          '<p>Network: ' + (chainId > 0 ? "EVM chain ID " + String(chainId) : "Not reported") + '</p>' +
          '<p>AstroCrown does not receive or store your private key, seed phrase or recovery words. Restore this same wallet and address using your wallet provider or your own offline backup. If every restoration path is lost, access to this account is permanently lost.</p>' +
          '<p><strong>Never share your seed phrase or private key with AstroCrown, support staff, NOVA or anyone else.</strong></p>' +
          '<a href="./account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">Read security assurance</a></section>' +
        '<section class="account-dashboard-card account-payment-safety-card"><h2>Payment and transaction safety</h2>' +
          '<span class="account-dashboard-status">Payments disabled in staging</span>' +
          '<p>Signing in proves control of your primary wallet only. It cannot move assets, approve tokens, submit transactions or authorize spending.</p>' +
          '<p>When payments are introduced, each payment must show the asset, amount, network and recipient and require a separate confirmation in your wallet. No unlimited token approval or standing spending permission is enabled by account sign-in.</p>' +
          '<p>Any future automated trading or payment tool must use a separate, explicit, narrowly limited, expiring and revocable authorization. No automated spending authorization is active.</p></section>' +
        '<section class="account-dashboard-card"><h2>Terms &amp; consent</h2><p>Terms accepted: ' + escapeHtml(accountState.termsVersion || "Not reported") + '</p><p>Wallet-loss warning acknowledged: ' + (accountState.walletLossAcknowledged === true ? "Yes" : "Not recorded") + '</p><p>Your acceptance is recorded by the account service when the account is created.</p><a href="./account-continuity/prototype/terms-of-use.html" target="_blank" rel="noopener noreferrer">Terms of Use</a> · <a href="./account-continuity/prototype/privacy-policy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a></section>' +
        '<section class="account-dashboard-card"><h2>Referral ID</h2><p class="account-dashboard-value">' + referral + '</p><p>Referral values are not verified and do not trigger rewards or benefits in this prototype.</p></section>' +
        '<section class="account-dashboard-card"><h2>Account data</h2><p>The primary wallet address is public and may be associated with public blockchain activity. AstroCrown does not collect an email address, phone number or password for wallet authentication.</p></section>' +
        '<section class="account-dashboard-card"><h2>Feedback &amp; case access</h2><p>Submit a suggestion or grievance, follow case updates, or recover case access independently of your account.</p><a href="./account-continuity/prototype/cases.html">Open feedback &amp; case portal</a></section>' +
        adminCard +
      '</div>' +
      '<div class="account-dashboard-actions"><p>Administrator functions remain separately gated. Your ordinary primary-wallet sign-in does not itself grant administrator privileges.</p><button class="account-secondary" type="button" id="account-signout">Sign out</button></div>';
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

    if (form.id === "account-wallet-create-form") {
      var walletTermsInput = form.elements.namedItem("termsAccepted");
      var walletLossInput = form.elements.namedItem("walletLossAcknowledged");
      if (!(walletLossInput && walletLossInput.checked)) {
        showFeedback("Read and confirm the wallet-loss and recovery warning before creating an account.", "error");
        if (walletLossInput) walletLossInput.focus();
        return;
      }
      if (!(walletTermsInput && walletTermsInput.checked)) {
        showFeedback("Read and accept the Terms of Use and Privacy Policy before creating an account.", "error");
        if (walletTermsInput) walletTermsInput.focus();
        return;
      }
      setBusy(true);
      try {
        var walletResult = await authenticateWithPrimaryWallet(true, formValue(form, "referralId"), {
          termsAccepted: walletTermsInput.checked,
          walletLossAcknowledged: walletLossInput.checked
        });
        finishPrimaryWalletAuthentication(walletResult, walletResult.walletAccountCreated === true);
      } catch (error) {
        showFeedback(error.message || "Wallet account creation could not be completed.", "error");
      } finally {
        setBusy(false);
      }
      return;
    }

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
    if (event.target && event.target.id === "account-wallet-provider") {
      selectedWalletProvider = null;
      selectedWalletAddress = "";
      var accountField = document.getElementById("account-wallet-account");
      var accountLabel = accountField ? accountField.closest("label") : null;
      if (accountField) accountField.innerHTML = '<option value="">Connect your wallet first</option>';
      if (accountLabel) accountLabel.hidden = true;
    }
    if (event.target && event.target.id === "account-wallet-account") {
      selectedWalletAddress = event.target.value || "";
    }
  });

  content.addEventListener("click", async function (event) {
    var button = event.target.closest("button");
    if (!button || busy) return;
    if (button.dataset.accountMode) {
      setMode(button.dataset.accountMode);
      return;
    }
    if (button.id === "account-wallet-signin") {
      setBusy(true);
      try {
        var walletSignInResult = await authenticateWithPrimaryWallet(false, "");
        finishPrimaryWalletAuthentication(walletSignInResult, false);
      } catch (error) {
        showFeedback(error.message || "Wallet sign-in could not be completed.", "error");
      } finally {
        setBusy(false);
      }
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
    } else if (status.authenticated && !window.location.hash) {
      // An existing member returning to the site resumes at the shared
      // User dashboard. The homepage remains the entry point for signed-out
      // visitors; administrator access is still a separate gated route.
      navigateToAccount();
    }
  });
}());
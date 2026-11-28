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
  var accountResultDialog = null;
  var linkedWalletCandidate = null;
  var termsVersion = "development-terms-2026-10-31-v0.3";
  var walletLossNoticeVersion = "wallet-loss-warning-2026-11-28-v2";
  var discoveredWalletProviders = [];
  var selectedWalletProvider = null;
  var selectedWalletAddress = "";
  var queryParams = new URLSearchParams(window.location.search);
  var forceBrowserDemo = queryParams.get("account-preview-demo") === "1";
  var runtimeMarker = document.querySelector('meta[name="astro-account-runtime"]');
  var workerStagingMode = Boolean(
    runtimeMarker && runtimeMarker.content === "worker-staging" &&
    window.location.protocol === "https:"
  );
  // Only the explicitly marked Cloudflare staging Worker may authenticate.
  // Local files, localhost pages and generic previews remain read-only demos.
  var browserPreviewMode = forceBrowserDemo || !workerStagingMode;
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

  function showAccountResultDialog(kind, heading, message) {
    if (!accountResultDialog) {
      accountResultDialog = document.createElement("dialog");
      accountResultDialog.className = "account-result-dialog";
      accountResultDialog.setAttribute("aria-labelledby", "account-result-dialog-title");
      accountResultDialog.setAttribute("aria-describedby", "account-result-dialog-message");
      var shell = document.createElement("div");
      shell.className = "account-result-dialog-shell";
      var mark = document.createElement("span");
      mark.className = "account-result-dialog-mark";
      mark.setAttribute("aria-hidden", "true");
      var title = document.createElement("h2");
      title.id = "account-result-dialog-title";
      var copy = document.createElement("p");
      copy.id = "account-result-dialog-message";
      var close = document.createElement("button");
      close.type = "button";
      close.className = "account-primary";
      close.textContent = "Continue";
      close.addEventListener("click", function () {
        if (typeof accountResultDialog.close === "function") accountResultDialog.close();
        else accountResultDialog.removeAttribute("open");
      });
      shell.appendChild(mark);
      shell.appendChild(title);
      shell.appendChild(copy);
      shell.appendChild(close);
      accountResultDialog.appendChild(shell);
      accountResultDialog.addEventListener("click", function (event) {
        if (event.target === accountResultDialog && accountResultDialog.dataset.kind === "error") {
          if (typeof accountResultDialog.close === "function") accountResultDialog.close();
          else accountResultDialog.removeAttribute("open");
        }
      });
      document.body.appendChild(accountResultDialog);
    }
    accountResultDialog.dataset.kind = kind === "success" ? "success" : "error";
    var resultMark = accountResultDialog.querySelector(".account-result-dialog-mark");
    var resultTitle = document.getElementById("account-result-dialog-title");
    var resultMessage = document.getElementById("account-result-dialog-message");
    if (resultMark) resultMark.textContent = kind === "success" ? "✓" : "!";
    if (resultTitle) resultTitle.textContent = heading || (kind === "success" ? "Account created successfully" : "Account creation failed");
    if (resultMessage) resultMessage.textContent = message || "";
    if (typeof accountResultDialog.showModal === "function" && !accountResultDialog.open) accountResultDialog.showModal();
    else accountResultDialog.setAttribute("open", "open");
    var action = accountResultDialog.querySelector("button");
    if (action) action.focus();
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
        activeSessionCount: 0,
        scope: "hosted-preview-no-authentication"
      };
    }
    if (path === "/api/account/logout") {
      return { authenticated: false, message: "No account session exists in this hosted preview." };
    }
    throw new Error(
      "The hosted HTML preview is read-only. Wallet authentication requires the official AstroCrown staging Worker."
    );
  }

  function setBusy(value) {
    busy = value;
    [content, dashboardContent, adminDashboardContent, communicationsContent].filter(Boolean).forEach(function (container) {
      Array.prototype.forEach.call(container.querySelectorAll("button, input, select"), function (element) {
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
      await new Promise(function (resolve) { window.setTimeout(resolve, 1000); });
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
      var grid = document.getElementById("account-wallet-provider-grid");
      var discoveryState = document.getElementById("account-wallet-discovery-state");
      select.innerHTML = '<option value="">Select a detected wallet…</option>';
      if (grid) grid.innerHTML = "";
      discoveredWalletProviders.forEach(function (entry) {
        var label = walletProviderLabel(entry);
        var option = document.createElement("option");
        option.value = entry.id;
        option.textContent = label.name;
        select.appendChild(option);
        if (grid) {
          var card = document.createElement("button");
          card.type = "button";
          card.className = "account-wallet-card";
          card.dataset.walletProviderId = entry.id;
          card.setAttribute("aria-pressed", "false");
          var logo = document.createElement("span");
          logo.className = "account-wallet-logo";
          logo.setAttribute("aria-hidden", "true");
          var icon = entry.info && typeof entry.info.icon === "string" ? entry.info.icon : "";
          if (/^data:image\/(?:png|jpeg|webp|svg\+xml)(?:;base64)?,/i.test(icon)) {
            var image = document.createElement("img");
            image.src = icon;
            image.alt = "";
            image.referrerPolicy = "no-referrer";
            logo.appendChild(image);
          } else {
            logo.textContent = label.name.slice(0, 1).toUpperCase();
            logo.classList.add("account-wallet-logo-fallback");
          }
          var copy = document.createElement("span");
          copy.className = "account-wallet-card-copy";
          var name = document.createElement("strong");
          name.textContent = label.name;
          var detail = document.createElement("small");
          detail.textContent = "Detected in this browser";
          copy.appendChild(name);
          copy.appendChild(detail);
          card.appendChild(logo);
          card.appendChild(copy);
          grid.appendChild(card);
        }
      });
      if (previous && discoveredWalletProviders.some(function (entry) { return entry.id === previous; })) {
        select.value = previous;
      } else {
        select.value = "";
        selectedWalletProvider = null;
      }
      if (grid && !discoveredWalletProviders.length && discoveryState) {
        discoveryState.textContent = "No compatible EVM wallet was detected in this browser. Install or enable an EIP-1193 wallet, then reopen this window.";
      } else if (discoveryState) {
        discoveryState.remove();
      }
      if (grid && select.value) {
        var selectedCard = grid.querySelector('[data-wallet-provider-id="' + CSS.escape(select.value) + '"]');
        if (selectedCard) selectedCard.setAttribute("aria-pressed", "true");
      }
      var help = document.getElementById("account-wallet-selection-help");
      if (help && discoveredWalletProviders.length) {
        help.textContent = "Select a detected wallet card. AstroCrown will not choose a provider or wallet address on your behalf.";
      }
    });
  }


  async function discoverAdditionalWalletProviders() {
    var select = document.getElementById("account-linked-wallet-provider");
    if (!select || browserPreviewMode) return;
    discoveredWalletProviders = [];
    var announced = new Map();
    function onAnnounce(event) {
      var detail = event && event.detail;
      if (!detail || !detail.provider || typeof detail.provider.request !== "function" ||
          !detail.info || typeof detail.info.uuid !== "string") return;
      announced.set(detail.info.uuid, {
        id: detail.info.uuid,
        provider: detail.provider,
        info: detail.info
      });
    }
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    try {
      window.dispatchEvent(new Event("eip6963:requestProvider"));
      await new Promise(function (resolve) { window.setTimeout(resolve, 1000); });
    } finally {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
    }
    discoveredWalletProviders = Array.from(announced.values());
    if (!discoveredWalletProviders.length && window.ethereum && Array.isArray(window.ethereum.providers)) {
      discoveredWalletProviders = window.ethereum.providers.map(function (provider, index) {
        return {
          id: "injected-" + index,
          provider: provider,
          info: { name: provider.isMetaMask ? "MetaMask" : provider.isRabby ? "Rabby" : "Browser wallet " + (index + 1) }
        };
      });
    }
    if (!discoveredWalletProviders.length && window.ethereum && typeof window.ethereum.request === "function") {
      discoveredWalletProviders = [{
        id: "injected-default",
        provider: window.ethereum,
        info: { name: window.ethereum.isMetaMask ? "MetaMask" : "Injected wallet" }
      }];
    }
    select.innerHTML = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a detected EVM wallet…";
    select.appendChild(placeholder);
    discoveredWalletProviders.forEach(function (entry) {
      var option = document.createElement("option");
      option.value = entry.id;
      option.textContent = walletProviderLabel(entry).name;
      select.appendChild(option);
    });
    select.value = "";
    linkedWalletCandidate = null;
    var feedbackNode = document.getElementById("account-linked-wallet-feedback");
    if (feedbackNode) {
      feedbackNode.textContent = discoveredWalletProviders.length
        ? "Wallets detected. Choose one, then explicitly connect it to inspect its available addresses."
        : "No EVM browser wallet was detected. Other connection types are not enabled in this staging build.";
      feedbackNode.dataset.kind = "info";
    }
  }

  function selectedAdditionalWalletProvider() {
    var select = document.getElementById("account-linked-wallet-provider");
    var id = select ? select.value : "";
    var entry = id ? discoveredWalletProviders.find(function (candidate) { return candidate.id === id; }) : null;
    if (!entry || !entry.provider || typeof entry.provider.request !== "function") {
      throw new Error("Choose a detected EVM browser wallet before connecting it.");
    }
    return entry;
  }

  function walletMessageHex(message) {
    return "0x" + Array.prototype.map.call(
      new TextEncoder().encode(message),
      function (byte) { return byte.toString(16).padStart(2, "0"); }
    ).join("");
  }

  async function findConnectedOwnerWalletProvider() {
    var primary = accountState && accountState.primaryIdentityWallet;
    var ownerAddress = primary && typeof primary.address === "string" ? primary.address : "";
    if (!/^0x[0-9a-f]{40}$/i.test(ownerAddress)) {
      throw new Error("The permanent owner wallet is not available in the current account session.");
    }
    for (var index = 0; index < discoveredWalletProviders.length; index += 1) {
      var entry = discoveredWalletProviders[index];
      try {
        var accounts = await entry.provider.request({ method: "eth_accounts" });
        if (Array.isArray(accounts) && accounts.some(function (address) {
          return typeof address === "string" && address.toLowerCase() === ownerAddress.toLowerCase();
        })) return { entry: entry, address: ownerAddress };
      } catch (_error) {
        // An inaccessible provider is skipped; no permission prompt is triggered here.
      }
    }
    throw new Error("AstroCrown could not find your designated owner wallet among the connected browser wallets. Reconnect the same owner wallet first; an additional wallet cannot replace it.");
  }

  async function signWalletLinkMessage(provider, address, message) {
    var signature = await provider.request({
      method: "personal_sign",
      params: [walletMessageHex(message), address]
    });
    if (typeof signature !== "string" || !/^0x[0-9a-f]{130}$/i.test(signature)) {
      throw new Error("The wallet did not return a valid EIP-191 authorization signature.");
    }
    return signature;
  }

  function showLinkedWalletFeedback(message, kind) {
    var target = document.getElementById("account-linked-wallet-feedback");
    if (target) {
      target.textContent = message || "";
      target.dataset.kind = kind || "info";
    }
  }

  async function connectAdditionalWalletForSelection() {
    var entry = selectedAdditionalWalletProvider();
    var accounts = await entry.provider.request({ method: "eth_requestAccounts" });
    if (!Array.isArray(accounts) || !accounts.length ||
        accounts.some(function (address) { return typeof address !== "string" || !/^0x[0-9a-f]{40}$/i.test(address); })) {
      throw new Error("The selected wallet did not return a valid EVM address.");
    }
    var chainHex = await entry.provider.request({ method: "eth_chainId" });
    var chainId = typeof chainHex === "string" && /^0x[0-9a-f]+$/i.test(chainHex)
      ? Number.parseInt(chainHex, 16) : NaN;
    if (!Number.isSafeInteger(chainId) || chainId <= 0) {
      throw new Error("The selected wallet did not report a valid EVM network.");
    }
    var field = document.getElementById("account-linked-wallet-address-field");
    var addressSelect = document.getElementById("account-linked-wallet-address");
    if (!addressSelect || !field) throw new Error("The additional-wallet address selector is unavailable. Refresh the account page.");
    addressSelect.innerHTML = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose the exact address to link…";
    addressSelect.appendChild(placeholder);
    accounts.forEach(function (address) {
      var option = document.createElement("option");
      option.value = address;
      option.textContent = address.slice(0, 8) + "…" + address.slice(-6);
      addressSelect.appendChild(option);
    });
    addressSelect.value = "";
    field.hidden = false;
    linkedWalletCandidate = { id: entry.id, provider: entry.provider, chainId: chainId };
    showLinkedWalletFeedback(
      accounts.length + " address(es) detected on EVM chain " + chainId + ". Choose the exact address; no wallet is selected automatically.",
      "info"
    );
  }

  async function linkAdditionalWallet() {
    var entry = selectedAdditionalWalletProvider();
    var candidate = linkedWalletCandidate;
    var addressSelect = document.getElementById("account-linked-wallet-address");
    var consent = document.getElementById("account-linked-wallet-permission");
    var address = addressSelect ? addressSelect.value : "";
    if (!candidate || candidate.id !== entry.id || !address || !consent || !consent.checked) {
      throw new Error("Connect the selected wallet, choose its exact address and authorize wallet-capabilities-only access before continuing.");
    }
    var primary = accountState && accountState.primaryIdentityWallet;
    if (!primary || address.toLowerCase() === String(primary.address || "").toLowerCase()) {
      throw new Error("The permanent owner wallet cannot be linked again as an additional wallet.");
    }
    var owner = await findConnectedOwnerWalletProvider();
    var currentAccounts = await entry.provider.request({ method: "eth_accounts" });
    var currentChainHex = await entry.provider.request({ method: "eth_chainId" });
    var currentChainId = typeof currentChainHex === "string" && /^0x[0-9a-f]+$/i.test(currentChainHex)
      ? Number.parseInt(currentChainHex, 16) : NaN;
    if (!Array.isArray(currentAccounts) || !currentAccounts.some(function (item) {
      return typeof item === "string" && item.toLowerCase() === address.toLowerCase();
    }) || currentChainId !== candidate.chainId) {
      throw new Error("The selected additional wallet, address or network changed. Connect it again and restart the linking process.");
    }
    var challenge = await requestJson("/api/account/wallet-links/options", {
      action: "link",
      address: address,
      chainId: candidate.chainId
    });
    if (challenge.transactionAuthorized !== false || challenge.spendingAuthorized !== false ||
        challenge.additionalWalletSignatureRequired !== true ||
        challenge.ownerSignatureRequired !== true ||
        challenge.ownerAddress.toLowerCase() !== owner.address.toLowerCase() ||
        challenge.address.toLowerCase() !== address.toLowerCase()) {
      throw new Error("The server returned an invalid additional-wallet authorization challenge. Nothing was linked.");
    }
    showLinkedWalletFeedback("Review the same wallet-capability authorization message in your owner wallet and additional wallet. No transaction or spending permission is requested.", "info");
    var ownerSignature = await signWalletLinkMessage(owner.entry.provider, owner.address, challenge.message);
    var walletSignature = await signWalletLinkMessage(entry.provider, address, challenge.message);
    var verified = await requestJson("/api/account/wallet-links/verify", {
      challengeId: challenge.challengeId,
      message: challenge.message,
      ownerSignature: ownerSignature,
      walletSignature: walletSignature,
      permissionAuthorized: true
    });
    if (verified.authenticated !== true || verified.primaryIdentityWallet.address.toLowerCase() !== primary.address.toLowerCase()) {
      throw new Error("The server did not confirm the additional wallet under the same permanent owner account.");
    }
    accountState = verified;
    syncAccountButton();
    renderAccountDashboard();
    await discoverAdditionalWalletProviders();
    showLinkedWalletFeedback(verified.message || "The additional wallet was linked and its scoped permission was authorized.", "success");
  }

  async function unlinkAdditionalWallet(address, chainId) {
    if (!/^0x[0-9a-f]{40}$/i.test(address) || !Number.isSafeInteger(chainId) || chainId <= 0) {
      throw new Error("The selected additional wallet reference is invalid.");
    }
    if (!window.confirm(
      "Unlink this additional wallet from your AstroCrown account? Its AstroCrown permissions will be revoked immediately. " +
      "You may link it again later with fresh owner-wallet and additional-wallet signatures and new authorization. " +
      "This does not automatically revoke any separate on-chain token or contract approvals."
    )) return;
    var owner = await findConnectedOwnerWalletProvider();
    var challenge = await requestJson("/api/account/wallet-links/options", {
      action: "unlink",
      address: address,
      chainId: chainId
    });
    if (challenge.transactionAuthorized !== false || challenge.spendingAuthorized !== false ||
        challenge.additionalWalletSignatureRequired !== false ||
        challenge.ownerSignatureRequired !== true ||
        challenge.ownerAddress.toLowerCase() !== owner.address.toLowerCase()) {
      throw new Error("The server returned an invalid wallet-unlink authorization challenge. Nothing was unlinked.");
    }
    showLinkedWalletFeedback("Confirm the unlinking request with your permanent owner wallet. This revokes AstroCrown permissions only; it is not a blockchain transaction.", "info");
    var ownerSignature = await signWalletLinkMessage(owner.entry.provider, owner.address, challenge.message);
    var verified = await requestJson("/api/account/wallet-links/verify", {
      challengeId: challenge.challengeId,
      message: challenge.message,
      ownerSignature: ownerSignature
    });
    if (verified.authenticated !== true || verified.primaryIdentityWallet.address.toLowerCase() !== accountState.primaryIdentityWallet.address.toLowerCase()) {
      throw new Error("The server did not confirm this unlink operation under the same owner account.");
    }
    accountState = verified;
    syncAccountButton();
    renderAccountDashboard();
    await discoverAdditionalWalletProviders();
    showLinkedWalletFeedback(verified.message || "The additional wallet was unlinked and its AstroCrown permission revoked.", "success");
  }

  function selectedWalletProviderFromForm() {
    var select = document.getElementById("account-wallet-provider");
    var id = select ? select.value : "";
    var entry = id ? discoveredWalletProviders.find(function (candidate) { return candidate.id === id; }) : null;
    if (!entry || !entry.provider || typeof entry.provider.request !== "function") {
      selectedWalletProvider = null;
      throw new Error("Select a detected wallet card before continuing. AstroCrown will not choose a provider for you.");
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
      if (!permissionError || (permissionError.code !== -32601 && permissionError.code !== 4200)) throw permissionError;
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
      if (accountField) accountField.hidden = false;
      if (!accountSelect.value || !accounts.some(function (address) {
        return address.toLowerCase() === accountSelect.value.toLowerCase();
      })) {
        selectedWalletAddress = "";
        throw new Error(accounts.length > 1
          ? "Choose the wallet address you want as your AstroCrown primary identity, then continue."
          : "Confirm that this is the wallet address you want as your AstroCrown primary identity, then continue.");
      }
    }
    var address = accountSelect.value;
    if (!address || !accounts.some(function (item) { return item.toLowerCase() === address.toLowerCase(); })) {
      throw new Error("Choose the exact wallet address for this AstroCrown account.");
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

  async function finishPrimaryWalletAuthentication(result, created) {
    accountState = result;
    successKind = created ? "signup" : "signin";
    mode = "signin";
    syncAccountButton();
    if (dialog.open) closeDialog();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search + "#account"
    );
    await showAccountDashboard();
    if (created) {
      showAccountResultDialog(
        "success",
        "AstroCrown account created successfully",
        "Your account is now open. Your selected owner wallet is its permanent identity authority. Additional wallets may be linked later, but they cannot replace or recover the owner wallet."
      );
    }
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
    return '<section class="account-wallet-picker" aria-label="Choose your wallet provider">' +
      '<h3 class="account-wallet-picker-heading">Choose your wallet</h3>' +
      '<button class="account-wallet-card account-wallet-card-featured" type="button" disabled aria-disabled="true">' +
        '<span class="account-wallet-logo account-wallet-logo-astro" aria-hidden="true">A</span>' +
        '<span class="account-wallet-card-copy"><strong>AstroWallet</strong><small>First-party wallet · Coming soon</small></span>' +
        '<span class="account-wallet-coming-soon">Coming soon</span>' +
      '</button>' +
      '<div class="account-wallet-provider-grid" id="account-wallet-provider-grid" role="group" aria-label="Detected compatible browser wallets">' +
        '<p class="account-wallet-discovery-state" id="account-wallet-discovery-state">Detecting compatible wallets…</p>' +
      '</div>' +
      '<select id="account-wallet-provider" name="walletProvider" required aria-label="Selected wallet provider" class="account-wallet-provider-native">' +
        '<option value="">Select a detected wallet…</option>' +
      '</select>' +
      '</section>' +
      '<label class="account-field account-wallet-account-field" for="account-wallet-account" hidden>Choose the wallet address for this AstroCrown account' +
      '<select id="account-wallet-account" name="walletAccount"><option value="">Connect your wallet first</option></select>' +
      '</label>' +
      '<p class="account-provider-note" id="account-wallet-selection-help">Choose one of the detected wallets. AstroCrown will ask permission to view accounts only after you select a wallet and continue.</p>';
  }

  function renderSignIn() {
    content.innerHTML = renderTabs("signin") + renderDevelopmentNotice() +
      '<div class="account-form">' +
        walletProviderMarkup() +
        '<button class="account-primary" type="button" id="account-wallet-signin"' +
          (browserPreviewMode ? ' disabled' : '') + '>Sign in with wallet</button>' +
        '<p class="account-signin-help">New to AstroCrown? <button class="account-text-button" type="button" data-account-mode="create">Create an account</button></p>' +
        '<p class="account-signin-help"><a href="/account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">Why wallet sign-in?</a></p>' +
      '</div>' +
      '<details class="account-wallet-recovery-explainer">' +
        '<summary>No alternative account recovery</summary>' +
        '<p>Your designated owner wallet is the immutable owner and identity authority for this AstroCrown account. AstroCrown provides no account recovery, owner-wallet replacement or ownership transfer. No administrator, support worker or additional linked wallet can restore or replace the owner wallet.</p>' +
        '<p>If you permanently lose access to the exact owner wallet, you permanently lose access to the associated AstroCrown account. Only the wallet provider’s own backup and restoration mechanisms may help you regain access to that same wallet; this is not an AstroCrown account-recovery path.</p>' +
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
          '<h3 id="account-wallet-consent-heading">Permanent owner-wallet requirement</h3>' +
          '<p><strong>Your designated owner wallet is the immutable owner and identity authority for this account.</strong> AstroCrown provides no account recovery, owner-wallet replacement or ownership transfer. If you permanently lose access to this exact wallet, you permanently lose access to your AstroCrown account. Additional wallets, administrators and support staff cannot restore or replace it. Preserve access using only the wallet provider’s own security and backup mechanisms.</p>' +
          '<p><strong>Never enter or send your seed phrase or private key to AstroCrown, support staff, NOVA or anyone else.</strong> We will never ask you for it.</p>' +
          '<label class="account-consent account-required-consent" for="account-wallet-loss-accepted">' +
            '<input id="account-wallet-loss-accepted" name="walletLossAcknowledged" type="checkbox" required>' +
            '<span>I understand that this owner wallet cannot be replaced, that AstroCrown has no alternative account recovery, and that losing access to this wallet means permanently losing access to my AstroCrown account.</span>' +
          '</label>' +
          '<label class="account-consent account-required-consent" for="account-wallet-terms-accepted">' +
            '<input id="account-wallet-terms-accepted" name="termsAccepted" type="checkbox" required>' +
            '<span>I have read, understood and agree to AstroCrown’s <a href="/account-continuity/prototype/terms-of-use.html" target="_blank" rel="noopener noreferrer">Terms of Use</a> and <a href="/account-continuity/prototype/privacy-policy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</span>' +
          '</label>' +
        '</section>' +
        '<p class="account-provider-note">Connecting only requests access to the address you choose. Account creation requires an off-chain personal-message signature. It does not send a transaction, approve a token, transfer funds or authorize future payments.</p>' +
        '<button class="account-primary" type="submit"' + (browserPreviewMode ? ' disabled' : '') + '>Create account with wallet</button>' +
        '<p class="account-signin-help">Already have an account? <button class="account-text-button" type="button" data-account-mode="signin">Log in</button></p>' +
      '</form>' +
      '<p class="account-security-assurance"><a href="/account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">How wallet identity and transaction safety work</a></p>';
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


  function additionalWalletManagerMarkup(linkedWallets) {
    var rows = linkedWallets.map(function (wallet) {
      var address = typeof wallet.address === "string" ? wallet.address : "";
      var chainId = Number(wallet.chainId);
      return '<li class="account-linked-wallet-row">' +
        '<div class="account-linked-wallet-identity"><strong>' + escapeHtml(address) + '</strong>' +
          '<small>Ethereum / EVM · Chain ID ' + escapeHtml(String(chainId)) + ' · Wallet capability permission ' +
          (wallet.permissionAuthorized === true ? "authorized" : "not authorized") + '</small></div>' +
        '<button class="account-secondary" type="button" data-linked-wallet-unlink="true" data-wallet-address="' +
          escapeHtml(address) + '" data-wallet-chain-id="' + escapeHtml(String(chainId)) + '">Unlink</button>' +
      '</li>';
    }).join("");
    return '<section class="account-dashboard-card account-linked-wallets-card">' +
      '<h2>Additional wallets</h2>' +
      '<span class="account-dashboard-status">Optional · Never account owners</span>' +
      '<p>Additional wallets can provide network-specific capabilities for this same AstroCrown account. They cannot sign in as, replace or recover your permanent owner wallet. Unlinking revokes AstroCrown permissions; the same wallet may be linked again later with fresh signatures and new authorization.</p>' +
      (rows
        ? '<ul class="account-linked-wallet-list">' + rows + '</ul>'
        : '<p class="account-linked-wallet-empty">No additional wallets are currently linked.</p>') +
      '<div class="account-linked-wallet-connect">' +
        '<h3>Browser extensions</h3><p class="account-linked-wallet-network">Ethereum / EVM</p>' +
        '<label class="account-admin-role-field" for="account-linked-wallet-provider">Detected EVM browser wallet' +
          '<select id="account-linked-wallet-provider"><option value="">Detecting wallets…</option></select></label>' +
        '<div class="account-linked-wallet-actions">' +
          '<button class="account-secondary" type="button" id="account-linked-wallet-refresh">Refresh wallet list</button>' +
          '<button class="account-secondary" type="button" id="account-linked-wallet-connect">Connect selected wallet</button>' +
        '</div>' +
        '<label class="account-admin-role-field" id="account-linked-wallet-address-field" for="account-linked-wallet-address" hidden>Exact address to link' +
          '<select id="account-linked-wallet-address"><option value="">Connect a wallet first</option></select></label>' +
        '<label class="account-linked-wallet-consent" for="account-linked-wallet-permission">' +
          '<input id="account-linked-wallet-permission" type="checkbox">' +
          '<span>I authorize this wallet for compatible AstroCrown account operations only. This does not authorize transactions, token approvals, transfers or spending. Each transaction requires its own authorization.</span>' +
        '</label>' +
        '<button class="account-primary" type="button" id="account-linked-wallet-link">Link and authorize additional wallet</button>' +
        '<p id="account-linked-wallet-feedback" class="account-avatar-feedback" role="status" aria-live="polite"></p>' +
      '</div>' +
      '<p class="account-linked-wallet-limits">This release currently supports detected EVM browser-extension providers for additional-wallet linking. Bitcoin Core, Solana, mobile, desktop/full-node, hardware and QR/air-gapped connection adapters must be qualified separately before they can be offered here as operational options.</p>' +
    '</section>';
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
    var linkedWallets = Array.isArray(accountState.linkedWallets) ? accountState.linkedWallets : [];
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
        '<section class="account-dashboard-card account-communications-card"><h2>Alerts &amp; Messages</h2><p class="account-dashboard-status">Not enabled in this staging release</p><p>Private account communications are not part of this qualification. No email or SMS delivery is configured and no messages are sent.</p></section>' +
        '<section class="account-dashboard-card account-user-services-card"><h2>AstroCrown services</h2><p class="account-dashboard-value">Shared member workspace</p><p>Regular users and administrators use the same user-facing AstroCrown services here. Personal activity and future programme entitlements belong to this account.</p><p>Payments and other asset-moving workflows are not enabled in this staging environment.</p></section>' +
        '<section class="account-dashboard-card account-profile-card"><h2>Profile &amp; avatar</h2><p class="account-dashboard-value">Account created: ' + escapeHtml(accountState.createdAt || "Recorded in test state") + '</p><p>Choose from built-in AstroCrown avatars. No image upload or external image service is used.</p><div id="account-avatar-picker" class="account-avatar-picker" role="group" aria-label="Choose account avatar">' + renderAvatarChoices(accountState.avatarId) + '</div><p id="account-avatar-feedback" class="account-avatar-feedback" role="status">Your selected avatar appears here and in the circular header control.</p></section>' +
        '<section class="account-dashboard-card account-primary-wallet-card"><h2>Primary identity wallet</h2><span class="account-dashboard-status">Immutable · Sole account owner</span>' +
          '<p class="account-dashboard-value">' + (primaryAddress ? escapeHtml(primaryAddress) : "Wallet address unavailable") + '</p>' +
          '<p>Network: ' + (chainId > 0 ? "EVM chain ID " + String(chainId) : "Not reported") + '</p>' +
          '<p>AstroCrown has no account recovery or owner-wallet replacement process. If you permanently lose access to this exact owner wallet, you permanently lose access to this AstroCrown account. Additional wallets, administrators and support staff cannot restore or replace it. Use only the wallet provider’s own backup tools to preserve this same wallet.</p>' +
          '<p><strong>Never share your seed phrase or private key with AstroCrown, support staff, NOVA or anyone else.</strong></p>' +
          '<a href="/account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">Read security assurance</a></section>' +
        additionalWalletManagerMarkup(linkedWallets) +
        '<section class="account-dashboard-card account-payment-safety-card"><h2>Payment and transaction safety</h2>' +
          '<span class="account-dashboard-status">Payments disabled in staging</span>' +
          '<p>Signing in proves control of your primary wallet only. It cannot move assets, approve tokens, submit transactions or authorize spending.</p>' +
          '<p>When payments are introduced, each payment must show the asset, amount, network and recipient and require a separate confirmation in your wallet. No unlimited token approval or standing spending permission is enabled by account sign-in.</p>' +
          '<p>Any future automated trading or payment tool must use a separate, explicit, narrowly limited, expiring and revocable authorization. No automated spending authorization is active.</p></section>' +
        '<section class="account-dashboard-card"><h2>Terms &amp; consent</h2><p>Terms accepted: ' + escapeHtml(accountState.termsVersion || "Not reported") + '</p><p>Wallet-loss warning acknowledged: ' + (accountState.walletLossAcknowledged === true ? "Yes" : "Not recorded") + '</p><p>Your acceptance is recorded by the account service when the account is created.</p><a href="/account-continuity/prototype/terms-of-use.html" target="_blank" rel="noopener noreferrer">Terms of Use</a> · <a href="/account-continuity/prototype/privacy-policy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a></section>' +
        '<section class="account-dashboard-card"><h2>Referral ID</h2><p class="account-dashboard-value">' + referral + '</p><p>Referral values are not verified and do not trigger rewards or benefits in this prototype.</p></section>' +
        '<section class="account-dashboard-card"><h2>Account data</h2><p>The primary wallet address is public and may be associated with public blockchain activity. AstroCrown does not collect an email address, phone number or password for wallet authentication.</p></section>' +
        '<section class="account-dashboard-card"><h2>Feedback &amp; case access</h2><p class="account-dashboard-status">Not enabled in this staging release</p><p>The feedback and case portal will be introduced as a separate, qualified service. It is not available from this test account.</p></section>' +
        adminCard +
      '</div>' +
      '<div class="account-dashboard-actions"><p>Administrator functions remain separately gated. Your ordinary primary-wallet sign-in does not itself grant administrator privileges.</p><button class="account-secondary" type="button" id="account-signout">Disconnect owner wallet &amp; log out</button></div>';
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
    discoverAdditionalWalletProviders().catch(function () {
      showLinkedWalletFeedback("Additional-wallet discovery could not be completed. The owner account remains available; refresh the wallet list before linking another wallet.", "error");
    });
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
          '<p>Grant the role to an existing AstroCrown user account. The target keeps the same User dashboard and must enrol a wallet they personally control. Use the account identifier shown in that member\'s User dashboard; it is a reference only, not an authenticator. No email address, password or private key is requested.</p>' +
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
        '<section class="account-dashboard-card"><h2>Other operations</h2><p class="account-dashboard-value">Not enabled</p><p>Banner publishing, account-wide management, payments and all-wallet-loss recovery are not available in this console. Administrator appointment and revocation are shown separately only when the server confirms their corresponding permissions.</p><a href="/account-continuity/prototype/security-assurance.html" target="_blank" rel="noopener noreferrer">Read security assurance</a></section>' +
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
    if (form.id !== "account-wallet-create-form") return;
    event.preventDefault();
    if (busy) return;

    var walletLossInput = form.elements.namedItem("walletLossAcknowledged");
    var termsInput = form.elements.namedItem("termsAccepted");
    if (!walletLossInput || !walletLossInput.checked) {
      showFeedback("Read and confirm the wallet-loss and recovery warning before creating an account.", "error");
      if (walletLossInput) walletLossInput.focus();
      return;
    }
    if (!termsInput || !termsInput.checked) {
      showFeedback("Read and accept the Terms of Use and Privacy Policy before creating an account.", "error");
      if (termsInput) termsInput.focus();
      return;
    }
    setBusy(true);
    try {
      var result = await authenticateWithPrimaryWallet(true, formValue(form, "referralId"), {
        termsAccepted: termsInput.checked,
        walletLossAcknowledged: walletLossInput.checked
      });
      await finishPrimaryWalletAuthentication(result, result.walletAccountCreated === true);
    } catch (error) {
      var creationFailure = error.message || "Wallet account creation could not be completed. No account was created unless the server confirms otherwise.";
      showFeedback(creationFailure, "error");
      showAccountResultDialog("error", "AstroCrown account creation unsuccessful", creationFailure);
    } finally {
      setBusy(false);
    }
  });

  content.addEventListener("change", function (event) {
    if (event.target && event.target.id === "account-wallet-provider") {
      selectedWalletAddress = "";
      var selectedId = event.target.value;
      var selectedEntry = discoveredWalletProviders.find(function (entry) { return entry.id === selectedId; });
      selectedWalletProvider = selectedEntry ? selectedEntry.provider : null;
      var accountField = document.getElementById("account-wallet-account");
      var accountLabel = accountField ? accountField.closest("label") : null;
      if (accountField) accountField.innerHTML = '<option value="">Connect your wallet first</option>';
      if (accountLabel) accountLabel.hidden = true;
      var grid = document.getElementById("account-wallet-provider-grid");
      if (grid) Array.prototype.forEach.call(grid.querySelectorAll("[data-wallet-provider-id]"), function (card) {
        card.setAttribute("aria-pressed", card.dataset.walletProviderId === selectedId ? "true" : "false");
      });
    }
    if (event.target && event.target.id === "account-wallet-account") {
      selectedWalletAddress = event.target.value || "";
    }
  });

  content.addEventListener("click", async function (event) {
    var button = event.target.closest("button");
    if (!button || busy) return;
    if (button.dataset.walletProviderId) {
      var providerSelect = document.getElementById("account-wallet-provider");
      if (providerSelect) {
        providerSelect.value = button.dataset.walletProviderId;
        providerSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return;
    }
    if (button.dataset.accountMode === "signin" || button.dataset.accountMode === "create") {
      setMode(button.dataset.accountMode);
      return;
    }
    if (button.id === "account-wallet-signin") {
      setBusy(true);
      try {
        var result = await authenticateWithPrimaryWallet(false, "");
        await finishPrimaryWalletAuthentication(result, false);
      } catch (error) {
        showFeedback(error.message || "Wallet sign-in could not be completed.", "error");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.id === "open-account-hub") {
      closeDialog();
      navigateToAccount();
    }
  });

  dashboardContent.addEventListener("change", function (event) {
    if (event.target && event.target.id === "account-linked-wallet-provider") {
      linkedWalletCandidate = null;
      var addressField = document.getElementById("account-linked-wallet-address-field");
      var addressSelect = document.getElementById("account-linked-wallet-address");
      if (addressField) addressField.hidden = true;
      if (addressSelect) addressSelect.innerHTML = '<option value="">Connect the selected wallet first</option>';
      var consent = document.getElementById("account-linked-wallet-permission");
      if (consent) consent.checked = false;
      showLinkedWalletFeedback("Provider selection changed. Connect the selected wallet again before choosing an address.", "info");
    }
  });

  dashboardContent.addEventListener("click", async function (event) {
    var button = event.target.closest("button");
    if (!button || busy) return;
    if (button.id === "open-account-communications") {
      window.location.hash = "communications";
      return;
    }
    if (button.id === "account-admin-wallet-access" || button.id === "open-admin-dashboard") {
      document.dispatchEvent(new CustomEvent("astrocrown:request-admin-wallet-access"));
      return;
    }
    if (button.id === "account-linked-wallet-refresh") {
      setBusy(true);
      try {
        await discoverAdditionalWalletProviders();
      } catch (error) {
        showLinkedWalletFeedback(error.message || "Wallet discovery could not be completed.", "error");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.id === "account-linked-wallet-connect") {
      setBusy(true);
      try {
        await connectAdditionalWalletForSelection();
      } catch (error) {
        showLinkedWalletFeedback(error.message || "The additional wallet could not be connected.", "error");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.id === "account-linked-wallet-link") {
      setBusy(true);
      try {
        await linkAdditionalWallet();
      } catch (error) {
        showLinkedWalletFeedback(error.message || "The additional wallet could not be linked.", "error");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.dataset.linkedWalletUnlink === "true") {
      var linkedAddress = button.dataset.walletAddress || "";
      var linkedChainId = Number(button.dataset.walletChainId);
      setBusy(true);
      try {
        await unlinkAdditionalWallet(linkedAddress, linkedChainId);
      } catch (error) {
        showLinkedWalletFeedback(error.message || "The additional wallet could not be unlinked.", "error");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (button.id === "acknowledge-admin-revocation") {
      var noticeId = button.getAttribute("data-notice-id");
      setBusy(true);
      try {
        accountState = await requestJson("/api/account/administrator-notice/acknowledge", { noticeId: noticeId });
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
        if (avatarFeedback) avatarFeedback.textContent = "Avatar updated for this AstroCrown account.";
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
    if (!window.confirm(
      "Disconnect your permanent owner wallet from this AstroCrown session and log out? " +
      "Your account will remain bound to this exact owner wallet. To sign in again, you must reconnect and authenticate with the same owner wallet. " +
      "Additional linked wallets cannot replace it or restore account access. This only ends your AstroCrown session; it does not delete your account or change the browser wallet’s permissions for other websites."
    )) return;
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
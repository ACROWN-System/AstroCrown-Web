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
  var memberNameApplyEnabled = false;
  var memberNameCheckSequence = 0;
  var memberNameCheckTimer = null;
  var availableMemberName = "";
  var selectedPrimaryWalletId = "";
  var primaryWalletCatalogue = [];
  var primaryWalletCatalogueReady = false;
  var primaryWalletCataloguePromise = null;
  var primaryWalletBrandPresentation = {
    metamask: { name: "MetaMask", logo: "https://www.web3icons.com/svgs/wallets/branded/metamask.svg?v=4.0.58", initials: "MM" },
    "trust-wallet": { name: "Trust Wallet", logo: "https://www.web3icons.com/svgs/wallets/branded/trust.svg?v=4.0.58", initials: "TW" },
    "okx-wallet": { name: "OKX Wallet", logo: "https://www.web3icons.com/svgs/wallets/branded/okx.svg?v=4.0.58", initials: "OKX" },
    "bitget-wallet": { name: "Bitget Wallet", logo: "https://web3.bitget.com/bgwactivity-static/_next/static/media/Bitget-Wallet-Logomark.07wqb3-5_b2ml.svg", initials: "BG" },
    tokenpocket: { name: "TokenPocket", logo: "https://www.web3icons.com/svgs/wallets/branded/token-pocket.svg?v=4.0.58", initials: "TP" },
    coin98: { name: "Coin98", logo: "https://www.web3icons.com/svgs/wallets/branded/coin98.svg?v=4.0.58", initials: "C98" }
  };
  var termsVersion = "development-terms-2026-10-31-v0.3";
  var loopbackHosts = ["localhost", "127.0.0.1", "::1"];
  var queryParams = new URLSearchParams(window.location.search);
  var forceBrowserDemo = queryParams.get("account-preview-demo") === "1";
  var liveTestHost = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.trycloudflare\.com$/i.test(window.location.hostname);
  var liveTestMode = queryParams.get("account-live-test") === "1" &&
    window.location.protocol === "https:" && liveTestHost;
  var browserPreviewMode = forceBrowserDemo ||
    (!liveTestMode && loopbackHosts.indexOf(window.location.hostname) === -1);
  // Wallet ownership is the only supported ordinary-account authentication mode.
  var walletPrimaryUiMode = true;
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

  function encodeBase64urlBytes(bytes) {
    var binary = "";
    for (var i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  async function loadPrimaryWalletCatalogue() {
    if (primaryWalletCataloguePromise) return primaryWalletCataloguePromise;
    primaryWalletCataloguePromise = import("/supporters/wallet-provider-adapters.mjs").then(function (adapters) {
      primaryWalletCatalogue = adapters.discoverPrimaryWalletProviders(window);
      primaryWalletCatalogueReady = true;
      if (!selectedPrimaryWalletId) {
        var firstAvailable = primaryWalletCatalogue.find(function (wallet) { return wallet.networks.length > 0; });
        selectedPrimaryWalletId = firstAvailable ? firstAvailable.id : "metamask";
      }
      if (mode === "signin" || mode === "create") renderWalletPrimaryStatus();
      return primaryWalletCatalogue;
    }).catch(function () {
      primaryWalletCatalogueReady = true;
      primaryWalletCatalogue = [];
      if (mode === "signin" || mode === "create") renderWalletPrimaryStatus();
      return primaryWalletCatalogue;
    });
    return primaryWalletCataloguePromise;
  }

  function selectedPrimaryWalletEntry() {
    return primaryWalletCatalogue.find(function (wallet) {
      return wallet.id === selectedPrimaryWalletId;
    }) || null;
  }

  async function obtainPrimaryWalletProof(intent, network, walletId, payload) {
    var adapters = await import("/supporters/wallet-provider-adapters.mjs");
    var wallet = adapters.selectedPrimaryWalletProvider(primaryWalletCatalogue, walletId, network);
    if (!wallet) {
      throw new Error("The selected wallet does not expose exactly one compatible " + network.toUpperCase() +
        " provider. Reconnect the intended wallet or resolve duplicate wallet extensions first.");
    }

    var address = "";
    var signature = "";
    if (network === "ethereum") {
      var evm = wallet.provider;
      var accounts = await evm.request({ method: "eth_requestAccounts" });
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
        throw new Error(wallet.name + " did not return an Ethereum account.");
      }
      address = accounts[0];
      var chainId = await evm.request({ method: "eth_chainId" });
      if (String(chainId).toLowerCase() !== "0x1") {
        throw new Error("Switch " + wallet.name + " to Ethereum Mainnet (Chain ID 1). No transaction will be submitted.");
      }
      var challengeEvm = await requestJson("/api/wallet-auth/challenge", Object.assign({}, payload, {
        intent: intent, network: network, address: address
      }));
      var currentAccounts = await evm.request({ method: "eth_accounts" });
      var currentChain = await evm.request({ method: "eth_chainId" });
      if (!Array.isArray(currentAccounts) || !currentAccounts.some(function (item) {
        return String(item).toLowerCase() === String(address).toLowerCase();
      }) || String(currentChain).toLowerCase() !== "0x1") {
        throw new Error("The active Ethereum account or network changed. Start the wallet sign-in again.");
      }
      signature = await evm.request({
        method: "personal_sign",
        params: [adapters.encodeEvmPersonalSignMessage(challengeEvm.message), address]
      });
      var verifiedAccounts = await evm.request({ method: "eth_accounts" });
      var verifiedChain = await evm.request({ method: "eth_chainId" });
      if (!Array.isArray(verifiedAccounts) || !verifiedAccounts.some(function (item) {
        return String(item).toLowerCase() === String(address).toLowerCase();
      }) || String(verifiedChain).toLowerCase() !== "0x1") {
        throw new Error("The active Ethereum account or network changed while signing. No account session was created.");
      }
      return requestJson("/api/wallet-auth/verify", {
        intent: intent, challengeId: challengeEvm.challengeId, signature: signature
      });
    }

    if (network === "tron") {
      var tronEntry = wallet;
      var tronWeb = tronEntry.tronWeb;
      if (!tronWeb || !adapters.hasTronMessageSigner(tronWeb)) {
        throw new Error(wallet.name + " does not expose the required off-chain signMessageV2 method on TRON.");
      }
      await tronEntry.provider.request({ method: tronEntry.connectMethod });
      var tronHost = tronWeb.fullNode && tronWeb.fullNode.host || "";
      var tronUrl;
      try { tronUrl = new URL(tronHost); } catch (_error) { tronUrl = null; }
      address = tronWeb.defaultAddress && tronWeb.defaultAddress.base58 || "";
      if (!address || !tronUrl || tronUrl.protocol !== "https:" || tronUrl.hostname !== "api.trongrid.io") {
        throw new Error("The selected wallet could not verify the approved TRON Mainnet endpoint. No signature was requested.");
      }
      var challengeTron = await requestJson("/api/wallet-auth/challenge", Object.assign({}, payload, {
        intent: intent, network: network, address: address
      }));
      signature = await tronWeb.trx.signMessageV2(challengeTron.message);
      var tronFinalUrl;
      try { tronFinalUrl = new URL(tronWeb.fullNode && tronWeb.fullNode.host || ""); } catch (_error) { tronFinalUrl = null; }
      if (!tronWeb.defaultAddress || tronWeb.defaultAddress.base58 !== address ||
          !tronFinalUrl || tronFinalUrl.protocol !== "https:" || tronFinalUrl.hostname !== "api.trongrid.io" ||
          tronWeb.fullNode.host !== tronHost) {
        throw new Error("The active TRON account or Mainnet endpoint changed while signing. No account session was created.");
      }
      return requestJson("/api/wallet-auth/verify", {
        intent: intent, challengeId: challengeTron.challengeId, signature: signature
      });
    }

    if (network === "solana") {
      var solana = wallet.adapter || wallet.provider;
      var connected = await solana.features["standard:connect"].connect();
      var solanaAccount = connected.accounts && connected.accounts[0];
      if (!solanaAccount || !adapters.isSolanaMainnet(solanaAccount)) {
        throw new Error("The selected wallet did not prove Solana Mainnet. Switch to Mainnet and reconnect.");
      }
      address = solanaAccount.address;
      var challengeSolana = await requestJson("/api/wallet-auth/challenge", Object.assign({}, payload, {
        intent: intent, network: network, address: address
      }));
      var signed = await solana.features["solana:signMessage"].signMessage({
        account: solanaAccount,
        message: new TextEncoder().encode(challengeSolana.message)
      });
      if (!Array.isArray(signed) || !signed[0] || !signed[0].signature) {
        throw new Error("The selected Solana wallet did not return a supported message signature.");
      }
      var returnedSolanaAccount = signed[0].account;
      if (returnedSolanaAccount && (
        returnedSolanaAccount.address !== address || !adapters.isSolanaMainnet(returnedSolanaAccount)
      )) {
        throw new Error("The selected Solana wallet changed accounts or network while signing. No account session was created.");
      }
      var solanaAfterSign = await solana.features["standard:connect"].connect();
      var stillConnectedSolana = solanaAfterSign.accounts && solanaAfterSign.accounts.find(function (item) {
        return item.address === address && adapters.isSolanaMainnet(item);
      });
      if (!stillConnectedSolana) {
        throw new Error("The primary Solana wallet or Mainnet connection changed while signing. No account session was created.");
      }
      signature = encodeBase64urlBytes(signed[0].signature);
      return requestJson("/api/wallet-auth/verify", {
        intent: intent, challengeId: challengeSolana.challengeId, signature: signature
      });
    }
    throw new Error("The selected wallet has no supported primary identity network.");
  }
  async function finishPrimaryWalletAuthentication(intent, payload) {
    var networkControl = document.getElementById("account-wallet-network");
    var selectedNetwork = networkControl && networkControl.value;
    if (!selectedPrimaryWalletId || !selectedNetwork) {
      throw new Error("Choose a detected wallet brand and one of its supported identity networks first.");
    }
    await obtainPrimaryWalletProof(intent, selectedNetwork, selectedPrimaryWalletId, payload);
    var refreshed = await requestJson("/api/account/status");
    if (refreshed.authenticated !== true || refreshed.authMethod !== "primary-wallet" || !refreshed.primaryWallet) {
      throw new Error("The wallet proof was accepted but the account session could not be independently confirmed.");
    }
    accountState = refreshed;
    successKind = intent === "register" ? "wallet-register" : "wallet-login";
    syncAccountButton();
    if (intent === "login") {
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
      throw new Error(
        (typeof workerStagingMode !== "undefined" && workerStagingMode)
          ? "The AstroCrown staging account service is not responding. The account has not been changed."
          : (liveTestMode ? "The temporary HTTPS test service is not responding." : "The local AstroCrown account Worker is not responding.")
      );
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
        walletAuthenticationAvailable: false,
        walletAuthenticationNetworks: ["ethereum", "tron", "solana"],
        activeSessionCount: 0,
        scope: "hosted-preview-no-authentication"
      };
    }
    if (path === "/api/account/logout") {
      return { authenticated: false, message: "No account session exists in this hosted preview." };
    }
    throw new Error(
      "The hosted HTML preview is read-only. Use the qualified AstroCrown Worker to create an account or sign in with a wallet."
    );
  }

  function setBusy(value) {
    busy = value;
    [content, dashboardContent, adminDashboardContent, communicationsContent].filter(Boolean).forEach(function (container) {
      Array.prototype.forEach.call(container.querySelectorAll("button, input"), function (element) {
        if (element.dataset.keepEnabled === "true") return;
        var memberNameDisabled = element.id === "account-member-name-apply" && !memberNameApplyEnabled;
        element.disabled = value || memberNameDisabled ||
          element.dataset.originalDisabled === "true";
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
    var staging = typeof workerStagingMode !== "undefined" && workerStagingMode;
    var noticeMode = staging ? "wallet-primary-public-test" : "wallet-primary-local-test";
    var noticeText = staging
      ? "ASTROCROWN LIVE PUBLIC TEST — Use invented, non-identifying details. Public submissions may be visible to anyone on the internet. Never disclose personal information, production credentials, seed phrases, private keys or wallet recovery secrets. Only explicitly marked LIVE features are functional in their named environment."
      : "LOCAL WALLET ACCOUNT TEST ONLY — This local service verifies wallet ownership using off-chain messages. Use a wallet you control and synthetic account details only. No transaction, approval or payment is requested.";
    return '<p class="account-demo-notice" id="account-demo-notice" data-mode="' + noticeMode + '">' +
      noticeText + '</p>';
  }

  function selectedPrimaryWalletNetworkList() {
    return primaryWalletCatalogue.find(function (wallet) {
      return wallet.id === selectedPrimaryWalletId;
    }) || null;
  }

  function renderPrimaryWalletBrandChoices() {
    var brandIds = ["metamask", "trust-wallet", "okx-wallet", "bitget-wallet", "tokenpocket", "coin98"];
    return '<section class="account-wallet-picker" aria-labelledby="account-wallet-picker-title">' +
      '<div class="account-wallet-picker-heading"><span>01</span><div><strong id="account-wallet-picker-title">Choose your wallet</strong><small>Select the wallet application you actually use.</small></div></div>' +
      '<div class="account-wallet-brand-grid">' +
      brandIds.map(function (walletId) {
        var presentation = primaryWalletBrandPresentation[walletId];
        var detected = primaryWalletCatalogue.find(function (wallet) { return wallet.id === walletId; });
        var networks = detected ? detected.networks : [];
        var ambiguous = detected ? detected.ambiguousNetworks : [];
        var selected = walletId === selectedPrimaryWalletId;
        var availability = primaryWalletCatalogueReady
          ? (networks.length ? networks.map(function (network) {
              return network === "ethereum" ? "Ethereum" : network === "tron" ? "TRON" : "Solana";
            }).join(" · ") + " detected" : "Not detected in this browser")
          : "Checking browser";
        return '<button type="button" class="account-wallet-brand-choice' + (selected ? ' is-selected' : '') +
          '" data-primary-wallet="' + walletId + '" aria-pressed="' + (selected ? "true" : "false") + '">' +
          '<span class="account-wallet-brand-logo"><span aria-hidden="true">' + escapeHtml(presentation.initials) + '</span>' +
          '<img src="' + escapeHtml(presentation.logo) + '" alt="" aria-hidden="true" loading="lazy" referrerpolicy="no-referrer"></span>' +
          '<span class="account-wallet-brand-copy"><strong>' + escapeHtml(presentation.name) + '</strong>' +
          '<small>' + escapeHtml(availability) + '</small>' +
          (ambiguous.length ? '<small class="account-wallet-warning">More than one provider detected for ' + escapeHtml(ambiguous.join(", ")) + '</small>' : '') +
          '</span><span class="account-wallet-brand-check" aria-hidden="true">' + (selected ? '✓' : '') + '</span></button>';
      }).join("") +
      '</div>' +
      (!primaryWalletCatalogueReady
        ? '<p class="account-wallet-detection" role="status">Detecting supported wallets in this browser…</p>'
        : '<p class="account-wallet-detection" role="status">' + (primaryWalletCatalogue.some(function (wallet) { return wallet.networks.length > 0; })
          ? 'Choose a detected wallet. Your browser may expose different public addresses on different networks.'
          : 'No supported wallet is currently detected. Install or unlock one of the listed wallet applications, then reload this page.') + '</p>') +
      '</section>';
  }

  function renderPrimaryIdentityNetworkChoice() {
    var wallet = selectedPrimaryWalletNetworkList();
    var networks = wallet ? wallet.networks : [];
    if (!networks.length) {
      selectedPrimaryNetwork = "";
      return '<label class="account-field" for="account-wallet-network">02 · Network used for identity proof' +
        '<select id="account-wallet-network" name="network" disabled><option value="">No supported network detected for this wallet</option></select>' +
        '</label><p class="account-wallet-network-note">The network is shown only to identify which public wallet address will prove account ownership. It is not a payment or currency selection.</p>';
    }
    if (networks.indexOf(selectedPrimaryNetwork) === -1) selectedPrimaryNetwork = networks[0];
    var labels = {
      ethereum: "Ethereum Mainnet · EIP-191 message",
      tron: "TRON Mainnet · TIP-191 message",
      solana: "Solana Mainnet · Ed25519 message"
    };
    var duplicate = wallet.ambiguousNetworks.indexOf(selectedPrimaryNetwork) >= 0;
    return '<label class="account-field" for="account-wallet-network">02 · Network used for identity proof' +
      '<select id="account-wallet-network" name="network">' +
      networks.map(function (network) {
        return '<option value="' + network + '"' + (network === selectedPrimaryNetwork ? ' selected' : '') + '>' +
          labels[network] + '</option>';
      }).join("") +
      '</select></label>' +
      '<p class="account-wallet-network-note">' + (duplicate
        ? 'More than one ' + selectedPrimaryNetwork.toUpperCase() + ' provider was detected for this brand. Resolve the duplicate provider before signing.'
        : 'This selects the network for your primary-wallet identity proof only. It is not a payment or currency selection.') + '</p>';
  }

  function renderWalletPrimaryStatus() {
    if (!primaryWalletCatalogueReady) loadPrimaryWalletCatalogue();
    var wallet = selectedPrimaryWalletNetworkList();
    var networks = wallet ? wallet.networks : [];
    if (networks.length && networks.indexOf(selectedPrimaryNetwork) === -1) selectedPrimaryNetwork = networks[0];
    var ambiguous = wallet && wallet.ambiguousNetworks.indexOf(selectedPrimaryNetwork || networks[0]) >= 0;
    var selectedNetworkAvailable = Boolean(wallet && selectedPrimaryNetwork && networks.indexOf(selectedPrimaryNetwork) >= 0);
    var enabled = accountState.walletAuthenticationAvailable === true &&
      primaryWalletCatalogueReady && selectedNetworkAvailable && !ambiguous;
    var networkControl = renderPrimaryIdentityNetworkChoice();
    var controls = mode === "create"
      ? '<form id="account-wallet-register-form" class="account-form" autocomplete="off">' +
          renderPrimaryWalletBrandChoices() +
          networkControl +
          '<label class="account-field" for="account-wallet-referral">Referral ID (Optional)' +
            '<input id="account-wallet-referral" name="referralId" maxlength="64" autocomplete="off" placeholder="Enter referral ID...">' +
          '</label>' +
          '<label class="account-consent account-terms-consent" for="account-wallet-terms">' +
            '<input id="account-wallet-terms" type="checkbox" required>' +
            '<span>By proceeding, you agree to AstroCrown’s <a href="./account-continuity/prototype/terms-of-use.html" target="_blank" rel="noopener noreferrer">Terms of Use</a> and <a href="./account-continuity/prototype/privacy-policy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</span>' +
          '</label>' +
          '<button class="account-primary" type="submit" id="account-wallet-register"' + (enabled ? '' : ' disabled') + '>Create account with selected wallet</button>' +
        '</form>'
      : '<div class="account-form">' +
          renderPrimaryWalletBrandChoices() +
          networkControl +
          '<button class="account-primary" type="button" id="account-wallet-auth" data-intent="login"' + (enabled ? '' : ' disabled') + '>Sign in with selected wallet</button>' +
        '</div>';
    content.innerHTML = renderTabs(mode) + renderDevelopmentNotice() +
      controls +
      '<p class="account-signin-help"><a href="./account-continuity/prototype/wallet-identity-assurance.html" target="_blank" rel="noopener noreferrer">Why a primary wallet?</a></p>' +
      '<div class="account-provider-note"><strong>Your primary wallet is your only account identity and recovery anchor.</strong><br>Restore access to the same wallet through that wallet provider’s own recovery process. Additional wallets cannot sign in to or recover this account. AstroCrown never requests or stores a seed phrase or private key.</div>' +
      '<p class="account-provider-note">Wallet proof is an off-chain message signature only. It does not submit a transaction, approve a contract, transfer assets or pay gas. The selected network identifies the public address being verified; it is not a payment selection.</p>' +
      (!enabled
        ? '<p class="account-dialog-description">' + (accountState.walletAuthenticationAvailable !== true
            ? 'Wallet-only account access is not enabled on this read-only preview. Account creation and sign-in require the qualified AstroCrown Worker.'
            : !primaryWalletCatalogueReady
              ? 'Checking for supported wallet applications…'
              : !selectedNetworkAvailable
                ? 'Select a wallet application detected in this browser and one of its supported networks.'
                : 'Resolve the duplicate provider for this wallet brand and network before continuing.') + '</p>'
        : '<p class="account-dialog-description">The wallet provider will show the exact domain-bound message before signing. Review it carefully. No transaction, network fee, payment or token approval is requested.</p>') +
      '<p class="account-signin-help"><a href="./account-continuity/prototype/terms-of-use.html" target="_blank" rel="noopener noreferrer">Test Terms &amp; Conditions</a> · <a href="./account-continuity/prototype/privacy-policy.html" target="_blank" rel="noopener noreferrer">Privacy Notice</a></p>';
    content.querySelectorAll(".account-wallet-brand-choice img").forEach(function (image) {
      image.addEventListener("error", function () { image.hidden = true; });
    });
  }
  function renderSignIn() {
    mode = "signin";
    renderWalletPrimaryStatus();
  }

  function renderCreate() {
    mode = "create";
    renderWalletPrimaryStatus();
  }

  function renderRecover() {
    content.innerHTML = renderDevelopmentNotice() +
      '<p class="account-dialog-description">AstroCrown cannot reset or recover a primary wallet. Restore access to the same wallet through its own wallet-provider recovery process.</p>' +
      '<p class="account-provider-note">A different wallet cannot take over this account. Never share a seed phrase, private key or wallet recovery secret.</p>' +
      '<p class="account-signin-help"><button class="account-text-button" type="button" data-account-mode="signin">Back to sign in</button></p>';
  }

  function renderSuccess() {
    var created = successKind === "wallet-register";
    var heading = created ? "Your AstroCrown account is ready" : "You're signed in";
    var primaryWallet = accountState.primaryWallet || {};
    var message = "Your primary wallet has been verified by an off-chain message signature. No transaction, token approval, payment or asset transfer was made.";
    content.innerHTML =
      '<div class="account-success-panel">' +
        '<div class="account-success-mark" aria-hidden="true">✓</div>' +
        '<h3 class="account-success-heading">' + escapeHtml(heading) + '</h3>' +
        '<p class="account-success-copy">' + escapeHtml(message) + '</p>' +
        (created
          ? '<section class="account-recovery-key-panel"><h3>Primary wallet identity established</h3>' +
              '<p>Default member name: <strong>' + escapeHtml(accountState.memberName || "Not yet available") + '</strong></p>' +
              '<p>You can customize this unique public name from your User dashboard.</p>' +
              '<p>Account identifier: <strong>' + escapeHtml(accountState.accountIdentifier || "") + '</strong></p>' +
              '<p>Primary wallet: ' + escapeHtml(primaryWallet.network || "") + ' · ' + escapeHtml(primaryWallet.address || "") + '</p>' +
              '<p>Keep control of this same wallet through its provider recovery method. AstroCrown cannot reset, replace or transfer the identity.</p></section>'
          : '') +
        '<button class="account-primary" type="button" id="open-account-hub">Open your dashboard</button>' +
        '<p class="account-success-small">Your session remains active until it expires or you sign out. You can close the dialog at any time.</p>' +
      '</div>';
  }

  function setMemberNameStatus(message, kind, canApply) {
    memberNameApplyEnabled = canApply === true;
    var status = document.getElementById("account-member-name-status");
    if (status) {
      status.textContent = message || "";
      status.dataset.state = kind || "info";
    }
    var button = document.getElementById("account-member-name-apply");
    if (button) button.disabled = busy || !memberNameApplyEnabled;
  }

  function scheduleMemberNameAvailabilityCheck() {
    var input = document.getElementById("account-member-name-input");
    if (!input) return;
    var proposedName = input.value;
    var normalizedProposedName = proposedName.normalize("NFKC").trim();
    var sequence = ++memberNameCheckSequence;
    availableMemberName = "";
    memberNameApplyEnabled = false;
    if (memberNameCheckTimer) window.clearTimeout(memberNameCheckTimer);
    var currentName = String(accountState.memberName || "");
    if (normalizedProposedName.toLowerCase() === currentName.toLowerCase()) {
      setMemberNameStatus("This is your current member name.", "available", false);
      return;
    }
    if (/[\u0000-\u001F\u007F]/.test(proposedName) ||
        !/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(normalizedProposedName)) {
      setMemberNameStatus("Use 3–20 characters: start with a letter and use only letters, numbers or underscores.", "invalid", false);
      return;
    }
    setMemberNameStatus("Checking username availability…", "checking", false);
    memberNameCheckTimer = window.setTimeout(async function () {
      try {
        var result = await requestJson("/api/account/member-name/check", { memberName: proposedName });
        if (sequence !== memberNameCheckSequence) return;
        if (result.available === true && result.unchanged !== true) {
          availableMemberName = result.memberName;
          setMemberNameStatus("Username available. You can apply this name.", "available", true);
        } else if (result.unchanged === true) {
          setMemberNameStatus("This is your current member name.", "available", false);
        } else {
          setMemberNameStatus("Username is already taken. Please choose another.", "unavailable", false);
        }
      } catch (error) {
        if (sequence !== memberNameCheckSequence) return;
        setMemberNameStatus(error.message || "Could not verify this username. Try again.", "error", false);
      }
    }, 350);
  }

  function renderAccountDashboard() {
    if (!accountState || !accountState.authenticated || !accountState.primaryWallet) return;
    memberNameCheckSequence += 1;
    availableMemberName = "";
    memberNameApplyEnabled = false;
    if (memberNameCheckTimer) window.clearTimeout(memberNameCheckTimer);

    var identifier = escapeHtml(accountState.accountIdentifier || "AstroCrown member");
    var memberName = escapeHtml(accountState.memberName || "AstroCrown member");
    var primaryWallet = accountState.primaryWallet;
    var walletNetworkLabel = primaryWallet.network === "ethereum" ? "Ethereum Mainnet"
      : primaryWallet.network === "tron" ? "TRON Mainnet"
      : primaryWallet.network === "solana" ? "Solana Mainnet" : "Unsupported or unavailable";
    var referral = accountState.referralId
      ? escapeHtml(accountState.referralId) + ' <span class="account-muted-inline">(unverified; no reward is applied)</span>'
      : "Not supplied";
    var activeSessionCount = Math.max(1, Number(accountState.activeSessionCount || 1));
    var communicationsCounts = accountState.communicationsUnreadCounts || {};
    var unreadCommunicationCount = Math.max(0, Number(communicationsCounts.alerts || 0)) +
      Math.max(0, Number(communicationsCounts.messages || 0));

    var dashboardNotice =
      '<div class="account-dashboard-notice"><strong>AstroCrown User dashboard.</strong> Your primary wallet is the sole identity and sign-in anchor for this account. Administrator authority, when separately assigned, requires its own wallet verification.</div>';
    var securityCard =
      '<section class="account-dashboard-card"><h2>Security &amp; sign-in</h2>' +
        '<span class="account-dashboard-status">Primary wallet identity</span>' +
        '<p class="account-dashboard-value">' + escapeHtml(walletNetworkLabel) + '</p>' +
        '<p class="account-dashboard-value">Primary address: ' + escapeHtml(primaryWallet.address || "Unavailable") + '</p>' +
        '<p>Account ownership was verified by an origin-bound off-chain message signature. No transaction, token approval, asset transfer or gas payment was made.</p>' +
        '<p class="account-session-count">Active sign-in sessions: ' + String(activeSessionCount) + '.</p>' +
        '<a href="./account-continuity/prototype/wallet-identity-assurance.html" target="_blank" rel="noopener noreferrer">Read wallet identity assurance</a></section>';
    var transactionWalletCard =
      '<section class="account-dashboard-card"><h2>Transaction wallets</h2>' +
        '<p class="account-dashboard-value">Not enabled</p>' +
        '<p>You do not need another wallet to use your account. Any future transaction wallet will remain separate from account identity.</p></section>';
    var accountRecoveryCard =
      '<section class="account-dashboard-card"><h2>Account recovery</h2>' +
        '<p class="account-dashboard-value">Same primary wallet only</p>' +
        '<p>Restore access to this same wallet through its own provider recovery process. AstroCrown cannot reset, replace, transfer or recover the wallet or move the identity, badges or account history to another address. Never share a seed phrase or private key.</p></section>';

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

    var adminCard = "";
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
          ? "All previously enrolled administrator wallets are inactive. Your ordinary primary-wallet account remains available, but a new wallet cannot restore administrator authority. A separate owner-authorized recovery review is required."
          : walletCount > 0
            ? "This account has an administrator role assigned by the system. The server will recheck your account and ask you to choose one of the " +
              escapeHtml(String(walletCount)) +
              " registered administrator wallets, then review a one-time off-chain signature request."
            : "This existing account has been granted the administrator role, but has not enrolled an administrator wallet yet. The primary identity wallet and administrator access wallet have separate purposes.";
      adminCard =
        '<section class="account-dashboard-card account-admin-access-card">' +
          '<h2>Administrator access</h2>' +
          '<span class="account-dashboard-status">' + escapeHtml(adminAccessStatus) + '</span>' +
          '<p>' + adminAccessDescription + '</p>' +
          '<div class="account-admin-access-actions">' +
            '<button class="account-primary" type="button" id="account-admin-wallet-access"' +
              (adminWalletRecoveryRequired ? ' disabled title="Owner-authorized wallet recovery is required before administrator access can resume."' : '') +
              '>' + (adminWalletRecoveryRequired ? "Administrator recovery required" : "Open administrator dashboard") + '</button>' +
            (adminSessionVerified ? '<button class="account-secondary" type="button" id="end-admin-access">End admin access</button>' : '') +
          '</div>' +
          '<p id="account-admin-access-feedback" class="account-avatar-feedback" role="status" aria-live="polite"></p>' +
        '</section>';
    }

    dashboardContent.innerHTML =
      dashboardNotice + administratorRevocationNotice +
      '<div class="account-dashboard-welcome">' +
        '<div class="account-dashboard-avatar account-avatar-' + normalizeAvatarId(accountState.avatarId) + '" aria-hidden="true">' +
          avatarSvg(accountState.avatarId, "account-dashboard-avatar-svg") +
        '</div>' +
        '<div class="account-dashboard-welcome-copy"><strong>' + memberName + '</strong><span>Signed in with primary wallet · ' + escapeHtml(walletNetworkLabel) + ' · Account ID ' + identifier + '</span></div>' +
      '</div>' +
      '<div class="account-dashboard-grid">' +
        '<section class="account-dashboard-card account-member-name-card"><h2>Your public member name</h2><p>This unique name identifies you across AstroCrown. It is separate from your account ID and primary wallet address.</p><label class="account-member-name-field" for="account-member-name-input">Member name<input id="account-member-name-input" type="text" maxlength="20" minlength="3" autocomplete="off" autocapitalize="none" spellcheck="false" value="' + memberName + '" aria-describedby="account-member-name-status"></label><p id="account-member-name-status" class="account-member-name-status" data-state="info" role="status" aria-live="polite">Enter a new name to check whether it is available.</p><button class="account-primary account-member-name-apply" type="button" id="account-member-name-apply" disabled>Apply name</button><p class="account-member-name-hint">3–20 characters. Start with a letter; use letters, numbers and underscores. Names are unique regardless of capitalization.</p></section>' +
        '<section class="account-dashboard-card account-communications-card"><h2>Alerts &amp; Messages</h2><p class="account-dashboard-value">' + String(unreadCommunicationCount) + ' pending</p><p>Account notifications are shown here when the communications service is enabled.</p><button class="account-primary" type="button" id="open-account-communications">Open communications</button></section>' +
        '<section class="account-dashboard-card account-user-services-card"><h2>AstroCrown services</h2><p class="account-dashboard-value">Shared member workspace</p><p>Personal activity and transactions belong to this User dashboard and remain subject to the same member rules for every account.</p><p>Transaction workflows and other service modules are not enabled in this release.</p></section>' +
        '<section class="account-dashboard-card account-profile-card"><h2>Profile &amp; avatar</h2><p class="account-dashboard-value">Account created: ' + escapeHtml(accountState.createdAt || "Recorded in account state") + '</p><p>Choose from built-in AstroCrown avatars. No image upload or external image service is used.</p><div id="account-avatar-picker" class="account-avatar-picker" role="group" aria-label="Choose account avatar">' + renderAvatarChoices(accountState.avatarId) + '</div><p id="account-avatar-feedback" class="account-avatar-feedback" role="status">Your selected avatar appears here and in the circular header control.</p></section>' +
        securityCard + transactionWalletCard + accountRecoveryCard +
        '<section class="account-dashboard-card"><h2>Referral ID</h2><p class="account-dashboard-value">' + referral + '</p><p>Referral values are not verified and do not trigger rewards or benefits in this prototype.</p></section>' +
        '<section class="account-dashboard-card"><h2>Account data</h2><p>Email address and phone number are not collected for account authentication. Terms acceptance is recorded by the account service.</p></section>' +
        '<section class="account-dashboard-card"><h2>Feedback &amp; case access</h2><p>Case and grievance services are not enabled in this account release.</p></section>' +
        adminCard +
      '</div>' +
      '<div class="account-dashboard-actions"><p>Administrator functions remain separately gated. Your ordinary primary identity does not itself grant administrator privileges.</p><button class="account-secondary" type="button" id="account-signout">Sign out</button></div>';

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
          '<p>Grant the role to an existing AstroCrown user account. The target keeps the same User dashboard and must enrol a wallet they personally control. Use the account identifier shown in that member\'s User dashboard; it is a reference only, not an authenticator. No email, secondary wallet address, password or private key is requested.</p>' +
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
      document.dispatchEvent(new CustomEvent("astrocrown:admin-dashboard-visible"));
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
      accountState = { authenticated: false, walletAuthenticationAvailable: false };
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

    if (form.id === "account-wallet-register-form") {
      var walletTerms = document.getElementById("account-wallet-terms");
      if (!walletTerms || walletTerms.checked !== true) {
        showFeedback("Accept the Terms of Use and Privacy Policy before creating an account.", "error");
        if (walletTerms) walletTerms.focus();
        return;
      }
      setBusy(true);
      try {
        await finishPrimaryWalletAuthentication("register", {
          termsAccepted: true,
          termsVersion: termsVersion,
          referralId: formValue(form, "referralId")
        });
      } catch (error) {
        showFeedback(error.message || "Primary-wallet account creation could not be completed.", "error");
      } finally {
        setBusy(false);
      }
      return;
    }

  });

  content.addEventListener("change", function (event) {
    if (event.target && event.target.id === "account-wallet-network") {
      selectedPrimaryNetwork = event.target.value;
      renderWalletPrimaryStatus();
    }
  });

  content.addEventListener("click", async function (event) {
    var button = event.target.closest("button");
    if (!button || busy) return;
    if (button.dataset.accountMode) {
      setMode(button.dataset.accountMode);
      return;
    }
    if (button.dataset.primaryWallet) {
      selectedPrimaryWalletId = button.dataset.primaryWallet;
      var selectedEntry = selectedPrimaryWalletNetworkList();
      selectedPrimaryNetwork = selectedEntry && selectedEntry.networks.length
        ? selectedEntry.networks[0] : "";
      renderWalletPrimaryStatus();
      return;
    }
    if (button.id === "account-wallet-auth") {
      setBusy(true);
      try {
        await finishPrimaryWalletAuthentication(button.dataset.intent || "login", {});
      } catch (error) {
        showFeedback(error.message || "Primary-wallet sign-in could not be completed.", "error");
      } finally {
        setBusy(false);
      }
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

  dashboardContent.addEventListener("input", function (event) {
    if (event.target && event.target.id === "account-member-name-input") {
      scheduleMemberNameAvailabilityCheck();
    }
  });

  dashboardContent.addEventListener("click", async function (event) {
    var button = event.target.closest("button");
    if (!button || busy) return;
    if (button.id === "account-member-name-apply") {
      var nameInput = document.getElementById("account-member-name-input");
      var requestedName = nameInput ? nameInput.value.normalize("NFKC").trim() : "";
      if (!memberNameApplyEnabled || !availableMemberName ||
          requestedName !== availableMemberName) {
        setMemberNameStatus("Check the name again before applying it.", "checking", false);
        return;
      }
      memberNameApplyEnabled = false;
      availableMemberName = "";
      setMemberNameStatus("Applying your member name…", "checking", false);
      setBusy(true);
      try {
        accountState = await requestJson("/api/account/member-name/apply", { memberName: requestedName });
        syncAccountButton();
        renderAccountDashboard();
        setMemberNameStatus("Your member name has been updated.", "available", false);
      } catch (error) {
        var taken = /just been claimed|already taken|unique/i.test(error.message || "");
        setMemberNameStatus(
          taken ? "Username is already taken. Please choose another." : (error.message || "Your member name could not be updated."),
          taken ? "unavailable" : "error",
          false
        );
      } finally {
        setBusy(false);
      }
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
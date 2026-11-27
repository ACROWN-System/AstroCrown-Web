import { identifyWalletCandidate, walletDisplayName, discoverDirectEvmProviders, discoverDirectTronProviders, discoverDirectSolanaWallets, hasTronMessageSigner, isSolanaMainnet, encodeEvmPersonalSignMessage } from "./wallet-provider-adapters.mjs";

(function () {
  "use strict";

  var solanaSelect = document.getElementById("supporter-wallet-choice");
  var solanaConnectButton = document.getElementById("supporter-wallet-connect");
  var solanaClearButton = document.getElementById("supporter-wallet-clear");
  var solanaFeedback = document.getElementById("supporter-wallet-feedback");
  var solanaAddress = document.getElementById("supporter-wallet-address");
  var solanaChain = document.getElementById("supporter-wallet-chain");

  var tronSelect = document.getElementById("supporter-tron-wallet-choice");
  var tronConnectButton = document.getElementById("supporter-tron-wallet-connect");
  var tronClearButton = document.getElementById("supporter-tron-wallet-clear");
  var tronFeedback = document.getElementById("supporter-tron-wallet-feedback");
  var tronAddress = document.getElementById("supporter-tron-wallet-address");
  var tronChain = document.getElementById("supporter-tron-wallet-chain");

  var evmSelect = document.getElementById("supporter-evm-wallet-choice");
  var evmConnectButton = document.getElementById("supporter-evm-wallet-connect");
  var evmClearButton = document.getElementById("supporter-evm-wallet-clear");
  var evmFeedback = document.getElementById("supporter-evm-wallet-feedback");
  var evmAddress = document.getElementById("supporter-evm-wallet-address");
  var evmChain = document.getElementById("supporter-evm-wallet-chain");

  var pseudonymInput = document.getElementById("member-pseudonym");
  var pseudonymDisplay = document.getElementById("member-display-name");
  var randomizeButton = document.getElementById("member-name-randomize");
  var memberProfileState = document.getElementById("member-profile-state");
  var memberMode = document.getElementById("supporter-member-mode");
  var registerWalletButton = document.getElementById("supporter-register-wallet");
  var loginWalletButton = document.getElementById("supporter-login-wallet");
  var linkWalletButton = document.getElementById("supporter-link-wallet");
  var logoutButton = document.getElementById("supporter-logout");
  var walletPurposeSelect = document.getElementById("supporter-wallet-purpose");
  var memberFeedback = document.getElementById("supporter-member-feedback");
  var memberSummary = document.getElementById("supporter-member-summary");
  var memberWalletList = document.getElementById("supporter-member-wallet-list");
  var saveNameButton = document.getElementById("member-name-save");
  var nameAvailability = document.getElementById("member-name-availability");
  var genesisBadgeImage = document.getElementById("genesis-member-badge-image");
  var memberAvatar = document.getElementById("member-avatar");
  var publicDirectoryList = document.getElementById("genesis-public-directory-list");
  var publicTreasuryReceipts = document.getElementById("genesis-public-treasury-receipts");
  var supporterRuntimeEnabled = false;
  var supporterMember = null;
  var purchaseInactivityInterval = null;
  var lastConnectedNetwork = null;

  if (!solanaSelect || !evmSelect || !tronSelect || !pseudonymInput) return;

  var adjectives = [
    "Golden", "Silver", "Stellar", "Cosmic", "Radiant", "Quiet", "Noble",
    "Bright", "Lunar", "Solar", "Infinite", "Crimson", "Azure", "Celestial"
  ];
  var nouns = [
    "Voyager", "Orion", "Nova", "Pioneer", "Comet", "Phoenix", "Atlas",
    "Nebula", "Aurora", "Sentinel", "Explorer", "Crown", "Orbit", "Sovereign"
  ];

  function randomIndex(maximum) {
    var value = new Uint32Array(1);
    window.crypto.getRandomValues(value);
    return value[0] % maximum;
  }

  function generatePseudonym() {
    var suffix = new Uint16Array(1);
    window.crypto.getRandomValues(suffix);
    return adjectives[randomIndex(adjectives.length)] +
      nouns[randomIndex(nouns.length)] + "-" +
      suffix[0].toString(16).toUpperCase().padStart(4, "0");
  }

  function updatePseudonym() {
    var name = pseudonymInput.value.trim();
    pseudonymDisplay.textContent = name || "Choose a public name";
  }

  pseudonymInput.value = generatePseudonym();
  updatePseudonym();
  pseudonymInput.addEventListener("input", updatePseudonym);
  randomizeButton.addEventListener("click", function () {
    pseudonymInput.value = generatePseudonym();
    updatePseudonym();
    solanaFeedback.textContent = "A different display-name suggestion has been generated. It will be reserved only after the primary wallet verifies ownership and the name is confirmed available.";
    solanaFeedback.dataset.state = "neutral";
    if (supporterMember && nameAvailability) {
      nameAvailability.textContent = "Checking availability…";
      nameAvailability.dataset.state = "checking";
      checkDisplayNameAvailability();
    }
  });

  function setFeedback(element, message, state) {
    element.textContent = message;
    element.dataset.state = state || "neutral";
  }

  // ---------------------------------------------------------------------------
  // EVM wallet discovery and display (EIP-6963 first, EIP-1193 fallback).
  // This only requests account exposure and chainId. It never requests signing.
  // ---------------------------------------------------------------------------

  var evmProviders = new Map();
  var evmProviderIds = new WeakMap();
  var nextEvmId = 0;
  var connectedEvm = null;
  var connectedEvmAddress = null;
  var connectedEvmChainId = null;

  function chainName(chainId) {
    var known = {
      "0x1": "Ethereum Mainnet",
      "0x5": "Goerli (deprecated testnet)",
      "0xaa36a7": "Sepolia Testnet",
      "0x89": "Polygon",
      "0x13882": "Polygon Amoy Testnet",
      "0xa4b1": "Arbitrum One",
      "0x66eee": "Arbitrum Sepolia Testnet",
      "0xa": "Optimism",
      "0xaa37dc": "Optimism Sepolia Testnet",
      "0x2105": "Base",
      "0x14a34": "Base Sepolia Testnet",
      "0xe708": "Linea",
      "0x38": "BNB Smart Chain",
      "0x144": "zkSync Era",
      "0x82750": "Scroll"
    };
    var normalized = String(chainId || "").toLowerCase();
    return known[normalized] || (normalized ? "EVM chain " + normalized : "Unknown EVM chain");
  }

  function validEvmAddress(address) {
    return typeof address === "string" && /^0x[0-9a-fA-F]{40}$/.test(address);
  }

  function providerRequest(provider, method, params) {
    if (!provider || typeof provider.request !== "function") {
      return Promise.reject(new Error("This wallet does not expose an EIP-1193 request provider."));
    }
    return provider.request({ method: method, params: params || [] });
  }

  function renderEvmChoices() {
    var previous = evmSelect.value;
    evmSelect.textContent = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = evmProviders.size ? "Select an EVM wallet" : "No EVM browser wallet detected";
    evmSelect.appendChild(placeholder);

    evmProviders.forEach(function (entry, id) {
      var option = document.createElement("option");
      option.value = id;
      option.textContent = entry.name;
      evmSelect.appendChild(option);
    });

    if (previous && evmProviders.has(previous)) evmSelect.value = previous;
    evmSelect.disabled = evmProviders.size === 0;
    evmConnectButton.disabled = evmProviders.size === 0 || Boolean(connectedEvm);
    evmClearButton.disabled = !connectedEvm;
  }

  function updateConnectedEvmAccount(accounts) {
    if (!connectedEvm) return;
    var account = Array.isArray(accounts) ? accounts.find(validEvmAddress) : null;
    if (!account) {
      connectedEvm = null;
      connectedEvmAddress = null;
      connectedEvmChainId = null;
      evmAddress.textContent = "Not connected";
      evmChain.textContent = "No EVM network confirmed";
      evmConnectButton.textContent = "Connect EVM wallet";
      setFeedback(evmFeedback, "The wallet no longer exposes an authorized account.", "neutral");
      renderEvmChoices();
      return;
    }
    connectedEvmAddress = account;
    lastConnectedNetwork = "ethereum";
    evmAddress.textContent = account;
    updateSupporterActionButtons();
    setFeedback(
      evmFeedback,
      "EVM wallet connected for display only. The address is not yet verified as a Genesis primary wallet and no entitlement is activated.",
      "connected"
    );
  }

  function refreshConnectedEvmChain() {
    if (!connectedEvm) return Promise.resolve();
    return providerRequest(connectedEvm.provider, "eth_chainId").then(function (chainId) {
      connectedEvmChainId = String(chainId);
      evmChain.textContent = chainName(connectedEvmChainId) + " (" + connectedEvmChainId + ")";
    }).catch(function () {
      evmChain.textContent = "The wallet did not confirm its current EVM network.";
    });
  }

  function bindEvmEvents(entry) {
    var provider = entry.provider;
    if (typeof provider.on !== "function") return;
    provider.on("accountsChanged", function (accounts) {
      if (connectedEvm && connectedEvm.provider === provider) {
        updateConnectedEvmAccount(accounts);
      }
    });
    provider.on("chainChanged", function (chainId) {
      if (connectedEvm && connectedEvm.provider === provider) {
        connectedEvmChainId = String(chainId);
        evmChain.textContent = chainName(chainId) + " (" + String(chainId) + ")";
        updateSupporterActionButtons();
      }
    });
    provider.on("disconnect", function () {
      if (connectedEvm && connectedEvm.provider === provider) clearEvmConnection();
    });
  }

  function registerEvmProvider(info, provider, legacy) {
    if (!provider || typeof provider.request !== "function") return;
    if (evmProviderIds.has(provider)) return;

    var uuid = info && typeof info.uuid === "string" ? info.uuid : "";
    if (uuid) {
      var duplicate = Array.from(evmProviders.values()).some(function (entry) {
        return entry.uuid && entry.uuid === uuid;
      });
      if (duplicate) return;
    }

    var id = "evm-" + (++nextEvmId);
    var walletId = identifyWalletCandidate(info || {}, provider);
    var name = info && typeof info.name === "string" ? info.name :
      (walletId ? walletDisplayName(walletId) : (provider.isMetaMask ? "MetaMask" : "Injected EVM wallet"));
    var entry = {
      id: id,
      uuid: uuid,
      walletId: walletId,
      name: name,
      rdns: info && typeof info.rdns === "string" ? info.rdns : "",
      provider: provider,
      legacy: Boolean(legacy)
    };
    evmProviders.set(id, entry);
    evmProviderIds.set(provider, id);
    bindEvmEvents(entry);
    renderEvmChoices();
  }

  window.addEventListener("eip6963:announceProvider", function (event) {
    var detail = event && event.detail;
    if (!detail || !detail.info || !detail.provider) return;
    registerEvmProvider(detail.info, detail.provider, false);
  });

  // Listen first, then request provider announcements as required by EIP-6963.
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  discoverDirectEvmProviders(window).forEach(function (entry) {
    registerEvmProvider({ name: entry.name, rdns: entry.rdns }, entry.provider, true);
  });

  // Compatibility fallback for EIP-1193 wallets that have not implemented EIP-6963.
  // Delay briefly so standard announcements can be collected first and avoid duplicates.
  window.setTimeout(function () {
    var injected = window.ethereum;
    if (!injected) return;
    var candidates = Array.isArray(injected.providers) ? injected.providers : [injected];
    candidates.forEach(function (provider) {
      registerEvmProvider(
        { name: walletDisplayName(identifyWalletCandidate({}, provider)) },
        provider,
        true
      );
    });
  }, 250);

  function clearEvmConnection() {
    connectedEvm = null;
    connectedEvmAddress = null;
    connectedEvmChainId = null;
    if (lastConnectedNetwork === "ethereum") lastConnectedNetwork = null;
    evmAddress.textContent = "Not connected";
    evmChain.textContent = "No EVM network confirmed";
    evmConnectButton.textContent = "Connect EVM wallet";
    renderEvmChoices();
    setFeedback(evmFeedback, "Local EVM wallet display cleared. No signing or transaction was requested.", "neutral");
    updateSupporterActionButtons();
  }

  evmSelect.addEventListener("change", renderEvmChoices);
  evmConnectButton.addEventListener("click", async function () {
    var entry = evmProviders.get(evmSelect.value);
    if (!entry) {
      setFeedback(evmFeedback, "Choose a compatible EVM wallet first.", "error");
      return;
    }

    evmConnectButton.disabled = true;
    evmConnectButton.textContent = "Connecting…";
    setFeedback(evmFeedback, "Approve the wallet's account-connection request to share its public EVM address. No signature or transaction is requested.", "neutral");

    try {
      var accounts = await providerRequest(entry.provider, "eth_requestAccounts");
      var account = Array.isArray(accounts) ? accounts.find(validEvmAddress) : null;
      if (!account) throw new Error("The wallet did not return a valid EVM account address.");

      connectedEvm = entry;
      connectedEvmAddress = account;
      lastConnectedNetwork = "ethereum";
      evmAddress.textContent = account;
      await refreshConnectedEvmChain();
      evmConnectButton.textContent = "EVM wallet connected";
      renderEvmChoices();
      evmConnectButton.disabled = true;
      setFeedback(
        evmFeedback,
        "EVM wallet connected. It is not yet verified as the primary Genesis wallet. Use the wallet-identity control below to prove ownership with an off-chain message signature.",
        "connected"
      );
      updateSupporterActionButtons();
    } catch (error) {
      evmConnectButton.textContent = "Connect EVM wallet";
      evmConnectButton.disabled = false;
      setFeedback(
        evmFeedback,
        error && error.message ? error.message : "EVM wallet connection was not completed. No funds were requested.",
        "error"
      );
    }
  });

  evmClearButton.addEventListener("click", clearEvmConnection);

  // ---------------------------------------------------------------------------
  // Solana Wallet Standard discovery and display. No signing/transaction calls.
  // ---------------------------------------------------------------------------

  var solanaWallets = new Map();
  var nextSolanaWalletId = 0;
  var connectedSolana = null;
  var connectedSolanaAccount = null;

  function supportedSolanaWallet(wallet) {
    return Boolean(
      wallet &&
      typeof wallet.name === "string" &&
      wallet.features &&
      wallet.features["standard:connect"] &&
      typeof wallet.features["standard:connect"].connect === "function"
    );
  }

  function renderSolanaChoices() {
    var previous = solanaSelect.value;
    solanaSelect.textContent = "";
    var option = document.createElement("option");
    option.value = "";
    option.textContent = solanaWallets.size ? "Select a Solana wallet" : "No Solana browser wallet detected";
    solanaSelect.appendChild(option);

    solanaWallets.forEach(function (wallet, id) {
      var item = document.createElement("option");
      item.value = id;
      item.textContent = wallet.name;
      solanaSelect.appendChild(item);
    });

    if (previous && solanaWallets.has(previous)) solanaSelect.value = previous;
    solanaSelect.disabled = solanaWallets.size === 0;
    solanaConnectButton.disabled = solanaWallets.size === 0 || Boolean(connectedSolanaAccount);
    solanaClearButton.disabled = !connectedSolanaAccount;
  }

  function clearSolanaConnection(callWalletDisconnect) {
    var wallet = connectedSolana && connectedSolana.wallet;
    if (callWalletDisconnect && wallet && wallet.features &&
        wallet.features["standard:disconnect"] &&
        typeof wallet.features["standard:disconnect"].disconnect === "function") {
      try {
        wallet.features["standard:disconnect"].disconnect();
      } catch (_) {
        // Clearing this page's display does not depend on an optional disconnect feature.
      }
    }

    connectedSolana = null;
    connectedSolanaAccount = null;
    if (lastConnectedNetwork === "solana") lastConnectedNetwork = null;
    solanaAddress.textContent = "Not connected";
    solanaChain.textContent = "No Solana cluster confirmed";
    solanaConnectButton.textContent = "Connect Solana wallet";
    renderSolanaChoices();
    setFeedback(solanaFeedback, "Local Solana wallet display cleared. No transaction or message was signed.", "neutral");
    updateSupporterActionButtons();
  }

  function registerSolanaWallets() {
    var incoming = Array.prototype.slice.call(arguments);
    var registeredIds = [];

    incoming.forEach(function (wallet) {
      if (!supportedSolanaWallet(wallet)) return;
      var duplicate = Array.from(solanaWallets.values()).some(function (existing) {
        return existing === wallet;
      });
      if (duplicate) return;
      var id = "solana-" + (++nextSolanaWalletId);
      solanaWallets.set(id, wallet);
      registeredIds.push(id);
    });

    renderSolanaChoices();
    if (registeredIds.length) {
      setFeedback(solanaFeedback, solanaWallets.size + " compatible Solana wallet option(s) detected.", "neutral");
    }

    return function unregisterWallets() {
      registeredIds.forEach(function (id) {
        var removed = solanaWallets.get(id);
        solanaWallets.delete(id);
        if (connectedSolana && connectedSolana.wallet === removed) clearSolanaConnection(false);
      });
      renderSolanaChoices();
    };
  }

  var walletApi = Object.freeze({ register: registerSolanaWallets });

  window.addEventListener("wallet-standard:register-wallet", function (event) {
    if (event && typeof event.detail === "function") {
      event.detail(walletApi);
    }
  });

  function WalletStandardAppReadyEvent(api) {
    var event = new Event("wallet-standard:app-ready");
    Object.defineProperty(event, "detail", { value: api, enumerable: true });
    return event;
  }

  window.dispatchEvent(new WalletStandardAppReadyEvent(walletApi));
  discoverDirectSolanaWallets(window).forEach(function (wallet) {
    registerSolanaWallets(wallet);
  });

  solanaSelect.addEventListener("change", renderSolanaChoices);
  solanaConnectButton.addEventListener("click", async function () {
    var wallet = solanaWallets.get(solanaSelect.value);
    if (!wallet || !supportedSolanaWallet(wallet)) {
      setFeedback(solanaFeedback, "Choose a compatible Solana wallet first.", "error");
      return;
    }

    solanaConnectButton.disabled = true;
    solanaConnectButton.textContent = "Connecting…";
    setFeedback(solanaFeedback, "Approve the wallet's connection request to share its public Solana address. No signature or transaction is requested.", "neutral");

    try {
      var result = await wallet.features["standard:connect"].connect({ silent: false });
      var accounts = result && Array.isArray(result.accounts) ? result.accounts : [];
      var account = accounts.find(function (candidate) {
        return candidate &&
          typeof candidate.address === "string" &&
          Array.isArray(candidate.chains);
      });

      if (!account) {
        throw new Error("The selected wallet did not return a connected Solana account.");
      }

      connectedSolana = { wallet: wallet };
      connectedSolanaAccount = account;
      lastConnectedNetwork = "solana";
      solanaAddress.textContent = account.address;
      var reportedSolanaChains = account.chains
        .filter(function (chain) { return typeof chain === "string" && chain.indexOf("solana:") === 0; });
      solanaChain.textContent = reportedSolanaChains.length
        ? "Wallet-reported network(s): " + reportedSolanaChains.join(", ")
        : "Solana account connected; cluster not independently confirmed. Genesis identity actions remain disabled.";
      solanaConnectButton.textContent = "Solana wallet connected";
      renderSolanaChoices();
      solanaConnectButton.disabled = true;
      setFeedback(
        solanaFeedback,
        "Solana wallet connected. It is not yet verified as the primary Genesis wallet. Use the wallet-identity control below to prove ownership with an off-chain message signature.",
        "connected"
      );
      updateSupporterActionButtons();
    } catch (error) {
      solanaConnectButton.textContent = "Connect Solana wallet";
      solanaConnectButton.disabled = false;
      setFeedback(
        solanaFeedback,
        error && error.message ? error.message : "Solana wallet connection was not completed. No funds were requested.",
        "error"
      );
    }
  });

  solanaClearButton.addEventListener("click", function () {
    clearSolanaConnection(true);
  });


  // Display-only TRON wallet discovery. It requests public account access only.
  // No message signing, transaction signing, contract call or transfer occurs here.
  var tronWallets = new Map();
  var connectedTronProvider = null;
  var connectedTronWeb = null;
  var connectedTronWallet = null;
  var connectedTronAddress = null;
  var connectedTronChainId = null;
  var tronWalletSequence = 0;

  function isTronAddress(address) {
    return typeof address === "string" && /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
  }

  function tronNetworkLabel(chainId) {
    var value = typeof chainId === "string" ? chainId.toLowerCase() : "";
    if (value === "0x2b6653dc") return "Tron Mainnet (wallet-reported)";
    if (value === "0x94a9059e") return "Shasta Testnet (wallet-reported)";
    if (value === "0xcd8690dc") return "Nile Testnet (wallet-reported)";
    return value ? "TRON chain " + value + " (wallet-reported)" : "Network not independently confirmed in this preview";
  }

  function supportedTronProvider(provider) {
    return Boolean(provider && typeof provider.request === "function");
  }

  function renderTronChoices() {
    var previous = tronSelect.value;
    tronSelect.textContent = "";
    var option = document.createElement("option");
    option.value = "";
    option.textContent = tronWallets.size ? "Select a TRON wallet" : "No compatible TRON wallet detected";
    tronSelect.appendChild(option);
    tronWallets.forEach(function (wallet, id) {
      var item = document.createElement("option");
      item.value = id;
      item.textContent = wallet.name;
      tronSelect.appendChild(item);
    });
    if (previous && tronWallets.has(previous)) tronSelect.value = previous;
    tronSelect.disabled = tronWallets.size === 0;
    tronConnectButton.disabled = tronWallets.size === 0 || Boolean(connectedTronAddress);
    tronClearButton.disabled = !connectedTronAddress;
  }

  function registerTronProvider(info, provider, options) {
    options = options || {};
    if (!supportedTronProvider(provider)) return;
    var uuid = info && typeof info.uuid === "string" ? info.uuid : "";
    var existing = Array.from(tronWallets.entries()).find(function (entry) {
      return entry[1].provider === provider || (uuid && entry[1].uuid === uuid);
    });
    if (existing) return;
    var walletId = options.walletId || identifyWalletCandidate(info || {}, provider);
    var id = uuid || "tron-wallet-" + (++tronWalletSequence);
    tronWallets.set(id, {
      uuid: uuid,
      walletId: walletId,
      name: options.name || (info && typeof info.name === "string" ? info.name :
        (walletId ? walletDisplayName(walletId) : (provider.isTronLink ? "TronLink" : "TRON wallet"))),
      provider: provider,
      tronWeb: options.tronWeb || provider.tronWeb || null,
      connectMethod: options.connectMethod || "eth_requestAccounts"
    });
    renderTronChoices();

    if (typeof provider.on === "function") {
      provider.on("accountsChanged", function (accounts) {
        if (provider !== connectedTronProvider) return;
        var address = Array.isArray(accounts) ? accounts.find(isTronAddress) : null;
        if (!address) {
          clearTronConnection(false);
          return;
        }
        connectedTronAddress = address;
        tronAddress.textContent = address;
      });
      provider.on("chainChanged", function (chainId) {
        if (provider !== connectedTronProvider) return;
        connectedTronChainId = chainId && typeof chainId === "object" ? chainId.chainId : chainId;
        tronChain.textContent = tronNetworkLabel(connectedTronChainId);
        updateSupporterActionButtons();
      });
      provider.on("disconnect", function () {
        if (provider === connectedTronProvider) clearTronConnection(false);
      });
    }
  }

  function clearTronConnection(showMessage) {
    connectedTronProvider = null;
    connectedTronWeb = null;
    connectedTronWallet = null;
    connectedTronAddress = null;
    connectedTronChainId = null;
    if (lastConnectedNetwork === "tron") lastConnectedNetwork = null;
    tronAddress.textContent = "Not connected";
    tronChain.textContent = "Network not confirmed";
    tronConnectButton.textContent = "Connect TRON wallet";
    renderTronChoices();
    if (showMessage) setFeedback(tronFeedback, "Local TRON wallet display cleared. No transaction or message was signed.", "neutral");
    updateSupporterActionButtons();
  }

  discoverDirectTronProviders(window).forEach(function (entry) {
    registerTronProvider({ name: entry.name, uuid: entry.walletId }, entry.provider, entry);
  });
  window.addEventListener("TIP6963:announceProvider", function (event) {
    var detail = event && event.detail ? event.detail : {};
    registerTronProvider(detail.info || {}, detail.provider);
  });
  window.dispatchEvent(new Event("TIP6963:requestProvider"));
  if (supportedTronProvider(window.tron)) {
    registerTronProvider({ name: window.tron.isTronLink ? "TronLink" : "TRON wallet" }, window.tron);
  }

  tronSelect.addEventListener("change", function () {
    tronConnectButton.disabled = !tronWallets.has(tronSelect.value) || Boolean(connectedTronAddress);
  });

  tronConnectButton.addEventListener("click", async function () {
    var wallet = tronWallets.get(tronSelect.value);
    if (!wallet || !supportedTronProvider(wallet.provider)) {
      setFeedback(tronFeedback, "Choose a compatible TRON wallet first.", "error");
      return;
    }
    tronConnectButton.disabled = true;
    tronConnectButton.textContent = "Connecting…";
    setFeedback(tronFeedback, "Approve the wallet's account-access request to share your public TRON address. No signature or transfer is requested.", "neutral");
    try {
      var accounts = await wallet.provider.request({ method: wallet.connectMethod || "eth_requestAccounts" });
      if (accounts && typeof accounts === "object" && accounts.code && Number(accounts.code) !== 200) {
        throw new Error(accounts.message || "The TRON wallet connection request was not approved.");
      }
      var address = Array.isArray(accounts) ? accounts.find(isTronAddress) :
        (typeof accounts === "string" && isTronAddress(accounts) ? accounts : null);
      var tronWeb = wallet.tronWeb || wallet.provider.tronWeb ||
        (wallet.walletId === "bitget-wallet" && window.bitkeep ? window.bitkeep.tronWeb : null) ||
        (wallet.walletId === "tokenpocket" && window.tokenpocket ? window.tokenpocket.tronWeb : null) ||
        (wallet.walletId === "okx-wallet" && window.okxwallet && window.okxwallet.tronLink ? window.okxwallet.tronLink.tronWeb : null);
      if (!address && tronWeb && tronWeb.defaultAddress) address = tronWeb.defaultAddress.base58;
      if (!isTronAddress(address)) throw new Error("The selected wallet did not return a valid public TRON address.");
      connectedTronProvider = wallet.provider;
      connectedTronWeb = tronWeb || null;
      connectedTronWallet = wallet;
      connectedTronAddress = address;
      try {
        connectedTronChainId = await wallet.provider.request({ method: "eth_chainId" });
      } catch (_) {
        connectedTronChainId = null;
      }
      lastConnectedNetwork = "tron";
      tronAddress.textContent = address;
      tronChain.textContent = connectedTronChainId
        ? tronNetworkLabel(connectedTronChainId)
        : "Wallet connected; active network not independently confirmed in this preview";
      tronConnectButton.textContent = "TRON wallet connected";
      renderTronChoices();
      setFeedback(tronFeedback, "TRON wallet connected. It is not yet verified as the primary Genesis wallet. Use the wallet-identity control below to prove ownership with an off-chain message signature.", "connected");
      updateSupporterActionButtons();
    } catch (error) {
      tronConnectButton.textContent = "Connect TRON wallet";
      tronConnectButton.disabled = false;
      setFeedback(tronFeedback, error && error.message ? error.message : "TRON connection was not completed. No funds were requested.", "error");
    }
  });

  tronClearButton.addEventListener("click", function () {
    clearTronConnection(true);
  });

  function supporterRuntimeMarkerPresent() {
    var marker = document.querySelector('meta[name="astro-supporter-runtime"]');
    return Boolean(marker && marker.content === "worker-staging" && window.location.protocol === "https:");
  }

  function activeConnectedWallet() {
    if (lastConnectedNetwork === "ethereum" && connectedEvm && connectedEvmAddress) {
      return {
        network: "ethereum",
        address: connectedEvmAddress,
        mainnet: String(connectedEvmChainId || "").toLowerCase() === "0x1",
        sign: async function (message) {
          return providerRequest(connectedEvm.provider, "personal_sign", [encodeEvmPersonalSignMessage(message), connectedEvmAddress]);
        }
      };
    }
    if (lastConnectedNetwork === "tron" && connectedTronProvider && connectedTronAddress) {
      var tronWeb = connectedTronWeb || connectedTronProvider.tronWeb || null;
      return {
        network: "tron",
        walletId: connectedTronWallet && connectedTronWallet.walletId,
        address: connectedTronAddress,
        mainnet: String(connectedTronChainId || "").toLowerCase() === "0x2b6653dc",
        canSign: hasTronMessageSigner(tronWeb),
        sign: async function (message) {
          if (!hasTronMessageSigner(tronWeb)) {
            throw new Error("This TRON wallet exposes account access but not the TIP-191 signMessageV2 method required by Genesis. No transaction or payment can be used as a substitute without a separately approved proof method.");
          }
          return tronWeb.trx.signMessageV2(message);
        }
      };
    }
    if (lastConnectedNetwork === "solana" && connectedSolana && connectedSolanaAccount) {
      var chains = Array.isArray(connectedSolanaAccount.chains) ? connectedSolanaAccount.chains : [];
      return {
        network: "solana",
        address: connectedSolanaAccount.address,
        walletId: connectedSolana.wallet.genesisWalletId || null,
        mainnet: isSolanaMainnet(connectedSolanaAccount),
        canSign: Boolean(connectedSolana.wallet.features && connectedSolana.wallet.features["solana:signMessage"] && typeof connectedSolana.wallet.features["solana:signMessage"].signMessage === "function"),
        sign: async function (message) {
          var wallet = connectedSolana.wallet;
          var feature = wallet && wallet.features && wallet.features["solana:signMessage"];
          if (!feature || typeof feature.signMessage !== "function") {
            throw new Error("This Solana wallet does not support off-chain message signing.");
          }
          var output = await feature.signMessage({
            account: connectedSolanaAccount,
            message: new TextEncoder().encode(message)
          });
          var signature = output && output[0] && output[0].signature;
          if (!(signature instanceof Uint8Array) || signature.length !== 64) {
            throw new Error("The Solana wallet returned an invalid Ed25519 signature.");
          }
          var binary = "";
          signature.forEach(function (byte) { binary += String.fromCharCode(byte); });
          return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
        }
      };
    }
    return null;
  }

  function updateSupporterActionButtons() {
    supporterRuntimeEnabled = supporterRuntimeMarkerPresent();
    var wallet = activeConnectedWallet();
    var ready = Boolean(supporterRuntimeEnabled && wallet && wallet.mainnet && wallet.canSign !== false);
    if (memberMode) memberMode.textContent = supporterRuntimeEnabled ? "STAGING · PRELAUNCH" : "Standalone preview";
    if (registerWalletButton) {
      registerWalletButton.disabled = !ready || Boolean(supporterMember);
      registerWalletButton.textContent = supporterMember ? "Primary wallet identity established" : "Continue with this primary wallet";
    }
    if (loginWalletButton) loginWalletButton.hidden = true;
    if (linkWalletButton) linkWalletButton.disabled = !ready || !supporterMember;
    if (logoutButton) {
      logoutButton.disabled = !supporterRuntimeEnabled || !supporterMember;
      logoutButton.textContent = "Disconnect wallet session";
    }
    if (walletPurposeSelect) walletPurposeSelect.disabled = !supporterRuntimeEnabled || !supporterMember;
    if (pseudonymInput) pseudonymInput.disabled = !supporterMember;
    if (randomizeButton) randomizeButton.disabled = !supporterMember;
    if (saveNameButton) saveNameButton.disabled = !supporterMember;
    if (memberProfileState) {
      memberProfileState.textContent = supporterMember
        ? (supporterMember.genesisMember && supporterMember.genesisMember.status === "ACTIVE" ? "Genesis Member" : "Wallet verified")
        : (supporterRuntimeEnabled ? "Wallet not connected" : "Preview only");
    }
    if (!supporterRuntimeEnabled) {
      if (memberFeedback) setFeedback(memberFeedback,
        "Standalone preview only. Wallet identity, unique-name reservation and wallet linking require the official staging Worker. No payment route is enabled.", "neutral");
      return;
    }
    if (supporterMember) {
      if (memberSummary) memberSummary.textContent =
        supporterMember.walletIdentity.displayName + " · primary wallet identity";
      if (nameAvailability && nameAvailability.dataset.state !== "available") {
        nameAvailability.textContent = "Your current name is reserved to this wallet.";
        nameAvailability.dataset.state = "available";
      }
      return;
    }
    if (!wallet) {
      if (memberFeedback) setFeedback(memberFeedback,
        "Connect your primary Ethereum, TRON or Solana mainnet wallet. Its signed message establishes the wallet identity automatically; there is no separate user registration.", "neutral");
    } else if (!wallet.mainnet) {
      var expected = wallet.network === "ethereum" ? "Ethereum Mainnet (chain ID 1)" :
        wallet.network === "tron" ? "TRON Mainnet" : "Solana Mainnet";
      if (memberFeedback) setFeedback(memberFeedback,
        "The connected wallet is not reporting " + expected + ". Switch networks in the wallet, then reconnect. No signature has been requested.", "error");
    } else if (memberFeedback && memberFeedback.dataset.state === "neutral") {
      setFeedback(memberFeedback,
        wallet.network.toUpperCase() + " mainnet wallet connected. Continue to prove control of this primary wallet with an off-chain message signature.", "neutral");
    }
  }

  async function supporterApiPost(pathname, payload) {
    var response = await fetch(pathname, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload || {})
    });
    var data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) {
      if (response.status === 428) throw new Error("First acknowledge the public test-environment notice on the AstroCrown homepage.");
      throw new Error(data && data.error ? data.error : "The Genesis wallet service returned HTTP " + response.status + ".");
    }
    return data;
  }

  async function signSupporterChallenge(wallet, message) {
    setFeedback(memberFeedback,
      "Your wallet will display an off-chain ownership message. Read it carefully. It must not request a transaction, token approval, transfer or payment.", "neutral");
    var signature = await wallet.sign(message);
    if (wallet.network === "solana") {
      if (typeof signature !== "string" || !/^[A-Za-z0-9_-]{80,100}$/.test(signature)) {
        throw new Error("The Solana wallet signature could not be encoded safely.");
      }
    } else if (typeof signature !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(signature)) {
      throw new Error("The wallet returned a signature in an unsupported format.");
    }
    return signature;
  }

  function renderPurchaseInactivityTimer(lifecycle) {
    window.clearInterval(purchaseInactivityInterval);
    var countdownElements = [
      document.getElementById("genesis-public-purchase-inactivity-countdown"),
      document.getElementById("genesis-purchase-inactivity-countdown")
    ].filter(Boolean);
    var resetElement = document.getElementById("genesis-purchase-inactivity-last-reset");
    var startedAt = Number(lifecycle && lifecycle.purchaseWindowStartedAt || 0);
    var closesAt = Number(lifecycle && lifecycle.purchaseWindowClosesAt || 0);
    var lastPurchaseAt = Number(lifecycle && lifecycle.purchaseWindowLastPurchaseAt || 0);
    function show(value) {
      countdownElements.forEach(function (element) { element.textContent = value; });
    }
    if (!startedAt || !closesAt) {
      show("Not started");
      if (resetElement) resetElement.textContent = "The programme-wide countdown starts at official ACROWN launch. Each completed, finalized purchase of remaining Genesis rights or ACROWN at the ACS floor price resets the shared timer to 180 days of inactivity.";
      return;
    }
    if (resetElement) {
      resetElement.textContent = lastPurchaseAt
        ? "Latest global timer reset after a completed, finalized purchase of remaining Genesis rights or ACROWN at the ACS floor price: " + new Date(lastPurchaseAt * 1000).toLocaleString() + ". Any eligible pre-freeze registered wallet resets the same programme-wide countdown."
        : "The initial countdown began at official ACROWN launch. The first completed, finalized purchase of remaining Genesis rights or ACROWN at the ACS floor price will reset the shared countdown to 180 days of inactivity.";
    }
    function tick() {
      var remaining = Math.max(0, closesAt - Math.floor(Date.now() / 1000));
      if (remaining <= 0) {
        show("Expired");
        if (resetElement) resetElement.textContent = "The rolling 180 days of inactivity period has ended. Only unused shared purchase allowance is subject to expiry; Genesis Member status and the gold DNA badge are unaffected.";
        window.clearInterval(purchaseInactivityInterval);
        purchaseInactivityInterval = null;
        return;
      }
      var days = Math.floor(remaining / 86400);
      var hours = Math.floor((remaining % 86400) / 3600);
      var minutes = Math.floor((remaining % 3600) / 60);
      var seconds = remaining % 60;
      show(days + "d " + String(hours).padStart(2, "0") + "h " + String(minutes).padStart(2, "0") + "m " + String(seconds).padStart(2, "0") + "s remaining");
    }
    tick();
    purchaseInactivityInterval = window.setInterval(tick, 1000);
  }

  function applySupporterProfile(data) {
    if (!data || !data.walletIdentity || typeof data.walletIdentity.displayName !== "string" || !Array.isArray(data.wallets)) {
      throw new Error("The Genesis service returned an incomplete wallet identity.");
    }
    supporterMember = data;
    renderPurchaseInactivityTimer(data.programmeLifecycle || null);
    pseudonymInput.value = data.walletIdentity.displayName;
    updatePseudonym();
    if (memberSummary) memberSummary.textContent = data.walletIdentity.displayName + " · primary wallet identity";
    if (memberWalletList) {
      memberWalletList.textContent = data.wallets.length
        ? "Registered addresses in this primary wallet profile: " + data.wallets.map(function (wallet) {
            return wallet.network.toUpperCase() + " · " + wallet.wallet_role.replace(/_/g, " ") + " · " + wallet.address;
          }).join("  |  ")
        : "No additional network addresses registered yet.";
    }
    var avatarGlyphs = { person: "●", crown: "♛", star: "★", moon: "☾", orbit: "◎", shield: "⬡" };
    if (memberAvatar) memberAvatar.textContent = avatarGlyphs[data.walletIdentity.avatarKey] || "✦";
    var genesisMember = data.genesisMember && data.genesisMember.status === "ACTIVE";
    if (genesisBadgeImage) {
      genesisBadgeImage.hidden = !genesisMember;
      genesisBadgeImage.alt = genesisMember ? "Gold DNA Genesis Member badge" : "";
    }
    if (memberProfileState) memberProfileState.textContent = genesisMember ? "Genesis Member" : "Wallet verified";
    if (nameAvailability) {
      nameAvailability.textContent = "Your current name is reserved exclusively to this wallet.";
      nameAvailability.dataset.state = "available";
    }
    if (memberFeedback) {
      setFeedback(memberFeedback, genesisMember
        ? "Primary wallet verified. Genesis Member status and its gold DNA badge are active for this wallet."
        : "Primary wallet verified. Its unique display name is reserved. Genesis Member status and the gold DNA badge are awarded only after the qualifying payment is independently verified. Payment acceptance remains disabled.", "connected");
    }
    updateSupporterActionButtons();
    refreshGenesisDirectory();
  refreshGenesisTreasuryReceipts();
  window.setInterval(refreshGenesisTreasuryReceipts, 30000);
  }

  async function refreshSupporterMember() {
    if (!supporterRuntimeMarkerPresent()) return;
    try {
      var response = await fetch("/api/genesis/me", {
        method: "GET", credentials: "same-origin", headers: { "Accept": "application/json" }
      });
      if (response.ok) {
        applySupporterProfile(await response.json());
      } else if (response.status !== 401) {
        var data = {};
        try { data = await response.json(); } catch (_) {}
        setFeedback(memberFeedback, data.error || "The Genesis wallet identity could not be checked. Payment acceptance remains disabled.", "error");
      }
    } catch (_) {
      setFeedback(memberFeedback, "The Genesis wallet identity could not be checked. Payment acceptance remains disabled.", "error");
    }
  }

  async function runSupporterRegistration() {
    var wallet = activeConnectedWallet();
    if (!supporterRuntimeMarkerPresent() || !wallet || !wallet.mainnet || supporterMember) return;
    registerWalletButton.disabled = true;
    try {
      var challenge = await supporterApiPost("/api/genesis/identity/challenge", {
        network: wallet.network, address: wallet.address
      });
      setFeedback(memberFeedback,
        "Wallet identity challenge created. Sign the exact off-chain message in your primary wallet. No user profile or separate account is being registered.", "neutral");
      var signature = await signSupporterChallenge(wallet, challenge.message);
      var profile = await supporterApiPost("/api/genesis/identity/verify", {
        challengeId: challenge.challengeId, signature: signature
      });
      applySupporterProfile(profile);
    } catch (error) {
      setFeedback(memberFeedback, error && error.message ? error.message : String(error || "Wallet verification was not completed."), "error");
    } finally {
      updateSupporterActionButtons();
    }
  }

  async function runSupporterWalletLink() {
    var wallet = activeConnectedWallet();
    if (!supporterRuntimeMarkerPresent() || !wallet || !wallet.mainnet || !supporterMember) return;
    linkWalletButton.disabled = true;
    try {
      // The primary-wallet session authorizes this profile change. The connected network address signs only its own ownership proof; it never becomes a Genesis login or authority.
      var selectedRole = walletPurposeSelect.value || "PAYMENT";
      var role = selectedRole === "ACROWN_DELIVERY" ? "DELIVERY" : selectedRole;
      if ((role === "DELIVERY" || role === "PAYMENT_AND_DELIVERY") && wallet.network !== "solana") {
        throw new Error("Only a Solana address can be designated for ACROWN delivery.");
      }
      var challenge = await supporterApiPost("/api/genesis/wallet-link/challenge", {
        network: wallet.network, address: wallet.address, walletRole: role
      });
      var signature = await signSupporterChallenge(wallet, challenge.message);
      var profile = await supporterApiPost("/api/genesis/wallet-link/verify", {
        challengeId: challenge.challengeId, signature: signature
      });
      applySupporterProfile(profile);
      setFeedback(memberFeedback, "The network address has been independently verified and added to your primary wallet profile. Its signature proves control of that address only; Genesis authority remains with the primary wallet.", "connected");
    } catch (error) {
      setFeedback(memberFeedback, error && error.message ? error.message : String(error || "Wallet linking was not completed."), "error");
    } finally {
      updateSupporterActionButtons();
    }
  }

  async function checkDisplayNameAvailability() {
    if (!nameAvailability) return false;
    var name = pseudonymInput.value.trim();
    if (name.length < 3) {
      nameAvailability.textContent = "Enter at least 3 characters.";
      nameAvailability.dataset.state = "unavailable";
      if (saveNameButton) saveNameButton.disabled = true;
      return false;
    }
    try {
      var response = await fetch("/api/genesis/name-availability?name=" + encodeURIComponent(name), {
        credentials: "same-origin", headers: { "Accept": "application/json" }
      });
      var result = await response.json();
      if (!response.ok) throw new Error(result.error || "Name availability could not be checked.");
      nameAvailability.textContent = result.available ? "Name available." : "Name unavailable — already in use.";
      nameAvailability.dataset.state = result.available ? "available" : "unavailable";
      if (saveNameButton) saveNameButton.disabled = !supporterMember || !result.available ||
        result.displayName.toLowerCase() === supporterMember.walletIdentity.displayName.toLowerCase();
      return Boolean(result.available);
    } catch (error) {
      nameAvailability.textContent = error.message || "Name availability could not be checked.";
      nameAvailability.dataset.state = "unavailable";
      if (saveNameButton) saveNameButton.disabled = true;
      return false;
    }
  }

  var displayNameCheckTimer = null;
  if (pseudonymInput) pseudonymInput.addEventListener("input", function () {
    updatePseudonym();
    if (!supporterMember) return;
    nameAvailability.textContent = "Checking availability…";
    nameAvailability.dataset.state = "checking";
    if (saveNameButton) saveNameButton.disabled = true;
    window.clearTimeout(displayNameCheckTimer);
    displayNameCheckTimer = window.setTimeout(checkDisplayNameAvailability, 250);
  });

  async function saveGenesisDisplayName() {
    var wallet = activeConnectedWallet();
    if (!supporterRuntimeMarkerPresent() || !supporterMember || !wallet || !wallet.mainnet) return;
    if (!await checkDisplayNameAvailability()) return;
    saveNameButton.disabled = true;
    try {
      var challenge = await supporterApiPost("/api/genesis/display-name/challenge", {
        displayName: pseudonymInput.value.trim()
      });
      var primaryWallet = {
        network: supporterMember.walletIdentity.primaryNetwork,
        address: supporterMember.walletIdentity.primaryAddress
      };
      var active = activeConnectedWallet();
      var addressesMatch = active.network === "ethereum"
        ? active.address.toLowerCase() === primaryWallet.address.toLowerCase()
        : active.address === primaryWallet.address;
      if (active.network !== primaryWallet.network || !addressesMatch) {
        throw new Error("Reconnect the primary wallet before changing its public name.");
      }
      var signature = await signSupporterChallenge(active, challenge.message);
      var profile = await supporterApiPost("/api/genesis/display-name/verify", {
        challengeId: challenge.challengeId, signature: signature
      });
      applySupporterProfile(profile);
      setFeedback(memberFeedback, "Your unique public display name has been saved to this wallet identity.", "connected");
    } catch (error) {
      setFeedback(memberFeedback, error && error.message ? error.message : String(error || "The display name was not saved."), "error");
    } finally {
      updateSupporterActionButtons();
    }
  }

  async function runSupporterLogout() {
    if (!supporterMember) return;
    logoutButton.disabled = true;
    try {
      await supporterApiPost("/api/genesis/logout", {});
      supporterMember = null;
      renderPurchaseInactivityTimer(null);
      if (memberSummary) memberSummary.textContent = "No primary wallet session";
      if (memberWalletList) memberWalletList.textContent = "No wallet identity currently connected.";
      if (genesisBadgeImage) genesisBadgeImage.hidden = true;
      setFeedback(memberFeedback, "Wallet session disconnected. The Genesis identity and all entitlements remain bound to the primary wallet; reconnect that wallet to access them.", "neutral");
    } catch (error) {
      setFeedback(memberFeedback, error && error.message ? error.message : "The wallet session could not be disconnected.", "error");
    } finally {
      updateSupporterActionButtons();
    }
  }

  async function refreshGenesisDirectory() {
    if (!publicDirectoryList) return;
    if (!supporterRuntimeMarkerPresent()) {
      publicDirectoryList.textContent = "Public payment records will appear here after the Genesis Programme opens and payments are independently verified.";
      return;
    }
    try {
      var response = await fetch("/api/genesis/directory", { headers: { "Accept": "application/json" } });
      var data = await response.json();
      if (!response.ok || !Array.isArray(data.items)) throw new Error("The public Genesis directory is unavailable.");
      publicDirectoryList.replaceChildren();
      if (!data.items.length) {
        publicDirectoryList.textContent = "No qualifying payments have been published. Genesis payment acceptance is currently disabled.";
        return;
      }
      data.items.forEach(function (item) {
        var row = document.createElement("article");
        row.className = "genesis-directory-row";
        var identityGroup = document.createElement("div");
        identityGroup.className = "genesis-directory-identity";
        var badge = document.createElement("img");
        badge.src = "../assets/genesis-member-dna.svg";
        badge.alt = "Genesis Member";
        badge.className = "genesis-directory-badge";
        var avatar = document.createElement("span");
        avatar.className = "genesis-directory-avatar";
        var glyphs = { person: "●", crown: "♛", star: "★", moon: "☾", orbit: "◎", shield: "⬡" };
        avatar.textContent = glyphs[item.avatarKey] || "✦";
        var identity = document.createElement("strong");
        identity.textContent = item.displayName;
        identityGroup.append(avatar, identity, badge);
        var detail = document.createElement("span");
        var paymentLabel = item.paymentKind === "QUALIFYING_PAYMENT" ? "Qualifying payment" : "ACROWN floor-price purchase";
        detail.textContent = paymentLabel + " · " + item.amount + " USDT · " + item.network.toUpperCase();
        row.append(identityGroup, detail);
        if (item.explorerUrl) {
          var link = document.createElement("a");
          link.href = item.explorerUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Verify on " + (item.network === "ethereum" ? "Etherscan" : item.network === "tron" ? "TronScan" : "Solscan");
          row.append(link);
        }
        publicDirectoryList.append(row);
      });
    } catch (_) {
      publicDirectoryList.textContent = "The public Genesis directory is temporarily unavailable.";
    }
  }

  async function refreshGenesisTreasuryReceipts() {
    if (!publicTreasuryReceipts) return;
    if (!supporterRuntimeMarkerPresent()) {
      publicTreasuryReceipts.textContent = "Standalone preview · No live treasury-monitor connection. No live receipt claims are being displayed.";
      return;
    }
    try {
      var response = await fetch("/api/genesis/treasury-receipts", {
        method: "GET",
        credentials: "same-origin",
        headers: { "Accept": "application/json" }
      });
      var data = await response.json();
      if (!response.ok || !data.publicReceiptRegister || !Array.isArray(data.items)) {
        throw new Error("The public treasury receipt register is unavailable.");
      }
      publicTreasuryReceipts.replaceChildren();
      if (!data.items.length) {
        var empty = document.createElement("div");
        empty.className = "ledger-empty";
        var heading = document.createElement("strong");
        heading.textContent = "No verified incoming USDT receipts are published yet.";
        var explanation = document.createElement("p");
        explanation.textContent = "This register will display receipts after AstroCrown's own receiving-wallet monitor verifies them against independent blockchain RPC sources.";
        empty.append(heading, explanation);
        publicTreasuryReceipts.append(empty);
        return;
      }

      var networks = {
        ethereum: { label: "USDT · Ethereum (ERC-20)", explorer: "Etherscan", origin: "https://etherscan.io", hash: /^0x[0-9a-fA-F]{64}$/ },
        tron: { label: "USDT · TRON (TRC-20)", explorer: "TronScan", origin: "https://tronscan.org", hash: /^[0-9a-fA-F]{64}$/ },
        solana: { label: "USDT · Solana (SPL)", explorer: "Solscan", origin: "https://solscan.io", hash: /^[1-9A-HJ-NP-Za-km-z]{64,90}$/ }
      };

      data.items.forEach(function (item) {
        var network = item && networks[item.network];
        if (!network || item.asset !== "USDT" ||
            typeof item.transactionHash !== "string" || !network.hash.test(item.transactionHash) ||
            typeof item.amount !== "string" || !/^[0-9]+(?:\.[0-9]{1,6})?$/.test(item.amount) ||
            typeof item.senderAddress !== "string" || typeof item.receivingAddress !== "string") {
          return;
        }
        var expectedPath = item.network === "ethereum"
          ? "/tx/" + item.transactionHash
          : item.network === "tron"
            ? "/#/transaction/" + item.transactionHash
            : "/tx/" + item.transactionHash;
        var explorer;
        try {
          explorer = new URL(item.explorerUrl);
        } catch (_) {
          return;
        }
        if (explorer.origin !== network.origin || explorer.pathname + explorer.hash !== expectedPath) return;

        var row = document.createElement("article");
        row.className = "receipt-row";
        var head = document.createElement("div");
        head.className = "receipt-row-head";
        var networkLabel = document.createElement("strong");
        networkLabel.className = "receipt-network";
        networkLabel.textContent = network.label;
        var amount = document.createElement("span");
        amount.className = "receipt-amount";
        amount.textContent = item.amount + " USDT";
        head.append(networkLabel, amount);

        var meta = document.createElement("div");
        meta.className = "receipt-meta";
        function addReceiptField(label, value) {
          var field = document.createElement("div");
          var title = document.createElement("b");
          title.textContent = label;
          var content = document.createElement("span");
          content.textContent = value;
          field.append(title, content);
          meta.append(field);
        }
        addReceiptField("Sending wallet", item.senderAddress);
        addReceiptField("AstroCrown receiving wallet", item.receivingAddress);
        addReceiptField("Transaction hash / signature", item.transactionHash);
        addReceiptField("Transfer index · finality", String(item.transferIndex) + " · " + String(item.finalityStatus || "VERIFIED"));

        var actions = document.createElement("div");
        actions.className = "receipt-actions";
        var status = document.createElement("small");
        status.textContent = "Independently checked by two RPC operators · Receipt only; no entitlement implied";
        var link = document.createElement("a");
        link.href = explorer.toString();
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Verify on " + network.explorer + " ↗";
        actions.append(status, link);
        row.append(head, meta, actions);
        publicTreasuryReceipts.append(row);
      });

      if (!publicTreasuryReceipts.children.length) {
        publicTreasuryReceipts.textContent = "No valid public receipt records are currently available.";
      }
    } catch (_) {
      publicTreasuryReceipts.textContent = "The public treasury receipt register is temporarily unavailable.";
    }
  }

  if (registerWalletButton) registerWalletButton.addEventListener("click", runSupporterRegistration);
  if (linkWalletButton) linkWalletButton.addEventListener("click", runSupporterWalletLink);
  if (logoutButton) logoutButton.addEventListener("click", runSupporterLogout);
  if (saveNameButton) saveNameButton.addEventListener("click", saveGenesisDisplayName);

  async function refreshProgrammeStatus() {
    var statusElement = document.getElementById("supporter-runtime-status");
    if (!statusElement) return;
    var runtimeMarker = document.querySelector('meta[name="astro-supporter-runtime"]');
    if (!runtimeMarker || runtimeMarker.content !== "worker-staging" || window.location.protocol !== "https:") {
      statusElement.textContent = "Standalone preview · Not connected to the programme backend. Qualifying payments remain closed. Do not send funds.";
      statusElement.dataset.state = "closed";
      return;
    }
    try {
      var response = await fetch("/api/genesis/status", {
        method: "GET",
        credentials: "same-origin",
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) throw new Error("The programme status service is not available.");
      var payload = await response.json();
      renderPurchaseInactivityTimer(payload && payload.programmeLifecycle || null);
      var prelaunch = payload &&
        payload.environment === "MAINNET" &&
        payload.programme &&
        payload.programme.status === "PRELAUNCH" &&
        payload.paymentAcceptance &&
        payload.paymentAcceptance.enabled === false &&
        payload.paymentAcceptance.qualifyingPaymentsAccepted === false &&
        Array.isArray(payload.networks) &&
        payload.networks.length === 3;
      if (!prelaunch) throw new Error("The programme status could not be qualified.");
      statusElement.textContent = "Programme service connected · PRELAUNCH · Ethereum, Tron and Solana USDT intake is disabled. Do not send funds.";
      statusElement.dataset.state = "closed";
    } catch (_) {
      statusElement.textContent = "Programme service status unavailable · Qualifying payments remain closed. Do not send funds.";
      statusElement.dataset.state = "closed";
    }
  }

  refreshProgrammeStatus();
  window.setInterval(refreshProgrammeStatus, 30000);
  updateSupporterActionButtons();
  refreshSupporterMember();
  refreshGenesisDirectory();

  // Never call eth_sign, eth_sendTransaction, signAndSendTransaction,
  // signTransaction, signAndSendTransaction, signMessageV2, or any wallet payment method here.
  renderEvmChoices();
  renderSolanaChoices();
  renderTronChoices();
}());
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
  var supporterRuntimeEnabled = false;
  var supporterMember = null;
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
    pseudonymDisplay.textContent = name || "Choose a member name";
  }

  pseudonymInput.value = generatePseudonym();
  updatePseudonym();
  pseudonymInput.addEventListener("input", updatePseudonym);
  randomizeButton.addEventListener("click", function () {
    pseudonymInput.value = generatePseudonym();
    updatePseudonym();
    solanaFeedback.textContent = "A new preview pseudonym has been generated. It is not saved to a member record.";
    solanaFeedback.dataset.state = "neutral";
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
    evmAddress.textContent = account;
    setFeedback(
      evmFeedback,
      "EVM wallet connected for display only. The address is not registered with the programme and no entitlement is activated.",
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
    var name = info && typeof info.name === "string" ? info.name :
      (provider.isMetaMask ? "MetaMask" : "Injected EVM wallet");
    var entry = {
      id: id,
      uuid: uuid,
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

  // Compatibility fallback for EIP-1193 wallets that have not implemented EIP-6963.
  // Delay briefly so standard announcements can be collected first and avoid duplicates.
  window.setTimeout(function () {
    if (evmProviders.size > 0) return;
    var injected = window.ethereum;
    if (!injected) return;
    var candidates = Array.isArray(injected.providers) ? injected.providers : [injected];
    candidates.forEach(function (provider) {
      registerEvmProvider(
        { name: provider && provider.isMetaMask ? "MetaMask" : "Injected EVM wallet" },
        provider,
        true
      );
    });
  }, 250);

  function clearEvmConnection() {
    connectedEvm = null;
    connectedEvmAddress = null;
    connectedEvmChainId = null;
    evmAddress.textContent = "Not connected";
    evmChain.textContent = "No EVM network confirmed";
    evmConnectButton.textContent = "Connect EVM wallet";
    renderEvmChoices();
    setFeedback(evmFeedback, "Local EVM wallet display cleared. No signing or transaction was requested.", "neutral");
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
      evmAddress.textContent = account;
      await refreshConnectedEvmChain();
      evmConnectButton.textContent = "EVM wallet connected";
      renderEvmChoices();
      evmConnectButton.disabled = true;
      setFeedback(
        evmFeedback,
        "EVM wallet connected for display only. Its address has not been registered with the programme backend, and no entitlement has been activated.",
        "connected"
      );
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
    solanaAddress.textContent = "Not connected";
    solanaChain.textContent = "No Solana cluster confirmed";
    solanaConnectButton.textContent = "Connect Solana wallet";
    renderSolanaChoices();
    setFeedback(solanaFeedback, "Local Solana wallet display cleared. No transaction or message was signed.", "neutral");
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
          Array.isArray(candidate.chains) &&
          candidate.chains.some(function (chain) {
            return typeof chain === "string" && chain.indexOf("solana:") === 0;
          });
      });

      if (!account) {
        throw new Error("The selected wallet did not return a connected Solana account.");
      }

      connectedSolana = { wallet: wallet };
      connectedSolanaAccount = account;
      solanaAddress.textContent = account.address;
      solanaChain.textContent = "Wallet-reported network(s): " + account.chains
        .filter(function (chain) { return typeof chain === "string" && chain.indexOf("solana:") === 0; })
        .join(", ");
      solanaConnectButton.textContent = "Solana wallet connected";
      renderSolanaChoices();
      solanaConnectButton.disabled = true;
      setFeedback(
        solanaFeedback,
        "Solana wallet connected for display only. Its address has not been registered with the programme backend, and no entitlement has been activated.",
        "connected"
      );
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

  function registerTronProvider(info, provider) {
    if (!supportedTronProvider(provider)) return;
    var uuid = info && typeof info.uuid === "string" ? info.uuid : "";
    var existing = Array.from(tronWallets.entries()).find(function (entry) {
      return entry[1].provider === provider || (uuid && entry[1].uuid === uuid);
    });
    if (existing) return;
    var id = uuid || "tron-wallet-" + (++tronWalletSequence);
    tronWallets.set(id, {
      uuid: uuid,
      name: info && typeof info.name === "string" ? info.name : (provider.isTronLink ? "TronLink" : "TRON wallet"),
      provider: provider
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
      });
      provider.on("disconnect", function () {
        if (provider === connectedTronProvider) clearTronConnection(false);
      });
    }
  }

  function clearTronConnection(showMessage) {
    connectedTronProvider = null;
    connectedTronAddress = null;
    connectedTronChainId = null;
    tronAddress.textContent = "Not connected";
    tronChain.textContent = "Network not confirmed";
    tronConnectButton.textContent = "Connect TRON wallet";
    renderTronChoices();
    if (showMessage) setFeedback(tronFeedback, "Local TRON wallet display cleared. No transaction or message was signed.", "neutral");
  }

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
      var accounts = await wallet.provider.request({ method: "eth_requestAccounts" });
      var address = Array.isArray(accounts) ? accounts.find(isTronAddress) : null;
      var tronWeb = wallet.provider.tronWeb;
      if (!address && tronWeb && tronWeb.defaultAddress) address = tronWeb.defaultAddress.base58;
      if (!isTronAddress(address)) throw new Error("The selected wallet did not return a valid public TRON address.");
      connectedTronProvider = wallet.provider;
      connectedTronAddress = address;
      tronAddress.textContent = address;
      tronChain.textContent = connectedTronChainId
        ? tronNetworkLabel(connectedTronChainId)
        : "Wallet connected; active network not independently confirmed in this preview";
      tronConnectButton.textContent = "TRON wallet connected";
      renderTronChoices();
      setFeedback(tronFeedback, "TRON wallet connected for address display only. The address is not registered and no entitlement is active.", "connected");
    } catch (error) {
      tronConnectButton.textContent = "Connect TRON wallet";
      tronConnectButton.disabled = false;
      setFeedback(tronFeedback, error && error.message ? error.message : "TRON connection was not completed. No funds were requested.", "error");
    }
  });

  tronClearButton.addEventListener("click", function () {
    clearTronConnection(true);
  });

  async function refreshProgrammeStatus() {
    var statusElement = document.getElementById("supporter-runtime-status");
    if (!statusElement) return;
    var runtimeMarker = document.querySelector('meta[name="astro-supporter-runtime"]');
    if (!runtimeMarker || runtimeMarker.content !== "worker-staging" || window.location.protocol !== "https:") {
      statusElement.textContent = "Standalone preview · Not connected to the programme backend. Contributions remain closed. Do not send funds.";
      statusElement.dataset.state = "closed";
      return;
    }
    try {
      var response = await fetch("/api/supporters/status", {
        method: "GET",
        credentials: "same-origin",
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) throw new Error("The programme status service is not available.");
      var payload = await response.json();
      var prelaunch = payload &&
        payload.environment === "MAINNET" &&
        payload.programme &&
        payload.programme.status === "PRELAUNCH" &&
        payload.paymentAcceptance &&
        payload.paymentAcceptance.enabled === false &&
        payload.paymentAcceptance.contributionsAccepted === false &&
        Array.isArray(payload.networks) &&
        payload.networks.length === 3;
      if (!prelaunch) throw new Error("The programme status could not be qualified.");
      statusElement.textContent = "Programme service connected · PRELAUNCH · Ethereum, Tron and Solana USDT intake is disabled. Do not send funds.";
      statusElement.dataset.state = "closed";
    } catch (_) {
      statusElement.textContent = "Programme service status unavailable · Contributions remain closed. Do not send funds.";
      statusElement.dataset.state = "closed";
    }
  }

  refreshProgrammeStatus();

  // Never call personal_sign, eth_sign, eth_sendTransaction, signMessage,
  // signTransaction, signAndSendTransaction, signMessageV2, or any wallet payment method here.
  renderEvmChoices();
  renderSolanaChoices();
  renderTronChoices();
}());
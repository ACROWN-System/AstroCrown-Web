(function () {
  "use strict";

  // Public brand: ACROWN Genesis Programme. Existing supporter-prefixed DOM IDs,
  // API paths and internal variables remain compatibility identifiers only; they
  // do not define an account role, programme authority or administrator permission.

  function initializePublicEventCountdown() {
    var countdown = document.getElementById("public-event-countdown");
    if (!countdown) return;
    var publicAtText = String(countdown.getAttribute("data-public-deployment-at") || "").trim();
    var registrationStage = document.getElementById("registration-countdown-stage");
    var launchStage = document.getElementById("launch-countdown-stage");
    var registrationDigits = document.getElementById("registration-countdown");
    var launchDigits = document.getElementById("launch-countdown");
    var registrationState = registrationStage && registrationStage.querySelector(".countdown-stage-state");
    var launchState = launchStage && launchStage.querySelector(".countdown-stage-state");
    var registrationCaption = document.getElementById("registration-countdown-caption");
    var launchCaption = document.getElementById("launch-countdown-caption");
    var daySeconds = 24 * 60 * 60;
    var publicAt = new Date(publicAtText);
    var validTimestamp = /^\\d{4}-\\d{2}-\\d{2}T00:00:00(?:\\.000)?Z$/.test(publicAtText) &&
      Number.isFinite(publicAt.getTime()) &&
      publicAt.toISOString().slice(0, 10) === publicAtText.slice(0, 10) &&
      publicAt.getUTCHours() === 0 && publicAt.getUTCMinutes() === 0 &&
      publicAt.getUTCSeconds() === 0 && publicAt.getUTCMilliseconds() === 0;

    function setDigits(container, values, labels) {
      if (!container) return;
      container.replaceChildren();
      values.forEach(function (value, index) {
        var span = document.createElement("span");
        var strong = document.createElement("strong");
        var small = document.createElement("small");
        strong.textContent = String(value).padStart(2, "0");
        small.textContent = labels[index];
        span.append(strong, small);
        container.appendChild(span);
      });
    }

    function resetNotAnnounced() {
      setDigits(registrationDigits, ["—", "—", "—", "—"], ["Days", "Hours", "Minutes", "Seconds"]);
      setDigits(launchDigits, ["—", "—", "—"], ["Hours", "Minutes", "Seconds"]);
      if (registrationState) registrationState.textContent = "Not announced";
      if (launchState) launchState.textContent = "Starts at cutoff";
      if (registrationCaption) registrationCaption.textContent = "Waiting for the official UTC event timestamp.";
      if (launchCaption) launchCaption.textContent = "Wallet eligibility has not yet been frozen.";
      if (registrationStage) registrationStage.classList.add("active");
      if (launchStage) launchStage.classList.remove("active", "complete");
    }

    if (!validTimestamp) {
      resetNotAnnounced();
      return;
    }

    var publicAtMs = publicAt.getTime();
    var cutoffAtMs = publicAtMs - daySeconds * 1000;

    function parts(milliseconds) {
      var remaining = Math.max(0, Math.floor(milliseconds / 1000));
      var days = Math.floor(remaining / 86400);
      var hours = Math.floor((remaining % 86400) / 3600);
      var minutes = Math.floor((remaining % 3600) / 60);
      var seconds = remaining % 60;
      return { days: days, hours: hours, minutes: minutes, seconds: seconds };
    }

    function tick() {
      var now = Date.now();
      if (now < cutoffAtMs) {
        var beforeCutoff = parts(cutoffAtMs - now);
        setDigits(registrationDigits,
          [beforeCutoff.days, beforeCutoff.hours, beforeCutoff.minutes, beforeCutoff.seconds],
          ["Days", "Hours", "Minutes", "Seconds"]);
        setDigits(launchDigits, ["—", "—", "—"], ["Hours", "Minutes", "Seconds"]);
        if (registrationState) registrationState.textContent = "Registration open";
        if (launchState) launchState.textContent = "Starts at cutoff";
        if (registrationCaption) registrationCaption.textContent = "Wallet registration closes at " + new Date(cutoffAtMs).toISOString() + ".";
        if (launchCaption) launchCaption.textContent = "The 24-hour launch phase begins when registration closes.";
        if (registrationStage) registrationStage.classList.add("active");
        if (launchStage) launchStage.classList.remove("active", "complete");
        return;
      }

      if (now < publicAtMs) {
        var beforeLaunch = parts(publicAtMs - now);
        setDigits(registrationDigits, ["00", "00", "00", "00"], ["Days", "Hours", "Minutes", "Seconds"]);
        setDigits(launchDigits,
          [beforeLaunch.hours + (beforeLaunch.days * 24), beforeLaunch.minutes, beforeLaunch.seconds],
          ["Hours", "Minutes", "Seconds"]);
        if (registrationState) registrationState.textContent = "Registration closed";
        if (launchState) launchState.textContent = "Final 24 hours";
        if (registrationCaption) registrationCaption.textContent = "The verified-wallet eligibility set is frozen.";
        if (launchCaption) launchCaption.textContent = "Public deployment begins at " + publicAt.toISOString() + ".";
        if (registrationStage) registrationStage.classList.remove("active");
        if (launchStage) launchStage.classList.add("active");
        return;
      }

      setDigits(registrationDigits, ["00", "00", "00", "00"], ["Days", "Hours", "Minutes", "Seconds"]);
      setDigits(launchDigits, ["00", "00", "00"], ["Hours", "Minutes", "Seconds"]);
      if (registrationState) registrationState.textContent = "Closed";
      if (launchState) launchState.textContent = "Event time reached";
      if (registrationCaption) registrationCaption.textContent = "The eligible-wallet set remains frozen.";
      if (launchCaption) launchCaption.textContent = "The scheduled public-deployment timestamp has arrived.";
      if (registrationStage) registrationStage.classList.remove("active");
      if (launchStage) launchStage.classList.add("complete");
    }

    tick();
    window.setInterval(tick, 1000);
  }

  initializePublicEventCountdown();

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
    pseudonymDisplay.textContent = name || "Choose a participant display name";
  }

  pseudonymInput.value = generatePseudonym();
  updatePseudonym();
  pseudonymInput.addEventListener("input", updatePseudonym);
  randomizeButton.addEventListener("click", function () {
    pseudonymInput.value = generatePseudonym();
    updatePseudonym();
    solanaFeedback.textContent = "A new preview display name has been generated. It is not saved to a participant record.";
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
    lastConnectedNetwork = "ethereum";
    evmAddress.textContent = account;
    updateSupporterActionButtons();
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
        "EVM wallet connected. It is not registered yet; use the member controls below to prove ownership with an off-chain message signature.",
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
      lastConnectedNetwork = "solana";
      solanaAddress.textContent = account.address;
      solanaChain.textContent = "Wallet-reported network(s): " + account.chains
        .filter(function (chain) { return typeof chain === "string" && chain.indexOf("solana:") === 0; })
        .join(", ");
      solanaConnectButton.textContent = "Solana wallet connected";
      renderSolanaChoices();
      solanaConnectButton.disabled = true;
      setFeedback(
        solanaFeedback,
        "Solana wallet connected. It is not registered yet; use the member controls below to prove ownership with an off-chain message signature.",
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
        updateSupporterActionButtons();
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
    if (lastConnectedNetwork === "tron") lastConnectedNetwork = null;
    tronAddress.textContent = "Not connected";
    tronChain.textContent = "Network not confirmed";
    tronConnectButton.textContent = "Connect TRON wallet";
    renderTronChoices();
    if (showMessage) setFeedback(tronFeedback, "Local TRON wallet display cleared. No transaction or message was signed.", "neutral");
    updateSupporterActionButtons();
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
      setFeedback(tronFeedback, "TRON wallet connected. It is not registered yet; use the member controls below to prove ownership with an off-chain message signature.", "connected");
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
          return providerRequest(connectedEvm.provider, "personal_sign", [message, connectedEvmAddress]);
        }
      };
    }
    if (lastConnectedNetwork === "tron" && connectedTronProvider && connectedTronAddress) {
      var tronWeb = connectedTronProvider.tronWeb ||
        (window.tron && window.tron.tronWeb) || null;
      return {
        network: "tron",
        address: connectedTronAddress,
        mainnet: String(connectedTronChainId || "").toLowerCase() === "0x2b6653dc",
        sign: async function (message) {
          if (!tronWeb || !tronWeb.trx || typeof tronWeb.trx.signMessageV2 !== "function") {
            throw new Error("This TRON wallet does not expose TronLink signMessageV2 message signing.");
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
        mainnet: chains.indexOf("solana:mainnet") !== -1,
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
    var ready = Boolean(supporterRuntimeEnabled && wallet && wallet.mainnet);
    if (memberMode) {
      memberMode.textContent = supporterRuntimeEnabled ? "STAGING · PRELAUNCH" : "Standalone preview";
    }
    if (registerWalletButton) registerWalletButton.disabled = !ready || Boolean(supporterMember);
    if (loginWalletButton) loginWalletButton.disabled = !ready || Boolean(supporterMember);
    if (linkWalletButton) linkWalletButton.disabled = !ready || !supporterMember;
    if (logoutButton) logoutButton.disabled = !supporterRuntimeEnabled || !supporterMember;
    if (walletPurposeSelect) walletPurposeSelect.disabled = !supporterRuntimeEnabled || !supporterMember;
    if (pseudonymInput) pseudonymInput.disabled = Boolean(supporterMember);
    if (randomizeButton) randomizeButton.disabled = Boolean(supporterMember);
    if (memberProfileState) {
      memberProfileState.textContent = supporterMember ? "Wallet verified" :
        supporterRuntimeEnabled ? "Not registered" : "Preview only";
    }
    if (!supporterRuntimeEnabled) {
      if (memberFeedback) {
        setFeedback(memberFeedback, "Standalone preview only. Wallet addresses can be displayed, but registration and wallet linking require the official staging Worker.", "neutral");
      }
      return;
    }
    if (supporterMember) {
      if (memberSummary) memberSummary.textContent = supporterMember.member.username + " · verified Genesis Programme participant";
      return;
    }
    if (!wallet) {
      if (memberFeedback) setFeedback(memberFeedback, "Connect an Ethereum, Tron or Solana wallet to continue. No funds are requested.", "neutral");
    } else if (!wallet.mainnet) {
      var expected = wallet.network === "ethereum" ? "Ethereum Mainnet (chain ID 1)" :
        wallet.network === "tron" ? "TRON Mainnet" : "Solana Mainnet";
      if (memberFeedback) setFeedback(memberFeedback, "The connected wallet is not reporting " + expected + ". Switch networks in the wallet, then reconnect. No signature has been requested.", "error");
    } else if (memberFeedback && memberFeedback.dataset.state === "neutral") {
      setFeedback(memberFeedback, wallet.network.toUpperCase() + " mainnet wallet connected. Register or sign in below using an off-chain ownership message.", "neutral");
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
      if (response.status === 428) {
        throw new Error("First acknowledge the public test-environment notice on the AstroCrown homepage, then return here.");
      }
      throw new Error(data && data.error ? data.error : "The Genesis Programme service returned HTTP " + response.status + ".");
    }
    return data;
  }

  async function signSupporterChallenge(wallet, message) {
    setFeedback(memberFeedback, "Your wallet will now display a message asking you to prove ownership. Read the full text. It must say this is an off-chain wallet-ownership proof, not a transaction.", "neutral");
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

  function applySupporterProfile(data) {
    if (!data || !data.member || typeof data.member.username !== "string" || !Array.isArray(data.wallets)) {
      throw new Error("The Genesis Programme service returned an incomplete member profile.");
    }
    supporterMember = data;
    pseudonymInput.value = data.member.username;
    updatePseudonym();
    if (memberSummary) memberSummary.textContent = data.member.username + " · verified Genesis Programme participant";
    if (memberWalletList) {
      memberWalletList.textContent = data.wallets.length
        ? data.wallets.map(function (wallet) {
            return wallet.network.toUpperCase() + " · " + wallet.role.replace(/_/g, " ") + " · " + wallet.address;
          }).join("  |  ")
        : "No verified wallets linked.";
    }
    if (memberProfileState) memberProfileState.textContent = "Wallet verified";
    if (memberFeedback) {
      setFeedback(memberFeedback, "Signed in as " + data.member.username + ". " + data.wallets.length +
        " wallet address(es) have independently verified ownership. Contributions and purchases remain disabled.", "connected");
    }
    updateSupporterActionButtons();
  }

  async function refreshSupporterMember() {
    if (!supporterRuntimeMarkerPresent()) return;
    try {
      var response = await fetch("/api/supporters/me", {
        method: "GET",
        credentials: "same-origin",
        headers: { "Accept": "application/json" }
      });
      if (response.ok) {
        applySupporterProfile(await response.json());
      } else if (response.status === 428) {
        setFeedback(memberFeedback, "Acknowledge the public staging notice on the AstroCrown homepage before registering or signing in.", "neutral");
      } else if (response.status !== 401) {
        setFeedback(memberFeedback, "The participant session could not be checked. Contributions remain disabled.", "error");
      }
    } catch (_) {
      setFeedback(memberFeedback, "The participant session could not be checked. Contributions remain disabled.", "error");
    }
  }

  async function runSupporterRegistration() {
    var wallet = activeConnectedWallet();
    if (!supporterRuntimeMarkerPresent() || !wallet || !wallet.mainnet || supporterMember) return;
    registerWalletButton.disabled = true;
    loginWalletButton.disabled = true;
    try {
      var username = pseudonymInput.value.trim();
      var challenge = await supporterApiPost("/api/supporters/registration/challenge", {
        username: username,
        network: wallet.network,
        address: wallet.address
      });
      setFeedback(memberFeedback, "Registration challenge created. Confirm the off-chain message in your wallet; this does not transfer funds or pay gas.", "neutral");
      var signature = await signSupporterChallenge(wallet, challenge.message);
      var profile = await supporterApiPost("/api/supporters/registration/verify", {
        challengeId: challenge.challengeId,
        signature: signature
      });
      applySupporterProfile(profile);
    } catch (error) {
      setFeedback(memberFeedback, error && error.message ? error.message : String(error || "Registration was not completed."), "error");
    } finally {
      updateSupporterActionButtons();
    }
  }

  async function runSupporterLogin() {
    var wallet = activeConnectedWallet();
    if (!supporterRuntimeMarkerPresent() || !wallet || !wallet.mainnet || supporterMember) return;
    registerWalletButton.disabled = true;
    loginWalletButton.disabled = true;
    try {
      var challenge = await supporterApiPost("/api/supporters/login/challenge", {
        network: wallet.network,
        address: wallet.address
      });
      var signature = await signSupporterChallenge(wallet, challenge.message);
      var profile = await supporterApiPost("/api/supporters/login/verify", {
        challengeId: challenge.challengeId,
        signature: signature
      });
      applySupporterProfile(profile);
    } catch (error) {
      setFeedback(memberFeedback, error && error.message ? error.message : String(error || "Wallet sign-in was not completed."), "error");
    } finally {
      updateSupporterActionButtons();
    }
  }

  async function runSupporterWalletLink() {
    var wallet = activeConnectedWallet();
    if (!supporterRuntimeMarkerPresent() || !wallet || !wallet.mainnet || !supporterMember) return;
    linkWalletButton.disabled = true;
    try {
      var role = walletPurposeSelect.value || "PAYMENT";
      if (role !== "PAYMENT" && wallet.network !== "solana") {
        throw new Error("Only a Solana wallet can be used as an ACROWN delivery wallet.");
      }
      var challenge = await supporterApiPost("/api/supporters/wallet-challenge", {
        network: wallet.network,
        address: wallet.address,
        walletRole: role
      });
      var signature = await signSupporterChallenge(wallet, challenge.message);
      var profile = await supporterApiPost("/api/supporters/wallet-verify", {
        challengeId: challenge.challengeId,
        signature: signature,
        purpose: challenge.purpose
      });
      applySupporterProfile(profile);
    } catch (error) {
      setFeedback(memberFeedback, error && error.message ? error.message : String(error || "Wallet linking was not completed."), "error");
    } finally {
      updateSupporterActionButtons();
    }
  }

  async function runSupporterLogout() {
    if (!supporterMember) return;
    logoutButton.disabled = true;
    try {
      await supporterApiPost("/api/supporters/logout", {});
      supporterMember = null;
      if (memberSummary) memberSummary.textContent = "Not signed in";
      if (memberWalletList) memberWalletList.textContent = "No verified wallets linked.";
      pseudonymInput.disabled = false;
      randomizeButton.disabled = false;
      pseudonymInput.value = generatePseudonym();
      updatePseudonym();
      setFeedback(memberFeedback, "You have signed out. The programme session has been revoked.", "neutral");
    } catch (error) {
      setFeedback(memberFeedback, error && error.message ? error.message : "Sign out could not be completed.", "error");
    } finally {
      updateSupporterActionButtons();
    }
  }

  if (registerWalletButton) registerWalletButton.addEventListener("click", runSupporterRegistration);
  if (loginWalletButton) loginWalletButton.addEventListener("click", runSupporterLogin);
  if (linkWalletButton) linkWalletButton.addEventListener("click", runSupporterWalletLink);
  if (logoutButton) logoutButton.addEventListener("click", runSupporterLogout);

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
  updateSupporterActionButtons();
  refreshSupporterMember();

  // Never call eth_sign, eth_sendTransaction, signAndSendTransaction,
  // signTransaction, signAndSendTransaction, signMessageV2, or any wallet payment method here.
  renderEvmChoices();
  renderSolanaChoices();
  renderTronChoices();
}());
(function () {
  "use strict";

  var walletSelect = document.getElementById("supporter-wallet-choice");
  var connectButton = document.getElementById("supporter-wallet-connect");
  var clearButton = document.getElementById("supporter-wallet-clear");
  var walletFeedback = document.getElementById("supporter-wallet-feedback");
  var walletAddress = document.getElementById("supporter-wallet-address");
  var walletChain = document.getElementById("supporter-wallet-chain");
  var pseudonymInput = document.getElementById("member-pseudonym");
  var pseudonymDisplay = document.getElementById("member-display-name");
  var randomizeButton = document.getElementById("member-name-randomize");

  if (!walletSelect || !connectButton || !pseudonymInput) return;

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
    walletFeedback.textContent = "A new preview pseudonym has been generated. It is not saved to a member record.";
    walletFeedback.dataset.state = "neutral";
  });

  var wallets = new Map();
  var nextWalletId = 0;
  var connectedWallet = null;
  var connectedAccount = null;

  function setFeedback(message, state) {
    walletFeedback.textContent = message;
    walletFeedback.dataset.state = state || "neutral";
  }

  function supportedWallet(wallet) {
    return Boolean(
      wallet &&
      typeof wallet.name === "string" &&
      wallet.features &&
      wallet.features["standard:connect"] &&
      typeof wallet.features["standard:connect"].connect === "function"
    );
  }

  function renderWalletChoices() {
    var previous = walletSelect.value;
    walletSelect.textContent = "";
    var option = document.createElement("option");
    option.value = "";
    option.textContent = wallets.size ? "Select a compatible wallet" : "No compatible Solana wallet detected";
    walletSelect.appendChild(option);

    wallets.forEach(function (wallet, id) {
      var item = document.createElement("option");
      item.value = id;
      item.textContent = wallet.name;
      walletSelect.appendChild(item);
    });

    if (previous && wallets.has(previous)) walletSelect.value = previous;
    walletSelect.disabled = wallets.size === 0;
    connectButton.disabled = wallets.size === 0 || Boolean(connectedAccount);
    clearButton.disabled = !connectedAccount;
  }

  function registerWallets() {
    var incoming = Array.prototype.slice.call(arguments);
    var registeredIds = [];

    incoming.forEach(function (wallet) {
      if (!supportedWallet(wallet)) return;
      var id = "wallet-" + (++nextWalletId);
      wallets.set(id, wallet);
      registeredIds.push(id);
    });

    renderWalletChoices();
    if (registeredIds.length) {
      setFeedback(wallets.size + " compatible wallet option(s) detected. Choose the wallet you control.", "neutral");
    }

    return function unregisterWallets() {
      registeredIds.forEach(function (id) {
        wallets.delete(id);
        if (connectedWallet && connectedWallet.id === id) clearConnection(false);
      });
      renderWalletChoices();
    };
  }

  var walletApi = Object.freeze({ register: registerWallets });

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

  function clearConnection(callWalletDisconnect) {
    var wallet = connectedWallet && connectedWallet.wallet;
    if (callWalletDisconnect && wallet && wallet.features &&
        wallet.features["standard:disconnect"] &&
        typeof wallet.features["standard:disconnect"].disconnect === "function") {
      try {
        wallet.features["standard:disconnect"].disconnect();
      } catch (_) {
        // Clearing the local display does not depend on an optional wallet disconnect feature.
      }
    }

    connectedWallet = null;
    connectedAccount = null;
    walletAddress.textContent = "Not connected";
    walletChain.textContent = "No wallet network confirmed";
    renderWalletChoices();
    setFeedback("Local dashboard connection cleared. No transaction or message was signed.", "neutral");
  }

  walletSelect.addEventListener("change", function () {
    renderWalletChoices();
  });

  connectButton.addEventListener("click", async function () {
    var id = walletSelect.value;
    var wallet = wallets.get(id);
    if (!wallet || !supportedWallet(wallet)) {
      setFeedback("Choose a compatible Solana wallet first.", "error");
      return;
    }

    connectButton.disabled = true;
    connectButton.textContent = "Connecting…";
    setFeedback("Approve the wallet's connection request to share its public address. No signature or transaction is requested.", "neutral");

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

      connectedWallet = { id: id, wallet: wallet };
      connectedAccount = account;
      walletAddress.textContent = account.address;
      walletChain.textContent = "Wallet-reported network(s): " + account.chains
        .filter(function (chain) { return typeof chain === "string" && chain.indexOf("solana:") === 0; })
        .join(", ");
      clearButton.disabled = false;
      connectButton.textContent = "Wallet connected";
      connectButton.disabled = true;
      walletSelect.disabled = true;
      setFeedback(
        "Wallet connected for display only. Its public address has not been registered by the programme backend, and no entitlement has been activated.",
        "connected"
      );
    } catch (error) {
      connectButton.textContent = "Connect wallet";
      connectButton.disabled = false;
      setFeedback(
        error && error.message ? error.message : "Wallet connection was not completed. No funds were requested.",
        "error"
      );
    }
  });

  clearButton.addEventListener("click", function () {
    clearConnection(true);
    connectButton.textContent = "Connect wallet";
    walletSelect.disabled = wallets.size === 0;
  });

  // This page deliberately does not call signMessage, signTransaction,
  // signAndSendTransaction, sendTransaction, or a payment API.
  renderWalletChoices();
}());
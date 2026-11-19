"use strict";

(() => {
  const byId = (id) => document.getElementById(id);
  const connectButton = byId("connect-button");
  const signButton = byId("sign-button");
  const clearButton = byId("clear-button");
  const logoutButton = byId("logout-button");
  const addressValue = byId("address-value");
  const chainValue = byId("chain-value");
  const messageBox = byId("siwe-message");
  const challengeExpiry = byId("challenge-expiry");
  const status = byId("status");
  const sessionValue = byId("session-value");
  const verifiedAddress = byId("verified-address");
  const sessionExpiry = byId("session-expiry");

  let provider = null;
  let connectedAddress = null;
  let connectedChainId = null;
  let challenge = null;
  let requestInProgress = false;

  function setStatus(message, state = "") {
    status.textContent = message;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  }

  function setBusy(busy) {
    requestInProgress = busy;
    connectButton.disabled = busy;
    signButton.disabled = busy || !provider || !challenge;
    clearButton.disabled = busy || !challenge;
    logoutButton.disabled = busy;
  }

  function clearChallenge(message = "Challenge cleared. No signature was requested.") {
    challenge = null;
    messageBox.textContent = "No active challenge. Connect the test wallet to request a new one.";
    challengeExpiry.textContent = "";
    signButton.disabled = true;
    clearButton.disabled = true;
    setStatus(message);
  }

  async function responseJson(response) {
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("The local server returned an invalid response.");
    }
    if (!response.ok) {
      throw new Error(typeof payload.error === "string" ? payload.error : "The local request failed.");
    }
    return payload;
  }

  async function requestJson(path, payload) {
    const response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return responseJson(response);
  }

  function normalizeChainId(value) {
    if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) {
      throw new Error("The wallet did not return a valid chain ID.");
    }
    const parsed = Number(BigInt(value));
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new Error("The wallet returned an unsupported chain ID.");
    }
    return parsed;
  }

  function toHexUtf8(value) {
    const bytes = new TextEncoder().encode(value);
    let hex = "";
    for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
    return "0x" + hex;
  }

  async function connectAndCreateChallenge() {
    if (requestInProgress) return;
    if (!window.ethereum || typeof window.ethereum.request !== "function") {
      setStatus("No injected EIP-1193 wallet was found in this browser. Open this page in the browser profile containing your test wallet; no relay is used.", "error");
      return;
    }

    provider = window.ethereum;
    setBusy(true);
    clearChallenge("Waiting for the wallet connection request.");
    try {
      // This prompt is caused only by the user's click on Connect test wallet.
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
        throw new Error("The wallet did not return an account.");
      }
      const address = accounts[0];
      const chainId = normalizeChainId(await provider.request({ method: "eth_chainId" }));
      connectedAddress = address;
      connectedChainId = chainId;
      addressValue.textContent = address;
      chainValue.textContent = String(chainId);
      const issued = await requestJson("/api/challenge", { address, chainId });
      challenge = { message: issued.message, address, chainId };
      messageBox.textContent = issued.message;
      challengeExpiry.textContent = "Expires at " + issued.expiresAt + ". A new challenge is required after expiry, cancellation or failure.";
      signButton.disabled = false;
      clearButton.disabled = false;
      setStatus("Challenge ready. Read the entire message above before choosing Sign in with wallet.");
    } catch (error) {
      clearChallenge("Wallet connection or challenge creation failed. No signature was requested.");
      setStatus(error instanceof Error ? error.message : "Wallet connection failed.", "error");
    } finally {
      setBusy(false);
      signButton.disabled = !challenge;
      clearButton.disabled = !challenge;
    }
  }

  async function signIn() {
    if (requestInProgress || !provider || !challenge) return;
    setBusy(true);
    try {
      const accounts = await provider.request({ method: "eth_accounts" });
      const address = Array.isArray(accounts) ? accounts[0] : null;
      const chainId = normalizeChainId(await provider.request({ method: "eth_chainId" }));
      if (
        typeof address !== "string" ||
        address.toLowerCase() !== challenge.address.toLowerCase() ||
        chainId !== challenge.chainId
      ) {
        clearChallenge("The selected wallet account or chain changed. Connect again for a fresh challenge.");
        return;
      }

      // A distinct user click is required; the complete message is visible above.
      setStatus("Check the wallet window. Confirm only if the message matches the one shown on this page.");
      const signature = await provider.request({
        method: "personal_sign",
        params: [toHexUtf8(challenge.message), address],
      });
      if (typeof signature !== "string") {
        throw new Error("The wallet did not return a signature.");
      }
      const result = await requestJson("/api/verify", {
        message: challenge.message,
        signature,
      });
      challenge = null;
      messageBox.textContent = "Challenge consumed after verification.";
      challengeExpiry.textContent = "";
      sessionValue.textContent = "Authenticated locally";
      verifiedAddress.textContent = result.address;
      sessionExpiry.textContent = "30 minutes maximum; erased if the server process restarts.";
      logoutButton.disabled = false;
      setStatus("The local server verified the wallet signature and created a temporary session. No transaction was sent.", "success");
      signButton.disabled = true;
      clearButton.disabled = true;
    } catch (error) {
      clearChallenge("Authentication did not complete. No session is created unless the server verifies the signature.");
      setStatus(error instanceof Error ? error.message : "Authentication failed.", "error");
    } finally {
      setBusy(false);
      signButton.disabled = !challenge;
      clearButton.disabled = !challenge;
    }
  }

  async function restoreSessionDisplay() {
    try {
      const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" });
      const session = await responseJson(response);
      if (session.authenticated) {
        sessionValue.textContent = "Authenticated locally";
        verifiedAddress.textContent = session.address;
        sessionExpiry.textContent = session.expiresAt;
        logoutButton.disabled = false;
        setStatus("An in-memory local test session is active. This is not a production session.", "success");
      }
    } catch {
      setStatus("Local server session status could not be loaded.", "error");
    }
  }

  async function logout() {
    if (requestInProgress) return;
    setBusy(true);
    try {
      await requestJson("/api/logout", {});
      sessionValue.textContent = "Not authenticated";
      verifiedAddress.textContent = "—";
      sessionExpiry.textContent = "—";
      logoutButton.disabled = true;
      setStatus("The local session was ended.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not end the session.", "error");
    } finally {
      setBusy(false);
      logoutButton.disabled = sessionValue.textContent !== "Authenticated locally";
    }
  }

  connectButton.addEventListener("click", connectAndCreateChallenge);
  signButton.addEventListener("click", signIn);
  clearButton.addEventListener("click", () => clearChallenge());
  logoutButton.addEventListener("click", logout);

  if (window.ethereum && typeof window.ethereum.on === "function") {
    window.ethereum.on("accountsChanged", () => {
      connectedAddress = null;
      clearChallenge("Wallet account changed. Connect again to create a new challenge.");
      addressValue.textContent = "Not connected";
    });
    window.ethereum.on("chainChanged", () => {
      connectedChainId = null;
      clearChallenge("Wallet chain changed. Connect again to create a new challenge.");
      chainValue.textContent = "Not read";
    });
  }

  // Page load never opens the wallet or requests a signature.
  restoreSessionDisplay();
})();

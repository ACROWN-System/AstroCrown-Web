/* Development-only administrator wallet step-up UI.
 * This module does not execute on ordinary sign-in. A wallet prompt is made
 * only after an authorized user explicitly clicks "Verify administrator wallet".
 * No transaction method is used and no wallet/provider result creates a role.
 */
(function () {
  "use strict";

  var busy = false;
  var MAX_MESSAGE_CHARS = 8192;

  function feedback(message) {
    var target = document.getElementById("account-admin-access-feedback");
    if (target) target.textContent = message || "";
  }

  async function requestJson(path, body) {
    var options = {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Accept": "application/json" }
    };
    if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
    var response = await fetch(path, options);
    var payload = {};
    try {
      payload = await response.json();
    } catch (_error) {
      payload = {};
    }
    if (!response.ok) {
      throw new Error(typeof payload.error === "string" ? payload.error : "The server rejected this administrator access request.");
    }
    return payload;
  }

  function utf8Hex(value) {
    var bytes = new TextEncoder().encode(value);
    var result = "0x";
    for (var i = 0; i < bytes.length; i += 1) {
      result += bytes[i].toString(16).padStart(2, "0");
    }
    return result;
  }

  function closeDialog(dialog) {
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function signatureReviewDialog() {
    var dialog = document.getElementById("admin-wallet-proof-dialog");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "admin-wallet-proof-dialog";
    dialog.className = "admin-wallet-proof-dialog";
    dialog.setAttribute("aria-labelledby", "admin-wallet-proof-title");
    dialog.innerHTML =
      '<div class="admin-wallet-proof-shell">' +
        '<div class="admin-wallet-proof-heading">' +
          '<div><p class="account-dashboard-kicker">ASTROCROWN · ADMIN ACCESS</p><h2 id="admin-wallet-proof-title">Review wallet signature</h2></div>' +
          '<button class="admin-wallet-proof-close" id="admin-wallet-proof-close" type="button" aria-label="Close wallet verification">×</button>' +
        '</div>' +
        '<p class="admin-wallet-proof-explainer">Read the exact message below. Signing proves control of a registered wallet for this already-authorized account. <strong>It does not authorize a blockchain transaction.</strong> The server never asks for a private key or seed phrase.</p>' +
        '<pre class="admin-wallet-proof-message" id="admin-wallet-proof-message" tabindex="0"></pre>' +
        '<p class="admin-wallet-proof-status" id="admin-wallet-proof-status" role="status" aria-live="polite"></p>' +
        '<div class="admin-wallet-proof-actions">' +
          '<button class="account-secondary" id="admin-wallet-proof-cancel" type="button">Cancel</button>' +
          '<button class="account-primary" id="admin-wallet-proof-sign" type="button">Sign this message</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dialog);
    return dialog;
  }

  function reviewAndSign(provider, address, chainId, message) {
    if (typeof message !== "string" || !message || message.length > MAX_MESSAGE_CHARS) {
      return Promise.reject(new Error("The server returned an invalid wallet message."));
    }
    var dialog = signatureReviewDialog();
    var messageNode = document.getElementById("admin-wallet-proof-message");
    var statusNode = document.getElementById("admin-wallet-proof-status");
    var signButton = document.getElementById("admin-wallet-proof-sign");
    var cancelButton = document.getElementById("admin-wallet-proof-cancel");
    var closeButton = document.getElementById("admin-wallet-proof-close");

    messageNode.textContent = message;
    statusNode.textContent = "";
    signButton.disabled = false;

    return new Promise(function (resolve) {
      var done = false;
      function finish(value) {
        if (done) return;
        done = true;
        signButton.removeEventListener("click", onSign);
        cancelButton.removeEventListener("click", onCancel);
        closeButton.removeEventListener("click", onCancel);
        dialog.removeEventListener("cancel", onNativeCancel);
        dialog.removeEventListener("click", onBackdrop);
        closeDialog(dialog);
        resolve(value);
      }
      function onCancel() { finish(null); }
      function onNativeCancel(event) {
        event.preventDefault();
        finish(null);
      }
      function onBackdrop(event) {
        if (event.target === dialog) finish(null);
      }
      async function onSign() {
        if (signButton.disabled) return;
        signButton.disabled = true;
        statusNode.textContent = "Checking that the selected wallet and chain have not changed…";
        try {
          var currentAccounts = await provider.request({ method: "eth_accounts" });
          var currentChain = await provider.request({ method: "eth_chainId" });
          var currentChainId = typeof currentChain === "string" && /^0x[0-9a-f]+$/i.test(currentChain)
            ? Number.parseInt(currentChain, 16)
            : NaN;
          if (!Array.isArray(currentAccounts) || !currentAccounts.some(function (item) {
            return typeof item === "string" && item.toLowerCase() === address.toLowerCase();
          })) {
            throw new Error("The connected wallet changed. Cancel this request and start again with the registered wallet.");
          }
          if (!Number.isSafeInteger(currentChainId) || currentChainId !== chainId) {
            throw new Error("The selected network changed. Cancel this request and start again on the registered chain.");
          }
          statusNode.textContent = "Confirm the signature in your wallet. No transaction will be submitted.";
          var signature = await provider.request({
            method: "personal_sign",
            params: [utf8Hex(message), address]
          });
          if (typeof signature !== "string" || !/^0x[0-9a-f]+$/i.test(signature)) {
            throw new Error("The wallet did not return a valid signature.");
          }
          finish(signature);
        } catch (error) {
          statusNode.textContent = error && typeof error.message === "string"
            ? error.message
            : "The wallet rejected the signature request. No administrator access was granted.";
          signButton.disabled = false;
        }
      }

      signButton.addEventListener("click", onSign);
      cancelButton.addEventListener("click", onCancel);
      closeButton.addEventListener("click", onCancel);
      dialog.addEventListener("cancel", onNativeCancel);
      dialog.addEventListener("click", onBackdrop);
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "open");
      messageNode.focus();
    });
  }

  async function requestAdminWalletAccess() {
    if (busy) return;
    busy = true;
    try {
      feedback("Checking the account's server-assigned administrator role…");
      var accountStatus = await requestJson("/api/account/status");
      if (accountStatus.authenticated !== true || accountStatus.adminRoleAssigned !== true) {
        throw new Error("This account has no server-assigned administrator role. Connecting a wallet cannot create one.");
      }
      if (accountStatus.adminSessionAuthorized === true) {
        window.location.hash = "admin";
        return;
      }
      var provider = window.ethereum;
      if (!provider || typeof provider.request !== "function") {
        throw new Error("No compatible browser wallet is available. Wallet access is only needed here, not for ordinary account sign-in.");
      }

      var walletOptions = await requestJson("/api/admin/wallet-options", {});
      if (!Array.isArray(walletOptions.wallets) || walletOptions.wallets.length === 0) {
        throw new Error("No administrator wallets are registered for this account. The authorized local owner must provision a wallet before admin access can be used.");
      }
      feedback("Requesting the wallet only because you explicitly selected administrator access…");
      var accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!Array.isArray(accounts) || !accounts.length || accounts.some(function (item) {
        return typeof item !== "string" || !/^0x[0-9a-f]{40}$/i.test(item);
      })) {
        throw new Error("The connected provider did not return a valid wallet account list.");
      }
      var chainHex = await provider.request({ method: "eth_chainId" });
      var chainId = typeof chainHex === "string" && /^0x[0-9a-f]+$/i.test(chainHex)
        ? Number.parseInt(chainHex, 16)
        : NaN;
      if (!Number.isSafeInteger(chainId) || chainId <= 0) {
        throw new Error("The connected wallet did not return a valid network identifier.");
      }
      var matchingWallet = walletOptions.wallets.find(function (wallet) {
        return wallet && typeof wallet.address === "string" &&
          wallet.chainId === chainId &&
          accounts.some(function (connectedAddress) {
            return connectedAddress.toLowerCase() === wallet.address.toLowerCase();
          });
      });
      if (!matchingWallet) {
        throw new Error("None of the connected wallet accounts matches a registered administrator wallet on this network. Switch to one of your registered wallets and retry. No signature was requested.");
      }
      var address = matchingWallet.address;

      feedback("Requesting a short-lived proof-of-control challenge for the selected registered wallet…");
      var challenge = await requestJson("/api/admin/wallet-challenge", {
        address: address,
        chainId: chainId
      });
      if (challenge.transactionAuthorized !== false ||
          challenge.purpose !== "administrator-session-step-up" ||
          typeof challenge.message !== "string") {
        throw new Error("The server response did not match the expected signature-only administrator challenge.");
      }

      var signature = await reviewAndSign(provider, challenge.address, challenge.chainId, challenge.message);
      if (!signature) {
        feedback("Wallet verification was cancelled. Your ordinary account remains signed in; no administrator access was granted.");
        return;
      }

      feedback("Submitting the signature for server-side verification…");
      var verified = await requestJson("/api/admin/wallet-verify", {
        message: challenge.message,
        signature: signature
      });
      if (verified.adminRoleAssigned !== true || verified.adminWalletAuthenticated !== true ||
          verified.adminSessionAuthorized !== true || verified.admin !== true) {
        throw new Error("The server did not authorize the administrator session. The console remains closed.");
      }
      feedback("Administrator wallet verification succeeded. Opening the read-only development console…");
      window.location.hash = "admin";
    } catch (error) {
      feedback(error && typeof error.message === "string"
        ? error.message
        : "Administrator wallet verification failed. No access was granted.");
    } finally {
      busy = false;
    }
  }

  document.addEventListener("astrocrown:request-admin-wallet-access", requestAdminWalletAccess);
}());

(function () {
  "use strict";

  var title = document.getElementById("email-action-title");
  var intro = document.getElementById("email-action-intro");
  var status = document.getElementById("email-action-status");
  var form = document.getElementById("email-action-reset-form");
  var token = "";
  var action = "";

  function setStatus(message, kind) {
    status.textContent = message;
    status.setAttribute("data-kind", kind || "");
  }

  async function postJson(path, payload) {
    var response;
    try {
      response = await fetch(path, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (_error) {
      throw new Error("The account service could not be reached. Please try again.");
    }
    var result;
    try {
      result = await response.json();
    } catch (_error) {
      throw new Error("The account service returned an unreadable response.");
    }
    if (!response.ok) {
      throw new Error(typeof result.error === "string" ? result.error : "The account action could not be completed.");
    }
    return result;
  }

  function clearToken() {
    token = "";
    // The token is never retained in browser storage or left in the address bar.
    window.history.replaceState(null, "", window.location.pathname);
  }

  async function initialize() {
    var parameters = new URLSearchParams(window.location.search);
    action = parameters.get("type") || "";
    token = parameters.get("token") || "";
    clearToken();

    if (!token || token.length < 20 || token.length > 256) {
      title.textContent = "Account link unavailable";
      intro.textContent = "This account link is missing or invalid.";
      setStatus("Request a new verification or password-reset email from AstroCrown.", "error");
      return;
    }

    if (action === "verify") {
      title.textContent = "Verify your email address";
      intro.textContent = "Confirming the email address associated with your AstroCrown account.";
      var verificationToken = token;
      try {
        var result = await postJson("/api/account/email/verify", { token: verificationToken });
        token = "";
        setStatus(result.message || "Your email address has been verified.", "success");
        intro.textContent = "Email verification is complete.";
      } catch (error) {
        token = "";
        setStatus(error.message || "This verification link is invalid or has expired.", "error");
        intro.textContent = "Email verification could not be completed.";
      }
      return;
    }

    if (action === "reset") {
      title.textContent = "Reset your password";
      intro.textContent = "Choose a new passphrase of at least 15 characters. Completing this action signs out all existing sessions, including administrator step-up sessions.";
      form.hidden = false;
      setStatus("Enter your new password twice. The reset link can only be used once.", "");
      return;
    }

    token = "";
    title.textContent = "Account link unavailable";
    intro.textContent = "This account link does not identify a supported action.";
    setStatus("Request a new verification or password-reset email from AstroCrown.", "error");
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!token || action !== "reset") {
      setStatus("This password-reset link is no longer available. Request a new one.", "error");
      return;
    }
    var newPassword = document.getElementById("email-action-new-password").value;
    var confirmation = document.getElementById("email-action-confirm-password").value;
    if (newPassword.length < 15) {
      setStatus("Use a passphrase at least 15 characters long.", "error");
      return;
    }
    if (newPassword !== confirmation) {
      setStatus("The password confirmation does not match.", "error");
      document.getElementById("email-action-confirm-password").focus();
      return;
    }
    var submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    try {
      var result = await postJson("/api/account/password/reset/complete", {
        token: token,
        newPassword: newPassword,
        newPasswordConfirmation: confirmation
      });
      token = "";
      form.reset();
      form.hidden = true;
      intro.textContent = "Your password has been reset.";
      setStatus(result.message || "Sign in with your new password.", "success");
    } catch (error) {
      setStatus(error.message || "The password could not be reset.", "error");
    } finally {
      submit.disabled = false;
    }
  });

  initialize();
}());

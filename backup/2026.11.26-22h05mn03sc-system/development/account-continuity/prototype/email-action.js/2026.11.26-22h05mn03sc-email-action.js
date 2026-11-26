(function () {
  "use strict";

  var title = document.getElementById("email-action-title");
  var intro = document.getElementById("email-action-intro");
  var status = document.getElementById("email-action-status");
  var verifyForm = document.getElementById("email-action-verify-form");
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

  function scrubAddressBar() {
    // Keep the token only in this page's closure; remove it from browser history immediately.
    window.history.replaceState(null, "", window.location.pathname);
  }

  async function initialize() {
    var parameters = new URLSearchParams(window.location.search);
    action = parameters.get("type") || "";
    token = parameters.get("token") || "";
    scrubAddressBar();

    if (!token || token.length < 20 || token.length > 256) {
      title.textContent = "Account link unavailable";
      intro.textContent = "This account link is missing or invalid.";
      setStatus("Request a new verification or password-reset email from AstroCrown.", "error");
      return;
    }

    if (action === "verify") {
      title.textContent = "Verify your email address";
      intro.textContent = "Confirm that this email address belongs to your AstroCrown account.";
      verifyForm.hidden = false;
      setStatus("Press Verify email address to complete this action. Opening the link alone does not verify the account.", "");
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

  verifyForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!token || action !== "verify") {
      setStatus("This verification link is no longer available. Request a new one.", "error");
      return;
    }
    var verifyButton = verifyForm.querySelector("button[type=submit]");
    verifyButton.disabled = true;
    try {
      var result = await postJson("/api/account/email/verify", { token: token });
      token = "";
      verifyForm.hidden = true;
      intro.textContent = "Email verification is complete.";
      setStatus(result.message || "Your email address has been verified.", "success");
    } catch (error) {
      token = "";
      verifyForm.hidden = true;
      intro.textContent = "Email verification could not be completed.";
      setStatus(error.message || "This verification link is invalid or has expired.", "error");
    } finally {
      verifyButton.disabled = false;
    }
  });

  form.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-password-toggle]");
    if (!button) return;
    var input = document.getElementById(button.getAttribute("data-password-toggle"));
    if (!input) return;
    var reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    button.textContent = reveal ? "Hide" : "Show";
    button.setAttribute("aria-pressed", reveal ? "true" : "false");
    button.setAttribute(
      "aria-label",
      (reveal ? "Hide " : "Show ") +
        (input.id === "email-action-new-password" ? "new password" : "password confirmation")
    );
  });

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

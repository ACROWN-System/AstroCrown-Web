(function () {
  "use strict";
  var api = async function (path, payload) {
    var options = { method: payload === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store", headers: { "Accept": "application/json" } };
    if (payload !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(payload);
    }
    var response = await fetch("/api/cases" + path, options);
    var data;
    try { data = await response.json(); } catch (_error) { throw new Error("The case service returned an unreadable response."); }
    if (!response.ok) throw new Error(data.error || "The case request could not be completed.");
    return data;
  };
  var accountApi = async function (path) {
    var response = await fetch(path, { credentials: "same-origin", cache: "no-store", headers: { "Accept": "application/json" } });
    var data;
    try { data = await response.json(); } catch (_error) { throw new Error("The account service returned an unreadable response."); }
    if (!response.ok) throw new Error(data.error || "The request could not be completed.");
    return data;
  };
  var $ = function (id) { return document.getElementById(id); };
  if (window.location.hostname !== "localhost") {
    var unavailableNotice = $("case-backend-notice");
    if (unavailableNotice) {
      unavailableNotice.hidden = false;
      unavailableNotice.textContent = "The hosted HTML preview cannot connect to the local case database. This page is a static preview here. Run the documented localhost server to submit, access or recover a case. Do not enter real case information into a hosted preview.";
    }
    Array.prototype.forEach.call(document.querySelectorAll("#case-create-form, #case-lookup-form, #case-recovery-form, #case-recovery-status-form"), function (form) {
      Array.prototype.forEach.call(form.querySelectorAll("input, select, textarea, button"), function (control) {
        control.disabled = true;
      });
    });
    return;
  }
  var esc = function (value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  };
  var setFeedback = function (id, message, isError) {
    var node = $(id); if (!node) return;
    node.textContent = message || "";
    node.dataset.kind = isError ? "error" : "success";
  };
  var formValues = function (form) {
    return Object.fromEntries(new FormData(form).entries());
  };
  var downloadText = function (filename, content) {
    var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url; link.download = filename; link.rel = "noopener";
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };
  var showSecretReceipt = function (containerId, title, referenceLabel, reference, secretLabel, secret, message, filePrefix) {
    var container = $(containerId);
    container.hidden = false;
    container.innerHTML =
      '<h3>' + esc(title) + '</h3><p>' + esc(message) + '</p>' +
      '<div class="case-secret-grid">' +
      '<div class="case-secret-row"><small>' + esc(referenceLabel) + '</small><strong>' + esc(reference) + '</strong></div>' +
      '<div class="case-secret-row"><small>' + esc(secretLabel) + '</small><strong>' + esc(secret) + '</strong></div></div>' +
      '<div class="case-receipt-actions"><button class="case-button case-button-secondary" type="button" data-copy-secret>Copy receipt</button>' +
      '<button class="case-button case-button-quiet" type="button" data-download-secret>Download receipt</button></div>' +
      '<p class="case-small-print">The private key is displayed only at issuance. Save it before leaving this page. It is stored on the server as a hash, not as readable text.</p>';
    var receiptText = title + "\n" + referenceLabel + ": " + reference + "\n" + secretLabel + ": " + secret + "\n\n" + message + "\n";
    container.querySelector("[data-copy-secret]").addEventListener("click", async function () {
      try { await navigator.clipboard.writeText(receiptText); this.textContent = "Copied"; }
      catch (_error) { this.textContent = "Copy unavailable"; }
    });
    container.querySelector("[data-download-secret]").addEventListener("click", function () {
      downloadText(filePrefix + "-" + reference + ".txt", receiptText);
    });
    container.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  var eventLabel = function (type) {
    return ({
      received: "Submission received", automatic_triage: "Automatic classification",
      submitter_message: "Your additional information", administrator_reply: "AstroCrown response",
      internal_note: "Internal note", status_changed: "Status updated", escalated: "Priority review",
      reopened: "Case reopened", access_recovery_approved: "Recovery approved",
      access_recovery_declined: "Recovery not approved"
    })[type] || String(type || "Case update").replace(/_/g, " ");
  };
  var renderTimeline = function (events) {
    return '<div class="case-timeline">' + (events || []).map(function (event) {
      return '<div class="case-event"><strong>' + esc(eventLabel(event.event_type)) + '</strong>' +
        '<p>' + esc(event.message) + '</p><time>' + esc(event.created_at) + '</time></div>';
    }).join("") + '</div>';
  };
  var activeCase = null;
  var activeCaseKey = null;
  var renderCaseDetail = function (item, key) {
    activeCase = item; activeCaseKey = key || null;
    var container = $("case-detail");
    container.hidden = false;
    container.innerHTML =
      '<div class="case-card-top"><div><h3>' + esc(item.title) + '</h3><div class="case-meta">' + esc(item.referenceCode) + ' · ' + esc(item.kind) + ' · ' + esc(item.priority) + ' priority</div></div>' +
      '<span class="case-status">' + esc(item.status) + '</span></div>' +
      '<p>' + esc(item.description) + '</p><p class="case-meta">First update target: ' + esc(item.firstUpdateExpectation) + ' · Created: ' + esc(item.createdAt) + '</p>' +
      '<div class="case-receipt-actions"><button class="case-button case-button-quiet" type="button" data-download-case-history>Download case history</button></div>' +
      '<h3>Case history</h3>' + renderTimeline(item.events) +
      '<form id="case-message-form" class="case-reply-form"><label>Add information or request a review<textarea name="message" minlength="3" maxlength="5000" required placeholder="Add relevant information or explain why you are requesting a further review."></textarea></label><button class="case-button case-button-secondary" type="submit">Send case update</button><p class="case-feedback" id="case-message-feedback" role="status"></p></form>';
    container.querySelector("[data-download-case-history]").addEventListener("click", function () {
      var historyText = [
        "ASTROCROWN CASE HISTORY",
        "Reference: " + item.referenceCode,
        "Title: " + item.title,
        "Type: " + item.kind,
        "Topic: " + item.topic,
        "Status: " + item.status,
        "Priority: " + item.priority,
        "Created: " + item.createdAt,
        "Last updated: " + item.updatedAt,
        "",
        "PUBLIC CASE TIMELINE",
        (item.events || []).map(function (entry) {
          return "[" + entry.created_at + "] " + eventLabel(entry.event_type) + "\n" + entry.message;
        }).join("\n\n"),
        "",
        "This export contains the submitter-visible timeline only."
      ].join("\n");
      downloadText("astrocrown-case-history-" + item.referenceCode + ".txt", historyText);
    });
    $("case-message-form").addEventListener("submit", async function (event) {
      event.preventDefault();
      var message = formValues(this).message;
      try {
        var updated;
        if (activeCaseKey) {
          updated = await api("/message", { referenceCode: item.referenceCode, accessKey: activeCaseKey, message: message });
        } else {
          updated = await api("/account-message", { referenceCode: item.referenceCode, message: message });
        }
        renderCaseDetail(updated, activeCaseKey);
      } catch (error) { setFeedback("case-message-feedback", error.message, true); }
    });
    container.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  $("administrator-concern-field").hidden = false;
  $("case-kind").addEventListener("change", function () {
    $("administrator-concern-field").hidden = this.value !== "grievance";
    if (this.value !== "grievance") $("administrator-concern-field").querySelector("input").checked = false;
  });

  $("case-create-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    var values = formValues(this);
    values.administratorConcern = $("administrator-concern-field").querySelector("input").checked;
    var feedback = "case-create-feedback";
    setFeedback(feedback, "Recording your submission…", false);
    try {
      var result = await api("/create", values);
      setFeedback(feedback, "", false);
      showSecretReceipt(
        "case-receipt", "Your submission has been received",
        "Case reference", result.referenceCode,
        "Private case access key", result.accessKey,
        result.message + " First substantive update target: " + result.case.firstUpdateExpectation + ". This is not a guaranteed resolution date.",
        "astrocrown-case-receipt"
      );
      this.reset();
      $("administrator-concern-field").hidden = false;
      await loadAccountCases();
    } catch (error) { setFeedback(feedback, error.message, true); }
  });

  $("case-lookup-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    var values = formValues(this);
    setFeedback("case-lookup-feedback", "Checking the case credentials…", false);
    try {
      var item = await api("/lookup", values);
      setFeedback("case-lookup-feedback", "", false);
      activeCaseKey = values.accessKey;
      renderCaseDetail(item, values.accessKey);
    } catch (error) { setFeedback("case-lookup-feedback", error.message, true); }
  });

  $("case-recovery-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    var values = formValues(this);
    if (!values.caseReference) values.caseReference = "";
    setFeedback("case-recovery-feedback", "Recording the recovery request…", false);
    try {
      var result = await api("/recovery-request", values);
      setFeedback("case-recovery-feedback", "", false);
      showSecretReceipt(
        "case-recovery-receipt", "Your recovery request has been recorded",
        "Recovery reference", result.recoveryReference,
        "Private recovery key", result.recoveryKey,
        result.message,
        "astrocrown-recovery-receipt"
      );
      this.reset();
    } catch (error) { setFeedback("case-recovery-feedback", error.message, true); }
  });

  $("case-recovery-status-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    var values = formValues(this);
    try {
      var result = await api("/recovery-status", values);
      $("case-recovery-status-result").hidden = false;
      $("case-recovery-status-result").innerHTML =
        '<strong>' + esc(result.status) + '</strong><p>' + esc(result.message) + '</p><p class="case-meta">' +
        esc(result.recoveryReference) + ' · Updated ' + esc(result.updatedAt) + '</p>';
      setFeedback("case-recovery-status-feedback", "", false);
    } catch (error) { setFeedback("case-recovery-status-feedback", error.message, true); }
  });

  async function loadAccountCases() {
    var section = $("account-linked-cases");
    try {
      var account = await accountApi("/api/account/status");
      if (!account.authenticated) { section.hidden = true; return; }
      var result = await api("/mine");
      section.hidden = false;
      var target = $("my-cases-list");
      target.innerHTML = (result.cases || []).map(function (item) {
        return '<article class="case-case-card"><div class="case-card-top"><div><h3>' + esc(item.title) + '</h3><div class="case-meta">' +
          esc(item.referenceCode) + ' · ' + esc(item.kind) + '</div></div><span class="case-status">' + esc(item.status) + '</span></div>' +
          '<p>Open with your independent case credentials or select this account-linked view.</p>' +
          '<button class="case-button case-button-quiet" type="button" data-account-case="' + esc(item.referenceCode) + '">View linked case</button></article>';
      }).join("");
      Array.prototype.forEach.call(target.querySelectorAll("[data-account-case]"), function (button) {
        button.addEventListener("click", async function () {
          try {
            var item = await api("/account-view", { referenceCode: button.dataset.accountCase });
            renderCaseDetail(item, null);
          } catch (error) { target.prepend(document.createTextNode(error.message)); }
        });
      });
    } catch (_error) { section.hidden = true; }
  }

  function renderAdminQueue(data) {
    var caseList = $("administrator-cases-list");
    var recoveriesList = $("administrator-recoveries-list");
    var cases = data.cases || [];
    caseList.innerHTML = cases.map(function (item) {
      var needsIndependent = item.administratorConcern;
      return '<article class="case-admin-card" data-admin-case="' + esc(item.referenceCode) + '">' +
        '<div class="case-card-top"><div><h3>' + esc(item.title) + '</h3><div class="case-meta">' + esc(item.referenceCode) + ' · ' + esc(item.kind) + ' · ' + esc(item.topic) + '</div></div>' +
        '<span class="case-status">' + esc(item.status) + ' · ' + esc(item.priority) + '</span></div>' +
        '<p>' + esc(item.description) + '</p>' + (needsIndependent ? '<p class="case-admin-note">Independent reviewer attestation required. Current recorded status: ' + (item.independentReviewRecorded ? "attested" : "not yet attested") + '.</p>' : '') +
        renderTimeline(item.events) +
        '<form class="case-admin-action-form">' +
          '<div class="case-admin-grid"><label>Action<select name="action"><option value="public_reply">Public reply</option><option value="internal_note">Internal note</option><option value="set_status">Change status</option><option value="escalate">Escalate priority</option></select></label>' +
          '<label>New status<select name="status"><option value="under_review">Under review</option><option value="awaiting_user">Awaiting user</option><option value="awaiting_external">Awaiting external information</option><option value="resolved">Resolved</option><option value="declined">Declined</option></select></label></div>' +
          '<label>Message or explanation<textarea name="message" maxlength="5000" rows="3" placeholder="Public reply, internal note, or reason for the status/decision."></textarea></label>' +
          (needsIndependent ? '<label class="case-check-row"><input type="checkbox" name="independentReviewConfirmed"><span>I confirm I am not personally implicated and am acting independently in this review.</span></label>' : '') +
          '<div class="case-admin-actions"><button class="case-button" type="submit">Apply case action</button></div><p class="case-feedback" role="status"></p>' +
        '</form></article>';
    }).join("");
    Array.prototype.forEach.call(caseList.querySelectorAll(".case-admin-action-form"), function (form) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        var card = form.closest("[data-admin-case]");
        var values = formValues(form);
        values.referenceCode = card.dataset.adminCase;
        if (form.querySelector("[name=independentReviewConfirmed]")) {
          values.independentReviewConfirmed = form.querySelector("[name=independentReviewConfirmed]").checked;
        }
        try {
          await api("/admin/action", values);
          await refreshAdminQueue();
        } catch (error) { form.querySelector(".case-feedback").textContent = error.message; }
      });
    });

    var recoveries = data.recoveries || [];
    recoveriesList.innerHTML = recoveries.map(function (item) {
      return '<article class="case-admin-card" data-admin-recovery="' + esc(item.recovery_reference) + '">' +
        '<h3>' + esc(item.recovery_reference) + '</h3><p class="case-meta">Linked case: ' + esc(item.reference_code || item.case_reference_hint || "Not identified") +
        ' · Date hint: ' + esc(item.approximate_date || "Not supplied") + '</p><p><strong>Title hint:</strong> ' + esc(item.case_title_hint) +
        '</p><p><strong>Contact for verification:</strong> ' + esc(item.contact_method) + ' · ' + esc(item.contact_value) +
        '</p><p><strong>Explanation:</strong> ' + esc(item.explanation) + '</p>' +
        '<form class="case-admin-recovery-form"><label>Matched case reference (required if no case was linked)<input name="matchedCaseReference" placeholder="ACR-XXXX-XXXX"></label>' +
        '<label class="case-check-row"><input type="checkbox" name="manualVerificationConfirmed"><span>I independently verified the claimant using evidence outside this portal and matched them to this case.</span></label>' +
        '<label class="case-check-row"><input type="checkbox" name="independentReviewConfirmed"><span>Where this case concerns an administrator, I confirm I am not personally implicated and am acting independently.</span></label>' +
        '<div class="case-admin-actions"><button class="case-button" type="button" data-recovery-decision="approve">Approve and issue replacement key</button><button class="case-button case-button-secondary" type="button" data-recovery-decision="decline">Decline</button></div><p class="case-feedback" role="status"></p></form></article>';
    }).join("");
    Array.prototype.forEach.call(recoveriesList.querySelectorAll(".case-admin-recovery-form"), function (form) {
      Array.prototype.forEach.call(form.querySelectorAll("[data-recovery-decision]"), function (button) {
        button.addEventListener("click", async function () {
          var card = form.closest("[data-admin-recovery]");
          var values = formValues(form);
          values.recoveryReference = card.dataset.adminRecovery;
          values.decision = button.dataset.recoveryDecision;
          values.manualVerificationConfirmed = form.querySelector("[name=manualVerificationConfirmed]").checked;
          if (form.querySelector("[name=independentReviewConfirmed]")) {
            values.independentReviewConfirmed = form.querySelector("[name=independentReviewConfirmed]").checked;
          }
          try {
            var result = await api("/admin/recovery-action", values);
            if (result.replacementCaseAccessKey) {
              showSecretReceipt(
                "case-receipt", "Replacement case key issued to the administrator for verified delivery",
                "Case reference", result.replacementCaseReference,
                "Replacement private access key", result.replacementCaseAccessKey,
                result.deliveryInstruction,
                "astrocrown-replacement-case-key"
              );
            }
            await refreshAdminQueue();
          } catch (error) { form.querySelector(".case-feedback").textContent = error.message; }
        });
      });
    });
  }

  async function refreshAdminQueue() {
    var data = await api("/admin/list");
    renderAdminQueue(data);
  }

  async function initialize() {
    try {
      await loadAccountCases();
    } catch (_error) {}
    try {
      await accountApi("/api/admin/status");
      $("administrator-case-panel").hidden = false;
      await refreshAdminQueue();
    } catch (_error) {
      $("administrator-case-panel").hidden = true;
    }
  }
  initialize();
}());
(function () {
  "use strict";

  var REGISTRY_URL = "/page-entry/feature-status.json";
  var ACK_TTL_MS = 12 * 60 * 60 * 1000;
  var PAGE_HASHES = {
    "#account": "account",
    "#account-dashboard": "account",
    "#communications": "account",
    "#admin": "admin"
  };

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function statusBadge(status) {
    var badge = element("span", "astro-status-badge", status);
    badge.dataset.status = status;
    return badge;
  }

  function currentPageId(defaultId) {
    var hash = window.location.hash.toLowerCase();
    if (hash === "#admin") {
      var adminDashboard = document.getElementById("admin-dashboard");
      // The SPA may temporarily visit #admin while checking an unauthorized
      // route and immediately return to the User dashboard. Do not show an
      // Admin-page notice until the authorized Admin workspace is actually visible.
      return adminDashboard && !adminDashboard.hidden ? "admin" : "account";
    }
    return PAGE_HASHES[hash] || defaultId;
  }

  async function isAcknowledged(pageId, version, globalVersion) {
    if (isWorkerStagingRuntime()) {
      try {
        var statusPath = pageId === "genesis" ? "/api/genesis/acknowledgement-status"
          : pageId === "admin" ? "/api/admin/acknowledgement-status"
          : pageId === "account" ? "/api/account/acknowledgement-status"
          : "/api/staging/acknowledgement-status?pageId=" + encodeURIComponent(pageId);
        var response = await fetch(statusPath, {
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Accept": "application/json" }
        });
        if (!response.ok) return false;
        var result = await response.json();
        return result.acknowledged === true &&
          result.globalVersion === globalVersion &&
          (result.pageVersion === null || result.pageVersion === version);
      } catch (_error) {
        // A server verification failure must reopen the notice, never trust
        // a stale browser-local acknowledgement as a replacement.
        return false;
      }
    }
    try {
      var value = JSON.parse(window.localStorage.getItem("astro-page-notice:" + pageId) || "null");
      return Boolean(value && value.version === version && value.globalVersion === globalVersion &&
        Number.isFinite(value.acknowledgedAt) &&
        Date.now() - value.acknowledgedAt >= 0 &&
        Date.now() - value.acknowledgedAt < ACK_TTL_MS);
    } catch (_error) {
      return false;
    }
  }

  function rememberAcknowledgement(pageId, version, globalVersion) {
    try {
      window.localStorage.setItem("astro-page-notice:" + pageId, JSON.stringify({
        version: version,
        globalVersion: globalVersion,
        acknowledgedAt: Date.now()
      }));
    } catch (_error) {
      // Storage is a convenience only. The current page remains usable after
      // the required acknowledgement; the notice will return on a later visit.
    }
  }

  function buildStatusSummary(page, globalNotice) {
    var summary = element("section", "astro-page-status-summary");
    summary.setAttribute("aria-label", "Operational status for this page");
    summary.appendChild(element("h3", "", "Operational status · " + page.title));
    var delivery = element("div");
    delivery.appendChild(statusBadge(page.delivery.status));
    delivery.appendChild(element("p", "", "Page delivery status only. Feature operation is classified separately below. " + page.delivery.details));
    summary.appendChild(delivery);

    var list = element("ul", "astro-page-status-list");
    page.features.forEach(function (feature) {
      var item = element("li", "astro-page-status-item");
      item.appendChild(element("strong", "", feature.name));
      item.appendChild(statusBadge(feature.status));
      item.appendChild(element("p", "", feature.details));
      if (feature.status === "DEVNET") {
        var networkDetails = "Network: " + feature.network;
        if (feature.network_id !== undefined && feature.network_id !== null) {
          networkDetails += " · Network ID: " + feature.network_id;
        }
        if (feature.test_asset) networkDetails += " · Test asset: " + feature.test_asset;
        item.appendChild(element("p", "", networkDetails));
        var faucetLine = element("p");
        faucetLine.appendChild(element("span", "", "Official faucet: "));
        if (feature.faucet && typeof feature.faucet.url === "string" && /^https:\/\//.test(feature.faucet.url)) {
          var link = element("a", "", feature.faucet.label || feature.faucet.url);
          link.href = feature.faucet.url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          faucetLine.appendChild(link);
        } else if (feature.faucet && typeof feature.faucet.address === "string" && feature.faucet.address.trim()) {
          faucetLine.appendChild(element("code", "", feature.faucet.address));
        } else {
          faucetLine.appendChild(element("span", "", "Not supplied; this feature must not be used until verified faucet details are published."));
        }
        item.appendChild(faucetLine);
        item.appendChild(element("p", "", "Test tokens have no mainnet value."));
      }
      list.appendChild(item);
    });
    summary.appendChild(list);
    return summary;
  }

  function enhanceHomepageNotice(page, globalNotice, globalVersion, pageId) {
    var dialog = document.getElementById("development-notice");
    if (!dialog) return false;
    var content = dialog.querySelector(".development-notice-content");
    if (!content) return false;
    var acknowledgement = dialog.querySelector("#development-notice-acknowledged");
    var continueButton = dialog.querySelector("#development-notice-continue");
    var loading = dialog.querySelector("#development-notice-status-loading");
    if (!acknowledgement || !continueButton) return false;

    acknowledgement.disabled = true;
    acknowledgement.checked = false;
    continueButton.disabled = true;
    dialog.dataset.pageNoticePageId = pageId;
    dialog.dataset.pageNoticePageVersion = page.version;
    dialog.dataset.pageNoticeGlobalVersion = globalVersion;
    dialog.dataset.pageNoticeReady = "false";

    if (!content.querySelector(".astro-entry-notice-header")) {
      var header = element("div", "astro-entry-notice-header");
      header.appendChild(element("h2", "", "Before you continue"));
      var close = element("button", "astro-entry-notice-close", "×");
      close.type = "button";
      close.title = "Leave the homepage and open the AstroCrown Information Centre";
      close.setAttribute("aria-label", "Leave the homepage and open the AstroCrown Information Centre");
      close.addEventListener("click", function () {
        var workerRuntime = document.querySelector('meta[name="astro-account-runtime"]');
        window.location.assign(workerRuntime && workerRuntime.content === "worker-staging"
          ? "/account-continuity/prototype/privacy-policy.html"
          : "/privacy-transparency.html");
      });
      header.appendChild(close);
      content.insertBefore(header, content.firstChild);
    }

    // Rebuild every page-specific block when the open global notice is reused
    // for another SPA route. A previous page's status or acknowledgement must
    // never be carried into a different page.
    [
      ".astro-entry-notice-kicker",
      ".astro-page-status-summary",
      ".astro-entry-notice-rules",
      ".astro-entry-notice-risk"
    ].forEach(function (selector) {
      content.querySelectorAll(selector).forEach(function (node) { node.remove(); });
    });

    var intro = content.querySelector(".development-notice-intro");
    var anchor = intro ? intro.nextSibling : (content.querySelector(".astro-entry-notice-header")?.nextSibling || content.firstChild);
    var kicker = element("p", "astro-entry-notice-kicker", globalNotice.heading);
    content.insertBefore(kicker, anchor);
    content.insertBefore(buildStatusSummary(page, globalNotice), kicker.nextSibling);
    var instructions = element("ul", "astro-entry-notice-rules");
    globalNotice.rules.forEach(function (rule) {
      instructions.appendChild(element("li", "", rule));
    });
    content.insertBefore(instructions, content.querySelector(".development-notice-ack"));
    var walletRisk = element("p", "astro-entry-notice-risk", globalNotice.wallet_safety);
    content.insertBefore(walletRisk, content.querySelector(".development-notice-ack"));

    if (loading) loading.remove();
    dialog.dataset.pageNoticeReady = "true";
    acknowledgement.disabled = false;
    acknowledgement.dispatchEvent(new Event("change", { bubbles: true }));
    bindNativeNoticeAcknowledgement(dialog);
    return true;
  }

  function isWorkerStagingRuntime() {
    var accountRuntime = document.querySelector('meta[name="astro-account-runtime"]');
    var genesisRuntime = document.querySelector('meta[name="astro-supporter-runtime"]');
    return Boolean(
      window.location.protocol === "https:" &&
      ((accountRuntime && accountRuntime.content === "worker-staging") ||
       (genesisRuntime && genesisRuntime.content === "worker-staging"))
    );
  }

  function runtimeNeedsServerAcknowledgement(pageId) {
    return isWorkerStagingRuntime() && ["genesis", "account", "admin"].indexOf(pageId) !== -1;
  }

  function bindNativeNoticeAcknowledgement(dialog) {
    if (dialog.dataset.pageNoticeAckBound === "true") return;
    var acknowledgement = dialog.querySelector("#development-notice-acknowledged");
    var continueButton = dialog.querySelector("#development-notice-continue");
    if (!acknowledgement || !continueButton) return;
    dialog.dataset.pageNoticeAckBound = "true";
    if (dialog.dataset.pageNoticeAckChangeBound !== "true") {
      acknowledgement.addEventListener("change", function () {
        continueButton.disabled = acknowledgement.checked !== true;
      });
      dialog.dataset.pageNoticeAckChangeBound = "true";
    }
    continueButton.addEventListener("click", async function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!acknowledgement.checked || continueButton.disabled) return;
      var pageId = dialog.dataset.pageNoticePageId || "home";
      var pageVersion = dialog.dataset.pageNoticePageVersion || "";
      var globalVersion = dialog.dataset.pageNoticeGlobalVersion || "";
      if (!pageVersion || !globalVersion) return;
      continueButton.disabled = true;
      acknowledgement.disabled = true;
      var originalLabel = continueButton.textContent;
      continueButton.textContent = "Confirming acknowledgement…";
      var feedback = dialog.querySelector("#development-notice-feedback") || element("p", "astro-entry-notice-feedback");
      feedback.id = "development-notice-feedback";
      feedback.setAttribute("role", "status");
      feedback.setAttribute("aria-live", "polite");
      if (!feedback.parentNode) continueButton.parentNode.insertBefore(feedback, continueButton);
      feedback.textContent = "";
      try {
        if (isWorkerStagingRuntime()) {
          var globalResponse = await fetch("/api/staging/acknowledge", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ noticeVersion: globalVersion })
          });
          var globalResult = await globalResponse.json();
          if (!globalResponse.ok || globalResult.acknowledged !== true) {
            throw new Error(globalResult.error || "The public-test acknowledgement could not be recorded.");
          }
          if (["genesis", "account", "admin"].indexOf(pageId) !== -1) {
            var pageResponse = await fetch("/api/staging/page-acknowledge", {
              method: "POST",
              credentials: "same-origin",
              cache: "no-store",
              headers: { "Accept": "application/json", "Content-Type": "application/json" },
              body: JSON.stringify({ pageId: pageId, noticeVersion: pageVersion })
            });
            var pageResult = await pageResponse.json();
            if (!pageResponse.ok || pageResult.acknowledged !== true || pageResult.noticeVersion !== pageVersion) {
              throw new Error(pageResult.error || "The page-specific acknowledgement could not be recorded.");
            }
          }
        }
        rememberAcknowledgement(pageId, pageVersion, globalVersion);
        if (typeof dialog.close === "function" && dialog.open) dialog.close();
        else dialog.removeAttribute("open");
      } catch (error) {
        feedback.textContent = error && error.message
          ? error.message
          : "The acknowledgement could not be recorded. Please try again.";
        acknowledgement.disabled = false;
        continueButton.disabled = !acknowledgement.checked;
        continueButton.textContent = originalLabel;
      }
    }, true);
  }

  function closeSupersededPageNotice(previousPageId, nextPageId) {
    if (!previousPageId || previousPageId === nextPageId) return;
    var openNotice = document.querySelector(".astro-entry-notice[open]");
    if (openNotice) {
      openNotice.close();
      openNotice.remove();
    }
  }

  function buildDialog(page, globalNotice, globalVersion) {
    var dialog = element("dialog", "astro-entry-notice");
    dialog.dataset.pageNoticePageId = page.id || "";
    dialog.dataset.pageNoticePageVersion = page.version || "";
    dialog.dataset.pageNoticeGlobalVersion = globalVersion || "";
    dialog.setAttribute("aria-labelledby", "astro-entry-notice-title");
    dialog.setAttribute("aria-modal", "true");
    var inner = element("div", "astro-entry-notice-inner");
    var header = element("div", "astro-entry-notice-header");
    var heading = element("h2", "", "Before you continue");
    heading.id = "astro-entry-notice-title";
    header.appendChild(heading);
    var close = element("button", "astro-entry-notice-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Leave this page and return to the AstroCrown homepage");
    header.appendChild(close);
    inner.appendChild(header);
    inner.appendChild(element("p", "astro-entry-notice-kicker", globalNotice.heading));
    inner.appendChild(element("p", "astro-entry-notice-copy", globalNotice.introduction));
    inner.appendChild(buildStatusSummary(page, globalNotice));

    var rules = element("ul", "astro-entry-notice-rules");
    globalNotice.rules.forEach(function (rule) {
      rules.appendChild(element("li", "", rule));
    });
    inner.appendChild(rules);
    inner.appendChild(element("p", "astro-entry-notice-risk", globalNotice.wallet_safety));

    var acknowledgementLabel = element("label", "astro-entry-notice-ack");
    var acknowledgement = element("input");
    acknowledgement.type = "checkbox";
    acknowledgement.checked = false;
    acknowledgementLabel.appendChild(acknowledgement);
    acknowledgementLabel.appendChild(element("span", "", globalNotice.acknowledgement));

    var actions = element("div", "astro-entry-notice-actions");
    var proceed = element("button", "astro-entry-notice-continue", "Continue");
    proceed.type = "button";
    proceed.disabled = true;
    actions.appendChild(proceed);
    var feedback = element("p", "astro-entry-notice-feedback");
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    inner.appendChild(acknowledgementLabel);
    inner.appendChild(actions);
    inner.appendChild(feedback);
    dialog.appendChild(inner);
    document.body.appendChild(dialog);

    acknowledgement.addEventListener("change", function () {
      proceed.disabled = acknowledgement.checked !== true;
    });
    close.addEventListener("click", function () {
      if (window.location.pathname !== "/" || window.location.hash) {
        window.location.assign("/");
      } else {
        dialog.close();
      }
    });
    dialog.addEventListener("cancel", function (event) {
      event.preventDefault();
      feedback.textContent = "Please choose Continue after reviewing this notice, or use × to return to the homepage.";
    });
    proceed.addEventListener("click", async function () {
      if (!acknowledgement.checked || proceed.disabled) return;
      proceed.disabled = true;
      feedback.textContent = "";
      try {
        if (runtimeNeedsServerAcknowledgement(page.id)) {
          var globalResponse = await fetch("/api/staging/acknowledge", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ noticeVersion: globalVersion })
          });
          var globalResult = await globalResponse.json();
          if (!globalResponse.ok || globalResult.acknowledged !== true) {
            throw new Error(globalResult.error || "The public-test acknowledgement could not be recorded.");
          }
          var response = await fetch("/api/staging/page-acknowledge", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ pageId: page.id, noticeVersion: page.version })
          });
          var result = await response.json();
          if (!response.ok || result.acknowledged !== true || result.noticeVersion !== page.version) {
            throw new Error(result.error || "The page-specific acknowledgement could not be recorded.");
          }
        }
        rememberAcknowledgement(page.id, page.version, globalVersion);
        if (typeof dialog.close === "function" && dialog.open) dialog.close();
        if (dialog.isConnected) dialog.remove();
        document.dispatchEvent(new CustomEvent("astrocrown:page-notice-acknowledged", {
          detail: { pageId: page.id, noticeVersion: page.version, globalVersion: globalVersion }
        }));
      } catch (error) {
        feedback.textContent = error && error.message
          ? error.message
          : "The acknowledgement could not be recorded. Please try again.";
        proceed.disabled = false;
      }
    });

    return dialog;
  }

  var noticeRequestGeneration = 0;

  async function showPageNotice(registry, pageId) {
    var page = registry.pages[pageId] || registry.pages.legal;
    if (!page) return;
    var generation = ++noticeRequestGeneration;
    var nativeNotice = document.getElementById("development-notice");
    var acknowledged = await isAcknowledged(page.id || pageId, page.version, registry.notice_version);
    if (generation !== noticeRequestGeneration) return;

    if (acknowledged) {
      if (pageId === "home") {
        if (nativeNotice && nativeNotice.open) nativeNotice.close();
      } else if (nativeNotice && nativeNotice.open) {
        nativeNotice.close();
      }
      return;
    }

    if (pageId === "home") {
      if (!enhanceHomepageNotice(page, registry.global_notice, registry.notice_version, pageId)) return;
      if (nativeNotice && !nativeNotice.open) {
        if (typeof nativeNotice.showModal === "function") nativeNotice.showModal();
        else {
          nativeNotice.setAttribute("open", "");
          document.body.classList.add("astro-entry-notice-open");
        }
      }
      return;
    }
    // The native homepage warning is only the homepage's notice. For a direct
    // deep link or SPA entry into another page, replace it with one unified
    // page-specific dialog containing the global warning and that page's risks.
    // Do not reuse an open native home dialog: it can retain stale page handlers
    // and make a later authorized route appear to have two stacked acknowledgements.
    if (nativeNotice && nativeNotice.open) nativeNotice.close();
    var dialog = buildDialog(Object.assign({ id: pageId }, page), registry.global_notice, registry.notice_version);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else {
      dialog.setAttribute("open", "");
      document.body.classList.add("astro-entry-notice-open");
    }
  }

  function insertPageStatusStrip(registry, pageId) {
    var page = registry.pages[pageId] || registry.pages.legal;
    if (!page) return;
    var existingStrip = document.querySelector(".astro-page-status-strip");
    if (existingStrip) existingStrip.remove();
    var strip = element("div", "astro-page-status-strip");
    strip.appendChild(element("span", "", page.title + " · page delivery"));
    strip.appendChild(statusBadge(page.delivery.status));
    var note = element("span", "", "Feature availability is shown separately below and in this page's entry notice.");
    strip.appendChild(note);
    var body = document.body;
    var first = body.firstElementChild;
    if (first && first.classList && first.classList.contains("astro-staging-banner")) {
      body.insertBefore(strip, first.nextSibling);
    } else {
      body.insertBefore(strip, first);
    }
  }

  async function initialise() {
    var pageMeta = document.querySelector('meta[name="astro-page-id"]');
    if (!pageMeta) return;
    var defaultId = pageMeta.content || "legal";
    var registry;
    try {
      var response = await fetch(REGISTRY_URL, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("status registry unavailable");
      registry = await response.json();
      if (registry.schema_version !== 1 || !registry.pages || !registry.global_notice) throw new Error("invalid status registry");
    } catch (_error) {
      var failClosed = {
        schema_version: 1,
        global_notice: {
          heading: "ASTROCROWN PUBLIC TEST",
          introduction: "The current feature-status register could not be loaded. Treat every feature on this page as FOR DEVELOPMENT · READ ONLY until the status information is available.",
          rules: ["Do not assume any transaction, payment, account or state-changing feature is operational."],
          wallet_safety: "Never disclose a seed phrase, private key or wallet recovery secret. Do not approve or send assets."
        },
        pages: {
          legal: {
            version: "registry-unavailable-v1",
            title: "Page status unavailable",
            delivery: { status: "FOR DEVELOPMENT · READ ONLY", details: "The page status register is unavailable. No feature is represented as operational." },
            features: [{ id: "unknown", name: "All page features", status: "FOR DEVELOPMENT · READ ONLY", details: "Treat all functionality as unavailable until a current status register is available." }]
          }
        }
      };
      registry = failClosed;
    }

    var pageId = currentPageId(defaultId);
    insertPageStatusStrip(registry, pageId);
    showPageNotice(registry, pageId);
    function reconcilePageEntry() {
      var nextPageId = currentPageId(defaultId);
      if (nextPageId !== pageId) {
        closeSupersededPageNotice(pageId, nextPageId);
        pageId = nextPageId;
        insertPageStatusStrip(registry, pageId);
        showPageNotice(registry, pageId);
      }
    }
    window.addEventListener("hashchange", reconcilePageEntry);
    document.addEventListener("astrocrown:admin-dashboard-visible", reconcilePageEntry);
    var adminDashboard = document.getElementById("admin-dashboard");
    if (adminDashboard && typeof MutationObserver === "function") {
      var adminVisibilityObserver = new MutationObserver(reconcilePageEntry);
      adminVisibilityObserver.observe(adminDashboard, {
        attributes: true,
        attributeFilter: ["hidden"]
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
}());

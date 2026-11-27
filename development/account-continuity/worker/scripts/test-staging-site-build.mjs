import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const workerRoot = resolve(import.meta.dirname, "..");
const publicRoot = resolve(workerRoot, "public");

async function readPublic(path) {
  return readFile(resolve(publicRoot, path), "utf8");
}

test("Worker staging build publishes shared page-notice assets and injects the mandatory Genesis page gate", async () => {
  const homepage = await readPublic("index.html");
  const genesis = await readPublic("supporters/index.html");
  const noticeScript = await readPublic("page-entry/page-entry-notice.js");
  const noticeCss = await readPublic("page-entry/page-entry-notice.css");
  const registry = JSON.parse(await readPublic("page-entry/feature-status.json"));
  const workerSource = await readFile(resolve(workerRoot, "src", "index.js"), "utf8");
  const genesisWorkerSource = await readFile(resolve(workerRoot, "src", "genesis.js"), "utf8");
  const walletAssurance = await readPublic("account-continuity/prototype/wallet-identity-assurance.html");
  const accountUi = await readPublic("account-continuity/prototype/account-ui.js");

  assert.match(homepage, /name="astro-page-id" content="home"/);
  assert.match(homepage, /id="development-notice-acknowledged" type="checkbox" disabled/);
  assert.match(homepage, /id="development-notice-status-loading"/);
  assert.match(homepage, /Log In\/Sign Up/);
  assert.match(homepage, /page-entry\/page-entry-notice\.js/);
  assert.match(homepage, /LIVE PUBLIC TEST ENVIRONMENT/);
  assert.match(genesis, /name="astro-page-id" content="genesis"/);
  assert.match(genesis, /page-entry\/page-entry-notice\.js/);
  assert.match(walletAssurance, /name="astro-page-id" content="account"/);
  assert.match(walletAssurance, /Current status: FOR DEVELOPMENT · READ ONLY/);
  assert.match(accountUi, /function renderWalletPrimaryStatus\(\)/);
  assert.match(accountUi, /Sign in with selected wallet/);
  assert.match(accountUi, /Create account with selected wallet/);
  assert.match(accountUi, /finishPrimaryWalletAuthentication/);
  assert.match(accountUi, /discoverPrimaryWalletProviders/);
  assert.match(accountUi, /selectedPrimaryWalletId/);
  assert.match(accountUi, /selectedPrimaryNetwork/);
  assert.match(accountUi, /Choose your wallet/);
  assert.match(accountUi, /Network used for identity proof/);
  assert.match(accountUi, /This selects the network for your primary-wallet identity proof only/);
  for (const walletName of ["MetaMask", "Trust Wallet", "OKX Wallet", "Bitget Wallet", "TokenPocket", "Coin98"]) {
    assert.ok(accountUi.includes(walletName), "Ordinary account brand picker must show " + walletName);
  }
  assert.match(accountUi, /account-wallet-brand-choice/);
  for (const walletLogo of ["metamask", "trust", "okx", "tokenpocket", "coin98"]) {
    assert.ok(accountUi.includes("/assets/wallet-logos/" + walletLogo + ".svg"), "Account selector must use local " + walletLogo + " logo");
  }
  assert.match(accountUi, /duplicate provider/);
  assert.match(accountUi, /selectedPrimaryWalletProvider/);
  assert.match(accountUi, /The selected wallet does not expose exactly one compatible/);
  assert.match(accountUi, /Solana Mainnet/);
  assert.match(accountUi, /astrocrown:admin-dashboard-visible/);
  assert.match(accountUi, /Why a primary wallet\?/);
  assert.match(accountUi, /typeof workerStagingMode/);
  assert.match(noticeScript, /Before you continue/);
  assert.match(noticeScript, /async function isAcknowledged/);
  assert.match(noticeScript, /if \(isWorkerStagingRuntime\(\)/);
  assert.match(noticeScript, /\["home", "genesis", "account", "admin"\]\.indexOf\(pageId\) !== -1/);
  assert.match(noticeScript, /\/api\/staging\/acknowledgement-status\?pageId=/);
  assert.match(noticeScript, /\/api\/account\/acknowledgement-status/);
  assert.match(noticeScript, /\/api\/genesis\/acknowledgement-status/);
  assert.match(noticeScript, /\/api\/admin\/acknowledgement-status/);
  assert.match(noticeScript, /noticeRequestGeneration/);
  assert.match(noticeScript, /if \(nativeNotice && !nativeNotice\.open\)/);
  assert.match(workerSource, /function pageAcknowledgementStatus/);
  assert.match(workerSource, /\/api\/account\/acknowledgement-status/);
  assert.match(workerSource, /\/api\/genesis\/acknowledgement-status/);
  assert.match(workerSource, /\/api\/admin\/acknowledgement-status/);
  assert.match(noticeScript, /acknowledgement\.disabled = true/);
  assert.match(noticeScript, /acknowledgement\.disabled = false/);
  assert.match(noticeScript, /pageNoticeReady/);
  assert.match(noticeScript, /function closeSupersededPageNotice/);
  assert.match(noticeScript, /if \(pageId === "home"\)/);
  assert.match(noticeScript, /if \(nativeNotice && nativeNotice\.open\) nativeNotice\.close\(\)/);
  assert.match(noticeScript, /closeSupersededPageNotice\(pageId, nextPageId\)/);
  assert.match(noticeScript, /dialog\.dataset\.pageNoticePageId = page\.id/);
  assert.match(noticeScript, /adminDashboard && !adminDashboard\.hidden/);
  assert.match(noticeScript, /new MutationObserver\(reconcilePageEntry\)/);
  assert.match(noticeScript, /astrocrown:admin-dashboard-visible/);
  assert.match(noticeScript, /function bindNativeNoticeAcknowledgement/);
  assert.match(noticeScript, /if \(dialog\.isConnected\) dialog\.remove\(\)/);
  assert.match(noticeScript, /astrocrown:page-notice-acknowledged/);
  assert.match(noticeScript, /rememberAcknowledgement\(page\.id, page\.version, globalVersion\)/);
  assert.doesNotMatch(noticeScript.slice(noticeScript.indexOf("function buildDialog"), noticeScript.indexOf("function showPageNotice")), /registry\.notice_version/);
  assert.match(noticeScript, /dialog\.dataset\.pageNoticeAckChangeBound = "true"/);
  assert.match(noticeScript, /continueButton\.disabled = acknowledgement\.checked !== true/);
  assert.match(noticeScript, /noticeVersion: pageVersion/);
  assert.ok(noticeScript.includes("/account-continuity/prototype/privacy-policy.html"));
  assert.ok(noticeScript.includes("/privacy-transparency.html"));
  assert.match(noticeScript, /globalNotice\.acknowledgement/);
  assert.match(noticeScript, /\/api\/staging\/page-acknowledge/);
  assert.match(noticeCss, /astro-entry-notice/);

  assert.equal(registry.notice_version, "2026-11-26-public-test-v5");
  assert.match(registry.global_notice.wallet_safety, /A development transaction is permitted only when the exact feature is explicitly marked DEVNET/);
  assert.match(registry.global_notice.wallet_safety, /Real-value transactions are permitted only when the exact feature is explicitly marked LIVE · MAINNET/);
  assert.match(workerSource, new RegExp('const STAGING_NOTICE_VERSION = "' + registry.notice_version + '"'));
  for (const pageId of ["genesis", "account", "admin"]) {
    assert.match(workerSource, new RegExp('version: "' + registry.pages[pageId].version + '"'));
  }
  assert.match(registry.global_notice.acknowledgement, /I confirm that I have read and understood/);
  for (const [pageId, page] of Object.entries(registry.pages)) {
    assert.ok(page.version, pageId + " must have a notice version");
    assert.ok(page.title, pageId + " must have a title");
    assert.ok(page.delivery && ["LIVE · STAGING", "LIVE · MAINNET", "DEVNET", "FOR DEVELOPMENT · READ ONLY"].includes(page.delivery.status));
    assert.equal(page.delivery.scope, "page_delivery", pageId + " must distinguish delivery from feature readiness");
    if (["home", "genesis", "account", "admin", "legal"].includes(pageId)) {
      assert.equal(page.delivery.status, "FOR DEVELOPMENT · READ ONLY",
        pageId + " must not be labelled LIVE before its remote staging deployment is verified");
      assert.match(page.delivery.details, /first remote Cloudflare Pages or Worker staging deployment has not been verified/i);
    }
    if (page.delivery.status === "LIVE · STAGING" || page.delivery.status === "LIVE · MAINNET") {
      assert.equal(page.delivery.environment, page.delivery.status === "LIVE · STAGING" ? "staging" : "mainnet");
    }
    assert.ok(Array.isArray(page.features) && page.features.length > 0);
    for (const feature of page.features) {
      assert.ok(["LIVE · STAGING", "LIVE · MAINNET", "DEVNET", "FOR DEVELOPMENT · READ ONLY"].includes(feature.status));
      if (feature.status === "LIVE · STAGING" || feature.status === "LIVE · MAINNET") {
        assert.ok(feature.environment, feature.id + " must identify its LIVE environment");
      }
      if (feature.status === "DEVNET") {
        assert.ok(feature.network && feature.network_id !== undefined && feature.test_asset,
          feature.id + " must identify its exact devnet, network ID and test asset");
        assert.ok(feature.faucet && (
          (typeof feature.faucet.url === "string" && /^https:\/\//.test(feature.faucet.url)) ||
          (typeof feature.faucet.address === "string" && feature.faucet.address.trim())
        ), feature.id + " must provide a verified faucet URL or address");
      }
    }
  }
});

test("Worker staging build publishes the Genesis Programme at the shared origin", async () => {
  await access(resolve(publicRoot, "supporters/index.html"));
  await access(resolve(publicRoot, "supporters/genesis-terms.html"));
  await access(resolve(publicRoot, "supporters/supporters.js"));
  await access(resolve(publicRoot, "supporters/wallet-provider-adapters.mjs"));
  await access(resolve(publicRoot, "assets/genesis-member-dna.svg"));
  for (const walletLogo of ["metamask", "trust", "okx", "tokenpocket", "coin98"]) {
    const logoPath = "assets/wallet-logos/" + walletLogo + ".svg";
    await access(resolve(publicRoot, logoPath));
    assert.match(await readPublic(logoPath), /^<svg/);
  }
  const homepage = await readPublic("index.html");
  assert.match(homepage, /href="\.\/supporters\/">Genesis Programme/);
});

test("published Genesis Programme states that qualifying payments are not open and shows wallet-first identity", async () => {
  const html = await readPublic("supporters/index.html");
  assert.match(html, /DEVELOPMENT PREVIEW/);
  assert.match(html, /USDT QUALIFYING PAYMENTS NOT OPEN/);
  assert.match(html, /DO NOT SEND FUNDS/);
  assert.match(html, /one payment asset: USDT/);
  assert.match(html, /Ethereum Mainnet \(ERC-20\), TRON Mainnet \(TRC-20\) or Solana Mainnet \(SPL\)/);
  assert.doesNotMatch(html, /separate network-specific assets/);
  assert.match(html, /30×.*USDT 10,000.*25×.*20×.*15×.*10×/s);
  assert.match(html, /USDT 1,000,000.*USDT-denominated/s);
  assert.match(html, /registered wallet owner.*network fee.*separately/s);
  assert.match(html, /full USDT principal.*ACS reserve destination.*V/s);
  assert.match(html, /id="participant-network-fee-policy"/);
  assert.doesNotMatch(html, /25 ACROWN per USD₮|USDT 150 transition threshold|USDT 250,000 target/);
  assert.match(html, /USDT purchase allowance within a programme-wide limit/);
  assert.match(html, /one shared,? programme-wide USDT purchase-allowance pool/i);
  assert.match(html, /Total programme-wide USDT purchase allowance/i);
  assert.doesNotMatch(html, /programme-wide ACROWN cap/);
  assert.match(html, /Exactly 24 hours before the scheduled official ACROWN launch, Genesis activity pauses/);
  assert.match(html, /New Genesis primary-wallet registration remains permanently closed/);
  assert.match(html, /180 days of inactivity/);
  assert.doesNotMatch(html, /\b180 days\b(?! of inactivity)/i);
  assert.match(html, /How does the rolling 180 days of inactivity timer work/);
  assert.match(html, /shared programme-wide countdown starts at ACROWN launch/i);
  assert.match(html, /At official ACROWN launch, the Genesis Programme resumes for all identities registered before the cutoff/i);
  assert.match(html, /Members may continue purchasing remaining Genesis rights/i);
  assert.match(html, /New Genesis primary-wallet registration remains permanently closed/i);
  assert.doesNotMatch(html, /After ACROWN launches and the qualified ACS floor-purchase facility is operational, only wallets registered/i);
  assert.match(html, /each completed, finalized purchase of remaining Genesis rights or ACROWN at the ACS floor price resets/i);
  assert.match(html, /id="genesis-public-purchase-inactivity-countdown"/i);
  assert.match(html, /id="genesis-purchase-inactivity-countdown"/i);
  assert.match(html, /only unused shared purchase allowance is subject to the inactivity period/i);
  assert.doesNotMatch(html, /qualified ACS floor-price token-purchase service has actually become available.*countdown/i);
  assert.match(html, /Any eligible identity registered before the permanent cutoff may purchase any amount up to the entire remaining pool/);
  assert.match(html, /there is no personal per-wallet purchase cap/);
  assert.match(html, /id="supporter-tron-wallet-connect"/);
  assert.match(html, /id="genesis-wallet-brand-grid"/);
  for (const walletLogo of ["metamask", "trust", "okx", "tokenpocket", "coin98"]) {
    assert.ok(html.includes("../assets/wallet-logos/" + walletLogo + ".svg"), "Genesis selector must use local " + walletLogo + " logo");
  }
  assert.match(html, /Choose your wallet application/);
  assert.match(html, /Wallet brand first/);
  assert.match(html, /Ethereum Mainnet identity address/);
  assert.match(html, /TRON Mainnet identity address/);
  assert.match(html, /Solana Mainnet identity address/);
  for (const walletId of ["metamask", "trust-wallet", "okx-wallet", "bitget-wallet", "tokenpocket", "coin98"]) {
    assert.ok(html.includes('data-genesis-wallet-brand="' + walletId + '"'), "Genesis brand selector must include " + walletId);
  }
  assert.doesNotMatch(html, /No separate user account is created/);
  assert.match(html, /id="supporter-runtime-status"/);
  assert.match(html, /AstroCrown never receives private keys or recovery phrases/);
  assert.match(html, /The primary wallet is the sole Genesis identity, login authority and recovery anchor/);
  assert.match(html, /it does not own a personal share or cap/);
  assert.match(html, /same wallet application on any additional supported network/);
  assert.match(html, /Each address must independently sign a fresh, domain-bound ownership challenge/);
  assert.match(html, /Linked addresses cannot authenticate, recover, rename or administer the Genesis identity/);
  assert.match(html, /must originate from an address already verified and registered in your primary wallet profile/);
  assert.match(html, /Genesis Member distinction/);
  assert.match(html, /gold DNA Genesis Member badge/);
  assert.match(html, /Explorer links expose the full wallet address and associated public transaction history/);
  assert.match(html, /A random display name is generated when the primary wallet is first verified/);
  assert.match(html, /Never share your seed phrase or private key/);
  assert.match(html, /id="genesis-public-treasury-receipts"/);
  assert.match(html, /Verified incoming USDT treasury receipts/);
  assert.match(html, /id="genesis-payment-intent-form"/);
  assert.match(html, /id="genesis-payment-network"/);
  assert.match(html, /id="genesis-payment-source-wallet"/);
  assert.match(html, /id="genesis-payment-amount"/);
  assert.match(html, /id="genesis-payment-terms-accepted"/);
  assert.match(html, /id="genesis-payment-intent-create" type="submit" disabled/);
  assert.match(html, /id="genesis-payment-instructions" hidden/);
  assert.match(html, /Payments closed · Do not send USDT/);
  assert.match(html, /Create exact USDT payment instructions/);
  assert.match(html, /Cancel unsubmitted payment intent/);
  assert.match(html, /community inspection/);
});

test("staging supporter wallet script supports off-chain ownership proofs but no transaction submission", async () => {
  const js = await readPublic("supporters/supporters.js");
  const genesisWorkerSource = await readFile(resolve(workerRoot, "src", "genesis.js"), "utf8");
  assert.match(js, /eip6963:announceProvider/);
  assert.match(js, /TIP6963:announceProvider/);
  assert.match(js, /wallet-standard:app-ready/);
  assert.match(js, /discoverDirectEvmProviders/);
  assert.match(js, /discoverDirectTronProviders/);
  assert.match(js, /discoverDirectSolanaWallets/);
  assert.match(js, /selectedGenesisWalletBrand/);
  assert.match(js, /genesis-wallet-brand-grid/);
  assert.match(js, /This wallet has no Ethereum provider detected/);
  assert.match(js, /This wallet has no TRON provider detected/);
  assert.match(js, /This wallet has no Solana provider detected/);
  assert.match(js, /This creates your Genesis wallet profile/);
  assert.match(js, /eth_requestAccounts/);
  assert.match(js, /standard:connect/);
  assert.match(js, /personal_sign/);
  assert.match(js, /signMessageV2/);
  assert.match(js, /solana:signMessage/);
  assert.ok(js.includes("function supporterRuntimeMarkerPresent()"));
  assert.ok(js.includes("if (!supporterRuntimeMarkerPresent() || !wallet || !wallet.mainnet || supporterMember) return;"));
  assert.ok(js.includes("/api/genesis/status"));
  assert.ok(js.includes("/api/genesis/treasury-receipts"));
  assert.ok(js.includes("USDT · Ethereum (ERC-20)"));
  assert.ok(js.includes("USDT · TRON (TRC-20)"));
  assert.ok(js.includes("USDT · Solana (SPL)"));
  assert.ok(js.includes("USDT contract / mint"));
  assert.ok(js.includes("Block / slot inclusion"));
  assert.ok(js.includes("No live receipt claims are being displayed"));
  assert.ok(js.includes("explorer.origin !== network.origin"));
  assert.ok(js.includes("/api/genesis/payment-intents"));
  assert.ok(js.includes("/api/genesis/payment-intents/cancel"));
  assert.ok(js.includes("requestGenesisPaymentIntent"));
  assert.ok(js.includes("Cancellation available after expiry and monitor reconciliation"));
  assert.ok(js.includes("Do not cancel an intent after sending USDT"));
  assert.ok(genesisWorkerSource.includes("A payment intent cannot be cancelled before its expiry."));
  assert.ok(genesisWorkerSource.includes("recent healthy scan of Ethereum, TRON and Solana"));
  assert.ok(genesisWorkerSource.includes("A matching on-chain USDT receipt has already been recorded"));
  assert.ok(js.includes("renderGenesisPaymentPanel"));
  assert.ok(js.includes("MANUAL_EXACT_AMOUNT_TRANSFER"));
  assert.ok(js.includes("walletTransactionSubmitted"));
  assert.ok(js.includes("creditApplied === true"));
  assert.ok(js.includes("Qualifying payment independently reconciled"));
  assert.ok(js.includes("The registered wallet owner pays the network fee separately"));

  assert.ok(js.includes("/api/genesis/identity/challenge"));
  assert.ok(js.includes("/api/genesis/identity/verify"));
  assert.ok(js.includes("/api/genesis/display-name/challenge"));
  assert.ok(js.includes("/api/genesis/wallet-link/challenge"));
  assert.ok(!js.includes("/api/supporters/registration/"));
  assert.ok(!js.includes("/api/supporters/login/"));
  assert.match(js, /qualifying payments remain closed/i);
  assert.match(js, /window\.setInterval\(tick, 1000\)/);
  assert.match(js, /Latest global timer reset/);
  assert.match(js, /window\.setInterval\(refreshProgrammeStatus, 30000\)/);
  assert.equal(js.includes('method: "eth_sign"'), false);
  assert.equal(js.includes('method: "eth_signTypedData_v4"'), false);
  assert.equal(js.includes('method: "eth_sendTransaction"'), false);
  assert.equal(js.includes('method: "eth_sendRawTransaction"'), false);
  assert.equal(js.includes('method: "wallet_sendCalls"'), false);
  assert.equal(js.includes(".signTransaction("), false);
  assert.equal(js.includes(".signAndSendTransaction("), false);
});

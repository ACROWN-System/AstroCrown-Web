import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(here, "..");
const repoRoot = resolve(workerRoot, "../../..");
const developmentRoot = join(repoRoot, "development");
const publicRoot = join(workerRoot, "public");

function replaceExactlyOnce(value, original, replacement, label) {
  const first = value.indexOf(original);
  if (first < 0 || value.indexOf(original, first + original.length) !== -1) {
    throw new Error("Expected exactly one source fragment for " + label + "; refusing to publish an unverified staging notice.");
  }
  return value.slice(0, first) + replacement + value.slice(first + original.length);
}

const allowlist = [
  "index.html",
  "account-continuity/prototype/account-prototype.css",
  "account-continuity/prototype/account-ui.js",
  "account-continuity/prototype/admin-wallet-ui.js",
  "account-continuity/prototype/security-assurance.html",
  "account-continuity/prototype/terms-of-use.html",
  "account-continuity/prototype/privacy-policy.html",
];

await rm(publicRoot, { recursive: true, force: true });
await mkdir(publicRoot, { recursive: true });

for (const relativePath of allowlist) {
  const source = join(developmentRoot, relativePath);
  const destination = join(publicRoot, relativePath);
  await mkdir(dirname(destination), { recursive: true });

  if (relativePath === "index.html") {
    let html = await readFile(source, "utf8");
    const noticeReplacements = [
      [
        '<div class="preview-ribbon"><span class="ribbon-dot" aria-hidden="true"></span>Visual review build&nbsp; / &nbsp;illustrative market values&nbsp; / &nbsp;no live services connected</div>',
        '<div class="preview-ribbon"><span class="ribbon-dot" aria-hidden="true"></span>STAGING TEST ENVIRONMENT&nbsp; / &nbsp;illustrative market values&nbsp; / &nbsp;limited test services</div>',
        "staging status ribbon",
      ],
      [
        '<p class="development-notice-kicker"><span class="development-notice-icon" aria-hidden="true">!</span> Important development notice</p>',
        '<p class="development-notice-kicker"><span class="development-notice-icon" aria-hidden="true">!</span> Important staging safety notice</p>',
        "notice heading",
      ],
      [
        '<h1 class="development-notice-title" id="development-notice-title">AstroCrown is under development</h1>',
        '<h1 class="development-notice-title" id="development-notice-title">AstroCrown is a staging test environment</h1>',
        "notice title",
      ],
      [
        '<p class="development-notice-intro" id="development-notice-description">You are viewing an unfinished development preview, not a live or operational financial service. Features, account flows, market information and integrations may be incomplete, simulated, unavailable or changed without notice. This preview is provided for visual review only.</p>',
        '<p class="development-notice-intro" id="development-notice-description">You are entering a non-production AstroCrown staging environment for testing and evaluation. It is not the production service or a live financial service. Features, data, balances, accounts and integrations may be incomplete, experimental, simulated, unavailable, interrupted or changed without notice.</p>',
        "staging environment description",
      ],
      [
        "<strong>Do not use real assets or make transactions</strong>",
        "<strong>TEST NETWORKS ONLY — NEVER USE REAL ASSETS OR MAINNET FUNDS</strong>",
        "testnet warning heading",
      ],
      [
        "<p>Do not connect a wallet containing real assets, reveal a recovery phrase or private key, sign transaction requests, approve contracts, transfer or deposit funds, swap, stake, or otherwise use real digital assets with this development version. Any assets sent or approvals granted in connection with this preview could be permanently lost and may be impossible to recover.</p>",
        "<p>Use only a separate disposable wallet on a blockchain test network that AstroCrown explicitly identifies as supported, and only valueless test tokens. Do not connect a wallet holding real assets, switch to mainnet, sign mainnet transactions, approve mainnet contracts, transfer or deposit real funds, use a real payment method, or interact with assets of monetary value. Never reveal a seed phrase, private key, recovery phrase or production wallet secret. If the active network is not clearly identified as an approved testnet, do not sign or continue. Testnet activity may still be recorded publicly on that test network.</p>",
        "testnet-only warning",
      ],
      [
        '<p class="development-notice-terms">You proceed at your own risk. To the fullest extent permitted by applicable law, AstroCrown and its contributors disclaim responsibility for loss or damage arising from the use of this development preview. Nothing in this notice excludes any right or liability that cannot lawfully be excluded.</p>',
        '<p class="development-notice-terms">Accounts created here are temporary test accounts, not permanent AstroCrown customer accounts. Test accounts, staging passkeys, recovery keys, sessions, profiles, posts and other test data may be reset or deleted at any time without notice. Use invented, non-identifying details and a passkey and recovery key dedicated to this staging origin; never reuse production credentials. Treat everything entered, posted, messaged or uploaded as non-confidential: depending on the feature, it may be visible to other testers or service operators, may be publicly accessible, and may appear in operational/security logs or provider-retained backups. Do not submit personal, identifying, sensitive or confidential information. This environment may fail or change and provides no production availability, account-persistence or financial-service guarantee.</p>',
        "temporary-account and data-exposure warning",
      ],
      [
        "<span>I have read and understood this notice. I will not use this development preview with real assets, real-money wallets or transactions.</span>",
        "<span>I understand this is a temporary test environment. I will use invented details and only a dedicated testnet wallet with valueless test tokens; I will not submit personal, sensitive or confidential information or reuse production credentials.</span>",
        "acknowledgement text",
      ],
      [
        ">Continue to development preview</button>",
        ">Continue to staging test environment</button>",
        "continue button label",
      ],
    ];
    for (const [original, replacement, label] of noticeReplacements) {
      html = replaceExactlyOnce(html, original, replacement, label);
    }
    if (!html.includes('<meta name="astro-account-runtime"')) {
      html = html.replace(
        '<meta name="theme-color" content="#081426">',
        '<meta name="theme-color" content="#081426">\n  <meta name="astro-account-runtime" content="worker-staging">'
      );
    }
    if (!html.includes("astro-staging-banner")) {
      html = html.replace(
        /<body([^>]*)>/i,
        '<body$1>\n  <div class="astro-staging-banner" role="status" style="padding:7px 14px;text-align:center;background:#463715;color:#fff0b2;border-bottom:1px solid #9b7c28;font-size:11px;font-weight:700;letter-spacing:.08em">STAGING ENVIRONMENT · SYNTHETIC TEST ACCOUNTS ONLY · NOT THE PUBLIC SERVICE</div>'
      );
    }
    await writeFile(destination, html, "utf8");
  } else if (relativePath.endsWith("/account-ui.js")) {
    let js = await readFile(source, "utf8");
    const original = '  var liveTestMode = queryParams.get("account-live-test") === "1" &&\n    window.location.protocol === "https:" && liveTestHost;\n  var browserPreviewMode = forceBrowserDemo ||\n    (!liveTestMode && loopbackHosts.indexOf(window.location.hostname) === -1);';
    const revised = '  var liveTestMode = queryParams.get("account-live-test") === "1" &&\n    window.location.protocol === "https:" && liveTestHost;\n  var runtimeMarker = document.querySelector(\'meta[name="astro-account-runtime"]\');\n  var workerStagingMode = Boolean(runtimeMarker && runtimeMarker.content === "worker-staging" &&\n    window.location.protocol === "https:");\n  var browserPreviewMode = forceBrowserDemo ||\n    (!liveTestMode && !workerStagingMode && loopbackHosts.indexOf(window.location.hostname) === -1);';

    if (!js.includes(original)) {
      throw new Error("Account UI runtime guard changed; refusing to publish without review.");
    }
    js = js.replace(original, revised);
    js = js.replace(
      'var noticeMode = liveTestMode ? "https-live-test" : "local-passkey-test";',
      'var noticeMode = workerStagingMode ? "worker-staging" : (liveTestMode ? "https-live-test" : "local-passkey-test");'
    );
    js = js.replace(
      'var noticeText = liveTestMode',
      'var noticeText = workerStagingMode ? "ASTROCROWN STAGING TEST — Use invented test details only. This is a restricted staging environment, not the public service. Never use production account data, personal recovery keys, wallet secrets or real assets." : liveTestMode'
    );
    const oldSigninCase = '<p class="account-signin-feedback"><a href="./account-continuity/prototype/cases.html">Feedback, grievances &amp; case access</a></p>';
    const newSigninCase = '<p class="account-signin-feedback">Feedback and case access are not enabled in this staging qualification.</p>';
    const oldDashboardCase = '<section class="account-dashboard-card"><h2>Feedback &amp; case access</h2><p>Submit a suggestion or grievance, follow case updates, or recover case access independently of your account.</p><a href="./account-continuity/prototype/cases.html">Open feedback &amp; case portal</a></section>';
    const newDashboardCase = '<section class="account-dashboard-card"><h2>Feedback &amp; case access</h2><p>Not included in this staging qualification. This test environment is limited to ordinary account registration, sign-in and recovery.</p></section>';
    if (!js.includes(oldSigninCase) || !js.includes(oldDashboardCase)) {
      throw new Error("The account UI case-portal entry points changed; refusing to publish broken staging links.");
    }
    js = js.replace(oldSigninCase, newSigninCase).replace(oldDashboardCase, newDashboardCase);
    const oldCommunicationsCard = '<section class="account-dashboard-card account-communications-card"><h2>Alerts &amp; Messages</h2><p class="account-dashboard-value">\' + String(unreadCommunicationCount) + \' pending</p><p>Important account alerts and private in-app messages are kept in one place, with separate sections and acknowledgement/read status.</p><button class="account-primary" type="button" id="open-account-communications">Open communications</button></section>';
    const newCommunicationsCard = '<section class="account-dashboard-card account-communications-card"><h2>Alerts &amp; Messages</h2><p class="account-dashboard-value">Disabled in this staging qualification</p><p>Account communications are not part of this test release. Email and SMS delivery are not configured; no messages or alerts are sent.</p></section>';
    if (!js.includes(oldCommunicationsCard)) throw new Error("The communications dashboard card changed; refusing to publish a non-working control.");
    js = js.replace(oldCommunicationsCard, newCommunicationsCard);
    js = js.replaceAll("local development account", "staging test account");
    const oldMlDsaStatus = "'ML-DSA algorithms are offered first during registration. The current authenticator did not register an ML-DSA credential, or an older credential has no algorithm record. Existing passkeys remain usable through compatible algorithms.'";
    const newMlDsaStatus = "'ML-DSA-44 ' + (accountState.mlDsaRegistrationAvailable ? 'is supported for verification by this runtime and is offered first during registration. ' : 'is not supported for verification by this runtime and cannot be offered here. ') + 'The current authenticator did not register an ML-DSA credential, or an older credential has no algorithm record. Existing passkeys remain usable through compatible algorithms.'";
    if (!js.includes(oldMlDsaStatus)) throw new Error("The ML-DSA status copy changed; refusing to publish an unqualified security statement.");
    js = js.replace(oldMlDsaStatus, newMlDsaStatus);
    js = js.replace(
      "This local prototype does not grant production access or administrator privileges.",
      "This staging test account does not grant production access or administrator privileges."
    );
    js = js.replace(
      "The local server keeps your session until it expires or you sign out.",
      "The staging service keeps your session until it expires or you sign out."
    );
    js = js.replace(
      "<strong>Development User dashboard.</strong>",
      "<strong>Staging User dashboard.</strong>"
    );
    js = js.replace(
      "This local prototype tests account access and settings only.",
      "This staging qualification tests account access and settings only."
    );
    js = js.replace(
      'throw new Error(liveTestMode ? "The temporary HTTPS test service is not responding. Restart the live-test runner." : "The local account prototype is not running. Start it with the documented local command.");',
      'throw new Error(workerStagingMode ? "The AstroCrown staging account service is not responding. The test account has not been changed." : (liveTestMode ? "The temporary HTTPS test service is not responding. Restart the live-test runner." : "The local account prototype is not running. Start it with the documented local command."));'
    );
    await writeFile(destination, js, "utf8");
  } else {
    await cp(source, destination);
  }
}

console.log("Built the allowlisted AstroCrown staging website asset set.");
console.log("Excluded repository source, audit records, backups, credentials, and deployment files.");

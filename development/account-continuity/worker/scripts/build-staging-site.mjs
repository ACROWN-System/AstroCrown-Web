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

function injectPageEntryNotice(html, pageId) {
  if (!html.includes('name="astro-page-id"')) {
    html = replaceExactlyOnce(
      html,
      "</head>",
      '  <meta name="astro-page-id" content="' + pageId + '">' + String.fromCharCode(10) +
      '  <link rel="stylesheet" href="/page-entry/page-entry-notice.css">' + String.fromCharCode(10) +
      "</head>",
      "page entry notice metadata and stylesheet",
    );
  }
  if (!html.includes('/page-entry/page-entry-notice.js')) {
    html = replaceExactlyOnce(
      html,
      "</body>",
      '  <script src="/page-entry/page-entry-notice.js" defer></script>' + String.fromCharCode(10) + "</body>",
      "page entry notice script",
    );
  }
  return html;
}

const allowlist = [
  "index.html",
  "account-continuity/prototype/account-prototype.css",
  "account-continuity/prototype/account-ui.js",
  "account-continuity/prototype/admin-wallet-ui.js",
  "account-continuity/prototype/terms-of-use.html",
  "account-continuity/prototype/privacy-policy.html",
  "account-continuity/prototype/wallet-identity-assurance.html",
  "page-entry/page-entry-notice.css",
  "page-entry/page-entry-notice.js",
  "page-entry/feature-status.json",
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
        '<div class="preview-ribbon"><span class="ribbon-dot" aria-hidden="true"></span>LIVE PUBLIC TEST ENVIRONMENT&nbsp; / &nbsp;illustrative market values&nbsp; / &nbsp;limited test services</div>',
        "staging status ribbon",
      ],
      [
        '<p class="development-notice-kicker"><span class="development-notice-icon" aria-hidden="true">!</span> Important development notice</p>',
        '<p class="development-notice-kicker"><span class="development-notice-icon" aria-hidden="true">!</span> Important staging safety notice</p>',
        "notice heading",
      ],
      [
        '<h1 class="development-notice-title" id="development-notice-title">AstroCrown is under development</h1>',
        '<h1 class="development-notice-title" id="development-notice-title">AstroCrown is live for public testing</h1>',
        "notice title",
      ],
      [
        '<p class="development-notice-intro" id="development-notice-description">You are viewing an unfinished development preview, not a live or operational financial service. Features, account flows, market information and integrations may be incomplete, simulated, unavailable or changed without notice. This preview is provided for visual review only.</p>',
        '<p class="development-notice-intro" id="development-notice-description">You are entering the live, publicly accessible AstroCrown test environment. The website is online and intended for real-world interaction with the features explicitly enabled in this staging release. It is not the production commercial service. Features, data, balances, accounts and integrations may be incomplete, experimental, simulated, unavailable, interrupted or changed without notice. Test accounts and records are temporary and may be reset.</p>',
        "staging environment description",
      ],
      [
        "<strong>Do not use real assets or make transactions</strong>",
        "<strong>Use only the network and actions explicitly identified for each feature</strong>",
        "network and action warning heading",
      ],
      [
        "<p>Do not connect a wallet containing real assets, reveal a recovery phrase or private key, sign transaction requests, approve contracts, transfer or deposit funds, swap, stake, or otherwise use real digital assets with this development version. Any assets sent or approvals granted in connection with this preview could be permanently lost and may be impossible to recover.</p>",
        "<p>Do not assume that connecting a wallet, signing an off-chain ownership message or seeing a wallet address enables payments or transactions. An off-chain ownership signature is not a blockchain transaction. A development transaction is permitted only when the exact feature is explicitly marked DEVNET, your wallet visibly reports the exact named development network, and any test assets come from the verified faucet shown by AstroCrown; test tokens have no mainnet value. Real-value transactions are permitted only when the exact feature is explicitly marked LIVE · MAINNET and you have independently checked the network, asset, amount and destination. LIVE · STAGING does not mean mainnet functionality. Genesis qualifying payments and ACROWN purchases are disabled in this staging release. Never reveal a seed phrase, private key, wallet recovery phrase or other wallet secret.</p>",
        "wallet and transaction boundary",
      ],
      [
        '<p class="development-notice-terms">You proceed at your own risk. To the fullest extent permitted by applicable law, AstroCrown and its contributors disclaim responsibility for loss or damage arising from the use of this development preview. Nothing in this notice excludes any right or liability that cannot lawfully be excluded.</p>',
        '<p class="development-notice-terms">This is a temporary public test environment, not the production commercial service. Public submissions may be visible to anyone on the internet, including visitors without accounts. Use invented, non-identifying details and do not submit personal, sensitive, confidential or third-party information. Never publish production credentials, seed phrases, private keys, wallet recovery secrets or other security secrets. Test accounts, sessions, profiles and test records may be reset or deleted without notice. Only features explicitly marked LIVE with their environment are functional. DEVNET features are restricted to their named test network and verified faucet; FOR DEVELOPMENT · READ ONLY features do not provide operational transactions or state-changing functionality. An unlabelled feature must be treated as FOR DEVELOPMENT · READ ONLY. Hosting operators may separately process technical logs and provider-managed backups under their retention policies. This environment may fail or change and provides no production availability, account-persistence or financial-service guarantee.</p>',
        "temporary-account and data-exposure warning",
      ],
      [
        "<span>I have read and understood this notice. I will not use this development preview with real assets, real-money wallets or transactions.</span>",
        "<span>I have read and understood this public test notice, the feature-status labels and the risks associated with this page. I will treat every unlabelled feature as FOR DEVELOPMENT · READ ONLY.</span>",
        "acknowledgement text",
      ],
      [
        ">Continue to development preview</button>",
        ">Continue to AstroCrown</button>",
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
    html = replaceExactlyOnce(
      html,
      '          <a href="#explore">Explore ecosystem</a>',
      '          <a href="#explore">Explore ecosystem</a>' + String.fromCharCode(10) + '          <a href="./supporters/">Genesis Programme</a>',
      "Genesis Programme footer navigation",
    );
    if (!html.includes("astro-staging-banner")) {
      html = html.replace(
        /<body([^>]*)>/i,
        '<body$1>\n  <div class="astro-staging-banner" role="status" style="padding:7px 14px;text-align:center;background:#463715;color:#fff0b2;border-bottom:1px solid #9b7c28;font-size:11px;font-weight:700;letter-spacing:.08em">LIVE PUBLIC TEST ENVIRONMENT · TEMPORARY TEST ACCOUNTS · NOT THE PRODUCTION SERVICE</div>'
      );
    }
    html = injectPageEntryNotice(html, "home");
    await writeFile(destination, html, "utf8");
  } else if (relativePath.endsWith("/account-ui.js")) {
    let js = await readFile(source, "utf8");
    const runtimeGuard = /  var liveTestMode = queryParams\\.get\\("account-live-test"\\) === "1" &&\\n    window\\.location\\.protocol === "https:" && liveTestHost;\\n  var browserPreviewMode = forceBrowserDemo \\|\\|\\n    \\(!liveTestMode && loopbackHosts\\.indexOf\\(window\\.location\\.hostname\\) === -1\\);/;
    const revisedGuard = [
      '  var liveTestMode = queryParams.get("account-live-test") === "1" &&',
      '    window.location.protocol === "https:" && liveTestHost;',
      '  var runtimeMarker = document.querySelector(\'meta[name="astro-account-runtime"]\');',
      '  var workerStagingMode = Boolean(runtimeMarker && runtimeMarker.content === "worker-staging" &&',
      '    window.location.protocol === "https:");',
      '  var browserPreviewMode = forceBrowserDemo ||',
      '    (!liveTestMode && !workerStagingMode && loopbackHosts.indexOf(window.location.hostname) === -1);'
    ].join("\\n");
    if (!runtimeGuard.test(js)) {
      throw new Error("Account UI runtime guard changed; refusing to publish without review.");
    }
    js = js.replace(runtimeGuard, revisedGuard);
    await writeFile(destination, js, "utf8");
  } else if (relativePath.endsWith("wallet-identity-assurance.html")) {
    let html = await readFile(source, "utf8");
    html = injectPageEntryNotice(html, "account");
    await writeFile(destination, html, "utf8");
  } else if (relativePath.endsWith(".html")) {
    let html = await readFile(source, "utf8");
    html = injectPageEntryNotice(html, "legal");
    await writeFile(destination, html, "utf8");
  } else {
    await cp(source, destination);
  }
}

// The Genesis Programme preview is a deliberate, narrowly scoped static
// addition to the same site. Do not copy the preview directory wholesale.
const genesisProgrammeFiles = [
  ["preview/supporters/index.html", "supporters/index.html"],
  ["preview/supporters/supporters.js", "supporters/supporters.js"],
  ["preview/supporters/wallet-provider-adapters.mjs", "supporters/wallet-provider-adapters.mjs"],
  ["preview/assets/genesis-member-dna.svg", "assets/genesis-member-dna.svg"],
];
for (const [sourcePath, destinationPath] of genesisProgrammeFiles) {
  const source = join(repoRoot, sourcePath);
  const destination = join(publicRoot, destinationPath);
  await mkdir(dirname(destination), { recursive: true });
  if (destinationPath === "supporters/index.html") {
    let html = await readFile(source, "utf8");
    if (!html.includes('name="astro-supporter-runtime"')) {
      html = html.replace(
        /<head([^>]*)>/i,
        '<head$1>\n  <meta name="astro-supporter-runtime" content="worker-staging">'
      );
    }
    html = injectPageEntryNotice(html, "genesis");
    await writeFile(destination, html, "utf8");
  } else {
    await cp(source, destination);
  }
}

console.log("Built the allowlisted AstroCrown staging website asset set.");
console.log("Excluded repository source, audit records, backups, credentials, and deployment files.");

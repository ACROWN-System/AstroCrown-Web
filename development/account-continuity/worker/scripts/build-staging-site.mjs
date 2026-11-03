import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(here, "..");
const repoRoot = resolve(workerRoot, "../../..");
const developmentRoot = join(repoRoot, "development");
const publicRoot = join(workerRoot, "public");

const allowlist = [
  "index.html",
  "account-continuity/prototype/account-prototype.css",
  "account-continuity/prototype/account-ui.js",
  "account-continuity/prototype/admin-wallet-ui.js",
  "account-continuity/prototype/security-assurance.html",
  "account-continuity/prototype/terms-of-use.html",
  "account-continuity/prototype/privacy-policy.html",
  "account-continuity/prototype/cases.html",
  "account-continuity/prototype/cases.css",
  "account-continuity/prototype/cases-ui.js"
];

await rm(publicRoot, { recursive: true, force: true });
await mkdir(publicRoot, { recursive: true });

for (const relativePath of allowlist) {
  const source = join(developmentRoot, relativePath);
  const destination = join(publicRoot, relativePath);
  await mkdir(dirname(destination), { recursive: true });

  if (relativePath === "index.html") {
    let html = await readFile(source, "utf8");
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
    js = js.replaceAll("local development account", "staging test account");
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

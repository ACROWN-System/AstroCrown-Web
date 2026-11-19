#!/usr/bin/env node
/**
 * Build the deliberately narrow AstroCrown public preview for Cloudflare Pages.
 * This monorepo must never publish all of development/ or backup/.
 * Only the explicit allowlist below is copied into dist. No external package.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}
function write(relativePath, content) {
  const target = path.join(DIST, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}
function copy(sourcePath, destinationPath = sourcePath) {
  const target = path.join(DIST, destinationPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(ROOT, sourcePath), target);
}
function replaceExactlyOnce(source, search, replacement, description) {
  const first = source.indexOf(search);
  if (first < 0 || source.indexOf(search, first + search.length) !== -1) {
    throw new Error("Expected exactly one match for " + description);
  }
  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// Main homepage, deliberately published as a noindex visual-review preview.
let homepage = read("development/index.html");
if (!/<meta\s+name=["']robots["']/i.test(homepage)) {
  const description = /(<meta\s+name=["']description["'][^>]*>\s*)/i;
  if (!description.test(homepage)) throw new Error("Homepage description meta tag not found.");
  homepage = homepage.replace(description, '$1  <meta name="robots" content="noindex, nofollow, noarchive">\n');
}
const footerMarker = '<a href="#explore">Explore ecosystem</a>';
homepage = replaceExactlyOnce(
  homepage,
  footerMarker,
  footerMarker +
    '\n          <a href="./supporters/">Genesis Programme</a>' +
    '\n          <a href="./privacy-transparency.html">Privacy &amp; Transparency Centre</a>',
  "homepage footer navigation"
);

// The static host has no staging Worker: keep the initial warning local-only.
homepage = homepage.replace(
  /var workerStagingMode = Boolean\([\s\S]*?\);\s*var acknowledgementPending = false;/,
  "var workerStagingMode = false;\n      var acknowledgementPending = false;"
);
const accountPreviewGuard = [
  '<style id="cloudflare-public-preview-guard">',
  '  .account-tabs [data-account-mode="create"],',
  '  .account-signin-recovery,',
  '  .account-signin-feedback { display: none !important; }',
  '</style>'
].join("\n");
homepage = replaceExactlyOnce(homepage, "</head>", accountPreviewGuard + "\n</head>", "homepage preview guard");
write("index.html", homepage);

// Copy only the three account assets referenced by the homepage. Force the
// account UI into its in-memory, unauthenticated, read-only hosted demo mode.
copy("development/account-continuity/prototype/account-prototype.css", "account-continuity/prototype/account-prototype.css");
let accountJs = read("development/account-continuity/prototype/account-ui.js");
accountJs = replaceExactlyOnce(
  accountJs,
  'var forceBrowserDemo = queryParams.get("account-preview-demo") === "1";',
  "var forceBrowserDemo = true;",
  "read-only hosted account preview enforcement"
);
accountJs = accountJs
  .replaceAll("./account-continuity/prototype/security-assurance.html", "./privacy-transparency.html#current-status")
  .replaceAll("./account-continuity/prototype/cases.html", "./privacy-transparency.html#reporting")
  .replaceAll("./account-continuity/prototype/terms-of-use.html", "./privacy-transparency.html")
  .replaceAll("./account-continuity/prototype/privacy-policy.html", "./privacy-transparency.html");
write("account-continuity/prototype/account-ui.js", accountJs);
copy("development/account-continuity/prototype/admin-wallet-ui.js", "account-continuity/prototype/admin-wallet-ui.js");
copy("development/community-network/community-network.css", "community-network/community-network.css");
let communityPreviewJs = read("development/community-network/community-network.js");
communityPreviewJs = replaceExactlyOnce(
  communityPreviewJs,
  "(function () {",
  "(function () {\\n  window.ASTROCROWN_COMMUNITY_STATIC_PREVIEW = true;",
  "backend-free static Community preview guard"
);
write("community-network/community-network.js", communityPreviewJs);

// Self-contained education and Genesis Programme previews. Its wallet JS
// permits only user-initiated off-chain ownership messages when the separate
// Genesis Worker is present; no transaction or payment method is called.
write("privacy-transparency.html", read("preview/privacy-transparency.html"));
write("supporters/index.html", read("preview/supporters/index.html"));
copy("preview/supporters/supporters.js", "supporters/supporters.js");
// Required local dependency of the Genesis browser module. It is an allowlisted
// provider adapter only; no network transfer or payment method is invoked here.
copy("preview/supporters/wallet-provider-adapters.mjs", "supporters/wallet-provider-adapters.mjs");
copy("preview/assets/genesis-member-dna.svg", "assets/genesis-member-dna.svg");

// Security/indexing controls for an unlaunched preview.
write("robots.txt", "User-agent: *\nDisallow: /\n");
write("_headers", [
  "/*",
  "  X-Content-Type-Options: nosniff",
  "  Referrer-Policy: strict-origin-when-cross-origin",
  "  X-Frame-Options: DENY",
  "  Permissions-Policy: camera=(), microphone=(), geolocation=()",
  "  X-Robots-Tag: noindex, nofollow, noarchive",
  ""
].join("\n"));
write("_redirects", "/supporters /supporters/ 301\n");

console.log("Cloudflare Pages public-preview build complete.");
console.log("Only the approved static publication allowlist is written to dist.");
console.log("No backend, Worker, D1 database, API, payment, or live account service is included.");

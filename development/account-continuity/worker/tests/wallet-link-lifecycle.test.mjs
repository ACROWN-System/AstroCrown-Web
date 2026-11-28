import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createAdditionalWalletLinkMessage } from "../src/index.js";

const origin = "https://astrocrown-account-staging-staging.workers.dev";
const owner = "0x1111111111111111111111111111111111111111";
const additional = "0x2222222222222222222222222222222222222222";

test("additional-wallet authorization message binds the permanent owner, target wallet, action and limited scope", () => {
  const link = createAdditionalWalletLinkMessage(
    { origin },
    "AC-1234567890",
    owner,
    1,
    additional,
    8453,
    "link",
    "challenge-id-12345678901234567890",
    "00112233445566778899aabbccddeeff",
    "2026-11-28T00:00:00.000Z",
    "2026-11-28T00:05:00.000Z",
  );
  assert.ok(link.startsWith("astrocrown-account-staging-staging.workers.dev requests your authorization to link"));
  assert.ok(link.includes("AstroCrown account: AC-1234567890"));
  assert.ok(link.includes("Permanent owner wallet: " + owner));
  assert.ok(link.includes("Additional wallet: " + additional));
  assert.ok(link.includes("Owner network chain ID: 1"));
  assert.ok(link.includes("Additional wallet chain ID: 8453"));
  assert.ok(link.includes("Requested action: link"));
  assert.ok(link.includes("Permission scope: wallet capabilities for explicitly initiated account operations only."));
  assert.match(link, /does not authorize a blockchain transaction, token approval, transfer, payment or spending permission/i);
  assert.ok(link.includes("Challenge ID: challenge-id-12345678901234567890"));
  assert.ok(link.includes("Expiration Time: 2026-11-28T00:05:00.000Z"));
  assert.ok(!link.includes("private_key"));
});

test("additional-wallet database schema supports revocation and later fresh re-linking", async () => {
  const migration = await readFile(
    new URL("../migrations/0008_additional-wallet-links.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_linked_wallets/);
  assert.match(migration, /UNIQUE \(account_id, address\)/);
  assert.match(migration, /ON auth_linked_wallets\(address\)\s+WHERE active = 1/);
  assert.match(migration, /active INTEGER NOT NULL DEFAULT 1/);
  assert.match(migration, /revoked_at TEXT/);
  assert.match(migration, /permission_scope TEXT NOT NULL CHECK \(permission_scope = 'wallet-capabilities-only'\)/);
  assert.match(migration, /permission_authorized_at TEXT/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_wallet_link_challenges/);
  assert.match(migration, /session_token_hash TEXT NOT NULL/);
  assert.match(migration, /owner_address TEXT NOT NULL/);
  assert.match(migration, /action TEXT NOT NULL CHECK \(action IN \('link', 'unlink'\)\)/);
  assert.match(migration, /expires_at INTEGER NOT NULL/);
  assert.doesNotMatch(migration, /private_key|seed_phrase|mnemonic|secret_words/i);
});

test("server requires owner proof for both actions and additional-wallet proof plus fresh consent for linking", async () => {
  const worker = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /\/api\/account\/wallet-links\/options/);
  assert.match(worker, /\/api\/account\/wallet-links\/verify/);
  assert.match(worker, /async function issueAdditionalWalletLinkChallenge/);
  assert.match(worker, /async function verifyAdditionalWalletLink/);
  assert.match(worker, /typeof payload\.ownerSignature !== "string"/);
  assert.match(worker, /typeof payload\.walletSignature !== "string"/);
  assert.match(worker, /payload\.permissionAuthorized !== true/);
  assert.match(worker, /await verifyEvmPersonalSignature\(payload\.message, payload\.ownerSignature, ownerAddress\)/);
  assert.match(worker, /await verifyEvmPersonalSignature\(payload\.message, payload\.walletSignature, address\)/);
  assert.match(worker, /UPDATE auth_wallet_link_challenges SET used_at = \?/);
  assert.match(worker, /EXISTS\(SELECT 1 FROM auth_sessions/);
  assert.match(worker, /EXISTS\(SELECT 1 FROM auth_primary_wallets/);
  assert.match(worker, /permissionScope: "wallet-capabilities-only"/);
  assert.match(worker, /transactionAuthorized: false/);
  assert.match(worker, /spendingAuthorized: false/);
});

test("unlink revokes only AstroCrown permission and re-link requires fresh wallet proofs", async () => {
  const worker = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /UPDATE auth_linked_wallets SET active = 0,revoked_at = \?,permission_authorized_at = NULL/);
  assert.match(worker, /UPDATE auth_linked_wallets SET chain_id = \?,family = 'evm-eoa',linked_at = \?,active = 1,revoked_at = NULL,permission_authorized_at = \?/);
  assert.match(worker, /additional_wallet_linked/);
  assert.match(worker, /additional_wallet_unlinked/);
  assert.match(worker, /may be linked again later with fresh wallet proofs and authorization/i);
  assert.match(worker, /auth_linked_wallets WHERE address = \? COLLATE NOCASE AND active = 1/);
});

test("an additional wallet cannot become an alternate owner or sign-in identity", async () => {
  const worker = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /const linkedIdentity = await db\.prepare\(/);
  assert.match(worker, /This wallet is linked as an additional wallet and cannot be used to sign in or create another AstroCrown account/);
  assert.match(worker, /The permanent owner wallet cannot be linked or unlinked as an additional wallet/);
  assert.match(worker, /immutable owner wallet and cannot be linked as an additional wallet/);
  assert.match(worker, /accountRecovery: "none; losing the permanent owner wallet permanently ends account access/);
  const migration = await readFile(
    new URL("../migrations/0006_primary-wallet-account-authentication.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /account_id TEXT NOT NULL UNIQUE REFERENCES auth_accounts/);
  const logout = worker.slice(worker.indexOf("async function logout("), worker.indexOf("async function avatar("));
  assert.match(logout, /DELETE FROM auth_sessions WHERE token_hash = \?/);
  assert.doesNotMatch(logout, /DELETE FROM auth_primary_wallets|UPDATE auth_primary_wallets|auth_linked_wallets/);
});

test("dashboard proactively exposes reversible additional-wallet controls and immutable-owner logout confirmation", async () => {
  const ui = await readFile(new URL("../../prototype/account-ui.js", import.meta.url), "utf8");
  assert.match(ui, /Additional wallets/);
  assert.match(ui, /Browser extensions/);
  assert.match(ui, /Ethereum \/ EVM/);
  assert.match(ui, /account-linked-wallet-refresh/);
  assert.match(ui, /account-linked-wallet-connect/);
  assert.match(ui, /account-linked-wallet-permission/);
  assert.match(ui, /account-linked-wallet-link/);
  assert.match(ui, /data-linked-wallet-unlink/);
  assert.match(ui, /discoverAdditionalWalletProviders/);
  assert.match(ui, /findConnectedOwnerWalletProvider/);
  assert.match(ui, /ownerSignature: ownerSignature/);
  assert.match(ui, /walletSignature: walletSignature/);
  assert.match(ui, /permissionAuthorized: true/);
  assert.match(ui, /same wallet may be linked again later/i);
  assert.match(ui, /Disconnect your permanent owner wallet from this AstroCrown session and log out/);
  assert.match(ui, /same owner wallet/);
  assert.match(ui, /Additional linked wallets cannot replace it or restore account access/);
});

test("account creation opens the account dashboard and reports success or failure in a result dialog", async () => {
  const ui = await readFile(new URL("../../prototype/account-ui.js", import.meta.url), "utf8");
  const finishStart = ui.indexOf("  async function finishPrimaryWalletAuthentication(result, created) {");
  const finishEnd = ui.indexOf("\n  function renderTabs(", finishStart);
  assert.ok(finishStart >= 0 && finishEnd > finishStart);
  const finish = ui.slice(finishStart, finishEnd);
  assert.match(finish, /window\.history\.replaceState/);
  assert.match(finish, /"#account"/);
  assert.match(finish, /await showAccountDashboard\(\)/);
  assert.match(finish, /showAccountResultDialog\("success"/);
  assert.match(ui, /showAccountResultDialog\("error", "Account creation could not be confirmed"/);
  assert.match(ui, /className = "account-result-dialog"/);
  assert.match(ui, /AstroCrown account created successfully/);
  assert.match(ui, /No alternative account recovery/);
  assert.match(ui, /AstroCrown provides no account recovery, owner-wallet replacement or ownership transfer/);
  assert.match(ui, /wallet-loss-warning-2026-11-28-v2/);
});

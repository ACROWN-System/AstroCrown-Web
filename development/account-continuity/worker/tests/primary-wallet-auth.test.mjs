import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createPrimaryWalletSignInMessage,
  normalizeEvmAddress,
  validateEvmChainId,
  verifyEvmPersonalSignature,
} from "../src/index.js";
import { privateKeyToAccount } from "viem/accounts";

const origin = "https://astrocrown-account-staging-staging.workers.dev";

test("primary-wallet challenge binds the exact origin, address, chain, nonce and expiry", () => {
  const wallet = privateKeyToAccount("0x" + "66".repeat(32));
  const message = createPrimaryWalletSignInMessage(
    { origin },
    wallet.address,
    11155111,
    "challenge-id-12345678901234567890",
    "a1b2c3d4e5f60718293a4b5c6d7e8f90",
    "2026-11-28T00:00:00.000Z",
    "2026-11-28T00:05:00.000Z",
  );

  assert.ok(message.startsWith(origin + " wants you to sign in with your Ethereum account:"));
  assert.ok(message.includes(wallet.address));
  assert.ok(message.includes("URI: " + origin));
  assert.ok(message.includes("Chain ID: 11155111"));
  assert.ok(message.includes("Nonce: a1b2c3d4e5f60718293a4b5c6d7e8f90"));
  assert.ok(message.includes("Expiration Time: 2026-11-28T00:05:00.000Z"));
  assert.ok(message.includes("Request ID: challenge-id-12345678901234567890"));
  assert.match(message, /off-chain signature authenticates your account only/i);
  assert.match(message, /does not authorize a blockchain transaction, token approval, asset transfer or spending/i);
  assert.doesNotMatch(message, /administrator|admin role|transfer funds/i);
});

test("primary-wallet EIP-191 proof accepts only the expected externally owned account", async () => {
  const wallet = privateKeyToAccount("0x" + "77".repeat(32));
  const otherWallet = privateKeyToAccount("0x" + "88".repeat(32));
  const message = createPrimaryWalletSignInMessage(
    { origin },
    wallet.address,
    1,
    "challenge-id-abcdefghijklmnopqrst",
    "00112233445566778899aabbccddeeff",
    "2026-11-28T00:00:00.000Z",
    "2026-11-28T00:05:00.000Z",
  );
  const signature = await wallet.signMessage({ message });

  assert.equal(
    await verifyEvmPersonalSignature(message, signature, wallet.address),
    wallet.address,
  );
  await assert.rejects(
    verifyEvmPersonalSignature(message, signature, otherWallet.address),
    error => error.status === 401,
  );
  await assert.rejects(
    verifyEvmPersonalSignature(message, "0x1234", wallet.address),
    error => error.status === 401,
  );
});

test("primary-wallet input validation rejects malformed addresses and chain IDs", () => {
  const wallet = privateKeyToAccount("0x" + "99".repeat(32));
  assert.equal(normalizeEvmAddress(wallet.address.toLowerCase()), wallet.address);
  assert.equal(validateEvmChainId(1), 1);
  for (const address of ["", "0x1234", "not-a-wallet"]) {
    assert.throws(() => normalizeEvmAddress(address), error => error.status === 400);
  }
  for (const chainId of [0, -1, 1.5, "1", true, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateEvmChainId(chainId), error => error.status === 400);
  }
});

test("primary-wallet account identity schema stores public identity metadata only", async () => {
  const migration = await readFile(
    new URL("../migrations/0006_primary-wallet-account-authentication.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /account_id TEXT NOT NULL UNIQUE REFERENCES auth_accounts/);
  assert.match(migration, /address TEXT NOT NULL COLLATE NOCASE UNIQUE/);
  assert.match(migration, /chain_id INTEGER NOT NULL CHECK \(chain_id > 0\)/);
  assert.match(migration, /auth_primary_wallet_challenges/);
  assert.match(migration, /expires_at INTEGER NOT NULL/);
  assert.match(migration, /used_at TEXT/);
  assert.doesNotMatch(migration, /private_key|seed_phrase|mnemonic|secret_words/i);
});

test("primary-wallet API verifies one-use challenges and never treats a wallet connection as proof", async () => {
  const worker = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /\/api\/account\/primary-wallet\/options/);
  assert.match(worker, /\/api\/account\/primary-wallet\/verify/);
  assert.match(worker, /auth_primary_wallet_challenges WHERE challenge_id = \? AND used_at IS NULL AND expires_at > \?/);
  assert.match(worker, /UPDATE auth_primary_wallet_challenges SET used_at = \?/);
  assert.match(worker, /await verifyEvmPersonalSignature\(payload\.message, payload\.signature, address\)/);
  assert.match(worker, /transactionAuthorized: false/);
  assert.match(worker, /walletAccountCreated/);
});

test("wallet-first account popup requires explicit recovery and legal consent", async () => {
  const ui = await readFile(
    new URL("../../prototype/account-ui.js", import.meta.url),
    "utf8",
  );
  assert.match(ui, /Sign in with wallet/);
  assert.match(ui, /New to AstroCrown\?/);
  assert.match(ui, /Create an account/);
  assert.match(ui, /Already have an account\?/);
  assert.match(ui, /Lost your wallet\?/);
  assert.match(ui, /same wallet and address/i);
  assert.match(ui, /Never enter or send your seed phrase or private key/i);
  assert.match(ui, /account-wallet-loss-accepted/);
  assert.match(ui, /account-wallet-terms-accepted/);
  assert.match(ui, /walletLossAcknowledged/);
  assert.match(ui, /termsAccepted/);
  const providerSelectionStart = ui.indexOf("  function selectedWalletProviderFromForm() {");
  const providerSelectionEnd = ui.indexOf("\n  async function authenticateWithPrimaryWallet", providerSelectionStart);
  assert.ok(providerSelectionStart >= 0 && providerSelectionEnd > providerSelectionStart, "selected-wallet provider guard must exist");
  const providerSelection = ui.slice(providerSelectionStart, providerSelectionEnd);
  assert.match(providerSelection, /var entry = id \\? discoveredWalletProviders\\.find/);
  assert.match(providerSelection, /Select a detected wallet card before continuing/);
  assert.doesNotMatch(providerSelection, /discoveredWalletProviders\\.length === 1/);
  assert.match(ui, /select\\.value = ""/);
  assert.match(ui, /providerSelect\\.dispatchEvent\\(new Event\\("change", \\{ bubbles: true \\}\\)\\)/);
  assert.match(ui, /eip6963:requestProvider/);
  assert.match(ui, /AstroWallet/);
  assert.match(ui, /account-wallet-provider-grid/);
  assert.match(ui, /data-wallet-provider-id/);
  assert.match(ui, /entry\.info\.icon/);
  assert.ok(ui.includes("data:image\\/"));
  assert.match(ui, /\(\?:;base64\)\?/);
  assert.match(ui, /Coming soon/);
  assert.match(ui, /card\.setAttribute\("aria-pressed"/);
  assert.match(ui, /will not choose a provider or wallet address/);
  assert.match(ui, /wallet_requestPermissions/);
  assert.match(ui, /permissionError\.code !== -32601 && permissionError\.code !== 4200/);
  assert.match(ui, /provider\.request\(\{ method: "eth_accounts" \}\)/);
  assert.match(ui, /provider\.request\(\{ method: "eth_requestAccounts" \}\)/);
  assert.match(ui, /Choose the exact wallet address for this AstroCrown account/);
  assert.match(ui, /Confirm that this is the wallet address you want as your AstroCrown primary identity/);
  assert.match(ui, /accountField.hidden = false/);
  assert.doesNotMatch(ui, /accounts\[0\]/);
  assert.match(ui, /Create account with wallet/);
  assert.doesNotMatch(ui, /Existing legacy passkey test accounts|Continue with legacy passkey|Recover a legacy passkey account|passkey authentication/i);
});

test("server stores both versioned consent acknowledgements and does not retain passkey authentication", async () => {
  const worker = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /walletLossAcknowledged !== true/);
  assert.match(worker, /walletLossNoticeVersion !== WALLET_LOSS_NOTICE_VERSION/);
  assert.match(worker, /termsAccepted !== true/);
  assert.match(worker, /termsVersion !== TERMS_VERSION/);
  assert.match(worker, /wallet_loss_notice_version/);
  assert.match(worker, /wallet_loss_accepted_at/);
  assert.match(worker, /transactionAuthorized: false/);
  assert.doesNotMatch(worker, /auth_passkeys|auth_recovery_keys|authenticated_credential_id|generateRegistrationOptions|\/api\/passkeys\//);
  const migration = await readFile(
    new URL("../migrations/0007_wallet-only-account-and-consent.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /ALTER TABLE auth_accounts ADD COLUMN wallet_loss_notice_version/);
  assert.match(migration, /ALTER TABLE auth_accounts ADD COLUMN wallet_loss_accepted_at/);
  assert.match(migration, /DROP TABLE IF EXISTS auth_passkeys/);
  assert.match(migration, /DROP TABLE IF EXISTS auth_recovery_keys/);
  assert.match(migration, /auth_admin_governance_audit/);
});

test("Genesis profile routes require the same authenticated AstroCrown primary-wallet account", async () => {
  const worker = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  const genesis = await readFile(new URL("../src/genesis.js", import.meta.url), "utf8");
  assert.match(worker, /handleGenesisWalletApi\(request, env, config, account && primaryWallet/);
  assert.match(genesis, /handleGenesisWalletApi\(request, env, config, accountIdentity = null\)/);
  assert.match(genesis, /identityId = accountIdentity\.accountId/);
  assert.doesNotMatch(genesis, /genesis_wallet_sessions|requestCookie|\/api\/genesis\/identity\//);
});


test("Genesis programme profile is uniquely linked to the same AstroCrown account ID", async () => {
  const genesis = await readFile(new URL("../src/genesis.js", import.meta.url), "utf8");
  const migration = await readFile(
    new URL("../migrations/supporters/0007_genesis_astro_account_binding.sql", import.meta.url),
    "utf8",
  );
  assert.match(genesis, /identityId = accountIdentity\.accountId/);
  assert.match(genesis, /astro_account_id/);
  assert.match(genesis, /existing\.astro_account_id !== accountIdentity\.accountId/);
  assert.match(genesis, /identityId, accountIdentity\.accountId/);
  assert.match(genesis, /Genesis profile.*already bound to another AstroCrown account/);
  assert.match(migration, /ADD COLUMN astro_account_id TEXT/);
  assert.match(migration, /UNIQUE INDEX IF NOT EXISTS genesis_wallet_identities_astro_account_idx/);
  assert.doesNotMatch(genesis, /genesis_wallet_sessions|acrown_genesis_wallet|\/api\/genesis\/identity\//);
});

test("wallet-only account cleanup preserves immutable governance and administrator wallet evidence", async () => {
  const migration = await readFile(
    new URL("../migrations/0007_wallet-only-account-and-consent.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /auth_admin_governance_audit/);
  assert.match(migration, /auth_admin_wallet_audit/);
  assert.match(migration, /granted_by_account_id=auth_accounts\.account_id/);
  assert.match(migration, /p\.granted_by_account_id=auth_accounts\.account_id/);
  assert.match(migration, /DROP TABLE IF EXISTS auth_passkeys/);
  assert.match(migration, /DROP TABLE IF EXISTS auth_recovery_keys/);
  assert.match(migration, /DROP COLUMN authenticated_credential_id/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { toBytes } from "viem";
import {
  validateTreasuryAddressInput,
  generateTreasuryConfigSql,
} from "../scripts/prepare-genesis-treasuries.mjs";

function base58Encode(bytes) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let number = BigInt("0x" + Buffer.from(bytes).toString("hex"));
  let encoded = "";
  while (number > 0n) {
    const remainder = Number(number % 58n);
    encoded = alphabet[remainder] + encoded;
    number /= 58n;
  }
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;
  return "1".repeat(zeros) + (encoded || (zeros === 0 ? "1" : ""));
}

function tronAddressFromEvm(address) {
  const payload = new Uint8Array([0x41, ...toBytes(address)]);
  const first = createHash("sha256").update(payload).digest();
  const checksum = createHash("sha256").update(first).digest().subarray(0, 4);
  return base58Encode(new Uint8Array([...payload, ...checksum]));
}

async function validInput() {
  return {
    ethereum: "0x0000000000000000000000000000000000000001",
    tron: tronAddressFromEvm(privateKeyToAccount("0x" + "0".repeat(63) + "2").address),
    solana: "So11111111111111111111111111111111111111112",
  };
}

test("Treasury onboarding requires exactly three network-specific public addresses", async () => {
  const validated = await validateTreasuryAddressInput(await validInput());
  assert.deepEqual(Object.keys(validated), ["ethereum", "tron", "solana"]);
  assert.equal(validated.ethereum.networkIdentifier, "eip155:1");
  assert.equal(validated.tron.networkIdentifier, "tron:mainnet");
  assert.equal(validated.solana.networkIdentifier, "solana:mainnet");
  assert.ok(Object.values(validated).every((item) => item.tokenDecimals === 6));
});

test("Treasury onboarding rejects missing, extra and malformed receiving addresses", async () => {
  const input = await validInput();
  await assert.rejects(() => validateTreasuryAddressInput({ ethereum: input.ethereum, tron: input.tron }));
  await assert.rejects(() => validateTreasuryAddressInput({ ...input, bitcoin: "bc1example" }));
  await assert.rejects(() => validateTreasuryAddressInput({ ...input, ethereum: "0xnot-an-address" }));
  await assert.rejects(() => validateTreasuryAddressInput({ ...input, tron: "TInvalidAddress" }));
  await assert.rejects(() => validateTreasuryAddressInput({ ...input, solana: "NotARealSolanaAddress" }));
});

test("Generated D1 SQL stages the three addresses and explicitly keeps all networks disabled", async () => {
  const validated = await validateTreasuryAddressInput(await validInput());
  const sql = generateTreasuryConfigSql(validated);
  assert.equal((sql.match(/UPDATE supporter_network_config SET/g) || []).length, 3);
  assert.match(sql, /enabled=0/);
  assert.match(sql, /decimals_verified_at=NULL/);
  assert.match(sql, /config_version=NULL/);
  assert.doesNotMatch(sql, /enabled=1/);
  assert.match(sql, /eip155:1/);
  assert.match(sql, /tron:mainnet/);
  assert.match(sql, /solana:mainnet/);
  assert.match(sql, /STAGED_FORMAT_CHECK_ONLY/);
});

test("Generated D1 SQL refuses a modified token allowlist", async () => {
  const validated = await validateTreasuryAddressInput(await validInput());
  validated.ethereum.tokenIdentifier = "0xmalicious";
  assert.throws(() => generateTreasuryConfigSql(validated), /canonical USD₮ allowlist/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDisplayName, randomDisplayName, explorerUrl, createMessage } from "../src/genesis.js";

test("display names normalize whitespace and reserve case-insensitive identity", () => {
  const normalized = normalizeDisplayName("  Silver   Comet  ");
  assert.equal(normalized.name, "Silver Comet");
  assert.equal(normalized.normalized, "silver comet");
});

test("display names use Unicode compatibility normalization before validation", () => {
  const normalized = normalizeDisplayName("Ａｍｂｅｒ  Voyager");
  assert.equal(normalized.name, "Amber Voyager");
  assert.equal(normalized.normalized, "amber voyager");
});

test("reserved and unsafe display names are rejected", () => {
  for (const name of ["Genesis", "Admin", "Space Empire", "AB", "name<script>", "Étoile"]) {
    assert.throws(() => normalizeDisplayName(name));
  }
});

test("random public display names satisfy the allowed grammar", () => {
  const name = normalizeDisplayName(randomDisplayName());
  assert.match(name.name, /^[A-Za-z0-9][A-Za-z0-9 _-]{2,27}$/);
  assert.match(name.normalized, /^[a-z0-9][a-z0-9 _-]{2,27}$/);
});

test("explorer links are generated only from fixed network origins and valid transaction shapes", () => {
  const eth = "0x" + "a".repeat(64);
  const tron = "b".repeat(64);
  const solana = "1".repeat(64);
  assert.equal(explorerUrl("ethereum", eth), "https://etherscan.io/tx/" + eth);
  assert.equal(explorerUrl("tron", tron), "https://tronscan.org/#/transaction/" + tron);
  assert.equal(explorerUrl("solana", solana), "https://solscan.io/tx/" + solana);
  assert.equal(explorerUrl("ethereum", "https://evil.example/"), null);
  assert.equal(explorerUrl("bitcoin", eth), null);
});

test("wallet proof messages bind domain, chain, address, purpose and irrecoverable wallet-loss rule", () => {
  const message = createMessage({
    origin: "https://astrocrown.example",
    network: "ethereum",
    address: "0x1111111111111111111111111111111111111111",
    purpose: "IDENTIFY",
    challengeId: "gch_abcdefghijklmnopqrstuvwx",
    nonce: "nonce-abcdefghijklmnopqrstuvwx",
    issuedAt: "2026-11-18T00:00:00.000Z",
    expiresAt: "2026-11-18T00:10:00.000Z"
  });
  assert.match(message, /Domain: astrocrown\.example/);
  assert.match(message, /Network: ethereum:mainnet/);
  assert.match(message, /Purpose: IDENTIFY/);
  assert.match(message, /Nonce: nonce-/);
  assert.match(message, /primary wallet is the sole identity and recovery anchor/);
  assert.match(message, /does not authorize a transaction/);
});

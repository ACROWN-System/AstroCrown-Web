import assert from "node:assert/strict";
import test from "node:test";
import {
  GENESIS_WALLET_CANDIDATES,
  identifyWalletCandidate,
  encodeEvmPersonalSignMessage,
  walletDisplayName,
  discoverDirectEvmProviders,
  discoverDirectTronProviders,
  hasTronMessageSigner,
  createSolanaProviderAdapter,
  discoverDirectSolanaWallets,
  isSolanaMainnet,
} from "../../../../preview/supporters/wallet-provider-adapters.mjs";

const MAINNET_HASH = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
const publicKey = "11111111111111111111111111111111";
const signature = new Uint8Array(64).fill(7);

test("the Genesis adapter registry covers all six wallet candidates", () => {
  assert.deepEqual([...GENESIS_WALLET_CANDIDATES].sort(), [
    "bitget-wallet", "coin98", "metamask", "okx-wallet", "tokenpocket", "trust-wallet",
  ]);
  assert.equal(walletDisplayName("coin98"), "Coin98");
});

test("EVM personal_sign encodes the exact UTF-8 message bytes as 0x-prefixed hex", () => {
  const text = "AstroCrown Genesis proof — wallet identity";
  const expected = "0x" + Array.from(new TextEncoder().encode(text), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  assert.equal(encodeEvmPersonalSignMessage(text), expected);
  assert.equal(encodeEvmPersonalSignMessage(""), "0x");
});

test("EIP-6963 metadata and provider flags identify all six EVM wallet candidates", () => {
  const fixtures = [
    [{ name: "MetaMask", rdns: "io.metamask" }, {} , "metamask"],
    [{ name: "Trust Wallet", rdns: "com.trustwallet.app" }, {}, "trust-wallet"],
    [{ name: "OKX Wallet", rdns: "com.okx.wallet" }, {}, "okx-wallet"],
    [{ name: "Bitget Wallet", rdns: "com.bitget.web3" }, {}, "bitget-wallet"],
    [{ name: "TokenPocket", rdns: "io.tokenpocket" }, {}, "tokenpocket"],
    [{ name: "Coin98", rdns: "com.coin98" }, {}, "coin98"],
  ];
  for (const [info, provider, expected] of fixtures) {
    assert.equal(identifyWalletCandidate(info, provider), expected);
  }
  assert.equal(identifyWalletCandidate({}, { isMetaMask: true }), "metamask");
  assert.equal(identifyWalletCandidate({}, {}), null);
});

test("OKX EVM provider can use its documented top-level EIP-1193 namespace", () => {
  const provider = { request: async () => [] };
  const entries = discoverDirectEvmProviders({ okxwallet: provider });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].walletId, "okx-wallet");
  assert.equal(entries[0].provider, provider);
});

test("direct EVM provider namespaces are discovered without requiring a generic window.ethereum alias", () => {
  const providers = {
    request: async () => [],
  };
  const win = {
    bitkeep: { ethereum: providers },
    tokenpocket: { ethereum: { request: async () => [] } },
    coin98: { provider: { request: async () => [] } },
    okxwallet: { ethereum: { request: async () => [] } },
  };
  const entries = discoverDirectEvmProviders(win);
  assert.deepEqual(entries.map((entry) => entry.walletId).sort(), [
    "bitget-wallet", "coin98", "okx-wallet", "tokenpocket",
  ]);
  assert.equal(new Set(entries.map((entry) => entry.provider)).size, 4);
});

test("documented TRON direct providers are kept distinct and use their documented connect methods", () => {
  const bitget = { request: async () => ({ code: 200 }) };
  const tokenpocket = { request: async () => ["T" + "1".repeat(33)] };
  const okx = { request: async () => ({ code: 200 }) };
  const tronWeb = { trx: { signMessageV2: async () => "0x" + "1".repeat(130) } };
  const win = {
    bitkeep: { tronLink: bitget, tronWeb },
    tokenpocket: { tron: tokenpocket, tronWeb },
    okxwallet: { tronLink: okx },
    coin98: { provider: { request: async () => [] }, sol: { request: async () => [] } },
  };
  const entries = discoverDirectTronProviders(win);
  assert.deepEqual(entries.map((entry) => entry.walletId).sort(), [
    "bitget-wallet", "okx-wallet", "tokenpocket",
  ]);
  assert.equal(entries.find((entry) => entry.walletId === "bitget-wallet").connectMethod, "tron_requestAccounts");
  assert.equal(entries.find((entry) => entry.walletId === "tokenpocket").connectMethod, "eth_requestAccounts");
  assert.equal(entries.find((entry) => entry.walletId === "okx-wallet").connectMethod, "tron_requestAccounts");
  assert.equal(entries.find((entry) => entry.walletId === "bitget-wallet").tronWeb, tronWeb);
  assert.equal(entries.some((entry) => entry.walletId === "coin98"), false);
});

test("Genesis accepts only TIP-191-compatible signMessageV2 on TRON; OKX trx.sign is not silently substituted", () => {
  assert.equal(hasTronMessageSigner({ trx: { signMessageV2: async () => "0x" + "1".repeat(130) } }), true);
  assert.equal(hasTronMessageSigner({ trx: { sign: async () => "0x" + "1".repeat(130) } }), false);
  assert.equal(hasTronMessageSigner(null), false);
});

test("Bitget Solana adapter connects Wallet-Standard accounts and returns a verified 64-byte signature", async () => {
  const provider = {
    connect: async () => ({ accounts: [{ address: publicKey, chains: ["solana:mainnet"] }] }),
    getAccount: async () => publicKey,
    signMessage: async () => [{ signature, publicKey }],
  };
  const wallet = createSolanaProviderAdapter({ walletId: "bitget-wallet", name: "Bitget Wallet", provider });
  const connected = await wallet.features["standard:connect"].connect();
  assert.equal(connected.accounts[0].address, publicKey);
  assert.equal(isSolanaMainnet(connected.accounts[0]), true);
  const signed = await wallet.features["solana:signMessage"].signMessage({
    account: connected.accounts[0], message: new TextEncoder().encode("Genesis proof"),
  });
  assert.equal(signed[0].signature.length, 64);
});

test("OKX Solana adapter calls only connect, getGenesisHash and signMessage", async () => {
  const calls = [];
  const provider = {
    connect: async () => { calls.push("connect"); return { publicKey: { toString: () => publicKey } }; },
    getGenesisHash: async () => { calls.push("getGenesisHash"); return MAINNET_HASH; },
    signMessage: async (message, encoding) => {
      calls.push("signMessage:" + encoding);
      assert.equal(new TextDecoder().decode(message), "Genesis proof");
      return { signature, publicKey };
    },
    publicKey,
  };
  const wallet = createSolanaProviderAdapter({ walletId: "okx-wallet", name: "OKX Wallet", provider });
  const connected = await wallet.features["standard:connect"].connect();
  assert.deepEqual(connected.accounts[0].chains, ["solana:mainnet"]);
  const signed = await wallet.features["solana:signMessage"].signMessage({
    account: connected.accounts[0], message: new TextEncoder().encode("Genesis proof"),
  });
  assert.equal(signed[0].signature.length, 64);
  assert.deepEqual(calls, ["connect", "getGenesisHash", "signMessage:utf8"]);
});

test("Coin98 uses sol_requestAccounts and sol_signMessage, never sol_sign or a transaction method", async () => {
  const calls = [];
  const provider = {
    request: async (request) => {
      calls.push(request.method);
      if (request.method === "sol_requestAccounts") return [publicKey];
      if (request.method === "sol_accounts") return [publicKey];
      if (request.method === "getGenesisHash") return MAINNET_HASH;
      if (request.method === "sol_signMessage") return { signature, publicKey };
      throw new Error("Unexpected Coin98 method: " + request.method);
    },
  };
  const wallet = createSolanaProviderAdapter({ walletId: "coin98", name: "Coin98", provider });
  const connected = await wallet.features["standard:connect"].connect();
  assert.equal(connected.accounts[0].address, publicKey);
  assert.equal(isSolanaMainnet(connected.accounts[0]), true);
  const signed = await wallet.features["solana:signMessage"].signMessage({
    account: connected.accounts[0], message: new TextEncoder().encode("Genesis proof"),
  });
  assert.equal(signed[0].signature.length, 64);
  assert.deepEqual(calls, ["sol_requestAccounts", "getGenesisHash", "sol_accounts", "sol_signMessage"]);
  assert.equal(calls.includes("sol_sign"), false);
});

test("Coin98 refuses to sign when its current account changed and rejects a signature returned for another public key", async () => {
  let signCalls = 0;
  const provider = {
    request: async ({ method }) => {
      if (method === "sol_requestAccounts") return [publicKey];
      if (method === "getGenesisHash") return MAINNET_HASH;
      if (method === "sol_accounts") return ["11111111111111111111111111111112"];
      if (method === "sol_signMessage") {
        signCalls += 1;
        return { signature, publicKey: "11111111111111111111111111111113" };
      }
      throw new Error("Unexpected Coin98 method: " + method);
    },
  };
  const wallet = createSolanaProviderAdapter({ walletId: "coin98", name: "Coin98", provider });
  const connected = await wallet.features["standard:connect"].connect();
  await assert.rejects(() => wallet.features["solana:signMessage"].signMessage({
    account: connected.accounts[0], message: new TextEncoder().encode("Genesis proof"),
  }), /active Solana account changed/);
  assert.equal(signCalls, 0);

  const stableProvider = {
    request: async ({ method }) => {
      if (method === "sol_requestAccounts" || method === "sol_accounts") return [publicKey];
      if (method === "getGenesisHash") return MAINNET_HASH;
      if (method === "sol_signMessage") return { signature, publicKey: "11111111111111111111111111111113" };
      throw new Error("Unexpected Coin98 method: " + method);
    },
  };
  const stableWallet = createSolanaProviderAdapter({ walletId: "coin98", name: "Coin98", provider: stableProvider });
  const stableAccount = (await stableWallet.features["standard:connect"].connect()).accounts[0];
  await assert.rejects(() => stableWallet.features["solana:signMessage"].signMessage({
    account: stableAccount, message: new TextEncoder().encode("Genesis proof"),
  }), /different Solana address/);
});

test("Solana provider can connect an address without a known cluster but must not qualify it as Mainnet", async () => {
  const wallet = createSolanaProviderAdapter({
    walletId: "bitget-wallet",
    name: "Bitget Wallet",
    provider: {
      connect: async () => ({ publicKey: { toString: () => publicKey } }),
      signMessage: async () => [{ signature, publicKey }],
    },
  });
  const connected = await wallet.features["standard:connect"].connect();
  assert.equal(connected.accounts[0].address, publicKey);
  assert.deepEqual(connected.accounts[0].chains, []);
  assert.equal(isSolanaMainnet(connected.accounts[0]), false);
});

test("TokenPocket mobile Solana and direct Bitget/OKX/Coin98 Solana providers are discovered independently", () => {
  const simple = {
    connect: async () => ({ publicKey: { toString: () => publicKey } }),
    signMessage: async () => ({ signature }),
  };
  const win = {
    bitkeep: { solana: { ...simple } },
    okxwallet: { solana: { ...simple } },
    coin98: { sol: { request: async ({ method }) => method === "sol_requestAccounts" ? [publicKey] : signature } },
    tokenpocket: {},
    solana: simple,
  };
  const adapters = discoverDirectSolanaWallets(win);
  assert.deepEqual(adapters.map((wallet) => wallet.genesisWalletId).sort(), [
    "bitget-wallet", "coin98", "okx-wallet", "tokenpocket",
  ]);
});

test("mainnet is never inferred from an absent or ambiguous Solana cluster", () => {
  assert.equal(isSolanaMainnet({ address: publicKey, chains: ["solana:mainnet"] }), true);
  assert.equal(isSolanaMainnet({ address: publicKey, chains: ["solana:mainnet-beta"] }), true);
  assert.equal(isSolanaMainnet({ address: publicKey, chains: ["solana:devnet"] }), false);
  assert.equal(isSolanaMainnet({ address: publicKey, chains: [] }), false);
  assert.equal(isSolanaMainnet({ address: publicKey }), false);
});

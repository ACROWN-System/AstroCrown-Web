const MAINNET_SOLANA_GENESIS_HASH = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export const GENESIS_WALLET_CANDIDATES = Object.freeze([
  "metamask", "trust-wallet", "okx-wallet",
  "bitget-wallet", "tokenpocket", "coin98",
]);

function objectAt(root, path) {
  return path.split(".").reduce((value, key) => value && value[key], root);
}

function uniqueEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    if (!entry || !entry.provider || typeof entry.provider !== "object" ||
        seen.has(entry.provider)) return false;
    seen.add(entry.provider);
    return true;
  });
}

export function identifyWalletCandidate(info = {}, provider = {}) {
  const name = String(info.name || "").toLowerCase();
  const rdns = String(info.rdns || "").toLowerCase();
  const hints = [
    name, rdns,
    provider.isMetaMask ? "metamask" : "",
    provider.isTrust || provider.isTrustWallet ? "trust wallet" : "",
    provider.isOkxWallet || provider.isOKXWallet ? "okx wallet" : "",
    provider.isBitKeep || provider.isBitgetWallet ? "bitget wallet" : "",
    provider.isTokenPocket || provider.isTokenpocket ? "tokenpocket" : "",
    provider.isCoin98 ? "coin98" : "",
  ].join(" ");
  if (/metamask|io\.metamask/.test(hints)) return "metamask";
  if (/trust wallet|trustwallet|trustwallet\.app/.test(hints)) return "trust-wallet";
  if (/okx|okex|com\.okex/.test(hints)) return "okx-wallet";
  if (/bitget|bitkeep|com\.bitget/.test(hints)) return "bitget-wallet";
  if (/tokenpocket|token pocket|io\.tokenpocket/.test(hints)) return "tokenpocket";
  if (/coin98|coin 98|coin98\.com/.test(hints)) return "coin98";
  return null;
}

const WALLET_NAMES = Object.freeze({
  metamask: "MetaMask",
  "trust-wallet": "Trust Wallet",
  "okx-wallet": "OKX Wallet",
  "bitget-wallet": "Bitget Wallet",
  tokenpocket: "TokenPocket",
  coin98: "Coin98",
});

export function encodeEvmPersonalSignMessage(message) {
  const bytes = new TextEncoder().encode(String(message));
  let hex = "";
  bytes.forEach((byte) => { hex += byte.toString(16).padStart(2, "0"); });
  return "0x" + hex;
}

export function walletDisplayName(walletId) {
  return WALLET_NAMES[walletId] || "Injected wallet";
}

export function discoverDirectEvmProviders(win) {
  if (!win) return [];
  const entries = [
    { walletId: "bitget-wallet", name: WALLET_NAMES["bitget-wallet"], provider: objectAt(win, "bitkeep.ethereum"), rdns: "com.bitget.web3" },
    { walletId: "tokenpocket", name: WALLET_NAMES.tokenpocket, provider: objectAt(win, "tokenpocket.ethereum"), rdns: "io.tokenpocket" },
    { walletId: "coin98", name: WALLET_NAMES.coin98, provider: objectAt(win, "coin98.provider"), rdns: "com.coin98" },
    { walletId: "okx-wallet", name: WALLET_NAMES["okx-wallet"], provider: objectAt(win, "okxwallet.ethereum") || (win.okxwallet && typeof win.okxwallet.request === "function" ? win.okxwallet : null), rdns: "com.okx.wallet" },
  ];
  return uniqueEntries(entries)
    .filter((entry) => typeof entry.provider.request === "function");
}

export function discoverDirectTronProviders(win) {
  if (!win) return [];
  const entries = [
    {
      walletId: "bitget-wallet", name: WALLET_NAMES["bitget-wallet"],
      provider: objectAt(win, "bitkeep.tronLink"),
      tronWeb: objectAt(win, "bitkeep.tronWeb"),
      connectMethod: "tron_requestAccounts",
    },
    {
      walletId: "tokenpocket", name: WALLET_NAMES.tokenpocket,
      provider: objectAt(win, "tokenpocket.tron"),
      tronWeb: objectAt(win, "tokenpocket.tronWeb"),
      connectMethod: "eth_requestAccounts",
    },
    {
      walletId: "okx-wallet", name: WALLET_NAMES["okx-wallet"],
      provider: objectAt(win, "okxwallet.tronLink"),
      tronWeb: objectAt(win, "okxwallet.tronLink.tronWeb"),
      connectMethod: "tron_requestAccounts",
    },
  ];
  // Generic TIP-6963/TronLink discovery remains available for providers
  // whose brand is established by the announcement metadata.
  if (win.tron) entries.push({
    walletId: identifyWalletCandidate({ name: win.tron.name || (win.tron.isTronLink ? "TronLink" : "") }, win.tron),
    name: win.tron.isTronLink ? "TronLink" : "TRON wallet",
    provider: win.tron,
    tronWeb: win.tron.tronWeb,
    connectMethod: "eth_requestAccounts",
  });
  return uniqueEntries(entries).filter((entry) =>
    entry.provider && typeof entry.provider.request === "function"
  );
}

export function hasTronMessageSigner(tronWeb) {
  return Boolean(tronWeb && tronWeb.trx &&
    typeof tronWeb.trx.signMessageV2 === "function");
}

function decodeBase58(value) {
  let number = 0n;
  for (const character of value) {
    const digit = BASE58.indexOf(character);
    if (digit < 0) throw new Error("Invalid base58 signature.");
    number = number * 58n + BigInt(digit);
  }
  let hex = number.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const decoded = [];
  for (let i = 0; i < hex.length; i += 2) decoded.push(parseInt(hex.slice(i, i + 2), 16));
  let zeros = 0;
  while (zeros < value.length && value[zeros] === "1") zeros += 1;
  return new Uint8Array([...new Array(zeros).fill(0), ...decoded]);
}

function signatureBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (Array.isArray(value) && value.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    return new Uint8Array(value);
  }
  if (typeof value === "string") {
    if (/^0x[0-9a-f]{128}$/i.test(value)) {
      return new Uint8Array(value.slice(2).match(/.{2}/g).map((part) => parseInt(part, 16)));
    }
    try {
      const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
      const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
      const decoded = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      if (decoded.length === 64) return decoded;
    } catch (_) {}
    try {
      const decoded = decodeBase58(value);
      if (decoded.length === 64) return decoded;
    } catch (_) {}
  }
  return null;
}

export function normalizeSolanaSignature(result) {
  const candidates = [
    result,
    result && result.signature,
    result && result.data,
    result && result.result,
    result && result.result && result.result.signature,
    result && result.data && result.data.signature,
    Array.isArray(result) && result[0],
    Array.isArray(result) && result[0] && result[0].signature,
  ];
  for (const candidate of candidates) {
    const bytes = signatureBytes(candidate);
    if (bytes && bytes.length === 64) return bytes;
  }
  throw new Error("The wallet did not return a 64-byte Ed25519 message signature in a supported encoding.");
}

function explicitSolanaChains(provider, account) {
  if (account && Array.isArray(account.chains)) return account.chains;
  const network = String(
    (provider && (provider.network || provider.cluster || provider.chain)) || ""
  ).toLowerCase();
  if (network.includes("mainnet")) return ["solana:mainnet"];
  if (network.includes("devnet")) return ["solana:devnet"];
  if (network.includes("testnet")) return ["solana:testnet"];
  return [];
}

async function providerGenesisHash(provider, walletId) {
  try {
    if (provider && typeof provider.getGenesisHash === "function") {
      return await provider.getGenesisHash();
    }
    if (provider && typeof provider.request === "function") {
      return await provider.request({ method: "getGenesisHash" });
    }
  } catch (_) {}
  return null;
}

function chainsFromGenesisHash(hash) {
  if (hash === MAINNET_SOLANA_GENESIS_HASH) return ["solana:mainnet"];
  if (hash === "EtWTRABZaYq6iMfeYKouRu166VU2xqa1") return ["solana:devnet"];
  if (hash === "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY") return ["solana:testnet"];
  return [];
}

function accountAddress(value) {
  if (typeof value === "string") return value;
  if (value && typeof value.address === "string") return value.address;
  if (value && value.publicKey && typeof value.publicKey.toString === "function") return value.publicKey.toString();
  if (value && value.publicKey && typeof value.publicKey === "string") return value.publicKey;
  return "";
}

function publicKeyString(value) {
  if (typeof value === "string") return value;
  if (value && typeof value.toBase58 === "function") return value.toBase58();
  if (value && typeof value.toString === "function") return value.toString();
  return "";
}

function signatureSigner(result) {
  const candidates = [
    result,
    result && result[0],
    result && result.result,
    result && result.data,
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const key = publicKeyString(candidate.publicKey || candidate.address);
    if (key) return key;
  }
  return "";
}

async function currentSolanaProviderAddress(provider, walletId) {
  if (provider && typeof provider.getAccount === "function") {
    const account = await provider.getAccount();
    const address = accountAddress(account);
    if (address) return address;
  }
  if (provider && provider.publicKey) {
    const address = publicKeyString(provider.publicKey);
    if (address) return address;
  }
  if (walletId === "coin98" && provider && typeof provider.request === "function") {
    const accounts = await provider.request({ method: "sol_accounts" });
    if (Array.isArray(accounts) && typeof accounts[0] === "string") return accounts[0];
  }
  return "";
}

export function createSolanaProviderAdapter({ walletId, name, provider }) {
  if (!provider || typeof provider !== "object") return null;
  const connect = async () => {
    let result;
    if (walletId === "coin98") {
      if (typeof provider.request !== "function") throw new Error("Coin98 Solana provider does not expose request().");
      result = await provider.request({ method: "sol_requestAccounts" });
    } else {
      if (typeof provider.connect !== "function") throw new Error(name + " Solana provider does not expose connect().");
      result = await provider.connect();
    }
    const values = Array.isArray(result) ? result
      : result && Array.isArray(result.accounts) ? result.accounts
        : [result && (result.publicKey || result.address) ? result : null];
    const rawAccount = values.find((item) => accountAddress(item));
    const address = accountAddress(rawAccount);
    if (!address) throw new Error(name + " did not return a Solana account address.");
    let chains = explicitSolanaChains(provider, rawAccount);
    if (!chains.length) chains = chainsFromGenesisHash(await providerGenesisHash(provider, walletId));
    return { accounts: [{ address, chains, features: ["solana:signMessage"] }] };
  };

  const signMessage = async ({ account, message }) => {
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    const expectedAddress = accountAddress(account);
    if (!expectedAddress) throw new Error(name + " message signing requires the exact connected Solana account.");
    const currentAddress = await currentSolanaProviderAddress(provider, walletId);
    if (currentAddress && currentAddress !== expectedAddress) {
      throw new Error(name + " active Solana account changed after connection. Reconnect before signing the Genesis challenge.");
    }
    let result;
    if (walletId === "coin98") {
      result = await provider.request({ method: "sol_signMessage", params: [text] });
    } else if (walletId === "okx-wallet") {
      result = await provider.signMessage(new TextEncoder().encode(text), "utf8");
    } else {
      result = await provider.signMessage(new TextEncoder().encode(text));
    }
    const signedBy = signatureSigner(result);
    if (signedBy && signedBy !== expectedAddress) {
      throw new Error(name + " signed the challenge with a different Solana address than the connected account.");
    }
    return [{ signature: normalizeSolanaSignature(result) }];
  };

  return {
    name,
    genesisWalletId: walletId,
    provider,
    features: {
      "standard:connect": { connect },
      "solana:signMessage": { signMessage },
      "standard:disconnect": {
        disconnect: async () => {
          if (walletId === "coin98" && typeof provider.disconnect === "function") await provider.disconnect();
          else if (typeof provider.disconnect === "function") await provider.disconnect();
        },
      },
    },
  };
}

export function discoverDirectSolanaWallets(win) {
  if (!win) return [];
  const entries = [
    { walletId: "bitget-wallet", name: WALLET_NAMES["bitget-wallet"], provider: objectAt(win, "bitkeep.solana") },
    { walletId: "okx-wallet", name: WALLET_NAMES["okx-wallet"], provider: objectAt(win, "okxwallet.solana") },
    { walletId: "coin98", name: WALLET_NAMES.coin98, provider: objectAt(win, "coin98.sol") },
    { walletId: "tokenpocket", name: WALLET_NAMES.tokenpocket,
      provider: objectAt(win, "tokenpocket.solana") || (win.tokenpocket ? win.solana : null) },
  ];
  const unique = uniqueEntries(entries).filter((entry) =>
    entry.provider && (
      entry.walletId === "coin98"
        ? typeof entry.provider.request === "function"
        : typeof entry.provider.connect === "function" && typeof entry.provider.signMessage === "function"
    )
  );
  return unique.map((entry) => createSolanaProviderAdapter(entry)).filter(Boolean);
}

export function isSolanaMainnet(account) {
  return Boolean(account && Array.isArray(account.chains) &&
    account.chains.some((chain) => chain === "solana:mainnet" || chain === "solana:mainnet-beta"));
}

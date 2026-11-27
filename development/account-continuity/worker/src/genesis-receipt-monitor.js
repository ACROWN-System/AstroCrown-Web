import { MAINNET_USDT_CONFIG } from "../../../supporter-programme/shared/mainnet-config.mjs";
import {
  GENESIS_USDT_ASSETS,
  parseEthereumUsdtTransferEvidence,
  parseTronUsdtTransferEvidence,
  parseSolanaUsdtTransferEvidence,
  reconcileGenesisRpcEvidence,
} from "./genesis-payment-evidence.js";

const TRANSFER_TOPIC = GENESIS_USDT_ASSETS.ethereum.transferTopic.toLowerCase();
const SOLANA_PAGE_SIZE = 1000;
const ETHEREUM_BLOCK_BATCH = 500;
const TRON_BLOCK_BATCH = 5;
const USDT_SCALE = 1_000_000n;
const NETWORK_PRESENTATION = Object.freeze({
  ethereum: Object.freeze({ label: "USDT · Ethereum (ERC-20)", standard: "ERC-20" }),
  tron: Object.freeze({ label: "USDT · TRON (TRC-20)", standard: "TRC-20" }),
  solana: Object.freeze({ label: "USDT · Solana (SPL)", standard: "SPL" }),
});

function fail(message) {
  throw new Error("Genesis treasury receipt monitor: " + message);
}

function exactPositiveInteger(value, label) {
  let result;
  try {
    if (typeof value === "bigint") result = value;
    else if (typeof value === "number" && Number.isSafeInteger(value)) result = BigInt(value);
    else if (typeof value === "string" && /^(?:0x[0-9a-f]+|[0-9]+)$/i.test(value)) result = BigInt(value);
    else fail(label + " is not an exact integer.");
  } catch {
    fail(label + " is not an exact integer.");
  }
  if (result <= 0n) fail(label + " must be positive.");
  return result;
}

function quantity(value, label) {
  try {
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
    if (typeof value === "string" && /^(?:0x[0-9a-f]+|[0-9]+)$/i.test(value)) return BigInt(value);
  } catch {}
  fail(label + " is not a valid chain quantity.");
}

function toSafeNumber(value, label) {
  const parsed = quantity(value, label);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) fail(label + " exceeds the supported safe integer range.");
  return Number(parsed);
}

function hexQuantity(value) {
  return "0x" + BigInt(value).toString(16);
}

function formatUsdtAmount(baseUnits) {
  const value = exactPositiveInteger(baseUnits, "USDT base-unit amount");
  const whole = value / USDT_SCALE;
  const fraction = (value % USDT_SCALE).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? whole.toString() + "." + fraction : whole.toString();
}

function normalizeRpcUrl(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) fail(label + " URL is not configured.");
  let parsed;
  try { parsed = new URL(value.trim()); } catch { fail(label + " URL is invalid."); }
  if (
    parsed.protocol !== "https:" || parsed.username || parsed.password ||
    parsed.hash || parsed.origin === "null"
  ) fail(label + " must be an HTTPS endpoint without embedded user credentials or a fragment.");
  return parsed;
}

export function prepareGenesisRpcPair(env, network) {
  if (!Object.prototype.hasOwnProperty.call(GENESIS_USDT_ASSETS, network)) fail("Unsupported network configuration.");
  const prefix = "GENESIS_" + network.toUpperCase() + "_RPC_";
  const sources = ["A", "B"].map((slot) => {
    const id = slot;
    const url = normalizeRpcUrl(env[prefix + id + "_URL"], network + " RPC " + id);
    const operatorId = String(env[prefix + id + "_OPERATOR_ID"] || "").trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,63}$/.test(operatorId)) {
      fail(network + " RPC " + id + " must have a stable configured operator identifier.");
    }
    return Object.freeze({ id: slot.toLowerCase(), url: url.toString(), origin: url.origin, operatorId });
  });
  if (sources[0].origin === sources[1].origin || sources[0].operatorId === sources[1].operatorId) {
    fail(network + " RPC sources must use different HTTPS origins and independently identified operators.");
  }
  return Object.freeze(sources);
}

async function postJson(url, payload, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: "error",
    });
    if (!response.ok) fail(label + " returned HTTP " + response.status + ".");
    let data;
    try { data = await response.json(); } catch { fail(label + " returned invalid JSON."); }
    return data;
  } catch (error) {
    if (String(error && error.message || "").startsWith("Genesis treasury receipt monitor:")) throw error;
    fail(label + " could not be reached or did not return a valid response.");
  } finally {
    clearTimeout(timeout);
  }
}

async function jsonRpc(source, method, params = []) {
  const payload = await postJson(source.url, {
    jsonrpc: "2.0",
    id: 1,
    method,
    params,
  }, source.id + " " + method);
  if (payload && payload.error) fail(source.id + " " + method + " reported an RPC error.");
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, "result")) {
    fail(source.id + " " + method + " omitted its result.");
  }
  return payload.result;
}

async function tronRpc(source, method, body = {}) {
  const root = source.url.replace(/\/+$/, "");
  const payload = await postJson(root + "/walletsolidity/" + method, body, source.id + " TRON SolidityNode " + method);
  if (!payload || payload.Error || payload.error) fail(source.id + " TRON SolidityNode " + method + " reported an error.");
  return payload;
}

function explorerUrl(network, transactionHash) {
  if (network === "ethereum" && /^0x[0-9a-f]{64}$/i.test(transactionHash)) {
    return "https://etherscan.io/tx/" + transactionHash;
  }
  if (network === "tron" && /^[0-9a-f]{64}$/i.test(transactionHash)) {
    return "https://tronscan.org/#/transaction/" + transactionHash;
  }
  if (network === "solana" && /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(transactionHash)) {
    return "https://solscan.io/tx/" + transactionHash;
  }
  return null;
}

function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return "gtr_" + btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(value) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function networkAddressKey(network, address) {
  return network === "ethereum" ? String(address).toLowerCase() : String(address);
}

async function attributeSender(db, network, senderAddress) {
  const normalized = networkAddressKey(network, senderAddress);
  const rows = await db.prepare(
    "SELECT w.wallet_address_id,w.identity_id FROM genesis_wallet_addresses w " +
    "JOIN genesis_wallet_identities i ON i.identity_id=w.identity_id " +
    "WHERE w.network=? AND w.address_normalized=? AND w.wallet_role IN ('PRIMARY','PAYMENT','PAYMENT_AND_DELIVERY') " +
    "AND i.identity_status='ACTIVE' LIMIT 2"
  ).bind(network, normalized).all();
  const matches = rows.results || [];
  if (matches.length === 1) {
    return {
      status: "MATCHED",
      identityId: matches[0].identity_id,
      sourceWalletAddressId: matches[0].wallet_address_id,
    };
  }
  return {
    status: matches.length > 1 ? "AMBIGUOUS" : "UNMATCHED",
    identityId: null,
    sourceWalletAddressId: null,
  };
}

async function persistVerifiedReceipt(db, reconciled) {
  if (!reconciled || reconciled.creditApplied !== false ||
      reconciled.status !== "RPC_EVIDENCE_AGREES_FINALIZED_TRANSFER") {
    fail("Only non-crediting, reconciled chain evidence can be recorded.");
  }
  const evidence = reconciled.evidence;
  const network = evidence.network;
  if (!Object.prototype.hasOwnProperty.call(NETWORK_PRESENTATION, network)) fail("Receipt has an unsupported network.");
  const attribution = await attributeSender(db, network, evidence.senderAddress);
  const evidenceJson = JSON.stringify({
    evidence,
    verification: {
      method: "TWO_INDEPENDENT_RPC_OPERATORS",
      providers: reconciled.providerAgreement.providerIds,
      operators: reconciled.providerAgreement.operatorIds,
    },
    creditApplied: false,
  });
  const now = Math.floor(Date.now() / 1000);
  const digest = await sha256Hex(evidenceJson);
  await db.prepare(
    "INSERT OR IGNORE INTO genesis_treasury_receipts(" +
    "receipt_id,network,asset_identifier,amount_base_units,amount_display,sender_address,treasury_address," +
    "transaction_hash,transfer_index,inclusion_reference,finality_status,verification_method," +
    "rpc_provider_ids_json,rpc_operator_ids_json,evidence_digest,evidence_json,attribution_status," +
    "identity_id,source_wallet_address_id,public_visible,observed_at,verified_at" +
    ") VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    randomId(),
    network,
    evidence.assetIdentifier,
    evidence.amountBaseUnits,
    formatUsdtAmount(evidence.amountBaseUnits),
    evidence.senderAddress,
    evidence.treasuryAddress,
    evidence.transactionId,
    evidence.transferIndex,
    JSON.stringify(evidence.inclusion),
    evidence.finalityStatus,
    "TWO_INDEPENDENT_RPC_OPERATORS",
    JSON.stringify(reconciled.providerAgreement.providerIds),
    JSON.stringify(reconciled.providerAgreement.operatorIds),
    digest,
    evidenceJson,
    attribution.status,
    attribution.identityId,
    attribution.sourceWalletAddressId,
    1,
    now,
    now,
  ).run();
}

async function getCursor(db, network, scopeKey) {
  return db.prepare(
    "SELECT network,scope_key,cursor_value,pending_before,pending_until,pending_latest " +
    "FROM genesis_treasury_receipt_cursors WHERE network=? AND scope_key=?"
  ).bind(network, scopeKey).first();
}

async function setCursor(db, network, scopeKey, value, pendingBefore = null, pendingUntil = null, pendingLatest = null) {
  await db.prepare(
    "INSERT INTO genesis_treasury_receipt_cursors(network,scope_key,cursor_value,pending_before,pending_until,pending_latest,updated_at) " +
    "VALUES(?,?,?,?,?,?,?) ON CONFLICT(network,scope_key) DO UPDATE SET " +
    "cursor_value=excluded.cursor_value,pending_before=excluded.pending_before," +
    "pending_until=excluded.pending_until,pending_latest=excluded.pending_latest,updated_at=excluded.updated_at"
  ).bind(network, scopeKey, String(value), pendingBefore, pendingUntil, pendingLatest, Math.floor(Date.now() / 1000)).run();
}

function topicAddress(address) {
  const hex = String(address).replace(/^0x/i, "").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(hex)) fail("Configured Ethereum receiving address is invalid.");
  return "0x" + "0".repeat(24) + hex;
}

function ethereumLogIdentity(log) {
  return {
    address: String(log.address || "").toLowerCase(),
    topics: Array.isArray(log.topics) ? log.topics.map((topic) => String(topic).toLowerCase()) : [],
    data: String(log.data || "").toLowerCase(),
    transactionHash: String(log.transactionHash || "").toLowerCase(),
    blockNumber: String(log.blockNumber || "").toLowerCase(),
    blockHash: String(log.blockHash || "").toLowerCase(),
    logIndex: String(log.logIndex || "").toLowerCase(),
    removed: Boolean(log.removed),
  };
}

async function ethereumMetadata(source) {
  const chainId = await jsonRpc(source, "eth_chainId");
  if (quantity(chainId, "Ethereum chain id") !== 1n) fail(source.id + " RPC is not Ethereum Mainnet.");
  const decimalsHex = await jsonRpc(source, "eth_call", [
    { to: GENESIS_USDT_ASSETS.ethereum.assetIdentifier, data: "0x313ce567" },
    "finalized",
  ]);
  if (quantity(decimalsHex, "Ethereum USDT decimals") !== 6n) fail(source.id + " RPC did not verify six-decimal Ethereum USDT.");
  return { contractAddress: GENESIS_USDT_ASSETS.ethereum.assetIdentifier, chainId: 1, decimals: 6 };
}

async function scanEthereum(db, sources, treasuryAddress) {
  const metadata = await Promise.all(sources.map(ethereumMetadata));
  const finalized = await Promise.all(sources.map((source) => jsonRpc(source, "eth_getBlockByNumber", ["finalized", false])));
  if (!finalized[0] || !finalized[1] ||
      String(finalized[0].hash || "").toLowerCase() !== String(finalized[1].hash || "").toLowerCase()) {
    fail("Ethereum independent RPC sources disagree on the finalized head.");
  }
  const head = quantity(finalized[0].number, "Ethereum finalized block number");
  let cursor = await getCursor(db, "ethereum", "mainnet");
  if (!cursor) {
    await setCursor(db, "ethereum", "mainnet", head.toString());
    return { initialized: true, receipts: 0, scannedThrough: head.toString() };
  }
  const previous = quantity(cursor.cursor_value, "Ethereum scan cursor");
  if (head <= previous) return { initialized: false, receipts: 0, scannedThrough: previous.toString() };
  const from = previous + 1n;
  const to = head < from + BigInt(ETHEREUM_BLOCK_BATCH - 1) ? head : from + BigInt(ETHEREUM_BLOCK_BATCH - 1);
  const filter = {
    address: GENESIS_USDT_ASSETS.ethereum.assetIdentifier,
    topics: [TRANSFER_TOPIC, null, topicAddress(treasuryAddress)],
    fromBlock: hexQuantity(from),
    toBlock: hexQuantity(to),
  };
  const logPages = await Promise.all(sources.map((source) => jsonRpc(source, "eth_getLogs", [filter])));
  if (!Array.isArray(logPages[0]) || !Array.isArray(logPages[1])) fail("Ethereum RPC returned an invalid log page.");
  const left = logPages[0].map(ethereumLogIdentity);
  const right = logPages[1].map(ethereumLogIdentity);
  if (JSON.stringify(left) !== JSON.stringify(right)) fail("Ethereum independent RPC sources disagree on incoming USDT Transfer logs.");
  let receipts = 0;
  for (let index = 0; index < logPages[0].length; index += 1) {
    const log = logPages[0][index];
    if (!log || log.removed) fail("Ethereum log was removed or malformed.");
    if (!Array.isArray(log.topics) || log.topics.length !== 3 || !/^0x[0-9a-f]{64}$/i.test(log.data || "")) {
      fail("Ethereum USDT Transfer log is malformed.");
    }
    const sender = "0x" + String(log.topics[1]).slice(-40).toLowerCase();
    const amount = exactPositiveInteger(log.data, "Ethereum USDT transfer amount").toString();
    const transferIndex = toSafeNumber(log.logIndex, "Ethereum log index");
    const expected = {
      transactionId: log.transactionHash,
      senderAddress: sender,
      treasuryAddress,
      amountBaseUnits: amount,
      transferIndex,
    };
    const observations = await Promise.all(sources.map(async (source, sourceIndex) => {
      const [receipt, canonicalBlock, finalityBlock] = await Promise.all([
        jsonRpc(source, "eth_getTransactionReceipt", [log.transactionHash]),
        jsonRpc(source, "eth_getBlockByNumber", [log.blockNumber, false]),
        Promise.resolve(finalized[sourceIndex]),
      ]);
      const evidence = parseEthereumUsdtTransferEvidence({
        chainId: 1,
        tokenMetadata: metadata[sourceIndex],
        receipt,
        blockAtReceiptHeight: canonicalBlock,
        finalityBlock: { ...finalityBlock, tag: "finalized" },
        expected,
      });
      return { providerId: source.id, operatorId: source.operatorId, evidence };
    }));
    const reconciled = reconcileGenesisRpcEvidence({ network: "ethereum", observations, expected });
    await persistVerifiedReceipt(db, reconciled);
    receipts += 1;
  }
  await setCursor(db, "ethereum", "mainnet", to.toString());
  return { initialized: false, receipts, scannedThrough: to.toString() };
}

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function decodeBase58(value, label) {
  if (typeof value !== "string" || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(value)) fail(label + " is not canonical base58.");
  let number = 0n;
  for (const character of value) number = number * 58n + BigInt(BASE58_ALPHABET.indexOf(character));
  const bytes = [];
  while (number > 0n) { bytes.push(Number(number & 255n)); number >>= 8n; }
  bytes.reverse();
  let zeroes = 0;
  while (zeroes < value.length && value[zeroes] === "1") zeroes += 1;
  return new Uint8Array([...new Array(zeroes).fill(0), ...bytes]);
}

function encodeBase58(bytes) {
  let number = 0n;
  for (const byte of bytes) number = number * 256n + BigInt(byte);
  let encoded = "";
  while (number > 0n) {
    const digit = Number(number % 58n);
    encoded = BASE58_ALPHABET[digit] + encoded;
    number /= 58n;
  }
  let zeroes = 0;
  while (zeroes < bytes.length && bytes[zeroes] === 0) zeroes += 1;
  return "1".repeat(zeroes) + encoded;
}

async function doubleSha256(value) {
  const first = new Uint8Array(await crypto.subtle.digest("SHA-256", value));
  return new Uint8Array(await crypto.subtle.digest("SHA-256", first));
}

async function tronAddressPayload(address, label) {
  const decoded = decodeBase58(address, label);
  if (decoded.length !== 25 || decoded[0] !== 0x41) fail(label + " is not a TRON Mainnet address.");
  const payload = decoded.slice(0, 21);
  const checksum = await doubleSha256(payload);
  if (checksum[0] !== decoded[21] || checksum[1] !== decoded[22] ||
      checksum[2] !== decoded[23] || checksum[3] !== decoded[24]) fail(label + " has an invalid checksum.");
  return Array.from(payload.slice(1), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function tronAddressFromTopic(topic, label) {
  const normalized = String(topic || "").replace(/^0x/i, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) fail(label + " topic is malformed.");
  const hex = normalized.slice(-40);
  const payload = new Uint8Array([0x41, ...hex.match(/../g).map((part) => parseInt(part, 16))]);
  const checksum = (await doubleSha256(payload)).slice(0, 4);
  return encodeBase58(new Uint8Array([...payload, ...checksum]));
}

function tronLogAddressHex(value) {
  const hex = String(value || "").replace(/^0x/i, "").toLowerCase();
  if (/^41[0-9a-f]{40}$/.test(hex)) return hex.slice(2);
  if (/^[0-9a-f]{40}$/.test(hex)) return hex;
  return "";
}

async function tronMetadata(source, treasuryAddress) {
  const tokenAddress = GENESIS_USDT_ASSETS.tron.assetIdentifier;
  const result = await tronRpc(source, "triggerconstantcontract", {
    owner_address: treasuryAddress,
    contract_address: tokenAddress,
    function_selector: "decimals()",
    parameter: "",
    visible: true,
  });
  if (!result.result || result.result.result !== true || !Array.isArray(result.constant_result) ||
      typeof result.constant_result[0] !== "string" || quantity("0x" + result.constant_result[0].slice(-64), "TRON USDT decimals") !== 6n) {
    fail(source.id + " SolidityNode did not verify six-decimal TRON USDT.");
  }
  return { networkTag: "TRON_MAINNET", contractAddress: tokenAddress, decimals: 6 };
}

async function tronNowBlock(source) {
  const block = await tronRpc(source, "getnowblock");
  const number = block && block.block_header && block.block_header.raw_data && block.block_header.raw_data.number;
  const blockId = String(block && block.blockID || "").toLowerCase();
  if (!Number.isSafeInteger(number) || number < 0 || !/^[0-9a-f]{64}$/.test(blockId)) {
    fail(source.id + " SolidityNode returned an invalid solidified head.");
  }
  return { number, blockId };
}

function tronTransactionIds(block) {
  if (!block || !Array.isArray(block.transactions)) fail("TRON block transaction list is missing.");
  return block.transactions.map((transaction) => {
    const id = String(transaction && transaction.txID || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(id)) fail("TRON block contains an invalid transaction id.");
    return id;
  });
}

async function extractTronUsdtCandidates(info, tokenHex, treasuryHex) {
  if (!info || !Array.isArray(info.log)) return [];
  const candidates = [];
  for (let index = 0; index < info.log.length; index += 1) {
    const log = info.log[index];
    if (tronLogAddressHex(log && log.address) !== tokenHex) continue;
    if (!Array.isArray(log.topics) || log.topics.length !== 3 ||
        String(log.topics[0] || "").replace(/^0x/i, "").toLowerCase() !== GENESIS_USDT_ASSETS.tron.transferTopic) continue;
    if (String(log.topics[2] || "").replace(/^0x/i, "").toLowerCase().slice(-40) !== treasuryHex) continue;
    if (typeof log.data !== "string" || !/^(?:0x)?[0-9a-f]{64}$/i.test(log.data)) continue;
    const amount = exactPositiveInteger("0x" + log.data.replace(/^0x/i, ""), "TRON USDT transfer amount");
    const senderAddress = await tronAddressFromTopic(log.topics[1], "TRON Transfer sender");
    candidates.push({
      senderAddress,
      amountBaseUnits: amount.toString(),
      transferIndex: index,
    });
  }
  return candidates;
}

async function scanTron(db, sources, treasuryAddress) {
  const [tokenHex, treasuryHex] = await Promise.all([
    tronAddressPayload(GENESIS_USDT_ASSETS.tron.assetIdentifier, "Canonical TRON USDT contract"),
    tronAddressPayload(treasuryAddress, "Configured TRON treasury"),
  ]);
  const metadata = await Promise.all(sources.map((source) => tronMetadata(source, treasuryAddress)));
  const heads = await Promise.all(sources.map(tronNowBlock));
  if (heads[0].number !== heads[1].number || heads[0].blockId !== heads[1].blockId) {
    fail("TRON independent SolidityNodes disagree on the solidified head.");
  }
  let cursor = await getCursor(db, "tron", "mainnet");
  if (!cursor) {
    await setCursor(db, "tron", "mainnet", String(heads[0].number));
    return { initialized: true, receipts: 0, scannedThrough: String(heads[0].number) };
  }
  const previous = toSafeNumber(cursor.cursor_value, "TRON scan cursor");
  if (heads[0].number <= previous) return { initialized: false, receipts: 0, scannedThrough: String(previous) };
  const end = Math.min(heads[0].number, previous + TRON_BLOCK_BATCH);
  let receipts = 0;
  for (let height = previous + 1; height <= end; height += 1) {
    const blocks = await Promise.all(sources.map((source) => tronRpc(source, "getblockbynum", { num: height })));
    const ids = blocks.map((block) => String(block && block.blockID || "").toLowerCase());
    if (ids[0] !== ids[1] || !/^[0-9a-f]{64}$/.test(ids[0])) {
      fail("TRON independent SolidityNodes disagree on block " + height + ".");
    }
    const txIds = blocks.map(tronTransactionIds);
    if (JSON.stringify(txIds[0]) !== JSON.stringify(txIds[1])) fail("TRON independent SolidityNodes disagree on block transactions.");
    for (const transactionId of txIds[0]) {
      const infos = await Promise.all(sources.map((source) => tronRpc(source, "gettransactioninfobyid", { value: transactionId })));
      if (infos.some((info) => String(info.id || "").toLowerCase() !== transactionId ||
          Number(info.blockNumber) !== height || !info.receipt || info.receipt.result !== "SUCCESS")) {
        continue;
      }
      const candidates = await Promise.all(infos.map((info) => extractTronUsdtCandidates(info, tokenHex, treasuryHex)));
      if (JSON.stringify(candidates[0]) !== JSON.stringify(candidates[1])) {
        fail("TRON independent SolidityNodes disagree on the incoming USDT transfer events.");
      }
      for (const candidate of candidates[0]) {
        const expected = {
          transactionId,
          senderAddress: candidate.senderAddress,
          treasuryAddress,
          amountBaseUnits: candidate.amountBaseUnits,
          transferIndex: candidate.transferIndex,
        };
        const observations = infos.map((info, sourceIndex) => ({
          providerId: sources[sourceIndex].id,
          operatorId: sources[sourceIndex].operatorId,
          evidence: null,
          info,
          sourceIndex,
        }));
        for (const observation of observations) {
          observation.evidence = await parseTronUsdtTransferEvidence({
            networkTag: "TRON_MAINNET",
            receiptSource: "SOLIDITY_NODE",
            tokenMetadata: metadata[observation.sourceIndex],
            transactionInfo: observation.info,
            expected,
          });
          delete observation.info;
          delete observation.sourceIndex;
        }
        const reconciled = reconcileGenesisRpcEvidence({ network: "tron", observations, expected });
        await persistVerifiedReceipt(db, reconciled);
        receipts += 1;
      }
    }
  }
  await setCursor(db, "tron", "mainnet", String(end));
  return { initialized: false, receipts, scannedThrough: String(end) };
}

async function solanaMintMetadata(source) {
  const result = await jsonRpc(source, "getAccountInfo", [
    GENESIS_USDT_ASSETS.solana.assetIdentifier,
    { encoding: "base64", commitment: "finalized" },
  ]);
  const account = result && result.value;
  if (!account || account.owner !== GENESIS_USDT_ASSETS.solana.tokenProgramId ||
      !Array.isArray(account.data) || typeof account.data[0] !== "string") {
    fail(source.id + " RPC did not return the canonical Solana SPL USDT mint account.");
  }
  let bytes;
  try {
    const binary = atob(account.data[0]);
    bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    fail(source.id + " RPC returned invalid Solana mint data.");
  }
  if (bytes.length < 82 || bytes[44] !== 6) fail(source.id + " RPC did not verify six-decimal Solana USDT.");
  return {
    mint: GENESIS_USDT_ASSETS.solana.assetIdentifier,
    programOwner: account.owner,
    decimals: bytes[44],
  };
}

async function solanaTreasuryTokenAccounts(source, treasuryAddress) {
  const result = await jsonRpc(source, "getTokenAccountsByOwner", [
    treasuryAddress,
    { mint: GENESIS_USDT_ASSETS.solana.assetIdentifier },
    { encoding: "jsonParsed", commitment: "finalized" },
  ]);
  if (!result || !Array.isArray(result.value)) fail(source.id + " RPC returned an invalid treasury token-account list.");
  const accounts = result.value.map((entry) => {
    const info = entry && entry.account && entry.account.data && entry.account.data.parsed &&
      entry.account.data.parsed.info;
    if (!entry || typeof entry.pubkey !== "string" || !info ||
        info.mint !== GENESIS_USDT_ASSETS.solana.assetIdentifier ||
        info.owner !== treasuryAddress ||
        Number(info.tokenAmount && info.tokenAmount.decimals) !== 6) {
      fail(source.id + " RPC returned a treasury token account with unexpected mint, owner or precision.");
    }
    return entry.pubkey;
  }).sort();
  return accounts;
}

function solanaKeys(transaction) {
  const message = transaction && transaction.transaction && transaction.transaction.message;
  if (!message || !Array.isArray(message.accountKeys)) fail("Solana parsed account keys are missing.");
  return message.accountKeys.map((entry) => typeof entry === "string" ? entry : entry && entry.pubkey);
}

function solanaBalancesForAccount(balances, index) {
  const entries = balances.filter((entry) =>
    entry && Number(entry.accountIndex) === index && entry.mint === GENESIS_USDT_ASSETS.solana.assetIdentifier
  );
  if (entries.length > 1) fail("Solana token-balance metadata contains duplicate entries for an account.");
  if (!entries.length) return null;
  const entry = entries[0];
  if (!entry.owner || Number(entry.uiTokenAmount && entry.uiTokenAmount.decimals) !== 6) {
    fail("Solana token-balance metadata omits a token owner or canonical precision.");
  }
  return {
    owner: entry.owner,
    amount: quantity(entry.uiTokenAmount && entry.uiTokenAmount.amount, "Solana token-account balance"),
  };
}

function flattenSolanaInstructions(transaction) {
  const message = transaction.transaction.message;
  const outer = message.instructions;
  if (!Array.isArray(outer)) fail("Solana parsed instructions are missing.");
  const innerGroups = Array.isArray(transaction.meta && transaction.meta.innerInstructions)
    ? transaction.meta.innerInstructions : [];
  const ordered = [];
  for (let index = 0; index < outer.length; index += 1) {
    ordered.push(outer[index]);
    const inner = innerGroups.find((group) => Number(group.index) === index);
    if (inner && Array.isArray(inner.instructions)) ordered.push(...inner.instructions);
  }
  return ordered;
}

function amountFromSolanaInstruction(parsed) {
  const info = parsed && parsed.info;
  const raw = parsed && parsed.type === "transferChecked"
    ? info && info.tokenAmount && info.tokenAmount.amount
    : info && info.amount;
  if (raw === undefined || raw === null) return null;
  try { return exactPositiveInteger(raw, "Solana transfer amount"); } catch { return null; }
}

function solanaIncomingCandidates(transaction, treasuryAddress) {
  if (!transaction || !transaction.meta || transaction.meta.err !== null ||
      !Array.isArray(transaction.meta.preTokenBalances) || !Array.isArray(transaction.meta.postTokenBalances)) {
    fail("Solana transaction does not contain successful execution and token-balance metadata.");
  }
  const keys = solanaKeys(transaction);
  const pre = transaction.meta.preTokenBalances;
  const post = transaction.meta.postTokenBalances;
  const instructions = flattenSolanaInstructions(transaction);
  const candidates = [];
  for (let ordinal = 0; ordinal < instructions.length; ordinal += 1) {
    const instruction = instructions[ordinal];
    if (!instruction || instruction.programId !== GENESIS_USDT_ASSETS.solana.tokenProgramId ||
        !instruction.parsed || !["transfer", "transferChecked"].includes(instruction.parsed.type)) continue;
    const info = instruction.parsed.info;
    if (!info || typeof info.source !== "string" || typeof info.destination !== "string") continue;
    if (info.mint && info.mint !== GENESIS_USDT_ASSETS.solana.assetIdentifier) continue;
    if (instruction.parsed.type === "transferChecked" &&
        Number(info.tokenAmount && info.tokenAmount.decimals) !== 6) continue;
    const sourceIndex = keys.indexOf(info.source);
    const destinationIndex = keys.indexOf(info.destination);
    if (sourceIndex < 0 || destinationIndex < 0) continue;
    const beforeSource = solanaBalancesForAccount(pre, sourceIndex);
    const afterSource = solanaBalancesForAccount(post, sourceIndex);
    const beforeDestination = solanaBalancesForAccount(pre, destinationIndex);
    const afterDestination = solanaBalancesForAccount(post, destinationIndex);
    const sourceOwner = (beforeSource && beforeSource.owner) || (afterSource && afterSource.owner);
    const destinationOwner = (beforeDestination && beforeDestination.owner) || (afterDestination && afterDestination.owner);
    if (!sourceOwner || !destinationOwner || destinationOwner !== treasuryAddress) continue;
    if ((beforeSource && beforeSource.owner !== sourceOwner) || (afterSource && afterSource.owner !== sourceOwner) ||
        (beforeDestination && beforeDestination.owner !== destinationOwner) ||
        (afterDestination && afterDestination.owner !== destinationOwner)) continue;
    const amount = amountFromSolanaInstruction(instruction.parsed);
    if (amount === null) continue;
    const sourceBeforeAmount = beforeSource ? beforeSource.amount : 0n;
    const sourceAfterAmount = afterSource ? afterSource.amount : 0n;
    const destinationBeforeAmount = beforeDestination ? beforeDestination.amount : 0n;
    const destinationAfterAmount = afterDestination ? afterDestination.amount : 0n;
    if (sourceBeforeAmount - sourceAfterAmount !== amount ||
        destinationAfterAmount - destinationBeforeAmount !== amount) continue;
    candidates.push({
      senderAddress: sourceOwner,
      treasuryAddress: destinationOwner,
      amountBaseUnits: amount.toString(),
      transferIndex: ordinal,
    });
  }
  return candidates;
}

async function solanaSignatures(source, tokenAccount, options) {
  const result = await jsonRpc(source, "getSignaturesForAddress", [
    tokenAccount,
    { commitment: "finalized", limit: SOLANA_PAGE_SIZE, ...options },
  ]);
  if (!Array.isArray(result)) fail(source.id + " RPC returned an invalid Solana signature page.");
  return result.map((entry) => {
    if (!entry || typeof entry.signature !== "string" || !Number.isSafeInteger(entry.slot)) {
      fail(source.id + " RPC returned an invalid Solana signature entry.");
    }
    return { signature: entry.signature, slot: entry.slot, err: entry.err };
  });
}

async function scanSolanaPage(db, sources, mintMetadata, treasuryAddress, tokenAccount, cursor) {
  let pageOptions = {};
  let pendingLatest = null;
  let pendingUntil = null;
  if (cursor && cursor.pending_before) {
    pageOptions.before = cursor.pending_before;
    if (cursor.pending_until) pageOptions.until = cursor.pending_until;
    pendingLatest = cursor.pending_latest;
    pendingUntil = cursor.pending_until;
  } else {
    if (cursor && cursor.cursor_value) pageOptions.until = cursor.cursor_value;
    const initialPages = await Promise.all(sources.map((source) => solanaSignatures(source, tokenAccount, pageOptions)));
    if (JSON.stringify(initialPages[0]) !== JSON.stringify(initialPages[1])) {
      fail("Solana independent RPC sources disagree on the finalized signature page.");
    }
    const rows = initialPages[0];
    if (!rows.length) return { receipts: 0, nextCursor: cursor && cursor.cursor_value || "", initialized: !cursor };
    pendingLatest = rows[0].signature;
    pendingUntil = cursor && cursor.cursor_value ? cursor.cursor_value : null;
    return await processSolanaSignaturePage(
      db, sources, mintMetadata, treasuryAddress, tokenAccount, cursor,
      rows, pendingLatest, pendingUntil,
    );
  }

  const pages = await Promise.all(sources.map((source) => solanaSignatures(source, tokenAccount, pageOptions)));
  if (JSON.stringify(pages[0]) !== JSON.stringify(pages[1])) {
    fail("Solana independent RPC sources disagree on the finalized signature page.");
  }
  if (!pages[0].length) {
    await setCursor(db, "solana", tokenAccount, pendingLatest || (cursor && cursor.cursor_value) || "", null, null, null);
    return { receipts: 0, nextCursor: pendingLatest, initialized: false };
  }
  return await processSolanaSignaturePage(
    db, sources, mintMetadata, treasuryAddress, tokenAccount, cursor,
    pages[0], pendingLatest, pendingUntil,
  );
}

async function processSolanaSignaturePage(db, sources, mintMetadata, treasuryAddress, tokenAccount, cursor, rows, pendingLatest, pendingUntil) {
  let receipts = 0;
  for (const row of rows) {
    if (row.err !== null) continue;
    const observations = await Promise.all(sources.map(async (source) => {
      const [transaction, statuses] = await Promise.all([
        jsonRpc(source, "getTransaction", [
          row.signature,
          { encoding: "jsonParsed", commitment: "finalized", maxSupportedTransactionVersion: 0 },
        ]),
        jsonRpc(source, "getSignatureStatuses", [[row.signature], { searchTransactionHistory: true }]),
      ]);
      const status = statuses && Array.isArray(statuses.value) ? statuses.value[0] : null;
      if (!transaction || !status || status.err !== null || status.confirmationStatus !== "finalized") {
        fail(source.id + " RPC does not provide a successful finalized Solana transaction for a treasury signature.");
      }
      const candidates = solanaIncomingCandidates(transaction, treasuryAddress);
      return { source, transaction, status, candidates };
    }));
    const left = observations[0].candidates;
    const right = observations[1].candidates;
    if (JSON.stringify(left) !== JSON.stringify(right)) {
      fail("Solana independent RPC sources disagree on incoming USDT instruction evidence.");
    }
    for (const candidate of left) {
      const expected = {
        transactionId: row.signature,
        senderAddress: candidate.senderAddress,
        treasuryAddress,
        amountBaseUnits: candidate.amountBaseUnits,
        transferIndex: candidate.transferIndex,
      };
      const parsed = observations.map((observation) => ({
        providerId: observation.source.id,
        operatorId: observation.source.operatorId,
        evidence: parseSolanaUsdtTransferEvidence({
          clusterGenesisHash: GENESIS_USDT_ASSETS.solana.clusterGenesisHash,
          mintMetadata: mintMetadata[sources.indexOf(observation.source)],
          transaction: observation.transaction,
          signatureStatus: observation.status,
          expected,
        }),
      }));
      const reconciled = reconcileGenesisRpcEvidence({ network: "solana", observations: parsed, expected });
      await persistVerifiedReceipt(db, reconciled);
      receipts += 1;
    }
  }

  const nextBefore = rows.length === SOLANA_PAGE_SIZE ? rows[rows.length - 1].signature : null;
  if (nextBefore) {
    await setCursor(db, "solana", tokenAccount, cursor && cursor.cursor_value || "", nextBefore, pendingUntil, pendingLatest);
  } else {
    await setCursor(db, "solana", tokenAccount, pendingLatest || (cursor && cursor.cursor_value) || "", null, null, null);
  }
  return { receipts, nextCursor: pendingLatest, morePages: Boolean(nextBefore), initialized: !cursor };
}

async function scanSolana(db, sources, treasuryAddress) {
  const [genesisHashes, mintMetadata] = await Promise.all([
    Promise.all(sources.map((source) => jsonRpc(source, "getGenesisHash"))),
    Promise.all(sources.map(solanaMintMetadata)),
  ]);
  if (genesisHashes.some((hash) => hash !== GENESIS_USDT_ASSETS.solana.clusterGenesisHash)) {
    fail("A configured Solana RPC source is not on Mainnet Beta.");
  }
  const tokenAccounts = await Promise.all(sources.map((source) => solanaTreasuryTokenAccounts(source, treasuryAddress)));
  if (JSON.stringify(tokenAccounts[0]) !== JSON.stringify(tokenAccounts[1])) {
    fail("Solana independent RPC sources disagree on the treasury USDT token accounts.");
  }
  let receipts = 0;
  let processedAccounts = 0;
  const monitorCursor = await getCursor(db, "solana", "__monitor_initialized__");
  const bootstrapping = !monitorCursor;
  for (const tokenAccount of tokenAccounts[0]) {
    const cursor = await getCursor(db, "solana", tokenAccount);
    if (!cursor) {
      if (bootstrapping) {
        const latest = await Promise.all(sources.map((source) => solanaSignatures(source, tokenAccount, { limit: 1 })));
        if (JSON.stringify(latest[0]) !== JSON.stringify(latest[1])) {
          fail("Solana independent RPC sources disagree while initializing a treasury token-account cursor.");
        }
        const initialCursor = latest[0][0] ? latest[0][0].signature : "";
        await setCursor(db, "solana", tokenAccount, initialCursor);
      } else {
        // A token account created after monitoring began may hold the first new receipt.
        // An empty cursor intentionally causes its first observed signatures to be scanned.
        await setCursor(db, "solana", tokenAccount, "");
      }
      processedAccounts += 1;
      continue;
    }
    const result = await scanSolanaPage(db, sources, mintMetadata, treasuryAddress, tokenAccount, cursor);
    receipts += result.receipts;
    processedAccounts += 1;
  }
  if (bootstrapping) await setCursor(db, "solana", "__monitor_initialized__", "1");
  return { initialized: bootstrapping, receipts, tokenAccounts: tokenAccounts[0].length, processedAccounts };
}

export async function runGenesisReceiptMonitor(env) {
  if (!env || env.ENVIRONMENT !== "staging" || env.GENESIS_RECEIPT_MONITOR_ENABLED !== "true") {
    return { status: "DISABLED", receiptsRecorded: 0 };
  }
  const db = env.SUPPORTERS_DB;
  if (!db) fail("the isolated Genesis database is not bound.");
  const config = (network) => prepareGenesisRpcPair(env, network);
  const treasury = {
    ethereum: MAINNET_USDT_CONFIG.ethereum.treasuryAddress,
    tron: MAINNET_USDT_CONFIG.tron.treasuryAddress,
    solana: MAINNET_USDT_CONFIG.solana.treasuryAddress,
  };
  const [ethereum, tron, solana] = await Promise.all([
    scanEthereum(db, config("ethereum"), treasury.ethereum),
    scanTron(db, config("tron"), treasury.tron),
    scanSolana(db, config("solana"), treasury.solana),
  ]);
  return {
    status: "SCANNED",
    receiptsRecorded: ethereum.receipts + tron.receipts + solana.receipts,
    networks: { ethereum, tron, solana },
    paymentCreditsApplied: 0,
    entitlementChanges: 0,
  };
}

export async function publicGenesisTreasuryReceipts(db, limit = 100) {
  const boundedLimit = Math.max(1, Math.min(200, Number.isSafeInteger(limit) ? limit : 100));
  const rows = await db.prepare(
    "SELECT network,asset_identifier,amount_display,sender_address,treasury_address,transaction_hash," +
    "transfer_index,inclusion_reference,finality_status,verified_at " +
    "FROM genesis_treasury_receipts WHERE public_visible=1 " +
    "ORDER BY verified_at DESC,network,transaction_hash,transfer_index LIMIT ?"
  ).bind(boundedLimit).all();
  return (rows.results || []).map((row) => {
    const presentation = NETWORK_PRESENTATION[row.network];
    const link = explorerUrl(row.network, row.transaction_hash);
    if (!presentation || !link) return null;
    return {
      asset: "USDT",
      label: presentation.label,
      network: row.network,
      standard: presentation.standard,
      tokenIdentifier: row.asset_identifier,
      amount: row.amount_display,
      senderAddress: row.sender_address,
      receivingAddress: row.treasury_address,
      transactionHash: row.transaction_hash,
      transferIndex: row.transfer_index,
      inclusionReference: row.inclusion_reference,
      finalityStatus: row.finality_status,
      verifiedAt: new Date(Number(row.verified_at) * 1000).toISOString(),
      verification: "TWO_INDEPENDENT_RPC_OPERATORS",
      explorerUrl: link,
      creditApplied: false,
    };
  }).filter(Boolean);
}

export { explorerUrl, formatUsdtAmount, NETWORK_PRESENTATION };

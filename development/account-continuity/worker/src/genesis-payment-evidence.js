export const GENESIS_USDT_ASSETS = Object.freeze({
  ethereum: Object.freeze({
    networkIdentifier: "eip155:1",
    chainId: 1,
    assetIdentifier: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    transferTopic: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  }),
  tron: Object.freeze({
    networkIdentifier: "tron:mainnet",
    assetIdentifier: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    decimals: 6,
    transferTopic: "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  }),
  solana: Object.freeze({
    networkIdentifier: "solana:mainnet-beta",
    clusterGenesisHash: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    assetIdentifier: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    tokenProgramId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    decimals: 6,
  }),
});

const HEX_32 = /^0x[0-9a-f]{64}$/i;
const HEX_64 = /^[0-9a-f]{64}$/i;
const EVM_ADDRESS = /^0x[0-9a-f]{40}$/i;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
const ERC20_TRANSFER_TOPIC = GENESIS_USDT_ASSETS.ethereum.transferTopic.toLowerCase();

function fail(message) {
  throw new Error("Genesis payment evidence rejected: " + message);
}

function positiveBigInt(value, label) {
  let result;
  try {
    if (typeof value === "bigint") result = value;
    else if (typeof value === "number" && Number.isSafeInteger(value)) result = BigInt(value);
    else if (typeof value === "string" && /^(?:0x[0-9a-f]+|[0-9]+)$/i.test(value)) result = BigInt(value);
    else fail(label + " is not an exact integer.");
  } catch (_) {
    fail(label + " is not an exact integer.");
  }
  if (result <= 0n) fail(label + " must be positive.");
  return result;
}

function nonNegativeIndex(value, fallback, label) {
  const candidate = value === undefined || value === null ? fallback : value;
  let parsed;
  if (typeof candidate === "number" && Number.isSafeInteger(candidate)) parsed = candidate;
  else if (typeof candidate === "string" && /^(?:0x[0-9a-f]+|[0-9]+)$/i.test(candidate)) {
    const big = BigInt(candidate);
    if (big > BigInt(Number.MAX_SAFE_INTEGER)) fail(label + " exceeds the safe integer range.");
    parsed = Number(big);
  } else fail(label + " is not a valid non-negative index.");
  if (!Number.isSafeInteger(parsed) || parsed < 0) fail(label + " is not a valid non-negative index.");
  return parsed;
}

function quantityBigInt(value, label) {
  try {
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
    if (typeof value === "string" && /^(?:0x[0-9a-f]+|[0-9]+)$/i.test(value)) return BigInt(value);
  } catch (_) {}
  fail(label + " is not a valid chain quantity.");
}

function evmAddress(value, label) {
  if (typeof value !== "string" || !EVM_ADDRESS.test(value)) fail(label + " is not a valid EVM address.");
  return value.toLowerCase();
}

function evmTopicAddress(value, label) {
  if (typeof value !== "string" || !/^0x[0-9a-f]{64}$/i.test(value)) fail(label + " is not a valid indexed EVM address.");
  return "0x" + value.slice(-40).toLowerCase();
}

function ethereumHash(value, label) {
  if (typeof value !== "string" || !HEX_32.test(value)) fail(label + " is not a valid 32-byte transaction/block hash.");
  return value.toLowerCase();
}

function tronHash(value, label) {
  if (typeof value !== "string" || !HEX_64.test(value)) fail(label + " is not a valid TRON transaction id.");
  return value.toLowerCase();
}

function base58Decode(value) {
  if (typeof value !== "string" || !BASE58.test(value)) fail("A base58 address/signature field is malformed.");
  let number = 0n;
  for (const character of value) {
    const digit = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".indexOf(character);
    if (digit < 0) fail("A base58 field contains an invalid character.");
    number = number * 58n + BigInt(digit);
  }
  let hex = number.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const decoded = [];
  for (let index = 0; index < hex.length; index += 2) decoded.push(parseInt(hex.slice(index, index + 2), 16));
  let leadingZeros = 0;
  while (leadingZeros < value.length && value[leadingZeros] === "1") leadingZeros += 1;
  return new Uint8Array([...new Array(leadingZeros).fill(0), ...decoded]);
}

function bytesEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function sha256(bytes) {
  if (!globalThis.crypto || !globalThis.crypto.subtle) fail("SHA-256 is unavailable in this runtime.");
  return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes));
}

async function tronPayloadHex(value, label) {
  const decoded = base58Decode(value);
  if (decoded.length !== 25) fail(label + " is not a 21-byte TRON payload with a 4-byte checksum.");
  const payload = decoded.slice(0, 21);
  const checksum = decoded.slice(21);
  if (payload[0] !== 0x41) fail(label + " is not a TRON mainnet-format address.");
  const first = await sha256(payload);
  const second = await sha256(first);
  if (!bytesEqual(checksum, second.slice(0, 4))) fail(label + " has an invalid TRON Base58Check checksum.");
  return Array.from(payload.slice(1), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function tronLogAddress(value, label) {
  if (typeof value !== "string") fail(label + " is missing.");
  const normalized = value.replace(/^0x/i, "").toLowerCase();
  if (/^41[0-9a-f]{40}$/.test(normalized)) return normalized.slice(2);
  if (/^[0-9a-f]{40}$/.test(normalized)) return normalized;
  fail(label + " is not a 20-byte TVM log address.");
}

function tronIndexedAddress(value, label) {
  if (typeof value !== "string") fail(label + " is missing.");
  const normalized = value.replace(/^0x/i, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) fail(label + " is not a 32-byte indexed TRON address.");
  return normalized.slice(-40);
}

function solanaAddress(value, label) {
  if (typeof value !== "string" || !BASE58.test(value)) fail(label + " is not a valid base58 public key.");
  const bytes = base58Decode(value);
  if (bytes.length !== 32) fail(label + " is not a 32-byte Solana public key.");
  return value;
}

function solanaSignature(value, label) {
  if (typeof value !== "string" || !BASE58.test(value)) fail(label + " is not a valid base58 transaction signature.");
  const bytes = base58Decode(value);
  if (bytes.length !== 64) fail(label + " is not a 64-byte Solana transaction signature.");
  return value;
}

function expectedAmount(expected) {
  return positiveBigInt(expected && expected.amountBaseUnits, "Expected amount");
}

function requireTransactionId(expected, network) {
  const value = expected && expected.transactionId;
  if (network === "ethereum") return ethereumHash(value, "Expected transaction hash");
  if (network === "tron") return tronHash(value, "Expected transaction id");
  return solanaSignature(value, "Expected Solana transaction signature");
}

function requestedTransferIndex(expected, label) {
  if (!expected || expected.transferIndex === undefined || expected.transferIndex === null) return null;
  return nonNegativeIndex(expected.transferIndex, 0, label);
}

function canonicalEvidence(network, transactionId, sender, treasury, amount, transferIndex, inclusion, finalityStatus) {
  return Object.freeze({
    network,
    networkIdentifier: GENESIS_USDT_ASSETS[network].networkIdentifier,
    assetIdentifier: GENESIS_USDT_ASSETS[network].assetIdentifier,
    decimals: GENESIS_USDT_ASSETS[network].decimals,
    transactionId,
    transferIndex,
    senderAddress: sender,
    treasuryAddress: treasury,
    amountBaseUnits: amount.toString(),
    inclusion: Object.freeze(inclusion),
    finalityStatus,
    evidenceStatus: "CHAIN_RESPONSE_PARSED_NOT_CREDITED",
  });
}

/**
 * Parse one Ethereum Mainnet receipt plus canonical block/finality observations.
 * The caller must obtain all fields from a configured Ethereum Mainnet RPC source.
 */
export function parseEthereumUsdtTransferEvidence({ chainId, tokenMetadata, receipt, blockAtReceiptHeight, finalityBlock, expected }) {
  if (Number(quantityBigInt(chainId, "Ethereum chain id")) !== GENESIS_USDT_ASSETS.ethereum.chainId) {
    fail("Ethereum RPC source is not chain id 1.");
  }
  if (!tokenMetadata || String(tokenMetadata.contractAddress || "").toLowerCase() !== GENESIS_USDT_ASSETS.ethereum.assetIdentifier.toLowerCase() || Number(tokenMetadata.chainId) !== 1 || Number(tokenMetadata.decimals) !== GENESIS_USDT_ASSETS.ethereum.decimals) {
    fail("Ethereum on-chain USDT contract identity or six-decimal metadata is not verified.");
  }
  if (!receipt || typeof receipt !== "object") fail("Ethereum transaction receipt is absent.");
  const transactionId = ethereumHash(receipt.transactionHash, "Ethereum receipt transaction hash");
  if (transactionId !== requireTransactionId(expected, "ethereum")) fail("Ethereum receipt hash does not match the submitted transaction id.");
  if (!(receipt.status === "0x1" || receipt.status === "0x01" || receipt.status === 1 || receipt.status === 1n)) {
    fail("Ethereum transaction receipt is not successful.");
  }
  const blockNumber = quantityBigInt(receipt.blockNumber, "Ethereum receipt block number");
  const blockHash = ethereumHash(receipt.blockHash, "Ethereum receipt block hash");
  if (!blockAtReceiptHeight || quantityBigInt(blockAtReceiptHeight.number, "Ethereum canonical block number") !== blockNumber) {
    fail("Ethereum canonical block lookup does not match the receipt height.");
  }
  if (ethereumHash(blockAtReceiptHeight.hash, "Ethereum canonical block hash") !== blockHash) {
    fail("Ethereum receipt block hash is not canonical at its height.");
  }
  const finalityTag = String(finalityBlock && finalityBlock.tag || "").toLowerCase();
  if (!["safe", "finalized"].includes(finalityTag)) fail("Ethereum safe/finalized block evidence is missing.");
  if (quantityBigInt(finalityBlock.number, "Ethereum safe/finalized block number") < blockNumber) {
    fail("Ethereum receipt block has not reached the reported safe/finalized head.");
  }
  const tokenAddress = GENESIS_USDT_ASSETS.ethereum.assetIdentifier.toLowerCase();
  const sender = evmAddress(expected.senderAddress, "Expected Ethereum sender");
  const treasury = evmAddress(expected.treasuryAddress, "Expected Ethereum treasury");
  const amount = expectedAmount(expected);
  const requestedIndex = requestedTransferIndex(expected, "Expected Ethereum log index");
  if (!Array.isArray(receipt.logs)) fail("Ethereum receipt logs are missing.");
  const matches = [];
  receipt.logs.forEach((log, index) => {
    if (!log || String(log.address || "").toLowerCase() !== tokenAddress) return;
    if (!Array.isArray(log.topics) || String(log.topics[0] || "").toLowerCase() !== ERC20_TRANSFER_TOPIC) return;
    if (log.topics.length !== 3 || typeof log.data !== "string" || !/^0x[0-9a-f]{64}$/i.test(log.data)) return;
    const from = evmTopicAddress(log.topics[1], "Ethereum Transfer sender topic");
    const to = evmTopicAddress(log.topics[2], "Ethereum Transfer recipient topic");
    const value = BigInt(log.data);
    const transferIndex = nonNegativeIndex(log.logIndex, index, "Ethereum log index");
    if ((requestedIndex === null || transferIndex === requestedIndex) &&
        from === sender && to === treasury && value === amount) {
      matches.push({ transferIndex });
    }
  });
  if (matches.length !== 1) fail("Ethereum receipt must contain exactly one matching canonical USDT Transfer event.");
  return canonicalEvidence(
    "ethereum", transactionId, sender, treasury, amount, matches[0].transferIndex,
    { blockNumber: blockNumber.toString(), blockHash }, finalityTag.toUpperCase()
  );
}

/**
 * Parse a TRON Mainnet USDT transfer from a SolidityNode transaction receipt.
 * A FullNode receipt alone is deliberately insufficient: only the solidified
 * walletsolidity/gettransactioninfobyid view is accepted by this normalizer.
 */
export async function parseTronUsdtTransferEvidence({ networkTag, receiptSource, tokenMetadata, transactionInfo, expected }) {
  if (networkTag !== "TRON_MAINNET") fail("TRON RPC source is not qualified as mainnet.");
  if (receiptSource !== "SOLIDITY_NODE") fail("TRON transaction receipt did not come from the SolidityNode solidified view.");
  if (!tokenMetadata || tokenMetadata.networkTag !== "TRON_MAINNET" || String(tokenMetadata.contractAddress || "") !== GENESIS_USDT_ASSETS.tron.assetIdentifier || Number(tokenMetadata.decimals) !== GENESIS_USDT_ASSETS.tron.decimals) {
    fail("TRON on-chain USDT contract identity or six-decimal metadata is not verified.");
  }
  if (!transactionInfo || typeof transactionInfo !== "object") fail("TRON transaction receipt is absent.");
  const transactionId = tronHash(transactionInfo.id, "TRON receipt transaction id");
  if (transactionId !== requireTransactionId(expected, "tron")) fail("TRON receipt id does not match the submitted transaction id.");
  if (!transactionInfo.receipt || transactionInfo.receipt.result !== "SUCCESS") {
    fail("TRON smart-contract execution receipt is absent or unsuccessful.");
  }
  const blockNumber = quantityBigInt(transactionInfo.blockNumber, "TRON solidified block number");
  const tokenHex = await tronPayloadHex(GENESIS_USDT_ASSETS.tron.assetIdentifier, "Canonical TRON USDT contract");
  const senderHex = await tronPayloadHex(expected.senderAddress, "Expected TRON sender");
  const treasuryHex = await tronPayloadHex(expected.treasuryAddress, "Expected TRON treasury");
  const amount = expectedAmount(expected);
  const requestedIndex = requestedTransferIndex(expected, "Expected TRON event index");
  if (!Array.isArray(transactionInfo.log)) fail("TRON receipt event logs are missing.");
  const matches = [];
  for (let index = 0; index < transactionInfo.log.length; index += 1) {
    const log = transactionInfo.log[index];
    if (!log || tronLogAddress(log.address, "TRON event contract address") !== tokenHex) continue;
    if (!Array.isArray(log.topics) || String(log.topics[0] || "").replace(/^0x/i, "").toLowerCase() !== GENESIS_USDT_ASSETS.tron.transferTopic) continue;
    if (log.topics.length !== 3 || typeof log.data !== "string" || !/^(?:0x)?[0-9a-f]{64}$/i.test(log.data)) continue;
    const from = tronIndexedAddress(log.topics[1], "TRON Transfer sender topic");
    const to = tronIndexedAddress(log.topics[2], "TRON Transfer recipient topic");
    const value = BigInt("0x" + log.data.replace(/^0x/i, ""));
    if ((requestedIndex === null || index === requestedIndex) &&
        from === senderHex && to === treasuryHex && value === amount) matches.push({ transferIndex: index });
  }
  if (matches.length !== 1) fail("TRON solidified receipt must contain exactly one matching canonical USDT Transfer event.");
  return canonicalEvidence(
    "tron", transactionId, expected.senderAddress, expected.treasuryAddress, amount,
    matches[0].transferIndex, { blockNumber: blockNumber.toString() }, "SOLIDIFIED"
  );
}

function solanaInstructionTransfer(instruction) {
  if (!instruction || !instruction.parsed || typeof instruction.parsed !== "object") return null;
  if (instruction.programId !== GENESIS_USDT_ASSETS.solana.tokenProgramId) return null;
  const parsed = instruction.parsed;
  if (!["transfer", "transferChecked"].includes(String(parsed.type || ""))) return null;
  const info = parsed.info;
  if (!info || typeof info.source !== "string" || typeof info.destination !== "string") return null;
  if (parsed.type === "transferChecked" && Number(info.tokenAmount && info.tokenAmount.decimals) !== GENESIS_USDT_ASSETS.solana.decimals) return null;
  const amountValue = parsed.type === "transferChecked"
    ? info.tokenAmount && info.tokenAmount.amount
    : info.amount;
  if (amountValue === undefined || amountValue === null) return null;
  let amount;
  try {
    amount = positiveBigInt(amountValue, "Solana parsed SPL transfer amount");
  } catch (_) {
    return null;
  }
  return {
    sourceTokenAccount: info.source,
    destinationTokenAccount: info.destination,
    mint: info.mint || null,
    amount,
  };
}

function solanaAccountKeys(transaction) {
  const message = transaction && transaction.transaction && transaction.transaction.message;
  if (!message || !Array.isArray(message.accountKeys)) fail("Solana parsed account keys are missing.");
  return message.accountKeys.map((entry) => typeof entry === "string" ? entry : entry && entry.pubkey);
}

function solanaTokenBalance(balances, accountIndex, mint, label) {
  const matches = balances.filter((item) =>
    item && Number(item.accountIndex) === accountIndex && item.mint === mint
  );
  if (matches.length > 1) fail(label + " has duplicate token balance entries.");
  if (!matches.length) return { amount: 0n, owner: null };
  const entry = matches[0];
  if (!entry.owner) fail(label + " token balance omits its token-account owner.");
  if (Number(entry.uiTokenAmount && entry.uiTokenAmount.decimals) !== GENESIS_USDT_ASSETS.solana.decimals) {
    fail(label + " token balance does not report the canonical six-decimal precision.");
  }
  return {
    amount: quantityBigInt(entry.uiTokenAmount && entry.uiTokenAmount.amount, label + " token balance"),
    owner: solanaAddress(entry.owner, label + " token-account owner"),
  };
}

/**
 * Parse a Solana Mainnet transaction using jsonParsed instructions, token-balance
 * metadata and an independently fetched finalized signature status.
 */
export function parseSolanaUsdtTransferEvidence({ clusterGenesisHash, mintMetadata, transaction, signatureStatus, expected }) {
  if (clusterGenesisHash !== GENESIS_USDT_ASSETS.solana.clusterGenesisHash) {
    fail("Solana RPC source is not on the configured Mainnet Beta cluster.");
  }
  if (!mintMetadata || mintMetadata.mint !== GENESIS_USDT_ASSETS.solana.assetIdentifier || mintMetadata.programOwner !== GENESIS_USDT_ASSETS.solana.tokenProgramId || Number(mintMetadata.decimals) !== GENESIS_USDT_ASSETS.solana.decimals) {
    fail("Solana USDT mint owner program or six-decimal metadata is not verified.");
  }
  if (!transaction || !transaction.meta || !transaction.transaction) fail("Solana transaction or metadata is absent.");
  const signatures = transaction.transaction.signatures;
  if (!Array.isArray(signatures) || typeof signatures[0] !== "string") fail("Solana transaction signatures are missing.");
  const transactionId = solanaSignature(signatures[0], "Solana transaction signature");
  if (transactionId !== requireTransactionId(expected, "solana")) fail("Solana transaction signature does not match the submitted signature.");
  if (transaction.meta.err !== null) fail("Solana transaction execution failed or did not provide a null error result.");
  if (!signatureStatus || signatureStatus.err !== null || signatureStatus.confirmationStatus !== "finalized") {
    fail("Solana signature status is not finalized and successful.");
  }
  const slot = quantityBigInt(transaction.slot, "Solana transaction slot");
  const preBalances = transaction.meta.preTokenBalances;
  const postBalances = transaction.meta.postTokenBalances;
  if (!Array.isArray(preBalances) || !Array.isArray(postBalances)) fail("Solana pre/post token-balance evidence is missing.");
  const keys = solanaAccountKeys(transaction);
  const sender = solanaAddress(expected.senderAddress, "Expected Solana sender");
  const treasury = solanaAddress(expected.treasuryAddress, "Expected Solana treasury");
  const amount = expectedAmount(expected);
  const requestedIndex = requestedTransferIndex(expected, "Expected Solana instruction index");
  const mint = GENESIS_USDT_ASSETS.solana.assetIdentifier;
  const outer = transaction.transaction.message.instructions;
  if (!Array.isArray(outer)) fail("Solana parsed top-level instructions are missing.");
  const innerGroups = Array.isArray(transaction.meta.innerInstructions) ? transaction.meta.innerInstructions : [];
  const orderedInstructions = [];
  for (let outerIndex = 0; outerIndex < outer.length; outerIndex += 1) {
    orderedInstructions.push(outer[outerIndex]);
    const inner = innerGroups.find((group) => Number(group.index) === outerIndex);
    if (inner && Array.isArray(inner.instructions)) orderedInstructions.push(...inner.instructions);
  }
  const matches = [];
  for (let instructionOrdinal = 0; instructionOrdinal < orderedInstructions.length; instructionOrdinal += 1) {
    const instruction = orderedInstructions[instructionOrdinal];
    const transfer = solanaInstructionTransfer(instruction);
    if (!transfer) continue;
    if (transfer.mint && transfer.mint !== mint) continue;
    const sourceIndex = keys.indexOf(transfer.sourceTokenAccount);
    const destinationIndex = keys.indexOf(transfer.destinationTokenAccount);
    if (sourceIndex < 0 || destinationIndex < 0) continue;
    const sourceBefore = solanaTokenBalance(preBalances, sourceIndex, mint, "Solana source");
    const sourceAfter = solanaTokenBalance(postBalances, sourceIndex, mint, "Solana source");
    const destinationBefore = solanaTokenBalance(preBalances, destinationIndex, mint, "Solana destination");
    const destinationAfter = solanaTokenBalance(postBalances, destinationIndex, mint, "Solana destination");
    const sourceOwners = [sourceBefore.owner, sourceAfter.owner].filter(Boolean);
    const destinationOwners = [destinationBefore.owner, destinationAfter.owner].filter(Boolean);
    if (!sourceOwners.length || sourceOwners.some((owner) => owner !== sender)) continue;
    if (!destinationOwners.length || destinationOwners.some((owner) => owner !== treasury)) continue;
    const sourceDelta = sourceBefore.amount - sourceAfter.amount;
    const destinationDelta = destinationAfter.amount - destinationBefore.amount;
    // Multiple canonical SPL transfers in one transaction can aggregate into
    // the same token-account balance delta. The requested instruction ordinal
    // isolates this transfer; the before/after balances corroborate that its
    // amount was covered by the successful transaction.
    if ((requestedIndex === null || instructionOrdinal === requestedIndex) &&
        transfer.amount === amount && sourceDelta >= amount && destinationDelta >= amount) {
      matches.push({ transferIndex: instructionOrdinal });
    }
  }
  if (matches.length !== 1) fail("Solana finalized transaction must contain exactly one matching USDT transfer instruction with matching owner and balance deltas.");
  return canonicalEvidence(
    "solana", transactionId, sender, treasury, amount, matches[0].transferIndex,
    { slot: slot.toString() }, "FINALIZED"
  );
}

function evidenceCore(evidence) {
  if (!evidence || typeof evidence !== "object" || evidence.evidenceStatus !== "CHAIN_RESPONSE_PARSED_NOT_CREDITED") {
    fail("An observation is not a normalized result from a supported chain parser.");
  }
  return {
    network: evidence.network,
    networkIdentifier: evidence.networkIdentifier,
    assetIdentifier: evidence.assetIdentifier,
    decimals: evidence.decimals,
    transactionId: evidence.transactionId,
    transferIndex: evidence.transferIndex,
    senderAddress: evidence.senderAddress,
    treasuryAddress: evidence.treasuryAddress,
    amountBaseUnits: evidence.amountBaseUnits,
    inclusion: evidence.inclusion,
    finalityStatus: evidence.finalityStatus,
    evidenceStatus: evidence.evidenceStatus,
  };
}

/**
 * Require two or more genuinely distinct configured RPC operators to agree on
 * the same normalized transfer. This is evidence reconciliation only: it never
 * inserts a contribution, credits an allowance or updates a payment state.
 */
export function reconcileGenesisRpcEvidence({ network, observations, expected }) {
  if (!Object.prototype.hasOwnProperty.call(GENESIS_USDT_ASSETS, network)) fail("Unsupported Genesis payment network.");
  if (!Array.isArray(observations) || observations.length < 2) fail("At least two independent RPC observations are required.");
  const providerIds = new Set();
  const operatorIds = new Set();
  const cores = [];
  for (const observation of observations) {
    if (!observation || typeof observation.providerId !== "string" || !observation.providerId.trim()) {
      fail("Every RPC observation must identify its configured provider.");
    }
    if (!observation.operatorId || typeof observation.operatorId !== "string") {
      fail("Every RPC observation must identify its independently qualified operator.");
    }
    if (providerIds.has(observation.providerId) || operatorIds.has(observation.operatorId)) {
      fail("RPC observations must come from distinct providers and independently qualified operators.");
    }
    providerIds.add(observation.providerId);
    operatorIds.add(observation.operatorId);
    const core = evidenceCore(observation.evidence);
    if (core.network !== network) fail("An RPC observation belongs to a different network.");
    cores.push(core);
  }
  const reference = JSON.stringify(cores[0]);
  if (cores.some((core) => JSON.stringify(core) !== reference)) {
    fail("Independent RPC sources disagree on the canonical transfer evidence.");
  }
  const evidence = cores[0];
  const canonicalAsset = GENESIS_USDT_ASSETS[network];
  if (evidence.networkIdentifier !== canonicalAsset.networkIdentifier ||
      evidence.assetIdentifier !== canonicalAsset.assetIdentifier ||
      evidence.decimals !== canonicalAsset.decimals) {
    fail("Normalized evidence does not use the canonical network, token identifier and six-decimal precision.");
  }
  const allowedFinality = {
    ethereum: ["SAFE", "FINALIZED"],
    tron: ["SOLIDIFIED"],
    solana: ["FINALIZED"],
  }[network];
  if (!allowedFinality.includes(evidence.finalityStatus)) {
    fail("Normalized evidence does not carry the required chain-specific finality status.");
  }
  if (!Number.isSafeInteger(evidence.transferIndex) || evidence.transferIndex < 0) {
    fail("Normalized evidence does not contain a valid transfer/event index.");
  }
  if (!evidence.inclusion || typeof evidence.inclusion !== "object" || Array.isArray(evidence.inclusion)) {
    fail("Normalized evidence is missing its block/slot inclusion reference.");
  }
  const expectedId = requireTransactionId(expected, network);
  if (evidence.transactionId !== expectedId) fail("Reconciled transaction id does not match the payment reference.");
  if (evidence.amountBaseUnits !== expectedAmount(expected).toString()) fail("Reconciled exact amount does not match the payment expectation.");
  if (evidence.senderAddress !== expected.senderAddress && network !== "ethereum") {
    fail("Reconciled sender does not match the expected verified wallet.");
  }
  if (network === "ethereum" && evidence.senderAddress !== evmAddress(expected.senderAddress, "Expected Ethereum sender")) {
    fail("Reconciled sender does not match the expected verified wallet.");
  }
  if (evidence.treasuryAddress !== expected.treasuryAddress && network !== "ethereum") {
    fail("Reconciled treasury does not match the configured destination.");
  }
  if (network === "ethereum" && evidence.treasuryAddress !== evmAddress(expected.treasuryAddress, "Expected Ethereum treasury")) {
    fail("Reconciled treasury does not match the configured destination.");
  }
  return Object.freeze({
    status: "RPC_EVIDENCE_AGREES_FINALIZED_TRANSFER",
    creditApplied: false,
    network,
    evidence: Object.freeze(evidence),
    providerAgreement: Object.freeze({
      agreeingSources: observations.length,
      providerIds: Object.freeze(Array.from(providerIds)),
      operatorIds: Object.freeze(Array.from(operatorIds)),
    }),
  });
}

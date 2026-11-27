import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";
import {
  GENESIS_USDT_ASSETS,
  parseEthereumUsdtTransferEvidence,
  parseTronUsdtTransferEvidence,
  parseSolanaUsdtTransferEvidence,
  reconcileGenesisRpcEvidence,
} from "../src/genesis-payment-evidence.js";

globalThis.crypto ??= webcrypto;

function encodeBase58(bytes) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let number = 0n;
  for (const byte of bytes) number = number * 256n + BigInt(byte);
  let encoded = "";
  while (number > 0n) {
    const digit = Number(number % 58n);
    encoded = alphabet[digit] + encoded;
    number /= 58n;
  }
  let leadingZeroes = 0;
  while (leadingZeroes < bytes.length && bytes[leadingZeroes] === 0) leadingZeroes += 1;
  return "1".repeat(leadingZeroes) + encoded;
}

function decodeBase58(value) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let number = 0n;
  for (const character of value) number = number * 58n + BigInt(alphabet.indexOf(character));
  let hex = number.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const tail = [];
  for (let i = 0; i < hex.length; i += 2) tail.push(parseInt(hex.slice(i, i + 2), 16));
  let leadingZeroes = 0;
  while (leadingZeroes < value.length && value[leadingZeroes] === "1") leadingZeroes += 1;
  return new Uint8Array([...new Array(leadingZeroes).fill(0), ...tail]);
}

async function sha256(bytes) {
  return new Uint8Array(await webcrypto.subtle.digest("SHA-256", bytes));
}

async function tronAddressFromPayload(hex20) {
  const payload = new Uint8Array([0x41, ...hex20.match(/.{2}/g).map((part) => parseInt(part, 16))]);
  const checksum = (await sha256(await sha256(payload))).slice(0, 4);
  return encodeBase58(new Uint8Array([...payload, ...checksum]));
}

function topicAddress(hex20) {
  return "0x" + "0".repeat(24) + hex20.toLowerCase();
}

const ETH_SENDER = "0x1111111111111111111111111111111111111111";
const ETH_TREASURY = "0xbbb77071149a5F113Df15E78c58518917afa950A";
const ETH_TX = "0x" + "ab".repeat(32);
const ETH_BLOCK_HASH = "0x" + "cd".repeat(32);
const ETH_EXPECTED = {
  transactionId: ETH_TX,
  senderAddress: ETH_SENDER,
  treasuryAddress: ETH_TREASURY,
  amountBaseUnits: "1000000",
};

function ethereumFixture(overrides = {}) {
  return {
    chainId: "0x1",
    expected: ETH_EXPECTED,
    tokenMetadata: { contractAddress: GENESIS_USDT_ASSETS.ethereum.assetIdentifier, chainId: 1, decimals: 6 },
    receipt: {
      transactionHash: ETH_TX,
      status: "0x1",
      blockNumber: "0x100",
      blockHash: ETH_BLOCK_HASH,
      logs: [{
        address: GENESIS_USDT_ASSETS.ethereum.assetIdentifier,
        topics: [
          GENESIS_USDT_ASSETS.ethereum.transferTopic,
          topicAddress(ETH_SENDER.slice(2)),
          topicAddress(ETH_TREASURY.slice(2)),
        ],
        data: "0x" + (1000000n).toString(16).padStart(64, "0"),
        logIndex: "0x4",
      }],
    },
    blockAtReceiptHeight: { number: "0x100", hash: ETH_BLOCK_HASH },
    finalityBlock: { tag: "finalized", number: "0x120" },
    ...overrides,
  };
}

test("Ethereum parser requires a successful canonical Mainnet USDT Transfer and finalized block", () => {
  const evidence = parseEthereumUsdtTransferEvidence(ethereumFixture());
  assert.equal(evidence.networkIdentifier, "eip155:1");
  assert.equal(evidence.assetIdentifier, GENESIS_USDT_ASSETS.ethereum.assetIdentifier);
  assert.equal(evidence.amountBaseUnits, "1000000");
  assert.equal(evidence.transferIndex, 4);
  assert.equal(evidence.finalityStatus, "FINALIZED");
  assert.equal(evidence.evidenceStatus, "CHAIN_RESPONSE_PARSED_NOT_CREDITED");
});

test("Ethereum parser rejects wrong chain, failed receipt, wrong token, wrong sender and stale finality", () => {
  assert.throws(() => parseEthereumUsdtTransferEvidence(ethereumFixture({ chainId: "0x5" })), /chain id 1/);
  assert.throws(() => parseEthereumUsdtTransferEvidence(ethereumFixture({ tokenMetadata: { contractAddress: GENESIS_USDT_ASSETS.ethereum.assetIdentifier, chainId: 1, decimals: 18 } })), /six-decimal metadata/);
  assert.throws(() => parseEthereumUsdtTransferEvidence(ethereumFixture({
    receipt: { ...ethereumFixture().receipt, status: "0x0" },
  })), /not successful/);
  assert.throws(() => parseEthereumUsdtTransferEvidence(ethereumFixture({
    receipt: { ...ethereumFixture().receipt, logs: [{
      ...ethereumFixture().receipt.logs[0], address: "0x" + "11".repeat(20),
    }] },
  })), /exactly one matching/);
  assert.throws(() => parseEthereumUsdtTransferEvidence(ethereumFixture({
    finalityBlock: { tag: "latest", number: "0x500" },
  })), /safe\/finalized/);
  assert.throws(() => parseEthereumUsdtTransferEvidence(ethereumFixture({
    blockAtReceiptHeight: { number: "0x100", hash: "0x" + "ee".repeat(32) },
  })), /not canonical/);
  const repeated = ethereumFixture({
    receipt: { ...ethereumFixture().receipt, logs: [
      ...ethereumFixture().receipt.logs,
      { ...ethereumFixture().receipt.logs[0], logIndex: "0x5" },
    ] },
  });
  assert.throws(() => parseEthereumUsdtTransferEvidence(repeated), /exactly one matching/);
  const selected = parseEthereumUsdtTransferEvidence({
    ...repeated,
    expected: { ...ETH_EXPECTED, transferIndex: 4 },
  });
  assert.equal(selected.transferIndex, 4);
  assert.throws(() => parseEthereumUsdtTransferEvidence({
    ...repeated,
    expected: { ...ETH_EXPECTED, transferIndex: 99 },
  }), /exactly one matching/);
});

test("TRON parser requires a checksummed Mainnet address and a SolidityNode solidified receipt", async () => {
  const senderHex = "79309abcff2cf531070ca9222a1f72c4a5136874";
  const senderAddress = await tronAddressFromPayload(senderHex);
  const treasuryAddress = "TAKHQcuJ3RLsZZxCorWc3rav6M28dS6VTR";
  const txId = "12".repeat(32);
  const topic = GENESIS_USDT_ASSETS.tron.transferTopic;
  const info = {
    id: txId,
    blockNumber: 123456,
    receipt: { result: "SUCCESS" },
    log: [{
      address: "a614f803b6fd780986a42c78ec9c7f77e6ded13c",
      topics: [topic, topicAddress(senderHex), topicAddress(Array.from(decodeBase58(treasuryAddress).slice(1, 21), (b) => b.toString(16).padStart(2, "0")).join(""))],
      data: "00000000000000000000000000000000000000000000000000000000000f4240",
    }],
  };
  const expected = {
    transactionId: txId,
    senderAddress,
    treasuryAddress,
    amountBaseUnits: "1000000",
  };
  const evidence = await parseTronUsdtTransferEvidence({
    networkTag: "TRON_MAINNET",
    receiptSource: "SOLIDITY_NODE",
    tokenMetadata: { networkTag: "TRON_MAINNET", contractAddress: GENESIS_USDT_ASSETS.tron.assetIdentifier, decimals: 6 },
    transactionInfo: info,
    expected,
  });
  assert.equal(evidence.networkIdentifier, "tron:mainnet");
  assert.equal(evidence.finalityStatus, "SOLIDIFIED");
  assert.equal(evidence.amountBaseUnits, "1000000");
  assert.equal(evidence.transferIndex, 0);
  const repeatedInfo = { ...info, log: [...info.log, { ...info.log[0] }] };
  const selected = await parseTronUsdtTransferEvidence({
    networkTag: "TRON_MAINNET",
    receiptSource: "SOLIDITY_NODE",
    tokenMetadata: { networkTag: "TRON_MAINNET", contractAddress: GENESIS_USDT_ASSETS.tron.assetIdentifier, decimals: 6 },
    transactionInfo: repeatedInfo,
    expected: { ...expected, transferIndex: 1 },
  });
  assert.equal(selected.transferIndex, 1);
  await assert.rejects(() => parseTronUsdtTransferEvidence({
    networkTag: "TRON_MAINNET",
    receiptSource: "SOLIDITY_NODE",
    tokenMetadata: { networkTag: "TRON_MAINNET", contractAddress: GENESIS_USDT_ASSETS.tron.assetIdentifier, decimals: 6 },
    transactionInfo: repeatedInfo,
    expected,
  }), /exactly one matching/);
  await assert.rejects(() => parseTronUsdtTransferEvidence({
    networkTag: "TRON_MAINNET", receiptSource: "FULL_NODE", tokenMetadata: { networkTag: "TRON_MAINNET", contractAddress: GENESIS_USDT_ASSETS.tron.assetIdentifier, decimals: 6 }, transactionInfo: info, expected,
  }), /SolidityNode/);
  await assert.rejects(() => parseTronUsdtTransferEvidence({
    networkTag: "TRON_NILE", receiptSource: "SOLIDITY_NODE", tokenMetadata: { networkTag: "TRON_MAINNET", contractAddress: GENESIS_USDT_ASSETS.tron.assetIdentifier, decimals: 6 }, transactionInfo: info, expected,
  }), /not qualified as mainnet/);
  await assert.rejects(() => parseTronUsdtTransferEvidence({
    networkTag: "TRON_MAINNET", receiptSource: "SOLIDITY_NODE",
    tokenMetadata: { networkTag: "TRON_MAINNET", contractAddress: GENESIS_USDT_ASSETS.tron.assetIdentifier, decimals: 6 },
    transactionInfo: { ...info, receipt: { result: "FAILED" } }, expected,
  }), /unsuccessful/);
  await assert.rejects(() => parseTronUsdtTransferEvidence({
    networkTag: "TRON_MAINNET", receiptSource: "SOLIDITY_NODE",
    tokenMetadata: { networkTag: "TRON_MAINNET", contractAddress: GENESIS_USDT_ASSETS.tron.assetIdentifier, decimals: 6 },
    transactionInfo: { ...info, log: [] }, expected,
  }), /exactly one matching/);
});

test("Solana parser ties a finalized USDT instruction to source/destination wallet owners and exact balance deltas", () => {
  const sender = encodeBase58(new Uint8Array(32).fill(3));
  const treasury = encodeBase58(new Uint8Array(32).fill(4));
  const sourceTokenAccount = encodeBase58(new Uint8Array(32).fill(5));
  const destinationTokenAccount = encodeBase58(new Uint8Array(32).fill(6));
  const transactionId = encodeBase58(new Uint8Array(64).fill(7));
  const mint = GENESIS_USDT_ASSETS.solana.assetIdentifier;
  const transaction = {
    slot: 987654,
    transaction: {
      signatures: [transactionId],
      message: {
        accountKeys: [sender, sourceTokenAccount, destinationTokenAccount, treasury, GENESIS_USDT_ASSETS.solana.tokenProgramId],
        instructions: [
          { programId: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr", parsed: { type: "memo", info: { memo: "fixture" } } },
          {
            programId: GENESIS_USDT_ASSETS.solana.tokenProgramId,
            parsed: {
              type: "transferChecked",
              info: {
                source: sourceTokenAccount,
                destination: destinationTokenAccount,
                mint,
                authority: sender,
                tokenAmount: { amount: "1000000", decimals: 6 },
              },
            },
          },
        ],
      },
    },
    meta: {
      err: null,
      preTokenBalances: [
        { accountIndex: 1, mint, owner: sender, uiTokenAmount: { amount: "10000000", decimals: 6 } },
        { accountIndex: 2, mint, owner: treasury, uiTokenAmount: { amount: "100", decimals: 6 } },
      ],
      postTokenBalances: [
        { accountIndex: 1, mint, owner: sender, uiTokenAmount: { amount: "9000000", decimals: 6 } },
        { accountIndex: 2, mint, owner: treasury, uiTokenAmount: { amount: "1000100", decimals: 6 } },
      ],
      innerInstructions: [],
    },
  };
  const expected = { transactionId, senderAddress: sender, treasuryAddress: treasury, amountBaseUnits: "1000000" };
  const evidence = parseSolanaUsdtTransferEvidence({
    clusterGenesisHash: GENESIS_USDT_ASSETS.solana.clusterGenesisHash,
    transaction,
    signatureStatus: { err: null, confirmationStatus: "finalized" },
    mintMetadata: { mint: GENESIS_USDT_ASSETS.solana.assetIdentifier, programOwner: GENESIS_USDT_ASSETS.solana.tokenProgramId, decimals: 6 },
    expected,
  });
  assert.equal(evidence.networkIdentifier, "solana:mainnet-beta");
  assert.equal(evidence.assetIdentifier, mint);
  assert.equal(evidence.finalityStatus, "FINALIZED");
  assert.equal(evidence.amountBaseUnits, "1000000");
  assert.equal(evidence.transferIndex, 1);
  assert.deepEqual(evidence.inclusion, { slot: "987654" });
  const selected = parseSolanaUsdtTransferEvidence({
    clusterGenesisHash: GENESIS_USDT_ASSETS.solana.clusterGenesisHash,
    transaction,
    signatureStatus: { err: null, confirmationStatus: "finalized" },
    mintMetadata: { mint: GENESIS_USDT_ASSETS.solana.assetIdentifier, programOwner: GENESIS_USDT_ASSETS.solana.tokenProgramId, decimals: 6 },
    expected: { ...expected, transferIndex: 1 },
  });
  assert.equal(selected.transferIndex, 1);

  const multiTransfer = structuredClone(transaction);
  multiTransfer.transaction.message.instructions.push({
    programId: GENESIS_USDT_ASSETS.solana.tokenProgramId,
    parsed: {
      type: "transferChecked",
      info: {
        source: sourceTokenAccount,
        destination: destinationTokenAccount,
        mint,
        authority: sender,
        tokenAmount: { amount: "2000000", decimals: 6 },
      },
    },
  });
  multiTransfer.meta.postTokenBalances[0].uiTokenAmount.amount = "7000000";
  multiTransfer.meta.postTokenBalances[1].uiTokenAmount.amount = "3000100";
  const firstTransfer = parseSolanaUsdtTransferEvidence({
    clusterGenesisHash: GENESIS_USDT_ASSETS.solana.clusterGenesisHash,
    transaction: multiTransfer,
    signatureStatus: { err: null, confirmationStatus: "finalized" },
    mintMetadata: { mint, programOwner: GENESIS_USDT_ASSETS.solana.tokenProgramId, decimals: 6 },
    expected: { ...expected, transferIndex: 1 },
  });
  const secondTransfer = parseSolanaUsdtTransferEvidence({
    clusterGenesisHash: GENESIS_USDT_ASSETS.solana.clusterGenesisHash,
    transaction: multiTransfer,
    signatureStatus: { err: null, confirmationStatus: "finalized" },
    mintMetadata: { mint, programOwner: GENESIS_USDT_ASSETS.solana.tokenProgramId, decimals: 6 },
    expected: { ...expected, amountBaseUnits: "2000000", transferIndex: 2 },
  });
  assert.equal(firstTransfer.amountBaseUnits, "1000000");
  assert.equal(secondTransfer.amountBaseUnits, "2000000");

  // A later outgoing transfer can reduce the treasury account's net delta
  // without changing the fact that the earlier incoming transfer occurred.
  const roundTrip = structuredClone(transaction);
  const recipient = encodeBase58(new Uint8Array(32).fill(9));
  const recipientTokenAccount = encodeBase58(new Uint8Array(32).fill(8));
  roundTrip.transaction.message.accountKeys.push(recipientTokenAccount, recipient);
  roundTrip.transaction.message.instructions.push({
    programId: GENESIS_USDT_ASSETS.solana.tokenProgramId,
    parsed: {
      type: "transferChecked",
      info: {
        source: destinationTokenAccount,
        destination: recipientTokenAccount,
        mint,
        authority: treasury,
        tokenAmount: { amount: "600000", decimals: 6 },
      },
    },
  });
  roundTrip.meta.preTokenBalances.push(
    { accountIndex: 2, mint, owner: treasury, uiTokenAmount: { amount: "100", decimals: 6 } },
  );
  roundTrip.meta.postTokenBalances[1].uiTokenAmount.amount = "400100";
  roundTrip.meta.postTokenBalances.push(
    { accountIndex: 5, mint, owner: recipient, uiTokenAmount: { amount: "600000", decimals: 6 } },
  );
  const inboundDespiteSameTransactionOutflow = parseSolanaUsdtTransferEvidence({
    clusterGenesisHash: GENESIS_USDT_ASSETS.solana.clusterGenesisHash,
    transaction: roundTrip,
    signatureStatus: { err: null, confirmationStatus: "finalized" },
    mintMetadata: { mint, programOwner: GENESIS_USDT_ASSETS.solana.tokenProgramId, decimals: 6 },
    expected: { ...expected, transferIndex: 1 },
  });
  assert.equal(inboundDespiteSameTransactionOutflow.amountBaseUnits, "1000000");

  const inflatedTransfer = structuredClone(transaction);
  inflatedTransfer.transaction.message.instructions.push(structuredClone(transaction.transaction.message.instructions[1]));
  assert.throws(() => parseSolanaUsdtTransferEvidence({
    clusterGenesisHash: GENESIS_USDT_ASSETS.solana.clusterGenesisHash,
    transaction: inflatedTransfer,
    signatureStatus: { err: null, confirmationStatus: "finalized" },
    mintMetadata: { mint, programOwner: GENESIS_USDT_ASSETS.solana.tokenProgramId, decimals: 6 },
    expected: { ...expected, transferIndex: 2 },
  }), /balance deltas do not reconcile/);
});

test("Solana parser rejects wrong cluster, non-finalized status, failed transactions and mismatched token deltas", () => {
  const sender = encodeBase58(new Uint8Array(32).fill(3));
  const treasury = encodeBase58(new Uint8Array(32).fill(4));
  const sourceTokenAccount = encodeBase58(new Uint8Array(32).fill(5));
  const destinationTokenAccount = encodeBase58(new Uint8Array(32).fill(6));
  const transactionId = encodeBase58(new Uint8Array(64).fill(7));
  const mint = GENESIS_USDT_ASSETS.solana.assetIdentifier;
  const tx = {
    slot: 5,
    transaction: {
      signatures: [transactionId],
      message: {
        accountKeys: [sender, sourceTokenAccount, destinationTokenAccount],
        instructions: [{
          programId: GENESIS_USDT_ASSETS.solana.tokenProgramId,
          parsed: { type: "transfer", info: { source: sourceTokenAccount, destination: destinationTokenAccount, amount: "1000000" } },
        }],
      },
    },
    meta: {
      err: null,
      preTokenBalances: [
        { accountIndex: 1, mint, owner: sender, uiTokenAmount: { amount: "5000000", decimals: 6 } },
        { accountIndex: 2, mint, owner: treasury, uiTokenAmount: { amount: "0", decimals: 6 } },
      ],
      postTokenBalances: [
        { accountIndex: 1, mint, owner: sender, uiTokenAmount: { amount: "4000000", decimals: 6 } },
        { accountIndex: 2, mint, owner: treasury, uiTokenAmount: { amount: "1000000", decimals: 6 } },
      ],
      innerInstructions: [],
    },
  };
  const expected = { transactionId, senderAddress: sender, treasuryAddress: treasury, amountBaseUnits: "1000000" };
  const parse = (overrides = {}) => parseSolanaUsdtTransferEvidence({
    clusterGenesisHash: GENESIS_USDT_ASSETS.solana.clusterGenesisHash,
    transaction: tx,
    signatureStatus: { err: null, confirmationStatus: "finalized" },
    mintMetadata: { mint: GENESIS_USDT_ASSETS.solana.assetIdentifier, programOwner: GENESIS_USDT_ASSETS.solana.tokenProgramId, decimals: 6 },
    expected,
    ...overrides,
  });
  assert.throws(() => parse({ clusterGenesisHash: "devnet" }), /Mainnet Beta/);
  assert.throws(() => parse({ mintMetadata: { mint, programOwner: "wrong-program", decimals: 6 } }), /mint owner program or six-decimal metadata/);
  assert.throws(() => parse({ signatureStatus: { err: null, confirmationStatus: "confirmed" } }), /not finalized/);
  assert.throws(() => parse({ transaction: { ...tx, meta: { ...tx.meta, err: { InstructionError: [0, "Error"] } } } }), /execution failed/);
  assert.throws(() => parse({ transaction: { ...tx, meta: { ...tx.meta, postTokenBalances: [
    tx.meta.postTokenBalances[0],
    { ...tx.meta.postTokenBalances[1], uiTokenAmount: { amount: "999999", decimals: 6 } },
  ] } } }), /exactly one matching/);
});

test("RPC reconciliation requires two distinct operators and identical normalized evidence, and never credits", () => {
  const evidence = parseEthereumUsdtTransferEvidence(ethereumFixture());
  const result = reconcileGenesisRpcEvidence({
    network: "ethereum",
    expected: ETH_EXPECTED,
    observations: [
      { providerId: "rpc-a", operatorId: "operator-a", evidence },
      { providerId: "rpc-b", operatorId: "operator-b", evidence },
    ],
  });
  assert.equal(result.status, "RPC_EVIDENCE_AGREES_FINALIZED_TRANSFER");
  assert.equal(result.creditApplied, false);
  assert.equal(result.providerAgreement.agreeingSources, 2);
  assert.throws(() => reconcileGenesisRpcEvidence({
    network: "ethereum",
    expected: ETH_EXPECTED,
    observations: [
      { providerId: "rpc-a", operatorId: "same-operator", evidence },
      { providerId: "rpc-b", operatorId: "same-operator", evidence },
    ],
  }), /distinct providers and independently qualified operators/);
  assert.throws(() => reconcileGenesisRpcEvidence({
    network: "ethereum",
    expected: ETH_EXPECTED,
    observations: [
      { providerId: "rpc-a", operatorId: "operator-a", evidence },
      { providerId: "rpc-b", operatorId: "operator-b", evidence: { ...evidence, transferIndex: 9 } },
    ],
  }), /disagree/);
  assert.throws(() => reconcileGenesisRpcEvidence({
    network: "ethereum",
    expected: ETH_EXPECTED,
    observations: [
      { providerId: "rpc-a", operatorId: "operator-a", evidence: { ...evidence, assetIdentifier: "0x" + "11".repeat(20) } },
      { providerId: "rpc-b", operatorId: "operator-b", evidence: { ...evidence, assetIdentifier: "0x" + "11".repeat(20) } },
    ],
  }), /canonical network, token identifier/);
  assert.throws(() => reconcileGenesisRpcEvidence({
    network: "ethereum",
    expected: ETH_EXPECTED,
    observations: [
      { providerId: "rpc-a", operatorId: "operator-a", evidence: { ...evidence, finalityStatus: "LATEST" } },
      { providerId: "rpc-b", operatorId: "operator-b", evidence: { ...evidence, finalityStatus: "LATEST" } },
    ],
  }), /chain-specific finality/);
});

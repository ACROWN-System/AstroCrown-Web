import { MAINNET_USDT_CONFIG } from "../../../supporter-programme/shared/mainnet-config.mjs";
import { GENESIS_QUALIFYING_RULES_VERSION } from "../../../supporter-programme/shared/entitlement-rules.mjs";
import { genesisQualifyingPaymentGate } from "../../../supporter-programme/shared/genesis-payment-policy.mjs";

function rpcPairConfigured(env, network) {
  const prefix = "GENESIS_" + network.toUpperCase() + "_RPC_";
  try {
    const endpoints = ["A", "B"].map((slot) => {
      const url = new URL(String(env[prefix + slot + "_URL"] || ""));
      const sourceId = String(env[prefix + slot + "_SOURCE_ID"] || "").trim();
      if (url.protocol !== "https:" || url.username || url.password || url.hash ||
          !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,63}$/.test(sourceId)) {
        throw new Error("Invalid RPC source.");
      }
      return { origin: url.origin, sourceId };
    });
    return endpoints[0].origin !== endpoints[1].origin &&
      endpoints[0].sourceId !== endpoints[1].sourceId;
  } catch {
    return false;
  }
}

function sameAddress(network, supplied, canonical) {
  return network === "ethereum"
    ? String(supplied || "").toLowerCase() === String(canonical || "").toLowerCase()
    : supplied === canonical;
}

/**
 * Qualifying-payment activation is a conjunction of independently approved
 * environment controls and the isolated Genesis D1's network/programme state.
 */
export async function genesisPaymentActivationGate(db, env, network, rpcPairReady) {
  const reasons = [];
  const environmentGate = genesisQualifyingPaymentGate(env, network, rpcPairReady);
  reasons.push(...environmentGate.reasons);
  if (!Object.prototype.hasOwnProperty.call(MAINNET_USDT_CONFIG, network)) {
    return Object.freeze({ enabled: false, network, reasons: Object.freeze(reasons) });
  }

  const [programme, configuredNetwork, control] = await Promise.all([
    db.prepare(
      "SELECT status,rules_version,usdt_decimals FROM supporter_program WHERE singleton=1"
    ).first(),
    db.prepare(
      "SELECT network_identifier,token_identifier,token_decimals,treasury_address,enabled,decimals_verified_at,config_version " +
      "FROM supporter_network_config WHERE network=?"
    ).bind(network).first(),
    db.prepare(
      "SELECT registration_freeze_at,registration_closed_at,acrown_launched_at " +
      "FROM genesis_programme_control WHERE singleton=1"
    ).first(),
  ]);

  const canonical = MAINNET_USDT_CONFIG[network];
  if (!programme || programme.status !== "OPEN" ||
      programme.rules_version !== GENESIS_QUALIFYING_RULES_VERSION ||
      Number(programme.usdt_decimals) !== 6) {
    reasons.push("The isolated Genesis programme database has not activated the exact approved USDT qualifying-payment rules version.");
  }
  if (!configuredNetwork ||
      Number(configuredNetwork.enabled) !== 1 ||
      configuredNetwork.network_identifier !== canonical.networkIdentifier ||
      configuredNetwork.token_identifier !== canonical.tokenIdentifier ||
      Number(configuredNetwork.token_decimals) !== 6 ||
      !configuredNetwork.decimals_verified_at ||
      !configuredNetwork.config_version ||
      !sameAddress(network, configuredNetwork.treasury_address, canonical.treasuryAddress)) {
    reasons.push("The selected USDT network has not passed canonical token, decimal, treasury and network activation checks in Genesis D1.");
  }
  const now = Math.floor(Date.now() / 1000);
  if (!control || control.registration_closed_at ||
      (control.registration_freeze_at && now >= Number(control.registration_freeze_at)) ||
      control.acrown_launched_at) {
    reasons.push("New Genesis qualifying-payment intents are closed by the programme lifecycle cutoff or launch state.");
  }

  return Object.freeze({
    enabled: reasons.length === 0,
    network,
    asset: "USDT",
    label: environmentGate.label,
    standard: environmentGate.standard,
    tokenIdentifier: canonical.tokenIdentifier,
    treasuryAddress: canonical.treasuryAddress,
    termsVersion: environmentGate.termsVersion,
    rulesVersion: environmentGate.rulesVersion,
    minimumAmountBaseUnits: environmentGate.minimumAmountBaseUnits,
    reasons: Object.freeze(reasons),
  });
}

function randomRecordId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return prefix + "_" + btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function paymentExplorerUrl(network, transactionHash) {
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

/**
 * Convert one independently reconciled incoming receipt into a Genesis
 * qualifying-payment record only when it matches the sole open, pre-existing
 * intent exactly. D1 triggers perform the atomic shared-pool credit, event,
 * Genesis Member activation, badge award and intent confirmation.
 */
export async function settleGenesisPaymentReceipt(db, env, receiptId) {
  const receipt = await db.prepare(
    "SELECT * FROM genesis_treasury_receipts WHERE receipt_id=?"
  ).bind(receiptId).first();
  if (!receipt) return { status: "RECEIPT_NOT_FOUND" };
  if (receipt.attribution_status !== "MATCHED" || !receipt.identity_id || !receipt.source_wallet_address_id) {
    return { status: "UNMATCHED_RECEIPT" };
  }

  const gate = await genesisPaymentActivationGate(db, env, receipt.network, rpcPairConfigured(env, receipt.network));
  if (!gate.enabled) return { status: "PAYMENT_ACCEPTANCE_CLOSED" };

  const intents = await db.prepare(
    "SELECT p.* FROM genesis_payment_intents p " +
    "WHERE p.status='OPEN' AND p.identity_id=? AND p.source_wallet_address_id=? " +
    "AND p.network=? AND p.asset_identifier=? AND p.treasury_address=? " +
    "AND p.amount_base_units=? AND p.created_at<=? AND p.expires_at>=? LIMIT 2"
  ).bind(
    receipt.identity_id,
    receipt.source_wallet_address_id,
    receipt.network,
    receipt.asset_identifier,
    receipt.treasury_address,
    receipt.amount_base_units,
    receipt.verified_at,
    receipt.verified_at
  ).all();
  const matches = intents.results || [];
  if (!matches.length) return { status: "NO_MATCHING_OPEN_INTENT" };
  if (matches.length !== 1) return { status: "AMBIGUOUS_INTENT_MATCH" };

  const intent = matches[0];
  const link = paymentExplorerUrl(receipt.network, receipt.transaction_hash);
  if (!link) return { status: "INVALID_TRANSACTION_REFERENCE" };
  const paymentRecordId = randomRecordId("gpm");
  const insert = await db.prepare(
    "INSERT INTO genesis_public_payments(" +
    "payment_record_id,identity_id,source_wallet_address_id,payment_kind,network,asset_identifier," +
    "amount_base_units,amount_display,transaction_hash,transfer_index,finality_status,receipt_finality_status,rules_version," +
    "explorer_reference,confirmed_at,public_visible,payment_intent_id,receipt_id,allowance_credit_usdt_base_units" +
    ") VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    paymentRecordId,
    receipt.identity_id,
    receipt.source_wallet_address_id,
    "QUALIFYING_PAYMENT",
    receipt.network,
    receipt.asset_identifier,
    receipt.amount_base_units,
    receipt.amount_display,
    receipt.transaction_hash,
    String(receipt.transfer_index),
    "FINALIZED",
    receipt.finality_status,
    intent.rules_version,
    link,
    Number(receipt.verified_at),
    1,
    intent.payment_intent_id,
    receipt.receipt_id,
    intent.allowance_credit_usdt_base_units
  );

  try {
    await insert.run();
  } catch {
    const existing = await db.prepare(
      "SELECT payment_record_id,payment_intent_id FROM genesis_public_payments " +
      "WHERE network=? AND transaction_hash=? AND transfer_index=?"
    ).bind(receipt.network, receipt.transaction_hash, String(receipt.transfer_index)).first();
    if (existing && existing.payment_intent_id === intent.payment_intent_id) {
      return { status: "CONFIRMED", paymentRecordId: existing.payment_record_id, paymentIntentId: intent.payment_intent_id };
    }
    return { status: "SETTLEMENT_REVIEW_REQUIRED" };
  }

  const confirmed = await db.prepare(
    "SELECT status,payment_record_id FROM genesis_payment_intents WHERE payment_intent_id=?"
  ).bind(intent.payment_intent_id).first();
  if (!confirmed || confirmed.status !== "CONFIRMED" || confirmed.payment_record_id !== paymentRecordId) {
    return { status: "SETTLEMENT_REVIEW_REQUIRED" };
  }
  return {
    status: "CONFIRMED",
    paymentRecordId,
    paymentIntentId: intent.payment_intent_id,
    allowanceCreditUsdtBaseUnits: intent.allowance_credit_usdt_base_units,
  };
}

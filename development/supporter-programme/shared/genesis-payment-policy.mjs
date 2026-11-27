import { MAINNET_USDT_CONFIG } from "./mainnet-config.mjs";
import { GENESIS_QUALIFYING_RULES_VERSION } from "./entitlement-rules.mjs";

const NETWORK_LABELS = Object.freeze({
  ethereum: "USDT · Ethereum (ERC-20)",
  tron: "USDT · TRON (TRC-20)",
  solana: "USDT · Solana (SPL)",
});

const NETWORK_STANDARDS = Object.freeze({
  ethereum: "ERC-20",
  tron: "TRC-20",
  solana: "SPL",
});

export function parseGenesisUsdtAmountToBaseUnits(value) {
  if (typeof value !== "string") throw new TypeError("Enter the exact USDT payment amount.");
  const normalized = value.trim();
  const match = normalized.match(/^(0|[1-9][0-9]*)(?:\.([0-9]{1,6}))?$/);
  if (!match) throw new TypeError("USDT amounts must be plain decimal values with no more than six fractional digits.");
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] || "").padEnd(6, "0") || "0");
  const baseUnits = whole * 1_000_000n + fraction;
  if (baseUnits <= 0n) throw new RangeError("The USDT payment amount must be greater than zero.");
  return baseUnits.toString();
}

function canonicalPositiveInteger(value) {
  return typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value) && BigInt(value) > 0n;
}

/**
 * Payment-acceptance controls deliberately require independent, explicit owner
 * activation for legal terms, proposed programme rules, treasury custody proof,
 * the native receipt monitor, and two separately configured RPC data sources.
 */
export function genesisQualifyingPaymentGate(env, network, rpcPairReady = false) {
  const reasons = [];
  const environment = env && env.ENVIRONMENT;
  if (environment === "production") {
    if (env.GENESIS_PRODUCTION_PAYMENTS_APPROVED !== "true") {
      reasons.push("Production Genesis payment acceptance has not been separately approved.");
    }
    if (env.GENESIS_PRODUCTION_RECEIPT_MONITOR_APPROVED !== "true") {
      reasons.push("Production Genesis receipt monitoring has not been separately approved.");
    }
    if (env.GENESIS_PRODUCTION_RECEIPT_MONITOR_CRON_VERIFIED !== "true") {
      reasons.push("The production Genesis receipt-monitor Cron schedule has not been verified.");
    }
  } else if (environment !== "staging") {
    reasons.push("The qualifying-payment service must run in the isolated staging environment or an explicitly approved production environment.");
  }
  if (env?.GENESIS_RECEIPT_MONITOR_ENABLED !== "true") reasons.push("The AstroCrown-owned receiving-wallet monitor is not enabled.");
  if (env?.GENESIS_QUALIFYING_PAYMENTS_ENABLED !== "true") reasons.push("Genesis qualifying-payment acceptance is disabled.");
  if (env?.GENESIS_QUALIFYING_RULES_APPROVED !== "true" ||
      env?.GENESIS_QUALIFYING_RULES_VERSION !== GENESIS_QUALIFYING_RULES_VERSION) {
    reasons.push("The exact Genesis tier schedule and rules version have not been explicitly approved.");
  }
  if (env?.GENESIS_TERMS_APPROVED !== "true" ||
      typeof env?.GENESIS_TERMS_VERSION !== "string" ||
      !/^GENESIS-TERMS-[A-Za-z0-9._-]{1,64}$/.test(env.GENESIS_TERMS_VERSION)) {
    reasons.push("The final Genesis payment terms and their version have not been approved.");
  }
  const minimum = env?.GENESIS_MINIMUM_QUALIFYING_USDT_BASE_UNITS;
  if (!canonicalPositiveInteger(minimum)) {
    reasons.push("The minimum qualifying USDT amount has not been configured and approved.");
  }
  if (!Object.prototype.hasOwnProperty.call(MAINNET_USDT_CONFIG, network)) {
    reasons.push("The requested USDT network is not in the canonical allowlist.");
  } else {
    const proofVariable = "GENESIS_" + network.toUpperCase() + "_TREASURY_CONTROL_VERIFIED";
    if (env?.[proofVariable] !== "true") {
      reasons.push("AstroCrown has not recorded independent custody/control verification for the " + network.toUpperCase() + " receiving wallet.");
    }
  }
  if (!rpcPairReady) reasons.push("Two distinct, configured RPC node sources are not ready for the selected network.");
  return Object.freeze({
    enabled: reasons.length === 0,
    network,
    asset: "USDT",
    label: NETWORK_LABELS[network] || null,
    standard: NETWORK_STANDARDS[network] || null,
    rulesVersion: GENESIS_QUALIFYING_RULES_VERSION,
    termsVersion: env?.GENESIS_TERMS_VERSION || null,
    minimumAmountBaseUnits: canonicalPositiveInteger(minimum) ? minimum : null,
    reasons: Object.freeze(reasons),
  });
}

export function genesisUsdtPaymentPresentation(network, amountDisplay, treasuryAddress, tokenIdentifier, expiresAt) {
  const label = NETWORK_LABELS[network];
  const standard = NETWORK_STANDARDS[network];
  if (!label || !standard || typeof treasuryAddress !== "string" || !treasuryAddress ||
      typeof tokenIdentifier !== "string" || !tokenIdentifier) {
    throw new TypeError("The selected Genesis USDT payment rail is not configured.");
  }
  return Object.freeze({
    asset: "USDT",
    label,
    network,
    standard,
    amount: amountDisplay,
    receivingAddress: treasuryAddress,
    tokenIdentifier,
    expiresAt,
    networkFeePolicy: "The registered wallet owner pays the network fee separately using the network's native fee asset/resources. It is not deducted from the USDT principal.",
    paymentMethod: "MANUAL_EXACT_AMOUNT_TRANSFER",
    walletTransactionSubmitted: false,
  });
}

import { MAINNET_USDT_CONFIG } from "../../../supporter-programme/shared/mainnet-config.mjs";

const NETWORK_ORDER = ["ethereum", "tron", "solana"];
const CANONICAL_NETWORKS = MAINNET_USDT_CONFIG;

function json(status, payload) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Cross-Origin-Resource-Policy": "same-origin",
  });
  return new Response(JSON.stringify(payload), { status, headers });
}

export function buildGenesisProgrammeStatus(program, networkRows) {
  if (!program || program.environment !== "MAINNET" || !Array.isArray(networkRows)) {
    throw new Error("The Genesis Programme database is not initialized correctly.");
  }
  if (!["PRELAUNCH", "OPEN", "PAUSED", "CLOSED"].includes(program.status)) {
    throw new Error("The Genesis Programme has an unrecognized lifecycle state.");
  }
  const byNetwork = new Map(networkRows.map((row) => [row.network, row]));
  if (networkRows.length !== NETWORK_ORDER.length || byNetwork.size !== NETWORK_ORDER.length ||
      NETWORK_ORDER.some((network) => !byNetwork.has(network))) {
    throw new Error("The Genesis Programme database does not contain the exact three-network allowlist.");
  }
  const networks = NETWORK_ORDER.map((network) => {
    const row = byNetwork.get(network);
    const canonical = CANONICAL_NETWORKS[network];
    if (Number(row.token_decimals) !== canonical.tokenDecimals ||
        row.network_identifier !== canonical.networkIdentifier ||
        row.token_identifier !== canonical.tokenIdentifier) {
      throw new Error("The configured network/token identity or USD₮ precision does not match the canonical allowlist.");
    }
    const configuredTreasury = typeof row.treasury_address === "string" ? row.treasury_address.trim() : "";
    const expectedTreasury = network === "ethereum"
      ? canonical.treasuryAddress.toLowerCase()
      : canonical.treasuryAddress;
    const normalizedTreasury = network === "ethereum"
      ? configuredTreasury.toLowerCase()
      : configuredTreasury;
    if (configuredTreasury && normalizedTreasury !== expectedTreasury) {
      throw new Error("The configured Genesis treasury does not match the approved network configuration.");
    }
    const treasuryConfigured = Boolean(configuredTreasury);
    const networkConfigured = Number(row.enabled) === 1;
    if (networkConfigured && !treasuryConfigured) {
      throw new Error("A network cannot be enabled without its configured Genesis treasury address.");
    }
    return {
      network,
      networkIdentifier: canonical.networkIdentifier,
      tokenIdentifier: canonical.tokenIdentifier,
      tokenDecimals: canonical.tokenDecimals,
      networkConfigured,
      treasuryConfigured,
    };
  });
  return {
    environment: "MAINNET",
    programme: {
      status: String(program.status),
      activatedAt: Number(program.activated_at) > 0 ? new Date(Number(program.activated_at) * 1000).toISOString() : null,
      closesAt: Number(program.closes_at) > 0 ? new Date(Number(program.closes_at) * 1000).toISOString() : null,
      rulesVersion: program.rules_version || null,
    },
    networks,
    paymentAcceptance: {
      enabled: false,
      qualifyingPaymentsAccepted: false,
      reason: "Mainnet payment intake is not enabled. No payment intent or transfer request can be created.",
    },
    purchaseAllowance: {
      separateFromQualifyingPayment: true,
      automaticTokenIssuance: false,
    },
  };
}

export async function genesisProgrammeStatusResponse(env) {
  const db = env?.SUPPORTERS_DB;
  if (!db) {
    return json(503, { error: "The isolated Genesis Programme database is not bound. Payment acceptance is unavailable." });
  }
  try {
    const [program, result, control] = await Promise.all([
      db.prepare(
        "SELECT environment,status,activated_at,closes_at,rules_version FROM supporter_program WHERE singleton=1"
      ).first(),
      db.prepare(
        "SELECT network,network_identifier,token_identifier,token_decimals,treasury_address,enabled " +
        "FROM supporter_network_config ORDER BY network"
      ).all(),
      db.prepare(
        "SELECT acrown_launched_at,acs_floor_purchase_opened_at,purchase_window_started_at," +
        "purchase_window_last_purchase_at,purchase_window_closes_at " +
        "FROM genesis_programme_control WHERE singleton=1"
      ).first(),
    ]);
    const now = Math.floor(Date.now() / 1000);
    const payload = buildGenesisProgrammeStatus(program, result?.results || []);
    const programmeLifecycle = {
      acrownLaunchedAt: control?.acrown_launched_at ? Number(control.acrown_launched_at) : null,
      acsFloorPurchaseOpenedAt: control?.acs_floor_purchase_opened_at ? Number(control.acs_floor_purchase_opened_at) : null,
      purchaseWindowStartedAt: control?.purchase_window_started_at ? Number(control.purchase_window_started_at) : null,
      purchaseWindowLastPurchaseAt: control?.purchase_window_last_purchase_at ? Number(control.purchase_window_last_purchase_at) : null,
      purchaseWindowClosesAt: control?.purchase_window_closes_at ? Number(control.purchase_window_closes_at) : null,
      purchaseWindowRemainingSeconds: control?.purchase_window_closes_at
        ? Math.max(0, Number(control.purchase_window_closes_at) - now) : null,
      purchaseWindowOpen: Boolean(control?.purchase_window_started_at && control?.purchase_window_closes_at &&
        now >= Number(control.purchase_window_started_at) && now < Number(control.purchase_window_closes_at)),
      inactivityPeriodSeconds: 15552000,
      inactivityPeriodLabel: "180 days of inactivity",
    };
    return json(200, { ...payload, programmeLifecycle });
  } catch {
    return json(503, {
      error: "The isolated Genesis Programme database could not be qualified. Qualifying payments remain disabled.",
    });
  }
}

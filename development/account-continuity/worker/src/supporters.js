const NETWORK_ORDER = ["ethereum", "tron", "solana"];
const CANONICAL_NETWORKS = Object.freeze({
  ethereum: {
    networkIdentifier: "eip155:1",
    tokenIdentifier: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  },
  tron: {
    networkIdentifier: "tron:mainnet",
    tokenIdentifier: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  },
  solana: {
    networkIdentifier: "solana:mainnet",
    tokenIdentifier: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  },
});

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

function isoTimestamp(value) {
  const seconds = Number(value);
  if (!Number.isSafeInteger(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

export function buildSupporterStatus(program, networkRows) {
  if (!program || program.environment !== "MAINNET" || !Array.isArray(networkRows)) {
    throw new Error("The isolated Supporter Programme database is not initialized correctly.");
  }

  if (!["PRELAUNCH", "OPEN", "PAUSED", "CLOSED"].includes(program.status)) {
    throw new Error("The Supporter Programme has an unrecognized lifecycle state.");
  }

  const byNetwork = new Map(networkRows.map((row) => [row.network, row]));
  if (
    networkRows.length !== NETWORK_ORDER.length ||
    byNetwork.size !== NETWORK_ORDER.length ||
    NETWORK_ORDER.some((network) => !byNetwork.has(network))
  ) {
    throw new Error("The Supporter Programme database does not contain the exact three-network allowlist.");
  }

  const networks = NETWORK_ORDER.map((network) => {
    const row = byNetwork.get(network);
    const canonical = CANONICAL_NETWORKS[network];
    if (
      Number(row.token_decimals) !== 6 ||
      row.network_identifier !== canonical.networkIdentifier ||
      row.token_identifier !== canonical.tokenIdentifier
    ) {
      throw new Error("The configured network/token identity or USD₮ precision does not match the canonical allowlist.");
    }
    return {
      network,
      networkIdentifier: canonical.networkIdentifier,
      tokenIdentifier: canonical.tokenIdentifier,
      tokenDecimals: 6,
      networkConfigured: Number(row.enabled) === 1,
      treasuryConfigured: Number(row.treasury_configured) === 1,
    };
  });

  return {
    environment: "MAINNET",
    programme: {
      status: String(program.status),
      activatedAt: isoTimestamp(program.activated_at),
      closesAt: isoTimestamp(program.closes_at),
      rulesVersion: program.rules_version || null,
    },
    networks,
    paymentAcceptance: {
      enabled: false,
      contributionsAccepted: false,
      reason: "Mainnet payment intake is not enabled in this release. No payment intent or transfer request can be created.",
    },
    purchaseAllowance: {
      separateFromContribution: true,
      automaticTokenIssuance: false,
    },
  };
}

export async function supporterStatusResponse(env) {
  const db = env?.SUPPORTERS_DB;
  if (!db) {
    return json(503, {
      error: "The isolated Supporter Programme database is not bound. Payment acceptance is unavailable.",
    });
  }

  try {
    const [program, result] = await Promise.all([
      db.prepare(
        "SELECT environment,status,activated_at,closes_at,rules_version " +
        "FROM supporter_program WHERE singleton = 1"
      ).first(),
      db.prepare(
        "SELECT network,network_identifier,token_identifier,token_decimals,enabled," +
        "CASE WHEN treasury_address IS NULL OR length(trim(treasury_address)) = 0 THEN 0 ELSE 1 END AS treasury_configured " +
        "FROM supporter_network_config ORDER BY network"
      ).all(),
    ]);

    const payload = buildSupporterStatus(program, result?.results || []);
    // This release deliberately implements status visibility only. No database
    // state, configuration flag, or client request can activate payment intake.
    return json(200, payload);
  } catch {
    return json(503, {
      error: "The isolated Supporter Programme database could not be qualified. Contributions remain disabled.",
    });
  }
}

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { normalizeWalletAddress } from "../src/supporters.js";

export const GENESIS_TREASURY_NETWORKS = Object.freeze({
  ethereum: Object.freeze({
    networkIdentifier: "eip155:1",
    tokenIdentifier: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  }),
  tron: Object.freeze({
    networkIdentifier: "tron:mainnet",
    tokenIdentifier: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  }),
  solana: Object.freeze({
    networkIdentifier: "solana:mainnet",
    tokenIdentifier: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  }),
});

const NETWORK_ORDER = Object.keys(GENESIS_TREASURY_NETWORKS);

export async function validateTreasuryAddressInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Provide a JSON object containing the three public receiving addresses.");
  }
  const supplied = Object.keys(input).sort();
  const required = [...NETWORK_ORDER].sort();
  if (supplied.length !== required.length || supplied.some((key, index) => key !== required[index])) {
    throw new TypeError("Provide exactly these network keys: ethereum, tron, solana.");
  }

  const validated = {};
  for (const network of NETWORK_ORDER) {
    const raw = input[network];
    if (typeof raw !== "string" || raw.trim().length === 0) {
      throw new TypeError("A public receiving address is required for " + network + ".");
    }
    const normalized = await normalizeWalletAddress(network, raw.trim());
    validated[network] = {
      address: normalized.address,
      networkIdentifier: GENESIS_TREASURY_NETWORKS[network].networkIdentifier,
      tokenIdentifier: GENESIS_TREASURY_NETWORKS[network].tokenIdentifier,
      tokenDecimals: 6,
    };
  }
  return validated;
}

function sqlString(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}

export function generateTreasuryConfigSql(validated) {
  if (!validated || typeof validated !== "object" || Array.isArray(validated)) {
    throw new TypeError("Validated treasury configuration is required.");
  }
  const keys = Object.keys(validated).sort();
  const required = [...NETWORK_ORDER].sort();
  if (keys.length !== required.length || keys.some((key, index) => key !== required[index])) {
    throw new TypeError("The validated configuration must contain Ethereum, Tron and Solana.");
  }

  const statements = [
    "-- ACROWN Genesis Programme: stage public receiving addresses only.",
    "-- Apply only to the dedicated acrown-supporters-mainnet D1 database after its identity is verified.",
    "-- This SQL does not enable a network, accept payments, create payment intents or verify custody/on-chain token state.",
    "-- Every staged address requires independent custody, token-decimal and dual-RPC verification before a separate enablement review.",
  ];
  for (const network of NETWORK_ORDER) {
    const item = validated[network];
    if (!item || typeof item.address !== "string" ||
        item.networkIdentifier !== GENESIS_TREASURY_NETWORKS[network].networkIdentifier ||
        item.tokenIdentifier !== GENESIS_TREASURY_NETWORKS[network].tokenIdentifier ||
        item.tokenDecimals !== 6) {
      throw new TypeError("The " + network + " configuration does not match the canonical USD₮ allowlist.");
    }
    statements.push(
      "UPDATE supporter_network_config SET " +
      "treasury_address=" + sqlString(item.address) + ", " +
      "enabled=0, decimals_verified_at=NULL, config_version=NULL, updated_at=unixepoch() " +
      "WHERE network=" + sqlString(network) +
      " AND network_identifier=" + sqlString(item.networkIdentifier) +
      " AND token_identifier=" + sqlString(item.tokenIdentifier) +
      " AND token_decimals=6;"
    );
  }
  statements.push(
    "SELECT network, CASE WHEN treasury_address IS NULL THEN 'MISSING' ELSE 'STAGED_FORMAT_CHECK_ONLY' END AS address_state, " +
    "enabled FROM supporter_network_config ORDER BY network;"
  );
  return statements.join("\n\n") + "\n";
}

async function readStdin() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input;
}

async function main() {
  const raw = await readStdin();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Standard input must contain valid JSON with ethereum, tron and solana public addresses.");
  }
  const validated = await validateTreasuryAddressInput(parsed);
  process.stdout.write(
    "ADDRESS FORMAT CHECKS PASSED. This does not prove wallet control or mainnet token state.\n" +
    "The SQL below stages addresses while keeping all three networks disabled.\n\n" +
    generateTreasuryConfigSql(validated)
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write("Treasury address preparation stopped: " + String(error?.message || error) + "\n");
    process.exitCode = 1;
  });
}

import { MAINNET_USDT_CONFIG } from "../../../supporter-programme/shared/mainnet-config.mjs";
import { GENESIS_QUALIFYING_RULES_VERSION } from "../../../supporter-programme/shared/entitlement-rules.mjs";
import { genesisQualifyingPaymentGate } from "../../../supporter-programme/shared/genesis-payment-policy.mjs";

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

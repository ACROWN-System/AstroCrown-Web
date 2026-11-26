import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";

const origin = String(process.env.ASTROCROWN_LOCAL_WORKER_ORIGIN || "http://localhost:8787").replace(/\/$/, "");
const wallet = privateKeyToAccount("0x0000000000000000000000000000000000000000000000000000000000000001");
const unrelatedWallet = privateKeyToAccount("0x0000000000000000000000000000000000000000000000000000000000000002");
const unregisteredWallet = privateKeyToAccount("0x0000000000000000000000000000000000000000000000000000000000000003");

async function post(path, payload, cookie) {
  const headers = {
    "Origin": origin,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(origin + path, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify(payload),
  });
  let body;
  try { body = await response.json(); }
  catch { throw new Error(path + " returned a non-JSON response (" + response.status + ")."); }
  return { response, body };
}

function sessionCookie(response) {
  const raw = response.headers.get("set-cookie") || "";
  const pair = raw.split(";")[0];
  if (!/^acrown_account_session=[A-Za-z0-9_-]{30,}$/.test(pair)) {
    throw new Error("The wallet authentication response did not issue the expected HttpOnly account session cookie.");
  }
  if (!/HttpOnly/i.test(raw) || !/SameSite=Strict/i.test(raw)) {
    throw new Error("The account session cookie is missing HttpOnly or SameSite=Strict.");
  }
  return pair;
}

async function sign(challenge, signer = wallet) {
  return signer.signMessage({ message: challenge.message });
}

async function challenge(intent, signer = wallet) {
  const payload = intent === "register"
    ? {
        intent, network: "ethereum", address: signer.address,
        termsAccepted: true, termsVersion: "development-terms-2026-10-31-v0.3",
        referralId: "",
      }
    : { intent, network: "ethereum", address: signer.address };
  const result = await post("/api/wallet-auth/challenge", payload);
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.intent, intent);
  assert.equal(result.body.network, "ethereum");
  assert.equal(result.response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(result.response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(result.response.headers.get("x-frame-options"), "DENY");
  assert.equal(result.response.headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=()");
  assert.equal(result.response.headers.get("strict-transport-security"), "max-age=31536000; includeSubDomains");
  assert.equal(result.body.transactionAuthorized, false);
  assert.match(result.body.message, /Chain ID: 1/);
  assert.match(result.body.message, /off-chain message signature only/);
  return result.body;
}

const wrongOrigin = await fetch(origin + "/api/wallet-auth/challenge", {
  method: "POST",
  headers: {
    "Origin": "https://untrusted.invalid",
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  body: JSON.stringify({
    intent: "register", network: "ethereum", address: wallet.address,
    termsAccepted: true, termsVersion: "development-terms-2026-10-31-v0.3",
  }),
});
assert.equal(wrongOrigin.status, 403, "a foreign origin must not issue an account wallet challenge");

const invalidTerms = await post("/api/wallet-auth/challenge", {
  intent: "register", network: "ethereum", address: wallet.address,
  termsAccepted: true, termsVersion: "stale-terms",
});
assert.equal(invalidTerms.response.status, 400, "stale Terms version must fail closed");

const failedChallenge = await challenge("register");
const wrongSignature = await sign(failedChallenge, unrelatedWallet);
const wrongProof = await post("/api/wallet-auth/verify", {
  intent: "register", challengeId: failedChallenge.challengeId, signature: wrongSignature,
});
assert.equal(wrongProof.response.status, 401, "a different wallet must not register the requested address");
const replayAfterFailure = await post("/api/wallet-auth/verify", {
  intent: "register", challengeId: failedChallenge.challengeId,
  signature: await sign(failedChallenge),
});
assert.equal(replayAfterFailure.response.status, 410, "a failed signature must still consume its challenge");

const registrationChallenge = await challenge("register");
const registration = await post("/api/wallet-auth/verify", {
  intent: "register",
  challengeId: registrationChallenge.challengeId,
  signature: await sign(registrationChallenge),
});
assert.equal(registration.response.status, 200, JSON.stringify(registration.body));
assert.equal(registration.body.authenticated, true);
assert.equal(registration.body.authMethod, "primary-wallet");
assert.equal(registration.body.primaryWallet.address.toLowerCase(), wallet.address.toLowerCase());
assert.equal(registration.body.transactionAuthorized, false);
assert.match(registration.body.accountIdentifier, /^AC-[A-F0-9]{10}$/);
assert.match(registration.body.memberName, /^Crown_[A-F0-9]{10}$/);
const registrationCookie = sessionCookie(registration.response);

const accountStatusResponse = await fetch(origin + "/api/account/status", {
  headers: { Cookie: registrationCookie, Accept: "application/json" },
  cache: "no-store",
});
assert.equal(accountStatusResponse.status, 200);
const accountStatus = await accountStatusResponse.json();
assert.equal(accountStatus.authenticated, true);
assert.equal(accountStatus.authMethod, "primary-wallet");
assert.equal(accountStatus.primaryWallet.network, "ethereum");
assert.equal(accountStatus.primaryWallet.recoveryModel, "wallet-provider-recovery-only");
assert.equal(accountStatus.securityManagementAvailable, false);
assert.equal(Object.prototype.hasOwnProperty.call(accountStatus, "passkeyCount"), false);
assert.equal(Object.prototype.hasOwnProperty.call(accountStatus, "recoveryKeyAvailable"), false);
assert.equal(accountStatus.adminRoleAssigned, false);
assert.equal(accountStatus.memberName, registration.body.memberName);
assert.match(accountStatus.memberName, /^Crown_[A-F0-9]{10}$/);

const unchangedName = await post("/api/account/member-name/check", {
  memberName: accountStatus.memberName,
}, registrationCookie);
assert.equal(unchangedName.response.status, 200, JSON.stringify(unchangedName.body));
assert.equal(unchangedName.body.available, true);
assert.equal(unchangedName.body.unchanged, true);

const invalidName = await post("/api/account/member-name/check", {
  memberName: "bad name",
}, registrationCookie);
assert.equal(invalidName.response.status, 400, "invalid member names must be rejected");

const candidateMemberName = "AstroMember_" + accountStatus.accountIdentifier.slice(-4);
const firstAvailability = await post("/api/account/member-name/check", {
  memberName: candidateMemberName,
}, registrationCookie);
assert.equal(firstAvailability.response.status, 200, JSON.stringify(firstAvailability.body));
assert.equal(firstAvailability.body.available, true);
assert.equal(firstAvailability.body.unchanged, false);

const secondRegistrationChallenge = await challenge("register", unrelatedWallet);
const secondRegistration = await post("/api/wallet-auth/verify", {
  intent: "register",
  challengeId: secondRegistrationChallenge.challengeId,
  signature: await sign(secondRegistrationChallenge, unrelatedWallet),
});
assert.equal(secondRegistration.response.status, 200, JSON.stringify(secondRegistration.body));
assert.match(secondRegistration.body.memberName, /^Crown_[A-F0-9]{10}$/);
const secondRegistrationCookie = sessionCookie(secondRegistration.response);
const secondAvailability = await post("/api/account/member-name/check", {
  memberName: candidateMemberName,
}, secondRegistrationCookie);
assert.equal(secondAvailability.response.status, 200, JSON.stringify(secondAvailability.body));
assert.equal(secondAvailability.body.available, true);

const appliedName = await post("/api/account/member-name/apply", {
  memberName: candidateMemberName,
}, registrationCookie);
assert.equal(appliedName.response.status, 200, JSON.stringify(appliedName.body));
assert.equal(appliedName.body.memberName, candidateMemberName);

const nameCollision = await post("/api/account/member-name/apply", {
  memberName: candidateMemberName,
}, secondRegistrationCookie);
assert.equal(nameCollision.response.status, 409, "the database unique index must reject a simultaneous name claim");

const caseInsensitiveCollision = await post("/api/account/member-name/check", {
  memberName: candidateMemberName.toLowerCase(),
}, secondRegistrationCookie);
assert.equal(caseInsensitiveCollision.response.status, 200);
assert.equal(caseInsensitiveCollision.body.available, false, "member names must be unique regardless of case");

const updatedStatusResponse = await fetch(origin + "/api/account/status", {
  headers: { Cookie: registrationCookie, Accept: "application/json" },
  cache: "no-store",
});
assert.equal(updatedStatusResponse.status, 200);
assert.equal((await updatedStatusResponse.json()).memberName, candidateMemberName);

const duplicateRegistration = await post("/api/wallet-auth/challenge", {
  intent: "register", network: "ethereum", address: wallet.address,
  termsAccepted: true, termsVersion: "development-terms-2026-10-31-v0.3",
});
assert.equal(duplicateRegistration.response.status, 409, "one wallet cannot register two ordinary accounts");

const unknownLogin = await post("/api/wallet-auth/challenge", {
  intent: "login", network: "ethereum", address: unregisteredWallet.address,
});
assert.equal(unknownLogin.response.status, 404, "an unregistered wallet cannot create an account by signing in");

const loginChallenge = await challenge("login");
const login = await post("/api/wallet-auth/verify", {
  intent: "login",
  challengeId: loginChallenge.challengeId,
  signature: await sign(loginChallenge),
});
assert.equal(login.response.status, 200, JSON.stringify(login.body));
assert.equal(login.body.authenticated, true);
assert.equal(login.body.authMethod, "primary-wallet");
assert.equal(login.body.accountIdentifier, registration.body.accountIdentifier);
const loginCookie = sessionCookie(login.response);

const replayLogin = await post("/api/wallet-auth/verify", {
  intent: "login",
  challengeId: loginChallenge.challengeId,
  signature: await sign(loginChallenge),
});
assert.equal(replayLogin.response.status, 410, "a login challenge must be single-use");

const logout = await post("/api/account/logout", {}, loginCookie);
assert.equal(logout.response.status, 200);
const signedOut = await fetch(origin + "/api/account/status", { cache: "no-store" });
assert.equal(signedOut.status, 200);
assert.equal((await signedOut.json()).authenticated, false);

console.log("Primary-wallet account API E2E passed: EIP-191 registration/sign-in, account uniqueness, origin-bound challenge, signature rejection, replay rejection, HttpOnly session, status hydration and logout.");

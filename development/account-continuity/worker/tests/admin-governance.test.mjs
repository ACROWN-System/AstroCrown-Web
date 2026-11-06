import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAdminPermissions,
  validateAdminReason,
} from "../src/index.js";

test("administrator permission validation accepts only the explicit permission vocabulary", () => {
  assert.deepEqual(validateAdminPermissions(undefined), []);
  assert.deepEqual(validateAdminPermissions([]), []);
  assert.deepEqual(
    validateAdminPermissions(["admin.roles.revoke", "admin.roles.grant"]),
    ["admin.roles.grant", "admin.roles.revoke"]
  );
});

test("administrator permission validation rejects client-invented roles and permissions", () => {
  for (const value of [
    null,
    "admin.roles.grant",
    ["admin"],
    ["owner"],
    ["admin.roles.grant", "admin.roles.grant"],
    ["admin.roles.grant", "admin.messages.broadcast"],
    ["admin.roles.grant", "admin.roles.revoke", "admin.messages.send", "extra"],
  ]) {
    assert.throws(() => validateAdminPermissions(value), error => error.status === 400);
  }
});

test("administrator change reasons are normalized and control characters are removed", () => {
  assert.equal(
    validateAdminReason("  Assign reviewed role\nfor support  "),
    "Assign reviewed rolefor support"
  );
  assert.equal(validateAdminReason("Reason with\tspacing"), "Reason withspacing");
});

test("administrator change reasons reject empty, non-string and overlong values", () => {
  for (const value of [undefined, null, "", "  ", 12, "x".repeat(501)]) {
    assert.throws(() => validateAdminReason(value), error => error.status === 400);
  }
});

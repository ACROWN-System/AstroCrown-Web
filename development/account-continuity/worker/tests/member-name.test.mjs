import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultMemberName, normalizeMemberName, MEMBER_NAME_RULES } from "../src/member-name.js";

test("member names are normalized to NFKC, trimmed and compared case-insensitively", () => {
  assert.deepEqual(normalizeMemberName("  Bradford_7  "), {
    memberName: "Bradford_7",
    normalized: "bradford_7",
  });
  assert.equal(normalizeMemberName("BRADFORD_7").normalized, "bradford_7");
});

test("member names enforce length and character rules", () => {
  for (const invalid of [
    "", "ab", "1Bradford", "_Bradford", "Brad ford",
    "Bradford-7", "Bradford.7", "ThisMemberNameIsTooLong",
    "Bradford\n", "Bradford@",
  ]) {
    assert.equal(normalizeMemberName(invalid), null, JSON.stringify(invalid));
  }
  assert.equal(MEMBER_NAME_RULES.minLength, 3);
  assert.equal(MEMBER_NAME_RULES.maxLength, 20);
});

test("reserved platform identities cannot be claimed", () => {
  for (const reserved of ["admin", "administrator", "astrocrown", "genesis", "moderator", "nova", "official", "support", "system"]) {
    assert.equal(normalizeMemberName(reserved), null, reserved);
  }
});

test("each account receives a default member name derived from its unique account identifier", () => {
  assert.equal(createDefaultMemberName("AC-7A91C2E4D0"), "Crown_7A91C2E4D0");
  assert.match(createDefaultMemberName("AC-7A91C2E4D0"), /^[A-Za-z][A-Za-z0-9_]{2,19}$/);
  assert.throws(() => createDefaultMemberName("not-an-account-id"), /valid AstroCrown account identifier/);
});

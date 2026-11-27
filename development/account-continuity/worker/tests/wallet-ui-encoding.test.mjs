import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const accountUiPath = new URL("../../prototype/account-ui.js", import.meta.url);

test("Solana wallet signatures are converted to unpadded Base64URL", async () => {
  const source = await readFile(accountUiPath, "utf8");
  const match = source.match(/function encodeBase64urlBytes\(bytes\) \{[\s\S]*?\n  \}/);
  assert.ok(match, "the account UI must retain its tested Base64URL encoder");

  const encode = vm.runInNewContext("(" + match[0] + ")", { btoa });
  // These bytes encode to standard Base64 "+///"; Base64URL must be "-___".
  assert.equal(encode(Uint8Array.from([251, 255, 255])), "-___");
  assert.match(encode(Uint8Array.from([1, 2, 3])), /^[A-Za-z0-9_-]+$/);
});

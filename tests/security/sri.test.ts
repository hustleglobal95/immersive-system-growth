import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { SriSecurityViolationError, verifyBytesAgainstSri } from "../../src/security/sri";

test("tampered WASM binary hash is rejected",async()=>{
  const bytes=Buffer.from("forge-wasm-fixture");
  const entry={
    bytes:bytes.byteLength,
    sha384:"sha384-"+createHash("sha384").update(bytes).digest("base64"),
    sha512:"sha512-"+createHash("sha512").update(bytes).digest("base64"),
    kind:"decoder" as const,
  };
  await verifyBytesAgainstSri("/decoders/draco/test.wasm",bytes,entry);
  const tampered=Buffer.from(bytes);
  tampered[0]^=0xff;
  await assert.rejects(
    ()=>verifyBytesAgainstSri("/decoders/draco/test.wasm",tampered,entry),
    (error:unknown)=>error instanceof SriSecurityViolationError && /hash mismatch|byte length mismatch/.test(error.message),
  );
});

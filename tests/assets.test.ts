import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// @ts-expect-error Dependency-free CLI library intentionally also runs as JavaScript.
import { auditAssets } from "../scripts/asset-audit-lib.mjs";
test("missing references and nested over-budget assets fail", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "forge-audit-"));
  try {
    fs.mkdirSync(path.join(root, "public/models/nested"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "public/models/nested/large.glb"),
      Buffer.alloc(2048),
    );
    const r = auditAssets(
      root,
      {
        models: [{ path: "/models/missing.glb", bytes: 1 }],
        textures: [],
        hdr: [],
        video: [],
        budgets: {
          modelMb: 0.001,
          textureMb: 1,
          hdrMb: 1,
          videoMb: 1,
          totalMb: 0.001,
        },
      },
      [{ heroModel: "/models/unregistered.glb" }],
    );
    assert.equal(r.totalBytes, 2048);
    assert.ok(r.errors.some((s: string) => s.includes("Missing asset")));
    assert.ok(r.errors.some((s: string) => s.includes("exceeds")));
    assert.ok(r.errors.some((s: string) => s.includes("not registered")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

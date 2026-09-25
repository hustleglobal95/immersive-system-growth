// Independent check of the exported N01 GLBs against clients/nocturne/n01-spec.json.
// Verifies hierarchy, per-node meshes/materials/normals, authored pivots, body bounds and spec provenance.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const specPath = path.join(root, "clients/nocturne/n01-spec.json");
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
const specSha = crypto.createHash("sha256").update(fs.readFileSync(specPath)).digest("hex").slice(0, 16);
const files = process.argv.slice(2).length ? process.argv.slice(2) : ["public/models/nocturne/n01.glb", "public/models/nocturne/n01-low.glb"];

function readGlb(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  const jsonLength = buf.readUInt32LE(12);
  return { json: JSON.parse(buf.subarray(20, 20 + jsonLength).toString("utf8")), bytes: buf.length };
}

let failed = false;
for (const file of files) {
  const errors = [];
  const { json, bytes } = readGlb(path.join(root, file));
  const nodes = json.nodes ?? [];
  const byName = new Map(nodes.map((n, i) => [n.name, { ...n, index: i }]));
  const parentOf = new Map();
  nodes.forEach((n, i) => (n.children ?? []).forEach((c) => parentOf.set(c, i)));

  const rootNode = byName.get("N01_ROOT");
  if (!rootNode) errors.push("missing N01_ROOT");
  else if (rootNode.extras?.n01_spec_sha !== specSha) errors.push(`GLB built from spec ${rootNode.extras?.n01_spec_sha}, current spec is ${specSha}; rebuild`);

  for (const [parent, kids] of Object.entries(spec.hierarchy)) {
    for (const kid of kids) {
      const node = byName.get(kid);
      if (!node) { errors.push(`missing node ${kid}`); continue; }
      const p = parentOf.get(node.index);
      if (nodes[p]?.name !== parent) errors.push(`${kid}: parent ${nodes[p]?.name} != ${parent}`);
    }
  }

  const translation = (name) => {
    let v = [0, 0, 0];
    for (let n = byName.get(name); n; n = nodes[parentOf.get(n.index)] && byName.get(nodes[parentOf.get(n.index)].name)) {
      if (n.rotation && n.rotation.some((c, i) => Math.abs(c - [0, 0, 0, 1][i]) > 1e-6)) errors.push(`${n.name}: rest rotation must be identity`);
      if (n.scale && n.scale.some((c) => Math.abs(c - 1) > 1e-6)) errors.push(`${n.name}: rest scale must be 1`);
      v = v.map((c, i) => c + (n.translation?.[i] ?? 0));
    }
    return v;
  };

  const bodyMin = [Infinity, Infinity, Infinity];
  const bodyMax = [-Infinity, -Infinity, -Infinity];
  for (const [name, expected] of Object.entries(spec.materials)) {
    const node = byName.get(name);
    if (!node) continue;
    const mesh = json.meshes?.[node.mesh];
    if (!mesh) { errors.push(`${name}: no mesh`); continue; }
    const mats = [...new Set(mesh.primitives.map((p) => json.materials?.[p.material]?.name))];
    if (JSON.stringify(mats) !== JSON.stringify(expected)) errors.push(`${name}: materials ${mats} != ${expected}`);
    for (const prim of mesh.primitives) {
      if (prim.attributes.NORMAL === undefined) errors.push(`${name}: primitive without NORMAL`);
      if (["SHELL_TOP", "SHELL_LOWER", "GLASS_CORE"].includes(name)) {
        const acc = json.accessors[prim.attributes.POSITION];
        const t = translation(name);
        acc.min.forEach((c, i) => (bodyMin[i] = Math.min(bodyMin[i], c + t[i])));
        acc.max.forEach((c, i) => (bodyMax[i] = Math.max(bodyMax[i], c + t[i])));
      }
    }
  }

  // glTF is Y-up: width = X, height = Y, depth = Z
  const dims = { width: bodyMax[0] - bodyMin[0], height: bodyMax[1] - bodyMin[1], depth: bodyMax[2] - bodyMin[2] };
  const tol = spec.targets.toleranceM;
  for (const [k, target] of [["width", spec.targets.bodyWidth], ["depth", spec.targets.bodyDepth], ["height", spec.targets.bodyHeight]]) {
    if (Math.abs(dims[k] - target) > tol) errors.push(`body ${k} ${(dims[k] * 1000).toFixed(1)} mm vs ${target * 1000} mm`);
  }

  const lower = byName.get("SHELL_LOWER");
  const hingeX = translation("SHELL_LOWER")[0];
  if (JSON.stringify(lower?.extras?.hingeAxis) !== JSON.stringify([0, 0, -1])) errors.push("SHELL_LOWER: hingeAxis extras missing or wrong");
  if (!(hingeX < bodyMin[0] + 0.08)) errors.push(`SHELL_LOWER pivot x=${hingeX.toFixed(3)} is not at the short-end hinge`);
  const grip = translation("GRIP");
  const top = translation("SHELL_TOP");
  if (grip.some((c, i) => Math.abs(c - top[i]) > 1e-4)) errors.push("SHELL_TOP pivot must coincide with the grip axis");
  if (Math.hypot(grip[0], grip[2]) < 0.02) errors.push("grip must be off-centre");

  const budget = spec.targets.maxGlbBytes ?? 12 * 1024 ** 2;
  if (bytes > budget) errors.push(`${bytes} bytes exceeds ${budget}`);

  console.log(`${file}: ${errors.length ? "FAIL" : "PASS"} · ${(bytes / 1024).toFixed(0)} KiB · body ${(dims.width * 1000).toFixed(0)}×${(dims.depth * 1000).toFixed(0)}×${(dims.height * 1000).toFixed(0)} mm · hinge x ${(hingeX * 1000).toFixed(0)} mm · grip (${(grip[0] * 1000).toFixed(0)}, ${(-grip[2] * 1000).toFixed(0)}) mm`);
  errors.forEach((e) => console.log(`  - ${e}`));
  failed ||= errors.length > 0;
}
process.exit(failed ? 1 : 0);

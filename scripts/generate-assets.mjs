// Original procedural reference assets, released under the repository MIT license.
import fs from "node:fs";
import crypto from "node:crypto";
function cube() {
  const p = [],
    n = [],
    ix = [];
  for (const [normal, u, v] of [
    [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    [
      [-1, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
    ],
    [
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 0],
    ],
    [
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ],
    [
      [0, 0, 1],
      [1, 0, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, -1],
      [0, 1, 0],
      [1, 0, 0],
    ],
  ]) {
    const start = p.length / 3;
    for (const [a, b] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      p.push(...normal.map((x, i) => (x + u[i] * a + v[i] * b) / 2));
      n.push(...normal);
    }
    ix.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  return { p, n, ix };
}
function lathe(segments) {
  const profile = [
      [0, -0.5],
      [0.48, -0.5],
      [0.5, -0.4],
      [0.5, 0.4],
      [0.45, 0.5],
      [0, 0.5],
    ],
    p = [],
    n = [],
    ix = [];
  for (let k = 0; k < profile.length; k++)
    for (let j = 0; j <= segments; j++) {
      const a = (j / segments) * Math.PI * 2,
        [r, y] = profile[k];
      p.push(Math.cos(a) * r, y, Math.sin(a) * r);
      const before = profile[Math.max(0, k - 1)],
        after = profile[Math.min(profile.length - 1, k + 1)],
        dy = after[1] - before[1],
        dr = after[0] - before[0],
        length = Math.hypot(dy, dr) || 1;
      n.push(
        (Math.cos(a) * dy) / length,
        -dr / length,
        (Math.sin(a) * dy) / length,
      );
      if (k < profile.length - 1 && j < segments) {
        const x = k * (segments + 1) + j;
        ix.push(
          x,
          x + segments + 1,
          x + 1,
          x + 1,
          x + segments + 1,
          x + segments + 2,
        );
      }
    }
  return { p, n, ix };
}
const palettes = {
  pavilion: [
    [0.75, 0.69, 0.57, 1],
    [0.15, 0.19, 0.16, 1],
    [0.8, 0.35, 0.1, 1],
  ],
  automotive: [
    [0.07, 0.23, 0.42, 1],
    [0.04, 0.04, 0.05, 1],
    [0.62, 0.68, 0.72, 1],
  ],
  restaurant: [
    [0.85, 0.83, 0.76, 1],
    [0.23, 0.35, 0.12, 1],
    [0.65, 0.22, 0.08, 1],
  ],
  product: [
    [0.07, 0.09, 0.11, 1],
    [0.83, 0.47, 0.15, 1],
    [0.3, 0.36, 0.38, 1],
  ],
  saas: [
    [0.12, 0.16, 0.3, 1],
    [0.16, 0.6, 0.72, 1],
    [0.64, 0.35, 0.8, 1],
  ],
};
function parts(name) {
  if (name === "pavilion")
    return [
      ["floor", [0, -1.2, 0], [6, 0.15, 6], 0],
      ["roof", [0, 1.6, 0], [6.4, 0.18, 6.4], 0],
      ["left-wall", [-3, 0.2, 0], [0.15, 2.8, 6], 0],
      ["right-wall", [3, 0.2, 0], [0.15, 2.8, 6], 0],
      ["back-wall", [0, 0.2, -3], [6, 2.8, 0.15], 1],
      ["front-left", [-2.15, 0.2, 3], [1.7, 2.8, 0.15], 0],
      ["front-right", [2.15, 0.2, 3], [1.7, 2.8, 0.15], 0],
      ["door", [0, 0.1, 3], [2.6, 2.6, 0.12], 2],
      ["bench", [1.7, -0.65, -1], [1.6, 0.8, 0.65], 2],
      ["plinth", [-1.6, -0.8, -1], [0.7, 0.7, 0.7], 0],
    ];
  if (name === "automotive")
    return [
      ["chassis", [0, -0.6, 0], [2.1, 0.6, 4], 0],
      ["cabin", [0, 0.05, -0.35], [1.7, 0.8, 2.1], 0],
      ["windscreen", [0, 0.12, 0.72], [1.6, 0.6, 0.06], 1],
      ...[-1, 1].flatMap((x) =>
        [-1.25, 1.25].map((z) => [
          "wheel",
          [x, -0.8, z],
          [0.45, 0.65, 0.65],
          1,
        ]),
      ),
      ["lights", [0, -0.35, 2.02], [1.75, 0.12, 0.03], 2],
    ];
  if (name === "restaurant")
    return [
      ["plate", [0, -0.95, 0], [3.2, 0.18, 3.2], 0, "round"],
      ["dish", [0, -0.66, 0], [1.8, 0.5, 1.8], 2, "round"],
      ["garnish", [0.2, -0.32, 0], [0.9, 0.2, 0.75], 1, "round"],
      ["fork", [1.9, -0.92, 0], [0.12, 0.08, 2.2], 0],
    ];
  if (name === "product")
    return [
      ["base", [0, -0.9, 0], [1.4, 0.4, 1.4], 2, "round"],
      ["body", [0, 0, 0], [1.15, 1.8, 1.15], 0, "round"],
      ["band", [0, 0.2, 0], [1.2, 0.18, 1.2], 1, "round"],
      ["cap", [0, 1, 0], [1.2, 0.25, 1.2], 1, "round"],
    ];
  return [
    ["screen", [0, 0, 0], [3.2, 2, 0.2], 0],
    ["card-left", [-0.75, 0.25, 0.2], [1.1, 0.9, 0.15], 1],
    ["card-right", [0.65, 0.25, 0.35], [1.1, 0.9, 0.15], 2],
    ["bar", [0, -0.55, 0.2], [2.6, 0.18, 0.1], 1],
    ["foot", [0, -1.15, 0], [0.6, 0.3, 0.6], 0],
  ];
}
function generate(name, low = false) {
  const chunks = [],
    views = [],
    accessors = [];
  let offset = 0;
  const doc = {
    asset: { version: "2.0", generator: "Forge original reference fixture" },
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
    meshes: [],
    materials: palettes[name].map((baseColorFactor) => ({
      pbrMetallicRoughness: {
        baseColorFactor,
        metallicFactor: name === "automotive" ? 0.6 : 0.15,
        roughnessFactor: 0.5,
      },
    })),
    bufferViews: views,
    accessors,
  };
  function accessor(values, componentType, type) {
    const a =
      componentType === 5126
        ? new Float32Array(values)
        : new Uint16Array(values);
    const b = Buffer.from(a.buffer);
    const padding = (4 - (b.length % 4)) % 4;
    const view = views.length;
    views.push({ buffer: 0, byteOffset: offset, byteLength: b.length });
    chunks.push(b, Buffer.alloc(padding));
    offset += b.length + padding;
    const size = type === "VEC3" ? 3 : 1;
    const min = Array.from({ length: size }, (_, i) =>
        Math.min(...values.filter((_, j) => j % size === i)),
      ),
      max = Array.from({ length: size }, (_, i) =>
        Math.max(...values.filter((_, j) => j % size === i)),
      );
    accessors.push({
      bufferView: view,
      componentType,
      count: values.length / size,
      type,
      min,
      max,
    });
    return accessors.length - 1;
  }
  const shapes = [cube(), lathe(low ? 12 : 48)].map((g) => ({
    attributes: {
      POSITION: accessor(g.p, 5126, "VEC3"),
      NORMAL: accessor(g.n, 5126, "VEC3"),
    },
    indices: accessor(g.ix, 5123, "SCALAR"),
  }));
  const selectedParts = parts(name).filter(([label])=>!low || !["bench","plinth","lights","foot"].includes(label));
  for (const [label, translation, scale, material, shape] of selectedParts) {
    const mesh = doc.meshes.length;
    doc.meshes.push({
      primitives: [{ ...shapes[shape === "round" ? 1 : 0], material }],
    });
    doc.nodes.push({ name: label, mesh, translation, scale });
    doc.scenes[0].nodes.push(doc.nodes.length - 1);
  }
  if (name === "pavilion") {
    const node = doc.nodes.findIndex((n) => n.name === "door");
    doc.animations = [
      {
        name: "door-slide",
        samplers: [
          {
            input: accessor([0, 1], 5126, "SCALAR"),
            output: accessor([0, 0.1, 3, -2.7, 0.1, 3], 5126, "VEC3"),
            interpolation: "LINEAR",
          },
        ],
        channels: [{ sampler: 0, target: { node, path: "translation" } }],
      },
    ];
  }
  doc.buffers = [{ byteLength: offset }];
  const json = Buffer.from(JSON.stringify(doc)),
    jp = Buffer.alloc((4 - (json.length % 4)) % 4, 32),
    bin = Buffer.concat(chunks),
    header = Buffer.alloc(12),
    jh = Buffer.alloc(8),
    bh = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + jp.length + 8 + bin.length, 8);
  jh.writeUInt32LE(json.length + jp.length);
  jh.writeUInt32LE(0x4e4f534a, 4);
  bh.writeUInt32LE(bin.length);
  bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jh, json, jp, bh, bin]);
}
fs.mkdirSync("public/models/reference", { recursive: true });
const manifest = {
  models: [],
  textures: [],
  hdr: [],
  video: [],
  budgets: { modelMb: 12, textureMb: 5, hdrMb: 12, videoMb: 20, totalMb: 45 },
};
for (const name of Object.keys(palettes))
  for (const low of [false, true]) {
    const data = generate(name, low),
      path = `/models/reference/${name}${low ? "-low" : ""}.glb`;
    fs.writeFileSync("public" + path, data);
    manifest.models.push({
      path,
      bytes: data.length,
      sha256: crypto.createHash("sha256").update(data).digest("hex"),
    });
  }
fs.writeFileSync(
  "config/asset-manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  "Generated ten original GLB reference assets and content manifest.",
);

import fs from "node:fs";
const base = JSON.parse(fs.readFileSync("config/experience.json", "utf8"));
const definitions = {
  "real-estate": {
    name: "Pavilion — A spatial property journey",
    model: "pavilion",
    positions: [
      [0, 0.35, 10],
      [0.3, 0.3, 6],
      [0, 0.2, 4],
      [0, 0.2, 1],
      [1, 0.35, 0],
      [1, 1, 6],
      [0, 0.6, 10],
    ],
    targets: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, -2],
      [0, 0, -2],
      [0, 0, 0],
      [0, 0, 0],
    ],
    ranges: [0, 0.16, 0.3, 0.46, 0.65, 0.83, 1],
    paths: ["dolly", "arc", "threshold", "crane", "pullback", "dolly"],
    labels: ["Arrival", "Approach", "Threshold", "Interior", "Reveal", "Visit"],
    heads: [
      "A place to pause.",
      "Approach with purpose.",
      "An entrance that opens with you.",
      "Space for everyday life.",
      "See the complete picture.",
      "Explore your next project.",
    ],
    bodies: [
      "Follow one continuous journey through an original architectural pavilion.",
      "The same building stays in the world as the camera approaches its entrance.",
      "Scroll forward to open the door, or back to close it. The door is an embedded GLB animation.",
      "The room, furniture and exterior belong to one persistent scene.",
      "An exterior view reconnects the interior details with the larger building.",
      "Use the scene lab to inspect and adapt this reference for your own property.",
    ],
    color: "#e5ab68",
    static: true,
  },
  automotive: {
    name: "Velocity — Automotive reference",
    model: "automotive",
    positions: [
      [4, 1, 7],
      [2, 0.7, 4],
      [-3, 0.8, 3],
      [-1, 0.1, 2],
      [2, 1, 0],
      [4, 2, 5],
      [0, 0.7, 7],
    ],
    ranges: [0, 0.12, 0.29, 0.43, 0.64, 0.86, 1],
    paths: ["arc", "orbit", "macro", "crane", "flyby", "pullback"],
    labels: ["Silhouette", "Profile", "Detail", "Cabin", "Road", "Discover"],
    heads: [
      "Motion begins with form.",
      "Every line has a purpose.",
      "Move closer to the details.",
      "A different perspective.",
      "Designed for the journey.",
      "Make the next move.",
    ],
    color: "#73b8e8",
  },
  restaurant: {
    name: "At the table — Restaurant reference",
    model: "restaurant",
    positions: [
      [0, 3.5, 5],
      [2, 2.5, 3],
      [0, 1.7, 2.2],
      [-2, 1.7, 3],
      [-1, 3, 4],
      [0, 4, 5],
      [0, 2.8, 6],
    ],
    ranges: [0, 0.2, 0.35, 0.52, 0.72, 0.88, 1],
    paths: ["crane", "macro", "arc", "swoop", "pullback", "dolly"],
    labels: [
      "Welcome",
      "Preparation",
      "The dish",
      "At the table",
      "Finish",
      "Reserve",
    ],
    heads: [
      "A story served slowly.",
      "Begin with the ingredients.",
      "Give the dish its moment.",
      "Gather around the table.",
      "Stay for the last course.",
      "Bring your story to the table.",
    ],
    color: "#c2c96e",
  },
  product: {
    name: "Form — Product reference",
    model: "product",
    positions: [
      [0, 0.5, 6],
      [2, 0.7, 4],
      [1, 0.3, 2],
      [-1, 0.8, 3],
      [-2, 1, 4],
      [0, 1.5, 5],
      [0, 0.4, 6],
    ],
    ranges: [0, 0.18, 0.32, 0.49, 0.69, 0.85, 1],
    paths: ["dolly", "macro", "arc", "orbit", "crane", "pullback"],
    labels: ["Form", "Surface", "Detail", "Perspective", "Reveal", "Explore"],
    heads: [
      "One object. Many perspectives.",
      "Let the surface speak.",
      "Focus on what matters.",
      "Reveal another side.",
      "Return to the whole.",
      "Make the reference your own.",
    ],
    color: "#efb06a",
  },
  saas: {
    name: "Signal — Spatial interface reference",
    model: "saas",
    positions: [
      [0, 0.4, 7],
      [1, 0.3, 5],
      [-1, 0.4, 3],
      [1.5, 0.6, 4],
      [-1.5, 1, 5],
      [0, 1.5, 6],
      [0, 0.3, 7],
    ],
    ranges: [0, 0.15, 0.31, 0.48, 0.67, 0.82, 1],
    paths: ["dolly", "arc", "threshold", "flyby", "crane", "pullback"],
    labels: [
      "Signal",
      "Workspace",
      "Interface",
      "Connections",
      "Insight",
      "Start",
    ],
    heads: [
      "Turn information into understanding.",
      "Make room for the work.",
      "Bring the important details closer.",
      "See how the pieces connect.",
      "Step back with clarity.",
      "Build your next experience.",
    ],
    color: "#7fcfe0",
  },
};
for (const [key, d] of Object.entries(definitions)) {
  const c = structuredClone(base);
  c.meta = {
    name: d.name,
    description: `Original ${key} cinematic reference with real GLB loading, accessible content and responsive camera choreography.`,
    themeColor: d.color,
    backgroundColor: "#080b10",
  };
  c.runtime = { ...c.runtime, maxPixels: 4000000, preloadMb: 20 };
  c.stage = "minimal";
  c.heroVisible = !d.static;
  c.heroModel = d.static ? "" : `/models/reference/${d.model}.glb`;
  c.heroLowModel = d.static?undefined:`/models/reference/${d.model}-low.glb`;
  c.assets = d.static
    ? [
        {
          id: "pavilion",
          kind: "model",
          url: "/models/reference/pavilion.glb",
          lowUrl: "/models/reference/pavilion-low.glb",
          persist: true,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: 1,
          animation: { sceneId: "threshold", clip: "door-slide" },
        },
      ]
    : [];
  const targets = d.targets ?? Array.from({ length: 7 }, () => [0, 0, 0]);
  const heroStates = Array.from({ length: 7 }, (_, i) => ({
    position: [0, key === "restaurant" ? Math.sin(i * 0.7) * 0.08 : 0, 0],
    rotation: [0, d.static ? 0 : key === "restaurant" ? i * 0.1 : i * 0.18, 0],
    scale: d.static ? 1 : 1 + Math.sin(i * 0.6) * 0.08,
  }));
  c.scenes = d.labels.map((label, i) => {
    const from = {
        position: d.positions[i],
        target: targets[i],
        fov: key === "restaurant" ? 42 : 46,
      },
      to = {
        position: d.positions[i + 1],
        target: targets[i + 1],
        fov: key === "restaurant" ? 42 : 46,
      };
    const mobile = (s) => ({
      ...s,
      position: s.position.map(
        (v, k) => s.target[k] + (v - s.target[k]) * (d.static ? 1 : 1.5),
      ),
      fov: 60,
    });
    return {
      id: d.static
        ? ["arrival", "approach", "threshold", "interior", "reveal", "finale"][
            i
          ]
        : label.toLowerCase().replaceAll(" ", "-"),
      label,
      range: [d.ranges[i], d.ranges[i + 1]],
      easing: "cinematic",
      camera: { path: d.paths[i], from, to },
      mobileCamera: { path: d.paths[i], from: mobile(from), to: mobile(to) },
      hero: {
        motion: d.static
          ? "linear"
          : ["linear", "handoff", "rise", "linear", "spiral", "linear"][i],
        from: heroStates[i],
        to: heroStates[i + 1],
      },
      world: {
        background: [
          "#080b10",
          "#10151b",
          "#141b20",
          "#151b21",
          "#0d131c",
          "#080b10",
        ][i],
        fog: "#080b10",
        fogDensity: 0.012 + i * 0.001,
        ambient: 0.65 + (key === "restaurant" ? 0.2 : 0) + i * 0.04,
        key: 3.2 + i * 0.25,
        rim: 1.2 + i * 0.1,
      },
      post: { bloom: 0.12 + i * 0.015, vignette: 0.2 },
      copy: {
        eyebrow: label.toUpperCase(),
        headline: d.heads[i],
        body:
          d.bodies?.[i] ??
          `A ${label.toLowerCase()} view of this original ${key} reference. Scroll in either direction to explore its form, materials and composition.`,
        align: i === 5 ? "center" : i % 2 ? "right" : "left",
        ...(i === 5
          ? { cta: { label: "Open the scene lab", href: "/lab" } }
          : {}),
      },
    };
  });
  c.hotspots = [
    {
      id: "construction",
      sceneId: c.scenes[3].id,
      label: d.static ? "Inside the pavilion" : "About this reference",
      description: d.static
        ? "The doorway is an embedded animation. Camera motion and the sliding door follow one reversible timeline."
        : "This original GLB is a working reference asset. Replace it with optimized project artwork using the documented model contract.",
      position: d.static ? [1, 0.2, -1] : [0.9, 0.3, 0],
    },
  ];
  fs.writeFileSync(`recipes/${key}.json`, JSON.stringify(c, null, 2) + "\n");
  if (key === "real-estate")
    fs.writeFileSync(
      "config/experience.json",
      JSON.stringify(c, null, 2) + "\n",
    );
}
console.log(
  "Generated five distinct recipes; default is the animated pavilion.",
);

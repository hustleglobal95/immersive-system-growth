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
  "burger-showcase": {
    name: "Ember Bun — Fire-built burger story",
    model: "burger",
    description: "Original product-assembly restaurant experience with named ingredients, semantic menu modules and reversible scroll choreography.",
    background: "#120805",
    fov: 40,
    positions: [
      [0, 0.3, 8],
      [0.6, 0.45, 5.2],
      [2.1, 1.2, 5.8],
      [0, 0.7, 7.5],
      [-2.2, 0.5, 6.5],
      [-1.2, 2.3, 6.8],
      [0, 1.1, 8],
    ],
    ranges: [0, 0.18, 0.38, 0.52, 0.76, 0.92, 1],
    paths: ["macro", "arc", "pullback", "subject-orbit", "crane", "pullback"],
    labels: ["Arrival", "Ingredients", "Signature", "Menu", "Meal", "Order"],
    heads: [
      "Built hot. Served without compromise.",
      "Every layer earns its place.",
      "The stack is the signature.",
      "Pick your fire.",
      "Make it a full table.",
      "Your order is ready.",
    ],
    bodies: [
      "A complete product hero begins one continuous restaurant journey.",
      "Scroll separates every named ingredient without breaking the product identity.",
      "The product passes through a bold editorial brand moment and rebuilds in reverse.",
      "A semantic menu stays usable while the burger moves into a supporting composition.",
      "The camera lowers with the product to create a table-level meal reveal.",
      "Cinematic motion resolves into a clear, accessible conversion action.",
    ],
    heroStates: [
      { position: [0.9, -0.05, 0], rotation: [0.05, -0.18, 0], scale: 1.02 },
      { position: [0.7, 0, 0], rotation: [0.03, 0.08, 0], scale: 1.08 },
      { position: [0.3, -0.1, 0], rotation: [0, 0.32, 0], scale: 0.92 },
      { position: [0, 0, 0], rotation: [0, 0, 0], scale: 0.82 },
      { position: [-1.55, 0, 0], rotation: [0, -0.24, 0], scale: 0.72 },
      { position: [-1.1, -0.35, 0], rotation: [0.02, 0.18, 0], scale: 0.76 },
      { position: [-1.5, -0.4, 0], rotation: [0, 0.08, 0], scale: 0.64 },
    ],
    worlds: ["#120805", "#1a0905", "#e4481d", "#120805", "#1c0d08", "#f1dfc7"],
    color: "#f15a24",
  },
};
for (const [key, d] of Object.entries(definitions)) {
  const c = structuredClone(base);
  c.meta = {
    name: d.name,
    description: d.description ?? `Original ${key} cinematic reference with real GLB loading, accessible content and responsive camera choreography.`,
    themeColor: d.color,
    backgroundColor: d.background ?? "#080b10",
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
  const heroStates = d.heroStates ?? Array.from({ length: 7 }, (_, i) => ({
    position: [0, key === "restaurant" ? Math.sin(i * 0.7) * 0.08 : 0, 0],
    rotation: [0, d.static ? 0 : key === "restaurant" ? i * 0.1 : i * 0.18, 0],
    scale: d.static ? 1 : 1 + Math.sin(i * 0.6) * 0.08,
  }));
  c.scenes = d.labels.map((label, i) => {
    const from = {
        position: d.positions[i],
        target: targets[i],
        fov: d.fov ?? (key === "restaurant" ? 42 : 46),
      },
      to = {
        position: d.positions[i + 1],
        target: targets[i + 1],
        fov: d.fov ?? (key === "restaurant" ? 42 : 46),
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
        background: d.worlds?.[i] ?? [
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
  if (key === "burger-showcase") {
    const nodes = [
      "bottom-bun",
      "patty-bottom",
      "cheese-bottom",
      "lettuce",
      "tomato",
      "patty-top",
      "cheese-top",
      "onion",
      "top-bun",
    ];
    const peaks = {
      "bottom-bun": [0, -2.2, 0.2],
      "patty-bottom": [-0.18, -1.5, -0.05],
      "cheese-bottom": [0.42, -0.86, 0.24],
      lettuce: [-0.38, -0.24, -0.18],
      tomato: [0.32, 0.52, 0.12],
      "patty-top": [-0.16, 1.18, -0.12],
      "cheese-top": [0.44, 1.82, 0.2],
      onion: [-0.34, 2.45, -0.08],
      "top-bun": [0.16, 3.25, 0.14],
    };
    const zero = [0, 0, 0];
    const tracks = nodes.map((node) => ({
      node,
      property: "position",
      mode: "offset",
      keyframes: [
        { at: 0, value: zero },
        { at: 0.18, value: zero },
        { at: 0.34, value: peaks[node], easing: "cinematic" },
        { at: 0.43, value: peaks[node] },
        { at: 0.52, value: zero, easing: "cinematic" },
        { at: 1, value: zero },
      ],
    }));
    tracks.push(
      {
        node: "top-bun",
        property: "rotation",
        mode: "offset",
        keyframes: [
          { at: 0, value: zero },
          { at: 0.18, value: zero },
          { at: 0.36, value: [0.08, 0.7, -0.08], easing: "cinematic" },
          { at: 0.43, value: [0.08, 0.78, -0.08] },
          { at: 0.52, value: zero },
          { at: 1, value: zero },
        ],
      },
      {
        node: "cheese-top",
        property: "rotation",
        mode: "offset",
        keyframes: [
          { at: 0, value: zero },
          { at: 0.18, value: zero },
          { at: 0.36, value: [0.1, -0.5, 0.16], easing: "cinematic" },
          { at: 0.43, value: [0.1, -0.5, 0.16] },
          { at: 0.52, value: zero },
          { at: 1, value: zero },
        ],
      },
    );
    c.productRig = { nodes, tracks };
    c.scenes[0].blocks = [{
      id: "arrival-note",
      type: "statement",
      accent: "Flame grilled",
      title: "One hero product. One uninterrupted story.",
      body: "The model, typography, lighting and conversion path all follow the same scroll position.",
    }];
    c.scenes[1].blocks = [{
      id: "ingredient-note",
      type: "statement",
      accent: "Named-node choreography",
      title: "Bun. Onion. Cheese. Patty. Every piece remains controllable.",
    }];
    c.scenes[2].blocks = [{
      id: "signature-band",
      type: "brand-band",
      text: "EMBER BUN",
      repeats: 4,
    }];
    c.scenes[3].blocks = [{
      id: "main-menu",
      type: "menu-grid",
      title: "House stacks",
      items: [
        { name: "The Ember", description: "Double beef, charred onion, sharp cheddar and ember sauce.", price: "$14", badge: "Signature" },
        { name: "Hot Honey", description: "Crisp chicken, hot honey glaze, pickles and shredded lettuce.", price: "$13" },
        { name: "Smokehouse", description: "Double beef, smoked gouda, onion jam and pepper sauce.", price: "$15" },
        { name: "Garden Fire", description: "Griddled vegetable patty, tomato, lettuce and herb sauce.", price: "$12" },
      ],
    }];
    c.scenes[4].blocks = [{
      id: "meal-note",
      type: "statement",
      accent: "Complete the table",
      title: "Add crisp fries, house sauce and a cold drink.",
      body: "The product becomes part of the environment instead of disappearing between sections.",
    }];
    c.scenes[5].blocks = [{
      id: "order-card",
      type: "order-card",
      title: "Ember meal",
      items: [
        { label: "The Ember", value: "$14" },
        { label: "Crisp fries", value: "$4" },
        { label: "House drink", value: "$3" },
      ],
      total: "$21",
      cta: { label: "Choose a location", href: "#order" },
    }];
    delete c.scenes[5].copy.cta;
  }
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
  if (key === "burger-showcase")
    fs.writeFileSync(
      "config/experience.json",
      JSON.stringify(c, null, 2) + "\n",
    );
}
console.log(
  "Generated six distinct recipes; default is the product-rig burger showcase.",
);

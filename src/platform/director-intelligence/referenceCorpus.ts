import type { DirectorTreatment } from "@/src/platform/directorSchema";

export type ImmersiveReferenceEvidenceLevel =
  | "catalog"
  | "public-description"
  | "public-case-study"
  | "technical-reference";

export interface ImmersiveReference {
  id: string;
  title: string;
  source: string;
  industry: string;
  access: "free" | "premium";
  evidenceLevel: ImmersiveReferenceEvidenceLevel;
  reviewedAt: string;
  confidence: number;
  observedTraits: string[];
  transferableLessons: string[];
  constructionPatternIds: string[];
  evidenceNotes: string[];
  doNotCopy: string[];
}

const REVIEWED_AT = "2026-09-18";
const GETLAYERS = "https://www.getlayers.ai/layer/";

type CatalogSeed = readonly [
  title: string,
  slug: string,
  industry: string,
  access: "free" | "premium",
];

const catalogSeeds: CatalogSeed[] = [
  ["Lumora", "lumora", "Agency / Studio", "free"],
  ["Kimi", "kimi", "Sports / Education", "free"],
  ["Soda", "soda", "E-commerce", "free"],
  ["Laocoon", "laocoon", "Portfolio", "free"],
  ["Baseline", "baseline", "Sports / Education", "free"],
  ["Northwall", "northwall", "Agency / Studio", "premium"],
  ["House", "house", "Agency / Studio", "premium"],
  ["Halden", "halden", "E-commerce", "premium"],
  ["Longplay", "longplay", "Agency / Studio", "premium"],
  ["Brewns", "brewns", "Hospitality / Travel", "premium"],
  ["Artefakt", "artefakt", "E-commerce", "premium"],
  ["AI Studio", "ai-studio", "AI / Tech", "premium"],
  ["Wanderlust", "wanderlust", "Hospitality / Travel", "premium"],
  ["Vesper", "vesper", "SaaS", "premium"],
  ["AI Creator", "ai-creator", "AI / Tech", "premium"],
  ["Stride", "stride", "Fintech", "premium"],
  ["New Era", "new-era", "Health / Science", "premium"],
  ["Codescan", "codescan", "Agency / Studio", "premium"],
  ["Creative Director", "creative-director", "Portfolio", "premium"],
  ["Auralis", "auralis", "Agency / Studio", "premium"],
  ["Dantora", "dantora", "Health / Science", "premium"],
  ["Aerra", "aerra", "Hospitality / Travel", "premium"],
  ["Altitude", "altitude", "Hospitality / Travel", "premium"],
  ["Forma", "forma", "Agency / Studio", "premium"],
  ["Lumea", "lumea", "Agency / Studio", "premium"],
  ["Evolve", "evolve", "AI / Tech", "premium"],
  ["Clarix", "clarix", "AI / Tech", "premium"],
  ["Fromzero", "fromzero", "Agency / Studio", "premium"],
  ["Noema", "noema", "Agency / Studio", "premium"],
  ["Helion", "helion", "Agency / Studio", "premium"],
  ["Stride Nine", "stride-nine", "Sports / Education", "premium"],
  ["Lumen", "lumen", "Fintech", "premium"],
  ["Voxelia", "voxelia", "Sports / Education", "premium"],
  ["GringX", "gringx", "AI / Tech", "premium"],
  ["Negantropy", "negantropy", "Health / Science", "premium"],
  ["Vexon", "vexon", "AI / Tech", "premium"],
  ["Stackside", "stackside", "Fintech", "premium"],
  ["Dringle", "dringle", "Agency / Studio", "premium"],
  ["Cortex", "cortex", "AI / Tech", "premium"],
  ["Halcyon", "halcyon", "E-commerce", "premium"],
  ["Creative Studio", "creative-studio", "Agency / Studio", "premium"],
  ["Clair", "clair", "AI / Tech", "premium"],
  ["Neural Monitor", "neural-monitor", "Health / Science", "premium"],
  ["Loopstack", "loopstack", "hero", "free"],
  ["Ascend", "ascend", "SaaS", "free"],
  ["Flowstate", "flowstate", "SaaS", "free"],
  ["Marcus Vane", "marcus-vane", "Portfolio", "free"],
  ["Gravity", "gravity", "Agency / Studio", "free"],
  ["Kai Nomura", "kai-nomura", "Portfolio", "free"],
];

type DeepEvidence = Pick<
  ImmersiveReference,
  | "evidenceLevel"
  | "confidence"
  | "observedTraits"
  | "transferableLessons"
  | "constructionPatternIds"
  | "evidenceNotes"
>;

const deepEvidence: Record<string, DeepEvidence> = {
  lumora: {
    evidenceLevel: "public-case-study",
    confidence: 0.78,
    observedTraits: [
      "Large hero brand watermark establishes identity at display scale.",
      "Gallery shifts between dark and light tonal states instead of holding one visual density throughout.",
      "Statistics are treated as animated editorial proof rather than a plain utility row.",
    ],
    transferableLessons: [
      "Let one oversized brand signal establish the page's visual authority before smaller interface elements arrive.",
      "Use tonal state changes between chapters to create pacing and reset attention without changing the whole design language.",
      "Treat proof sections as part of the motion composition rather than a static interruption.",
    ],
    constructionPatternIds: [
      "anchor-section-sets-system",
      "density-rhythm-and-silence",
      "type-media-countermotion",
    ],
    evidenceNotes: [
      "Public third-party build report describing the Lumora base template and its dark/light gallery and count-up statistics.",
      "The case study's later custom video-inside-type hero is not attributed to the base template and is intentionally excluded.",
    ],
  },
  baseline: {
    evidenceLevel: "public-description",
    confidence: 0.92,
    observedTraits: [
      "Premium sports/education landing page built around deep court-blue, confident typography and calm scroll pacing.",
      "Coaching, courts and pedigree are revealed one beat at a time.",
      "The public description does not identify a 3D/WebGL requirement.",
    ],
    transferableLessons: [
      "Immersion can come from art direction, pacing and information sequencing without a heavy WebGL scene.",
      "Reveal evidence one beat at a time when the brand depends on pedigree and confidence rather than spectacle.",
      "Category-specific color and type can carry more identity than generic visual effects.",
    ],
    constructionPatternIds: [
      "immersive-without-webgl",
      "density-rhythm-and-silence",
      "single-signature-peak",
    ],
    evidenceNotes: [
      "Official GetLayers public description: calm scroll reveals coaching, courts and pedigree one beat at a time.",
    ],
  },
  loopstack: {
    evidenceLevel: "public-description",
    confidence: 0.94,
    observedTraits: [
      "Dark full-frame stage with an organic flower response behind typography.",
      "A glowing cursor is treated as a visible interaction character instead of generic pointer decoration.",
      "One responsive visual motif does most of the atmospheric work.",
    ],
    transferableLessons: [
      "A single responsive background motif can make a hero immersive while keeping readable DOM typography dominant.",
      "Cursor response should have a clear visual role and identity, not merely add noise.",
      "Let the interactive field sit behind language so effect intensity does not compete with the message.",
    ],
    constructionPatternIds: [
      "responsive-organic-backdrop",
      "interactive-field-restraint",
      "dom-webgl-contract",
    ],
    evidenceNotes: [
      "Official GetLayers public description: black canvas, flower blooming behind words, glowing cursor.",
    ],
  },
  ascend: {
    evidenceLevel: "public-description",
    confidence: 0.96,
    observedTraits: [
      "A living Earth persists behind a SaaS landing page rather than appearing as a disconnected 3D demo.",
      "City lights, clouds and radar pings layer detail onto one primary world.",
      "The planet sinks and swings with scroll, tying the 3D subject to page progression.",
      "Mint-lit interface and deep-space world coexist through controlled contrast.",
    ],
    transferableLessons: [
      "Use one persistent world under semantic interface when a single subject can carry the whole narrative.",
      "Reposition or reframe the persistent subject across scroll instead of resetting it between sections.",
      "Layer small environmental details onto the same subject before adding more unrelated objects.",
      "A light UI can sit over a dark spatial world when framing and contrast are deliberately controlled.",
    ],
    constructionPatternIds: [
      "single-world-under-interface",
      "continuous-visual-anchor",
      "dom-webgl-contract",
      "scroll-reposition-not-reset",
    ],
    evidenceNotes: [
      "Official GetLayers public description explicitly names Three.js/React and describes Earth motion with scroll.",
    ],
  },
  clarix: {
    evidenceLevel: "technical-reference",
    confidence: 0.9,
    observedTraits: [
      "Logo-particle scroll transforms use per-particle attributes plus one progress uniform, moving interpolation onto the GPU.",
      "The documented original scene used raw devicePixelRatio, an unconditional render loop, always-on mouse handling and shipped GUI; the optimization guide treats these as costs to correct.",
    ],
    transferableLessons: [
      "For large scroll-driven particle systems, encode per-particle data in attributes and drive animation with one normalized progress uniform.",
      "Visual ambition and production readiness are separate: tier DPR, gate render loops and remove authoring/debug UI from the shipped path.",
    ],
    constructionPatternIds: [
      "gpu-progress-transforms",
      "prewarm-signature-systems",
      "mobile-preserve-concept",
    ],
    evidenceNotes: [
      "Public Textura starter optimize-3d-scene skill cites Clarix's original implementation and its GPU progress pattern.",
      "This record describes technical construction evidence, not a full visual deconstruction of the premium template.",
    ],
  },
  helion: {
    evidenceLevel: "technical-reference",
    confidence: 0.93,
    observedTraits: [
      "Documented as a canonical source for device tiering, clamped DPR and frame budgets.",
      "Uses one shared animation ticker for the page.",
      "Uses in-view and hidden-tab render gating.",
      "Uses upstream scroll smoothing and explicit mobile retuning rather than deleting the scene.",
    ],
    transferableLessons: [
      "Centralize device tiering so DPR, frame budget, interaction and effect policy cannot drift apart.",
      "One shared ticker and visibility-gated rendering reduce background work without changing the creative concept.",
      "Translate the same visual idea to mobile with retuning rather than wholesale scene removal.",
    ],
    constructionPatternIds: [
      "adaptive-fidelity-not-removal",
      "prewarm-signature-systems",
      "mobile-preserve-concept",
    ],
    evidenceNotes: [
      "Public Textura starter optimize-3d-scene skill names Helion files as canonical optimized implementations.",
      "This is technical evidence rather than a full visual template deconstruction.",
    ],
  },
  stride: {
    evidenceLevel: "technical-reference",
    confidence: 0.9,
    observedTraits: [
      "Documented plain/vanilla Three scene uses visibility-gated rendering.",
      "GLB completion is followed by renderer compilation in the documented optimization path.",
    ],
    transferableLessons: [
      "Do not keep a WebGL scene rendering when it is not visible or useful.",
      "Compile scene programs after critical model resolution and before the user reaches the signature interaction.",
    ],
    constructionPatternIds: [
      "prewarm-signature-systems",
      "adaptive-fidelity-not-removal",
    ],
    evidenceNotes: [
      "Public Textura starter optimize-3d-scene skill cites Stride's chain scene as the canonical plain visibility-gated loop.",
      "This record is intentionally limited to technical evidence.",
    ],
  },
};

const defaultDoNotCopy = [
  "Exact palette",
  "Exact typeface",
  "Branded copy or assets",
  "Distinctive signature composition without a new client-specific reason",
  "A proprietary interaction sequence verbatim",
];

export const getLayersTemplateCorpus: ImmersiveReference[] = catalogSeeds.map(
  ([title, slug, industry, access]) => {
    const evidence = deepEvidence[slug];
    return {
      id: slug,
      title,
      source: GETLAYERS + slug,
      industry,
      access,
      evidenceLevel: evidence?.evidenceLevel ?? "catalog",
      reviewedAt: REVIEWED_AT,
      confidence: evidence?.confidence ?? 0.45,
      observedTraits: evidence?.observedTraits ?? [],
      transferableLessons: evidence?.transferableLessons ?? [],
      constructionPatternIds: evidence?.constructionPatternIds ?? [],
      evidenceNotes: evidence?.evidenceNotes ?? [
        "Current public GetLayers catalog confirms the template name and industry category only.",
        "No detailed construction traits are inferred until public description, visual review or technical evidence is available.",
      ],
      doNotCopy: defaultDoNotCopy,
    };
  },
);

export interface RetrievedImmersiveReference {
  reference: ImmersiveReference;
  score: number;
  reasons: string[];
}

export function retrieveImmersiveReferences(
  treatment: DirectorTreatment,
  limit = 6,
): RetrievedImmersiveReference[] {
  const territory = treatment.territories.find(
    (candidate) => candidate.id === treatment.selectedTerritoryId,
  );
  const query = [
    treatment.projectType,
    treatment.thesis,
    treatment.signatureMoment.name,
    treatment.signatureMoment.description,
    territory?.visualPremise ?? "",
    ...treatment.grammar.composition,
    ...treatment.grammar.motion,
    ...treatment.grammar.interaction,
    ...treatment.grammar.transitions,
    ...treatment.grammar.spatial,
  ]
    .join(" ")
    .toLowerCase();

  return getLayersTemplateCorpus
    .filter((reference) => reference.transferableLessons.length > 0)
    .map((reference) => {
      let score = reference.confidence * 0.35;
      const reasons: string[] = [];

      if (industryMatches(reference.industry, treatment.projectType)) {
        score += 1.25;
        reasons.push(`Category relevance: ${reference.industry}.`);
      }

      const searchable = [
        reference.title,
        reference.industry,
        ...reference.observedTraits,
        ...reference.transferableLessons,
        ...reference.constructionPatternIds,
      ]
        .join(" ")
        .toLowerCase();

      for (const token of significantTokens(query)) {
        if (searchable.includes(token)) score += 0.08;
      }

      if (
        reference.evidenceLevel === "public-description" ||
        reference.evidenceLevel === "technical-reference"
      ) {
        score += 0.2;
      }

      if (!industryMatches(reference.industry, treatment.projectType)) {
        reasons.push("Cross-domain construction precedent.");
      }
      reasons.push(
        `${reference.evidenceLevel} evidence, confidence ${reference.confidence.toFixed(2)}.`,
      );

      return {
        reference,
        score: Number(score.toFixed(3)),
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score || a.reference.id.localeCompare(b.reference.id))
    .slice(0, limit);
}

function significantTokens(value: string) {
  return Array.from(
    new Set(
      value
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 5),
    ),
  ).slice(0, 80);
}

function industryMatches(
  industry: string,
  projectType: DirectorTreatment["projectType"],
) {
  const mapping: Partial<Record<DirectorTreatment["projectType"], string[]>> = {
    brand: ["Agency / Studio", "Portfolio"],
    product: ["E-commerce", "AI / Tech"],
    property: ["Hospitality / Travel"],
    hospitality: ["Hospitality / Travel"],
    portfolio: ["Portfolio", "Agency / Studio"],
    saas: ["SaaS", "AI / Tech", "Fintech"],
    commerce: ["E-commerce"],
    campaign: ["Agency / Studio", "Portfolio"],
    automotive: ["E-commerce", "Agency / Studio"],
    fashion: ["E-commerce", "Portfolio"],
  };
  return (mapping[projectType] ?? []).includes(industry);
}

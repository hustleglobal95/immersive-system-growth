import type { ImmersiveReference } from "@/src/platform/director-intelligence/referenceCorpus";

export type ImmersiveConstructionLens =
  | "composition"
  | "motion-choreography"
  | "narrative-transition"
  | "camera-spatial"
  | "interaction"
  | "media"
  | "runtime-performance"
  | "asset-pipeline"
  | "responsive-accessibility"
  | "content-data-commerce"
  | "production-tooling"
  | "sound";

const lensMatchers: Array<{
  lens: ImmersiveConstructionLens;
  test: RegExp;
}> = [
  {
    lens: "sound",
    test: /(audio|sound)/,
  },
  {
    lens: "responsive-accessibility",
    test: /(mobile|responsive|reduced|accessib|semantic-input|medium-substitution)/,
  },
  {
    lens: "media",
    test: /(media|video|sequence|frame|scrub|360|image|film|shared-media)/,
  },
  {
    lens: "asset-pipeline",
    test: /(asset|source-structure|dcc|geometry|batch|instance|scan|texture|gltf|runtime-format|volumetric|character-system)/,
  },
  {
    lens: "runtime-performance",
    test: /(prewarm|render|performance|fidelity|freeze|worker|simulation|hot-path|neighborhood|activation|cull|resource|gpu|upload|compile)/,
  },
  {
    lens: "production-tooling",
    test: /(production|preset|tool|prototype|design-grid|grid-runtime|authoring|parity)/,
  },
  {
    lens: "content-data-commerce",
    test: /(content|data|commerce|proof|archive|timeline|cms|report|rational|personalization)/,
  },
  {
    lens: "interaction",
    test: /(interaction|gesture|input|cursor|physics|companion|presence|gamif|magnetic|pointer|drag|inspect)/,
  },
  {
    lens: "camera-spatial",
    test: /(camera|spatial|world|depth|diorama|threshold|portal|scene|3d|object-stage|environment|corridor)/,
  },
  {
    lens: "narrative-transition",
    test: /(transition|story|continuity|signature|pacing|cut|chapter|ritual|mode-switch|scroll-distance|branching)/,
  },
  {
    lens: "motion-choreography",
    test: /(motion|scroll|velocity|reposition|progress|animation|countermotion|procedural)/,
  },
  {
    lens: "composition",
    test: /(composition|editorial|layout|grid|type|typography|atmosphere|edge|anchor|density|subject|hero|gallery|split|interface|visual)/,
  },
];

export interface ImmersiveReferenceLensCoverage {
  lens: ImmersiveConstructionLens;
  referenceIds: string[];
  patternIds: string[];
}

/**
 * Construction lenses describe *what kind of problem* a precedent teaches.
 * They are intentionally independent of industry and studio.
 */
export function lensesForPatternId(
  patternId: string,
): ImmersiveConstructionLens[] {
  const normalized = patternId.toLowerCase();
  const lenses = lensMatchers
    .filter(({ test }) => test.test(normalized))
    .map(({ lens }) => lens);

  // Every pattern should contribute at least one retrieval/analysis dimension.
  return lenses.length ? unique(lenses) : ["composition"];
}

export function lensesForReference(
  reference: ImmersiveReference,
): ImmersiveConstructionLens[] {
  return unique(
    reference.constructionPatternIds.flatMap((patternId) =>
      lensesForPatternId(patternId),
    ),
  );
}

export function buildReferenceLensCoverage(
  references: ImmersiveReference[],
): ImmersiveReferenceLensCoverage[] {
  const buckets = new Map<
    ImmersiveConstructionLens,
    { referenceIds: string[]; patternIds: string[] }
  >();

  for (const reference of references) {
    for (const patternId of reference.constructionPatternIds) {
      for (const lens of lensesForPatternId(patternId)) {
        const bucket = buckets.get(lens) ?? {
          referenceIds: [],
          patternIds: [],
        };
        if (!bucket.referenceIds.includes(reference.id)) {
          bucket.referenceIds.push(reference.id);
        }
        if (!bucket.patternIds.includes(patternId)) {
          bucket.patternIds.push(patternId);
        }
        buckets.set(lens, bucket);
      }
    }
  }

  return Array.from(buckets.entries())
    .map(([lens, value]) => ({
      lens,
      referenceIds: value.referenceIds,
      patternIds: value.patternIds,
    }))
    .sort(
      (a, b) =>
        b.referenceIds.length - a.referenceIds.length ||
        a.lens.localeCompare(b.lens),
    );
}

function unique<T>(values: T[]) {
  return values.filter((value, index) => values.indexOf(value) === index);
}

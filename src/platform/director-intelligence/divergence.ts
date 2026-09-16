import { parseDirectorTreatment, type DirectorBrief, type DirectorTerritory, type DirectorTreatment } from "@/src/platform/directorSchema";

export type DivergenceOperator = "truth-amplification" | "inversion" | "constraint-as-concept" | "spatial-metaphor" | "temporal-metaphor" | "material-metaphor" | "interface-as-concept" | "evidence-led" | "cultural-analogy" | "radical-simplification" | "counterfactual" | "anti-category";

const defaultOperators: [DivergenceOperator, DivergenceOperator, DivergenceOperator] = ["truth-amplification", "anti-category", "interface-as-concept"];

function clampText(value: string, max: number) { return value.length <= max ? value : value.slice(0, max - 1).trimEnd() + "…"; }

function mutate(brief: DirectorBrief, territory: DirectorTerritory, operator: DivergenceOperator, index: number): DirectorTerritory {
  const truth = brief.differentiators[0] || brief.brandTruth;
  const constraint = brief.constraints[0] || "the project's real production constraints";
  const patches: Record<DivergenceOperator, { thesis: string; experience: string; signature: string }> = {
    "truth-amplification": { thesis: `Make ${truth} the organizing behavior of the entire experience, not a claim placed inside it.`, experience: `Every chapter must prove a different consequence of ${truth}; remove chapters that cannot.`, signature: `At the climax, ${truth} becomes physically legible through one irreversible visual or spatial transformation.` },
    inversion: { thesis: `Reject the category's expected presentation and make restraint itself prove ${truth}.`, experience: "Begin where competitors normally end, then withhold spectacle until evidence earns it.", signature: "The expected category reveal is deliberately refused, then replaced by a client-specific proof." },
    "constraint-as-concept": { thesis: `Turn ${constraint} into the rule that gives the experience its identity.`, experience: "Use the limitation consistently so it becomes authored restraint rather than compromise.", signature: "The limitation becomes the memorable gesture instead of being hidden." },
    "spatial-metaphor": { thesis: `Translate ${truth} into a spatial journey the visitor can feel rather than read.`, experience: "Structure chapters as physical states of the same metaphor, preserving spatial continuity.", signature: "The metaphor resolves in a single spatial transformation that changes the visitor's understanding." },
    "temporal-metaphor": { thesis: `Express ${truth} as change over time rather than as a static brand statement.`, experience: "Let each chapter advance one irreversible state change.", signature: "Time compresses or expands to reveal the full consequence of the thesis." },
    "material-metaphor": { thesis: `Make material behavior carry ${truth} before copy explains it.`, experience: "Move from raw state to resolved state through material transformation.", signature: "A surface, light or material transition becomes the proof of the concept." },
    "interface-as-concept": { thesis: `Make the interface itself demonstrate ${truth} with every major interaction.`, experience: "Navigation and interaction behavior must prove the idea instead of merely exposing content.", signature: "One interaction reorganizes the entire experience according to the brand truth." },
    "evidence-led": { thesis: `Build the experience around proof of ${truth}; emotion follows evidence rather than preceding it.`, experience: "Every chapter answers a credibility question with a visual or behavioral proof.", signature: "Multiple proof points collapse into one unavoidable conclusion at the climax." },
    "cultural-analogy": { thesis: `Borrow an organizing principle from another medium to express ${truth} without copying its surface style.`, experience: "Use cross-medium rhythm, sequencing or staging as the structural model.", signature: "The transferred principle becomes visible as a website-native gesture." },
    "radical-simplification": { thesis: `Remove everything that does not directly prove ${truth}; let one gesture carry the project.`, experience: "Use fewer chapters, fewer visual rules and stronger contrast between silence and proof.", signature: "One concentrated gesture receives the production effort normally spread across many effects." },
    counterfactual: { thesis: `Behave as if ${truth} were literally true inside the interface.`, experience: "Every system follows the counterfactual rule until the visitor understands the idea without explanation.", signature: "The interface reaches the logical extreme of the counterfactual at the climax." },
    "anti-category": { thesis: `Remove the category's most predictable visual behaviors and rebuild the experience from ${truth}.`, experience: "Keep only conventions that improve fluency; replace decorative category codes with client-specific evidence.", signature: "The signature moment demonstrates a behavior competitors could not credibly own." },
  };
  const patch = patches[operator];
  return {
    ...territory,
    id: `${territory.id}-${operator}`.slice(0, 72).replace(/[^a-z0-9-]/g, ""),
    name: clampText(`${territory.name} / ${operator.replace(/-/g, " ")}`, 180),
    oneLine: clampText(patch.thesis, 600),
    thesis: clampText(patch.thesis, 500),
    strategicReason: clampText(`${territory.strategicReason} Operator: ${operator}. ${patch.experience}`, 1600),
    experientialPremise: clampText(patch.experience, 1600),
    signatureMoment: clampText(patch.signature, 1600),
    risk: clampText(`${territory.risk} Divergence risk: the ${operator} device must remain grounded in the client brief.`, 600),
    scores: { ...territory.scores, distinctiveness: Math.min(10, territory.scores.distinctiveness + (index === 1 ? 1 : 0)), brandFit: Math.min(10, territory.scores.brandFit + (operator === "truth-amplification" ? 1 : 0)) },
  };
}

function lexicalDistance(a: string, b: string) {
  const tokens = (value: string) => new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 3));
  const left = tokens(a); const right = tokens(b); let common = 0; for (const token of left) if (right.has(token)) common++;
  const union = new Set([...left, ...right]).size; return union ? 1 - common / union : 0;
}

export function territoryDiversity(territories: DirectorTerritory[]) {
  const pairs: Array<{ pair: string; distance: number }> = [];
  for (let i = 0; i < territories.length; i++) for (let j = i + 1; j < territories.length; j++) pairs.push({ pair: `${territories[i].id} vs ${territories[j].id}`, distance: lexicalDistance(`${territories[i].thesis} ${territories[i].experientialPremise} ${territories[i].signatureMoment}`, `${territories[j].thesis} ${territories[j].experientialPremise} ${territories[j].signatureMoment}`) });
  const average = pairs.length ? pairs.reduce((sum, pair) => sum + pair.distance, 0) / pairs.length : 0;
  return { pairs, score: Number((average * 10).toFixed(1)), sufficient: average >= 0.52 };
}

export function divergeTreatment(brief: DirectorBrief, treatment: DirectorTreatment, operators: [DivergenceOperator, DivergenceOperator, DivergenceOperator] = defaultOperators) {
  const territories = treatment.territories.map((territory, index) => mutate(brief, territory, operators[index], index));
  const selectedIndex = treatment.territories.findIndex((territory) => territory.id === treatment.selectedTerritoryId);
  const next = parseDirectorTreatment({ ...treatment, territories, selectedTerritoryId: territories[Math.max(0, selectedIndex)].id, thesis: territories[Math.max(0, selectedIndex)].thesis, memoryStatement: `People will remember ${territories[Math.max(0, selectedIndex)].memory}.` });
  return { treatment: next, operators, diversity: territoryDiversity(territories) };
}

export function defendTerritory(territory: DirectorTerritory) {
  return {
    territoryId: territory.id,
    strongestReason: territory.strategicReason,
    answerToSkeptic: `The concept earns production only if its signature moment proves the thesis: ${territory.signatureMoment}`,
    subtraction: "Remove any chapter, effect or interaction that cannot be traced back to the thesis or business objective.",
    assetNeed: "Prioritize the single asset most critical to making the signature moment believable.",
  };
}

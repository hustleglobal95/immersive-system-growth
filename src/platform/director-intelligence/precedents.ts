import type { DirectorBrief } from "@/src/platform/directorSchema";
import type { CreativePrecedent, PrecedentRetrievalMode, RetrievedPrecedent } from "@/src/platform/director-intelligence/types";

export const seedPrecedents: CreativePrecedent[] = [
  {
    id: "museum-reveal-sequence",
    title: "Museum reveal sequence",
    industries: ["culture"], mediums: ["exhibition", "architecture"],
    objective: "Turn technical or historical material into progressive discovery.",
    designIssues: ["make detail desirable", "control revelation", "move from context to intimacy"],
    concept: "Knowledge is revealed spatially rather than explained all at once.",
    principles: ["progressive disclosure", "thresholds create meaning", "one hero artifact at a time"],
    formalDevices: ["dark-to-light threshold", "controlled sightlines", "macro-to-whole sequencing"],
    emotionalArc: ["curiosity", "orientation", "fascination", "revelation"],
    strongestDecision: "Reserve full visual access until visitors have enough context to value it.",
    transferableLessons: ["Delay complete reveal until proof has emotional context.", "Use spatial thresholds as narrative punctuation."],
    doNotCopy: ["gallery darkness", "museum labels", "specific display architecture"], evidence: [],
  },
  {
    id: "fashion-editorial-rhythm",
    title: "Fashion editorial rhythm",
    industries: ["fashion"], mediums: ["editorial", "photography"],
    objective: "Create desire through contrast, cropping and controlled repetition.",
    designIssues: ["create aspiration", "make material tactile", "balance hero and detail"],
    concept: "Rhythm comes from alternation between authority and intimacy.",
    principles: ["scale contrast", "strategic repetition", "silence between peaks"],
    formalDevices: ["full-bleed hero", "macro crop", "quiet whitespace", "hard editorial cut"],
    strongestDecision: "Use fewer images at larger scale so every image has a job.",
    transferableLessons: ["Alternate macro intimacy and full-object authority.", "Use blank space as pacing, not leftover layout."],
    doNotCopy: ["specific typeface", "monochrome palette", "magazine grid"], evidence: [],
  },
  {
    id: "cinematic-arrival",
    title: "Cinematic arrival grammar",
    industries: ["film", "hospitality"], mediums: ["film", "sound"],
    objective: "Make arrival feel like entering a different world.",
    designIssues: ["establish place", "create anticipation", "transition public to private"],
    concept: "The world changes gradually as the subject crosses thresholds.",
    principles: ["environmental continuity", "sound leads visual change", "hold before reveal"],
    formalDevices: ["stable horizon", "forward travel", "ambient sound transition", "light-temperature shift"],
    strongestDecision: "Change atmosphere before announcing destination.",
    transferableLessons: ["Use environmental change to communicate progression.", "Let sound and light carry transitions instead of UI effects."],
    doNotCopy: ["specific location", "cinematic grading", "film-shot timing"], evidence: [],
  },
  {
    id: "information-collapse",
    title: "Information design collapse",
    industries: ["technology", "publishing"], mediums: ["information-design", "interface"],
    objective: "Turn complexity into a legible sequence without hiding proof.",
    designIssues: ["explain complexity", "show causality", "support fast scanning"],
    concept: "Complexity becomes confidence when relationships are made visible in the right order.",
    principles: ["progressive disclosure", "cause before detail", "proof near claim"],
    formalDevices: ["state transition", "diagram-to-interface", "layer reveal"],
    strongestDecision: "Reveal only the information needed to understand the next state.",
    transferableLessons: ["Animate causality rather than decoration.", "Keep high-intent utility available while storytelling unfolds."],
    doNotCopy: ["dashboard chrome", "diagram styling", "specific data visualization"], evidence: [],
  },
  {
    id: "performance-restraint",
    title: "Performance through restraint",
    industries: ["automotive", "product"], mediums: ["film", "photography"],
    objective: "Communicate power without constant speed or aggression.",
    designIssues: ["signal performance", "preserve premium tone", "avoid category cliché"],
    concept: "Contained energy feels more powerful than continuous motion.",
    principles: ["stillness before acceleration", "detail as evidence", "one decisive release"],
    formalDevices: ["locked frame", "surface highlight", "single acceleration beat"],
    strongestDecision: "Spend most of the sequence withholding motion, then release once.",
    transferableLessons: ["Contrast creates perceived intensity.", "Proof can be quieter than category convention."],
    doNotCopy: ["dark studio", "rim lighting", "vehicle-specific framing"], evidence: [],
  },
  {
    id: "retail-gallery-curation",
    title: "Gallery-like retail curation",
    industries: ["retail", "art"], mediums: ["commerce", "exhibition"],
    objective: "Preserve desire while keeping purchasing utility obvious.",
    designIssues: ["balance storytelling and utility", "avoid catalog fatigue", "prioritize collection"],
    concept: "Commerce behaves like curation until intent becomes explicit.",
    principles: ["few hero products", "utility on demand", "hierarchy over inventory density"],
    formalDevices: ["collection chapters", "detail reveal", "persistent purchase path"],
    strongestDecision: "Separate browsing rhythm from transaction controls without hiding either.",
    transferableLessons: ["Use editorial hierarchy before grid density.", "Keep conversion controls direct when intent rises."],
    doNotCopy: ["gallery white", "product-card layout", "specific merchandising pattern"], evidence: [],
  },
];

function tokens(text: string) {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((token) => token.length > 2));
}

function scoreText(query: string, target: string) {
  const q = tokens(query); const t = tokens(target); if (!q.size || !t.size) return 0;
  let hit = 0; for (const token of q) if (t.has(token)) hit++;
  return hit / q.size;
}

export function retrievePrecedents(brief: DirectorBrief, library: CreativePrecedent[] = seedPrecedents, mode: PrecedentRetrievalMode = "problem", limit = 5): RetrievedPrecedent[] {
  const queryByMode: Record<PrecedentRetrievalMode, string> = {
    problem: `${brief.objective} ${brief.brandTruth} ${brief.differentiators.join(" ")}`,
    emotion: `${brief.audience} ${brief.objective}`,
    structure: `${brief.objective} ${brief.primaryAction}`,
    "medium-transfer": `${brief.brandTruth} ${brief.objective}`,
    "anti-reference": `${brief.projectType} ${brief.constraints.join(" ")}`,
    constraint: brief.constraints.join(" ") || brief.objective,
  };
  return library.map((precedent) => {
    const searchable = [precedent.objective, precedent.concept, ...precedent.designIssues, ...precedent.principles, ...precedent.transferableLessons, ...precedent.industries, ...precedent.mediums].filter(Boolean).join(" ");
    let score = scoreText(queryByMode[mode], searchable);
    const crossDomain = !precedent.industries.includes(brief.projectType);
    if (mode === "medium-transfer" && crossDomain) score += 0.2;
    if (mode === "anti-reference") score += precedent.doNotCopy.length * 0.01;
    const reasons = precedent.transferableLessons.slice(0, 2);
    if (crossDomain) reasons.push(`Cross-domain transfer from ${precedent.mediums.join(", ")}.`);
    return { precedent, score: Number(Math.min(1, score).toFixed(3)), reasons };
  }).sort((a, b) => b.score - a.score).slice(0, limit);
}

export function deconstructReference(label: string, lesson: string) {
  const clauses = lesson.split(/[.;]/).map((part) => part.trim()).filter(Boolean);
  const lower=lesson.toLowerCase();
  const evidenced=(terms:string[],fallback:string)=>terms.some((term)=>lower.includes(term))
    ? clauses.find((clause)=>terms.some((term)=>clause.toLowerCase().includes(term))) ?? lesson
    : fallback;
  const unknown="Not evidenced in the supplied reference lesson; leave open rather than inventing a style.";

  return {
    version:2 as const,
    label,
    evidenceScope:"brief-reference-lesson-only" as const,
    problem: clauses[0] ?? lesson,
    strongestPrinciple: clauses[1] ?? "Extract the underlying pacing, hierarchy or interaction principle, not the surface style.",
    emotionalEffect: clauses[2] ?? "Unknown; treat emotional effect as a hypothesis until reviewed.",
    transferableLesson: clauses.slice(0, 2).join("; ") || lesson,
    lenses:{
      composition:evidenced(["composition","grid","frame","space","layout","crop","scale"],unknown),
      typography:evidenced(["type","typography","headline","text","glyph","font"],unknown),
      camera:evidenced(["camera","lens","shot","horizon","orbit","dolly","crane","macro"],unknown),
      motion:evidenced(["motion","scroll","timing","easing","pace","reveal","animation"],unknown),
      color:evidenced(["color","palette","grade","temperature","contrast"],unknown),
      image:evidenced(["image","photo","film","video","crop","photography"],unknown),
      material:evidenced(["material","glass","metal","stone","fabric","surface","texture"],unknown),
      interaction:evidenced(["interaction","hover","drag","pointer","click","navigation","cursor"],unknown),
      transitions:evidenced(["transition","threshold","handoff","wipe","mask","cross"],unknown),
      density:evidenced(["density","dense","sparse","silence","whitespace","space"],unknown),
      narrative:evidenced(["story","narrative","journey","sequence","chapter","arrival"],unknown),
      signatureMechanism:evidenced(["signature","memorable","climax","moment","transformation"],unknown),
      mobile:evidenced(["mobile","phone","portrait","responsive","touch"],unknown),
    },
    transferRule:"Transfer the causal principle into Forge's own project-specific Creative DNA. Never transfer the reference's exact composition, palette, typeface or signature interaction as a bundle.",
    doNotCopy:["surface palette","typeface","distinctive composition","signature interaction","brand-owned asset","exact transition sequence"],
    similarityRisk:clauses.length<2 ? "high" : clauses.length<4 ? "medium" : "low",
    confidence:Number(Math.min(.9,.35+Math.min(5,clauses.length)*.1).toFixed(2)),
  };
}

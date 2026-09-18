import { parseDirectorBrief, type DirectorBrief } from "@/src/platform/directorSchema";
import type { AssetManifest } from "@/src/types/assets";
import type { AutonomyProjectType, AutonomyTier, InferredField, PromptIntelligencePacket } from "@/src/platform/autonomy/types";

type ProjectProfile = {
  type: AutonomyProjectType;
  signals: string[];
  audience: string;
  action: string;
  truth: string;
  differentiators: string[];
};

const profiles: ProjectProfile[] = [
  { type: "automotive", signals: ["car","automotive","vehicle","ev","electric sports car","supercar","sedan","suv","roadster"], audience: "Prospective drivers and enthusiasts comparing design, performance, engineering and ownership value.", action: "Explore the vehicle", truth: "Turn engineering and driving character into visible proof rather than generic speed spectacle.", differentiators: ["Engineering translated into experience","Recognizable vehicle character","Performance evidence before spectacle"] },
  { type: "property", signals: ["tower","residence","residences","real estate","property","condo","condominium","apartment","development","waterfront","penthouse"], audience: "Qualified buyers evaluating place, privacy, architecture, views, material quality and long-term value.", action: "Request a private presentation", truth: "Make the property's strongest spatial or lifestyle advantage felt before asking for inquiry.", differentiators: ["Place-specific value","Architectural proof","A credible sense of arrival and ownership"] },
  { type: "hospitality", signals: ["hotel","resort","stay","restaurant","hospitality","spa","retreat","destination","villa","booking"], audience: "Travelers deciding whether the destination feels distinctive enough to visit, stay or book.", action: "Book the experience", truth: "Make the destination's atmosphere and ritual of arrival tangible before presenting booking utility.", differentiators: ["Sense of place","Arrival as narrative","Atmosphere connected to conversion"] },
  { type: "fashion", signals: ["fashion","collection","runway","garment","apparel","couture","streetwear","lookbook","jewelry"], audience: "Style-aware visitors evaluating attitude, silhouette, detail, collection coherence and point of view.", action: "Explore the collection", truth: "Turn the collection's attitude into a visual and spatial system without burying the product.", differentiators: ["Distinctive silhouette and attitude","Editorial rhythm","Product remains legible through spectacle"] },
  { type: "commerce", signals: ["shop","store","ecommerce","e-commerce","buy","checkout","catalog","collection page","merch"], audience: "Shoppers who need desire, proof, choice and confidence before purchase.", action: "Shop the collection", truth: "Increase product desire and confidence without interfering with ordinary commerce tasks.", differentiators: ["Desire before decision","Proof before friction","Immersive storytelling with transaction clarity"] },
  { type: "saas", signals: ["saas","software","platform","dashboard","workflow","api","developer","infrastructure","cloud","ai company","startup"], audience: "Prospective customers who need to understand the product's value, mechanism and proof quickly enough to evaluate adoption.", action: "See how it works", truth: "Make a complex product feel simpler without replacing explanation with abstract technology cliches.", differentiators: ["Complexity made legible","Mechanism as proof","Conversion after understanding"] },
  { type: "portfolio", signals: ["portfolio","designer","artist","architect","photographer","creative studio","agency site","case studies","work showcase"], audience: "Prospective clients, collaborators and peers evaluating point of view, quality of work and credibility.", action: "View selected work", truth: "Foreground a distinct creative point of view while giving the work enough space to prove it.", differentiators: ["Point of view before decoration","Fewer stronger case-study moments","Work remains the evidence"] },
  { type: "campaign", signals: ["campaign","launch","microsite","activation","event","drop","promotion"], audience: "Campaign visitors who need an immediate premise, one memorable participatory or reveal moment, and a clear response.", action: "Enter the campaign", truth: "Concentrate energy around one memorable mechanism instead of spreading spectacle across every section.", differentiators: ["One protected campaign mechanism","Participation with purpose","Fast premise comprehension"] },
  { type: "product", signals: ["watch","product","device","headphone","speaker","camera","phone","furniture","chair","bottle","cosmetic","perfume","shoe","sneaker","mechanical"], audience: "Design-aware buyers comparing desire, craftsmanship, function, material quality and ownership value.", action: "Explore the product", truth: "Reveal why the object deserves attention through form, material, mechanism or use rather than decorative spectacle.", differentiators: ["Product as the visual anchor","Craft or mechanism as proof","One decisive signature reveal"] },
  { type: "brand", signals: ["brand","company","identity","manifesto","rebrand","story"], audience: "Visitors who need to understand what the brand stands for, why it is distinct and what action to take next.", action: "Explore the brand", truth: "Express one defensible brand truth through structure, typography, motion and interaction.", differentiators: ["One governing brand idea","Distinctive memory structure","Purposeful interaction"] },
];

const tierSignals: Array<{ tier: AutonomyTier; signals: string[] }> = [
  { tier: "flagship", signals: ["flagship","world-class","award","awwwards","full immersive world","brand world","best possible","hero campaign"] },
  { tier: "signature", signals: ["signature","immersive","cinematic","luxury","premium","high-end","interactive 3d","3d experience","launch experience"] },
  { tier: "immersive", signals: ["interactive","scroll story","storytelling","spatial","scroll-driven","scroll driven"] },
];

export function inferPromptIntelligence(input: { prompt: string; projectName: string; sceneCount: number; manifest: AssetManifest }): PromptIntelligencePacket {
  const sourcePrompt = normalize(input.prompt);
  const lower = sourcePrompt.toLowerCase();
  const ranked = profiles
    .map((profile) => ({ profile, score: scoreSignals(lower, profile.signals), matched: profile.signals.filter((signal) => hasSignal(lower,signal)) }))
    .sort((a,b) => b.score - a.score);
  const best = ranked[0];
  const fallback = profiles.find((profile) => profile.type === "brand")!;
  const profile = best.score > 0 ? best.profile : fallback;
  const typeConfidence = clamp(best.score > 0 ? 0.62 + Math.min(0.32, best.score * 0.08) : 0.48);
  const tier = inferTier(lower, input.manifest, input.sceneCount);
  const audience = makeField(profile.audience, typeConfidence - 0.08, "category-prior", best.matched, typeConfidence < 0.68);
  const action = makeField(profile.action, typeConfidence - 0.12, "category-prior", best.matched, true);
  const objective = makeField(objectiveFor(profile.type) + " Creative intent: " + sourcePrompt, 0.86, "prompt", [sourcePrompt], false);
  const brandTruth = makeField(profile.truth + " Working hypothesis from the prompt: " + stripLeadVerb(sourcePrompt) + ".", Math.max(0.5,typeConfidence - 0.15), "inference", [sourcePrompt], true);
  const assets = directorAssets(input.manifest);
  const differentiators = unique(profile.differentiators.concat(extractClaims(sourcePrompt))).slice(0,6);
  const constraints = [
    "Protect mobile meaning before preserving desktop rendering cost.",
    "Prefer existing registered assets before inventing production cost.",
    "Current project contains " + input.sceneCount + " scenes and " + assets.length + " registered production assets.",
    "Every proposed scene must include an explicit asset strategy and reversible production path.",
  ];
  const brief: DirectorBrief = parseDirectorBrief({
    projectName: input.projectName,
    projectType: profile.type,
    tier: tier.value,
    client: input.projectName,
    audience: audience.value,
    objective: objective.value,
    primaryAction: action.value,
    brandTruth: brandTruth.value,
    differentiators,
    constraints,
    existingAssets: assets,
    references: [],
  });
  return {
    version: 1,
    sourcePrompt,
    brief,
    projectType: makeField(profile.type, typeConfidence, best.score > 0 ? "prompt" : "category-prior", best.matched.length ? best.matched : ["No strong category signal; brand fallback used."], typeConfidence < 0.68),
    tier,
    audience,
    objective,
    primaryAction: action,
    brandTruth,
    differentiators,
    constraints,
    unknowns: [
      "Exact brand guidelines and prohibited visual territory are not verified.",
      "The final commercial conversion action is inferred until confirmed.",
      "Any product, property or performance claim not present in the prompt or registered evidence remains unverified.",
    ],
    hypotheses: [
      "Project type inferred as " + profile.type + ".",
      "Primary audience inferred from " + profile.type + " category behavior.",
      "Creative brand truth is a hypothesis derived from the prompt, not a verified client claim.",
    ],
    researchNeeds: [
      "Verify the brand/product truth behind the working hypothesis.",
      "Identify owned visual or verbal assets that competitors cannot credibly use.",
      "Check category cliches before final territory lock.",
    ],
    categorySignals: best.matched,
    recommendedMedia: inferMedia(lower,input.manifest),
    confidence: average([typeConfidence,tier.confidence,audience.confidence,objective.confidence,action.confidence,brandTruth.confidence]),
  };
}

function inferTier(lower: string, manifest: AssetManifest, sceneCount: number): InferredField<AutonomyTier> {
  for (const item of tierSignals) {
    const matched = item.signals.filter((signal) => hasSignal(lower,signal));
    if (matched.length) return makeField(item.tier, item.tier === "flagship" ? 0.82 : 0.78, "prompt", matched, false);
  }
  const rich = manifest.models.length > 0 || manifest.video.length > 0 || sceneCount >= 7;
  return makeField(rich ? "immersive" : "cinematic", rich ? 0.66 : 0.7, "project-state", [rich ? "Existing project state supports a richer experience." : "No explicit high-production signal found."], true);
}

function inferMedia(lower: string, manifest: AssetManifest): PromptIntelligencePacket["recommendedMedia"] {
  const rows: Array<{ medium: PromptIntelligencePacket["recommendedMedia"][number]; signals: string[] }> = [
    { medium: "real-3d", signals: ["3d","model","orbit","explode","exploded","assembly","mechanism","walkthrough","interior","environment"] },
    { medium: "depth-image", signals: ["photo","image","photography","portrait","depth","parallax","still"] },
    { medium: "hybrid", signals: ["cinematic","immersive","transition","world","environment","luxury","premium"] },
    { medium: "cinematic-dom", signals: ["typography","editorial","manifesto","copy","minimal","lightweight"] },
  ];
  const ranked = rows.map((row) => ({ medium: row.medium, score: scoreSignals(lower,row.signals) })).sort((a,b) => b.score-a.score).filter((row) => row.score > 0).map((row) => row.medium);
  if (manifest.models.length && !ranked.includes("real-3d")) ranked.unshift("real-3d");
  if (manifest.textures.length && !ranked.includes("depth-image")) ranked.push("depth-image");
  if (!ranked.length) ranked.push("cinematic-dom");
  return unique(ranked).slice(0,3);
}

function directorAssets(manifest: AssetManifest): DirectorBrief["existingAssets"] {
  const rows: DirectorBrief["existingAssets"] = [];
  const add = (path: string, type: DirectorBrief["existingAssets"][number]["type"], notes: string) => rows.push({ id: slug(path), label: fileName(path), type, notes });
  manifest.models.slice(0,24).forEach((entry) => add(entry.path,"model","Registered model asset, " + entry.bytes + " bytes."));
  manifest.textures.slice(0,24).forEach((entry) => add(entry.path,"image","Registered image/texture asset, " + entry.bytes + " bytes."));
  manifest.video.slice(0,12).forEach((entry) => add(entry.path,"video","Registered video asset, " + entry.bytes + " bytes."));
  manifest.hdr.slice(0,8).forEach((entry) => add(entry.path,"other","Registered HDR/environment asset, " + entry.bytes + " bytes."));
  return rows.slice(0,80);
}

function objectiveFor(type: AutonomyProjectType) {
  const values: Record<AutonomyProjectType,string> = {
    brand: "Create preference for the brand and make its central idea memorable.",
    product: "Create desire for the product while proving the craft, mechanism or value that makes it worth owning.",
    property: "Create preference for the property and convert qualified interest into a serious inquiry.",
    hospitality: "Make the destination emotionally tangible and move qualified visitors toward booking.",
    portfolio: "Establish a distinct point of view, prove quality through selected work and create qualified contact.",
    saas: "Make the product value and mechanism understandable, then move qualified visitors toward evaluation.",
    commerce: "Create desire, provide proof and confidence, and move visitors toward purchase without sacrificing utility.",
    campaign: "Make the campaign premise immediately legible, deliver one memorable moment and drive response.",
    automotive: "Create desire for the vehicle while translating design and engineering into credible product proof.",
    fashion: "Express the collection attitude, reveal product detail and move visitors toward exploration or purchase.",
  };
  return values[type];
}
function extractClaims(prompt: string) { return prompt.split(/[.;]|\bbut\b|\bwithout\b/i).map((item) => item.trim()).filter((item) => item.length >= 12 && item.length <= 180).slice(0,3); }
const genericSignals = new Set(["product","camera","brand","company","story","launch","event","platform","collection","shop","store"]);
function scoreSignals(lower: string, signals: string[]) { return signals.reduce((score,signal) => score + (hasSignal(lower,signal) ? (genericSignals.has(signal) ? 0.35 : Math.max(1,signal.split(/\s+/).length)) : 0),0); }
function hasSignal(lower:string, signal:string) { if (signal.includes(" ") || signal.includes("-")) return lower.includes(signal); return lower.split(/[^a-z0-9]+/).includes(signal); }
function makeField<T>(value:T, confidence:number, evidenceClass:InferredField<T>["evidenceClass"], evidence:string[], requiresConfirmation:boolean):InferredField<T> { return { value, confidence:clamp(confidence), evidenceClass, evidence, requiresConfirmation }; }
function stripLeadVerb(value:string) { return value.replace(/^(make|create|build)\s+/i,"").trim(); }
function normalize(value:string) { return value.trim().replace(/\s+/g," ").slice(0,4000) || "Create a memorable immersive experience."; }
function fileName(value:string) { return value.split("/").filter(Boolean).pop() ?? value; }
function slug(value:string) { return value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,120) || "asset"; }
function unique<T>(values:T[]) { return [...new Set(values)]; }
function clamp(value:number) { return Math.max(0,Math.min(1,Number(value.toFixed(2)))); }
function average(values:number[]) { return Number((values.reduce((sum,value) => sum+value,0)/values.length).toFixed(2)); }

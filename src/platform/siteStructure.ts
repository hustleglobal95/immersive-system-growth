export type StructureTier = "cinematic" | "immersive" | "signature" | "flagship";
export type SiteArchetypeId =
  | "brand-flagship"
  | "product-launch"
  | "property-development"
  | "hospitality-destination"
  | "portfolio-studio"
  | "saas-product"
  | "editorial-commerce"
  | "campaign-story";

export type SectionRole =
  | "hero"
  | "context"
  | "manifesto"
  | "proof"
  | "product"
  | "feature"
  | "experience"
  | "gallery"
  | "specs"
  | "process"
  | "comparison"
  | "social-proof"
  | "team"
  | "location"
  | "pricing"
  | "faq"
  | "journal"
  | "conversion"
  | "footer";

export type NavigationMode = "minimal" | "anchored" | "chaptered" | "full-site";
export type SectionEnergy = "quiet" | "measured" | "cinematic" | "intense";
export type SectionDensity = "sparse" | "balanced" | "dense";

export interface StructureSection {
  id: string;
  role: SectionRole;
  label: string;
  purpose: string;
  userQuestion: string;
  evidence: string[];
  preferredMedia: string[];
  motion: string[];
  energy: SectionEnergy;
  density: SectionDensity;
  conversionWeight: 0 | 1 | 2 | 3;
  optional?: boolean;
}

export interface StructurePlan {
  id: string;
  archetype: SiteArchetypeId;
  tier: StructureTier;
  name: string;
  description: string;
  navigation: NavigationMode;
  pages: { id: string; label: string; purpose: string; primary?: boolean }[];
  sections: StructureSection[];
  rules: string[];
  targetSceneRange: [number, number];
}

export interface StructureAuditIssue {
  level: "error" | "warning" | "note";
  message: string;
}

export interface StructureAudit {
  score: number;
  issues: StructureAuditIssue[];
}

type SectionSeed = Omit<StructureSection, "id">;

type ArchetypeDefinition = {
  id: SiteArchetypeId;
  name: string;
  description: string;
  navigation: NavigationMode;
  pages: StructurePlan["pages"];
  core: SectionSeed[];
  immersive: SectionSeed[];
  signature: SectionSeed[];
  flagship: SectionSeed[];
};

const section = (
  role: SectionRole,
  label: string,
  purpose: string,
  userQuestion: string,
  evidence: string[],
  preferredMedia: string[],
  motion: string[],
  energy: SectionEnergy = "measured",
  density: SectionDensity = "balanced",
  conversionWeight: 0 | 1 | 2 | 3 = 0,
  optional = false,
): SectionSeed => ({ role, label, purpose, userQuestion, evidence, preferredMedia, motion, energy, density, conversionWeight, optional });

const shared = {
  hero: section("hero", "Hero", "Establish the promise and visual thesis immediately.", "What is this and why should I care?", ["clear value proposition", "primary identity", "hero subject"], ["3D hero", "cinematic image", "short video"], ["camera reveal", "editorial reveal"], "cinematic", "sparse", 1),
  proof: section("proof", "Proof", "Substantiate the promise before attention decays.", "Why should I believe this?", ["numbers", "awards", "press", "client evidence", "product facts"], ["metrics", "logos", "detail imagery"], ["restrained reveal"], "quiet", "balanced", 1),
  social: section("social-proof", "Social proof", "Reduce uncertainty with external validation.", "Who else trusts this?", ["testimonials", "press", "logos", "results"], ["quotes", "portraits", "logos"], ["editorial reveal"], "quiet", "balanced", 1, true),
  faq: section("faq", "FAQ", "Resolve objections before the final conversion moment.", "What might stop me?", ["answers to high-friction questions"], ["text", "small diagrams"], ["accordion"], "quiet", "dense", 2, true),
  conversion: section("conversion", "Conversion", "Turn accumulated interest into one clear next action.", "What do I do now?", ["single primary CTA", "contact path", "purchase or inquiry route"], ["final hero", "form", "CTA"], ["focused reveal"], "measured", "sparse", 3),
  footer: section("footer", "Footer", "Close the experience with navigation, trust and utility.", "Where else can I go?", ["contact", "legal", "social", "secondary navigation"], ["logo", "utility links"], ["minimal"], "quiet", "dense", 0),
};

const archetypes: ArchetypeDefinition[] = [
  {
    id: "brand-flagship",
    name: "Brand Flagship",
    description: "High-concept brand storytelling with a strong visual thesis and controlled conversion path.",
    navigation: "chaptered",
    pages: [
      { id: "home", label: "Home", purpose: "Flagship narrative", primary: true },
      { id: "about", label: "About", purpose: "Brand depth and credibility" },
      { id: "contact", label: "Contact", purpose: "Primary inquiry path" },
    ],
    core: [
      shared.hero,
      section("manifesto", "Manifesto", "State the worldview behind the brand.", "What does this brand stand for?", ["positioning", "point of view"], ["type", "cinematic still"], ["editorial reveal", "parallax"], "measured", "sparse"),
      shared.proof,
      section("experience", "Signature experience", "Show the brand at its most distinctive.", "What makes this feel different?", ["signature product", "environment", "creative proof"], ["3D", "video", "interactive media"], ["camera choreography", "threshold passage"], "cinematic", "balanced"),
      shared.conversion,
      shared.footer,
    ],
    immersive: [section("gallery", "World", "Expand the visual universe without losing hierarchy.", "What does this world look and feel like?", ["campaign imagery", "materials", "moments"], ["gallery", "video"], ["parallax story"], "cinematic", "sparse")],
    signature: [section("process", "Craft", "Reveal how the work is made and why the detail matters.", "How is this made?", ["process", "materials", "people"], ["macro imagery", "3D details"], ["architectural build", "macro reveal"], "measured", "balanced")],
    flagship: [shared.social, section("journal", "Journal", "Create a deeper editorial layer beyond the campaign moment.", "What else is happening here?", ["stories", "news", "culture"], ["editorial cards"], ["quiet reveal"], "quiet", "dense", 0, true)],
  },
  {
    id: "product-launch",
    name: "Product Launch",
    description: "Physical-product storytelling organized around reveal, differentiation, proof and acquisition.",
    navigation: "anchored",
    pages: [
      { id: "product", label: "Product", purpose: "Primary launch story", primary: true },
      { id: "specs", label: "Specifications", purpose: "Detailed product proof" },
      { id: "support", label: "Support", purpose: "Ownership questions" },
    ],
    core: [
      shared.hero,
      section("product", "Product reveal", "Make the object understandable before explaining features.", "What is the product?", ["form", "materials", "hero angle"], ["3D product", "macro video"], ["product hero", "subject orbit"], "cinematic", "sparse"),
      section("feature", "Key features", "Explain the small number of differentiators that matter most.", "Why is it better?", ["feature evidence", "mechanism", "benefit"], ["exploded 3D", "diagram", "detail imagery"], ["assembly", "macro", "scroll-linked callouts"], "cinematic", "balanced", 1),
      shared.proof,
      section("specs", "Specifications", "Answer high-intent technical questions cleanly.", "Does it meet my requirements?", ["dimensions", "materials", "compatibility", "performance"], ["spec table", "diagram"], ["minimal"], "quiet", "dense", 1),
      shared.conversion,
      shared.footer,
    ],
    immersive: [section("experience", "In use", "Move from object admiration to ownership imagination.", "What is it like to use?", ["context", "lifestyle", "workflow"], ["video", "environment", "interactive scene"], ["threshold", "camera travel"], "cinematic", "balanced")],
    signature: [section("comparison", "Comparison", "Make differentiation explicit for considered purchases.", "Why this instead of the alternatives?", ["feature comparison", "performance", "ownership value"], ["comparison matrix", "interactive toggles"], ["measured reveal"], "measured", "dense", 2, true), shared.social],
    flagship: [section("process", "Engineering story", "Expose engineering and craft for flagship credibility.", "How far did the team go to make this?", ["R&D", "materials", "manufacturing"], ["exploded 3D", "factory media"], ["construction choreography"], "cinematic", "balanced")],
  },
  {
    id: "property-development",
    name: "Property Development",
    description: "Real-estate structure from place and architecture through residences, amenities and inquiry.",
    navigation: "chaptered",
    pages: [
      { id: "residences", label: "Residences", purpose: "Primary development story", primary: true },
      { id: "amenities", label: "Amenities", purpose: "Lifestyle proof" },
      { id: "location", label: "Location", purpose: "Neighborhood value" },
      { id: "inquire", label: "Inquire", purpose: "Lead capture" },
    ],
    core: [
      shared.hero,
      section("context", "Place", "Establish the development in its geographic and cultural context.", "Why here?", ["location", "views", "neighborhood"], ["aerial", "map", "environment"], ["drone approach", "parallax"], "cinematic", "sparse"),
      section("product", "Architecture", "Make the building itself the primary object of desire.", "What makes the architecture special?", ["form", "facade", "materials"], ["3D building", "architectural stills"], ["architectural build", "vertical ascent"], "cinematic", "balanced"),
      section("experience", "Residences", "Move from exterior identity into lived experience.", "What is it like to live here?", ["interiors", "plans", "views"], ["interior images", "plan", "panorama"], ["threshold passage", "editorial reveal"], "measured", "balanced", 1),
      section("gallery", "Amenities", "Show the lifestyle beyond the private residence.", "What does the building give me beyond my unit?", ["pool", "fitness", "lounge", "services"], ["gallery", "video"], ["parallax story"], "measured", "balanced"),
      shared.conversion,
      shared.footer,
    ],
    immersive: [section("location", "Neighborhood", "Connect the property to nearby culture, access and landmarks.", "What is around me?", ["map", "distances", "destinations"], ["map", "city imagery"], ["map reveal", "camera pullback"], "measured", "balanced")],
    signature: [shared.proof, section("specs", "Residence details", "Support serious buyers with concrete product facts.", "What exactly am I buying?", ["unit mix", "finishes", "availability"], ["plans", "specs"], ["minimal"], "quiet", "dense", 2)],
    flagship: [shared.social, section("team", "Team", "Establish confidence in developer, architect and design team.", "Who is behind this?", ["developer", "architect", "designer"], ["portraits", "project history"], ["editorial reveal"], "quiet", "balanced")],
  },
  {
    id: "hospitality-destination",
    name: "Hospitality Destination",
    description: "Destination-led structure for hotels, resorts, restaurants and experiential venues.",
    navigation: "chaptered",
    pages: [
      { id: "stay", label: "Stay", purpose: "Primary destination story", primary: true },
      { id: "experience", label: "Experience", purpose: "Amenities and programming" },
      { id: "dining", label: "Dining", purpose: "Food and beverage" },
      { id: "book", label: "Book", purpose: "Reservation" },
    ],
    core: [
      shared.hero,
      section("context", "Destination", "Anchor the experience in place and atmosphere.", "Why should I go here?", ["setting", "arrival", "identity"], ["aerial", "environment video"], ["arrival flight", "threshold"], "cinematic", "sparse"),
      section("experience", "Stay", "Show the core guest experience.", "What will my stay feel like?", ["rooms", "suites", "service"], ["room imagery", "3D", "video"], ["editorial reveal", "camera travel"], "measured", "balanced", 1),
      section("experience", "Experiences", "Broaden the emotional case beyond the room.", "What can I do there?", ["spa", "pool", "activities", "culture"], ["gallery", "video"], ["parallax story"], "cinematic", "balanced"),
      shared.proof,
      shared.conversion,
      shared.footer,
    ],
    immersive: [section("product", "Dining", "Give food and beverage its own sensory chapter.", "What will I eat and drink?", ["chef", "menu", "ingredients", "space"], ["macro food", "restaurant imagery"], ["macro reveal", "editorial reveal"], "measured", "balanced")],
    signature: [section("location", "Explore", "Connect the property to its surrounding destination.", "What is outside the property?", ["local culture", "map", "itinerary"], ["map", "destination media"], ["camera pullback"], "measured", "balanced"), shared.social],
    flagship: [section("journal", "Stories", "Extend the destination into editorial culture.", "What stories live around this place?", ["guides", "people", "events"], ["editorial content"], ["quiet reveal"], "quiet", "dense", 0, true)],
  },
  {
    id: "portfolio-studio",
    name: "Portfolio / Studio",
    description: "Creative-practice structure built around work, point of view, process and inquiry.",
    navigation: "full-site",
    pages: [
      { id: "work", label: "Work", purpose: "Primary portfolio", primary: true },
      { id: "about", label: "About", purpose: "Point of view and team" },
      { id: "services", label: "Services", purpose: "Commercial clarity" },
      { id: "contact", label: "Contact", purpose: "Inquiry" },
    ],
    core: [
      shared.hero,
      section("gallery", "Selected work", "Demonstrate quality before overexplaining the studio.", "Can they do work at the level I need?", ["best projects", "results", "visual proof"], ["project media", "case-study cards"], ["editorial grid", "parallax"], "cinematic", "balanced", 1),
      section("manifesto", "Point of view", "Explain how the studio thinks differently.", "What is their perspective?", ["principles", "positioning"], ["type", "studio imagery"], ["editorial reveal"], "measured", "sparse"),
      section("process", "Process", "Reduce uncertainty around working together.", "How do projects happen?", ["phases", "deliverables", "collaboration"], ["diagram", "process imagery"], ["measured reveal"], "quiet", "balanced", 1),
      shared.proof,
      shared.conversion,
      shared.footer,
    ],
    immersive: [section("team", "Studio", "Add people and culture once the work has earned attention.", "Who will I work with?", ["team", "studio", "culture"], ["portraits", "studio video"], ["editorial reveal"], "quiet", "balanced")],
    signature: [shared.social, section("journal", "Thinking", "Build authority beyond portfolio imagery.", "How deep is the practice?", ["essays", "talks", "research"], ["editorial cards"], ["quiet reveal"], "quiet", "dense", 0, true)],
    flagship: [section("experience", "Interactive case study", "Turn a major project into an immersive proof piece.", "How far can this studio push the medium?", ["flagship case study"], ["3D", "video", "interactive media"], ["custom choreography"], "intense", "balanced")],
  },
  {
    id: "saas-product",
    name: "SaaS / Digital Product",
    description: "Conversion-oriented software structure built around problem, product proof, workflow and trust.",
    navigation: "full-site",
    pages: [
      { id: "product", label: "Product", purpose: "Primary product story", primary: true },
      { id: "solutions", label: "Solutions", purpose: "Use-case depth" },
      { id: "pricing", label: "Pricing", purpose: "Commercial decision" },
      { id: "resources", label: "Resources", purpose: "Education and trust" },
    ],
    core: [
      shared.hero,
      section("context", "Problem", "Frame the user problem before presenting features.", "Do they understand my problem?", ["pain", "cost of current state"], ["UI", "diagram", "data"], ["measured reveal"], "measured", "balanced"),
      section("product", "Product", "Show the product itself early and concretely.", "What does it actually do?", ["interface", "workflow", "core outcome"], ["UI demo", "video", "interactive prototype"], ["UI choreography", "scroll demo"], "cinematic", "balanced", 1),
      section("feature", "Capabilities", "Group features around user outcomes instead of a random checklist.", "Can it handle my needs?", ["capability groups", "benefits"], ["UI", "icons", "diagrams"], ["stagger", "state transitions"], "measured", "dense", 1),
      shared.proof,
      shared.conversion,
      shared.footer,
    ],
    immersive: [section("process", "Workflow", "Show how the product fits into real work.", "How would my team use it?", ["workflow", "integrations", "roles"], ["diagram", "UI sequence"], ["step choreography"], "measured", "balanced")],
    signature: [section("comparison", "Why switch", "Make replacement logic explicit.", "Why should I change tools?", ["comparison", "migration", "ROI"], ["matrix", "calculator"], ["measured reveal"], "quiet", "dense", 2), section("pricing", "Pricing", "Support high-intent evaluation without visual noise.", "What does it cost?", ["plans", "limits", "CTA"], ["pricing table"], ["minimal"], "quiet", "dense", 3)],
    flagship: [shared.social, shared.faq],
  },
  {
    id: "editorial-commerce",
    name: "Editorial Commerce",
    description: "Premium commerce that sells through narrative, product world and proof rather than catalog density.",
    navigation: "full-site",
    pages: [
      { id: "shop", label: "Shop", purpose: "Primary product discovery", primary: true },
      { id: "story", label: "Story", purpose: "Brand narrative" },
      { id: "journal", label: "Journal", purpose: "Editorial context" },
    ],
    core: [
      shared.hero,
      section("gallery", "Collection", "Move quickly from brand atmosphere into product discovery.", "What can I buy?", ["collection", "hero products"], ["product imagery", "3D"], ["gallery reveal", "product focus"], "cinematic", "balanced", 2),
      section("manifesto", "Story", "Give the collection cultural and material context.", "Why does this brand matter?", ["brand story", "craft", "origin"], ["editorial imagery", "video"], ["editorial reveal"], "measured", "sparse"),
      shared.proof,
      shared.conversion,
      shared.footer,
    ],
    immersive: [section("product", "Product focus", "Give key products deeper immersive treatment.", "What makes this piece special?", ["materials", "details", "variants"], ["3D", "macro imagery"], ["macro", "subject orbit"], "cinematic", "balanced", 2)],
    signature: [section("journal", "Editorial", "Create repeatable content beyond the launch campaign.", "What world surrounds these products?", ["stories", "people", "places"], ["editorial cards"], ["quiet reveal"], "quiet", "dense")],
    flagship: [shared.social, shared.faq],
  },
  {
    id: "campaign-story",
    name: "Campaign Story",
    description: "Focused one-off narrative for launches, cultural moments and high-impact campaigns.",
    navigation: "minimal",
    pages: [{ id: "story", label: "Story", purpose: "Single campaign narrative", primary: true }],
    core: [
      shared.hero,
      section("context", "Setup", "Create tension and context before the centerpiece.", "What is happening?", ["context", "campaign premise"], ["video", "image", "type"], ["cinematic reveal"], "cinematic", "sparse"),
      section("experience", "Centerpiece", "Deliver the campaign's most memorable interaction or reveal.", "What is the big moment?", ["hero experience"], ["3D", "interactive sequence", "video"], ["custom choreography"], "intense", "sparse"),
      shared.conversion,
      shared.footer,
    ],
    immersive: [shared.proof],
    signature: [section("gallery", "Extensions", "Expand the campaign without diluting the central idea.", "What else belongs to this world?", ["supporting media"], ["gallery", "video"], ["parallax"], "measured", "balanced")],
    flagship: [section("social-proof", "Response", "Capture cultural or audience response when relevant.", "Did this matter?", ["press", "reach", "community response"], ["quotes", "metrics"], ["editorial reveal"], "quiet", "balanced", 1, true)],
  },
];

export const structureArchetypeCatalog = archetypes.map(({ id, name, description }) => ({ id, name, description }));
export const structureTierCatalog: { id: StructureTier; label: string; description: string }[] = [
  { id: "cinematic", label: "Cinematic", description: "Disciplined premium structure with one clear narrative and conversion path." },
  { id: "immersive", label: "Immersive", description: "Adds experiential depth, richer media and more chapter variation." },
  { id: "signature", label: "Signature", description: "Adds proof, technical depth and decision-support sections for premium engagements." },
  { id: "flagship", label: "Flagship", description: "Adds editorial, team, social-proof or bespoke chapters without sacrificing hierarchy." },
];

const tierExtras = (definition: ArchetypeDefinition, tier: StructureTier) => {
  if (tier === "cinematic") return [];
  if (tier === "immersive") return definition.immersive;
  if (tier === "signature") return [...definition.immersive, ...definition.signature];
  return [...definition.immersive, ...definition.signature, ...definition.flagship];
};

const sceneRanges: Record<StructureTier, [number, number]> = {
  cinematic: [5, 7],
  immersive: [7, 10],
  signature: [9, 13],
  flagship: [11, 16],
};

export function createStructurePlan(archetype: SiteArchetypeId, tier: StructureTier): StructurePlan {
  const definition = archetypes.find((item) => item.id === archetype);
  if (!definition) throw new Error(`Unknown site archetype: ${archetype}`);
  const seeds = [...definition.core.slice(0, -2), ...tierExtras(definition, tier), ...definition.core.slice(-2)];
  const sections = seeds.map((item, index) => ({ ...item, id: `${item.role}-${index + 1}` }));
  return {
    id: `${archetype}-${tier}`,
    archetype,
    tier,
    name: `${definition.name} · ${tier[0].toUpperCase()}${tier.slice(1)}`,
    description: definition.description,
    navigation: definition.navigation,
    pages: definition.pages,
    sections,
    targetSceneRange: sceneRanges[tier],
    rules: [
      "The hero must communicate the primary promise before asking the visitor to interpret cinematic effects.",
      "Every major visual chapter must answer a user question or provide evidence; decorative scenes alone do not justify their position.",
      "Proof should appear before the final high-friction conversion request.",
      "Primary navigation must remain understandable without motion or WebGL.",
      "The mobile sequence may simplify motion, but it must preserve content hierarchy and conversion order.",
      "Avoid consecutive sections with the same information density, media treatment and motion energy unless repetition is intentional.",
      "Use one primary CTA language per page and reserve secondary actions for low-friction exploration.",
    ],
  };
}

export function auditStructure(plan: StructurePlan): StructureAudit {
  const issues: StructureAuditIssue[] = [];
  const roles = plan.sections.map((item) => item.role);
  if (roles[0] !== "hero") issues.push({ level: "error", message: "The first structural section should be a hero." });
  if (!roles.includes("conversion")) issues.push({ level: "error", message: "The structure has no primary conversion section." });
  if (roles.at(-1) !== "footer") issues.push({ level: "warning", message: "The structure should normally close with a footer/utility layer." });
  const conversionIndex = roles.lastIndexOf("conversion");
  const proofIndex = Math.max(roles.lastIndexOf("proof"), roles.lastIndexOf("social-proof"));
  if (conversionIndex >= 0 && proofIndex === -1 && plan.tier !== "cinematic") issues.push({ level: "warning", message: "Higher-tier structures should usually establish proof before the final conversion ask." });
  if (proofIndex > conversionIndex && conversionIndex >= 0) issues.push({ level: "warning", message: "Primary proof appears after the final conversion section." });
  const highEnergyRuns = plan.sections.reduce((runs, item, index, all) => runs + (index > 0 && item.energy === "cinematic" && all[index - 1].energy === "cinematic" ? 1 : 0), 0);
  if (highEnergyRuns > 2) issues.push({ level: "note", message: "Several cinematic chapters are consecutive. Add a quiet or measured reset to improve pacing." });
  const denseRuns = plan.sections.reduce((runs, item, index, all) => runs + (index > 0 && item.density === "dense" && all[index - 1].density === "dense" ? 1 : 0), 0);
  if (denseRuns > 1) issues.push({ level: "note", message: "Dense information sections are stacked together; consider introducing a visual breathing chapter." });
  const score = Math.max(0, 100 - issues.reduce((total, issue) => total + (issue.level === "error" ? 25 : issue.level === "warning" ? 10 : 4), 0));
  return { score, issues };
}

export function recommendStructure(input: { projectType: string; tier?: StructureTier }) {
  const value = input.projectType.toLowerCase();
  const archetype: SiteArchetypeId =
    /real estate|property|residence|apartment|tower|development|architecture/.test(value) ? "property-development" :
    /hotel|resort|restaurant|hospitality|destination|travel/.test(value) ? "hospitality-destination" :
    /saas|software|platform|app|b2b/.test(value) ? "saas-product" :
    /portfolio|studio|agency|designer|creative/.test(value) ? "portfolio-studio" :
    /fashion|retail|commerce|shop|collection/.test(value) ? "editorial-commerce" :
    /campaign|launch story|event/.test(value) ? "campaign-story" :
    /product|watch|car|automotive|furniture|device/.test(value) ? "product-launch" :
    "brand-flagship";
  return createStructurePlan(archetype, input.tier ?? "immersive");
}

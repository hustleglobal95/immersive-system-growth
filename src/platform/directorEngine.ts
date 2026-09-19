import {
  parseDirectorBrief,
  parseDirectorTreatment,
  type DirectorBrief,
  type DirectorCritique,
  type DirectorTreatment,
  type DirectorTerritory,
} from "@/src/platform/directorSchema";

type ProjectProfile = {
  archetype: string;
  coreTruth: string;
  thesisSeeds: [string, string, string];
  memorySeeds: [string, string, string];
  visualPremises: [string, string, string];
  experiencePremises: [string, string, string];
  signatureSeeds: [string, string, string];
  arc: Array<[string, string, number]>;
  camera: string[];
  motion: string[];
  typography: string[];
  imagery: string[];
  interaction: string[];
  transitions: string[];
  materials: string[];
  lighting: string[];
  sound: string[];
  noGo: string[];
};

const profiles: Record<DirectorBrief["projectType"], ProjectProfile> = {
  brand: {
    archetype: "brand world",
    coreTruth: "The brand should be experienced as a point of view, not presented as a collection of claims.",
    thesisSeeds: ["Turn the brand promise into a place the visitor moves through.", "Reveal the brand through contrast rather than explanation.", "Make the brand's point of view the interaction model."],
    memorySeeds: ["the brand world felt physically navigable", "the experience kept changing its visual rules with purpose", "one unmistakable brand gesture controlled the whole site"],
    visualPremises: ["Build a restrained visual world around one dominant motif and let evidence accumulate inside it.", "Use opposing visual states to dramatize the brand difference.", "Let typography, image, material and spatial composition behave like one identity system."],
    experiencePremises: ["Move from intrigue to recognition to conviction without front-loading explanation.", "Create a before/after emotional journey where the brand resolves tension.", "Make each chapter prove a different dimension of the same thesis."],
    signatureSeeds: ["A brand symbol or material state expands into the full environment.", "The interface crosses from the category's expected visual language into the brand's own world.", "A single scroll gesture reorganizes the entire composition around the brand idea."],
    arc: [["Intrigue", "curiosity", 4], ["Recognition", "orientation", 5], ["Contrast", "tension", 7], ["Proof", "confidence", 4], ["Signature", "awe", 10], ["Intimacy", "connection", 3], ["Commitment", "desire", 6]],
    camera: ["Use camera movement only when it reveals a new brand truth.", "Prefer composed pushes and lateral reveals over habitual orbiting.", "Reserve the most impossible spatial move for the signature moment."],
    motion: ["Treat motion as identity: repeat a small number of recognizable behaviors.", "Use contrast between stillness and decisive movement.", "Never animate a brand element merely because it can move."],
    typography: ["Typography must have a clear display voice and a quieter information voice.", "Treat large type as composition, not decoration."],
    imagery: ["Reject generic category imagery; every image must reinforce the brand thesis.", "Favor a coherent photographic language over asset quantity."],
    interaction: ["Interaction should reveal meaning or control pace, not create chores.", "Keep core navigation understandable without special effects."],
    transitions: ["Transitions should feel like changes in brand state, not page wipes."],
    materials: ["Use a small material vocabulary consistently."],
    lighting: ["Let light communicate emotional state changes."],
    sound: ["Use a restrained sonic motif only where it increases recognition."],
    noGo: ["No generic gradient-led brand world.", "No sequence of unrelated wow effects.", "No logo animation used as the main idea."]
  },
  product: {
    archetype: "product revelation",
    coreTruth: "The object earns desire through revelation, proof and imagined ownership.",
    thesisSeeds: ["Reveal value layer by layer until the object feels inevitable.", "Turn one engineering or material truth into the narrative spine.", "Move from mystery to tactile ownership without breaking product clarity."],
    memorySeeds: ["the product assembled from its defining details", "one internal truth became the whole story", "the product moved from object to obsession"],
    visualPremises: ["Begin with controlled concealment, then progressively increase visual access.", "Treat mechanisms/materials as evidence, not technical decoration.", "Move between macro intimacy and complete-object authority."],
    experiencePremises: ["Mystery → understanding → proof → possession.", "Let each feature answer why the product deserves its premium.", "Make ownership feel imaginable before the CTA appears."],
    signatureSeeds: ["The product assembles around its most important internal component.", "A macro material transition becomes the complete product in one continuous shot.", "The environment disappears until only the product and one decisive proof remain."],
    arc: [["Mystery", "intrigue", 5], ["Form", "recognition", 6], ["Detail", "fascination", 5], ["Proof", "confidence", 6], ["Assembly", "awe", 10], ["Use", "desire", 4], ["Ownership", "commitment", 7]],
    camera: ["Use macro focal changes for detail and longer-lens authority for hero states.", "Orbit only when rotation reveals meaningful geometry.", "Keep the hero product readable at all times during the primary reveal."],
    motion: ["Mechanical or material movement must appear motivated by product logic.", "Let secondary UI motion remain quieter than product motion."],
    typography: ["Keep typography subordinate to the object during hero sequences.", "Use labels/specs as precise annotations, not floating decoration."],
    imagery: ["Prefer tactile closeups, use context only when it advances ownership imagination."],
    interaction: ["Give visitors control where inspection matters; direct them where cinematic revelation matters."],
    transitions: ["Use material, lens, assembly or threshold continuity instead of arbitrary fades."],
    materials: ["Surface response must sell material quality before copy does."],
    lighting: ["Shape the product with controlled highlights and purposeful negative fill."],
    sound: ["Use detail-level sound sparingly: clicks, movement, contact, assembly, atmosphere."],
    noGo: ["No endless 360-degree spin.", "No exploded view without narrative reason.", "No specs before desire has been established."]
  },
  property: {
    archetype: "architectural journey",
    coreTruth: "The property must sell place, arrival, architecture and imagined life—not just renders.",
    thesisSeeds: ["Make vertical elevation the emotional journey.", "Turn arrival into a gradual separation from the city.", "Frame architecture as the threshold between place and private life."],
    memorySeeds: ["the site physically rose from city to sky", "the camera crossed the facade into private life", "the location and building felt like one continuous journey"],
    visualPremises: ["Use horizon, altitude and changing scale as recurring composition devices.", "Move from public geometry to private material intimacy.", "Let city/context establish value before interior luxury takes over."],
    experiencePremises: ["Place → arrival → architecture → threshold → residence → lifestyle → elevation → inquiry.", "Reduce city noise as the visitor moves toward private space.", "Let the climax belong to the view or highest-value spatial moment."],
    signatureSeeds: ["A continuous ascent crosses the facade and resolves inside the hero residence.", "Street-level context compresses into an uninterrupted rise to the skyline.", "The architectural mass opens to reveal the private world within."],
    arc: [["Place", "orientation", 3], ["Arrival", "anticipation", 5], ["Architecture", "admiration", 7], ["Threshold", "transition", 6], ["Residence", "intimacy", 4], ["Lifestyle", "desire", 5], ["Elevation", "awe", 10], ["Inquiry", "intent", 4]],
    camera: ["Keep horizons stable and architecture legible.", "Favor dolly, crane and threshold movement over product-style orbiting.", "Reserve dramatic vertical ascent for the highest-value reveal."],
    motion: ["Architecture moves rarely; camera and light do most of the storytelling.", "Avoid floating-building gimmicks unless the concept explicitly calls for abstraction."],
    typography: ["Typography should feel architectural: clear grid, large quiet statements, disciplined metadata."],
    imagery: ["Prioritize views, material detail and human-scale spatial moments over generic lifestyle smiles."],
    interaction: ["Use maps, plans and availability for utility; keep the core journey cinematic."],
    transitions: ["Cross physical thresholds where possible—facade, doorway, elevator, terrace, horizon."],
    materials: ["Use the project's actual material palette as the UI's material logic."],
    lighting: ["Use time-of-day changes as narrative progression, not wallpaper."],
    sound: ["Move from city texture toward quieter private ambience as the journey rises."],
    noGo: ["No gratuitous building orbiting.", "No generic gold luxury treatment.", "No equal visual weight for every amenity."]
  },
  hospitality: {
    archetype: "destination escape",
    coreTruth: "Hospitality sells the feeling of leaving ordinary life before it sells rooms or amenities.",
    thesisSeeds: ["Let the outside world gradually disappear.", "Make arrival the beginning of a sensory transformation.", "Turn the destination's natural rhythm into the site's pacing."],
    memorySeeds: ["the world became quieter as the site progressed", "arrival felt like entering another climate", "the site changed pace like a real stay"],
    visualPremises: ["Use atmosphere, texture and environmental scale before room detail.", "Move from expansive destination views to tactile intimate moments.", "Let natural light and sensory imagery establish time and place."],
    experiencePremises: ["Escape → arrival → room → sensory immersion → experience → dining → stillness → reservation.", "Let pace slow as intimacy increases.", "Show enough utility to book without breaking the dream."],
    signatureSeeds: ["A continuous arrival moves from landscape into the property without a cut.", "The environment transitions through a full day while the visitor moves deeper into the stay.", "A sensory threshold shifts weather, sound and light into the property's private atmosphere."],
    arc: [["Escape", "release", 4], ["Arrival", "anticipation", 6], ["Atmosphere", "immersion", 7], ["Stay", "comfort", 4], ["Experience", "desire", 6], ["Signature", "wonder", 10], ["Stillness", "calm", 2], ["Reserve", "intent", 5]],
    camera: ["Prefer slow human-scale travel and environmental reveals.", "Let wide establishing shots breathe before close detail."],
    motion: ["Motion should feel atmospheric rather than mechanical.", "Allow long quiet holds where imagery is strong."],
    typography: ["Use typography as hospitality—generous spacing, controlled hierarchy, minimal interruption."],
    imagery: ["Prioritize atmosphere, place, texture and moments of inhabitation over catalog coverage."],
    interaction: ["Keep booking utility direct; exploration may be cinematic."],
    transitions: ["Use environmental thresholds: water, foliage, doors, shadow, weather, day/night."],
    materials: ["Tie UI accents to local architecture and tactile hospitality materials."],
    lighting: ["Treat changing daylight as a primary emotional instrument."],
    sound: ["Build a quiet environmental bed; never overpower browsing."],
    noGo: ["No travel-template card wall as the main experience.", "No over-edited montage that prevents atmosphere.", "No booking friction disguised as immersion."]
  },
  portfolio: {
    archetype: "proof of practice",
    coreTruth: "The work must prove quality before the studio explains itself.",
    thesisSeeds: ["Make the portfolio itself the argument.", "Reveal a consistent point of view through radically different work.", "Turn process into proof without diluting the work."],
    memorySeeds: ["the work controlled the interface", "each project changed the world without losing the studio voice", "the studio's thinking was visible inside the transitions"],
    visualPremises: ["Give selected work disproportionate scale and space.", "Let project worlds differ while the studio system remains disciplined.", "Use process artifacts only where they increase credibility."],
    experiencePremises: ["Work → pattern recognition → point of view → process → proof → inquiry.", "Lead with the highest-standard project, not a biography.", "Let each case study answer a different credibility question."],
    signatureSeeds: ["A flagship case study takes over the entire interface and becomes its own world.", "Project transitions preserve one compositional anchor while everything else changes.", "The studio grid physically reorganizes around the selected work."],
    arc: [["Impact", "attention", 7], ["Work", "admiration", 6], ["Pattern", "recognition", 4], ["Point of View", "respect", 5], ["Process", "confidence", 4], ["Flagship", "awe", 10], ["Inquiry", "intent", 5]],
    camera: ["Let project content determine camera behavior; avoid forcing 3D into non-3D work."],
    motion: ["Transitions should reveal the studio's system while respecting each project's character."],
    typography: ["Studio typography should be quiet enough to let client work dominate."],
    imagery: ["Show fewer projects at larger scale; remove mediocre proof."],
    interaction: ["Project selection should be fast; deep case-study interaction can be richer."],
    transitions: ["Use consistent editorial anchors across very different project worlds."],
    materials: ["Avoid a decorative material system that competes with portfolio work."],
    lighting: ["When 3D is used, match each project's art direction rather than imposing one studio light rig."],
    sound: ["Use sound only for projects where it is part of the case study."],
    noGo: ["No equal-size project grid as the primary proof.", "No about section before strong work.", "No demo-reel effects unrelated to the portfolio."]
  },
  saas: {
    archetype: "complexity to clarity",
    coreTruth: "Software earns trust by making the product and outcome understandable quickly.",
    thesisSeeds: ["Collapse complexity into one obvious workflow.", "Make the product feel inevitable by revealing the old friction disappearing.", "Turn invisible system intelligence into visible user control."],
    memorySeeds: ["a complicated workflow became visually obvious", "the product demo felt like the interface was solving the story live", "proof and product behavior were inseparable"],
    visualPremises: ["Use interface reality as the primary visual asset.", "Show transformation through before/after workflow states.", "Use diagrams only when they clarify system behavior."],
    experiencePremises: ["Problem → product → workflow → proof → depth → decision.", "Show the product before feature-list fatigue sets in.", "Keep high-intent pricing/conversion utility visually direct."],
    signatureSeeds: ["A messy workflow collapses into a single live product path.", "Real product states respond to one user intent across multiple systems.", "The hero demo resolves the core pain without leaving the first screen."],
    arc: [["Problem", "recognition", 4], ["Promise", "curiosity", 5], ["Product", "clarity", 7], ["Workflow", "confidence", 6], ["Proof", "trust", 5], ["Signature", "conviction", 9], ["Decision", "intent", 5]],
    camera: ["Use camera-like UI motion only to focus attention; do not cinematicize basic interface navigation."],
    motion: ["Animate state changes, causality and workflow—not decorative particles."],
    typography: ["Optimize legibility and hierarchy over theatrical display."],
    imagery: ["Prefer real UI, diagrams and customer evidence over generic 3D tech imagery."],
    interaction: ["Let visitors test or scrub meaningful product states where feasible."],
    transitions: ["Use state continuity rather than full-screen scene changes."],
    materials: ["UI surfaces should feel coherent with the actual product."],
    lighting: ["Avoid faux cinematic lighting unless the brand world legitimately uses 3D."],
    sound: ["Default to silent; sound needs a product or brand reason."],
    noGo: ["No floating glass cards as a substitute for product proof.", "No abstract 3D blob hero without strategic purpose.", "No feature wall before showing the product."]
  },
  commerce: {
    archetype: "editorial desire",
    coreTruth: "Premium commerce should build desire without making product discovery difficult.",
    thesisSeeds: ["Let editorial desire lead directly into product possession.", "Make material and silhouette the navigation language.", "Turn the collection into a world without hiding the shop."],
    memorySeeds: ["the collection felt like an editorial film you could buy from", "product detail became the transition system", "the shop never broke the brand world"],
    visualPremises: ["Alternate editorial scale with direct product access.", "Use tactile detail and silhouette as recurring visual anchors.", "Let commerce UI appear with restraint but never ambiguity."],
    experiencePremises: ["Atmosphere → collection → detail → story → proof → product focus → purchase.", "Build desire first, then remove friction aggressively at high intent.", "Use editorial chapters to differentiate rather than slow shopping."],
    signatureSeeds: ["A hero material/detail resolves seamlessly into the shoppable collection.", "The collection changes environment while product position remains fixed and purchasable.", "One editorial sequence moves from body/silhouette to material to product card without a cut."],
    arc: [["Attitude", "intrigue", 6], ["Collection", "desire", 7], ["Detail", "fascination", 5], ["Story", "meaning", 4], ["Signature", "awe", 10], ["Product", "intent", 6], ["Purchase", "commitment", 4]],
    camera: ["Use product/body framing intentionally; never let camera movement obscure merchandise."],
    motion: ["Fashion and product movement should carry attitude; UI motion remains precise."],
    typography: ["Display type may be expressive but product information must stay highly legible."],
    imagery: ["Prioritize original campaign imagery and strong product detail over catalog repetition."],
    interaction: ["Shopping actions must remain obvious and fast even inside immersive sequences."],
    transitions: ["Use material, silhouette and crop continuity."],
    materials: ["Let product materials inform interface texture sparingly."],
    lighting: ["Use campaign lighting language consistently across 3D and photography."],
    sound: ["Optional; must support campaign attitude without blocking commerce usability."],
    noGo: ["No hidden add-to-cart behavior.", "No cinematic intro that delays shopping excessively.", "No generic luxury serif + beige treatment without brand basis."]
  },
  campaign: {
    archetype: "single unforgettable idea",
    coreTruth: "A campaign experience wins by making one cultural idea impossible to forget.",
    thesisSeeds: ["Concentrate the entire experience around one repeatable gesture.", "Build tension toward one reveal and exit before repetition weakens it.", "Turn the campaign line into a physical interaction."],
    memorySeeds: ["one gesture defined the whole campaign", "the reveal happened only after the site earned it", "the campaign line became something the visitor did"],
    visualPremises: ["Use one dominant visual system with aggressive editing discipline.", "Allow supporting content only if it increases the central idea.", "Treat campaign typography and imagery as one composition."],
    experiencePremises: ["Setup → tension → participation → reveal → aftermath → response → action.", "Hold one deliberately quiet beat directly after the reveal so the climax has somewhere to land, and keep the experience short enough that intensity never becomes fatigue.", "End while the central idea still feels fresh."],
    signatureSeeds: ["The campaign statement becomes the interaction that triggers the reveal.", "A seemingly static hero breaks its own visual rules at the climax.", "The visitor's accumulated actions resolve into one final transformation."],
    arc: [["Setup", "curiosity", 5], ["Tension", "anticipation", 7], ["Participation", "engagement", 6], ["Reveal", "awe", 10], ["Aftermath", "stillness", 3], ["Response", "meaning", 5], ["Action", "intent", 5]],
    camera: ["Use camera language in service of the central reveal only."],
    motion: ["Every repeated movement should reinforce the campaign gesture."],
    typography: ["Campaign type can be dominant; protect readability at the climax."],
    imagery: ["One image language, aggressively curated."],
    interaction: ["Participation should be understandable immediately."],
    transitions: ["Build toward the one rule-breaking transition."],
    materials: ["Use materials only if central to the campaign identity."],
    lighting: ["Lighting changes can be structural beats, not ambient decoration."],
    sound: ["A sonic payoff can amplify the climax; default to restraint beforehand."],
    noGo: ["No second competing big idea.", "No overlong campaign microsite.", "No utility sections interrupting tension before the reveal."]
  },
  automotive: {
    archetype: "performance identity",
    coreTruth: "Automotive storytelling must make stance, motion, engineering and cockpit feel like one performance identity.",
    thesisSeeds: ["Build tension around contained performance before releasing motion.", "Let surfaces reveal speed before the vehicle moves.", "Move from silhouette to engineering to command."],
    memorySeeds: ["the car felt fast before it ever moved", "light revealed the vehicle like stored energy", "the cockpit transition made the visitor feel in control"],
    visualPremises: ["Start with silhouette and controlled highlights, then increase access and velocity.", "Use reflections and surface travel to sell form.", "Contrast exterior authority with cockpit precision."],
    experiencePremises: ["Silhouette → form → engineering → motion → cockpit → performance → ownership.", "Delay full-car exposure until tension has accumulated.", "Use speed sparingly so acceleration has meaning."],
    signatureSeeds: ["A travelling light reveals the complete vehicle and releases it into motion.", "The camera transitions through the exterior into the cockpit in one controlled acceleration.", "Engineering layers collapse back into the full car at the exact moment motion begins."],
    arc: [["Silhouette", "anticipation", 5], ["Form", "admiration", 7], ["Engineering", "respect", 6], ["Restraint", "tension", 4], ["Release", "adrenaline", 10], ["Cockpit", "control", 6], ["Ownership", "desire", 5]],
    camera: ["Use low angles, tracking and long controlled passes; reserve orbiting for form inspection.", "Protect wheel stance and horizon integrity."],
    motion: ["Acceleration must contrast with stillness.", "Do not make every section fast because the product is fast."],
    typography: ["Use technical precision for specs and a stronger display voice for performance statements."],
    imagery: ["Prioritize silhouette, surfaces, driving context and cockpit detail."],
    interaction: ["Inspection can be user-controlled; performance moments should stay directed."],
    transitions: ["Use reflections, tunnels, cockpit thresholds and speed continuity."],
    materials: ["Paint, carbon, metal, glass and interior trim need distinct response."],
    lighting: ["Lighting should sculpt form and stored energy."],
    sound: ["Engine/electric performance sound is high-impact—use only at earned moments."],
    noGo: ["No constant aggressive camera shake.", "No endless racetrack montage.", "No technical spec dump before emotional desire."]
  },
  fashion: {
    archetype: "attitude in motion",
    coreTruth: "Fashion sells a point of view embodied through silhouette, material, casting and movement.",
    thesisSeeds: ["Let silhouette control the composition before detail explains it.", "Turn the collection's attitude into the site's rhythm.", "Use movement to reveal construction, not just spectacle."],
    memorySeeds: ["the collection's silhouette controlled the whole interface", "the site moved with the same attitude as the casting", "material detail became the transition language"],
    visualPremises: ["Use body, crop, negative space and scale as primary design tools.", "Alternate confrontational hero imagery with tactile detail.", "Keep product access clear beneath editorial expression."],
    experiencePremises: ["Attitude → silhouette → movement → material → collection → identity → acquisition.", "Let rhythm vary between hard cuts and long holds.", "Protect the collection from excessive interface chrome."],
    signatureSeeds: ["A silhouette breaks apart into material/detail and returns as the complete look.", "Movement freezes at one decisive pose while the interface reorganizes around it.", "The collection transitions through radically different environments while maintaining one body position."],
    arc: [["Attitude", "provocation", 7], ["Silhouette", "recognition", 6], ["Movement", "energy", 8], ["Material", "intimacy", 4], ["Signature", "awe", 10], ["Collection", "desire", 6], ["Acquire", "intent", 4]],
    camera: ["Use fashion framing: full silhouette, intentional crop, close material study.", "Camera movement must respect body and garment movement."],
    motion: ["Rhythm should reflect campaign attitude; avoid generic smooth-scroll sameness."],
    typography: ["Type can act as image, but product information remains disciplined."],
    imagery: ["Casting, styling and art direction matter more than image quantity."],
    interaction: ["Keep shopping clear while editorial moments can be more directed."],
    transitions: ["Use pose, fabric, crop, flash, shadow or material continuity."],
    materials: ["Fabric/material response should be specific, not generic gloss."],
    lighting: ["Follow campaign lighting consistently across rendered and photographed content."],
    sound: ["Use soundtrack/rhythm only when campaign identity depends on it."],
    noGo: ["No generic luxury editorial template.", "No movement that distorts garment readability.", "No typography treatment copied across unrelated collections."]
  }
};

const tierIntensity: Record<DirectorBrief["tier"], { shotCount: number; ambition: string; signatureShare: number }> = {
  cinematic: { shotCount: 6, ambition: "One strong idea with disciplined execution and a single concentrated hero moment.", signatureShare: 22 },
  immersive: { shotCount: 8, ambition: "A richer chapter system with purposeful interaction and one fully developed signature sequence.", signatureShare: 26 },
  signature: { shotCount: 10, ambition: "Bespoke art direction with deeper proof, custom asset work and a signature sequence that can anchor the portfolio.", signatureShare: 30 },
  flagship: { shotCount: 12, ambition: "A complete authored world with multiple supporting peaks but one unmistakable primary climax.", signatureShare: 34 },
};

export function directProject(input: unknown): DirectorTreatment {
  const brief = parseDirectorBrief(input);
  const profile = profiles[brief.projectType];
  const tier = tierIntensity[brief.tier];
  const territories = createTerritories(brief, profile);
  const selected = chooseTerritory(territories);
  const emotionalArc = profile.arc.map(([label, emotion, intensity], index) => ({
    id: slug(label),
    label,
    emotion,
    visitorQuestion: visitorQuestionFor(index, profile.arc.length, brief),
    purpose: purposeFor(index, profile.arc.length, brief, label),
    intensity,
    informationDensity: informationDensityFor(index, profile.arc.length),
    interactionLevel: interactionFor(index, intensity),
    proofLevel: proofFor(index, profile.arc.length),
    conversionWeight: conversionFor(index, profile.arc.length),
  }));
  const signatureBeat = emotionalArc.reduce((best, beat) => beat.intensity > best.intensity ? beat : best, emotionalArc[0]);
  const assets = brief.existingAssets.map((asset, index) => assessAsset(asset, index, brief));
  const treatmentBase = {
    version: 1 as const,
    projectName: brief.projectName,
    projectType: brief.projectType,
    tier: brief.tier,
    territories,
    selectedTerritoryId: selected.id,
    thesis: selected.thesis,
    memoryStatement: `People will remember ${brief.projectName} because ${selected.memory}.`,
    audience: brief.audience,
    objective: brief.objective,
    primaryAction: brief.primaryAction,
    emotionalArc,
    signatureMoment: {
      name: signatureBeat.label,
      description: selected.signatureMoment,
      whyMemorable: selected.memory,
      prerequisites: signaturePrerequisites(brief, assets),
      protectFrom: ["Do not spend equivalent visual intensity in the preceding chapter.", "Do not repeat the same camera/motion trick elsewhere.", "Do not bury the moment under explanatory copy."],
    },
    artBible: createArtBible(brief, profile, selected),
    grammar: createGrammar(brief, profile),
    shotBible: createShotBible(brief, profile, emotionalArc, tier.shotCount),
    assets,
    budgetAllocation: createBudgetAllocation(brief, tier.signatureShare),
    noGoRules: [...profile.noGo, ...brief.constraints.map((item) => `Respect constraint: ${item}`)],
    originalityRules: [
      "If the project can be reskinned for another client by swapping logo, colors and copy, the direction has failed.",
      "Do not reuse the same signature mechanic from the last flagship project unless the concept makes it unavoidable.",
      "At least three of camera, motion, typography, navigation, interaction, composition and transition grammar must be concept-specific.",
      "Remove any immersive technique whose only justification is that Forge supports it.",
    ],
    conversionArc: [
      `Earn attention before asking for ${brief.primaryAction}.`,
      "Introduce low-friction exploration before the final primary action.",
      "Place proof before the highest-friction conversion moment.",
      `End with one dominant action: ${brief.primaryAction}.`,
    ],
    mobileInterpretation: [
      "Preserve thesis, emotional order and signature idea even when spatial complexity is reduced.",
      "Replace fragile 3D/camera depth with crop, scale, layering, video or controlled transform when needed.",
      "Do not turn mobile into a stack of desktop leftovers; re-compose each major chapter for the narrower frame.",
      "Keep the primary action reachable without waiting through long cinematic sequences.",
    ],
    productionPriorities: createProductionPriorities(brief, selected, tier.ambition, assets),
    qualityBar: [
      tier.ambition,
      "The signature moment must be clearly stronger than supporting moments.",
      "Every major scene must answer a visitor question, provide proof, or advance emotion.",
      "The experience must remain understandable with motion reduced.",
      "No placeholder-quality asset may occupy a hero role in the final cut.",
    ],
    critiqueQuestions: [
      "Is the thesis visible without reading a strategy document?",
      "Is the signature moment still the strongest moment in the experience?",
      "Is there enough quiet before the climax for contrast to exist?",
      "Are we explaining something that should be shown?",
      "Are we using 3D because the story requires it or because Forge can?",
      "Does every interaction reveal meaning, evidence or control?",
      "Does mobile preserve the same idea rather than merely the same content?",
      "Could this project be mistaken for a reskin of another Forge build?",
      "Are weak client assets receiving more screen time than their creative value deserves?",
      "Can the visitor describe one memorable idea after leaving?",
    ],
  };
  const critique = critiqueTreatment({ ...treatmentBase, critique: emptyCritique() });
  return parseDirectorTreatment({ ...treatmentBase, critique });
}

export function critiqueTreatment(input: DirectorTreatment): DirectorCritique {
  const signaturePeaks = input.emotionalArc.filter((beat) => beat.intensity >= 9).length;
  const quietBeats = input.emotionalArc.filter((beat) => beat.intensity <= 3).length;
  const strongAssets = input.assets.filter((asset) => asset.quality === "hero" || asset.quality === "strong").length;
  const weakHeroRisks = input.assets.filter((asset) => asset.quality === "weak" && asset.productionDecision === "use").length;
  const hasProofBeforeConversion = input.emotionalArc.some((beat, index) => beat.proofLevel >= 5 && index < input.emotionalArc.length - 1);
  const distinctGrammar = new Set([
    ...input.grammar.camera,
    ...input.grammar.motion,
    ...input.grammar.transitions,
    ...input.grammar.interaction,
  ]).size;

  const thesisClarity = clampScore(input.thesis.length <= 180 ? 9 : 8);
  const signatureMomentStrength = clampScore(signaturePeaks === 1 ? 10 : signaturePeaks === 2 ? 8 : 6);
  const pacingContrast = clampScore((quietBeats ? 8 : 5) + (signaturePeaks === 1 ? 1 : 0));
  const visualCoherence = clampScore(input.grammar.typography.length >= 2 && input.grammar.camera.length >= 2 && input.grammar.motion.length >= 2 ? 9 : 7);
  const brandSpecificity = clampScore(input.originalityRules.length >= 3 && input.noGoRules.length >= 3 ? 9 : 7);
  const interactionPurpose = clampScore(input.grammar.interaction.length >= 2 ? 9 : 7);
  const mobileIntegrity = clampScore(input.mobileInterpretation.length >= 3 ? 9 : 7);
  const conversionIntegrity = clampScore(hasProofBeforeConversion ? 9 : 6);
  const originality = clampScore(distinctGrammar >= 8 ? 9 : 7);
  const assetDiscipline = clampScore(weakHeroRisks ? 5 : strongAssets || input.assets.length === 0 ? 9 : 7);
  const dimensions = [thesisClarity, signatureMomentStrength, pacingContrast, visualCoherence, brandSpecificity, interactionPurpose, mobileIntegrity, conversionIntegrity, originality, assetDiscipline];
  const overall = Math.round(dimensions.reduce((sum, value) => sum + value, 0) / dimensions.length);
  const blockers: string[] = [];
  const warnings: string[] = [];
  const cuts: string[] = [];
  const directives: string[] = [];

  if (signaturePeaks > 2) blockers.push("Too many climax-level beats. Reduce 9–10 intensity moments until one primary signature moment clearly dominates.");
  if (!hasProofBeforeConversion) blockers.push("The experience asks for conversion without enough preceding proof.");
  if (weakHeroRisks) blockers.push("Weak assets are still assigned to production use; upgrade, replace or demote them before final production.");
  if (!quietBeats) warnings.push("The emotional arc has no true low-intensity reset; the climax may feel flatter than intended.");
  if (distinctGrammar < 8) warnings.push("The project grammar is not yet specific enough to protect against a generic Forge look.");
  input.emotionalArc.forEach((beat, index) => {
    if (index > 0 && beat.intensity >= 8 && input.emotionalArc[index - 1].intensity >= 8) cuts.push(`Separate consecutive high-intensity beats around ${beat.label}.`);
  });
  directives.push("Protect the thesis and signature moment before adding any new effect or section.");
  directives.push("Prefer removing a redundant technique over polishing it.");
  if (overall < 9) directives.push("Do not lock production until the critique reaches 9/10 without unresolved blockers.");

  return { thesisClarity, signatureMomentStrength, pacingContrast, visualCoherence, brandSpecificity, interactionPurpose, mobileIntegrity, conversionIntegrity, originality, assetDiscipline, overall, blockers, warnings, cuts, directives };
}

function createTerritories(brief: DirectorBrief, profile: ProjectProfile): [DirectorTerritory, DirectorTerritory, DirectorTerritory] {
  return profile.thesisSeeds.map((thesis, index) => ({
    id: `territory-${index + 1}`,
    name: territoryName(brief, index),
    oneLine: thesis,
    thesis,
    memory: profile.memorySeeds[index],
    strategicReason: `${profile.coreTruth} This territory supports ${brief.objective.toLowerCase()} by giving ${brief.audience.toLowerCase()} a clear emotional and visual idea rather than a collection of unrelated sections.`,
    visualPremise: profile.visualPremises[index],
    experientialPremise: profile.experiencePremises[index],
    signatureMoment: profile.signatureSeeds[index],
    risk: territoryRisk(index, brief),
    scores: {
      distinctiveness: clampScore(9 - Math.abs(index - 1)),
      brandFit: clampScore(index === 0 ? 9 : 8),
      memorability: clampScore(index === 1 ? 10 : 9),
      feasibility: clampScore(brief.tier === "flagship" ? 9 : index === 1 ? 8 : 9),
      conversionFit: clampScore(index === 2 ? 9 : 8),
    },
  })) as [DirectorTerritory, DirectorTerritory, DirectorTerritory];
}

function chooseTerritory(territories: DirectorTerritory[]) {
  return [...territories].sort((left, right) => territoryScore(right) - territoryScore(left))[0];
}

function territoryScore(territory: DirectorTerritory) {
  const { distinctiveness, brandFit, memorability, feasibility, conversionFit } = territory.scores;
  return distinctiveness * 1.25 + brandFit * 1.2 + memorability * 1.35 + feasibility + conversionFit;
}

function assessAsset(asset: DirectorBrief["existingAssets"][number], index: number, brief: DirectorBrief) {
  const normalized = `${asset.label} ${asset.notes ?? ""} ${asset.type}`.toLowerCase();
  const heroSignals = /hero|primary|master|high.?res|4k|glb|model|drone|campaign|render/.test(normalized);
  const weakSignals = /low.?res|placeholder|draft|old|generic|stock|thumbnail/.test(normalized);
  const quality = weakSignals ? "weak" : heroSignals ? "hero" : index < 3 ? "strong" : "supporting";
  const creativeValue = quality === "hero" ? 10 : quality === "strong" ? 8 : quality === "supporting" ? 6 : 3;
  const productionDecision = quality === "weak" ? "replace" : quality === "hero" ? "use" : brief.tier === "flagship" && creativeValue < 7 ? "upgrade" : "use";
  return {
    id: asset.id,
    label: asset.label,
    mediaType: asset.type,
    quality,
    creativeValue,
    productionDecision,
    role: quality === "hero" ? "Candidate for opening/signature support." : quality === "strong" ? "Primary chapter support." : quality === "supporting" ? "Secondary proof or utility." : "Do not place in a hero role.",
    reason: asset.notes ?? `Assessed from ${asset.type} role and supplied asset context.`,
    improvementBrief: productionDecision === "replace" || productionDecision === "upgrade" ? `Create a production-grade replacement aligned to the selected ${brief.projectType} direction.` : undefined,
  } as const;
}

function createArtBible(brief: DirectorBrief, profile: ProjectProfile, selected: DirectorTerritory) {
  return {
    northStar: selected.thesis,
    world: `${selected.visualPremise} The world must feel specific to ${brief.projectName}; brand truth: ${brief.brandTruth}`,
    typographyCharacter: profile.typography.join(" "),
    photographyCharacter: profile.imagery.join(" "),
    paletteLogic: "Derive palette from brand/product/place materials and the emotional arc. Use accent color only where hierarchy or conversion requires it.",
    materialLogic: profile.materials.join(" "),
    whitespace: "Use negative space as pacing. Quiet chapters should physically feel quieter than climax chapters.",
    uiChrome: "Keep interface chrome subordinate to the experience. Utility must remain obvious, but visible controls should never become the visual concept by accident.",
  };
}

function createGrammar(brief: DirectorBrief, profile: ProjectProfile) {
  return {
    camera: profile.camera,
    motion: profile.motion,
    composition: ["Every frame must have a dominant subject and an intentional quiet area.", "Compose copy and imagery together before adding motion.", "Change composition grammar when emotional state changes, not every section."],
    typography: profile.typography,
    color: ["Tie color changes to emotional state or information hierarchy.", `Keep the palette grounded in ${brief.brandTruth.length > 260 ? `${brief.brandTruth.slice(0, 259).trimEnd()}…` : brief.brandTruth}.`],
    materials: profile.materials,
    lighting: profile.lighting,
    imagery: profile.imagery,
    interaction: profile.interaction,
    transitions: profile.transitions,
    sound: profile.sound,
    spatial: ["Use depth to communicate meaning, hierarchy or passage.", "Do not add 3D depth to utility content that becomes less legible because of it."],
    mobile: ["Recompose, do not merely scale down.", "Preserve signature idea through simpler spatial language if necessary.", "Reduce scrub complexity before reducing narrative clarity."],
  };
}

function createShotBible(brief: DirectorBrief, profile: ProjectProfile, emotionalArc: DirectorTreatment["emotionalArc"], shotCount: number) {
  return Array.from({ length: Math.min(shotCount, Math.max(emotionalArc.length, 3)) }, (_, index) => {
    const beat = emotionalArc[index % emotionalArc.length];
    const next = emotionalArc[(index + 1) % emotionalArc.length];
    const isSignature = beat.intensity >= 9;
    return {
      id: `shot-${String(index + 1).padStart(2, "0")}`,
      chapterId: beat.id,
      title: `${beat.label} / ${index + 1}`,
      purpose: beat.purpose,
      subject: subjectForBeat(brief, beat.label),
      framing: isSignature ? "Begin with controlled context, then give the subject the largest clean frame of the experience." : index === 0 ? "Establish context with strong negative space for the thesis." : "Frame one dominant subject; avoid equal visual competition.",
      lensCharacter: isSignature ? "Heroic but readable; choose lens character for spatial truth rather than distortion." : index % 3 === 0 ? "Wider environmental character." : index % 3 === 1 ? "Natural human-scale perspective." : "Compressed/detail perspective.",
      movement: profile.camera[index % profile.camera.length],
      durationCharacter: beat.intensity >= 8 ? "earned and deliberate" : beat.intensity <= 3 ? "patient hold" : "measured",
      emotion: beat.emotion,
      copyRelationship: beat.informationDensity >= 6 ? "Let copy lead; motion stays subordinate." : "Use copy as a compositional counterweight, not a caption over the subject.",
      transitionIn: index === 0 ? "Begin from a clean thesis state." : profile.transitions[index % profile.transitions.length],
      transitionOut: index === emotionalArc.length - 1 ? `Resolve toward ${brief.primaryAction}.` : `Carry one visual anchor into ${next.label}.`,
      reserveForSignatureMoment: isSignature,
    };
  });
}

function createBudgetAllocation(brief: DirectorBrief, signatureShare: number) {
  let assetCreation = brief.existingAssets.length >= 8 ? 12 : 18;
  if (brief.tier === "flagship") assetCreation += 4;
  const opening = brief.projectType === "campaign" || brief.projectType === "fashion" ? 20 : 16;
  const artDirectionUi = brief.projectType === "saas" ? 16 : 12;
  const supportingUtility = brief.projectType === "saas" || brief.projectType === "commerce" ? 10 : 7;
  const coreStory = 100 - signatureShare - assetCreation - opening - artDirectionUi - supportingUtility;
  return { signatureMoment: signatureShare, opening, coreStory, assetCreation, artDirectionUi, supportingUtility };
}

function createProductionPriorities(brief: DirectorBrief, territory: DirectorTerritory, ambition: string, assets: DirectorTreatment["assets"]) {
  const weak = assets.filter((asset) => asset.productionDecision === "replace" || asset.productionDecision === "upgrade");
  return [
    `Lock thesis first: ${territory.thesis}`,
    `Protect the signature moment: ${territory.signatureMoment}`,
    ambition,
    weak.length ? `Resolve ${weak.length} asset quality gap(s) before final scene polish.` : "Use existing strong assets selectively; do not add asset volume without narrative need.",
    `Optimize every supporting decision toward ${brief.objective}.`,
    "Run Director Critique after structure lock, first motion pass, mobile pass and final cut.",
  ].map((value)=>fitDirective(value));
}

function fitDirective(value:string,max=300) {
  if(value.length<=max) return value;
  return value.slice(0,max-1).trimEnd()+"…";
}

function signaturePrerequisites(brief: DirectorBrief, assets: DirectorTreatment["assets"]) {
  const needs = assets.filter((asset) => asset.productionDecision === "replace" || asset.productionDecision === "upgrade").slice(0, 3).map((asset) => `${asset.label}: ${asset.productionDecision}`);
  return ["A locked thesis and visual grammar.", "A quiet preceding beat that preserves contrast.", "Production-grade hero assets.", ...needs, `A clear path from the moment toward ${brief.primaryAction}.`];
}

function visitorQuestionFor(index: number, length: number, brief: DirectorBrief) {
  if (index === 0) return "Why should I pay attention?";
  if (index === length - 1) return `What should I do next to ${brief.primaryAction.toLowerCase()}?`;
  if (index < length / 3) return "What is distinctive here?";
  if (index < (length * 2) / 3) return "Why should I believe or desire this?";
  return "Why is this worth acting on now?";
}

function purposeFor(index: number, length: number, brief: DirectorBrief, label: string) {
  if (index === 0) return `Earn attention and establish ${brief.projectName}'s premise through ${label.toLowerCase()}.`;
  if (index === length - 1) return `Resolve accumulated desire and proof into ${brief.primaryAction}.`;
  return `Advance the emotional arc through ${label.toLowerCase()} while proving the selected thesis.`;
}

function informationDensityFor(index: number, length: number) {
  if (index === 0) return 2;
  if (index === length - 1) return 4;
  return index % 3 === 1 ? 6 : index % 3 === 2 ? 4 : 3;
}

function interactionFor(index: number, intensity: number) {
  if (intensity >= 9) return 4;
  return index % 2 === 0 ? 3 : 5;
}

function proofFor(index: number, length: number) {
  if (index === 0) return 1;
  if (index >= Math.floor(length / 2) && index < length - 1) return 7;
  return 3;
}

function conversionFor(index: number, length: number) {
  if (index === length - 1) return 10;
  if (index >= length - 2) return 6;
  return index === 0 ? 1 : 2;
}

function subjectForBeat(brief: DirectorBrief, label: string) {
  const mapping: Partial<Record<DirectorBrief["projectType"], string>> = {
    property: "architecture / place",
    product: "hero product",
    automotive: "vehicle",
    fashion: "look / silhouette",
    hospitality: "destination / guest experience",
    saas: "real product interface",
    portfolio: "selected work",
    commerce: "collection / product",
    campaign: "campaign gesture",
    brand: "brand world",
  };
  return `${mapping[brief.projectType] ?? brief.projectName} — ${label}`;
}

function territoryName(brief: DirectorBrief, index: number) {
  const names: Record<DirectorBrief["projectType"], [string, string, string]> = {
    brand: ["The World", "The Contrast", "The System"],
    product: ["Layer by Layer", "The Defining Truth", "From Object to Ownership"],
    property: ["Rise", "Arrival", "Threshold"],
    hospitality: ["Disappear", "Arrival Ritual", "Natural Rhythm"],
    portfolio: ["Work First", "Point of View", "Proof in Process"],
    saas: ["Collapse Complexity", "Friction Disappears", "Invisible Intelligence"],
    commerce: ["Editorial to Ownership", "Material Navigation", "World to Shop"],
    campaign: ["One Gesture", "Earn the Reveal", "Do the Line"],
    automotive: ["Contained Performance", "Surface Speed", "Command"],
    fashion: ["Silhouette", "Campaign Rhythm", "Construction in Motion"],
  };
  return `${brief.projectName}: ${names[brief.projectType][index]}`;
}

function territoryRisk(index: number, brief: DirectorBrief) {
  if (index === 0) return "Risk: the concept can become too restrained if the signature moment is under-produced.";
  if (index === 1) return brief.tier === "cinematic" ? "Risk: ambition may exceed the selected production tier unless the signature sequence is tightly scoped." : "Risk: spectacle can overpower clarity if the climax is not disciplined.";
  return "Risk: the direction can become too explanatory if utility and conversion are allowed to dominate the art direction.";
}

function emptyCritique(): DirectorCritique {
  return { thesisClarity: 0, signatureMomentStrength: 0, pacingContrast: 0, visualCoherence: 0, brandSpecificity: 0, interactionPurpose: 0, mobileIntegrity: 0, conversionIntegrity: 0, originality: 0, assetDiscipline: 0, overall: 0, blockers: [], warnings: [], cuts: [], directives: [] };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "director";
}

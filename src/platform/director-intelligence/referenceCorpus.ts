import type { DirectorTreatment } from "@/src/platform/directorSchema";
import { broaderImmersiveReferenceCorpus } from "@/src/platform/director-intelligence/broaderReferenceCorpus";

export type ImmersiveReferenceEvidenceLevel =
  | "catalog"
  | "visual-preview"
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

type VisualPreviewEvidence = {
  confidence?: number;
  observedTraits: string[];
  transferableLessons: string[];
  constructionPatternIds: string[];
};

const visualPreview = (
  observedTraits: string[],
  transferableLessons: string[],
  constructionPatternIds: string[],
  confidence = 0.8,
): VisualPreviewEvidence => ({
  confidence,
  observedTraits,
  transferableLessons,
  constructionPatternIds,
});

/**
 * Visual-preview evidence is intentionally limited to what can be seen in the
 * public GetLayers preview still. It never claims motion, scroll behavior,
 * pointer behavior or underlying technology that a still cannot establish.
 *
 * 48 of the current 49 public templates were visually inspected on 2026-09-18.
 * Northwall's public preview endpoint returned a cache miss during review, so
 * it remains catalog-only until it can be inspected.
 */
const visualPreviewEvidence: Record<string, VisualPreviewEvidence> = {
  lumora: visualPreview(
    [
      "Light editorial hero with a large sculptural black portrait occupying the center-right of the frame.",
      "A translucent warm organic field, oversized low-opacity wordmark and small floating UI create multiple visual depths.",
    ],
    [
      "A portrait can feel spatial without a full 3D world when subject, translucent field, watermark and interface occupy distinct depth planes.",
      "Large identity typography behind a subject can create scale while the actionable UI stays small.",
    ],
    ["subject-occludes-display-type", "editorial-depth-stack", "edge-utility-central-spectacle"],
  ),
  kimi: visualPreview(
    [
      "High-key technical editorial layout with a central helmeted athlete, oversized condensed name on the left and small structured data on the right.",
      "A faint line/track diagram acts as background structure rather than a boxed interface.",
    ],
    [
      "Frame a central subject with asymmetric metadata instead of surrounding it with equal cards.",
      "Use a restrained technical grid or diagram as world language when it reinforces the category.",
    ],
    ["edge-utility-central-spectacle", "technical-chrome-world-language", "editorial-depth-stack"],
  ),
  soda: visualPreview(
    [
      "Monochromatic emerald product stage with one oversized tilted can and a few floating cherries, leaves and bubbles at varied depths.",
      "Large italic display type sits around the product while small commerce controls stay at the edges.",
    ],
    [
      "Build commerce immersion around one authoritative product and a few story-relevant props, not a wall of product cards.",
      "Let display typography and product silhouette share the composition while utility stays peripheral.",
    ],
    ["object-prop-depth-stage", "edge-utility-central-spectacle", "staged-subject-hero"],
  ),
  laocoon: visualPreview(
    [
      "Dark bronze-black portfolio hero with a large metallic horse sculpture on the right and a warm flowing light ribbon behind it.",
      "Large serif copy and short body columns occupy a quiet left plane with thin editorial guides.",
    ],
    [
      "Match atmosphere and lighting language to the hero material so the subject and background read as one art direction.",
      "Strong asymmetry plus quiet editorial typography can make one 3D object carry an entire hero.",
    ],
    ["staged-subject-hero", "atmosphere-as-layout", "split-stage-editorial"],
  ),
  baseline: visualPreview(
    [
      "Deep monochrome court-blue frame with oversized stacked navigation labels and extensive negative space.",
      "Only a small brand mark, close control, CTA and social utility compete with the navigation.",
    ],
    [
      "Scale and negative space can create premium immersion without adding visual effects.",
      "When a menu becomes the composition, remove secondary chrome rather than decorating around it.",
    ],
    ["immersive-without-webgl", "density-rhythm-and-silence", "anchor-section-sets-system"],
  ),
  house: visualPreview(
    [
      "Full-bleed misty landscape makes a modern house deliberately small relative to the environment.",
      "A faint oversized initial, tiny utility and a compact bottom dock sit over the photographic world.",
    ],
    [
      "Use environmental scale to make architecture feel cinematic; the building does not need to fill the frame.",
      "Keep interface chrome sparse when the landscape itself supplies the composition.",
    ],
    ["small-subject-big-environment", "atmosphere-as-layout", "edge-utility-central-spectacle"],
  ),
  halden: visualPreview(
    [
      "Warm off-white commerce frame dominated by enormous red condensed typography.",
      "Furniture thumbnails and price labels are distributed around the typography as annotations rather than arranged in a card grid.",
    ],
    [
      "Let typography become the product-layout grid when the brand can support an editorial commerce treatment.",
      "Distribute commerce objects spatially around a dominant type system instead of defaulting to uniform cards.",
    ],
    ["immersive-without-webgl", "type-media-countermotion", "density-rhythm-and-silence"],
  ),
  longplay: visualPreview(
    [
      "Dreamlike full-bleed landscape with a glowing retro television as the single surreal object in the environment.",
      "Mixed script/sans typography and small centered utility are overlaid with very little interface chrome.",
    ],
    [
      "One memorable object placed inside a coherent world can carry more atmosphere than several independent effects.",
      "When the environment is the hero, keep typography and utility sparse enough to preserve the illusion.",
    ],
    ["atmosphere-as-layout", "small-subject-big-environment", "single-signature-peak"],
  ),
  brewns: visualPreview(
    [
      "Chocolate-brown product stage with oversized coffee packaging on the right and huge brand typography on the left.",
      "Packaging graphics, headline typography and small commerce utility share the same visual language.",
    ],
    [
      "Treat packaging as a major compositional object rather than a thumbnail.",
      "Connect on-package typography and page typography so product and interface feel like one system.",
    ],
    ["staged-subject-hero", "split-stage-editorial", "edge-utility-central-spectacle"],
  ),
  artefakt: visualPreview(
    [
      "Black technical product stage with a glossy puffer jacket centered over a darker skeletal/wing-like silhouette.",
      "Small bracketed annotations and monospaced support UI remain at the frame edges.",
    ],
    [
      "Create depth around one product with a secondary silhouette before adding more foreground objects.",
      "Technical chrome works best as a peripheral framing language rather than the main subject.",
    ],
    ["staged-subject-hero", "technical-chrome-world-language", "edge-utility-central-spectacle"],
  ),
  "ai-studio": visualPreview(
    [
      "High-key white hero with a central stack of tall dark media panels arranged in perspective.",
      "Oversized black typography sits behind the panel stack and is visibly occluded by it.",
    ],
    [
      "Interface cards themselves can become the spatial hero when arranged as one coherent perspective object.",
      "Occluding oversized semantic type with a central media stack creates depth without requiring a full environment.",
    ],
    ["subject-occludes-display-type", "editorial-depth-stack", "edge-utility-central-spectacle"],
  ),
  wanderlust: visualPreview(
    [
      "Dark cinematic landscape with a foreground human silhouette and a smaller translucent landscape plane floating near the center.",
      "Visible interface chrome is almost absent, leaving scale to the person, environment and nested viewport.",
    ],
    [
      "Foreground silhouettes are a strong scale cue in destination work.",
      "A nested translucent media plane can add depth to a cinematic environment without turning the whole frame into UI.",
    ],
    ["small-subject-big-environment", "atmosphere-as-layout", "editorial-depth-stack"],
  ),
  vesper: visualPreview(
    [
      "Dark cyan-blue atmosphere dominated by one large glowing toroidal particle/mesh form in the center.",
      "Large headline sits upper-left while small explanatory copy and utility occupy the lower edges.",
    ],
    [
      "One procedural object can carry a SaaS hero when copy and chrome remain deliberately minimal.",
      "Use the field's natural voids and silhouette to determine typography placement.",
    ],
    ["procedural-field-as-hero", "edge-utility-central-spectacle", "dom-webgl-contract"],
  ),
  "ai-creator": visualPreview(
    [
      "High-key editorial portrait with a centered stylized person in front of an enormous serif name.",
      "The subject occludes the display type while a thin lower band contains copy and CTA utility.",
    ],
    [
      "Use subject/type occlusion to make identity feel spatial while keeping the lower utility plane calm.",
      "A simple editorial band can carry conversion without competing with the hero portrait.",
    ],
    ["subject-occludes-display-type", "split-stage-editorial", "embedded-proof-in-hero"],
  ),
  stride: visualPreview(
    [
      "Dark blue fintech stage organized around a bright radial node/line visualization in the center.",
      "Headline, explanatory copy, CTA and large numeric proof are distributed across separate quadrants around the visualization.",
    ],
    [
      "Let one abstract visualization connect promise, proof and CTA rather than placing those elements into separate cards.",
      "Large proof values can act as compositional anchors inside the hero.",
    ],
    ["procedural-field-as-hero", "edge-utility-central-spectacle", "embedded-proof-in-hero"],
  ),
  "new-era": visualPreview(
    [
      "Black field with a luminous red-blue circular wave/particle halo framing centered copy and calls to action.",
      "The active visual energy stays mostly at the perimeter, leaving a readable central void.",
    ],
    [
      "A procedural perimeter or halo can frame conversion content while keeping the center calm.",
      "Use the empty center of an effect as a deliberate content zone instead of layering text over its noisiest area.",
    ],
    ["procedural-field-as-hero", "edge-utility-central-spectacle", "density-rhythm-and-silence"],
  ),
  codescan: visualPreview(
    [
      "Dark green/black room of multiple vintage monitors arranged at different depths.",
      "Viewfinder border, REC/FPS/timestamp details and condensed display type make the entire frame feel like one instrument.",
    ],
    [
      "Multiple screens stay coherent when they belong to one spatial room and one technical interface language.",
      "Technical overlays should reinforce the world premise and remain secondary to the main headline.",
    ],
    ["technical-chrome-world-language", "editorial-depth-stack", "single-world-under-interface"],
  ),
  "creative-director": visualPreview(
    [
      "Full-screen central portrait against a blue-white-warm radial field with service labels positioned around the body.",
      "Oversized pixel/dot display type is cropped by the top edge and a compact black dock anchors the bottom.",
    ],
    [
      "A portrait can become the spatial index for labels and services rather than placing those services in cards.",
      "Cropping oversized type and docking utility can create strong scale without obscuring the central subject.",
    ],
    ["subject-occludes-display-type", "edge-utility-central-spectacle", "editorial-depth-stack"],
  ),
  auralis: visualPreview(
    [
      "Dark smoky environment with a luminous point-cloud humanoid as the central symbol.",
      "Large words balance the figure from left and right while a technical lattice sits behind the particles.",
    ],
    [
      "Use a single procedural figure as the persistent brand symbol and let large type counterbalance its silhouette.",
      "A restrained grid can make particle art feel intentional and technical rather than decorative.",
    ],
    ["procedural-field-as-hero", "technical-chrome-world-language", "edge-utility-central-spectacle"],
  ),
  dantora: visualPreview(
    [
      "High-key medical hero with an enormous translucent green DNA-like structure occupying the center-right behind the content.",
      "Large explanatory copy sits left while service pills cluster at the lower-right and CTAs stay lower-left.",
    ],
    [
      "A domain-specific scientific form can supply depth and identity while semantic information remains on a calm plane.",
      "Separate primary action and service taxonomy around the edges so the scientific hero stays dominant.",
    ],
    ["edge-utility-central-spectacle", "editorial-depth-stack", "atmosphere-as-layout"],
  ),
  aerra: visualPreview(
    [
      "Blue-dusk property hero with a modern house centered low in the frame and an oversized outline letterform/brand motif behind it.",
      "Headline, body and booking CTA sit above the building with a compact top navigation.",
    ],
    [
      "Use an architectural subject plus oversized low-contrast brand geometry to create scale without covering the building.",
      "Keep conversion above the architecture when the building needs an uninterrupted silhouette.",
    ],
    ["staged-subject-hero", "subject-occludes-display-type", "edge-utility-central-spectacle"],
  ),
  altitude: visualPreview(
    [
      "Full-screen night mountain landscape with a large serif headline and compact email form centered in the available sky.",
      "A translucent warm organic form sits in the left foreground while proof figures anchor the bottom corners.",
    ],
    [
      "Use the environment's natural negative space as the content container instead of placing a card over the image.",
      "Foreground atmosphere plus distant horizon creates depth while edge proof keeps the center focused.",
    ],
    ["atmosphere-as-layout", "small-subject-big-environment", "embedded-proof-in-hero"],
  ),
  forma: visualPreview(
    [
      "High-key agency composition with a large contact statement and input fields above a wide lavender surreal landscape panel.",
      "Three compact information/service blocks sit below the immersive media band.",
    ],
    [
      "A large atmospheric media plane can make a utility-heavy contact section feel immersive without sacrificing direct inputs.",
      "Use one dominant visual band and keep supporting cards low and subordinate.",
    ],
    ["split-stage-editorial", "atmosphere-as-layout", "anchor-section-sets-system"],
  ),
  lumea: visualPreview(
    [
      "Dark sculptural scene with a seated stone-like figure/platform surrounded by two large glowing rings and floating debris.",
      "Large serif headline sits left while explanatory copy and a simple inquiry line sit right.",
    ],
    [
      "One sculptural scene can act as the agency's identity system when copy occupies quiet edges around it.",
      "Use a small number of large light forms to establish spatial depth before adding decorative particles.",
    ],
    ["edge-utility-central-spectacle", "atmosphere-as-layout", "staged-subject-hero"],
  ),
  evolve: visualPreview(
    [
      "Dark technical grid with a huge red-blue point-cloud human head filling the center-right.",
      "Large simple headline sits upper-left while the face's lighting and particle density provide most of the visual complexity.",
    ],
    [
      "A point-cloud portrait can carry an AI/technology premise when its silhouette remains clear at display scale.",
      "Keep language simple when the procedural subject already has high visual information density.",
    ],
    ["procedural-field-as-hero", "technical-chrome-world-language", "edge-utility-central-spectacle"],
  ),
  clarix: visualPreview(
    [
      "Very light editorial canvas with a huge black headline across the upper-left and a glossy cyan-violet humanoid figure cropped hard on the right.",
      "Soft pixel-grid fields sit behind both type and figure while small support copy stays low-left.",
    ],
    [
      "A large CGI character can feel more imposing when cropped by the viewport edge instead of centered like a model viewer.",
      "Light backgrounds can support immersive 3D when type, object scale and soft technical atmosphere provide enough contrast.",
    ],
    ["staged-subject-hero", "edge-utility-central-spectacle", "technical-chrome-world-language"],
  ),
  fromzero: visualPreview(
    [
      "Dark reflective environment centered on a glowing eye displayed on a floating screen with code fragments distributed around it.",
      "Oversized yellow display type anchors the lower-left while an interface/input area sits lower-right.",
    ],
    [
      "Make code/HUD fragments belong to one central artifact or environment rather than scattering unrelated developer decoration.",
      "A single luminous screen can serve as the focal object while large typography and utility balance opposite edges.",
    ],
    ["technical-chrome-world-language", "edge-utility-central-spectacle", "atmosphere-as-layout"],
  ),
  noema: visualPreview(
    [
      "Blue-black cosmic field with a giant translucent particle head centered in the frame.",
      "Large serif words sit on opposite sides of the head while CTA utility and a featured-work card anchor the lower corners.",
    ],
    [
      "A central particle figure can create a strong bilateral composition when large language balances both sides.",
      "Keep case-study utility at the perimeter so the procedural symbol remains the hero.",
    ],
    ["procedural-field-as-hero", "edge-utility-central-spectacle", "embedded-proof-in-hero"],
  ),
  helion: visualPreview(
    [
      "Black/deep-blue cosmic stage with a giant oval galaxy-like particle ring spanning most of the frame.",
      "Centered headline, geometric mark and compact inquiry form are placed inside the ring's calmer interior.",
    ],
    [
      "Use the negative space inside a procedural field as the interface plane.",
      "A single large particle structure can frame brand, copy and conversion without separate section chrome.",
    ],
    ["procedural-field-as-hero", "edge-utility-central-spectacle", "dom-webgl-contract"],
  ),
  "stride-nine": visualPreview(
    [
      "Full-bleed running imagery with one athlete extremely close to the camera and a second athlete deeper in the frame.",
      "Huge white display copy occupies the lower-left while a small live performance card sits at the lower-right.",
    ],
    [
      "Use extreme foreground/background scale contrast in photography or video to create depth before adding 3D.",
      "Embed a small amount of live/performance proof directly into the cinematic hero instead of breaking into a dashboard.",
    ],
    ["editorial-depth-stack", "embedded-proof-in-hero", "edge-utility-central-spectacle"],
  ),
  lumen: visualPreview(
    [
      "Glossy debit card floats centrally over reflective purple water and a large circular arc.",
      "Promise, explanatory copy and secondary headline are positioned around the card at the edges of the composition.",
    ],
    [
      "Ground a product in one coherent material world so reflection, lighting and shape all reinforce the same product story.",
      "Keep copy distributed around the hero object rather than boxing the object and text into separate cards.",
    ],
    ["staged-subject-hero", "atmosphere-as-layout", "edge-utility-central-spectacle"],
  ),
  voxelia: visualPreview(
    [
      "Nearly monochrome cobalt frame with a large blurred vertical form in the center and a tiny dark object offset to the right.",
      "Visible interface is reduced to a small numeric marker in the lower-right.",
    ],
    [
      "Extreme reduction can make scale, blur and color field carry the frame when the subject is intentionally ambiguous.",
      "Do not add interface density merely to fill a sparse visual state.",
    ],
    ["density-rhythm-and-silence", "atmosphere-as-layout"],
    0.72,
  ),
  gringx: visualPreview(
    [
      "Large glowing blue orb dominates the center while glossy hand forms enter from above and below.",
      "Headline and CTA stay left; ratings and usage metrics are grouped at the lower-right.",
    ],
    [
      "Use one primary symbolic object and a small number of supporting body/prop forms to imply interaction and scale.",
      "Balance a high-energy central visual with proof at the perimeter instead of overlaying proof on the object.",
    ],
    ["object-prop-depth-stage", "edge-utility-central-spectacle", "embedded-proof-in-hero"],
  ),
  negantropy: visualPreview(
    [
      "Black star-field composition with a luminous particle/wave structure stretching across the upper half.",
      "Huge condensed headline sits lower-left while explanatory copy, chapter notation and CTA occupy the right.",
    ],
    [
      "Use a large procedural field as environmental evidence while maintaining a strong editorial information plane.",
      "Technical chapter markers and borders can unify a conceptual/scientific world when kept secondary.",
    ],
    ["procedural-field-as-hero", "technical-chrome-world-language", "edge-utility-central-spectacle"],
  ),
  vexon: visualPreview(
    [
      "Black field centered on a bright granular particle ring/void with most of the active texture in the upper-middle.",
      "Mixed-weight oversized headline sits lower-left while body copy and actions stay center-right.",
    ],
    [
      "A field with an intentional void can create a natural split between visual energy and readable information.",
      "Use weight contrast inside a large headline to create rhythm without adding more graphic objects.",
    ],
    ["procedural-field-as-hero", "edge-utility-central-spectacle", "split-stage-editorial"],
  ),
  stackside: visualPreview(
    [
      "High-key white/green fintech hero with a large point-cloud human silhouette centered low in the frame.",
      "Headline and explanation occupy the left while four compact proof cards sit right and a long inquiry bar anchors the bottom.",
    ],
    [
      "A light procedural subject can carry an immersive hero without dark cinematic styling.",
      "Organize proof and conversion around the perimeter while leaving the central figure visually uninterrupted.",
    ],
    ["procedural-field-as-hero", "edge-utility-central-spectacle", "embedded-proof-in-hero"],
  ),
  dringle: visualPreview(
    [
      "Hard split composition: quiet white editorial copy plane on the left and a black high-energy 3D plane on the right.",
      "Metallic hands and a floating brand object occupy the visual side while proof cards sit in its lower-right corner.",
    ],
    [
      "Use a quiet information plane beside a high-energy spatial plane when both clarity and spectacle are required immediately.",
      "Keep proof on the visual side only when it remains subordinate to the hero object.",
    ],
    ["split-stage-editorial", "object-prop-depth-stage", "embedded-proof-in-hero"],
  ),
  cortex: visualPreview(
    [
      "Deep-blue frame dominated by one vertical cyan-magenta energy/light stream running through the center.",
      "Copy and CTA occupy left/right bands while a gigantic cropped wordmark fills the lower edge.",
    ],
    [
      "A single vertical field can divide and connect two information planes at once.",
      "Use oversized cropped identity typography as a secondary anchor when the procedural field already owns the center.",
    ],
    ["procedural-field-as-hero", "split-stage-editorial", "subject-occludes-display-type"],
  ),
  halcyon: visualPreview(
    [
      "Bright ethereal water-and-horizon environment framed by an enormous thin golden arc entering from the outer edges.",
      "Blackletter display copy is centered in the atmospheric void with almost no other visual content.",
    ],
    [
      "A large framing geometry can make a quiet environment feel monumental without filling the center.",
      "When the atmosphere is strong, let typography sit alone in the clearest visual void.",
    ],
    ["atmosphere-as-layout", "density-rhythm-and-silence", "single-signature-peak"],
  ),
  "creative-studio": visualPreview(
    [
      "Black editorial header above a large contained panel showing an orange-white procedural wave over circular geometric guides.",
      "Proof metrics are embedded into the lower edge of the visual panel instead of living in separate sections.",
    ],
    [
      "A contained procedural panel can act as the page's visual instrument while typography remains conventional and highly readable above it.",
      "Embed a few proof metrics into the visual system to connect evidence with the brand premise.",
    ],
    ["procedural-field-as-hero", "embedded-proof-in-hero", "technical-chrome-world-language"],
  ),
  clair: visualPreview(
    [
      "Black hero filled by a sweeping glossy purple/blue abstract ribbon and a large orange-black lightning-like object near center.",
      "Large headline stays left while a portrait video card and explanatory copy occupy the lower-right.",
    ],
    [
      "One abstract material world can carry a technology hero if utility and human proof remain clearly separated at the edges.",
      "Use a small human/media card as counterpoint to a non-human CGI world rather than competing at equal scale.",
    ],
    ["atmosphere-as-layout", "edge-utility-central-spectacle", "editorial-depth-stack"],
  ),
  "neural-monitor": visualPreview(
    [
      "Deep-blue star field centered on a luminous particle brain occupying most of the frame.",
      "A narrow diagnostic/status bar runs across the top while the primary headline overlays the calmer middle of the brain.",
    ],
    [
      "When a scientific procedural form is recognizable by silhouette, let it become both background and primary subject.",
      "Use thin diagnostic chrome to reinforce the premise while keeping the main copy large and readable.",
    ],
    ["procedural-field-as-hero", "technical-chrome-world-language", "edge-utility-central-spectacle"],
  ),
  loopstack: visualPreview(
    [
      "Central luminous flower sits on a rocky landscape against a dark gradient sky while an enormous cropped wordmark spans the bottom.",
      "CTA and small utility float above/around the flower without boxing it into a card.",
    ],
    [
      "A single organic object plus a simple landscape can create a memorable brand world with very little interface.",
      "Use giant cropped type as a scale counterweight to the organic subject.",
    ],
    ["responsive-organic-backdrop", "atmosphere-as-layout", "subject-occludes-display-type"],
  ),
  ascend: visualPreview(
    [
      "Dark space hero with a large Earth rising from the bottom and centered SaaS headline/CTA floating above the planet.",
      "The planet occupies the lower half while the upper field remains quiet enough for conversion content.",
    ],
    [
      "A persistent world can anchor a SaaS promise when interface remains semantic and visually separated from the planet.",
      "Use horizon/planet curvature as a natural boundary between spatial visual and content plane.",
    ],
    ["single-world-under-interface", "atmosphere-as-layout", "edge-utility-central-spectacle"],
  ),
  flowstate: visualPreview(
    [
      "Black hero with one large multicolor cloud/plume occupying the center behind a centered headline and waitlist form.",
      "Navigation and conversion chrome are minimal and pushed to the outer top edge.",
    ],
    [
      "A single soft procedural volume can provide the full atmospheric identity for a centered SaaS conversion hero.",
      "Keep the form behind the copy and reduce competing UI when the field already has high visual complexity.",
    ],
    ["procedural-field-as-hero", "responsive-organic-backdrop", "dom-webgl-contract"],
  ),
  "marcus-vane": visualPreview(
    [
      "Black/red founder portrait with the person centered in front of an enormous red name spanning the frame.",
      "Condensed role labels sit upper-left while a short positioning statement occupies the upper-right.",
    ],
    [
      "Use a portrait to physically interrupt identity typography when personal brand is the hero.",
      "Balance the central portrait with concise opposite-corner metadata instead of adding cards.",
    ],
    ["subject-occludes-display-type", "edge-utility-central-spectacle", "immersive-without-webgl"],
  ),
  gravity: visualPreview(
    [
      "High-key white/blue frame wrapped by a large arch/chain of glossy spheres that creates a quiet opening in the center.",
      "Headline and small explanatory copy occupy the lower edges while the sphere field defines the visual perimeter.",
    ],
    [
      "Repeated geometry can frame negative space instead of filling it; the empty region becomes part of the composition.",
      "Use one coherent repeated-object system rather than several unrelated floating-object effects.",
    ],
    ["procedural-field-as-hero", "object-prop-depth-stage", "density-rhythm-and-silence"],
  ),
  "kai-nomura": visualPreview(
    [
      "High-key monochrome editorial split with large serif statement and biographical copy on the left and a tall black-and-white portrait on the right.",
      "Small metadata and restrained utility sit below the copy with no visible immersive effect required.",
    ],
    [
      "A disciplined split editorial composition can feel premium without WebGL when type, portrait crop and metadata hierarchy are strong.",
      "Keep motion optional when the static hierarchy already communicates authorship and craft.",
    ],
    ["immersive-without-webgl", "split-stage-editorial", "density-rhythm-and-silence"],
  ),
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
    const preview = visualPreviewEvidence[slug];
    return {
      id: slug,
      title,
      source: GETLAYERS + slug,
      industry,
      access,
      evidenceLevel:
        evidence?.evidenceLevel ?? (preview ? "visual-preview" : "catalog"),
      reviewedAt: REVIEWED_AT,
      confidence: evidence?.confidence ?? preview?.confidence ?? 0.45,
      observedTraits: mergeUnique(
        preview?.observedTraits ?? [],
        evidence?.observedTraits ?? [],
      ),
      transferableLessons: mergeUnique(
        preview?.transferableLessons ?? [],
        evidence?.transferableLessons ?? [],
      ),
      constructionPatternIds: mergeUnique(
        preview?.constructionPatternIds ?? [],
        evidence?.constructionPatternIds ?? [],
      ),
      evidenceNotes: evidence
        ? mergeUnique(
            preview
              ? [
                  "Public GetLayers preview still visually reviewed on 2026-09-18; no motion or implementation was inferred from the still.",
                ]
              : [],
            evidence.evidenceNotes,
          )
        : preview
          ? [
              "Public GetLayers preview still visually reviewed on 2026-09-18; no motion, scroll behavior, pointer behavior or implementation stack was inferred from the still.",
            ]
          : [
              "Current public GetLayers catalog confirms the template name and industry category only.",
              "No detailed construction traits are inferred until public description, visual review or technical evidence is available.",
            ],
      doNotCopy: defaultDoNotCopy,
    };
  },
);

export const immersiveReferenceCorpus: ImmersiveReference[] = [
  ...getLayersTemplateCorpus,
  ...broaderImmersiveReferenceCorpus,
];

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

  const candidates = immersiveReferenceCorpus
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
        reference.evidenceLevel === "public-case-study" ||
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
    .sort((a, b) => b.score - a.score || a.reference.id.localeCompare(b.reference.id));

  return diverseReferenceSelection(candidates, limit);
}

function diverseReferenceSelection(
  candidates: RetrievedImmersiveReference[],
  limit: number,
) {
  const chosen: RetrievedImmersiveReference[] = [];
  const hostCounts = new Map<string, number>();
  const maxPerHost = limit >= 5 ? 2 : 1;

  for (const candidate of candidates) {
    if (chosen.length >= limit) break;
    const host = sourceHost(candidate.reference.source);
    if ((hostCounts.get(host) ?? 0) >= maxPerHost) continue;
    chosen.push(candidate);
    hostCounts.set(host, (hostCounts.get(host) ?? 0) + 1);
  }

  // Fill any remaining slots after the diversity pass so a narrow query can
  // still return the requested number of supported precedents.
  for (const candidate of candidates) {
    if (chosen.length >= limit) break;
    if (chosen.some((item) => item.reference.id === candidate.reference.id)) continue;
    chosen.push(candidate);
  }

  return chosen;
}

function sourceHost(source: string) {
  try {
    return new URL(source).hostname.replace(/^www\./, "");
  } catch {
    return source;
  }
}

function mergeUnique(...groups: string[][]) {
  const values = groups.flat();
  return values.filter(
    (value, index) => value && values.indexOf(value) === index,
  );
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

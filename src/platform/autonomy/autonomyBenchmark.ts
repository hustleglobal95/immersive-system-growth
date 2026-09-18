import { inferPromptIntelligence } from "@/src/platform/autonomy/promptIntelligence";
import type { AutonomyBenchmarkCase, AutonomyBenchmarkReport } from "@/src/platform/autonomy/types";
import type { AssetManifest } from "@/src/types/assets";

export const autonomyBenchmarkCases: AutonomyBenchmarkCase[] = [
  { id:"watch-mechanism", prompt:"Luxury mechanical watch. Make the visitor feel like they enter the movement through a cinematic 3D assembly.", expectedProjectType:"product", expectedTier:"signature" },
  { id:"waterfront-privacy", prompt:"Waterfront residence tower. Sell privacy and distance from the city without generic luxury language.", expectedProjectType:"property" },
  { id:"cliff-hotel", prompt:"Boutique hotel carved into a cliff. Make booking feel like completing the arrival.", expectedProjectType:"hospitality" },
  { id:"ev-performance", prompt:"Electric sports car launch experience. Make engineering feel emotional without generic racing visuals.", expectedProjectType:"automotive", expectedTier:"signature" },
  { id:"ai-infrastructure", prompt:"AI infrastructure platform. Explain massive complexity without glowing data particles.", expectedProjectType:"saas" },
  { id:"erosion-fashion", prompt:"Experimental fashion collection inspired by erosion. Build an immersive editorial experience around silhouette and material.", expectedProjectType:"fashion", expectedTier:"signature" },
  { id:"studio-portfolio", prompt:"Creative studio portfolio where each case study feels like entering a different material world.", expectedProjectType:"portfolio" },
  { id:"sneaker-drop", prompt:"Campaign microsite for a limited sneaker drop with one unforgettable reveal.", expectedProjectType:"campaign" },
  { id:"furniture-product", prompt:"Premium furniture chair launch. Use 3D to make the construction and material choices feel inevitable.", expectedProjectType:"product" },
  { id:"resort-booking", prompt:"Island resort website. The outside world should gradually disappear as guests move toward booking.", expectedProjectType:"hospitality" },
  { id:"saas-workflow", prompt:"Software platform that replaces six disconnected workflows with one obvious system.", expectedProjectType:"saas" },
  { id:"property-penthouse", prompt:"Penthouse residence website built around elevation, horizon and private arrival.", expectedProjectType:"property" },
  { id:"automotive-supercar", prompt:"Cinematic supercar website with a controlled macro reveal of aerodynamics and engineering.", expectedProjectType:"automotive", expectedTier:"signature" },
  { id:"fashion-lookbook", prompt:"Fashion lookbook where garments move through an editorial spatial gallery.", expectedProjectType:"fashion" },
  { id:"commerce-catalog", prompt:"Immersive ecommerce store that makes product discovery feel cinematic but keeps checkout obvious.", expectedProjectType:"commerce" },
  { id:"campaign-activation", prompt:"Interactive campaign activation built around one gesture that reveals the story.", expectedProjectType:"campaign" },
  { id:"brand-manifesto", prompt:"Brand manifesto for a new materials company. Typography should feel architectural and restrained.", expectedProjectType:"brand" },
  { id:"portfolio-photographer", prompt:"Photographer portfolio with large images, visual silence and a spatial project gallery.", expectedProjectType:"portfolio" },
  { id:"product-perfume", prompt:"Luxury perfume product site where the bottle becomes the persistent visual anchor.", expectedProjectType:"product", expectedTier:"signature" },
  { id:"restaurant-arrival", prompt:"Restaurant hospitality experience that moves from street noise into a quiet dining room.", expectedProjectType:"hospitality" },
  { id:"property-development", prompt:"Real estate development focused on waterfront architecture, residences and inquiry.", expectedProjectType:"property" },
  { id:"saas-dashboard", prompt:"SaaS dashboard launch that turns a complicated operational workflow into one clear narrative.", expectedProjectType:"saas" },
  { id:"automotive-roadster", prompt:"Roadster product experience with a cinematic camera path around the body and interior.", expectedProjectType:"automotive", expectedTier:"signature" },
  { id:"commerce-shop", prompt:"High-end online shop where desire builds before product choice and purchase.", expectedProjectType:"commerce" },
  { id:"campaign-event", prompt:"Event campaign microsite with a single participatory reveal and direct registration action.", expectedProjectType:"campaign" },
  { id:"brand-rebrand", prompt:"Rebrand website for a company that wants one strong identity idea instead of a feature grid.", expectedProjectType:"brand" },
  { id:"product-camera", prompt:"Camera product website that reveals optical engineering through macro detail and exploded components.", expectedProjectType:"product" },
  { id:"hospitality-spa", prompt:"Spa retreat site where the interface slows down as the visitor approaches booking.", expectedProjectType:"hospitality" },
  { id:"portfolio-architect", prompt:"Architect portfolio focused on projects, process and spatial case studies.", expectedProjectType:"portfolio" },
  { id:"flagship-brand-world", prompt:"Flagship brand world for a design company. Make it world-class, immersive and unmistakably theirs.", expectedProjectType:"brand", expectedTier:"flagship" },
];

const emptyManifest: AssetManifest = {
  models: [],
  textures: [],
  hdr: [],
  video: [],
  budgets: { modelMb:30, textureMb:24, hdrMb:16, videoMb:60, totalMb:120 },
};

export function runAutonomyBenchmark(cases: AutonomyBenchmarkCase[] = autonomyBenchmarkCases): AutonomyBenchmarkReport {
  const results = cases.map((item) => {
    const packet = inferPromptIntelligence({ prompt:item.prompt, projectName:item.id, sceneCount:6, manifest:emptyManifest });
    const failures:string[] = [];
    if (packet.projectType.value !== item.expectedProjectType) failures.push("Expected project type " + item.expectedProjectType + " but inferred " + packet.projectType.value + ".");
    if (item.expectedTier && packet.tier.value !== item.expectedTier) failures.push("Expected tier " + item.expectedTier + " but inferred " + packet.tier.value + ".");
    const searchable = [packet.brief.objective,packet.brief.brandTruth,...packet.brief.differentiators].join(" ").toLowerCase();
    if (item.mustIncludeAny?.length && !item.mustIncludeAny.some((value) => searchable.includes(value.toLowerCase()))) failures.push("Expected at least one required concept to survive prompt compilation.");
    if (item.mustAvoid?.some((value) => searchable.includes(value.toLowerCase()))) failures.push("Prompt compilation retained a forbidden generic concept.");
    return { id:item.id, passed:failures.length===0, inferredProjectType:packet.projectType.value, inferredTier:packet.tier.value, failures };
  });
  const passed = results.filter((item) => item.passed).length;
  return { version:1, total:results.length, passed, score:Number(((passed/Math.max(1,results.length))*100).toFixed(1)), results };
}

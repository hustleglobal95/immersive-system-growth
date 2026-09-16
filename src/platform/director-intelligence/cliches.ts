import type { DirectorBrief, DirectorTerritory, DirectorTreatment } from "@/src/platform/directorSchema";
import type { ClicheScan } from "@/src/platform/director-intelligence/types";

export const categoryCliches: Record<DirectorBrief["projectType"], string[]> = {
  property: ["generic gold luxury treatment", "gratuitous building orbit", "sunset hero with oversized serif", "equal visual weight for every amenity", "drone fly-around as concept"],
  product: ["endless 360 spin", "exploded view without narrative reason", "spec wall before desire", "dark studio rim-light as whole idea", "floating product over gradient"],
  hospitality: ["travel-template card wall", "over-edited montage", "generic infinity-pool hero", "booking friction disguised as immersion", "sunset-to-night timelapse with no narrative role"],
  saas: ["purple gradient", "floating dashboard", "glowing sphere", "particle field", "abstract AI blob", "feature wall before product proof", "glass cards as product strategy"],
  automotive: ["dark tunnel", "wheel closeup montage", "gratuitous speed lines", "full-body orbit as hero", "neon rim-light without concept", "engine-rev sound as substitute for idea"],
  fashion: ["runway montage without thesis", "editorial serif plus monochrome as default", "horizontal lookbook as sole structure", "fabric simulation without strategic role", "cursor distortion everywhere"],
  commerce: ["card grid as entire experience", "parallax product shots without narrative", "hover gimmicks on every item", "editorial styling with no shopping clarity", "cart hidden behind immersion"],
  portfolio: ["equal-size project grid", "about-before-work", "demo-reel effects unrelated to proof", "identical transitions across every case study", "awards wall before work"],
  brand: ["generic gradient world", "unrelated wow effects", "logo animation as concept", "brand film pasted into website structure", "mission statement as hero strategy"],
  campaign: ["countdown plus hero video as whole idea", "social wall as proof", "scroll-jacking without narrative", "trend imitation without brand reason", "hashtag as interaction concept"],
};

function haystack(treatment: DirectorTreatment, territory: DirectorTerritory) {
  return [territory.thesis, territory.visualPremise, territory.experientialPremise, territory.signatureMoment, ...treatment.grammar.camera, ...treatment.grammar.motion, ...treatment.grammar.typography, ...treatment.grammar.transitions, ...treatment.noGoRules].join(" ").toLowerCase();
}

function keywordScore(pattern: string, text: string) {
  const tokens = pattern.toLowerCase().split(/\s+/).filter((token) => token.length > 3);
  if (!tokens.length) return false;
  const hits = tokens.filter((token) => text.includes(token)).length;
  return hits / tokens.length >= 0.5;
}

export function scanCategoryCliches(brief: DirectorBrief, treatment: DirectorTreatment, territory: DirectorTerritory): ClicheScan {
  const text = haystack(treatment, territory);
  const catalog = categoryCliches[brief.projectType];
  const detected = catalog.filter((pattern) => keywordScore(pattern, text));
  const retainedWithReason = detected.filter((pattern) => treatment.noGoRules.some((rule) => rule.toLowerCase().includes(pattern.split(" ")[0]))).map((pattern) => ({ pattern, reason: "The convention is explicitly constrained or qualified by the Treatment rather than used unconsciously." }));
  const density = Math.min(10, Math.round((detected.length / Math.max(1, catalog.length)) * 10));
  const verdict: ClicheScan["verdict"] = density >= 6 ? "rebuild" : density >= 3 ? "watch" : "clear";
  return { category: brief.projectType, detected, density, retainedWithReason, verdict };
}

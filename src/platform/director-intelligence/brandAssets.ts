import type { DirectorBrief, DirectorTreatment } from "@/src/platform/directorSchema";

export interface DistinctiveBrandAsset { id: string; label: string; recognitionValue: number; ownershipStrength: number; strategicRelevance: number; creativeAdaptability: number; currentUsage: string; dilutionRisk: number; recommendation: "protect" | "amplify" | "reinterpret" | "retire" | "unknown"; }

export function identifyDistinctiveBrandAssets(brief: DirectorBrief, treatment: DirectorTreatment): DistinctiveBrandAsset[] {
  const source = brief.existingAssets.filter((asset) => asset.type === "brand" || asset.type === "audio" || asset.type === "model" || /logo|symbol|color|colour|type|sound|shape|character|silhouette|material/i.test(`${asset.label} ${asset.notes ?? ""}`));
  return source.map((asset) => {
    const treatmentUsage = [treatment.thesis, treatment.artBible.world, ...treatment.grammar.color, ...treatment.grammar.typography, ...treatment.grammar.materials, ...treatment.grammar.sound].join(" ").toLowerCase();
    const tokens = asset.label.toLowerCase().split(/\s+/).filter((token) => token.length > 3);
    const used = tokens.some((token) => treatmentUsage.includes(token));
    const noteStrength = asset.notes?.length ?? 0;
    const recognitionValue = Math.min(10, 5 + Math.min(3, noteStrength / 50) + (asset.type === "brand" ? 1.5 : 0));
    const ownershipStrength = Math.min(10, 5.5 + (asset.type === "brand" ? 2 : 0) + (noteStrength > 80 ? 1 : 0));
    const strategicRelevance = Math.min(10, 5 + (used ? 2 : 0) + (brief.brandTruth.toLowerCase().includes(asset.label.toLowerCase()) ? 1.5 : 0));
    const creativeAdaptability = Math.min(10, 6 + (asset.type === "brand" || asset.type === "audio" ? 1.5 : 0));
    const dilutionRisk = used ? 3 : recognitionValue >= 8 ? 7 : 4;
    const recommendation: DistinctiveBrandAsset["recommendation"] = recognitionValue >= 8 && ownershipStrength >= 7 ? (used ? "protect" : "amplify") : strategicRelevance >= 7 ? "reinterpret" : "unknown";
    return { id: asset.id, label: asset.label, recognitionValue: Number(recognitionValue.toFixed(1)), ownershipStrength: Number(ownershipStrength.toFixed(1)), strategicRelevance: Number(strategicRelevance.toFixed(1)), creativeAdaptability: Number(creativeAdaptability.toFixed(1)), currentUsage: used ? "Referenced by current Treatment language." : "Not clearly expressed in the current Treatment.", dilutionRisk, recommendation };
  });
}

export function brandAssetBlockers(assets: DistinctiveBrandAsset[]) {
  return assets.filter((asset) => asset.recognitionValue >= 8 && asset.ownershipStrength >= 7 && asset.recommendation === "amplify").map((asset) => `High-value distinctive asset "${asset.label}" is not clearly used by the Treatment.`);
}

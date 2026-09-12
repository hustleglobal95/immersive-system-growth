import { parseExperience } from "@/src/lib/configSchema";
import { parseAssetManifest } from "@/src/platform/assetManifestSchema";
import { bankAssetSchema, bankQuerySchema, type BankAsset, type BankCollection } from "@/src/platform/assetBankSchema";
import type { ExperienceConfig } from "@/src/types/experience";
import type { AssetManifest } from "@/src/types/assets";
import type { InteractionGraph } from "@/src/lib/interactionGraph";
import { cameraShotNames } from "@/src/lib/cameraShots";

export function incompatibleBankKitBindings(experience: ExperienceConfig, graph: InteractionGraph): string[] {
  const scenes = new Set(experience.scenes.map((s) => s.id));
  const hotspots = new Set(experience.hotspots.map((h) => h.id));
  return graph.nodes.filter((node) => {
    if (node.kind === "trigger") return Boolean(node.sceneId && !scenes.has(node.sceneId));
    if (node.kind !== "action") return false;
    const action = node.action;
    if (action.type === "sequence") return !scenes.has(action.name);
    if (action.type === "camera") return !scenes.has(action.name) && !(cameraShotNames as readonly string[]).includes(action.name);
    if (action.type === "hotspot") return Boolean(action.id && !hotspots.has(action.id));
    return false;
  }).map((node) => node.label);
}

export function createBankSearch(bank: BankCollection) {
  // Built once per catalog generation on the server. No full catalog in the client bundle.
  const rows = bank.assets.map((asset) => ({ asset, text: [asset.title, asset.description, ...asset.tags, ...asset.industries].join(" ").toLowerCase() }));
  const facets = {
    industries: [...new Set(bank.assets.flatMap((a) => a.industries))].sort(),
    providers: [...new Set(bank.assets.map((a) => a.provider))].sort(),
  };
  return (input: unknown) => {
    const query = bankQuerySchema.parse(input);
    const terms = query.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matches = rows.filter(({ asset, text }) => (!query.kind || asset.kind === query.kind) && (!query.status || asset.status === query.status) && (!query.provider || asset.provider === query.provider) && (!query.industry || asset.industries.includes(query.industry)) && terms.every((term) => text.includes(term)));
    const offset = (query.page - 1) * query.limit;
    return { total: matches.length, catalogTotal: rows.length, page: query.page, limit: query.limit, facets,
      items: matches.slice(offset, offset + query.limit).map(({ asset }) => asset), kits: bank.kits,
    };
  };
}

export function insertBankAsset(input: unknown, experience: ExperienceConfig, manifest: AssetManifest, sceneId: string) {
  const asset = bankAssetSchema.parse(input);
  if (asset.status === "source") throw new Error("Prepare and verify this source asset before insertion.");
  if (!["model", "image", "video"].includes(asset.kind)) throw new Error("This asset needs a material, lighting, audio or font integration. Export its selection record for handoff.");
  const next = structuredClone(experience);
  const scene = next.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error("Select an existing scene.");
  const runtime = asset.files.find((f) => f.role === "runtime")!;
  const mobile = asset.files.find((f) => f.role === "mobile");
  if (asset.kind === "model") {
    const id = "bank-" + asset.id;
    if (next.assets.some((a) => a.id === id)) throw new Error("This model is already in the project.");
    next.assets.push({ id, kind: "model", url: runtime.url, ...(mobile ? { lowUrl: mobile.url } : {}), position: [0, 0, 0], rotation: [0, 0, 0], scale: 1, scenes: [sceneId], persist: false });
  } else {
    if (scene.media) throw new Error("This scene already has media. Choose an empty scene or edit its media in Layers.");
    // Existing parser fills responsive and reduced-motion-compatible media defaults.
    Object.assign(scene, { media: { kind: asset.kind, src: runtime.url, alt: asset.title, ...(asset.kind === "video" ? { poster: asset.files.find((f) => f.role === "poster")!.url } : {}) } });
  }
  return { experience: parseExperience(next), assetManifest: addBankFiles([asset], manifest) };
}

export function addBankFiles(assets: BankAsset[], manifest: AssetManifest): AssetManifest {
  const nextManifest = structuredClone(manifest);
  for (const input of assets) {
    const asset = bankAssetSchema.parse(input);
    if (asset.status === "source") throw new Error("Kit dependencies must be prepared or reference assets.");
    if (["audio", "font"].includes(asset.kind)) throw new Error("Audio and fonts require separate integration.");
    for (const file of asset.files.filter((f) => f.role !== "source")) {
      const bucket = file.role === "poster" ? "textures" : asset.kind === "model" ? "models" : asset.kind === "video" ? "video" : asset.kind === "hdri" ? "hdr" : "textures";
      const existing = nextManifest[bucket].find((e) => e.path === file.url);
      if (existing && (existing.sha256 !== file.sha256 || existing.bytes !== file.bytes)) throw new Error("Manifest conflict: this URL has different file metadata.");
      if (!existing) nextManifest[bucket].push({ path: file.url, bytes: file.bytes, sha256: file.sha256 });
    }
  }
  return parseAssetManifest(nextManifest);
}

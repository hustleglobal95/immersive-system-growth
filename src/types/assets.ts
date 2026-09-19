export interface AssetDerivativeLineage {
  sourcePath: string;
  operation: "image-optimize" | "manual";
  format?: "avif" | "webp";
  width?: number;
  quality?: number;
}

export interface AssetManifestEntry {
  path: string;
  bytes: number;
  sha256: string;
  derivative?: AssetDerivativeLineage;
}

export interface AssetManifest {
  models: AssetManifestEntry[];
  textures: AssetManifestEntry[];
  hdr: AssetManifestEntry[];
  video: AssetManifestEntry[];
  budgets: {
    modelMb: number;
    textureMb: number;
    hdrMb: number;
    videoMb: number;
    totalMb: number;
  };
}

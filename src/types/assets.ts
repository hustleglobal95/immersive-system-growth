export interface AssetManifestEntry {
  path: string;
  bytes: number;
  sha256: string;
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

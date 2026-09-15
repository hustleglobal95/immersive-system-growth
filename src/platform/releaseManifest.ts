import { createHash } from "node:crypto";
import type { ForgeProject } from "@/src/platform/forgeProjectSchema";

export type ReleaseDocumentKind = "forgeProject" | keyof ForgeProject["paths"];

export interface ReleaseDocumentFingerprint {
  kind: ReleaseDocumentKind;
  path: string;
  bytes: number;
  sha256: string;
}

export interface ForgeReleaseManifest {
  version: 1;
  projectId: string;
  projectName: string;
  documents: ReleaseDocumentFingerprint[];
  performance: ForgeProject["performance"];
  capabilities: ForgeProject["capabilities"];
  release: ForgeProject["release"];
}

const documentOrder: ReleaseDocumentKind[] = [
  "forgeProject",
  "experience",
  "studioProject",
  "creativeDirection",
  "assetManifest",
  "visualSystems",
  "experienceModes",
];

export function createReleaseManifest(
  project: ForgeProject,
  documents: Record<ReleaseDocumentKind, string>,
): ForgeReleaseManifest {
  const fingerprints = documentOrder.map((kind) => {
    const content = documents[kind];
    if (typeof content !== "string") throw new Error("Missing release document: " + kind);
    const path = kind === "forgeProject" ? "config/forge-project.json" : project.paths[kind];
    return {
      kind,
      path,
      bytes: Buffer.byteLength(content, "utf8"),
      sha256: createHash("sha256").update(content, "utf8").digest("hex"),
    };
  });
  return {
    version: 1,
    projectId: project.id,
    projectName: project.name,
    documents: fingerprints,
    performance: project.performance,
    capabilities: project.capabilities,
    release: project.release,
  };
}

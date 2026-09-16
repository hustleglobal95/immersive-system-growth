export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type ProjectId = Brand<string, "ProjectId">;
export type SceneId = Brand<string, "SceneId">;
export type SectionId = Brand<string, "SectionId">;
export type AssetId = Brand<string, "AssetId">;
export type NodeId = Brand<string, "NodeId">;
export type CameraId = Brand<string, "CameraId">;
export type TrackId = Brand<string, "TrackId">;
export type InteractionId = Brand<string, "InteractionId">;
export type MaterialId = Brand<string, "MaterialId">;
export type EnvironmentId = Brand<string, "EnvironmentId">;

function assertId(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} cannot be empty.`);
  if (!/^[a-z0-9][a-z0-9._:-]*$/i.test(normalized))
    throw new Error(`${label} contains unsupported characters: ${value}`);
  return normalized;
}

export const projectId = (value: string) => assertId(value, "ProjectId") as ProjectId;
export const sceneId = (value: string) => assertId(value, "SceneId") as SceneId;
export const sectionId = (value: string) => assertId(value, "SectionId") as SectionId;
export const assetId = (value: string) => assertId(value, "AssetId") as AssetId;
export const nodeId = (value: string) => assertId(value, "NodeId") as NodeId;
export const cameraId = (value: string) => assertId(value, "CameraId") as CameraId;
export const trackId = (value: string) => assertId(value, "TrackId") as TrackId;
export const interactionId = (value: string) => assertId(value, "InteractionId") as InteractionId;
export const materialId = (value: string) => assertId(value, "MaterialId") as MaterialId;
export const environmentId = (value: string) => assertId(value, "EnvironmentId") as EnvironmentId;

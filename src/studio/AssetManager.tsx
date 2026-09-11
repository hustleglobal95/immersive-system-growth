"use client";

import { useEffect, useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from "react";
import { inspectGlb, type GlbInspection } from "@/src/platform/glbInspector";
import { replaceScene } from "@/src/platform/studioPresets";
import type { AssetManifest, AssetManifestEntry } from "@/src/types/assets";
import type { ExperienceConfig } from "@/src/types/experience";

type AssetGroup = "models" | "textures" | "video";
interface IntakeAsset {
  file: File;
  group: AssetGroup;
  path: string;
  sha256: string;
  width?: number;
  height?: number;
  duration?: number;
  glb?: GlbInspection;
  preview?: string;
}

export function AssetManager({ setExperience, assetManifest, setAssetManifest, active }: { setExperience: Dispatch<SetStateAction<ExperienceConfig>>; assetManifest: AssetManifest; setAssetManifest: Dispatch<SetStateAction<AssetManifest>>; active: number }) {
  const [assets, setAssets] = useState<IntakeAsset[]>([]);
  const previewUrls = useRef<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const inspect = async (files: File[]) => {
    setBusy(true);
    try {
      const next: IntakeAsset[] = [];
      for (const file of files.slice(0, 12)) next.push(await inspectAsset(file));
      previewUrls.current.push(...next.flatMap((asset) => asset.preview ? [asset.preview] : []));
      setAssets((current) => [...current, ...next].slice(-24));
      setMessage(`${next.length} asset${next.length === 1 ? "" : "s"} inspected locally.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Asset inspection failed");
    } finally {
      setBusy(false);
    }
  };
  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    void inspect([...event.dataTransfer.files]);
  };
  const register = (asset: IntakeAsset) => {
    const record: AssetManifestEntry = { path: asset.path, bytes: asset.file.size, sha256: asset.sha256 };
    setAssetManifest((current) => ({ ...current, [asset.group]: [...current[asset.group].filter((item) => item.path !== asset.path), record] }));
    setMessage(`${asset.path} added to the draft manifest. Copy the optimized file into that public path before publishing.`);
  };
  const applyAsset = (asset: IntakeAsset) => {
    if (asset.group === "models") setExperience((current) => ({ ...current, heroModel: asset.path }));
    else setExperience((current) => {
      const scene = current.scenes[active];
      const media = asset.group === "video"
        ? { kind: "video" as const, src: asset.path, poster: "/textures/reference/reveal-field.svg", alt: asset.file.name, transition: "dissolve" as const, maskSoftness: 18, layers: [], position: [50, 50] as [number, number], mobilePosition: [50, 50] as [number, number], overlap: .25, direction: "up" as const, zoom: 1.05, textEnd: .28 }
        : { kind: "image" as const, src: asset.path, alt: asset.file.name, transition: "dissolve" as const, maskSoftness: 18, layers: [], position: [50, 50] as [number, number], mobilePosition: [50, 50] as [number, number], overlap: .25, direction: "up" as const, zoom: 1.05, textEnd: .28 };
      return replaceScene(current, active, { ...scene, media });
    });
    setMessage(asset.group === "models" ? "Draft hero model updated." : "Active scene media updated.");
  };

  return <div className="studio-grid studio-grid--assets">
    <section className="studio-card">
      <div className="studio-card__head"><div><span>LOCAL ASSET INTAKE</span><h2>Inspect before repository upload</h2></div><output>{assets.length} staged</output></div>
      <p className="studio-muted">Files remain in this browser. Forge calculates the hash, dimensions, duration, GLB structure and target budget before the file enters a client repository.</p>
      <label className="studio-drop asset-drop" onDragOver={(event) => event.preventDefault()} onDrop={drop}>
        <strong>{busy ? "Inspecting assets..." : "Drop GLB, image or video files"}</strong>
        <span>Maximum 12 files per batch</span>
        <input type="file" multiple accept=".glb,model/gltf-binary,image/*,video/*" onChange={(event) => void inspect([...(event.target.files ?? [])])} />
      </label>
      {message && <p className="studio-message" role="status">{message}</p>}
      <dl className="studio-stats"><div><dt>Model budget</dt><dd>{assetManifest.budgets.modelMb} MB</dd></div><div><dt>Texture budget</dt><dd>{assetManifest.budgets.textureMb} MB</dd></div><div><dt>Video budget</dt><dd>{assetManifest.budgets.videoMb} MB</dd></div><div><dt>Total budget</dt><dd>{assetManifest.budgets.totalMb} MB</dd></div></dl>
    </section>
    <section className="studio-card asset-intake-list">
      <div className="studio-card__head"><div><span>STAGING QUEUE</span><h2>Production records</h2></div><output>{assetManifest.models.length + assetManifest.textures.length + assetManifest.video.length} registered</output></div>
      {!assets.length && <p className="studio-muted">Drop assets to create verified manifest entries and connect them to the current experience.</p>}
      {assets.map((asset) => {
        const budget = asset.group === "models" ? assetManifest.budgets.modelMb : asset.group === "textures" ? assetManifest.budgets.textureMb : assetManifest.budgets.videoMb;
        const over = asset.file.size > budget * 1024 ** 2;
        return <article key={`${asset.path}-${asset.sha256}`} data-over-budget={over}>
          {asset.preview && asset.group === "textures" && <img src={asset.preview} alt="" />}
          <div><strong>{asset.file.name}</strong><code>{asset.path}</code><small>{formatBytes(asset.file.size)}{asset.width ? ` / ${asset.width}x${asset.height}` : ""}{asset.duration ? ` / ${asset.duration.toFixed(1)}s` : ""}{asset.glb ? ` / ${asset.glb.nodes.length} nodes / ${asset.glb.meshes.length} meshes` : ""}</small>{over && <em>Over {budget} MB budget. Optimize before use.</em>}</div>
          <div><button type="button" disabled={over} onClick={() => register(asset)}>Register</button><button type="button" disabled={over} onClick={() => applyAsset(asset)}>Use in draft</button></div>
        </article>;
      })}
    </section>
  </div>;
}

async function inspectAsset(file: File): Promise<IntakeAsset> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const group: AssetGroup = extension === "glb" ? "models" : file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "textures" : fail("Use a GLB, image or video file");
  const path = `/${group === "video" ? "video" : group}/uploads/${safeName(file.name)}`;
  const buffer = await file.arrayBuffer();
  const sha256 = [...new Uint8Array(await crypto.subtle.digest("SHA-256", buffer))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (group === "models") return { file, group, path, sha256, glb: inspectGlb(buffer) };
  const preview = URL.createObjectURL(file);
  const media = group === "textures" ? await imageMetadata(preview) : await videoMetadata(preview);
  return { file, group, path, sha256, preview, ...media };
}

function imageMetadata(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => { const image = new Image(); image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight }); image.onerror = () => reject(new Error("Image could not be decoded")); image.src = src; });
}

function videoMetadata(src: string) {
  return new Promise<{ width: number; height: number; duration: number }>((resolve, reject) => { const video = document.createElement("video"); video.preload = "metadata"; video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration }); video.onerror = () => reject(new Error("Video metadata could not be decoded")); video.src = src; });
}

function safeName(value: string) {
  const extension = value.includes(".") ? "." + value.split(".").pop()!.toLowerCase() : "";
  return value.slice(0, Math.max(0, value.length - extension.length)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + extension;
}

function formatBytes(bytes: number) { return bytes < 1024 ** 2 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 ** 2).toFixed(2)} MB`; }
function fail(message: string): never { throw new Error(message); }

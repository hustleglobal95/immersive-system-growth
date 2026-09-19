import { analyzeAssetManifest } from "@/src/platform/assetIntelligence";
import type { InteractionGraph, InteractionNode } from "@/src/lib/interactionGraph";
import type { AssetManifest, AssetManifestEntry } from "@/src/types/assets";
import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";

export type ForgeSelection =
  | { kind:"scene"; index:number }
  | { kind:"camera"; index:number }
  | { kind:"node"; index:number; name:string }
  | { kind:"copy"; index:number }
  | { kind:"media"; index:number }
  | { kind:"asset"; index:number; sceneIndex:number }
  | { kind:"environment"; index:number };

export type SelectionIssueSeverity="info"|"warning"|"blocker";

export interface SelectionIssue {
  code:string;
  severity:SelectionIssueSeverity;
  message:string;
}

export interface SelectedAsset {
  group:"models"|"textures"|"hdr"|"video";
  kind:"model"|"texture"|"hdr"|"video";
  index:number;
  entry:AssetManifestEntry;
}

export interface SelectionContext {
  version:1;
  selection:ForgeSelection;
  selectionKey:string;
  kind:ForgeSelection["kind"];
  label:string;
  sceneIndex:number;
  sceneId:string;
  sceneLabel:string;
  summary:string;
  scene:SceneDefinition;
  selectedAsset?:SelectedAsset;
  state:{
    motionTrackCount:number;
    copyMotionTrackCount:number;
    mediaMotionTrackCount:number;
    selectedNodeTrackCount:number;
    interactionReferenceCount:number;
    assetCount:number;
    manifestHealth:number;
    derivativeCount:number;
    derivativeSavingsBytes:number;
    hasProductRig:boolean;
    hasMobileCamera:boolean;
    mediaKind:"image"|"video"|"color"|"shader"|null;
    postPressure:"controlled"|"elevated";
  };
  issues:SelectionIssue[];
  signals:string[];
}

export function resolveSelectionContext(input:{
  experience:ExperienceConfig;
  manifest:AssetManifest;
  graph:InteractionGraph;
  selection:ForgeSelection;
  validationIssues?:string[];
}):SelectionContext {
  const sceneIndex=clampSceneIndex(input.selection.kind==="asset" ? input.selection.sceneIndex : input.selection.index,input.experience.scenes.length);
  const scene=input.experience.scenes[sceneIndex];
  const manifestHealth=analyzeAssetManifest(input.manifest);
  const assets=flattenAssets(input.manifest);
  const selectedAsset=input.selection.kind==="asset" ? assets[input.selection.index] : undefined;
  const selectedNodeName=input.selection.kind==="node" ? input.selection.name : null;
  const selectedNodeTrackCount=selectedNodeName
    ? scene.motionTracks.filter((track)=>track.target.startsWith(`rig:${selectedNodeName}:`)).length
    : 0;
  const interactionReferenceCount=countInteractionReferences(input.graph,input.selection,scene);
  const issues:SelectionIssue[]=[];

  for(const message of input.validationIssues ?? []) {
    issues.push({code:"project-validation",severity:"blocker",message});
  }
  if(manifestHealth.findings.some((finding)=>finding.severity==="blocker")) {
    issues.push({
      code:"asset-blocker",
      severity:"blocker",
      message:"Asset Intelligence reports a release-blocking manifest issue.",
    });
  } else if(manifestHealth.score<75) {
    issues.push({
      code:"asset-pressure",
      severity:"warning",
      message:"Asset manifest health is below the preferred production range.",
    });
  }
  if(input.selection.kind==="node" && !input.experience.productRig?.nodes.includes(input.selection.name)) {
    issues.push({code:"missing-rig-node",severity:"blocker",message:"The selected rig node is no longer present in the product rig."});
  }
  if(input.selection.kind==="asset" && !selectedAsset) {
    issues.push({code:"missing-asset",severity:"blocker",message:"The selected asset is no longer present in the manifest."});
  }
  if(input.selection.kind==="media" && !scene.media) {
    issues.push({code:"missing-media",severity:"blocker",message:"This scene no longer has a media layer to direct."});
  }
  if(input.selection.kind==="scene" && scene.motionTracks.length===0) {
    issues.push({code:"static-scene",severity:"info",message:"This scene has no authored motion yet."});
  }

  const kind=input.selection.kind;
  const label=selectionLabel(input.selection,scene,selectedAsset);
  const signals=[
    `${scene.motionTracks.length} scene motion track${scene.motionTracks.length===1?"":"s"}`,
    `${interactionReferenceCount} related interaction reference${interactionReferenceCount===1?"":"s"}`,
    `${assets.length} registered asset${assets.length===1?"":"s"}`,
    `manifest health ${Math.round(manifestHealth.score)}/100`,
  ];
  if(manifestHealth.derivativeCount) signals.push(`${manifestHealth.derivativeCount} traceable derivative${manifestHealth.derivativeCount===1?"":"s"}`);

  return {
    version:1,
    selection:normalizeSelection(input.selection,sceneIndex),
    selectionKey:selectionKey(input.selection,scene,selectedAsset),
    kind,
    label,
    sceneIndex,
    sceneId:scene.id,
    sceneLabel:scene.label,
    summary:selectionSummary(input.selection,scene,selectedAsset,manifestHealth.score,selectedNodeTrackCount),
    scene,
    selectedAsset,
    state:{
      motionTrackCount:scene.motionTracks.length,
      copyMotionTrackCount:scene.motionTracks.filter((track)=>track.target.startsWith("copy.")).length,
      mediaMotionTrackCount:scene.motionTracks.filter((track)=>track.target.startsWith("media.") || track.target.startsWith("layer:")).length,
      selectedNodeTrackCount,
      interactionReferenceCount,
      assetCount:assets.length,
      manifestHealth:manifestHealth.score,
      derivativeCount:manifestHealth.derivativeCount,
      derivativeSavingsBytes:manifestHealth.derivativeSavingsBytes,
      hasProductRig:Boolean(input.experience.productRig?.nodes.length),
      hasMobileCamera:Boolean(scene.mobileCamera),
      mediaKind:scene.media?.kind ?? null,
      postPressure:scene.post.bloom>0.35 ? "elevated" : "controlled",
    },
    issues,
    signals,
  };
}

function normalizeSelection(selection:ForgeSelection,index:number):ForgeSelection {
  if(selection.kind==="asset") return {...selection,sceneIndex:index};
  return {...selection,index};
}

function selectionLabel(selection:ForgeSelection,scene:SceneDefinition,asset?:SelectedAsset) {
  if(selection.kind==="camera") return scene.label+" / Camera";
  if(selection.kind==="environment") return scene.label+" / Environment";
  if(selection.kind==="node") return selection.name;
  if(selection.kind==="copy") return scene.label+" / Copy";
  if(selection.kind==="media") return scene.label+" / Media";
  if(selection.kind==="asset") return asset?.entry.path.split("/").pop() ?? "Missing asset";
  return scene.label;
}

function selectionSummary(
  selection:ForgeSelection,
  scene:SceneDefinition,
  asset:SelectedAsset|undefined,
  manifestHealth:number,
  nodeTracks:number,
) {
  if(selection.kind==="camera") return `${scene.camera.path} shot · ${scene.camera.from.fov}° → ${scene.camera.to.fov}°`;
  if(selection.kind==="node") return nodeTracks ? `${nodeTracks} authored track${nodeTracks===1?"":"s"}` : "No authored behavior yet";
  if(selection.kind==="copy") return `${scene.copy.align} aligned · ${scene.copy.headline.length} character headline`;
  if(selection.kind==="media") return scene.media ? `${scene.media.kind} · ${scene.media.transition} transition` : "No media assigned";
  if(selection.kind==="asset") return asset ? `${asset.kind} · ${Math.round(manifestHealth)}/100 manifest health` : "Asset unavailable";
  if(selection.kind==="environment") return scene.post.bloom>0.35 ? "Elevated effect pressure" : "Controlled atmosphere";
  const medium=scene.media?.kind ?? "3D";
  return scene.motionTracks.length
    ? `${scene.motionTracks.length} motion track${scene.motionTracks.length===1?"":"s"} · ${medium} scene`
    : "Direction before detail";
}

function selectionKey(selection:ForgeSelection,scene:SceneDefinition,asset?:SelectedAsset) {
  if(selection.kind==="scene") return "scene:"+scene.id;
  if(selection.kind==="camera") return "camera:"+scene.id;
  if(selection.kind==="environment") return "environment:"+scene.id;
  if(selection.kind==="node") return `rig:${selection.name}@${scene.id}`;
  if(selection.kind==="copy") return "copy:"+scene.id;
  if(selection.kind==="media") return "media:"+scene.id;
  return asset ? `asset:${asset.group}:${asset.entry.path}` : `asset:missing:${selection.index}`;
}

function flattenAssets(manifest:AssetManifest):SelectedAsset[] {
  return [
    ...manifest.models.map((entry,index)=>({group:"models" as const,kind:"model" as const,index,entry})),
    ...manifest.textures.map((entry,index)=>({group:"textures" as const,kind:"texture" as const,index,entry})),
    ...manifest.hdr.map((entry,index)=>({group:"hdr" as const,kind:"hdr" as const,index,entry})),
    ...manifest.video.map((entry,index)=>({group:"video" as const,kind:"video" as const,index,entry})),
  ];
}

function countInteractionReferences(graph:InteractionGraph,selection:ForgeSelection,scene:SceneDefinition) {
  return graph.nodes.filter((node)=>interactionReferencesSelection(node,selection,scene)).length;
}

function interactionReferencesSelection(node:InteractionNode,selection:ForgeSelection,scene:SceneDefinition) {
  if(selection.kind==="scene") {
    return (node.kind==="trigger" && node.sceneId===scene.id) || JSON.stringify(node).includes(scene.id);
  }
  if(selection.kind==="node") return JSON.stringify(node).includes(`rig:${selection.name}`);
  if(selection.kind==="camera") return node.kind==="action" && node.action.type==="camera";
  if(selection.kind==="copy" || selection.kind==="media") return JSON.stringify(node).includes(scene.id);
  if(selection.kind==="environment") {
    return node.kind==="action" && ["shader","quality","motion"].includes(node.action.type);
  }
  return false;
}

function clampSceneIndex(index:number,count:number) {
  return Math.max(0,Math.min(Math.max(0,count-1),Number.isFinite(index) ? Math.floor(index) : 0));
}

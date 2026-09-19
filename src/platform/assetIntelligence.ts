import type { AssetManifest, AssetManifestEntry } from "@/src/types/assets";

export type AssetKind="models"|"textures"|"hdr"|"video";
export type AssetSeverity="info"|"warning"|"blocker";

export interface AssetIntelligenceFinding {
  id:string;
  kind:AssetKind|"manifest";
  severity:AssetSeverity;
  title:string;
  detail:string;
  paths:string[];
  recommendedAction:string;
}

export interface AssetIntelligenceReport {
  version:1;
  totalBytes:number;
  budgetBytes:number;
  utilization:number;
  categoryBytes:Record<AssetKind,number>;
  categoryUtilization:Record<AssetKind,number>;
  duplicateHashes:Array<{sha256:string;paths:string[]}>;
  oversized:Array<{kind:AssetKind;path:string;bytes:number;budgetShare:number}>;
  remoteAssets:number;
  localAssets:number;
  findings:AssetIntelligenceFinding[];
  score:number;
}

const MB=1024*1024;
const categoryBudgetKey:Record<AssetKind,keyof AssetManifest["budgets"]>={
  models:"modelMb",
  textures:"textureMb",
  hdr:"hdrMb",
  video:"videoMb",
};

export function analyzeAssetManifest(manifest:AssetManifest):AssetIntelligenceReport {
  const kinds:AssetKind[]=["models","textures","hdr","video"];
  const categoryBytes=Object.fromEntries(kinds.map((kind)=>[kind,sum(manifest[kind])])) as Record<AssetKind,number>;
  const totalBytes=Object.values(categoryBytes).reduce((a,b)=>a+b,0);
  const budgetBytes=manifest.budgets.totalMb*MB;
  const categoryUtilization=Object.fromEntries(kinds.map((kind)=>{
    const budget=manifest.budgets[categoryBudgetKey[kind]]*MB;
    return [kind,budget ? categoryBytes[kind]/budget : 0];
  })) as Record<AssetKind,number>;

  const all=kinds.flatMap((kind)=>manifest[kind].map((entry)=>({kind,entry})));
  const hashes=new Map<string,string[]>();
  for(const {entry} of all) hashes.set(entry.sha256,[...(hashes.get(entry.sha256) ?? []),entry.path]);
  const duplicateHashes=[...hashes.entries()]
    .filter(([,paths])=>paths.length>1)
    .map(([sha256,paths])=>({sha256,paths}));

  const oversized=all.flatMap(({kind,entry})=>{
    const categoryBudget=manifest.budgets[categoryBudgetKey[kind]]*MB;
    const share=categoryBudget ? entry.bytes/categoryBudget : 0;
    const threshold=kind==="video" ? .55 : kind==="models" ? .45 : .35;
    return share>=threshold ? [{kind,path:entry.path,bytes:entry.bytes,budgetShare:share}] : [];
  }).sort((a,b)=>b.budgetShare-a.budgetShare);

  const findings:AssetIntelligenceFinding[]=[];
  for(const kind of kinds) {
    const utilization=categoryUtilization[kind];
    if(utilization>1) findings.push({
      id:"over-budget-"+kind,kind,severity:"blocker",
      title:label(kind)+" budget exceeded",
      detail:percent(utilization)+" of the configured "+label(kind).toLowerCase()+" budget is registered.",
      paths:manifest[kind].map((entry)=>entry.path),
      recommendedAction:"Reduce, replace or split the dominant assets before release; do not raise the budget without measured runtime evidence.",
    });
    else if(utilization>.82) findings.push({
      id:"budget-pressure-"+kind,kind,severity:"warning",
      title:label(kind)+" budget has little headroom",
      detail:percent(utilization)+" of the category budget is already committed.",
      paths:manifest[kind].map((entry)=>entry.path),
      recommendedAction:"Prepare lower-cost variants for the largest assets and verify first-use/mobile delivery before adding more media.",
    });
  }
  if(totalBytes>budgetBytes) findings.push({
    id:"total-budget",kind:"manifest",severity:"blocker",
    title:"Total asset budget exceeded",
    detail:formatBytes(totalBytes)+" registered against "+formatBytes(budgetBytes)+" configured.",
    paths:all.map(({entry})=>entry.path),
    recommendedAction:"Reduce total shipped bytes or deliberately redefine the production budget with new release evidence.",
  });
  for(const duplicate of duplicateHashes) findings.push({
    id:"duplicate-"+duplicate.sha256.slice(0,10),kind:"manifest",severity:"warning",
    title:"Duplicate binary registered more than once",
    detail:duplicate.paths.length+" manifest entries share the same SHA-256.",
    paths:duplicate.paths,
    recommendedAction:"Reuse one canonical content-addressed asset unless multiple URLs are required for a documented delivery reason.",
  });
  for(const item of oversized.slice(0,8)) findings.push({
    id:"dominant-"+item.kind+"-"+slug(item.path),kind:item.kind,severity:item.budgetShare>.7?"warning":"info",
    title:"One asset dominates the "+label(item.kind).toLowerCase()+" budget",
    detail:item.path+" consumes "+percent(item.budgetShare)+" of its category budget.",
    paths:[item.path],
    recommendedAction:recommendation(item.kind),
  });

  const remoteAssets=all.filter(({entry})=>/^https:\/\//.test(entry.path)).length;
  const blockers=findings.filter((item)=>item.severity==="blocker").length;
  const warnings=findings.filter((item)=>item.severity==="warning").length;
  const pressure=Math.max(0,totalBytes/budgetBytes-0.7)*35;
  const score=Math.max(0,Math.min(100,100-blockers*24-warnings*6-pressure));

  return {
    version:1,totalBytes,budgetBytes,utilization:budgetBytes?totalBytes/budgetBytes:0,
    categoryBytes,categoryUtilization,duplicateHashes,oversized,remoteAssets,
    localAssets:all.length-remoteAssets,findings,score,
  };
}

function sum(entries:AssetManifestEntry[]) { return entries.reduce((total,entry)=>total+entry.bytes,0); }
function label(kind:AssetKind) { return kind==="hdr" ? "HDR" : kind[0].toUpperCase()+kind.slice(1); }
function percent(value:number) { return Math.round(value*100)+"%"; }
function formatBytes(bytes:number) { return bytes>=MB ? (bytes/MB).toFixed(1)+" MB" : Math.round(bytes/1024)+" KB"; }
function slug(value:string) { return value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(-42) || "asset"; }
function recommendation(kind:AssetKind) {
  if(kind==="models") return "Inspect geometry/material complexity, create an authored low-detail variant and verify camera-role fidelity before substitution.";
  if(kind==="textures") return "Generate bounded WebP/AVIF/KTX2 derivatives where appropriate, resize to the actual screen role and preserve the source master.";
  if(kind==="video") return "Create a production web encode plus mobile fallback; verify byte-range delivery, decode cost and poster behavior.";
  return "Use an environment-map resolution appropriate to the reflection role and create a lower-cost mobile variant when it preserves the authored lighting.";
}

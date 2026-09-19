import { parseExperience } from "@/src/lib/configSchema";
import { analyzeAssetManifest, type AssetIntelligenceReport, type AssetKind } from "@/src/platform/assetIntelligence";
import { parseAssetManifest } from "@/src/platform/assetManifestSchema";
import type { AssetManifest, AssetManifestEntry } from "@/src/types/assets";
import type { ExperienceConfig } from "@/src/types/experience";

export type AssetQualityStrategy="registered-derivative"|"canonical-reuse";

export interface AssetQualityProfile {
  version:1;
  intelligence:AssetIntelligenceReport;
  referencedPaths:string[];
  referencedBytes:number;
  unregisteredLocalPaths:string[];
  duplicateReferencedHashes:Array<{sha256:string;paths:string[]}>;
  derivativeOpportunities:Array<{
    sourcePath:string;
    derivativePath:string;
    sourceBytes:number;
    derivativeBytes:number;
    savingsBytes:number;
    savingsRatio:number;
  }>;
}

export interface AssetQualityCandidate {
  experience:ExperienceConfig;
  assetManifest:AssetManifest;
  strategy:AssetQualityStrategy;
  changed:boolean;
  summary:string[];
  replacements:Array<{from:string;to:string;reason:string}>;
  removedManifestPaths:string[];
  profileBefore:AssetQualityProfile;
  profileAfter:AssetQualityProfile;
}

export function profileAssetQuality(experienceInput:unknown,manifestInput:unknown):AssetQualityProfile {
  const experience=parseExperience(experienceInput);
  const manifest=parseAssetManifest(manifestInput);
  const all=entries(manifest);
  const registered=new Map(all.map((row)=>[row.entry.path,row]));
  const strings=collectStrings(experience);
  const referencedPaths=[...new Set(strings.filter((value)=>registered.has(value)))].sort();
  const referencedRows=referencedPaths.map((assetPath)=>registered.get(assetPath)!).filter(Boolean);
  const referencedEntries=referencedRows.map((row)=>row.entry);
  const referencedBytes=referencedEntries.reduce((total,entry)=>total+entry.bytes,0);
  const unregisteredLocalPaths=[...new Set(strings.filter((value)=>/^\/(?:models|textures|hdr|video)\//.test(value) && !registered.has(value)))].sort();

  const duplicateMap=new Map<string,string[]>();
  for(const entry of referencedEntries) duplicateMap.set(entry.sha256,[...(duplicateMap.get(entry.sha256) ?? []),entry.path]);
  const duplicateReferencedHashes=[...duplicateMap.entries()]
    .filter(([,paths])=>paths.length>1)
    .map(([sha256,paths])=>({sha256,paths}));

  const derivativeOpportunities=all.flatMap(({kind,entry})=>{
    const derivative=entry.derivative;
    if(!derivative || !referencedPaths.includes(derivative.sourcePath)) return [];
    const sourceRow=registered.get(derivative.sourcePath);
    if(!sourceRow || sourceRow.kind!==kind || entry.bytes>=sourceRow.entry.bytes) return [];
    const source=sourceRow.entry;
    const savingsBytes=source.bytes-entry.bytes;
    return [{
      sourcePath:source.path,
      derivativePath:entry.path,
      sourceBytes:source.bytes,
      derivativeBytes:entry.bytes,
      savingsBytes,
      savingsRatio:savingsBytes/source.bytes,
    }];
  }).sort((a,b)=>b.savingsBytes-a.savingsBytes);

  return {
    version:1,
    intelligence:analyzeAssetManifest(manifest),
    referencedPaths,
    referencedBytes,
    unregisteredLocalPaths,
    duplicateReferencedHashes,
    derivativeOpportunities,
  };
}

export function buildAssetQualityCandidate(
  experienceInput:unknown,
  manifestInput:unknown,
  strategy:AssetQualityStrategy,
):AssetQualityCandidate {
  const experience=parseExperience(experienceInput);
  const manifest=parseAssetManifest(manifestInput);
  const profileBefore=profileAssetQuality(experience,manifest);
  const replacements:Array<{from:string;to:string;reason:string}>=[];
  const removedManifestPaths:string[]=[];
  let candidateExperience:ExperienceConfig=structuredClone(experience);
  let candidateManifest:AssetManifest=structuredClone(manifest);

  if(strategy==="registered-derivative") {
    const selected=profileBefore.derivativeOpportunities
      .filter((item)=>item.savingsRatio>=0.08)
      .slice(0,4);
    for(const item of selected) {
      replacements.push({
        from:item.sourcePath,
        to:item.derivativePath,
        reason:`Registered derivative saves ${item.savingsBytes} bytes (${Math.round(item.savingsRatio*100)}%) while preserving the source for rollback.`,
      });
    }
    candidateExperience=replaceReferences(candidateExperience,new Map(replacements.map((item)=>[item.from,item.to]))) as ExperienceConfig;
  } else {
    const groups=duplicateGroups(candidateManifest);
    const referenced=new Set(profileBefore.referencedPaths);
    const replacementMap=new Map<string,string>();
    for(const group of groups) {
      const canonical=[...group.entries].sort((a,b)=>{
        const ar=referenced.has(a.path)?0:1;
        const br=referenced.has(b.path)?0:1;
        if(ar!==br) return ar-br;
        if(a.bytes!==b.bytes) return a.bytes-b.bytes;
        return a.path.localeCompare(b.path);
      })[0];
      for(const entry of group.entries) {
        if(entry.path===canonical.path) continue;
        if(referenced.has(entry.path)) {
          replacementMap.set(entry.path,canonical.path);
          replacements.push({
            from:entry.path,
            to:canonical.path,
            reason:"Exact SHA-256 duplicate consolidated to one canonical URL so the same binary is not requested under multiple asset identities.",
          });
        }
      }
    }
    candidateExperience=replaceReferences(candidateExperience,replacementMap) as ExperienceConfig;
    const afterReplacement=profileAssetQuality(candidateExperience,candidateManifest);
    const used=new Set(afterReplacement.referencedPaths);
    candidateManifest=mapManifest(candidateManifest,(kind,items)=>items.filter((entry)=>{
      const group=groups.find((item)=>item.kind===kind && item.sha256===entry.sha256);
      if(!group || group.entries.length<2) return true;
      const canonical=[...group.entries].sort((a,b)=>{
        const ar=used.has(a.path)?0:1;
        const br=used.has(b.path)?0:1;
        if(ar!==br) return ar-br;
        if(a.bytes!==b.bytes) return a.bytes-b.bytes;
        return a.path.localeCompare(b.path);
      })[0];
      const keep=entry.path===canonical.path || used.has(entry.path);
      if(!keep) removedManifestPaths.push(entry.path);
      return keep;
    }));
  }

  candidateExperience=parseExperience(candidateExperience);
  candidateManifest=parseAssetManifest(candidateManifest);
  const profileAfter=profileAssetQuality(candidateExperience,candidateManifest);
  const changed=replacements.length>0 || removedManifestPaths.length>0;
  const summary=[
    ...replacements.map((item)=>`${short(item.from)} -> ${short(item.to)}`),
    ...removedManifestPaths.map((item)=>`Removed redundant manifest alias ${short(item)}.`),
    changed
      ? `Referenced bytes ${profileBefore.referencedBytes} -> ${profileAfter.referencedBytes}; manifest health ${Math.round(profileBefore.intelligence.score)} -> ${Math.round(profileAfter.intelligence.score)}.`
      : strategy==="registered-derivative"
        ? "No registered derivative met the minimum savings threshold for an asset currently used by this experience."
        : "No safe duplicate alias consolidation was available for the assets used by this experience.",
  ].slice(0,8);

  return {
    experience:candidateExperience,
    assetManifest:candidateManifest,
    strategy,
    changed,
    summary,
    replacements,
    removedManifestPaths,
    profileBefore,
    profileAfter,
  };
}

function duplicateGroups(manifest:AssetManifest) {
  const grouped=new Map<string,{kind:AssetKind;entries:AssetManifestEntry[]}>();
  for(const {kind,entry} of entries(manifest)) {
    const key=kind+":"+entry.sha256;
    const current=grouped.get(key) ?? {kind,entries:[]};
    current.entries.push(entry);
    grouped.set(key,current);
  }
  return [...grouped.entries()]
    .filter(([,value])=>value.entries.length>1)
    .map(([key,value])=>({kind:value.kind,sha256:key.slice(value.kind.length+1),entries:value.entries}));
}

function entries(manifest:AssetManifest):Array<{kind:AssetKind;entry:AssetManifestEntry}> {
  const kinds:AssetKind[]=["models","textures","hdr","video"];
  return kinds.flatMap((kind)=>manifest[kind].map((entry)=>({kind,entry})));
}

function mapManifest(
  manifest:AssetManifest,
  transform:(kind:AssetKind,items:AssetManifestEntry[])=>AssetManifestEntry[],
):AssetManifest {
  return {
    ...manifest,
    models:transform("models",manifest.models),
    textures:transform("textures",manifest.textures),
    hdr:transform("hdr",manifest.hdr),
    video:transform("video",manifest.video),
  };
}

function collectStrings(value:unknown,out:string[]=[]):string[] {
  if(typeof value==="string") { out.push(value); return out; }
  if(Array.isArray(value)) { for(const item of value) collectStrings(item,out); return out; }
  if(value && typeof value==="object") for(const item of Object.values(value as Record<string,unknown>)) collectStrings(item,out);
  return out;
}

function replaceReferences(value:unknown,replacements:Map<string,string>):unknown {
  if(typeof value==="string") return replacements.get(value) ?? value;
  if(Array.isArray(value)) return value.map((item)=>replaceReferences(item,replacements));
  if(value && typeof value==="object") return Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([key,item])=>[key,replaceReferences(item,replacements)]));
  return value;
}

function short(value:string) {
  try {
    const url=new URL(value);
    return url.pathname.split("/").pop() || value;
  } catch {
    return value.split("/").pop() || value;
  }
}

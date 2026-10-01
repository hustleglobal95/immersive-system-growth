"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import rawExperience from "@/config/experience.json";
import rawProject from "@/config/studio-project.json";
import rawAssetManifest from "@/config/asset-manifest.json";
import rawInteractionGraph from "@/config/interaction-graph.json";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph, type InteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { evaluateProjectHealth } from "@/src/platform/control-plane/projectHealth";
import { StudioLivePreview } from "@/src/studio/StudioLivePreview";
import { downloadJson, useStudioDraft } from "@/src/studio/useStudioDraft";
import type { AssetManifest, AssetManifestEntry } from "@/src/types/assets";
import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";

const initialExperience=parseExperience(rawExperience);
const initialProject=parseStudioProject(rawProject);
const initialManifest=rawAssetManifest as AssetManifest;
const initialGraph=parseInteractionGraph(rawInteractionGraph);

type BuildAssetRequest={
  assetId:string;
  type:"model"|"image"|"video";
  name:string;
  prompt:string;
  heroCandidate:boolean;
};
type BuildResponse={
  ok:true;
  candidate:ExperienceConfig;
  assetManifest:AssetManifest;
  interactionGraph:InteractionGraph;
  assetRequests:BuildAssetRequest[];
  signatureSceneId:string;
  assets:{ready:boolean;blockers:string[]};
};
type PublishCapability={
  ok:boolean;
  canPublish:boolean;
  enabled:boolean;
  repositoryConfigured:boolean;
  githubTokenConfigured:boolean;
  sessionAuthorized:boolean;
};
type AssetTicket={
  provider:"meshy"|"higgsfield-image"|"higgsfield-video";
  taskId:string;
  phase:"preview"|"refine"|"generate";
  status:"submitted";
  message:string;
};
type AssetStatus={
  provider:AssetTicket["provider"];
  taskId:string;
  phase:AssetTicket["phase"];
  status:"queued"|"working"|"succeeded"|"failed"|"canceled";
  progress?:number;
  outputs:string[];
  error?:string;
  canRefine?:boolean;
};

export function SimpleForgeStudio(){
  const draft=useStudioDraft(initialExperience,initialProject,initialManifest,initialGraph);
  const [activeScene,setActiveScene]=useState(0);
  const [projectName,setProjectName]=useState("");
  const [prompt,setPrompt]=useState("");
  const [building,setBuilding]=useState(false);
  const [generatingHero,setGeneratingHero]=useState(false);
  const [message,setMessage]=useState("Describe the site and press Build Website.");
  const [messageTone,setMessageTone]=useState<"neutral"|"good"|"bad">("neutral");
  const [assetRequests,setAssetRequests]=useState<BuildAssetRequest[]>([]);
  const [signatureSceneId,setSignatureSceneId]=useState("");
  const [publishCapability,setPublishCapability]=useState<PublishCapability|null>(null);
  const [publishing,setPublishing]=useState(false);
  const [publishResult,setPublishResult]=useState<{text:string;url?:string}|null>(null);
  const releaseRef=useRef<HTMLElement|null>(null);

  const sceneIndex=Math.max(0,Math.min(activeScene,draft.experience.scenes.length-1));
  const scene=draft.experience.scenes[sceneIndex];
  const heroRequest=assetRequests.find((request)=>request.heroCandidate);

  const health=useMemo(()=>evaluateProjectHealth({
    experience:draft.experience,
    manifest:draft.assetManifest,
    graph:draft.interactionGraph,
    validationIssues:draft.validation,
    project:draft.project,
  }),[draft.assetManifest,draft.experience,draft.interactionGraph,draft.project,draft.validation]);

  const blockers=health.issues.filter((issue)=>issue.severity==="blocker");
  const warnings=health.issues.filter((issue)=>issue.severity==="warning");
  const temporaryAssets=[
    ...draft.assetManifest.models,
    ...draft.assetManifest.textures,
    ...draft.assetManifest.hdr,
    ...draft.assetManifest.video,
  ].filter((asset)=>asset.path.startsWith("/api/studio/assets/generated-file/")).length;
  const releaseReady=blockers.length===0&&draft.validation.length===0&&!heroRequest&&temporaryAssets===0;
  const publishReady=Boolean(
    releaseReady&&publishCapability?.enabled&&publishCapability.repositoryConfigured&&
    publishCapability.githubTokenConfigured&&publishCapability.canPublish&&publishCapability.sessionAuthorized
  );

  useEffect(()=>{
    let cancelled=false;
    void fetch("/api/studio/publish/status",{cache:"no-store"})
      .then((response)=>response.json())
      .then((value:PublishCapability)=>{if(!cancelled)setPublishCapability(value);})
      .catch(()=>{if(!cancelled)setPublishCapability({ok:false,canPublish:false,enabled:false,repositoryConfigured:false,githubTokenConfigured:false,sessionAuthorized:false});});
    return()=>{cancelled=true;};
  },[]);

  async function buildWebsite(){
    if(building) return;
    const statement=prompt.trim();
    if(statement.length<12){
      setMessageTone("bad");
      setMessage("Describe the website in at least one clear sentence.");
      return;
    }

    const resolvedName=projectName.trim()||deriveProjectName(statement);
    const projectId=slug(resolvedName)||"forge-site";
    setProjectName(resolvedName);
    setBuilding(true);
    setMessageTone("neutral");
    setMessage("Building structure, camera choreography and interactions…");
    setPublishResult(null);

    const controller=new AbortController();
    const timeout=window.setTimeout(()=>controller.abort(),60_000);
    try{
      const response=await fetch("/api/studio/interactive3d/plan",{
        method:"POST",
        headers:{"content-type":"application/json"},
        signal:controller.signal,
        body:JSON.stringify({
          prompt:statement,
          projectName:resolvedName,
          experience:draft.experience,
          manifest:draft.assetManifest,
          useCurrentHero:false,
        }),
      });
      const raw=await response.text();
      let body:BuildResponse|{ok:false;error?:string};
      try{body=JSON.parse(raw) as BuildResponse|{ok:false;error?:string};}
      catch{throw new Error(response.ok?"Forge returned an invalid build result.":"Forge could not start this build.");}
      if(!response.ok||!body.ok){
        throw new Error("error" in body?body.error||"Forge could not build this website.":"Forge could not build this website.");
      }

      draft.applyProjectBundle({
        experience:body.candidate,
        assetManifest:body.assetManifest,
        interactionGraph:body.interactionGraph,
        cinematicSystems:draft.cinematicSystems,
      });
      draft.setProject((current)=>({
        ...current,
        id:projectId,
        name:resolvedName,
        deployment:{...current.deployment,projectName:projectId},
      }));
      setAssetRequests(body.assetRequests);
      setSignatureSceneId(body.signatureSceneId);
      setActiveScene(0);
      setMessageTone("good");
      setMessage(`Built ${body.candidate.scenes.length} sections. The live website is updated.`);
    }catch(error){
      setMessageTone("bad");
      setMessage(
        error instanceof DOMException&&error.name==="AbortError"
          ?"The build timed out. Try again."
          : error instanceof Error?error.message:"Forge could not build this website."
      );
    }finally{
      window.clearTimeout(timeout);
      setBuilding(false);
    }
  }

  async function generateHero(){
    if(!heroRequest||generatingHero) return;
    setGeneratingHero(true);
    setMessageTone("neutral");
    setMessage("Generating the project-specific hero asset…");
    try{
      let ticket=await submitAsset(heroRequest);
      let status=await waitForAsset(ticket,(progress)=>{
        setMessage(typeof progress==="number"?`Generating hero · ${Math.round(progress)}%`:"Generating hero…");
      });
      if(ticket.provider==="meshy"&&ticket.phase==="preview"&&status.canRefine){
        ticket=await refineAsset(heroRequest,ticket);
        status=await waitForAsset(ticket,(progress)=>{
          setMessage(typeof progress==="number"?`Applying production materials · ${Math.round(progress)}%`:"Applying production materials…");
        });
      }
      if(status.status!=="succeeded") throw new Error(status.error||"Hero generation did not complete.");

      const promoted=await promoteAsset(heroRequest,ticket,draft.project.id||slug(projectName)||"forge-site");
      const path=promoted?.path??generatedPath(ticket,heroRequest.type);
      if(promoted) addManifestEntry(heroRequest.type,promoted);
      draft.setExperience((current)=>attachHeroAsset(current,heroRequest.type,path,signatureSceneId));
      setAssetRequests((current)=>current.filter((request)=>request.assetId!==heroRequest.assetId));
      setMessageTone("good");
      setMessage(promoted?"Hero generated and installed.":"Hero generated for the draft. Asset Vault is not configured, so it remains temporary.");
    }catch(error){
      setMessageTone("bad");
      setMessage(error instanceof Error?error.message:"Forge could not generate the hero asset.");
    }finally{
      setGeneratingHero(false);
    }
  }

  function addManifestEntry(type:BuildAssetRequest["type"],entry:AssetManifestEntry){
    draft.setAssetManifest((current)=>{
      const next=structuredClone(current);
      const bucket=type==="model"?"models":type==="video"?"video":"textures";
      const rows=next[bucket] as AssetManifestEntry[];
      if(!rows.some((item)=>item.path===entry.path)) rows.push(entry);
      return next;
    });
  }

  function updateScene(change:(value:SceneDefinition)=>SceneDefinition){
    draft.setExperience((current)=>({
      ...current,
      scenes:current.scenes.map((item,index)=>index===sceneIndex?change(item):item),
    }));
  }

  async function finishWebsite(){
    if(publishing) return;
    if(!releaseReady){
      setMessageTone("bad");
      setMessage(heroRequest?"Generate or add the final hero asset first.":temporaryAssets?"Promote temporary assets before finishing.":"Resolve the release blockers shown below.");
      releaseRef.current?.scrollIntoView({behavior:"smooth",block:"center"});
      return;
    }
    if(!publishReady){
      const safeName=slug(draft.project.id||draft.project.name)||"forge-project";
      downloadJson(safeName+"-finished.json",{
        version:1,status:"finished",project:draft.project,experience:draft.experience,
        assetManifest:draft.assetManifest,interactionGraph:draft.interactionGraph,
        cinematicSystems:draft.cinematicSystems,
      });
      setPublishResult({text:"Website finished. The complete Forge project bundle was exported."});
      return;
    }

    setPublishing(true);
    setPublishResult({text:"Creating release review…"});
    try{
      const response=await fetch("/api/studio/publish",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          experience:draft.experience,project:draft.project,assetManifest:draft.assetManifest,
          interactionGraph:draft.interactionGraph,cinematicSystems:draft.cinematicSystems,
          title:`Finish ${draft.project.name}`,summary:"Website completed in Forge Studio.",
        }),
      });
      const body=await response.json() as {ok?:boolean;error?:string;url?:string;number?:number};
      if(!response.ok||!body.ok) throw new Error(body.error||"Forge could not create the release review.");
      setPublishResult({text:`Release review #${body.number} created.`,url:body.url});
    }catch(error){
      setPublishResult({text:error instanceof Error?error.message:"Forge could not create the release review."});
    }finally{
      setPublishing(false);
    }
  }

  if(!draft.hydrated){
    return <main className="forge-builder forge-builder--loading"><strong>FORGE</strong><span>Opening builder…</span></main>;
  }

  return <main className="forge-builder">
    <header className="forge-builder__topbar">
      <div className="forge-builder__brand"><strong>FORGE</strong><span>Interactive Site Builder</span></div>
      <div className="forge-builder__top-actions">
        <button type="button" disabled={!draft.canUndoProjectBundle&&!draft.canUndoExperience} onClick={()=>{if(!draft.undoProjectBundle())draft.undoExperience();}}>Undo</button>
        <button className="forge-builder__finish" type="button" onClick={()=>void finishWebsite()} disabled={publishing}>{publishing?"Finishing…":"Finish Website"}</button>
      </div>
    </header>

    <div className="forge-builder__workspace">
      <aside className="forge-builder__controls">
        <section className="forge-builder__create">
          <div className="forge-builder__section-title"><span>CREATE</span><small>{draft.experience.scenes.length} sections</small></div>
          <input className="forge-builder__name" aria-label="Project name" placeholder="Project name" value={projectName} onChange={(event)=>setProjectName(event.target.value)}/>
          <textarea aria-label="Website brief" rows={7} value={prompt} onChange={(event)=>setPrompt(event.target.value)} placeholder="Describe the finished interactive marketing site. Example: A luxury mechanical watch launch with one persistent watch hero. Scroll assembles the movement, moves into macro detail, then resolves into a clean product CTA."/>
          <button className="forge-builder__build" type="button" disabled={building} onClick={()=>void buildWebsite()}>
            {building?<><span className="forge-builder__spinner"/>Building website…</>:"Build Website"}
          </button>
          <p className="forge-builder__message" data-tone={messageTone} role="status" aria-live="polite">{message}</p>
        </section>

        {heroRequest&&<section className="forge-builder__asset">
          <div className="forge-builder__section-title"><span>HERO ASSET</span><small>{heroRequest.type}</small></div>
          <strong>{heroRequest.name}</strong>
          <p>The site already uses a visible procedural hero so the draft is interactive. Generate the project-specific final asset when the direction is right.</p>
          <button type="button" disabled={generatingHero} onClick={()=>void generateHero()}>{generatingHero?"Generating…":"Generate Hero"}</button>
          <Link href="/studio/assets/create">Or add your own asset</Link>
        </section>}

        <section className="forge-builder__edit">
          <div className="forge-builder__section-title"><span>SECTIONS</span><small>{sceneIndex+1} / {draft.experience.scenes.length}</small></div>
          <div className="forge-builder__scenes" aria-label="Website sections">
            {draft.experience.scenes.map((item,index)=><button type="button" key={item.id} aria-pressed={index===sceneIndex} onClick={()=>setActiveScene(index)}>{item.label}</button>)}
          </div>
          <label>Headline<textarea rows={2} value={scene.copy.headline} onChange={(event)=>updateScene((current)=>({...current,copy:{...current.copy,headline:event.target.value}}))}/></label>
          <label>Body<textarea rows={3} value={scene.copy.body} onChange={(event)=>updateScene((current)=>({...current,copy:{...current.copy,body:event.target.value}}))}/></label>
          <div className="forge-builder__two">
            <label>Camera<select value={scene.camera.path} onChange={(event)=>updateScene((current)=>({...current,camera:{...current.camera,path:event.target.value as SceneDefinition["camera"]["path"]}}))}>{["linear","dolly","arc","orbit","crane","macro","pullback","subject-orbit"].map((value)=><option key={value} value={value}>{value}</option>)}</select></label>
            <label>Exposure<input type="range" min=".4" max="2" step=".05" value={scene.world.exposure} onChange={(event)=>updateScene((current)=>({...current,world:{...current.world,exposure:Number(event.target.value)}}))}/></label>
          </div>
        </section>

        <section ref={releaseRef} className="forge-builder__release" data-ready={releaseReady}>
          <div className="forge-builder__section-title"><span>RELEASE</span><small>{releaseReady?"ready":"needs work"}</small></div>
          {releaseReady
            ?<p>{warnings.length?`${warnings.length} optional polish suggestion${warnings.length===1?"":"s"} remain. They do not block release.`:"No release blockers remain."}</p>
            :<div className="forge-builder__blockers">
              {heroRequest&&<div><strong>Hero asset</strong><span>Generate or add the final project-specific hero.</span></div>}
              {blockers.slice(0,3).map((issue)=><button type="button" key={issue.id} onClick={()=>{if(typeof issue.sceneIndex==="number")setActiveScene(issue.sceneIndex);}}><strong>{issue.title}</strong><span>{issue.recommendedAction}</span></button>)}
              {draft.validation.slice(0,2).map((issue)=><div key={issue}><strong>Configuration</strong><span>{issue}</span></div>)}
            </div>}
          {publishResult&&<div className="forge-builder__published" role="status"><strong>{publishResult.text}</strong>{publishResult.url&&<a href={publishResult.url} target="_blank" rel="noreferrer">Open release review</a>}</div>}
        </section>
      </aside>

      <section className="forge-builder__preview" aria-label="Website preview">
        {building&&<div className="forge-builder__overlay"><span className="forge-builder__spinner"/><strong>FORGE IS BUILDING</strong><small>Structure · camera · interactions · art direction</small></div>}
        <StudioLivePreview experience={draft.experience} active={sceneIndex} setActive={setActiveScene} cinematicSystems={draft.cinematicSystems}/>
      </section>
    </div>
  </main>;
}

async function submitAsset(request:BuildAssetRequest):Promise<AssetTicket>{
  const response=await fetch("/api/studio/assets/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"submit",name:request.name,type:request.type,prompt:request.prompt})});
  const body=await response.json() as {ok?:boolean;ticket?:AssetTicket;error?:string};
  if(!response.ok||!body.ok||!body.ticket) throw new Error(body.error||"Could not start hero generation.");
  return body.ticket;
}

async function refineAsset(request:BuildAssetRequest,ticket:AssetTicket):Promise<AssetTicket>{
  const response=await fetch("/api/studio/assets/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"refine",name:request.name,type:request.type,prompt:request.prompt,taskId:ticket.taskId})});
  const body=await response.json() as {ok?:boolean;ticket?:AssetTicket;error?:string};
  if(!response.ok||!body.ok||!body.ticket) throw new Error(body.error||"Could not refine hero asset.");
  return body.ticket;
}

async function waitForAsset(ticket:AssetTicket,onProgress:(progress:number|undefined)=>void):Promise<AssetStatus>{
  for(let attempt=0;attempt<90;attempt++){
    const query=new URLSearchParams({provider:ticket.provider,taskId:ticket.taskId,phase:ticket.phase});
    const response=await fetch("/api/studio/assets/generate?"+query.toString(),{cache:"no-store"});
    const body=await response.json() as {ok?:boolean;status?:AssetStatus;error?:string};
    if(!response.ok||!body.ok||!body.status) throw new Error(body.error||"Could not read hero generation status.");
    onProgress(body.status.progress);
    if(["succeeded","failed","canceled"].includes(body.status.status)) return body.status;
    await new Promise((resolve)=>window.setTimeout(resolve,2000));
  }
  throw new Error("Hero generation timed out.");
}

async function promoteAsset(request:BuildAssetRequest,ticket:AssetTicket,projectId:string):Promise<AssetManifestEntry|null>{
  const response=await fetch("/api/studio/assets/vault/promote",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
    provider:ticket.provider,taskId:ticket.taskId,phase:ticket.phase,kind:request.type,projectId:slug(projectId)||"forge-site",name:request.name,
  })});
  if(response.status===503) return null;
  const body=await response.json() as {ok?:boolean;asset?:AssetManifestEntry;error?:string};
  if(!response.ok||!body.ok||!body.asset) throw new Error(body.error||"Could not save the generated hero.");
  return body.asset;
}

function generatedPath(ticket:AssetTicket,type:BuildAssetRequest["type"]){
  return `/api/studio/assets/generated-file/${encodeURIComponent(ticket.provider)}/${encodeURIComponent(ticket.taskId)}/${ticket.phase}/${type}`;
}

function attachHeroAsset(experience:ExperienceConfig,type:BuildAssetRequest["type"],path:string,signatureSceneId:string):ExperienceConfig{
  if(type==="model") return parseExperience({...experience,heroModel:path,heroVisible:true});
  return parseExperience({
    ...experience,
    scenes:experience.scenes.map((scene)=>scene.id===signatureSceneId?{
      ...scene,
      media:{
        kind:"image",src:path,alt:scene.copy.headline,transition:"mask",
        layers:[],position:[50,50],mobilePosition:[50,50],
      },
    }:scene),
  });
}

function deriveProjectName(prompt:string){
  const clean=prompt.replace(/^(build|create|make|design)\s+(me\s+)?(an?\s+)?/i,"").trim();
  return clean.split(/[.!?]/)[0].split(/\s+/).slice(0,5).join(" ").replace(/\b\w/g,(char)=>char.toUpperCase())||"Forge Project";
}
function slug(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);}

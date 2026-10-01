"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import rawExperience from "@/config/experience.json";
import rawProject from "@/config/studio-project.json";
import rawAssetManifest from "@/config/asset-manifest.json";
import rawInteractionGraph from "@/config/interaction-graph.json";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { evaluateProjectHealth } from "@/src/platform/control-plane/projectHealth";
import { StudioLivePreview } from "@/src/studio/StudioLivePreview";
import { downloadJson, useStudioDraft } from "@/src/studio/useStudioDraft";
import type { AssetManifest } from "@/src/types/assets";
import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";

const initialExperience=parseExperience(rawExperience);
const initialProject=parseStudioProject(rawProject);
const initialManifest=rawAssetManifest as AssetManifest;
const initialGraph=parseInteractionGraph(rawInteractionGraph);

type Mode="build"|"edit"|"finish";
type BuildResponse={
  ok:true;
  candidate:ExperienceConfig;
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

export function SimpleForgeStudio(){
  const draft=useStudioDraft(initialExperience,initialProject,initialManifest,initialGraph);
  const [mode,setMode]=useState<Mode>("build");
  const [activeScene,setActiveScene]=useState(0);
  const [prompt,setPrompt]=useState("");
  const [building,setBuilding]=useState(false);
  const [message,setMessage]=useState("");
  const [publishCapability,setPublishCapability]=useState<PublishCapability|null>(null);
  const [publishing,setPublishing]=useState(false);
  const [publishResult,setPublishResult]=useState<{text:string;url?:string}|null>(null);

  const sceneIndex=Math.max(0,Math.min(activeScene,draft.experience.scenes.length-1));
  const scene=draft.experience.scenes[sceneIndex];
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
  const releaseReady=blockers.length===0&&draft.validation.length===0&&temporaryAssets===0;
  const publishReady=Boolean(
    releaseReady&&
    publishCapability?.enabled&&
    publishCapability.repositoryConfigured&&
    publishCapability.githubTokenConfigured&&
    publishCapability.canPublish&&
    publishCapability.sessionAuthorized
  );

  useEffect(()=>{
    if(mode!=="finish") return;
    let cancelled=false;
    void fetch("/api/studio/publish/status",{cache:"no-store"})
      .then((response)=>response.json())
      .then((value:PublishCapability)=>{if(!cancelled)setPublishCapability(value);})
      .catch(()=>{if(!cancelled)setPublishCapability({ok:false,canPublish:false,enabled:false,repositoryConfigured:false,githubTokenConfigured:false,sessionAuthorized:false});});
    return()=>{cancelled=true;};
  },[mode]);

  async function buildWebsite(){
    const statement=prompt.trim();
    if(statement.length<12||building) return;
    setBuilding(true);
    setMessage("");
    try{
      const response=await fetch("/api/studio/interactive3d/plan",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          prompt:statement,
          projectName:draft.project.name,
          experience:draft.experience,
          manifest:draft.assetManifest,
          useCurrentHero:Boolean(draft.experience.heroModel),
        }),
      });
      const body=await response.json() as BuildResponse|{ok:false;error?:string};
      if(!response.ok||!body.ok) throw new Error("error" in body?body.error||"Forge could not build this website.":"Forge could not build this website.");
      draft.applyProjectBundle({
        experience:body.candidate,
        assetManifest:draft.assetManifest,
        interactionGraph:draft.interactionGraph,
        cinematicSystems:draft.cinematicSystems,
      });
      setActiveScene(0);
      setMessage(body.assets.ready?"Built. Edit it, then finish it.":"Built. Add the missing hero asset, then finish it.");
      setMode("edit");
    }catch(error){
      setMessage(error instanceof Error?error.message:"Forge could not build this website.");
    }finally{
      setBuilding(false);
    }
  }

  function updateScene(change:(value:SceneDefinition)=>SceneDefinition){
    draft.setExperience((current)=>({
      ...current,
      scenes:current.scenes.map((item,index)=>index===sceneIndex?change(item):item),
    }));
  }

  async function finishWebsite(){
    if(!releaseReady||publishing) return;
    if(!publishReady){
      const safeName=(draft.project.id||draft.project.name||"forge-project").replace(/[^a-z0-9-]+/gi,"-").replace(/^-+|-+$/g,"").toLowerCase()||"forge-project";
      downloadJson(safeName+"-finished.json",{
        version:1,
        status:"finished",
        project:draft.project,
        experience:draft.experience,
        assetManifest:draft.assetManifest,
        interactionGraph:draft.interactionGraph,
        cinematicSystems:draft.cinematicSystems,
      });
      setPublishResult({text:"Website finished. The completed Forge project package was downloaded. Connect publishing later only if you want Forge to create the release review automatically."});
      return;
    }
    setPublishing(true);
    setPublishResult({text:"Creating release review…"});
    try{
      const response=await fetch("/api/studio/publish",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          experience:draft.experience,
          project:draft.project,
          assetManifest:draft.assetManifest,
          interactionGraph:draft.interactionGraph,
          cinematicSystems:draft.cinematicSystems,
          title:`Finish ${draft.project.name}`,
          summary:"Website completed in Forge Studio.",
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

  function publishBlocker(){
    if(blockers.length) return blockers[0].title;
    if(draft.validation.length) return draft.validation[0];
    if(temporaryAssets) return "A generated asset is still temporary.";
    if(!publishCapability) return "Checking publishing. You can still finish and export the project.";
    if(!publishCapability.enabled||!publishCapability.repositoryConfigured||!publishCapability.githubTokenConfigured) return "Publishing is not connected. Finish Website will export the completed project package.";
    if(!publishCapability.canPublish||!publishCapability.sessionAuthorized) return "Automatic publishing is unavailable. Finish Website will export the completed project package.";
    return "";
  }

  if(!draft.hydrated){
    return <main className="simple-forge simple-forge--loading"><strong>FORGE</strong><span>Opening Studio…</span></main>;
  }

  return <main className="simple-forge">
    <header className="simple-forge__topbar">
      <div className="simple-forge__brand">
        <strong>FORGE</strong>
        <input aria-label="Project name" value={draft.project.name} onChange={(event)=>draft.setProject((current)=>({...current,name:event.target.value}))}/>
      </div>
      <nav aria-label="Forge workflow">
        {(["build","edit","finish"] as const).map((item)=><button key={item} type="button" aria-current={mode===item?"page":undefined} onClick={()=>setMode(item)}>{item[0].toUpperCase()+item.slice(1)}</button>)}
      </nav>
      <div className="simple-forge__utility">
        <button type="button" disabled={!draft.canUndoProjectBundle&&!draft.canUndoExperience} onClick={()=>{if(!draft.undoProjectBundle())draft.undoExperience();}}>Undo</button>
        <Link href="/studio/advanced">Advanced</Link>
      </div>
    </header>

    <div className="simple-forge__workspace">
      <aside className="simple-forge__panel">
        {mode==="build"&&<section className="simple-forge__section">
          <span className="simple-forge__eyebrow">BUILD</span>
          <h1>What website do you want?</h1>
          <p>Describe the finished experience. Forge builds the structure, camera direction and interactive 3D plan.</p>
          <textarea aria-label="Website brief" rows={10} value={prompt} onChange={(event)=>setPrompt(event.target.value)} placeholder="Build a luxury mechanical watch website. Keep one watch as the hero. Scroll assembles the movement, moves into macro detail, then ends on a clean product CTA. Dark editorial typography. Restrained motion."/>
          <button className="simple-forge__primary" type="button" disabled={building||prompt.trim().length<12} onClick={()=>void buildWebsite()}>{building?"Building…":"Build Website"}</button>
          {message&&<p className="simple-forge__message" role="status">{message}</p>}
          {!draft.experience.heroModel&&<Link className="simple-forge__asset-link" href="/studio/assets/create">Create or add a hero asset</Link>}
        </section>}

        {mode==="edit"&&<section className="simple-forge__section">
          <span className="simple-forge__eyebrow">EDIT</span>
          <h1>Edit the website.</h1>
          <div className="simple-forge__scenes" aria-label="Website scenes">
            {draft.experience.scenes.map((item,index)=><button type="button" key={item.id} aria-pressed={index===sceneIndex} onClick={()=>setActiveScene(index)}>{index+1}. {item.label}</button>)}
          </div>
          <label>Section name<input value={scene.label} onChange={(event)=>updateScene((current)=>({...current,label:event.target.value}))}/></label>
          <label>Headline<textarea rows={3} value={scene.copy.headline} onChange={(event)=>updateScene((current)=>({...current,copy:{...current.copy,headline:event.target.value}}))}/></label>
          <label>Body<textarea rows={4} value={scene.copy.body} onChange={(event)=>updateScene((current)=>({...current,copy:{...current.copy,body:event.target.value}}))}/></label>
          <label>Camera<select value={scene.camera.path} onChange={(event)=>updateScene((current)=>({...current,camera:{...current.camera,path:event.target.value as SceneDefinition["camera"]["path"]}}))}>{["linear","dolly","arc","orbit","crane","macro","pullback","subject-orbit"].map((value)=><option key={value} value={value}>{value}</option>)}</select></label>
          <label className="simple-forge__range">Exposure <output>{scene.world.exposure.toFixed(2)}</output><input type="range" min=".4" max="2" step=".05" value={scene.world.exposure} onChange={(event)=>updateScene((current)=>({...current,world:{...current.world,exposure:Number(event.target.value)}}))}/></label>
          <label className="simple-forge__range">Bloom <output>{scene.post.bloom.toFixed(2)}</output><input type="range" min="0" max="1.5" step=".05" value={scene.post.bloom} onChange={(event)=>updateScene((current)=>({...current,post:{...current.post,bloom:Number(event.target.value)}}))}/></label>
          <div className="simple-forge__row"><Link href="/studio/assets/create">Assets</Link><button type="button" onClick={()=>setMode("finish")}>Finish Website</button></div>
        </section>}

        {mode==="finish"&&<section className="simple-forge__section">
          <span className="simple-forge__eyebrow">FINISH</span>
          <h1>{releaseReady?"This website can ship.":"Finish the blockers."}</h1>
          {releaseReady
            ?<p>{warnings.length?`${warnings.length} optional polish suggestion${warnings.length===1?"":"s"} remain. They do not block release.`:"No release blockers remain."}</p>
            :<div className="simple-forge__blockers">
              {blockers.slice(0,5).map((issue)=><button type="button" key={issue.id} onClick={()=>{if(typeof issue.sceneIndex==="number")setActiveScene(issue.sceneIndex);setMode("edit");}}><strong>{issue.title}</strong><span>{issue.recommendedAction}</span></button>)}
              {draft.validation.map((issue)=><button type="button" key={issue} onClick={()=>setMode("edit")}><strong>Configuration issue</strong><span>{issue}</span></button>)}
              {temporaryAssets>0&&<Link href="/studio/assets/create"><strong>Permanent asset needed</strong><span>Move the generated draft asset into the final project.</span></Link>}
            </div>}
          <button className="simple-forge__primary" type="button" disabled={!releaseReady||publishing} onClick={()=>void finishWebsite()}>{publishing?"Finishing…":"Finish Website"}</button>
          {!publishReady&&<p className="simple-forge__message">{publishBlocker()}</p>}
          {publishResult&&<div className="simple-forge__published" role="status"><strong>{publishResult.text}</strong>{publishResult.url&&<a href={publishResult.url} target="_blank" rel="noreferrer">Open release review</a>}</div>}
          <button className="simple-forge__secondary" type="button" onClick={()=>setMode("edit")}>Back to editing</button>
        </section>}
      </aside>

      <section className="simple-forge__preview" aria-label="Website preview">
        <StudioLivePreview experience={draft.experience} active={sceneIndex} setActive={setActiveScene} cinematicSystems={draft.cinematicSystems}/>
      </section>
    </div>
  </main>;
}

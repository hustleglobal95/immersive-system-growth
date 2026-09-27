import fs from "node:fs/promises";
import path from "node:path";
import dns from "node:dns/promises";
import net from "node:net";
import crypto from "node:crypto";
import { chromium } from "@playwright/test";
import { normalizeReferenceUrl } from "./lib/reference-intelligence.mjs";

const options=Object.fromEntries(process.argv.slice(2)
  .filter((arg)=>arg.startsWith("--")&&arg.includes("="))
  .map((arg)=>arg.slice(2).split(/=(.*)/s,2)));
const url=normalizeReferenceUrl(options.url||"");
await assertPublicDestination(url);
const target=new URL(url);
const stamp=new Date().toISOString().replace(/[:.]/g,"-");
const slug=(target.hostname+target.pathname).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,72)||"reference";
const output=path.resolve(String(options.output||path.join(".forge","reference-captures",slug+"-"+stamp)));
await fs.mkdir(output,{recursive:true});

const browser=await chromium.launch({headless:true});
const destinationCache=new Map();
try{
  const desktop=await captureViewport(browser,url,{width:1440,height:1000},"desktop",output);
  const mobile=await captureViewport(browser,url,{width:390,height:844},"mobile",output);
  const manifest={
    version:1,
    url,
    capturedAt:new Date().toISOString(),
    tool:"Playwright Chromium",
    desktop,
    mobile,
  };
  const manifestRaw=JSON.stringify(manifest,null,2)+"\n";
  const manifestPath=path.join(output,"capture.json");
  await fs.writeFile(manifestPath,manifestRaw,"utf8");

  const template={
    version:1,
    reference:{
      url,
      name:desktop.machineFacts.title||target.hostname,
      reviewedAt:new Date().toISOString().slice(0,10),
      medium:"Website",
      whyRelevant:"REVIEW REQUIRED",
      problemSolved:"REVIEW REQUIRED",
    },
    evidence:{
      reviewMethod:"browser-capture+agent-review",
      observedAt:manifest.capturedAt,
      sources:[
        ...desktop.screenshots.map((item)=>({type:"desktop-screenshot",locator:item.path,sha256:item.sha256})),
        ...mobile.screenshots.map((item)=>({type:"mobile-screenshot",locator:item.path,sha256:item.sha256})),
        {type:"page-dom",locator:path.relative(process.cwd(),manifestPath),sha256:sha256(manifestRaw)},
      ],
    },
    observedFacts:{
      composition:[],
      typography:[],
      depth:[],
      scrollChoreography:[],
      pointerTouchBehavior:[],
      transitionMechanics:[],
      persistentAnchors:[],
      domWebglResponsibilities:[],
      signatureMoment:[],
      mobileTranslation:[],
      performanceRisks:[],
    },
    hypotheses:[],
    transferableLessons:[
      {lesson:"REVIEW REQUIRED",causalReason:"REVIEW REQUIRED",forgeSystems:["REVIEW REQUIRED"],constructionPatternCandidates:[]},
      {lesson:"REVIEW REQUIRED",causalReason:"REVIEW REQUIRED",forgeSystems:["REVIEW REQUIRED"],constructionPatternCandidates:[]},
    ],
    doNotCopy:[
      "Proprietary assets",
      "Exact branded composition",
      "Exact typography/palette bundle",
      "Distinctive signature interaction without a new project-specific reason"
    ],
    implementationMap:{
      existingForgeSystems:["REVIEW REQUIRED"],
      customWork:[],
      noNewDependency:[],
    },
    confidence:0,
  };
  const templatePath=path.join(output,"analysis.template.json");
  await fs.writeFile(templatePath,JSON.stringify(template,null,2)+"\n","utf8");
  console.log("Forge reference capture complete.");
  console.log("Capture manifest: "+path.relative(process.cwd(),manifestPath));
  console.log("Deconstruction template: "+path.relative(process.cwd(),templatePath));
  console.log("Next: visually review the captured desktop/mobile evidence, fill the deconstruction, then pass it to forge:preflight with --reference-analysis.");
} finally {
  await browser.close();
}

async function captureViewport(browser,url,viewport,label,output){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:"no-preference",serviceWorkers:"block"});
  await context.route("**/*",async(route)=>{
    const requestUrl=route.request().url();
    if(requestUrl.startsWith("data:")||requestUrl.startsWith("blob:")||requestUrl==="about:blank") return route.continue();
    let parsed;
    try{parsed=new URL(requestUrl);}catch{return route.abort("blockedbyclient");}
    if(!["http:","https:"].includes(parsed.protocol)) return route.abort("blockedbyclient");
    try{
      await assertPublicDestinationCached(parsed.toString());
      return route.continue();
    }catch{
      return route.abort("blockedbyclient");
    }
  });
  const page=await context.newPage();
  const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
  await assertPublicDestinationCached(page.url());
  await page.waitForTimeout(1200);
  const status=response?.status()??null;
  const machineFacts=await page.evaluate(()=> {
    const visible=(el)=>{
      const rect=el.getBoundingClientRect();
      const style=getComputedStyle(el);
      return rect.width>0&&rect.height>0&&style.visibility!=="hidden"&&style.display!=="none";
    };
    const nodes=Array.from(document.querySelectorAll("body *")).filter(visible);
    const sampled=nodes.slice(0,500);
    const fonts=[...new Set(sampled.map((el)=>getComputedStyle(el).fontFamily).filter(Boolean))].slice(0,20);
    const headings=Array.from(document.querySelectorAll("h1,h2,h3")).filter(visible).slice(0,30).map((el)=>String(el.textContent||"").trim().replace(/\s+/g," ").slice(0,180)).filter(Boolean);
    const fixedSticky=sampled.filter((el)=>["fixed","sticky"].includes(getComputedStyle(el).position)).length;
    const transformed=sampled.filter((el)=>getComputedStyle(el).transform!=="none").length;
    const scriptHosts=[...new Set(Array.from(document.scripts).map((script)=>{
      try{return script.src?new URL(script.src,location.href).hostname:"";}catch{return "";}
    }).filter(Boolean))].slice(0,30);
    return {
      title:document.title.slice(0,180),
      lang:document.documentElement.lang||"",
      scrollHeight:document.documentElement.scrollHeight,
      bodyWidth:document.body.scrollWidth,
      headings,
      fonts,
      counts:{
        sections:document.querySelectorAll("section").length,
        canvases:document.querySelectorAll("canvas").length,
        videos:document.querySelectorAll("video").length,
        images:document.querySelectorAll("img,picture").length,
        buttons:document.querySelectorAll("button").length,
        links:document.querySelectorAll("a").length,
        fixedSticky,
        transformedSample:transformed,
        activeAnimations:document.getAnimations().length,
      },
      scriptHosts,
      hasWebglHints:Boolean(document.querySelector("canvas")),
      hasScrollTimelineSupport:CSS.supports?.("animation-timeline: scroll()")??false,
    };
  });

  const screenshots=[];
  const maxScroll=Math.max(0,machineFacts.scrollHeight-viewport.height);
  for(const [index,ratio] of [0,0.25,0.5,0.75,1].entries()){
    await page.evaluate((y)=>scrollTo(0,y),Math.round(maxScroll*ratio));
    await page.waitForTimeout(500);
    const file=path.join(output,`${label}-${String(index).padStart(2,"0")}.png`);
    await page.screenshot({path:file,fullPage:false});
    const bytes=await fs.readFile(file);
    screenshots.push({ratio,path:path.relative(process.cwd(),file),sha256:sha256(bytes),bytes:bytes.length});
  }
  await context.close();
  return {viewport,status,machineFacts,screenshots};
}

async function assertPublicDestinationCached(value){
  const url=new URL(value);
  const key=url.hostname.toLowerCase();
  if(destinationCache.has(key)){
    if(destinationCache.get(key)!==true) throw new Error("Destination blocked by Forge reference capture policy.");
    return;
  }
  try{
    await assertPublicDestination(value);
    destinationCache.set(key,true);
  }catch(error){
    destinationCache.set(key,false);
    throw error;
  }
}
async function assertPublicDestination(value){
  const url=new URL(value);
  const host=url.hostname.toLowerCase();
  if(host==="localhost"||host.endsWith(".local")) throw new Error("Local/private reference destinations are not allowed.");
  if(net.isIP(host)){
    if(isPrivateAddress(host)) throw new Error("Private/link-local reference destinations are not allowed.");
    return;
  }
  const resolved=await dns.lookup(host,{all:true});
  if(!resolved.length) throw new Error("Reference hostname did not resolve.");
  for(const row of resolved) if(isPrivateAddress(row.address)) throw new Error("Reference hostname resolves to a private/link-local address.");
}
function isPrivateAddress(address){
  if(address==="::1"||address==="0:0:0:0:0:0:0:1") return true;
  if(address.startsWith("fc")||address.startsWith("fd")||address.startsWith("fe80:")) return true;
  if(net.isIPv4(address)){
    const parts=address.split(".").map(Number);
    return parts[0]===10||parts[0]===127||parts[0]===0||
      (parts[0]===169&&parts[1]===254)||
      (parts[0]===172&&parts[1]>=16&&parts[1]<=31)||
      (parts[0]===192&&parts[1]===168);
  }
  return false;
}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

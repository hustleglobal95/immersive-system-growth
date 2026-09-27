import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const URL_PATTERN=/https?:\/\/[^\s<>"')\]]+/gi;
const REVIEW_METHODS=new Set([
  "browser-capture+agent-review",
  "agent-visual-review",
  "provided-media+agent-review",
]);
const EVIDENCE_TYPES=new Set([
  "live-browser",
  "desktop-screenshot",
  "mobile-screenshot",
  "video",
  "provided-image",
  "page-dom",
  "public-description",
]);
const OBSERVATION_FIELDS=[
  "composition",
  "typography",
  "depth",
  "scrollChoreography",
  "pointerTouchBehavior",
  "transitionMechanics",
  "persistentAnchors",
  "domWebglResponsibilities",
  "signatureMoment",
  "mobileTranslation",
  "performanceRisks",
];

export function parseDelimitedList(value){
  return String(value||"").split(";").map((item)=>item.trim()).filter(Boolean);
}

export function extractHttpUrls(value){
  const matches=String(value||"").match(URL_PATTERN)||[];
  return unique(matches.map(cleanUrlToken).map(normalizeReferenceUrl));
}

export function normalizeReferenceUrl(value){
  const url=new URL(String(value).trim());
  if(!["http:","https:"].includes(url.protocol)) throw new Error("Only HTTP(S) reference URLs are supported.");
  if(url.username||url.password) throw new Error("Reference URLs may not contain credentials.");
  url.hash="";
  if(url.pathname!=="/") url.pathname=url.pathname.replace(/\/+$/,"")||"/";
  return url.toString();
}

export function classifyPromptUrls(prompt,options={}){
  const detected=extractHttpUrls(prompt);
  const inferred=inferPromptUrlRoles(prompt);
  const groups={
    business:unique([...inferred.business,...normalizeList(options.businessUrls||[])]),
    reference:unique([...inferred.reference,...normalizeList(options.referenceUrls||[])]),
    supporting:unique([...inferred.supporting,...normalizeList(options.supportingUrls||[])]),
  };
  const overlaps=findOverlaps(groups);
  if(overlaps.length) throw new Error("A URL may have only one Forge role: "+overlaps.join(", "));
  const classified=new Set([...groups.business,...groups.reference,...groups.supporting]);
  const unclassified=detected.filter((url)=>!classified.has(url));
  const notInPrompt=[...classified].filter((url)=>!detected.includes(url));
  return {detected,groups,unclassified,notInPrompt};
}

export function inferPromptUrlRoles(prompt){
  const groups={business:[],reference:[],supporting:[]};
  for(const line of String(prompt||"").split(/\r?\n/)){
    const urls=extractHttpUrls(line);
    if(!urls.length) continue;
    const lower=line.toLowerCase();
    let role=null;
    if(/\b(reference|inspiration|inspo|precedent|benchmark|example|like this|love this)\b/.test(lower)) role="reference";
    else if(/\b(business|client|company|brand|current site|existing site|their site)\b/.test(lower)) role="business";
    else if(/\b(supporting|source|research|article|documentation)\b/.test(lower)) role="supporting";
    if(role) groups[role].push(...urls);
  }
  return Object.fromEntries(Object.entries(groups).map(([key,values])=>[key,unique(values)]));
}

export async function loadReferenceAnalyses(paths,expectedUrls=[]){
  const rows=[];
  for(const inputPath of paths){
    const absolute=path.resolve(inputPath);
    const raw=await fs.readFile(absolute,"utf8");
    const parsed=JSON.parse(raw);
    const analysis=validateReferenceAnalysis(parsed);
    rows.push({
      path:absolute,
      sha256:sha256(raw),
      bytes:Buffer.byteLength(raw),
      analysis,
    });
  }
  if(expectedUrls.length){
    const expected=expectedUrls.map(normalizeReferenceUrl);
    const actual=rows.map((row)=>normalizeReferenceUrl(row.analysis.reference.url));
    const missing=expected.filter((url)=>!actual.includes(url));
    const unexpected=actual.filter((url)=>!expected.includes(url));
    if(missing.length||unexpected.length){
      throw new Error("Reference analysis URL mismatch. Missing: "+(missing.join(", ")||"none")+"; unexpected: "+(unexpected.join(", ")||"none")+".");
    }
  }
  return rows;
}

export function validateReferenceAnalysis(input){
  if(!input||typeof input!=="object") throw new Error("Reference analysis must be an object.");
  rejectPlaceholders(input);
  if(input.version!==1) throw new Error("Reference analysis version must be 1.");
  const reference=requireObject(input.reference,"reference");
  const evidence=requireObject(input.evidence,"evidence");
  const facts=requireObject(input.observedFacts,"observedFacts");
  const implementation=requireObject(input.implementationMap,"implementationMap");

  const normalizedUrl=normalizeReferenceUrl(requireString(reference.url,"reference.url",2048));
  requireString(reference.name,"reference.name",180);
  requireString(reference.reviewedAt,"reference.reviewedAt",64);
  requireString(reference.medium,"reference.medium",180);
  requireString(reference.whyRelevant,"reference.whyRelevant",600);
  requireString(reference.problemSolved,"reference.problemSolved",600);

  const reviewMethod=requireString(evidence.reviewMethod,"evidence.reviewMethod",120);
  if(!REVIEW_METHODS.has(reviewMethod)) throw new Error("Unsupported evidence.reviewMethod: "+reviewMethod);
  requireString(evidence.observedAt,"evidence.observedAt",64);
  const sources=requireArray(evidence.sources,"evidence.sources",1,40);
  const visualSources=sources.filter((source)=>{
    const row=requireObject(source,"evidence.sources[]");
    const type=requireString(row.type,"evidence.sources[].type",80);
    if(!EVIDENCE_TYPES.has(type)) throw new Error("Unsupported evidence source type: "+type);
    requireString(row.locator,"evidence.sources[].locator",500);
    if(row.sha256!==undefined&&!/^[a-f0-9]{64}$/.test(String(row.sha256))) throw new Error("Evidence source sha256 must be a 64-character hex digest.");
    return ["live-browser","desktop-screenshot","mobile-screenshot","video","provided-image"].includes(type);
  });
  if(!visualSources.length) throw new Error("Reference analysis requires at least one visual/behavioral evidence source.");

  let evidencedCategories=0;
  for(const field of OBSERVATION_FIELDS){
    const values=requireStringArray(facts[field],"observedFacts."+field,0,24,600);
    if(values.length) evidencedCategories++;
  }
  if(evidencedCategories<6) throw new Error("Reference analysis must contain observed facts in at least six deconstruction categories.");
  if(!facts.signatureMoment.length) throw new Error("Reference analysis must document at least one observed signature-moment fact.");
  if(!facts.mobileTranslation.length) throw new Error("Reference analysis must document mobile evidence or explicitly state that mobile behavior was unavailable to verify.");

  const hypotheses=requireStringArray(input.hypotheses,"hypotheses",0,24,600);
  const lessons=requireArray(input.transferableLessons,"transferableLessons",2,16);
  for(const item of lessons){
    const lesson=requireObject(item,"transferableLessons[]");
    requireString(lesson.lesson,"transferableLessons[].lesson",600);
    requireString(lesson.causalReason,"transferableLessons[].causalReason",600);
    requireStringArray(lesson.forgeSystems,"transferableLessons[].forgeSystems",1,20,180);
    requireStringArray(lesson.constructionPatternCandidates??[],"transferableLessons[].constructionPatternCandidates",0,20,180);
  }

  const doNotCopy=requireStringArray(input.doNotCopy,"doNotCopy",4,24,300);
  const existingForgeSystems=requireStringArray(implementation.existingForgeSystems,"implementationMap.existingForgeSystems",1,30,180);
  const customWork=requireStringArray(implementation.customWork,"implementationMap.customWork",0,20,300);
  const noNewDependency=requireStringArray(implementation.noNewDependency,"implementationMap.noNewDependency",0,20,300);
  const confidence=Number(input.confidence);
  if(!Number.isFinite(confidence)||confidence<0||confidence>1) throw new Error("confidence must be between 0 and 1.");

  return {
    version:1,
    reference:{...reference,url:normalizedUrl},
    evidence:{...evidence,sources},
    observedFacts:Object.fromEntries(OBSERVATION_FIELDS.map((field)=>[field,[...facts[field]]])),
    hypotheses,
    transferableLessons:lessons,
    doNotCopy,
    implementationMap:{existingForgeSystems,customWork,noNewDependency},
    confidence,
  };
}

export function applyReferenceAnalysesToBrief(brief,rows){
  if(!rows.length) return brief;
  const references=[...(brief.references||[])];
  for(const row of rows){
    const analysis=row.analysis;
    const strongest=analysis.transferableLessons.slice(0,3).map((item)=>item.lesson).join(" ");
    const signature=analysis.observedFacts.signatureMoment.slice(0,1).join(" ");
    const lesson=clip(
      "Observed reference evidence: "+strongest+
      (signature?" Signature mechanism: "+signature:"")+
      " Transfer causal principles only; do not copy "+analysis.doNotCopy.slice(0,4).join(", ")+".",
      590,
    );
    references.push({
      label:clip(analysis.reference.name+" — "+analysis.reference.url,175),
      lesson,
    });
  }
  return {...brief,references:references.slice(0,20)};
}

export function summarizeReferenceAnalyses(rows){
  return rows.map((row)=>({
    url:row.analysis.reference.url,
    name:row.analysis.reference.name,
    reviewedAt:row.analysis.reference.reviewedAt,
    reviewMethod:row.analysis.evidence.reviewMethod,
    confidence:row.analysis.confidence,
    evidenceSourceCount:row.analysis.evidence.sources.length,
    observedFacts:row.analysis.observedFacts,
    hypotheses:row.analysis.hypotheses,
    transferableLessons:row.analysis.transferableLessons,
    doNotCopy:row.analysis.doNotCopy,
    implementationMap:row.analysis.implementationMap,
    analysisSha256:row.sha256,
  }));
}

export function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeList(values){
  return unique(values.map(normalizeReferenceUrl));
}
function findOverlaps(groups){
  const ownership=new Map();
  for(const [role,urls] of Object.entries(groups)){
    for(const url of urls){
      const roles=ownership.get(url)||[];
      roles.push(role);
      ownership.set(url,roles);
    }
  }
  return [...ownership.entries()].filter(([,roles])=>roles.length>1).map(([url,roles])=>url+" ("+roles.join("/")+")");
}
function rejectPlaceholders(value,pathLabel="analysis"){
  if(typeof value==="string"){
    if(/\b(REVIEW REQUIRED|TODO|TBD|FILL ME|PLACEHOLDER)\b/i.test(value)) throw new Error(pathLabel+" contains unresolved placeholder text.");
    return;
  }
  if(Array.isArray(value)){
    value.forEach((item,index)=>rejectPlaceholders(item,pathLabel+"["+index+"]"));
    return;
  }
  if(value&&typeof value==="object"){
    for(const [key,item] of Object.entries(value)) rejectPlaceholders(item,pathLabel+"."+key);
  }
}

function requireObject(value,label){
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error(label+" must be an object.");
  return value;
}
function requireArray(value,label,min,max=Number.MAX_SAFE_INTEGER){
  if(!Array.isArray(value)||value.length<min||value.length>max) throw new Error(label+" must contain between "+min+" and "+max+" items.");
  return value;
}
function requireString(value,label,max){
  const text=String(value??"").trim();
  if(!text) throw new Error(label+" is required.");
  if(text.length>max) throw new Error(label+" exceeds "+max+" characters.");
  return text;
}
function requireStringArray(value,label,min,max,itemMax){
  const values=requireArray(value,label,min,max);
  for(const item of values) requireString(item,label+"[]",itemMax);
  return values.map((item)=>String(item).trim());
}
function cleanUrlToken(value){
  return String(value).replace(/[.,;:!?]+$/,"");
}
function clip(value,max){
  const text=String(value).trim();
  return text.length<=max?text:text.slice(0,max-1).trimEnd()+"…";
}
function unique(values){
  return values.filter((value,index)=>values.indexOf(value)===index);
}

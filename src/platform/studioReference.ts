import { z } from "zod";

const refId=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const short=z.string().min(1).max(180);
const note=z.string().max(900);
const lines=z.array(z.string().min(1).max(400)).max(32).default([]);
const httpUrl=z.string().url().refine((value)=>/^https?:\/\//i.test(value),{message:"Reference URL must use HTTP(S)."});

export const studioReferenceSystemsSchema=z.object({
  composition:note.default(""),
  typography:note.default(""),
  motion:note.default(""),
  interaction:note.default(""),
  threeD:note.default(""),
  transitions:note.default(""),
  mobile:note.default(""),
  performance:note.default(""),
}).strict().default({
  composition:"",
  typography:"",
  motion:"",
  interaction:"",
  threeD:"",
  transitions:"",
  mobile:"",
  performance:"",
});

export const studioReferenceSchema=z.object({
  id:refId,
  label:short,
  url:httpUrl,
  enabled:z.boolean().default(true),
  reviewedAt:z.string().max(64).default(""),
  evidenceStrength:z.number().min(0).max(1).default(0.25),
  evidence:lines,
  take:lines,
  doNotCopy:lines,
  systems:studioReferenceSystemsSchema,
}).strict();

export type StudioReference=z.infer<typeof studioReferenceSchema>;
export type StudioReferenceSystems=z.infer<typeof studioReferenceSystemsSchema>;

export function parseStudioReferences(input:unknown):StudioReference[] {
  return z.array(studioReferenceSchema).max(20).parse(input ?? []);
}

export function studioReferenceHasDirection(reference:StudioReference) {
  return reference.take.length>0
    || reference.evidence.length>0
    || Object.values(reference.systems).some((value)=>value.trim().length>0);
}

export function activeStudioReferences(references:StudioReference[]) {
  return references.filter((reference)=>reference.enabled && studioReferenceHasDirection(reference));
}

export function studioReferencesToDirectorReferences(references:StudioReference[]) {
  return activeStudioReferences(references).map((reference)=>({
    label:clip(reference.label+" · "+host(reference.url),180),
    lesson:clip(referenceLesson(reference),600),
  }));
}

export function studioReferencesToBlueprintReferences(references:StudioReference[]) {
  return activeStudioReferences(references).map((reference)=>({
    label:clip(reference.label+" · "+host(reference.url),180),
    lesson:clip(referenceLesson(reference),600),
    doNotCopy:clip(reference.doNotCopy.join("; ") || "Do not copy branding, exact composition, proprietary assets, copy, or a signature interaction verbatim.",600),
  }));
}

export function studioReferenceFromUrl(urlValue:string,labelValue=""):StudioReference {
  const url=new URL(urlValue);
  if(!/^https?:$/.test(url.protocol)) throw new Error("Reference URL must use HTTP(S).");
  const label=labelValue.trim() || url.hostname.replace(/^www\./,"");
  return studioReferenceSchema.parse({
    id:slug(label),
    label,
    url:url.toString(),
    enabled:true,
    reviewedAt:"",
    evidenceStrength:0,
    evidence:[],
    take:[],
    doNotCopy:[],
    systems:{},
  });
}

export function studioReferenceFromCorpus(input:{
  id:string;
  title:string;
  source:string;
  reviewedAt:string;
  evidenceStrength:number;
  observedTraits:string[];
  transferableLessons:string[];
  doNotCopy:string[];
  constructionPatternIds?:string[];
}):StudioReference {
  return studioReferenceSchema.parse({
    id:slug(input.id || input.title),
    label:input.title,
    url:input.source,
    enabled:true,
    reviewedAt:input.reviewedAt,
    evidenceStrength:input.evidenceStrength,
    evidence:input.observedTraits.slice(0,32),
    take:input.transferableLessons.slice(0,32),
    doNotCopy:input.doNotCopy.slice(0,32),
    systems:{
      composition:joinMatching(input.transferableLessons,/composition|layout|hierarchy|negative space|frame/i),
      typography:joinMatching(input.transferableLessons,/type|typograph|copy/i),
      motion:joinMatching(input.transferableLessons,/motion|scroll|pace|timing|camera/i),
      interaction:joinMatching(input.transferableLessons,/interact|pointer|touch|drag|navigation|input/i),
      threeD:joinMatching(input.transferableLessons,/3d|webgl|spatial|depth|geometry|material|shader|world/i),
      transitions:joinMatching(input.transferableLessons,/transition|continuity|chapter|carry/i),
      mobile:joinMatching(input.transferableLessons,/mobile|device|responsive|touch/i),
      performance:joinMatching(input.transferableLessons,/performance|load|asset|compression|fps|gpu|weight/i),
    },
  });
}

export function importStudioReferenceAnalysis(input:unknown):StudioReference {
  if(!input || typeof input!=="object") throw new Error("Reference analysis must be a JSON object.");
  const root=input as Record<string,unknown>;
  const ref=object(root.reference,"reference");
  const facts=object(root.observedFacts,"observedFacts");
  const implementation=root.implementationMap && typeof root.implementationMap==="object" ? root.implementationMap as Record<string,unknown> : {};
  const transferable=Array.isArray(root.transferableLessons) ? root.transferableLessons : [];
  const lessons=transferable.map((entry)=>{
    if(!entry || typeof entry!=="object") return "";
    return string((entry as Record<string,unknown>).lesson);
  }).filter(Boolean);
  const systems=transferable.flatMap((entry)=>{
    if(!entry || typeof entry!=="object") return [];
    const values=(entry as Record<string,unknown>).forgeSystems;
    return Array.isArray(values) ? values.map(string).filter(Boolean) : [];
  });
  const evidence=Object.entries(facts).flatMap(([key,value])=>
    Array.isArray(value) ? value.map((item)=>string(item)).filter(Boolean).map((item)=>`${humanize(key)}: ${item}`) : []
  );
  const url=string(ref.url);
  const name=string(ref.name) || host(url);
  const confidence=typeof root.confidence==="number" ? root.confidence : 0.75;
  const existingSystems=Array.isArray(implementation.existingForgeSystems)
    ? implementation.existingForgeSystems.map(string).filter(Boolean)
    : [];
  return studioReferenceSchema.parse({
    id:slug(name),
    label:name,
    url,
    enabled:true,
    reviewedAt:string(ref.reviewedAt),
    evidenceStrength:Math.max(0,Math.min(1,confidence)),
    evidence:evidence.slice(0,32),
    take:lessons.slice(0,32),
    doNotCopy:Array.isArray(root.doNotCopy) ? root.doNotCopy.map(string).filter(Boolean).slice(0,32) : [],
    systems:{
      composition:joinFact(facts.composition),
      typography:joinFact(facts.typography),
      motion:joinFact(facts.scrollChoreography),
      interaction:joinFact(facts.pointerTouchBehavior),
      threeD:clip([joinFact(facts.depth),joinFact(facts.domWebglResponsibilities),joinFact(facts.persistentAnchors),systems.filter((item)=>/3d|webgl|scene|camera|spatial/i.test(item)).join("; ")].filter(Boolean).join(" "),900),
      transitions:joinFact(facts.transitionMechanics),
      mobile:joinFact(facts.mobileTranslation),
      performance:clip([joinFact(facts.performanceRisks),existingSystems.filter((item)=>/asset|performance|preload|render/i.test(item)).join("; ")].filter(Boolean).join(" "),900),
    },
  });
}

export function referenceDirectionSummary(reference:StudioReference) {
  const systemCount=Object.values(reference.systems).filter((value)=>value.trim()).length;
  return {
    ready:studioReferenceHasDirection(reference),
    evidence:reference.evidence.length,
    transfers:reference.take.length,
    systems:systemCount,
  };
}

function referenceLesson(reference:StudioReference) {
  const systemDirections=Object.entries(reference.systems)
    .filter(([,value])=>value.trim())
    .map(([key,value])=>`${humanize(key)}: ${value.trim()}`);
  const take=reference.take.length ? "Transfer: "+reference.take.join("; ") : "";
  const evidence=reference.evidence.length ? "Observed: "+reference.evidence.slice(0,6).join("; ") : "";
  return [take,...systemDirections,evidence].filter(Boolean).join(" ");
}

function joinMatching(values:string[],pattern:RegExp) {
  return clip(values.filter((value)=>pattern.test(value)).join(" "),900);
}
function joinFact(value:unknown) {
  return clip(Array.isArray(value) ? value.map(string).filter(Boolean).join(" ") : "",900);
}
function object(value:unknown,label:string) {
  if(!value || typeof value!=="object" || Array.isArray(value)) throw new Error(label+" must be an object.");
  return value as Record<string,unknown>;
}
function string(value:unknown) { return typeof value==="string" ? value.trim() : ""; }
function host(value:string) {
  try { return new URL(value).hostname.replace(/^www\./,""); } catch { return value; }
}
function slug(value:string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,72) || "reference";
}
function humanize(value:string) {
  return value.replace(/([A-Z])/g," $1").replace(/^./,(letter)=>letter.toUpperCase()).trim();
}
function clip(value:string,max:number) {
  const normalized=value.trim();
  return normalized.length<=max ? normalized : normalized.slice(0,max-1).trimEnd()+"…";
}

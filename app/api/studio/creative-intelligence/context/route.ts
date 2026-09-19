import fs from "node:fs/promises";
import path from "node:path";
import { requireStudioRole, studioAccessErrorResponse } from "@/src/platform/studioAccess";
import { createTasteProfile } from "@/src/platform/director-intelligence/taste";
import type { CreativeMemoryGraph, MemoryEdge, MemoryNode, TasteProfile } from "@/src/platform/director-intelligence/types";
import type { CreativeTasteLayers } from "@/src/platform/director-intelligence/creativeTaste";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const TASTE_ROOT=path.join(process.cwd(),"forge-intelligence","taste");
const MEMORY_ROOT=path.join(process.cwd(),"forge-intelligence","projects");

export async function GET(request:Request) {
  try {
    const identity=await requireStudioRole(request,"reviewer");
    const url=new URL(request.url);
    const projectName=(url.searchParams.get("project") ?? "").trim();
    if(!projectName || projectName.length>160) return Response.json({ok:false,error:"A valid project name is required."},{status:400});
    const projectId=slug(projectName);

    const [studio,operator,project,memoryGraphs]=await Promise.all([
      readStudioTaste(),
      readOperatorTaste(identity.id),
      readProjectTaste(projectId),
      readMemoryDirectory(projectId),
    ]);
    const tasteLayers:CreativeTasteLayers={
      ...(studio ? {studio}:{}),
      ...(operator ? {operator}:{}),
      ...(project ? {project}:{}),
    };
    const memory=mergeMemory(memoryGraphs);
    const response=Response.json({
      ok:true,
      identity:{id:identity.id,role:identity.role},
      tasteLayers,
      memory,
      counts:{
        priorProjects:new Set(memory.nodes.map((node)=>node.projectId).filter(Boolean)).size,
        memoryNodes:memory.nodes.length,
        tasteLayers:Object.keys(tasteLayers).length,
      },
    });
    response.headers.set("cache-control","no-store");
    return response;
  } catch(error) {
    const access=studioAccessErrorResponse(error);
    if(access) return access;
    return Response.json({ok:false,error:error instanceof Error ? error.message : "Could not load Creative Intelligence context."},{status:500});
  }
}

async function readStudioTaste():Promise<TasteProfile|undefined> {
  return readTasteFile(path.join(TASTE_ROOT,"profile.json"));
}

async function readOperatorTaste(operatorId:string):Promise<TasteProfile|undefined> {
  return readTasteFile(path.join(TASTE_ROOT,"operators",`${slug(operatorId)}.json`));
}

async function readProjectTaste(projectId:string):Promise<TasteProfile|undefined> {
  return readTasteFile(path.join(TASTE_ROOT,"projects",`${slug(projectId)}.json`));
}

async function readTasteFile(file:string):Promise<TasteProfile|undefined> {
  try {
    const value=JSON.parse(await fs.readFile(file,"utf8"));
    return normalizeTaste(value);
  } catch(error) {
    if(isMissing(error)) return undefined;
    throw error;
  }
}

async function readMemoryDirectory(currentProjectId:string) {
  try {
    const entries=await fs.readdir(MEMORY_ROOT,{withFileTypes:true});
    const graphs:CreativeMemoryGraph[]=[];
    for(const entry of entries.filter((item)=>item.isFile() && item.name.endsWith(".memory.json")).sort((a,b)=>a.name.localeCompare(b.name))) {
      const value=JSON.parse(await fs.readFile(path.join(MEMORY_ROOT,entry.name),"utf8"));
      const graph=normalizeMemory(value,currentProjectId);
      if(graph.nodes.length) graphs.push(graph);
    }
    return graphs;
  } catch(error) {
    if(isMissing(error)) return [];
    throw error;
  }
}

function normalizeTaste(value:unknown):TasteProfile|undefined {
  if(!value || typeof value!=="object") return undefined;
  const source=value as Partial<TasteProfile>;
  const base=createTasteProfile();
  if(source.version!==1 || !source.dimensions || typeof source.confidence!=="number" || !Array.isArray(source.preferences)) return undefined;
  const dimensions={...base.dimensions};
  for(const key of Object.keys(dimensions) as Array<keyof typeof dimensions>) {
    const raw=source.dimensions[key];
    if(typeof raw!=="number" || !Number.isFinite(raw) || raw < -1 || raw > 1) return undefined;
    dimensions[key]=raw;
  }
  return {
    version:1,
    dimensions,
    preferences:source.preferences.filter((item)=>Boolean(item && typeof item.id==="string" && Array.isArray(item.reasons))).slice(-200),
    confidence:Math.max(0,Math.min(1,source.confidence)),
    antiCollapsePenalty:typeof source.antiCollapsePenalty==="number" ? Math.max(0,Math.min(1,source.antiCollapsePenalty)) : 0,
  };
}

function normalizeMemory(value:unknown,currentProjectId:string):CreativeMemoryGraph {
  if(!value || typeof value!=="object") return {version:1,nodes:[],edges:[]};
  const source=value as {nodes?:unknown;edges?:unknown};
  const nodes=(Array.isArray(source.nodes) ? source.nodes : [])
    .filter(isMemoryNode)
    .filter((node)=>node.projectId!==currentProjectId)
    .slice(0,5000);
  const ids=new Set(nodes.map((node)=>node.id));
  const edges=(Array.isArray(source.edges) ? source.edges : [])
    .filter(isMemoryEdge)
    .filter((edge)=>ids.has(edge.from) && ids.has(edge.to))
    .slice(0,10000);
  return {version:1,nodes,edges};
}

function mergeMemory(graphs:CreativeMemoryGraph[]):CreativeMemoryGraph {
  const nodes:MemoryNode[]=[]; const edges:MemoryEdge[]=[];
  for(const graph of graphs) {
    for(const node of graph.nodes) if(!nodes.some((item)=>item.id===node.id)) nodes.push(node);
  }
  const ids=new Set(nodes.map((node)=>node.id));
  for(const graph of graphs) {
    for(const edge of graph.edges) if(ids.has(edge.from)&&ids.has(edge.to)&&!edges.some((item)=>item.from===edge.from&&item.to===edge.to&&item.relation===edge.relation)) edges.push(edge);
  }
  return {version:1,nodes,edges};
}

function isMemoryNode(value:unknown):value is MemoryNode {
  if(!value || typeof value!=="object") return false;
  const item=value as Partial<MemoryNode>;
  return typeof item.id==="string" && typeof item.type==="string" && typeof item.label==="string" && typeof item.text==="string" && Array.isArray(item.tags) && item.tags.every((tag)=>typeof tag==="string") && (item.projectId===undefined || typeof item.projectId==="string");
}
function isMemoryEdge(value:unknown):value is MemoryEdge {
  if(!value || typeof value!=="object") return false;
  const item=value as Partial<MemoryEdge>;
  return typeof item.from==="string" && typeof item.to==="string" && typeof item.relation==="string" && typeof item.weight==="number" && Number.isFinite(item.weight);
}
function slug(value:string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80) || "project";
}
function isMissing(error:unknown) {
  return Boolean(error && typeof error==="object" && "code" in error && (error as {code?:unknown}).code==="ENOENT");
}

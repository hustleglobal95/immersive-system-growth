import fs from "node:fs/promises";
import path from "node:path";

export async function loadCreativeContext(projectName,root=process.cwd()) {
  const currentProjectId=slug(projectName);
  const directory=path.join(root,"forge-intelligence","projects");
  const entries=await readEntries(directory);
  const memoryGraphs=[];
  const portfolio=[];

  for(const entry of entries) {
    if(!entry.isFile()) continue;
    const file=path.join(directory,entry.name);
    if(entry.name.endsWith(".memory.json")) {
      const graph=JSON.parse(await fs.readFile(file,"utf8"));
      if(graph?.version!==1) continue;
      memoryGraphs.push({
        version:1,
        nodes:(graph.nodes ?? []).filter((node)=>node?.projectId!==currentProjectId),
        edges:graph.edges ?? [],
      });
      continue;
    }
    if(entry.name.endsWith(".fingerprint.json")) {
      const value=JSON.parse(await fs.readFile(file,"utf8"));
      for(const candidate of Array.isArray(value) ? value : [value]) {
        if(candidate?.projectId && candidate.projectId!==currentProjectId) portfolio.push(candidate);
      }
    }
  }

  return {
    memory:mergeMemoryGraphs(memoryGraphs),
    portfolio,
    loaded:true,
  };
}

async function readEntries(directory) {
  try {
    return await fs.readdir(directory,{withFileTypes:true});
  } catch(error) {
    if(error?.code==="ENOENT") return [];
    throw error;
  }
}

function mergeMemoryGraphs(graphs) {
  const nodes=[];
  const edges=[];
  for(const graph of graphs) {
    for(const node of graph?.nodes ?? []) if(!nodes.some((item)=>item.id===node.id)) nodes.push(node);
  }
  const ids=new Set(nodes.map((node)=>node.id));
  for(const graph of graphs) {
    for(const edge of graph?.edges ?? []) {
      if(ids.has(edge.from) && ids.has(edge.to) && !edges.some((item)=>item.from===edge.from && item.to===edge.to && item.relation===edge.relation)) edges.push(edge);
    }
  }
  return {version:1,nodes,edges};
}

function slug(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"") || "project";
}

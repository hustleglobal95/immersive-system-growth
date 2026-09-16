import type { DirectorBrief, DirectorTreatment } from "@/src/platform/directorSchema";
import type { CreativeMemoryGraph, MemoryEdge, MemoryNode } from "@/src/platform/director-intelligence/types";

function node(id: string, type: MemoryNode["type"], label: string, text: string, tags: string[], projectId?: string, confidence = 1): MemoryNode {
  return { id, type, label, text, tags, projectId, confidence };
}

function edge(from: string, to: string, relation: string, weight = 1, reason?: string): MemoryEdge {
  return { from, to, relation, weight, reason };
}

export function createEmptyMemoryGraph(): CreativeMemoryGraph {
  return { version: 1, nodes: [], edges: [] };
}

export function ingestProjectMemory(graph: CreativeMemoryGraph, projectId: string, brief: DirectorBrief, treatment: DirectorTreatment): CreativeMemoryGraph {
  const nodes = [...graph.nodes];
  const edges = [...graph.edges];
  const add = (value: MemoryNode) => { if (!nodes.some((existing) => existing.id === value.id)) nodes.push(value); };
  const link = (value: MemoryEdge) => { if (!edges.some((existing) => existing.from === value.from && existing.to === value.to && existing.relation === value.relation)) edges.push(value); };

  const projectNode = `${projectId}:project`;
  add(node(projectNode, "Project", treatment.projectName, treatment.thesis, [brief.projectType, brief.tier], projectId));
  add(node(`${projectId}:objective`, "BusinessObjective", "Objective", brief.objective, [brief.projectType], projectId));
  add(node(`${projectId}:brand-truth`, "BrandTruth", "Brand truth", brief.brandTruth, [brief.projectType], projectId));
  add(node(`${projectId}:concept`, "Concept", "Locked thesis", treatment.thesis, [brief.projectType, treatment.selectedTerritoryId], projectId));
  add(node(`${projectId}:signature`, "SignatureMoment", treatment.signatureMoment.name, treatment.signatureMoment.description, [brief.projectType, "signature"], projectId));
  add(node(`${projectId}:camera`, "CameraGrammar", "Camera grammar", treatment.grammar.camera.join(" | "), [brief.projectType], projectId));
  add(node(`${projectId}:motion`, "MotionGrammar", "Motion grammar", treatment.grammar.motion.join(" | "), [brief.projectType], projectId));
  add(node(`${projectId}:type`, "TypographyGrammar", "Typography grammar", treatment.grammar.typography.join(" | "), [brief.projectType], projectId));
  add(node(`${projectId}:interaction`, "InteractionGrammar", "Interaction grammar", treatment.grammar.interaction.join(" | "), [brief.projectType], projectId));
  treatment.noGoRules.forEach((rule, index) => add(node(`${projectId}:anti:${index + 1}`, "FailurePattern", `Rejected pattern ${index + 1}`, rule, [brief.projectType, "anti-pattern"], projectId)));

  link(edge(projectNode, `${projectId}:objective`, "HAS_OBJECTIVE"));
  link(edge(projectNode, `${projectId}:brand-truth`, "HAS_BRAND_TRUTH"));
  link(edge(projectNode, `${projectId}:concept`, "USED_CONCEPT"));
  link(edge(`${projectId}:concept`, `${projectId}:signature`, "EXPRESSED_BY"));
  link(edge(`${projectId}:concept`, `${projectId}:camera`, "EXPRESSED_BY", 0.8));
  link(edge(`${projectId}:concept`, `${projectId}:motion`, "EXPRESSED_BY", 0.8));
  link(edge(`${projectId}:concept`, `${projectId}:type`, "EXPRESSED_BY", 0.6));
  link(edge(`${projectId}:concept`, `${projectId}:interaction`, "EXPRESSED_BY", 0.7));
  treatment.noGoRules.forEach((_, index) => link(edge(projectNode, `${projectId}:anti:${index + 1}`, "REJECTED_PATTERN", 0.8)));

  return { version: 1, nodes, edges };
}

function tokenize(text: string) {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((token) => token.length > 2));
}

function overlap(query: Set<string>, text: string) {
  const tokens = tokenize(text);
  if (!query.size || !tokens.size) return 0;
  let matches = 0;
  for (const token of query) if (tokens.has(token)) matches++;
  return matches / Math.max(1, Math.min(query.size, tokens.size));
}

export function queryCreativeMemory(graph: CreativeMemoryGraph, query: string, limit = 8, types?: MemoryNode["type"][]) {
  const terms = tokenize(query);
  return graph.nodes
    .filter((item) => !types || types.includes(item.type))
    .map((item) => ({ node: item, score: overlap(terms, `${item.label} ${item.text} ${item.tags.join(" ")}`) * (item.confidence ?? 1) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function addLesson(graph: CreativeMemoryGraph, projectId: string, lesson: string, confidence = 0.5): CreativeMemoryGraph {
  const id = `${projectId}:lesson:${graph.nodes.filter((item) => item.projectId === projectId && item.type === "Lesson").length + 1}`;
  const lessonNode = node(id, "Lesson", "Production lesson", lesson, ["lesson"], projectId, confidence);
  return { version: 1, nodes: [...graph.nodes, lessonNode], edges: [...graph.edges, edge(`${projectId}:project`, id, "PRODUCED_LESSON", confidence)] };
}

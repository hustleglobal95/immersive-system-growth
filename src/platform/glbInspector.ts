export interface GlbNodeReport {
  index: number;
  name: string;
  path: string;
  parent: number | null;
  mesh: number | null;
  skin: number | null;
  children: number[];
}

export interface GlbMeshReport {
  index: number;
  name: string;
  primitives: number;
  materials: number[];
  vertices: number;
  triangles: number;
  morphTargets: number;
}

export interface GlbAnimationReport {
  index: number;
  name: string;
  channels: number;
  targetNodes: number[];
}

export interface GlbInspection {
  version: number;
  bytes: number;
  scenes: number;
  nodes: GlbNodeReport[];
  meshes: GlbMeshReport[];
  materials: Array<{ index: number; name: string }>;
  animations: GlbAnimationReport[];
  textures: number;
  images: number;
  skins: number;
  totals: {
    vertices: number;
    triangles: number;
    primitives: number;
    morphTargets: number;
  };
  complexity: "light" | "moderate" | "heavy";
  suggestedRigNodes: string[];
  suggestedMappings: Array<{
    id: string;
    node: string;
    path: string;
    role: "primary" | "component" | "accent" | "animated";
    confidence: number;
  }>;
  recommendations: string[];
  warnings: string[];
}

interface GltfJson {
  asset?: { version?: string };
  scenes?: unknown[];
  nodes?: Array<{ name?: string; mesh?: number; skin?: number; children?: number[] }>;
  meshes?: Array<{
    name?: string;
    primitives?: Array<{
      material?: number;
      indices?: number;
      mode?: number;
      attributes?: { POSITION?: number };
      targets?: unknown[];
    }>;
  }>;
  accessors?: Array<{ count?: number; min?: number[]; max?: number[] }>;
  materials?: Array<{ name?: string }>;
  textures?: unknown[];
  images?: unknown[];
  skins?: unknown[];
  animations?: Array<{
    name?: string;
    channels?: Array<{ target?: { node?: number } }>;
  }>;
}

function hashPath(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function stableNodeId(path: string): string {
  const normalized = path.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `node-${(normalized || "unnamed").slice(0, 80)}-${hashPath(path)}`;
}
const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;

export function inspectGlb(input: ArrayBuffer): GlbInspection {
  if (input.byteLength < 20) throw new Error("GLB is too small to contain a valid header");
  const view = new DataView(input);
  if (view.getUint32(0, true) !== GLB_MAGIC) throw new Error("File is not a binary glTF (GLB)");
  const version = view.getUint32(4, true);
  if (version !== 2) throw new Error(`Unsupported GLB version ${version}`);
  const declaredBytes = view.getUint32(8, true);
  if (declaredBytes !== input.byteLength) throw new Error("GLB declared length does not match the file size");

  let offset = 12;
  let document: GltfJson | null = null;
  while (offset + 8 <= input.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    const end = start + length;
    if (end > input.byteLength) throw new Error("GLB chunk extends beyond the file boundary");
    if (type === JSON_CHUNK && !document) {
      const text = new TextDecoder().decode(new Uint8Array(input, start, length)).replace(/[\u0000\s]+$/g, "");
      document = JSON.parse(text) as GltfJson;
    }
    offset = end;
  }
  if (!document) throw new Error("GLB does not contain a JSON chunk");

  const rawNodes = document.nodes ?? [];
  const parents = new Map<number, number>();
  rawNodes.forEach((node, parent) => node.children?.forEach((child) => {
    if (Number.isInteger(child) && !parents.has(child)) parents.set(child, parent);
  }));
  const nodeName = (index: number) => rawNodes[index]?.name?.trim() || `node-${index}`;
  const nodePath = (index: number) => {
    const parts = [nodeName(index)];
    const visited = new Set([index]);
    let parent = parents.get(index);
    while (parent !== undefined && !visited.has(parent)) {
      visited.add(parent);
      parts.unshift(nodeName(parent));
      parent = parents.get(parent);
    }
    return parts.join("/");
  };
  const nodes = rawNodes.map((node, index) => ({
    index,
    name: nodeName(index),
    path: nodePath(index),
    parent: parents.get(index) ?? null,
    mesh: Number.isInteger(node.mesh) ? node.mesh! : null,
    skin: Number.isInteger(node.skin) ? node.skin! : null,
    children: (node.children ?? []).filter(Number.isInteger),
  }));
  const accessorCount = (index: number | undefined) => Number.isInteger(index) ? Math.max(0, document.accessors?.[index!]?.count ?? 0) : 0;
  const primitiveTriangles = (primitive: NonNullable<NonNullable<GltfJson["meshes"]>[number]["primitives"]>[number]) => {
    const count = accessorCount(primitive.indices) || accessorCount(primitive.attributes?.POSITION);
    const mode = primitive.mode ?? 4;
    if (mode === 4) return Math.floor(count / 3);
    if (mode === 5 || mode === 6) return Math.max(0, count - 2);
    return 0;
  };
  const meshes = (document.meshes ?? []).map((mesh, index) => {
    const primitives = mesh.primitives ?? [];
    return {
      index,
      name: mesh.name?.trim() || `mesh-${index}`,
      primitives: primitives.length,
      materials: [...new Set(primitives.flatMap((primitive) =>
        Number.isInteger(primitive.material) ? [primitive.material!] : [],
      ))],
      vertices: primitives.reduce((total, primitive) => total + accessorCount(primitive.attributes?.POSITION), 0),
      triangles: primitives.reduce((total, primitive) => total + primitiveTriangles(primitive), 0),
      morphTargets: primitives.reduce((total, primitive) => total + (primitive.targets?.length ?? 0), 0),
    };
  });
  const materials = (document.materials ?? []).map((material, index) => ({
    index,
    name: material.name?.trim() || `material-${index}`,
  }));
  const animations = (document.animations ?? []).map((animation, index) => ({
    index,
    name: animation.name?.trim() || `animation-${index}`,
    channels: animation.channels?.length ?? 0,
    targetNodes: [...new Set((animation.channels ?? []).flatMap((channel) =>
      Number.isInteger(channel.target?.node) ? [channel.target!.node!] : [],
    ))],
  }));
  const names = new Set<string>();
  const warnings: string[] = [];
  for (const node of nodes) {
    if (names.has(node.name)) warnings.push(`Duplicate node name: ${node.name}`);
    names.add(node.name);
    if (node.mesh !== null && !meshes[node.mesh]) warnings.push(`Node ${node.name} references missing mesh ${node.mesh}`);
  }
  const suggestedRigNodes = [...new Set(nodes
    .filter((node) => node.mesh !== null)
    .map((node) => node.name)
    .filter((name) => !/^node-\d+$/.test(name)))];
  if (!suggestedRigNodes.length) warnings.push("No named mesh nodes are available for product rig mapping");
  const animatedNodes = new Set(animations.flatMap((animation) => animation.targetNodes));
  const suggestedMappings = nodes
    .filter((node) => node.mesh !== null && !/^node-\d+$/.test(node.name))
    .map((node) => {
      const name = node.name.toLowerCase();
      const animated = animatedNodes.has(node.index);
      const primary = /(^|[-_. ])(hero|product|body|root|main|shell|base)([-_. ]|$)/.test(name);
      const accent = /(^|[-_. ])(accent|logo|badge|light|screen|glass|trim)([-_. ]|$)/.test(name);
      const role = animated ? "animated" : primary ? "primary" : accent ? "accent" : "component";
      const confidence = animated || primary ? 0.98 : accent ? 0.9 : suggestedRigNodes.length <= 24 ? 0.82 : 0.68;
      return { id: stableNodeId(node.path), node: node.name, path: node.path, role, confidence } as const;
    });
  const totals = {
    vertices: meshes.reduce((sum, mesh) => sum + mesh.vertices, 0),
    triangles: meshes.reduce((sum, mesh) => sum + mesh.triangles, 0),
    primitives: meshes.reduce((sum, mesh) => sum + mesh.primitives, 0),
    morphTargets: meshes.reduce((sum, mesh) => sum + mesh.morphTargets, 0),
  };
  const complexity = totals.triangles > 250000 || input.byteLength > 20 * 1024 * 1024
    ? "heavy"
    : totals.triangles > 90000 || input.byteLength > 8 * 1024 * 1024
      ? "moderate"
      : "light";
  const recommendations: string[] = [];
  if (totals.triangles > 150000) recommendations.push("Create a lower-detail GLB variant below 100,000 triangles for mobile delivery.");
  if ((document.materials?.length ?? 0) > 16) recommendations.push("Consolidate compatible materials to reduce shader changes and draw calls.");
  if ((document.textures?.length ?? 0) > 12) recommendations.push("Use KTX2 texture compression and verify a 2K mobile texture ceiling.");
  if (input.byteLength > 8 * 1024 * 1024) recommendations.push("Apply mesh and texture compression before production deployment.");
  if (nodes.some((node) => node.mesh !== null && /^node-\d+$/.test(node.name))) recommendations.push("Name every animatable mesh node before creating timeline tracks.");
  if (!recommendations.length) recommendations.push("Model is within Forge reference budgets. Validate it on physical mobile hardware before release.");

  return {
    version,
    bytes: input.byteLength,
    scenes: document.scenes?.length ?? 0,
    nodes,
    meshes,
    materials,
    animations,
    textures: document.textures?.length ?? 0,
    images: document.images?.length ?? 0,
    skins: document.skins?.length ?? 0,
    totals,
    complexity,
    suggestedRigNodes,
    suggestedMappings,
    recommendations,
    warnings,
  };
}

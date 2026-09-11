export interface GlbNodeReport {
  index: number;
  name: string;
  mesh: number | null;
  children: number[];
}

export interface GlbMeshReport {
  index: number;
  name: string;
  primitives: number;
  materials: number[];
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
  suggestedRigNodes: string[];
  warnings: string[];
}

interface GltfJson {
  asset?: { version?: string };
  scenes?: unknown[];
  nodes?: Array<{ name?: string; mesh?: number; children?: number[] }>;
  meshes?: Array<{
    name?: string;
    primitives?: Array<{ material?: number }>;
  }>;
  materials?: Array<{ name?: string }>;
  animations?: Array<{
    name?: string;
    channels?: Array<{ target?: { node?: number } }>;
  }>;
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

  const nodes = (document.nodes ?? []).map((node, index) => ({
    index,
    name: node.name?.trim() || `node-${index}`,
    mesh: Number.isInteger(node.mesh) ? node.mesh! : null,
    children: (node.children ?? []).filter(Number.isInteger),
  }));
  const meshes = (document.meshes ?? []).map((mesh, index) => ({
    index,
    name: mesh.name?.trim() || `mesh-${index}`,
    primitives: mesh.primitives?.length ?? 0,
    materials: [...new Set((mesh.primitives ?? []).flatMap((primitive) =>
      Number.isInteger(primitive.material) ? [primitive.material!] : [],
    ))],
  }));
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
  const suggestedRigNodes = nodes
    .filter((node) => node.mesh !== null)
    .map((node) => node.name)
    .filter((name) => !/^node-\d+$/.test(name));
  if (!suggestedRigNodes.length) warnings.push("No named mesh nodes are available for product rig mapping");

  return {
    version,
    bytes: input.byteLength,
    scenes: document.scenes?.length ?? 0,
    nodes,
    meshes,
    materials,
    animations,
    suggestedRigNodes,
    warnings,
  };
}

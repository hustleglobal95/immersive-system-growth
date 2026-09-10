import { useGLTF } from "@react-three/drei";
import { Material, Texture, type Object3D, type BufferGeometry } from "three";
interface Resource {
  count: number;
  scene: Object3D;
  timer?: ReturnType<typeof setTimeout>;
}
const resources = new Map<string, Resource>();
export function retainModel(url: string, scene: Object3D) {
  const entry = resources.get(url) ?? { count: 0, scene };
  clearTimeout(entry.timer);
  entry.count++;
  resources.set(url, entry);
  return () => {
    entry.count--;
    entry.timer = setTimeout(() => {
      if (entry.count) return;
      const geometries = new Set<BufferGeometry>(),
        materials = new Set<Material>(),
        textures = new Set<Texture>();
      entry.scene.traverse((o) => {
        const mesh = o as Object3D & {
          geometry?: BufferGeometry;
          material?: Material | Material[];
        };
        if (mesh.geometry) geometries.add(mesh.geometry);
        for (const m of mesh.material
          ? Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]
          : []) {
          materials.add(m);
          for (const value of Object.values(m))
            if (value instanceof Texture) textures.add(value);
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => {
        t.dispose();
        const image = t.source?.data as { close?: () => void } | undefined;
        if (image && typeof image.close === "function") image.close();
      });
      useGLTF.clear(url);
      resources.delete(url);
    }, 500);
  };
}

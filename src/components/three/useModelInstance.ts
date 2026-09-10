"use client";
import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { KTX2Loader, type GLTFLoader } from "three-stdlib";
import { useThree } from "@react-three/fiber";
import { retainModel } from "@/src/lib/modelResources";
export function useModelInstance(url: string) {
  const gl = useThree((s) => s.gl);
  const extend = useMemo(() => {
    let ktx: KTX2Loader | undefined;
    const fn = (loader: GLTFLoader) => {
      ktx = new KTX2Loader()
        .setTranscoderPath("/decoders/basis/")
        .detectSupport(gl);
      loader.setKTX2Loader(ktx);
    };
    return { fn, dispose: () => ktx?.dispose() };
  }, [gl]);
  const gltf = useGLTF(url, "/decoders/draco/", true, extend.fn);
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene]);
  useEffect(() => {
    const release = retainModel(url, gltf.scene);
    return () => {
      scene.traverse((o) => {
        const s = o as typeof o & { skeleton?: { dispose: () => void } };
        s.skeleton?.dispose();
      });
      release();
      extend.dispose();
    };
  }, [url, gltf.scene, scene, extend]);
  return { ...gltf, scene };
}

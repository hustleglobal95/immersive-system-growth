"use client";
import { Component, Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls, useGLTF } from "@react-three/drei";

function Model({ url }: { url: string }) {
  const gltf = useGLTF(url, "/decoders/draco/");
  return <primitive object={gltf.scene.clone(true)} />;
}
class PreviewError extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p role="alert">3D preview unavailable. Check the asset path and WebGL support.</p> : this.props.children; }
}
export function AssetBankPreview({ url }: { url: string }) {
  return <div style={{ height: 260 }} aria-label="Model inspection preview"><PreviewError><Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [4, 3, 5] }} fallback={<p>WebGL unavailable.</p>}><ambientLight intensity={1.5} /><directionalLight position={[3, 5, 4]} intensity={3} /><Suspense fallback={null}><Bounds fit clip observe margin={1.2}><Model url={url} /></Bounds></Suspense><OrbitControls makeDefault /></Canvas></PreviewError></div>;
}

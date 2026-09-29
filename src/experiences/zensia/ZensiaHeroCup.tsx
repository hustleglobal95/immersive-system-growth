"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function SteamWisp({ offset, drift, scale = 1 }: { offset: [number, number, number]; drift: number; scale?: number }) {
  const ref = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.12, 0.34, 0.03),
      new THREE.Vector3(-0.11, 0.74, -0.03),
      new THREE.Vector3(0.15, 1.13, 0),
      new THREE.Vector3(-0.03, 1.55, 0.02),
    ]);
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.48 + drift;
    if (ref.current) {
      ref.current.position.x = offset[0] + Math.sin(t * 1.7) * 0.09;
      ref.current.position.y = offset[1] + (Math.sin(t) + 1) * 0.045;
      ref.current.rotation.z = Math.sin(t * 1.25) * 0.09;
      ref.current.scale.setScalar(scale * (0.96 + Math.sin(t * 0.8) * 0.035));
    }
    if (material.current) {
      material.current.opacity = 0.12 + (Math.sin(t * 1.4) + 1) * 0.045;
    }
  });

  return (
    <group ref={ref} position={offset}>
      <mesh>
        <tubeGeometry args={[curve, 44, 0.035, 8, false]} />
        <meshBasicMaterial
          ref={material}
          color="#fff8e7"
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function CoffeeCupScene() {
  const cup = useRef<THREE.Group>(null);
  const coffee = useRef<THREE.Mesh>(null);
  const points = useMemo(
    () => [
      new THREE.Vector2(0.92, -0.86),
      new THREE.Vector2(1.02, -0.8),
      new THREE.Vector2(1.22, 0.58),
      new THREE.Vector2(1.34, 0.78),
      new THREE.Vector2(1.39, 0.86),
    ],
    [],
  );

  useFrame(({ clock, pointer }) => {
    const t = clock.elapsedTime;
    if (cup.current) {
      cup.current.rotation.y = THREE.MathUtils.lerp(cup.current.rotation.y, pointer.x * 0.16 - 0.2, 0.035);
      cup.current.rotation.x = THREE.MathUtils.lerp(cup.current.rotation.x, pointer.y * -0.07 + 0.03, 0.035);
      cup.current.position.y = Math.sin(t * 0.7) * 0.035;
    }
    if (coffee.current) {
      coffee.current.rotation.z = Math.sin(t * 0.9) * 0.012;
    }
  });

  return (
    <>
      <ambientLight intensity={1.5} color="#ead9c1" />
      <directionalLight position={[-4, 6, 5]} intensity={4.8} color="#fff2d7" />
      <directionalLight position={[5, 2, 3]} intensity={3.4} color="#bc713e" />
      <pointLight position={[0, 4, -2]} intensity={5} color="#f1c486" />

      <group ref={cup} rotation={[0.03, -0.2, 0]}>
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <latheGeometry args={[points, 72]} />
          <meshPhysicalMaterial color="#eee2ce" roughness={0.24} metalness={0.02} clearcoat={0.7} clearcoatRoughness={0.22} side={THREE.DoubleSide} />
        </mesh>

        <mesh position={[0, 0.845, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[1.36, 0.065, 20, 88]} />
          <meshPhysicalMaterial color="#f5ead7" roughness={0.18} clearcoat={0.8} clearcoatRoughness={0.18} />
        </mesh>

        <mesh ref={coffee} position={[0, 0.84, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.285, 72]} />
          <meshPhysicalMaterial color="#2c160d" roughness={0.18} metalness={0.02} clearcoat={0.85} clearcoatRoughness={0.12} />
        </mesh>

        <mesh position={[0.17, 0.852, 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.25, 0.36, 56]} />
          <meshBasicMaterial color="#6f3c22" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>

        <mesh position={[1.43, 0.1, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
          <torusGeometry args={[0.66, 0.16, 28, 80, Math.PI * 1.72]} />
          <meshPhysicalMaterial color="#eadcc5" roughness={0.23} clearcoat={0.72} clearcoatRoughness={0.2} />
        </mesh>

        <mesh position={[0, -0.98, 0]} receiveShadow>
          <cylinderGeometry args={[1.92, 1.68, 0.11, 80]} />
          <meshPhysicalMaterial color="#d9c6a9" roughness={0.35} clearcoat={0.44} />
        </mesh>

        <mesh position={[0, -0.91, 0]}>
          <cylinderGeometry args={[1.44, 1.58, 0.08, 72]} />
          <meshPhysicalMaterial color="#eadcc6" roughness={0.28} clearcoat={0.4} />
        </mesh>

        <SteamWisp offset={[-0.42, 1.0, 0.05]} drift={0.2} scale={0.95} />
        <SteamWisp offset={[0.06, 1.05, -0.02]} drift={1.1} scale={1.12} />
        <SteamWisp offset={[0.48, 1.0, 0.08]} drift={2.0} scale={0.83} />
      </group>
    </>
  );
}

export function ZensiaHeroCup() {
  return (
    <div className="zi-cup-canvas" aria-hidden="true">
      <Canvas
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0.2, 1.25, 6.1], fov: 34 }}
      >
        <CoffeeCupScene />
      </Canvas>
    </div>
  );
}

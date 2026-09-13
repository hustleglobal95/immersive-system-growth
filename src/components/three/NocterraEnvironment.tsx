"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BackSide,
  InstancedMesh,
  Object3D,
  ShaderMaterial,
  Vector3,
} from "three";
import { useExperienceStore } from "@/src/store/experienceStore";

const SKY_VERTEX = `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = normalize(world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const SKY_FRAGMENT = `
  uniform float uProgress;
  varying vec3 vWorld;
  void main() {
    float h = clamp(vWorld.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 duskTop = vec3(0.055, 0.075, 0.115);
    vec3 duskHorizon = vec3(0.78, 0.43, 0.24);
    vec3 nightTop = vec3(0.012, 0.018, 0.036);
    vec3 nightHorizon = vec3(0.18, 0.12, 0.11);
    float night = smoothstep(0.55, 1.0, uProgress);
    vec3 topColor = mix(duskTop, nightTop, night);
    vec3 horizonColor = mix(duskHorizon, nightHorizon, night);
    float horizon = pow(1.0 - abs(vWorld.y), 4.0);
    vec3 color = mix(topColor, horizonColor, horizon * 0.88);
    color += vec3(0.10, 0.045, 0.018) * pow(max(0.0, 1.0 - h), 7.0) * (1.0 - night * 0.5);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const WATER_VERTEX = `
  uniform float uTime;
  uniform float uProgress;
  varying float vWave;
  varying vec2 vUv;
  void main() {
    vec3 p = position;
    float a = sin((p.x + uTime * 0.45) * 0.55) * 0.055;
    float b = cos((p.y - uTime * 0.32) * 0.82) * 0.04;
    float c = sin((p.x + p.y) * 0.31 + uTime * 0.22) * 0.03;
    float wave = (a + b + c) * mix(0.7, 1.0, uProgress);
    p.z += wave;
    vWave = wave;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const WATER_FRAGMENT = `
  uniform float uProgress;
  varying float vWave;
  varying vec2 vUv;
  void main() {
    vec3 warm = vec3(0.17, 0.13, 0.11);
    vec3 deep = vec3(0.018, 0.055, 0.075);
    vec3 night = vec3(0.008, 0.026, 0.045);
    float dusk = smoothstep(0.45, 1.0, uProgress);
    vec3 base = mix(mix(warm, deep, vUv.y), night, dusk * 0.72);
    float glint = smoothstep(0.02, 0.075, abs(vWave));
    vec3 highlight = vec3(0.82, 0.61, 0.39) * glint * (1.0 - dusk * 0.45);
    gl_FragColor = vec4(base + highlight * 0.16, 0.98);
  }
`;

function Skyline() {
  const mesh = useRef<InstancedMesh>(null);
  const transforms = useMemo(() => {
    const result: Array<{ position: Vector3; scale: Vector3; rotation: number }> = [];
    for (let i = 0; i < 52; i += 1) {
      const n1 = Math.sin(i * 12.9898) * 43758.5453;
      const n2 = Math.sin((i + 11) * 7.233) * 17331.137;
      const r1 = n1 - Math.floor(n1);
      const r2 = n2 - Math.floor(n2);
      const angle = (i / 52) * Math.PI * 2;
      const radius = 27 + r1 * 5;
      const width = 0.34 + r2 * 0.72;
      const height = 1.2 + r1 * 5.8;
      const depth = 0.36 + (1 - r2) * 0.85;
      result.push({
        position: new Vector3(
          Math.cos(angle) * radius,
          -1.18 + height * 0.5,
          Math.sin(angle) * radius,
        ),
        scale: new Vector3(width, height, depth),
        rotation: -angle + Math.PI * 0.5,
      });
    }
    return result;
  }, []);

  useEffect(() => {
    if (!mesh.current) return;
    const dummy = new Object3D();
    transforms.forEach((item, index) => {
      dummy.position.copy(item.position);
      dummy.scale.copy(item.scale);
      dummy.rotation.set(0, item.rotation, 0);
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [transforms]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, transforms.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#14171c"
        emissive="#6f5337"
        emissiveIntensity={0.16}
        metalness={0.15}
        roughness={0.76}
      />
    </instancedMesh>
  );
}

function Palm({ position, scale = 1, rotation = 0 }: { position: [number, number, number]; scale?: number; rotation?: number }) {
  const leaves = useMemo(() => Array.from({ length: 8 }, (_, index) => index * (Math.PI * 2 / 8)), []);
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 1.55, 0]} rotation={[0.03, 0, -0.08]}>
        <cylinderGeometry args={[0.10, 0.17, 3.1, 8]} />
        <meshStandardMaterial color="#41372d" roughness={0.92} />
      </mesh>
      <group position={[0.08, 3.1, 0]}>
        {leaves.map((angle) => (
          <mesh
            key={angle}
            castShadow
            position={[Math.cos(angle) * 0.72, 0, Math.sin(angle) * 0.72]}
            rotation={[0.18, -angle, Math.sin(angle) * 0.16]}
          >
            <boxGeometry args={[1.65, 0.035, 0.22]} />
            <meshStandardMaterial color="#26382f" roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function PathLights() {
  return (
    <group>
      {Array.from({ length: 10 }, (_, index) => {
        const x = index < 5 ? -4.35 : 4.35;
        const z = -2.8 + (index % 5) * 1.65;
        return (
          <group key={`${x}-${z}`} position={[x, -0.8, z]}>
            <mesh>
              <cylinderGeometry args={[0.035, 0.05, 0.58, 8]} />
              <meshStandardMaterial color="#2c2924" roughness={0.6} metalness={0.45} />
            </mesh>
            <mesh position={[0, 0.31, 0]}>
              <sphereGeometry args={[0.07, 10, 8]} />
              <meshBasicMaterial color="#ffd5a0" toneMapped={false} />
            </mesh>
            <pointLight position={[0, 0.34, 0]} intensity={0.28} distance={2.4} color="#ffcb91" />
          </group>
        );
      })}
    </group>
  );
}

export function NocterraEnvironment() {
  const sky = useRef<ShaderMaterial>(null);
  const ocean = useRef<ShaderMaterial>(null);
  const sun = useRef<Object3D>(null);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);

  useFrame((state) => {
    const progress = useExperienceStore.getState().progress;
    if (sky.current) sky.current.uniforms.uProgress.value = progress;
    if (ocean.current) {
      ocean.current.uniforms.uProgress.value = progress;
      ocean.current.uniforms.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime;
    }
    if (sun.current) {
      const phase = Math.min(1, progress / 0.93);
      sun.current.position.set(15 - phase * 7, 8.5 - phase * 4.3, 24);
      sun.current.scale.setScalar(1 - phase * 0.28);
    }
  });

  return (
    <group>
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[72, 32, 24]} />
        <shaderMaterial
          ref={sky}
          side={BackSide}
          depthWrite={false}
          uniforms={{ uProgress: { value: 0 } }}
          vertexShader={SKY_VERTEX}
          fragmentShader={SKY_FRAGMENT}
        />
      </mesh>

      <group ref={sun} position={[15, 8.5, 24]}>
        <mesh>
          <sphereGeometry args={[1.2, 32, 20]} />
          <meshBasicMaterial color="#ffd6a0" toneMapped={false} />
        </mesh>
        <pointLight intensity={1.1} distance={34} color="#ffbd7f" />
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.24, 7]} receiveShadow>
        <planeGeometry args={[92, 92, 96, 96]} />
        <shaderMaterial
          ref={ocean}
          transparent
          uniforms={{ uTime: { value: 0 }, uProgress: { value: 0 } }}
          vertexShader={WATER_VERTEX}
          fragmentShader={WATER_FRAGMENT}
        />
      </mesh>

      <Skyline />

      <group>
        <mesh receiveShadow position={[0, -1.16, 0.8]}>
          <boxGeometry args={[10.4, 0.18, 10.6]} />
          <meshStandardMaterial color="#b2a28e" roughness={0.82} metalness={0.02} />
        </mesh>
        <mesh receiveShadow position={[0, -1.045, 4.05]}>
          <boxGeometry args={[7.5, 0.08, 2.85]} />
          <meshPhysicalMaterial
            color="#284b55"
            roughness={0.16}
            metalness={0.04}
            clearcoat={0.72}
            clearcoatRoughness={0.14}
          />
        </mesh>
        <mesh receiveShadow position={[0, -0.99, 2.55]}>
          <boxGeometry args={[8.1, 0.11, 0.18]} />
          <meshStandardMaterial color="#d0c2ae" roughness={0.76} />
        </mesh>
        <mesh receiveShadow position={[0, -0.98, 5.54]}>
          <boxGeometry args={[8.1, 0.11, 0.16]} />
          <meshStandardMaterial color="#d0c2ae" roughness={0.76} />
        </mesh>

        {[-3.65, 3.65].map((x) => (
          <group key={x} position={[x, 0.35, -0.6]}>
            {Array.from({ length: 7 }, (_, index) => (
              <mesh key={index} castShadow position={[0, 0, -2.0 + index * 0.66]}>
                <boxGeometry args={[0.09, 3.3, 0.42]} />
                <meshStandardMaterial color="#6b6259" roughness={0.7} metalness={0.08} />
              </mesh>
            ))}
          </group>
        ))}

        <mesh receiveShadow position={[-3.95, -0.94, -2.15]}>
          <boxGeometry args={[1.55, 0.38, 1.55]} />
          <meshStandardMaterial color="#25231f" roughness={0.95} />
        </mesh>
        <mesh receiveShadow position={[4.0, -0.94, 1.9]}>
          <boxGeometry args={[1.65, 0.38, 1.65]} />
          <meshStandardMaterial color="#25231f" roughness={0.95} />
        </mesh>
      </group>

      <Palm position={[-4.15, -1.02, -2.1]} scale={0.92} rotation={0.45} />
      <Palm position={[4.15, -1.02, 1.95]} scale={1.05} rotation={-0.7} />
      <Palm position={[-5.7, -1.12, 6.8]} scale={1.16} rotation={0.2} />
      <Palm position={[6.2, -1.12, 7.5]} scale={1.22} rotation={-0.25} />

      <PathLights />

      <mesh position={[0, -1.02, 8.7]} receiveShadow>
        <boxGeometry args={[13.5, 0.12, 1.2]} />
        <meshStandardMaterial color="#2b2926" roughness={0.9} />
      </mesh>
    </group>
  );
}

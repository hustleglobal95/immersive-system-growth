"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Clone, useAnimations, useGLTF } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import * as THREE from "three";

const ASTRONAUT_URL = "https://raw.githubusercontent.com/blendi-remade/dioramas/main/public/models/artemis/astro-rig.glb";
const LANDER_URL = "https://raw.githubusercontent.com/blendi-remade/dioramas/main/public/models/artemis/lander.glb";

type ProgressRef = MutableRefObject<number>;

const chapters = [
  { at: 0, eyebrow: "ARTEMIS // EVA 01", title: "One small step, repeated.", body: "Scroll becomes distance. The astronaut advances across the south-pole regolith instead of orbiting in place." },
  { at: 0.18, eyebrow: "TRAVERSE", title: "Walk the Moon.", body: "Every stride is tied to scroll progress. Stop scrolling and the mission stops with you." },
  { at: 0.52, eyebrow: "SURFACE RECORD", title: "Leave evidence behind.", body: "Footprints persist in the path while low-gravity dust lifts from the current stride." },
  { at: 0.78, eyebrow: "OUTPOST 03", title: "The destination enters frame.", body: "The lander is staged as the goal, not a decorative prop. Earth remains the orientation anchor above the horizon." },
  { at: 0.94, eyebrow: "SEVEN DAYS", title: "384,000 km from ordinary.", body: "A calmer final frame resolves the walk into the lunar-stay proposition." },
] as const;

export function ArtemisProofExperience() {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const footprintCount = useRef(0);
  const [chapter, setChapter] = useState(0);
  const [astronautReady, setAstronautReady] = useState(false);
  const [landerReady, setLanderReady] = useState(false);
  const chapterRef = useRef(0);

  useLayoutEffect(() => {
    if (!root.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.35,
        onUpdate(self) {
          progress.current = self.progress;
          const prints = Math.min(28, Math.floor(self.progress * 32));
          footprintCount.current = prints;
          if (root.current) {
            root.current.dataset.artemisProgress = self.progress.toFixed(4);
            root.current.dataset.footprints = String(prints);
          }
          let next = 0;
          for (let i = 0; i < chapters.length; i++) if (self.progress >= chapters[i].at) next = i;
          if (next !== chapterRef.current) {
            chapterRef.current = next;
            setChapter(next);
          }
        },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const active = chapters[chapter];

  return (
    <main
      ref={root}
      className="artemis-proof"
      data-proof="artemis"
      data-artemis-progress="0"
      data-footprints="0"
      data-astronaut-ready={astronautReady ? "true" : "false"}
      data-lander-ready={landerReady ? "true" : "false"}
    >
      <section className="artemis-stage" aria-label="Interactive lunar traverse">
        <Canvas
          className="artemis-canvas"
          shadows
          dpr={[1, 1.75]}
          camera={{ position: [4.8, 2.35, 8.2], fov: 34, near: 0.05, far: 120 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
        >
          <color attach="background" args={["#000000"]} />
          <fog attach="fog" args={["#000000", 25, 78]} />
          <Suspense fallback={null}>
            <LunarWorld progress={progress} footprints={footprintCount} onAstronautReady={() => setAstronautReady(true)} onLanderReady={() => setLanderReady(true)} />
          </Suspense>
        </Canvas>

        <header className="artemis-nav">
          <a className="artemis-mark" href="#mission" aria-label="Artemis home">
            <span>ARTEMIS</span><small>LUNAR EXPEDITION 03</small>
          </a>
          <nav aria-label="Mission">
            <a href="#mission">Mission</a>
            <a href="#outpost">Outpost</a>
            <a href="#stay">Seven days</a>
          </nav>
          <span className="artemis-status">SOUTH POLE // 89.9°S</span>
        </header>

        <div className="artemis-copy" id="mission" key={active.eyebrow}>
          <p className="artemis-eyebrow">{active.eyebrow}</p>
          <h1>{active.title}</h1>
          <p className="artemis-body">{active.body}</p>
        </div>

        <MissionTelemetry progress={progress} footprints={footprintCount} />

        <div className="artemis-scroll-cue" aria-hidden="true">
          <span />
          <small>SCROLL TO WALK</small>
        </div>

        {!astronautReady && <div className="artemis-loading">LOADING EVA SYSTEM</div>}
      </section>

      <section className="artemis-scroll-space" aria-hidden="true">
        <div id="outpost" />
        <div id="stay" />
      </section>

      <footer className="artemis-proof-footer">
        <p>FORGE CAPABILITY PROOF // ARTEMIS</p>
        <span>Reference behavior recreated independently in Forge. Dioramas assets used under CC BY 4.0.</span>
      </footer>
    </main>
  );
}

function MissionTelemetry({ progress, footprints }: { progress: ProgressRef; footprints: MutableRefObject<number> }) {
  const distance = useRef<HTMLSpanElement>(null);
  const print = useRef<HTMLSpanElement>(null);
  const rate = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = progress.current;
      if (distance.current) distance.current.textContent = String(Math.round(p * 1180)).padStart(4, "0");
      if (print.current) print.current.textContent = String(footprints.current).padStart(2, "0");
      if (rate.current) rate.current.textContent = p > 0.04 && p < 0.82 ? (0.72 + Math.sin(p * 14) * 0.08).toFixed(2) : "0.00";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [footprints, progress]);

  return (
    <aside className="artemis-telemetry" aria-label="Mission telemetry">
      <div><small>TRAVERSE</small><strong><span ref={distance}>0000</span> M</strong></div>
      <div><small>PRINTS</small><strong ref={print}>00</strong></div>
      <div><small>GAIT</small><strong><span ref={rate}>0.00</span> M/S</strong></div>
      <div><small>GRAVITY</small><strong>0.166 G</strong></div>
    </aside>
  );
}

function LunarWorld({
  progress,
  footprints,
  onAstronautReady,
  onLanderReady,
}: {
  progress: ProgressRef;
  footprints: MutableRefObject<number>;
  onAstronautReady: () => void;
  onLanderReady: () => void;
}) {
  const cameraTarget = useRef(new THREE.Vector3());
  useFrame(({ camera }) => {
    const p = progress.current;
    const astronaut = traversePoint(p);
    const destination = new THREE.Vector3(3.2, 0.1, -15.5);
    const late = smoothstep(0.66, 1, p);
    const side = THREE.MathUtils.lerp(5.1, 7.4, smoothstep(0.12, 0.55, p));
    const height = THREE.MathUtils.lerp(2.45, 4.6, late);
    const z = THREE.MathUtils.lerp(astronaut.z + 8.2, destination.z + 10.5, late);
    const desired = new THREE.Vector3(astronaut.x + side, height, z);
    camera.position.lerp(desired, 0.055);
    cameraTarget.current.lerp(
      new THREE.Vector3(
        THREE.MathUtils.lerp(astronaut.x, destination.x, late * 0.75),
        1.05 + late * 0.65,
        THREE.MathUtils.lerp(astronaut.z - 1.2, destination.z, late * 0.82),
      ),
      0.06,
    );
    camera.lookAt(cameraTarget.current);
    camera.fov = THREE.MathUtils.lerp(33, 38, late);
    camera.updateProjectionMatrix();
  });

  return (
    <>
      <ambientLight intensity={0.025} color="#5d79ac" />
      <directionalLight
        castShadow
        color="#fffaf1"
        intensity={6.8}
        position={[16, 18, 10]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />
      <Stars />
      <Earth />
      <Regolith />
      <Footprints progress={progress} />
      <Dust progress={progress} />
      <Astronaut progress={progress} onReady={onAstronautReady} />
      <Lander onReady={onLanderReady} />
      <Rocks />
      <hemisphereLight args={["#2f4d7d", "#050505", 0.055]} />
    </>
  );
}

function Astronaut({ progress, onReady }: { progress: ProgressRef; onReady: () => void }) {
  const gltf = useGLTF(ASTRONAUT_URL);
  const group = useRef<THREE.Group>(null);
  const cloned = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const { actions, names, mixer } = useAnimations(gltf.animations, group);

  useEffect(() => {
    const key = names.find((name) => /walk/i.test(name)) ?? names[0];
    const action = key ? actions[key] : undefined;
    if (action) {
      action.reset().play();
      action.paused = true;
    }
    cloned.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.envMapIntensity = 0.65;
          material.roughness = Math.max(0.35, material.roughness);
        }
      }
    });
    onReady();
  }, [actions, cloned, names, onReady]);

  useFrame((_, delta) => {
    const root = group.current;
    if (!root) return;
    const p = progress.current;
    const point = traversePoint(p);
    const next = traversePoint(Math.min(1, p + 0.015));
    root.position.set(point.x, point.y + Math.abs(Math.sin(p * Math.PI * 34)) * 0.045, point.z);
    root.rotation.y = Math.atan2(next.x - point.x, next.z - point.z) + Math.PI;
    const key = names.find((name) => /walk/i.test(name)) ?? names[0];
    const action = key ? actions[key] : undefined;
    if (action) {
      const duration = action.getClip().duration || 1;
      action.time = (p * duration * 11) % duration;
      mixer.update(Math.min(delta, 1 / 30));
    }
  });

  return (
    <group ref={group} scale={0.92}>
      <Clone object={cloned} />
    </group>
  );
}

function Lander({ onReady }: { onReady: () => void }) {
  const gltf = useGLTF(LANDER_URL);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    onReady();
  }, [onReady, scene]);
  return <primitive object={scene} position={[3.2, -0.12, -15.5]} rotation={[0, -0.35, 0]} scale={0.82} />;
}

function Regolith() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(70, 95, 90, 120);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const ripple = Math.sin(x * 0.58) * 0.14 + Math.cos(y * 0.31) * 0.17 + Math.sin((x + y) * 0.19) * 0.12;
      pos.setZ(i, ripple);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, -9]} receiveShadow>
      <meshStandardMaterial color="#595854" roughness={1} metalness={0} />
    </mesh>
  );
}

function Footprints({ progress }: { progress: ProgressRef }) {
  const group = useRef<THREE.Group>(null);
  const positions = useMemo(() => Array.from({ length: 28 }, (_, index) => {
    const p = index / 31;
    const point = traversePoint(p);
    return { point, yaw: traverseYaw(p), side: index % 2 ? 0.12 : -0.12 };
  }), []);

  useFrame(() => {
    const visible = Math.floor(progress.current * 32);
    group.current?.children.forEach((child, index) => { child.visible = index < visible; });
  });

  return (
    <group ref={group}>
      {positions.map(({ point, yaw, side }, index) => (
        <mesh
          key={index}
          position={[point.x + Math.cos(yaw) * side, -0.012, point.z - Math.sin(yaw) * side]}
          rotation={[-Math.PI / 2, 0, -yaw]}
          scale={[0.13, 0.29, 1]}
          visible={false}
        >
          <capsuleGeometry args={[0.38, 0.85, 3, 8]} />
          <meshStandardMaterial color="#32322f" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Dust({ progress }: { progress: ProgressRef }) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1.6;
      positions[i * 3 + 1] = Math.random() * 0.55;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    const p = progress.current;
    const point = traversePoint(p);
    if (points.current) {
      points.current.position.set(point.x, 0.02, point.z + 0.25);
      points.current.rotation.y = clock.elapsedTime * 0.08;
    }
    if (material.current) {
      const walking = p > 0.03 && p < 0.84;
      material.current.opacity = walking ? 0.14 + Math.abs(Math.sin(p * Math.PI * 34)) * 0.32 : 0;
    }
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial ref={material} color="#b9b5aa" size={0.028} transparent opacity={0} depthWrite={false} />
    </points>
  );
}

function Earth() {
  return (
    <group position={[-12, 7.4, -36]} data-earth>
      <mesh>
        <sphereGeometry args={[2.6, 64, 64]} />
        <meshStandardMaterial color="#315c8d" roughness={0.72} emissive="#11233d" emissiveIntensity={0.35} />
      </mesh>
      <mesh scale={1.045}>
        <sphereGeometry args={[2.6, 48, 48]} />
        <meshBasicMaterial color="#6ea8e8" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function Stars() {
  const geometry = useMemo(() => {
    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 110;
      positions[i * 3 + 1] = Math.random() * 52 + 4;
      positions[i * 3 + 2] = -Math.random() * 95 - 8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);
  return (
    <points geometry={geometry}>
      <pointsMaterial color="#ffffff" size={0.035} transparent opacity={0.72} depthWrite={false} />
    </points>
  );
}

function Rocks() {
  const rocks = useMemo(() => Array.from({ length: 38 }, (_, index) => {
    const angle = index * 2.399;
    const radius = 5 + (index % 9) * 2.7;
    return {
      x: Math.sin(angle) * radius,
      z: -4 - Math.cos(angle) * radius * 1.2,
      scale: 0.08 + (index % 5) * 0.055,
      rot: angle,
    };
  }), []);
  return (
    <group>
      {rocks.map((rock, index) => (
        <mesh key={index} position={[rock.x, -0.02, rock.z]} rotation={[rock.rot * 0.25, rock.rot, rock.rot * 0.12]} scale={rock.scale} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#4a4946" roughness={0.98} />
        </mesh>
      ))}
    </group>
  );
}

function traversePoint(progress: number) {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  const z = THREE.MathUtils.lerp(3.2, -14.1, smoothstep(0.04, 0.86, p));
  const x = -1.1 + Math.sin(p * Math.PI * 1.35) * 1.7 + p * 2.35;
  return new THREE.Vector3(x, 0, z);
}

function traverseYaw(progress: number) {
  const a = traversePoint(progress);
  const b = traversePoint(Math.min(1, progress + 0.02));
  return Math.atan2(b.x - a.x, b.z - a.z);
}

function smoothstep(min: number, max: number, value: number) {
  const t = THREE.MathUtils.clamp((value - min) / Math.max(0.0001, max - min), 0, 1);
  return t * t * (3 - 2 * t);
}

useGLTF.preload(ASTRONAUT_URL);
useGLTF.preload(LANDER_URL);

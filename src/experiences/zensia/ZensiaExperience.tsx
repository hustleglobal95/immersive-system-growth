"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type ProgressRef = MutableRefObject<number>;
type CalmRef = MutableRefObject<boolean>;

const ORDER_URL = "https://zensia-coffee-llc.square.site/";
const MENU_URL = "https://www.zensiacoffee.com/actual-menu";
const CALM_URL = "https://profile.squareup.com/loyalty/MLX5PRMQ9XZ02";

function Ridge({ y, z, width, lift, opacity }: { y:number; z:number; width:number; lift:number; opacity:number }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const count = 80;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = (t - 0.5) * width;
      const wave = Math.sin(t * Math.PI * 2.2) * 0.18 + Math.sin(t * Math.PI * 5.1 + z) * 0.07;
      const peak = Math.exp(-Math.pow((t - 0.54) * 4.2, 2)) * lift;
      points.push(new THREE.Vector3(x, y + wave + peak, z));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [y,z,width,lift]);
  const line = useMemo(
    () => new THREE.Line(geometry, new THREE.LineBasicMaterial({ color:"#82906d", transparent:true, opacity })),
    [geometry, opacity],
  );
  return <primitive object={line} />;
}

function Steam({ x, delay }: { x:number; delay:number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(x,-0.45,0.1),
    new THREE.Vector3(x+0.10,0.05,0.05),
    new THREE.Vector3(x-0.08,0.55,-0.04),
    new THREE.Vector3(x+0.06,1.08,0.08),
    new THREE.Vector3(x-0.04,1.55,0.02),
  ]), [x]);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 54, 0.012, 7, false), [curve]);
  useFrame(({clock}) => {
    if (!mesh.current) return;
    const t = clock.elapsedTime * 0.22 + delay;
    mesh.current.position.y = Math.sin(t) * 0.07;
    mesh.current.rotation.z = Math.sin(t * 0.7) * 0.05;
  });
  return <mesh ref={mesh} geometry={geometry}><meshBasicMaterial color="#f0e8d7" transparent opacity={0.22} /></mesh>;
}

function World({ progress, calm }: { progress:ProgressRef; calm:CalmRef }) {
  const root = useRef<THREE.Group>(null);
  const glassLeft = useRef<THREE.Mesh>(null);
  const glassRight = useRef<THREE.Mesh>(null);
  const orb = useRef<THREE.Mesh>(null);
  const cup = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame(({scene, pointer}, delta) => {
    const p = progress.current;
    const isCalm = calm.current;
    if (root.current) {
      root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, pointer.x * 0.12 + p * 0.16, 4, delta);
      root.current.position.y = THREE.MathUtils.damp(root.current.position.y, p < 0.22 ? -0.12 : p < 0.63 ? 0.10 : -0.05, 4, delta);
    }
    const opening = THREE.MathUtils.smoothstep(p, 0.08, 0.25);
    if (glassLeft.current) {
      glassLeft.current.position.x = THREE.MathUtils.damp(glassLeft.current.position.x, -1.35 - opening * 1.8, 5, delta);
      glassLeft.current.rotation.y = THREE.MathUtils.damp(glassLeft.current.rotation.y, opening * -0.22, 5, delta);
    }
    if (glassRight.current) {
      glassRight.current.position.x = THREE.MathUtils.damp(glassRight.current.position.x, 1.35 + opening * 1.8, 5, delta);
      glassRight.current.rotation.y = THREE.MathUtils.damp(glassRight.current.rotation.y, opening * 0.22, 5, delta);
    }
    const origin = THREE.MathUtils.smoothstep(p, 0.22, 0.48);
    if (orb.current) {
      const s = THREE.MathUtils.lerp(0.65, 1.15, origin);
      orb.current.scale.setScalar(THREE.MathUtils.damp(orb.current.scale.x, s, 4, delta));
      orb.current.position.z = THREE.MathUtils.damp(orb.current.position.z, THREE.MathUtils.lerp(-1.2, -0.15, origin), 4, delta);
      orb.current.rotation.y += delta * (isCalm ? 0.05 : 0.14);
    }
    const ritual = THREE.MathUtils.smoothstep(p, 0.46, 0.68);
    if (cup.current) {
      cup.current.position.y = THREE.MathUtils.damp(cup.current.position.y, THREE.MathUtils.lerp(-2.1, -0.45, ritual), 4, delta);
      cup.current.rotation.x = THREE.MathUtils.damp(cup.current.rotation.x, THREE.MathUtils.lerp(1.28, 1.52, ritual), 4, delta);
    }
    if (light.current) light.current.intensity = THREE.MathUtils.damp(light.current.intensity, 2.2 + ritual * 5 + (isCalm ? 2 : 0), 4, delta);
    color.set(p > 0.68 || isCalm ? "#14140f" : p > 0.28 ? "#10130d" : "#111312");
    scene.background = color;
  });

  return <>
    <fog attach="fog" args={["#11120e", 4.5, 13]} />
    <ambientLight intensity={0.55} color="#c9d3bd" />
    <directionalLight position={[-4,5,4]} intensity={2.1} color="#dce2d1" />
    <pointLight ref={light} position={[0,0.6,2.5]} intensity={2.2} color="#d8a16c" distance={9} />
    <group ref={root}>
      <group position={[0,-0.55,-1.8]}>
        {[0,1,2,3,4,5,6].map(i => <Ridge key={i} y={-1.3+i*0.17} z={-2-i*0.34} width={9+i*0.8} lift={0.5+i*0.06} opacity={0.2+i*0.035} />)}
      </group>

      <mesh ref={orb} position={[0,0.35,-1.2]}>
        <sphereGeometry args={[0.76,64,64]} />
        <meshPhysicalMaterial color="#713728" roughness={0.42} metalness={0.02} clearcoat={0.35} clearcoatRoughness={0.28} />
      </mesh>

      <group ref={cup} position={[0,-2.1,0.1]} rotation={[1.28,0,0]}>
        <mesh>
          <torusGeometry args={[1.12,0.055,20,100]} />
          <meshStandardMaterial color="#d8c9ad" roughness={0.36} />
        </mesh>
        <mesh position={[0,0,-0.08]}>
          <circleGeometry args={[1.07,96]} />
          <meshPhysicalMaterial color="#321b13" roughness={0.38} clearcoat={0.5} />
        </mesh>
        <Steam x={-0.24} delay={0} /><Steam x={0.08} delay={1.2} /><Steam x={0.32} delay={2.4} />
      </group>

      <mesh ref={glassLeft} position={[-1.35,0,2.25]}>
        <boxGeometry args={[2.7,5.8,0.08]} />
        <meshPhysicalMaterial color="#dce2d9" roughness={0.55} transmission={0.4} transparent opacity={0.64} thickness={0.7} />
      </mesh>
      <mesh ref={glassRight} position={[1.35,0,2.25]}>
        <boxGeometry args={[2.7,5.8,0.08]} />
        <meshPhysicalMaterial color="#dce2d9" roughness={0.55} transmission={0.4} transparent opacity={0.64} thickness={0.7} />
      </mesh>
    </group>
  </>;
}

const chapters = [
  ["01","Threshold","Leave the city outside."],
  ["02","Origin","Colombia is not a flavor. It is a place."],
  ["03","Ritual","Preparation is part of the experience."],
  ["04","Pause","Let the interface breathe."],
  ["05","Stay","Coffee becomes time together."],
  ["06","Visit","Your pause starts here."],
];

export function ZensiaExperience() {
  const root = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const calmRef = useRef(false);
  const [calm, setCalm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const setCalmMode = (next:boolean) => {
    calmRef.current = next;
    setCalm(next);
  };

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: self => { progress.current = self.progress; },
      });
      if (!reduced) {
        gsap.utils.toArray<HTMLElement>("[data-z-reveal]").forEach(el => {
          gsap.fromTo(el,{y:50,opacity:0},{y:0,opacity:1,duration:1.1,ease:"power3.out",scrollTrigger:{trigger:el,start:"top 84%",once:true}});
        });
        gsap.to(".zensia-noise__track",{yPercent:-34,ease:"none",scrollTrigger:{trigger:"#zensia-threshold",start:"top bottom",end:"bottom top",scrub:true}});
        gsap.to(".zensia-origin__line",{scaleX:1,ease:"none",scrollTrigger:{trigger:"#zensia-origin",start:"top 75%",end:"bottom 60%",scrub:true}});
      }
    }, root);
    return () => context.revert();
  }, []);

  const moveFrost = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX-rect.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY-rect.top}px`);
  };

  return <div ref={root} className="zensia" data-calm={calm ? "true" : "false"}>
    <a className="zensia-skip" href="#zensia-story">Skip to the story</a>
    <div className="zensia-canvas" aria-hidden="true">
      <Canvas camera={{position:[0,0.2,7.2],fov:42}} dpr={[1,1.5]} gl={{antialias:true,alpha:false,powerPreference:"high-performance"}}>
        <World progress={progress} calm={calmRef} />
      </Canvas>
    </div>
    <div className="zensia-grain" aria-hidden="true" />

    <header className="zensia-header">
      <a href="#zensia-threshold" className="zensia-wordmark" aria-label="Zensia Coffee home">ZENSIA<span>COFFEE</span></a>
      <p className="zensia-header__origin">COLOMBIAN SPECIALTY COFFEE<br/>CLAYTON · ST. LOUIS</p>
      <nav className="zensia-nav" aria-label="Primary">
        <a href={MENU_URL} target="_blank" rel="noreferrer">Menu</a>
        <a href={ORDER_URL} target="_blank" rel="noreferrer">Order</a>
        <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="zensia-index">{menuOpen ? "Close" : "Index"}</button>
      </nav>
    </header>

    {menuOpen && <nav id="zensia-index" className="zensia-index" aria-label="Experience chapters">
      {chapters.map(([n,label,desc],i)=><a key={label} href={`#zensia-${["threshold","origin","ritual","pause","stay","visit"][i]}`} onClick={()=>setMenuOpen(false)}><span>{n}</span><b>{label}</b><small>{desc}</small></a>)}
    </nav>}

    <main id="zensia-story">
      <section id="zensia-threshold" className="zensia-scene zensia-hero" onPointerMove={moveFrost}>
        <div className="zensia-noise" aria-hidden="true"><div className="zensia-noise__track">TRAFFIC · DEADLINES · MEETINGS · NOTIFICATIONS · TRAFFIC · DEADLINES · MEETINGS · NOTIFICATIONS ·</div></div>
        <div className="zensia-frost" aria-hidden="true" />
        <div className="zensia-hero__copy" data-z-reveal>
          <p className="zensia-kicker">01 / THRESHOLD</p>
          <h1><span>When the city shouts,</span><em>we whisper coffee.</em></h1>
          <p>A Colombian coffee house designed around a simple luxury: enough room to stay.</p>
          <a href="#zensia-origin" className="zensia-enter"><span>Enter the pause</span><i aria-hidden="true">↓</i></a>
        </div>
        <aside className="zensia-hero__aside" aria-hidden="true"><span>MOVE TO CLEAR THE GLASS</span><i /></aside>
      </section>

      <section id="zensia-origin" className="zensia-scene zensia-origin">
        <div className="zensia-origin__meta" data-z-reveal><p>02 / ORIGIN</p><span>COLOMBIA → ST. LOUIS</span></div>
        <div className="zensia-origin__copy" data-z-reveal>
          <p className="zensia-kicker">COFFEE BEGINS BEFORE THE CUP</p>
          <h2>One country.<br/><em>Many expressions.</em></h2>
          <p>Zensia was created by Colombians in St. Louis to share the coffee experience they felt was missing here: origin, freshness, preparation and time.</p>
        </div>
        <div className="zensia-origin__proof" data-z-reveal>
          <div><strong>4–6</strong><span>WEEKS<br/>HARVEST TO CUP*</span></div>
          <p>*As described by Zensia’s founders in St. Louis Magazine. Roasted in Colombia and air-freighted to St. Louis.</p>
        </div>
        <div className="zensia-origin__line" aria-hidden="true" />
      </section>

      <section id="zensia-ritual" className="zensia-scene zensia-ritual">
        <div className="zensia-ritual__copy" data-z-reveal>
          <p className="zensia-kicker">03 / RITUAL</p>
          <h2>The cup is<br/><em>the final step.</em></h2>
          <p>Balance is adjusted every day through grind, extraction and preparation. The interface slows down here for the same reason: attention changes the result.</p>
        </div>
        <div className="zensia-ritual__dial" data-z-reveal aria-label="Coffee preparation variables">
          {["GRIND","WATER","PRESSURE","TIME"].map((label,i)=><div key={label} style={{"--i":i} as React.CSSProperties}><span>0{i+1}</span><b>{label}</b></div>)}
          <i aria-hidden="true" />
        </div>
      </section>

      <section id="zensia-pause" className="zensia-scene zensia-pause">
        <div className="zensia-pause__inner" data-z-reveal>
          <p className="zensia-kicker">04 / THE SIGNATURE</p>
          <h2>Don’t scroll faster.<br/><em>Stay longer.</em></h2>
          <p>This is the point of the brand. Change the pace of the interface and the rest of the experience reorganizes around calm.</p>
          <button type="button" className="zensia-calm-toggle" onClick={()=>setCalmMode(!calm)} aria-pressed={calm}>
            <span>{calm ? "Return to city pace" : "Enter calm mode"}</span><i aria-hidden="true">{calm ? "—" : "○"}</i>
          </button>
        </div>
        <div className="zensia-breath" aria-hidden="true"><span>BREATHE IN</span><i/><span>LET GO</span></div>
      </section>

      <section id="zensia-stay" className="zensia-scene zensia-stay">
        <div className="zensia-stay__headline" data-z-reveal><p className="zensia-kicker">05 / STAY</p><h2>Coffee is<br/>only half<br/><em>the reason.</em></h2></div>
        <div className="zensia-stay__grid" data-z-reveal>
          <article><span>01</span><h3>Colombian table</h3><p>Coffee, breads, empanadas and desserts place the menu inside a larger cultural experience.</p></article>
          <article><span>02</span><h3>Room to linger</h3><p>The physical café was intentionally designed as the opposite of a fast-turn coffee shop.</p></article>
          <article><span>03</span><h3>Community</h3><p>Zensia’s public voice centers connection, culture and the everyday relationships built across the counter.</p></article>
        </div>
      </section>

      <section id="zensia-visit" className="zensia-scene zensia-visit">
        <div className="zensia-visit__copy" data-z-reveal>
          <p className="zensia-kicker">06 / YOUR PAUSE</p>
          <h2>Come in.<br/><em>Take your time.</em></h2>
          <p>8121 Maryland Avenue<br/>St. Louis, MO 63105</p>
        </div>
        <div className="zensia-actions" data-z-reveal>
          <a href={ORDER_URL} target="_blank" rel="noreferrer"><span>Order online</span><b>↗</b></a>
          <a href={MENU_URL} target="_blank" rel="noreferrer"><span>View menu</span><b>↗</b></a>
          <a href={CALM_URL} target="_blank" rel="noreferrer"><span>Join Calm Club</span><b>↗</b></a>
        </div>
        <footer className="zensia-footer">
          <span>ZENSIA COFFEE</span>
          <p>Concept experience built in Forge · Brand facts grounded in public Zensia sources · Third-party editorial imagery intentionally not reused.</p>
        </footer>
      </section>
    </main>
  </div>;
}

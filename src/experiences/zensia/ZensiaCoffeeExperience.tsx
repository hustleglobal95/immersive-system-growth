"use client";

import Image from "next/image";
import { Canvas, useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  ShaderMaterial,
} from "three";

const ORDER_URL="https://zensia-coffee-llc.square.site/";
const MENU_URL="https://www.zensiacoffee.com/actual-menu";
const MAP_URL="https://www.google.com/maps/search/?api=1&query=8121+Maryland+Avenue+Saint+Louis+MO+63105";

const ZENSIA_BAGS=[
  {label:"Zen at Home",note:"Colombian coffee for the home ritual.",image:"https://static.wixstatic.com/media/820771_22ed744817524376bb36445174684e6f~mv2.png"},
  {label:"Zen at Home",note:"A second expression from Zensia's packaged coffee line.",image:"https://static.wixstatic.com/media/820771_bf96a54cf492498799ce6d63f802a93e~mv2.jpeg"},
  {label:"Zen at Home",note:"Zensia coffee, staged as a product rather than a menu thumbnail.",image:"https://static.wixstatic.com/media/820771_21b52780336c46bbb34cb3f00829da60~mv2.jpg"},
  {label:"Zen at Home",note:"A darker product expression for the rack.",image:"https://static.wixstatic.com/media/820771_3db723033b014dd9a51fb2b01ed1fb95~mv2.jpg"},
] as const;

const DRINKS=[
  {name:"Espresso",image:"https://static.wixstatic.com/media/859566_b618d3f2dc39473fa45047c95e676872~mv2.jpg",note:"Short. Concentrated. The foundation."},
  {name:"Latte",image:"https://static.wixstatic.com/media/859566_90db78bfbd21470fafaf59bd0646b4ba~mv2.jpg",note:"Espresso softened by milk and texture."},
  {name:"Cappuccino",image:"https://static.wixstatic.com/media/859566_dda43df0514841eea1663f508724fcef~mv2.jpg",note:"Espresso, milk, foam. Balanced in layers."},
  {name:"Cold Brew",image:"https://static.wixstatic.com/media/820771_5c658f32b08d47f7ae25fc6045590669~mv2.jpg",note:"Slow, cold extraction with a cleaner finish."},
  {name:"Iced Latte",image:"https://static.wixstatic.com/media/859566_c6c1ece55ef84a9e8f18b65b712bffd2~mv2.png",note:"Espresso over ice with milk."},
] as const;

const RACK_LABELS=[
  "Brew","Mocha","Cappuccino","Latte","Regular Espresso","Double Espresso",
  "Macchiato","Cortado","Flat White","Cold Brew","Nitro","Iced Latte","Affogato Coffee",
] as const;

const STEAM_VERTEX=
"uniform float uTime;\\n"+
"uniform float uSeed;\\n"+
"varying vec2 vUv;\\n"+
"void main(){\\n"+
"  vUv=uv;\\n"+
"  vec3 p=position;\\n"+
"  float lift=uv.y;\\n"+
"  float wave=sin(lift*7.0+uTime*1.05+uSeed)*0.10;\\n"+
"  wave+=sin(lift*13.0-uTime*0.58+uSeed*1.7)*0.045;\\n"+
"  p.x+=wave*(0.28+lift*0.95);\\n"+
"  p.z+=cos(lift*5.0+uTime*0.72+uSeed)*0.055*lift;\\n"+
"  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);\\n"+
"}";

const STEAM_FRAGMENT=
"uniform float uTime;\\n"+
"uniform float uSeed;\\n"+
"varying vec2 vUv;\\n"+
"float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7))+uSeed)*43758.5453); }\\n"+
"void main(){\\n"+
"  float center=1.0-smoothstep(0.0,0.48,abs(vUv.x-0.5));\\n"+
"  float edge=smoothstep(0.0,0.16,vUv.y)*(1.0-smoothstep(0.74,1.0,vUv.y));\\n"+
"  float grain=0.72+0.28*sin(vUv.y*28.0+uTime*1.6+hash(vUv*4.0)*3.0);\\n"+
"  float alpha=center*edge*grain*0.30;\\n"+
"  gl_FragColor=vec4(vec3(1.0,0.94,0.84),alpha);\\n"+
"}";

type SceneProps={
  progress:MutableRefObject<number>;
  pointer:MutableRefObject<{x:number;y:number}>;
  reduced:MutableRefObject<boolean>;
};

function SteamRibbon({index,progress}:{index:number;progress:MutableRefObject<number>}){
  const material=useRef<ShaderMaterial>(null);
  useFrame(({clock})=>{
    if(!material.current) return;
    material.current.uniforms.uTime.value=clock.elapsedTime*(index===1?0.92:1);
    material.current.opacity=1-MathUtils.smoothstep(progress.current,0.25,0.33);
  });
  return (
    <mesh position={[(index-1)*0.34,2.0,index===1?0.04:-0.08]} rotation={[0,index===1?0.08:-0.06,0]}>
      <planeGeometry args={[0.72,2.75,18,42]} />
      <shaderMaterial
        ref={material}
        vertexShader={STEAM_VERTEX}
        fragmentShader={STEAM_FRAGMENT}
        uniforms={{uTime:{value:0},uSeed:{value:index*1.91+0.7}}}
        transparent
        depthWrite={false}
        side={DoubleSide}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

function CupScene({progress,pointer,reduced}:SceneProps){
  const cup=useRef<Group>(null);
  const stream=useRef<Mesh>(null);
  const streamMaterial=useRef<MeshPhysicalMaterial>(null);
  const steamMaterials=useRef<ShaderMaterial[]>([]);

  useFrame(({clock})=>{
    const group=cup.current;
    if(!group) return;
    const p=progress.current;
    const handoff=MathUtils.smoothstep(p,0.075,0.215);
    const exit=MathUtils.smoothstep(p,0.29,0.36);
    const scale=(1-exit)*MathUtils.lerp(1,0.82,handoff);

    const pointerX=reduced.current?0:pointer.current.x;
    const pointerY=reduced.current?0:pointer.current.y;
    group.position.x=MathUtils.lerp(1.72,1.95,handoff);
    group.position.y=MathUtils.lerp(-0.05,0.72,handoff);
    group.position.z=MathUtils.lerp(0,-0.25,handoff);
    group.scale.setScalar(Math.max(0.001,scale));
    group.rotation.y=MathUtils.lerp(group.rotation.y,pointerX*0.17,0.06);
    group.rotation.x=MathUtils.lerp(group.rotation.x,-pointerY*0.065,0.06);
    group.rotation.z=MathUtils.lerp(group.rotation.z,-0.46*handoff,0.07);

    const pourIn=MathUtils.smoothstep(p,0.14,0.19);
    const pourOut=1-MathUtils.smoothstep(p,0.235,0.29);
    const pour=Math.max(0,pourIn*pourOut);
    if(stream.current){
      stream.current.visible=pour>0.01;
      stream.current.position.x=group.position.x-0.58;
      stream.current.position.y=group.position.y-1.62;
      stream.current.position.z=-0.06;
      stream.current.scale.set(1,Math.max(0.02,pour),1);
    }
    if(streamMaterial.current) streamMaterial.current.opacity=0.78*pour;
  });

  return (
    <group>
      <group ref={cup}>
        <mesh castShadow position={[0,-0.02,0]}>
          <cylinderGeometry args={[1.46,1.18,1.7,72,1,true]} />
          <meshPhysicalMaterial color={new Color("#d4b890")} roughness={0.38} metalness={0.02} clearcoat={0.22} clearcoatRoughness={0.42} side={DoubleSide} />
        </mesh>
        <mesh position={[0,0.79,0]} rotation={[Math.PI/2,0,0]}>
          <torusGeometry args={[1.45,0.075,20,72]} />
          <meshPhysicalMaterial color="#ead7ba" roughness={0.34} />
        </mesh>
        <mesh position={[0,0.76,0]}>
          <cylinderGeometry args={[1.33,1.33,0.08,72]} />
          <meshPhysicalMaterial color="#32150c" roughness={0.28} clearcoat={0.42} />
        </mesh>
        <mesh position={[1.46,0.02,0]} rotation={[0,Math.PI/2,0]} scale={[1,1.12,1]}>
          <torusGeometry args={[0.63,0.15,22,64]} />
          <meshPhysicalMaterial color="#d4b890" roughness={0.38} clearcoat={0.18} />
        </mesh>
        <mesh position={[0,-0.95,0]} rotation={[Math.PI/2,0,0]} scale={[1.08,1.08,0.18]}>
          <cylinderGeometry args={[1.7,1.7,0.12,72]} />
          <meshPhysicalMaterial color="#a9825f" roughness={0.52} />
        </mesh>
        <mesh position={[0,-0.02,1.2]}>
          <planeGeometry args={[1.4,0.52]} />
          <meshBasicMaterial color="#2b1710" transparent opacity={0.85} />
        </mesh>
        <group position={[0,0.66,0]}>
          {[0,1,2].map((index)=><SteamRibbon key={index} index={index} progress={progress} />)}
        </group>
      </group>
      <mesh ref={stream} visible={false} rotation={[0,0,0.10]}>
        <cylinderGeometry args={[0.065,0.10,3.15,18]} />
        <meshPhysicalMaterial ref={streamMaterial} color="#4a1e0f" roughness={0.22} clearcoat={0.32} transparent opacity={0} />
      </mesh>
    </group>
  );
}

function PersistentCup({progress,pointer,reduced}:SceneProps){
  return (
    <div className="zc-canvas" aria-hidden="true">
      <Canvas dpr={[1,1.55]} camera={{position:[0,0.25,7.25],fov:35}} gl={{alpha:true,antialias:true,powerPreference:"high-performance"}}>
        <ambientLight intensity={0.85} color="#f1d7ad" />
        <directionalLight position={[-4,5,5]} intensity={2.2} color="#ffd9a2" />
        <spotLight position={[4,7,5]} intensity={18} angle={0.42} penumbra={0.82} color="#ffbb6d" castShadow />
        <pointLight position={[2,-2,4]} intensity={8} color="#7f381b" />
        <CupScene progress={progress} pointer={pointer} reduced={reduced} />
      </Canvas>
    </div>
  );
}

export function ZensiaCoffeeExperience(){
  const root=useRef<HTMLDivElement>(null);
  const progress=useRef(0);
  const pointer=useRef({x:0,y:0});
  const reduced=useRef(false);

  useLayoutEffect(()=>{
    gsap.registerPlugin(ScrollTrigger);
    const element=root.current;
    if(!element) return;
    reduced.current=window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const context=gsap.context(()=>{
      ScrollTrigger.create({
        trigger:element,
        start:"top top",
        end:"bottom bottom",
        onUpdate:self=>{progress.current=self.progress;},
      });

      if(reduced.current){
        gsap.set(".zc-reveal",{opacity:1,y:0});
        gsap.set(".zc-pour-glass__fill",{scaleY:0.78});
        return;
      }

      gsap.fromTo(".zc-hero__eyebrow",{y:18,opacity:0},{y:0,opacity:1,duration:.65,ease:"power3.out"});
      gsap.fromTo(".zc-hero h1",{clipPath:"inset(0 0 100% 0)",yPercent:10},{clipPath:"inset(0 0 0% 0)",yPercent:0,duration:1.1,ease:"expo.out",delay:.08});
      gsap.fromTo(".zc-hero__copy p,.zc-hero__actions",{y:24,opacity:0},{y:0,opacity:1,duration:.8,stagger:.08,ease:"power3.out",delay:.22});

      gsap.utils.toArray<HTMLElement>(".zc-reveal").forEach(node=>{
        gsap.fromTo(node,{y:36,opacity:0},{y:0,opacity:1,duration:.86,ease:"power3.out",scrollTrigger:{trigger:node,start:"top 88%",once:true}});
      });

      gsap.fromTo(".zc-pour-glass__fill",{scaleY:.04},{scaleY:.86,ease:"none",scrollTrigger:{trigger:".zc-coffee",start:"top 82%",end:"top 18%",scrub:.7}});
      gsap.fromTo(".zc-coffee__products",{yPercent:8},{yPercent:-4,ease:"none",scrollTrigger:{trigger:".zc-coffee",start:"top bottom",end:"bottom top",scrub:.8}});
      gsap.fromTo(".zc-rack__shelf:nth-child(odd)",{xPercent:-3},{xPercent:2,ease:"none",scrollTrigger:{trigger:".zc-rack",start:"top bottom",end:"bottom top",scrub:.85}});
      gsap.fromTo(".zc-rack__shelf:nth-child(even)",{xPercent:3},{xPercent:-2,ease:"none",scrollTrigger:{trigger:".zc-rack",start:"top bottom",end:"bottom top",scrub:.85}});
      gsap.fromTo(".zc-story__image img",{scale:1.12,yPercent:-4},{scale:1.02,yPercent:5,ease:"none",scrollTrigger:{trigger:".zc-story",start:"top bottom",end:"bottom top",scrub:.9}});
      gsap.fromTo(".zc-recipe-card",{y:42,opacity:0},{y:0,opacity:1,duration:.7,stagger:.09,ease:"power3.out",scrollTrigger:{trigger:".zc-recipes__grid",start:"top 82%",once:true}});
    },element);

    return ()=>context.revert();
  },[]);

  const onPointerMove=(event:ReactPointerEvent<HTMLDivElement>)=>{
    const bounds=event.currentTarget.getBoundingClientRect();
    pointer.current.x=((event.clientX-bounds.left)/bounds.width)*2-1;
    pointer.current.y=((event.clientY-bounds.top)/bounds.height)*2-1;
  };

  return (
    <div className="zc" ref={root} onPointerMove={onPointerMove}>
      <a className="zc-skip" href="#zc-main">Skip to content</a>
      <PersistentCup progress={progress} pointer={pointer} reduced={reduced} />

      <header className="zc-header">
        <a className="zc-brand" href="#zc-main" aria-label="Zensia home">ZENSIA <span>COFFEE</span></a>
        <nav className="zc-nav" aria-label="Primary">
          <a href="#zc-coffee">Coffee</a>
          <a href="#zc-rack">Rack</a>
          <a href="#zc-recipes">Recipes</a>
          <a href="#zc-story">Story</a>
          <a href="#zc-visit">Visit</a>
          <a className="zc-nav__order" href={ORDER_URL}>Order online</a>
        </nav>
      </header>

      <main id="zc-main">
        <section className="zc-hero" aria-labelledby="zc-hero-title">
          <div className="zc-hero__atmosphere" aria-hidden="true"><span /><span /><span /></div>
          <div className="zc-hero__copy">
            <p className="zc-eyebrow zc-hero__eyebrow">More than coffee</p>
            <h1 id="zc-hero-title">A coffee experience <em>worth staying for.</em></h1>
            <p>Colombian specialty coffee, a room to slow down in, and a cup that carries the story from first pour to final sip.</p>
            <div className="zc-hero__actions">
              <a href="#zc-coffee">Explore the coffee <span>↘</span></a>
              <a href={ORDER_URL}>Order online</a>
            </div>
          </div>
          <div className="zc-hero__object-label" aria-hidden="true">
            <span>01 / HERO OBJECT</span><strong>THE CUP</strong><small>Move your pointer. Scroll to pour.</small>
          </div>
          <div className="zc-hero__vertical" aria-hidden="true">GOOD COFFEE · BRIGHTER DAYS</div>
        </section>

        <section className="zc-coffee" id="zc-coffee" aria-labelledby="zc-coffee-title">
          <div className="zc-coffee__copy zc-reveal">
            <p className="zc-eyebrow">The pour continues</p>
            <h2 id="zc-coffee-title">Exceptional coffee for <em>every moment.</em></h2>
            <p>The hero cup does not disappear. It tilts, pours, and hands the experience into the product story below.</p>
            <a className="zc-button zc-button--dark" href={MENU_URL}>See the full menu</a>
          </div>

          <div className="zc-pour-target" aria-hidden="true">
            <div className="zc-pour-glass"><div className="zc-pour-glass__fill" /><span>Z</span></div>
            <small>SCROLL-DRIVEN HANDOFF</small>
          </div>

          <div className="zc-coffee__products">
            {ZENSIA_BAGS.map((bag,index)=>(
              <article className="zc-product zc-reveal" key={bag.image}>
                <div className="zc-product__media">
                  <Image src={bag.image} alt={"Zensia packaged coffee "+(index+1)} fill sizes="(max-width: 760px) 44vw, 20vw" />
                </div>
                <span>{String(index+1).padStart(2,"0")}</span>
                <h3>{bag.label}</h3>
                <p>{bag.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="zc-rack" id="zc-rack" aria-labelledby="zc-rack-title">
          <div className="zc-rack__intro zc-reveal">
            <p className="zc-eyebrow">From our café to your day</p>
            <h2 id="zc-rack-title">The Zensia <em>coffee rack.</em></h2>
            <p>A shop wall that mixes Zensia&apos;s packaged coffee with the coffee styles people actually come to drink.</p>
            <a className="zc-button" href={ORDER_URL}>Shop / order</a>
          </div>

          <div className="zc-rack__wall" aria-label="Zensia coffee rack">
            <div className="zc-rack__tabs" aria-hidden="true"><span>PACKAGED COFFEE</span><span>ESPRESSO</span><span>MILK</span><span>COLD</span></div>
            <div className="zc-rack__shelf zc-rack__shelf--bags">
              {ZENSIA_BAGS.map((bag,index)=>(
                <div className="zc-rack-item zc-rack-item--bag" key={"rack-"+bag.image}>
                  <Image src={bag.image} alt={"Zensia coffee package "+(index+1)} fill sizes="150px" />
                </div>
              ))}
            </div>
            <div className="zc-rack__shelf zc-rack__shelf--drinks">
              {DRINKS.map(drink=>(
                <div className="zc-rack-item zc-rack-item--drink" key={drink.name}>
                  <div className="zc-rack-item__photo"><Image src={drink.image} alt={drink.name} fill sizes="130px" /></div>
                  <span>{drink.name}</span>
                </div>
              ))}
            </div>
            <div className="zc-rack__shelf zc-rack__shelf--labels">
              {RACK_LABELS.map(label=><span key={label}>{label}</span>)}
            </div>
          </div>
        </section>

        <section className="zc-recipes" id="zc-recipes" aria-labelledby="zc-recipes-title">
          <div className="zc-recipes__heading zc-reveal">
            <p className="zc-eyebrow">Coffee recipes</p>
            <h2 id="zc-recipes-title">Timeless <em>favorites.</em></h2>
            <p>Classic forms, shown as a visual guide to the drinks that shape a coffee bar.</p>
          </div>
          <div className="zc-recipes__grid">
            {DRINKS.slice(0,4).map((drink,index)=>(
              <article className="zc-recipe-card" key={drink.name}>
                <div className="zc-recipe-card__image"><Image src={drink.image} alt={drink.name} fill sizes="(max-width:760px) 82vw, 24vw" /></div>
                <span>{String(index+1).padStart(2,"0")}</span><h3>{drink.name}</h3><p>{drink.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="zc-story" id="zc-story" aria-labelledby="zc-story-title">
          <div className="zc-story__image">
            <Image src="https://static.wixstatic.com/media/859566_26ddc1aef049454db886a6bd9d84b5b6~mv2.jpg" alt="Zensia coffee photography" fill sizes="(max-width: 900px) 100vw, 56vw" />
          </div>
          <div className="zc-story__copy zc-reveal">
            <p className="zc-eyebrow">Our story</p>
            <h2 id="zc-story-title">Rooted in <em>people and coffee.</em></h2>
            <p>Zensia becomes more than a catalog here. The product, the café, the recipes and the daily ritual resolve into one brand experience.</p>
            <div className="zc-story__facts">
              <span><b>ST. LOUIS</b>CAFÉ</span><span><b>COLOMBIAN</b>COFFEE ROOTS</span><span><b>DAILY</b>RITUAL</span>
            </div>
            <a className="zc-button" href={MAP_URL}>Visit Zensia</a>
          </div>
        </section>

        <section className="zc-visit" id="zc-visit" aria-labelledby="zc-visit-title">
          <div className="zc-visit__copy zc-reveal">
            <p className="zc-eyebrow">Visit or order online</p>
            <h2 id="zc-visit-title">Good coffee. <em>Brighter days.</em></h2>
            <p>Start with the cup, stay for the room, take the coffee with you.</p>
            <div className="zc-visit__actions">
              <a className="zc-button zc-button--light" href={ORDER_URL}>Order online</a>
              <a className="zc-button" href={MAP_URL}>Find the café</a>
            </div>
          </div>
          <div className="zc-visit__services">
            <span><b>01</b>Order online</span><span><b>02</b>Visit the café</span><span><b>03</b>Explore the menu</span>
          </div>
        </section>
      </main>

      <footer className="zc-footer">
        <strong>ZENSIA</strong><span>COFFEE · ST. LOUIS</span><a href={MENU_URL}>Menu</a>
      </footer>
    </div>
  );
}

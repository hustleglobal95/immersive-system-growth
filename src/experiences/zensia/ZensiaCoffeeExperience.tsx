"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const ORDER_URL="https://zensia-coffee-llc.square.site/";
const MENU_URL="https://www.zensiacoffee.com/actual-menu";
const MAP_URL="https://www.google.com/maps/search/?api=1&query=8121+Maryland+Avenue+Saint+Louis+MO+63105";

const HOTSPOTS=[
  {label:"Coffee",href:"#coffee",x:32.5,y:1.2,w:8.2,h:2.8},
  {label:"Menu",href:MENU_URL,x:41.5,y:1.2,w:7.6,h:2.8},
  {label:"Recipes",href:"#recipes",x:49.8,y:1.2,w:8.2,h:2.8},
  {label:"Story",href:"#story",x:58.6,y:1.2,w:7.5,h:2.8},
  {label:"Visit",href:"#visit",x:66.7,y:1.2,w:7.2,h:2.8},
  {label:"Order online",href:ORDER_URL,x:80.5,y:.7,w:12,h:3.7},
  {label:"Explore our coffee",href:"#coffee",x:9.4,y:16.8,w:15.4,h:2.8},
  {label:"Shop all coffee",href:ORDER_URL,x:6.2,y:34.3,w:14.6,h:2.8},
  {label:"Shop now",href:ORDER_URL,x:6.3,y:52.2,w:12.6,h:2.7},
  {label:"Explore recipes",href:MENU_URL,x:7,y:68.6,w:14.5,h:2.7},
  {label:"Our story",href:"#story",x:55.4,y:83.4,w:12.2,h:2.7},
  {label:"Order online",href:ORDER_URL,x:8.3,y:94.2,w:13.4,h:2.8},
  {label:"Find a store",href:MAP_URL,x:22.6,y:94.2,w:12.6,h:2.8},
] as const;

export function ZensiaCoffeeExperience(){
  const root=useRef<HTMLDivElement>(null);
  const steam=useRef<HTMLDivElement>(null);

  useLayoutEffect(()=>{
    gsap.registerPlugin(ScrollTrigger);
    const element=root.current;
    if(!element) return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(reduced) return;

    const context=gsap.context(()=>{
      gsap.to(".zc-steam__strand--a",{x:18,y:-30,rotate:8,duration:3.3,repeat:-1,yoyo:true,ease:"sine.inOut"});
      gsap.to(".zc-steam__strand--b",{x:-15,y:-38,rotate:-7,duration:4.2,repeat:-1,yoyo:true,ease:"sine.inOut"});
      gsap.to(".zc-steam__strand--c",{x:10,y:-24,rotate:5,duration:3.7,repeat:-1,yoyo:true,ease:"sine.inOut"});

      gsap.fromTo(".zc-pour-accent",
        {scaleY:.08,opacity:.12},
        {scaleY:1,opacity:.72,ease:"none",scrollTrigger:{trigger:element,start:"6% top",end:"26% top",scrub:.7}}
      );

      gsap.fromTo(".zc-cup-focus",
        {scale:1},
        {scale:1.025,ease:"none",scrollTrigger:{trigger:element,start:"top top",end:"18% top",scrub:.7}}
      );
    },element);

    return ()=>context.revert();
  },[]);

  const onPointerMove=(event:ReactPointerEvent<HTMLDivElement>)=>{
    const bounds=event.currentTarget.getBoundingClientRect();
    const x=((event.clientX-bounds.left)/bounds.width)-.5;
    const y=((event.clientY-bounds.top)/bounds.height)-.5;
    root.current?.style.setProperty("--mx",x.toFixed(3));
    root.current?.style.setProperty("--my",y.toFixed(3));
  };

  return (
    <div className="zc" ref={root} onPointerMove={onPointerMove}>
      <a className="zc-skip" href="#reference">Skip to experience</a>

      <main id="reference" className="zc-reference" aria-label="Zensia Coffee">
        <Image
          src="/zensia/reference-master.png"
          alt="Zensia Coffee cinematic cafe experience with a steaming hero cup, packaged coffee, a coffee rack, recipes, cafe story and ordering section."
          width={941}
          height={1672}
          priority
          sizes="100vw"
          className="zc-reference__image"
        />

        <div className="zc-cup-focus" aria-hidden="true" />
        <div className="zc-steam" ref={steam} aria-hidden="true">
          <i className="zc-steam__strand zc-steam__strand--a" />
          <i className="zc-steam__strand zc-steam__strand--b" />
          <i className="zc-steam__strand zc-steam__strand--c" />
        </div>
        <div className="zc-pour-accent" aria-hidden="true" />

        <div id="coffee" className="zc-anchor zc-anchor--coffee" />
        <div id="recipes" className="zc-anchor zc-anchor--recipes" />
        <div id="story" className="zc-anchor zc-anchor--story" />
        <div id="visit" className="zc-anchor zc-anchor--visit" />

        <nav className="zc-hotspots" aria-label="Zensia experience navigation">
          {HOTSPOTS.map((spot,index)=>(
            <a
              key={spot.label+"-"+index}
              href={spot.href}
              aria-label={spot.label}
              style={{
                left:spot.x+"%",
                top:spot.y+"%",
                width:spot.w+"%",
                height:spot.h+"%",
              }}
            />
          ))}
        </nav>

        <section className="zc-sr">
          <h1>A Coffee Experience Worth Staying For</h1>
          <p>Specialty coffee, crafted with purpose. Zensia is a place to slow down and sip deeper.</p>
          <h2>Exceptional Coffee for Every Moment</h2>
          <p>Thoughtfully sourced coffee for curiosity, comfort, and connection.</p>
          <h2>From Our Café to Your Day</h2>
          <p>Explore Zensia coffee and café favorites.</p>
          <h2>Timeless Favorites</h2>
          <p>Explore classic coffee recipes.</p>
          <h2>Rooted in People and Coffee</h2>
          <h2>Good Coffee Brighter Days</h2>
        </section>
      </main>
    </div>
  );
}

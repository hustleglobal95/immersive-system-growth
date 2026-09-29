"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const ORDER_URL="https://zensia-coffee-llc.square.site/";
const MENU_URL="https://www.zensiacoffee.com/actual-menu";
const MAP_URL="https://www.google.com/maps/search/?api=1&query=8121+Maryland+Avenue+Saint+Louis+MO+63105";

const RACK_ITEMS=[
  "House Blend","Colombia","Ethiopia","Guatemala","Brazil","Costa Rica",
  "Kenya","French Roast","Sumatra","Nicaragua","Decaf","Espresso",
  "Vanilla","Hazelnut","Caramel","Mocha","Chocolate","Seasonal",
] as const;

const RECIPES=["Espresso","Cappuccino","Iced Latte","Mocha","Affogato"] as const;

type SliceProps={
  start:number;
  end:number;
  className:string;
  children?:React.ReactNode;
};

function ReferenceSlice({start,end,className,children}:SliceProps){
  const ratio=(end-start)/941;
  const translate=(start/1672)*100;
  return (
    <section
      className={"zc-slice "+className}
      style={{"--slice-ratio":ratio,"--slice-translate":translate+"%"} as CSSProperties}
    >
      <div className="zc-slice__plate" aria-hidden="true">
        <Image
          src="/zensia/reference-master.png"
          alt=""
          width={941}
          height={1672}
          priority={start===0}
          sizes="100vw"
          className="zc-slice__image"
        />
      </div>
      {children}
    </section>
  );
}

export function ZensiaCoffeeExperience(){
  const root=useRef<HTMLDivElement>(null);

  useLayoutEffect(()=>{
    gsap.registerPlugin(ScrollTrigger);
    const element=root.current;
    if(!element) return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const context=gsap.context(()=>{
      if(reduced) return;

      gsap.fromTo(".zc-hero-copy > *",{y:26,opacity:0},{y:0,opacity:1,duration:.85,stagger:.08,ease:"power3.out"});
      gsap.to(".zc-steam-ribbon--a",{x:22,y:-28,rotate:8,duration:3.4,repeat:-1,yoyo:true,ease:"sine.inOut"});
      gsap.to(".zc-steam-ribbon--b",{x:-18,y:-34,rotate:-7,duration:4.1,repeat:-1,yoyo:true,ease:"sine.inOut"});
      gsap.to(".zc-steam-ribbon--c",{x:13,y:-23,rotate:5,duration:3.7,repeat:-1,yoyo:true,ease:"sine.inOut"});

      gsap.fromTo(".zc-coffee-stream",{scaleY:.05,opacity:.2},{scaleY:1,opacity:.95,ease:"none",scrollTrigger:{trigger:".zc-hero",start:"65% top",end:"bottom top",scrub:.55}});
      gsap.fromTo(".zc-coffee-fill",{scaleY:.05},{scaleY:1,ease:"none",scrollTrigger:{trigger:".zc-coffee",start:"top 86%",end:"top 26%",scrub:.55}});

      gsap.utils.toArray<HTMLElement>(".zc-panel").forEach(panel=>{
        gsap.fromTo(panel,{y:28,opacity:0},{y:0,opacity:1,duration:.8,ease:"power3.out",scrollTrigger:{trigger:panel,start:"top 84%",once:true}});
      });

      gsap.to(".zc-slice__image",{yPercent:-1.2,ease:"none",scrollTrigger:{trigger:element,start:"top top",end:"bottom bottom",scrub:1}});
    },element);

    return ()=>context.revert();
  },[]);

  const onPointerMove=(event:ReactPointerEvent<HTMLDivElement>)=>{
    const bounds=event.currentTarget.getBoundingClientRect();
    const x=((event.clientX-bounds.left)/bounds.width)-.5;
    const y=((event.clientY-bounds.top)/bounds.height)-.5;
    event.currentTarget.style.setProperty("--mx",x.toFixed(3));
    event.currentTarget.style.setProperty("--my",y.toFixed(3));
  };

  return (
    <div className="zc" ref={root} onPointerMove={onPointerMove}>
      <a className="zc-skip" href="#zc-main">Skip to content</a>

      <header className="zc-header">
        <a className="zc-brand" href="#zc-main" aria-label="Zensia home">ZENSIA <span>COFFEE</span></a>
        <nav className="zc-nav" aria-label="Primary">
          <a href="#zc-coffee">Coffee</a>
          <a href={MENU_URL}>Menu</a>
          <a href="#zc-recipes">Recipes</a>
          <a href="#zc-story">Story</a>
          <a href="#zc-visit">Visit</a>
          <a className="zc-nav__order" href={ORDER_URL}>Order online</a>
        </nav>
      </header>

      <main id="zc-main">
        <ReferenceSlice start={0} end={360} className="zc-hero">
          <div className="zc-hero-copy zc-panel">
            <p className="zc-kicker">More than coffee</p>
            <h1>A Coffee Experience <em>Worth Staying For</em></h1>
            <p>Specialty coffee, crafted with purpose. From our roots to your everyday moments, Zensia is a place to slow down and sip deeper.</p>
            <div className="zc-actions">
              <a className="zc-btn zc-btn--light" href="#zc-coffee">Explore our coffee <span>→</span></a>
              <a className="zc-story-link" href="#zc-story"><i>▶</i> Watch our story</a>
            </div>
          </div>

          <div className="zc-cup-interaction" aria-label="Interactive Zensia coffee cup">
            <div className="zc-cup-glow" />
            <div className="zc-steam">
              <i className="zc-steam-ribbon zc-steam-ribbon--a" />
              <i className="zc-steam-ribbon zc-steam-ribbon--b" />
              <i className="zc-steam-ribbon zc-steam-ribbon--c" />
            </div>
          </div>

          <div className="zc-coffee-stream" aria-hidden="true" />
          <p className="zc-vertical-note" aria-hidden="true">GOOD COFFEE · BRIGHTER DAYS</p>
        </ReferenceSlice>

        <ReferenceSlice start={360} end={635} className="zc-coffee" >
          <div className="zc-panel zc-panel--cream">
            <p className="zc-kicker">Our coffee</p>
            <h2>Exceptional Coffee for <em>Every Moment</em></h2>
            <p>Thoughtfully sourced. Expertly crafted. A collection of coffees curated for curiosity, comfort, and connection.</p>
            <a className="zc-btn zc-btn--dark" href={ORDER_URL}>Shop all coffee <span>→</span></a>
          </div>
          <div className="zc-coffee-fill" aria-hidden="true" />
        </ReferenceSlice>

        <ReferenceSlice start={635} end={1000} className="zc-rack" >
          <div className="zc-panel zc-panel--dark zc-panel--rack">
            <p className="zc-kicker">Shop the favorites</p>
            <h2>From Our Café <em>to Your Day</em></h2>
            <p>Discover Zensia coffee, café favorites, and familiar coffee styles arranged like the shop wall itself.</p>
            <a className="zc-btn zc-btn--light" href={ORDER_URL}>Shop now <span>→</span></a>
          </div>
          <div className="zc-rack-hotspots" role="list" aria-label="Coffee rack">
            {RACK_ITEMS.map((item,index)=>(
              <a key={item} role="listitem" href={MENU_URL} aria-label={item} style={{"--rack-index":index} as CSSProperties}>{item}</a>
            ))}
          </div>
        </ReferenceSlice>

        <ReferenceSlice start={1000} end={1215} className="zc-recipes" >
          <div className="zc-panel zc-panel--cream zc-panel--recipes">
            <p className="zc-kicker">Coffee recipes</p>
            <h2>Timeless <em>Favorites</em></h2>
            <p>Classic coffee forms, crafted to inspire your next cup at home or in the café.</p>
            <a className="zc-btn zc-btn--dark" href={MENU_URL}>Explore all recipes <span>→</span></a>
          </div>
          <div className="zc-recipe-hotspots" role="list" aria-label="Coffee recipes">
            {RECIPES.map(recipe=><a key={recipe} role="listitem" href={MENU_URL}>{recipe}</a>)}
          </div>
        </ReferenceSlice>

        <ReferenceSlice start={1215} end={1455} className="zc-story" >
          <div className="zc-panel zc-panel--story">
            <p className="zc-kicker">Our story</p>
            <h2>Rooted in <em>People and Coffee</em></h2>
            <p>Zensia is a café built around the daily ritual: good coffee, community, warmth, and a room that invites people to stay.</p>
            <a className="zc-btn zc-btn--light" href={MAP_URL}>Our story <span>→</span></a>
          </div>
        </ReferenceSlice>

        <ReferenceSlice start={1455} end={1672} className="zc-visit" >
          <div className="zc-panel zc-panel--visit">
            <p className="zc-kicker">Visit our café or order online</p>
            <h2>Good Coffee <em>Brighter Days</em></h2>
            <p>Whether you are here for your morning routine or a moment of inspiration, Zensia is always brewing something better.</p>
            <div className="zc-actions">
              <a className="zc-btn zc-btn--light" href={ORDER_URL}>Order online <span>→</span></a>
              <a className="zc-btn zc-btn--outline" href={MAP_URL}>Find a store</a>
            </div>
          </div>
        </ReferenceSlice>
      </main>

      <footer className="zc-footer">
        <strong>ZENSIA</strong>
        <span>Coffee · St. Louis</span>
        <a href={MENU_URL}>Menu</a>
      </footer>
    </div>
  );
}

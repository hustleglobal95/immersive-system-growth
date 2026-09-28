"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createCssMaskStyle, createMaskReveal } from "@/src/lib/maskReveal";
import type { MaskRevealDefinition } from "@/src/types/experience";

const ORDER_URL="https://zensia-coffee-llc.square.site/";
const MENU_URL="https://www.zensiacoffee.com/actual-menu";
const CALM_URL="https://profile.squareup.com/loyalty/MLX5PRMQ9XZ02";
const MAP_URL="https://www.google.com/maps/search/?api=1&query=8121+Maryland+Avenue+Saint+Louis+MO+63105";

const PRODUCTS=[
  {
    id:"01",
    label:"Zen at Home",
    descriptor:"Colombian coffee for the kitchen ritual.",
    image:"https://static.wixstatic.com/media/820771_22ed744817524376bb36445174684e6f~mv2.png",
    tone:"#4a271d",
    ink:"#f4ecdc",
    accent:"#dfbb78",
    secondary:"#8d4c31",
  },
  {
    id:"02",
    label:"Zen at Home",
    descriptor:"Small-batch Colombian coffee, brought home.",
    image:"https://static.wixstatic.com/media/820771_bf96a54cf492498799ce6d63f802a93e~mv2.jpeg",
    tone:"#243326",
    ink:"#f3eddf",
    accent:"#bbc38f",
    secondary:"#6f8058",
  },
  {
    id:"03",
    label:"Zen at Home",
    descriptor:"A quieter cup, wherever the day starts.",
    image:"https://static.wixstatic.com/media/820771_21b52780336c46bbb34cb3f00829da60~mv2.jpg",
    tone:"#6a3f28",
    ink:"#f8eedc",
    accent:"#e6c47e",
    secondary:"#a75f3b",
  },
  {
    id:"04",
    label:"Zen at Home",
    descriptor:"Colombian origin, prepared your way.",
    image:"https://static.wixstatic.com/media/820771_3db723033b014dd9a51fb2b01ed1fb95~mv2.jpg",
    tone:"#31211d",
    ink:"#f3e8d8",
    accent:"#d09266",
    secondary:"#785140",
  },
] as const;

const PROFILE_IMAGES=[
  "https://static.wixstatic.com/media/859566_b618d3f2dc39473fa45047c95e676872~mv2.jpg",
  "https://static.wixstatic.com/media/859566_90db78bfbd21470fafaf59bd0646b4ba~mv2.jpg",
  "https://static.wixstatic.com/media/859566_dda43df0514841eea1663f508724fcef~mv2.jpg",
  "https://static.wixstatic.com/media/859566_26ddc1aef049454db886a6bd9d84b5b6~mv2.jpg",
] as const;

const COFFEE_PROFILES=[
  ["01","Intense & flavorful",PROFILE_IMAGES[0]],
  ["02","Creamy & smooth",PROFILE_IMAGES[1]],
  ["03","Robust & aromatic",PROFILE_IMAGES[2]],
  ["04","Refreshing & bold",PROFILE_IMAGES[3]],
] as const;

const PROFILE_MASK=createMaskReveal("linear-soft",{renderer:"dom",direction:"up",softness:10});
const ORIGIN_MASK=createMaskReveal("ink-spread",{renderer:"dom",origin:[46,52],softness:15,scale:1.04,intensity:1.18,seed:607});
const CLUB_MASK=createMaskReveal("radial-iris",{renderer:"dom",origin:[52,48],softness:12,scale:1.05});
const HERO_MASK=createMaskReveal("diagonal-cut",{renderer:"dom",direction:"up",softness:10,rotation:-7});

function applyMaskProgress(node:HTMLElement,progress:number,mask:MaskRevealDefinition){
  const style=createCssMaskStyle(progress,mask);
  const set=(property:string,value:unknown)=>{
    if(value===undefined||value===null) node.style.removeProperty(property);
    else node.style.setProperty(property,String(value));
  };
  set("-webkit-mask-image",style.WebkitMaskImage);
  set("mask-image",style.maskImage);
  set("-webkit-mask-size",style.WebkitMaskSize);
  set("mask-size",style.maskSize);
  set("-webkit-mask-repeat",style.WebkitMaskRepeat);
  set("mask-repeat",style.maskRepeat);
  set("-webkit-mask-position",style.WebkitMaskPosition);
  set("mask-position",style.maskPosition);
}

function KineticObjects(){
  return (
    <div className="zi-object-field" aria-hidden="true">
      <div className="zi-orbit zi-orbit--outer">
        <span className="zi-orbit__node zi-orbit__node--a">ORIGIN</span>
        <span className="zi-orbit__node zi-orbit__node--b">ROAST</span>
        <span className="zi-orbit__node zi-orbit__node--c">POUR</span>
        <span className="zi-orbit__node zi-orbit__node--d">STAY</span>
      </div>
      <div className="zi-orbit zi-orbit--inner">
        <span />
        <span />
        <span />
      </div>
      <div className="zi-seal">
        <span>COLOMBIA</span>
        <strong>Z</strong>
        <small>ST. LOUIS</small>
      </div>
      <div className="zi-steam zi-steam--1" />
      <div className="zi-steam zi-steam--2" />
      <div className="zi-steam zi-steam--3" />
      <div className="zi-fragment zi-fragment--one">CALM</div>
      <div className="zi-fragment zi-fragment--two">RITUAL</div>
      <div className="zi-fragment zi-fragment--three">COFFEE</div>
      <div className="zi-photo-chip zi-photo-chip--one">
        <Image src={PROFILE_IMAGES[0]} alt="" fill sizes="140px" />
      </div>
      <div className="zi-photo-chip zi-photo-chip--two">
        <Image src={PROFILE_IMAGES[2]} alt="" fill sizes="120px" />
      </div>
    </div>
  );
}

export function ZensiaImaginationExperience(){
  const root=useRef<HTMLDivElement>(null);
  const stage=useRef<HTMLDivElement>(null);
  const [activeProduct,setActiveProduct]=useState(0);
  const product=PRODUCTS[activeProduct];

  useLayoutEffect(()=>{
    gsap.registerPlugin(ScrollTrigger);
    const element=root.current;
    if(!element) return;

    const context=gsap.context(()=>{
      const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const revealMask=(node:HTMLElement,mask:MaskRevealDefinition,start="top 94%",end="top 48%")=>{
        if(reduced){
          applyMaskProgress(node,1,mask);
          return;
        }
        applyMaskProgress(node,0,mask);
        ScrollTrigger.create({
          trigger:node,
          start,
          end,
          onRefresh:self=>applyMaskProgress(node,self.progress,mask),
          onUpdate:self=>applyMaskProgress(node,self.progress,mask),
        });
      };

      gsap.utils.toArray<HTMLElement>("[data-zi-mask='profile']").forEach(node=>revealMask(node,PROFILE_MASK));
      gsap.utils.toArray<HTMLElement>("[data-zi-mask='origin']").forEach(node=>revealMask(node,ORIGIN_MASK,"top 96%","top 38%"));
      gsap.utils.toArray<HTMLElement>("[data-zi-mask='club']").forEach(node=>revealMask(node,CLUB_MASK));

      if(reduced) return;

      const intro=gsap.timeline({defaults:{ease:"power3.out"}});
      intro
        .fromTo(".zi-header",{yPercent:-110},{yPercent:0,duration:.72},0)
        .fromTo(".zi-hero__eyebrow",{y:18,opacity:0},{y:0,opacity:1,duration:.6},.08)
        .fromTo(".zi-hero h1",{clipPath:"inset(0 0 100% 0)",yPercent:10},{clipPath:"inset(0 0 0% 0)",yPercent:0,duration:1.05,ease:"expo.out"},.12)
        .fromTo(".zi-hero__body",{y:26,opacity:0},{y:0,opacity:1,duration:.75},.28)
        .fromTo(".zi-hero__actions a",{y:18,opacity:0},{y:0,opacity:1,duration:.62,stagger:.08},.38)
        .fromTo(".zi-product-stage",{xPercent:9,rotateZ:4,scale:.92,opacity:0},{xPercent:0,rotateZ:0,scale:1,opacity:1,duration:1.15,ease:"power4.out"},.16)
        .fromTo(".zi-object-field > *",{scale:.7,opacity:0},{scale:1,opacity:1,duration:.85,stagger:.055,ease:"back.out(1.35)"},.3)
        .fromTo(".zi-product-switcher",{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:.9,ease:"expo.out"},.46);

      gsap.to(".zi-orbit--outer",{rotate:360,duration:28,repeat:-1,ease:"none"});
      gsap.to(".zi-orbit--inner",{rotate:-360,duration:17,repeat:-1,ease:"none"});
      gsap.to(".zi-seal",{rotate:-12,y:-12,duration:4.8,repeat:-1,yoyo:true,ease:"sine.inOut"});
      gsap.to(".zi-steam--1",{y:-22,x:6,rotate:5,duration:3.4,repeat:-1,yoyo:true,ease:"sine.inOut"});
      gsap.to(".zi-steam--2",{y:-30,x:-7,rotate:-6,duration:4.1,repeat:-1,yoyo:true,ease:"sine.inOut"});
      gsap.to(".zi-steam--3",{y:-18,x:4,rotate:4,duration:3.8,repeat:-1,yoyo:true,ease:"sine.inOut"});
      gsap.to(".zi-photo-chip--one",{y:-16,rotate:4,duration:4.4,repeat:-1,yoyo:true,ease:"sine.inOut"});
      gsap.to(".zi-photo-chip--two",{y:14,rotate:-5,duration:5.1,repeat:-1,yoyo:true,ease:"sine.inOut"});

      gsap.utils.toArray<HTMLElement>("[data-zi-reveal]").forEach(node=>{
        gsap.fromTo(node,{y:34,opacity:0},{
          y:0,opacity:1,duration:.85,ease:"power3.out",
          scrollTrigger:{trigger:node,start:"top 88%",once:true},
        });
      });

      gsap.utils.toArray<HTMLElement>(".zi h2").forEach(node=>{
        gsap.fromTo(node,{clipPath:"inset(0 0 100% 0)",yPercent:10},{
          clipPath:"inset(0 0 0% 0)",yPercent:0,duration:1,ease:"expo.out",
          scrollTrigger:{trigger:node,start:"top 90%",once:true},
        });
      });

      const mm=gsap.matchMedia();

      mm.add("(min-width: 981px)",()=>{
        gsap.to(".zi-hero__ghost",{
          xPercent:-10,
          ease:"none",
          scrollTrigger:{trigger:".zi-hero",start:"top top",end:"bottom top",scrub:.75},
        });
        gsap.to(".zi-hero__copy",{
          yPercent:-9,
          ease:"none",
          scrollTrigger:{trigger:".zi-hero",start:"top top",end:"bottom top",scrub:.75},
        });
        gsap.to(".zi-product-stage",{
          yPercent:14,scale:.9,rotateZ:-2,
          ease:"none",
          scrollTrigger:{trigger:".zi-hero",start:"top top",end:"bottom top",scrub:.8},
        });
        gsap.to(".zi-object-field",{
          yPercent:-9,rotateZ:4,
          ease:"none",
          scrollTrigger:{trigger:".zi-hero",start:"top top",end:"bottom top",scrub:.85},
        });
        gsap.to(".zi-fragment--one",{xPercent:-46,yPercent:-28,ease:"none",scrollTrigger:{trigger:".zi-hero",start:"top top",end:"bottom top",scrub:.7}});
        gsap.to(".zi-fragment--two",{xPercent:36,yPercent:22,ease:"none",scrollTrigger:{trigger:".zi-hero",start:"top top",end:"bottom top",scrub:.78}});
        gsap.to(".zi-photo-chip--one",{xPercent:-22,ease:"none",scrollTrigger:{trigger:".zi-hero",start:"top top",end:"bottom top",scrub:.74}});
        gsap.to(".zi-photo-chip--two",{xPercent:30,ease:"none",scrollTrigger:{trigger:".zi-hero",start:"top top",end:"bottom top",scrub:.82}});

        const kinetic=gsap.timeline({
          scrollTrigger:{trigger:".zi-kinetic",start:"top top",end:"bottom bottom",scrub:.8},
        });
        kinetic
          .fromTo(".zi-kinetic__word--origin",{xPercent:-40},{xPercent:18,ease:"none"},0)
          .fromTo(".zi-kinetic__word--ritual",{xPercent:38},{xPercent:-14,ease:"none"},0)
          .fromTo(".zi-kinetic__disc",{rotate:-22,scale:.76},{rotate:58,scale:1.08,ease:"none"},0)
          .fromTo(".zi-kinetic__orbit",{rotate:0},{rotate:245,ease:"none"},0)
          .fromTo(".zi-kinetic__tile--a",{xPercent:-26,yPercent:28,rotate:-10},{xPercent:12,yPercent:-26,rotate:6,ease:"none"},0)
          .fromTo(".zi-kinetic__tile--b",{xPercent:22,yPercent:-24,rotate:8},{xPercent:-12,yPercent:30,rotate:-8,ease:"none"},0);

        gsap.utils.toArray<HTMLElement>(".zi-profile__image img").forEach((image,index)=>{
          gsap.fromTo(image,{scale:1.14,yPercent:index%2===0?-5:4},{
            scale:1.01,yPercent:index%2===0?6:-5,ease:"none",
            scrollTrigger:{trigger:image.closest(".zi-profile")??image,start:"top bottom",end:"bottom top",scrub:.75},
          });
        });

        gsap.fromTo(".zi-origin-story__media img",{scale:1.14,yPercent:-5},{
          scale:1.02,yPercent:5,ease:"none",
          scrollTrigger:{trigger:".zi-origin-story",start:"top bottom",end:"bottom top",scrub:.85},
        });
        gsap.fromTo(".zi-club__visual",{yPercent:8,rotateZ:-2.5},{
          yPercent:-8,rotateZ:2.5,ease:"none",
          scrollTrigger:{trigger:".zi-club",start:"top bottom",end:"bottom top",scrub:.82},
        });
      });

      mm.add("(max-width: 980px)",()=>{
        gsap.to(".zi-object-field",{yPercent:-3,ease:"none",scrollTrigger:{trigger:".zi-hero",start:"top top",end:"bottom top",scrub:.5}});
        gsap.to(".zi-product-stage",{yPercent:5,scale:.97,ease:"none",scrollTrigger:{trigger:".zi-hero",start:"top top",end:"bottom top",scrub:.5}});
        gsap.to(".zi-kinetic__disc",{rotate:38,scale:1.03,ease:"none",scrollTrigger:{trigger:".zi-kinetic",start:"top 82%",end:"bottom 20%",scrub:.55}});
      });

      return()=>mm.revert();
    },element);

    return()=>context.revert();
  },[]);

  useLayoutEffect(()=>{
    const element=root.current;
    const image=element?.querySelector<HTMLElement>(".zi-product-stage__image");
    if(!image) return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(reduced){
      applyMaskProgress(image,1,HERO_MASK);
      return;
    }
    const state={progress:0};
    applyMaskProgress(image,0,HERO_MASK);
    const maskTween=gsap.to(state,{
      progress:1,duration:.88,ease:"power3.inOut",
      onUpdate:()=>applyMaskProgress(image,state.progress,HERO_MASK),
    });
    const productTween=gsap.fromTo(image,{y:28,rotateZ:2.2,scale:1.05},{y:0,rotateZ:0,scale:1,duration:.9,ease:"power3.out"});
    return()=>{maskTween.kill();productTween.kill();};
  },[activeProduct]);

  const onProductMove=(event:React.PointerEvent<HTMLDivElement>)=>{
    const node=stage.current;
    const element=root.current;
    if(!node||!element) return;
    const rect=event.currentTarget.getBoundingClientRect();
    const px=(event.clientX-rect.left)/rect.width-.5;
    const py=(event.clientY-rect.top)/rect.height-.5;
    gsap.to(node,{rotateY:px*8,rotateX:py*-6,x:px*12,y:py*9,duration:.45,ease:"power2.out",transformPerspective:1100});
    gsap.to(element.querySelectorAll(".zi-object-field > *"),{
      x:px*-18,y:py*-14,duration:.65,ease:"power2.out",stagger:.012,
    });
  };

  const resetProduct=()=>{
    const node=stage.current;
    const element=root.current;
    if(node) gsap.to(node,{rotateY:0,rotateX:0,x:0,y:0,duration:.7,ease:"power3.out"});
    if(element) gsap.to(element.querySelectorAll(".zi-object-field > *"),{x:0,y:0,duration:.8,ease:"power3.out"});
  };

  return (
    <div
      ref={root}
      className="zi"
      style={{
        "--zi-tone":product.tone,
        "--zi-ink":product.ink,
        "--zi-accent":product.accent,
        "--zi-secondary":product.secondary,
      } as React.CSSProperties}
    >
      <a className="zi-skip" href="#zi-main">Skip to content</a>

      <header className="zi-header">
        <a href="#zi-main" className="zi-brand" aria-label="Zensia Coffee home">ZENSIA <span>COFFEE</span></a>
        <p className="zi-origin-line">COLOMBIAN SPECIALTY COFFEE · CLAYTON, ST. LOUIS</p>
        <nav className="zi-nav" aria-label="Primary">
          <a href={MENU_URL} target="_blank" rel="noreferrer">Menu</a>
          <a href="#zi-coffee">Coffee</a>
          <a href="#zi-visit">Visit</a>
          <a className="zi-nav__order" href={ORDER_URL} target="_blank" rel="noreferrer">Order online</a>
        </nav>
      </header>

      <main id="zi-main">
        <section className="zi-hero" aria-labelledby="zi-hero-title">
          <div className="zi-hero__ghost" aria-hidden="true">ZENSIA</div>

          <div className="zi-hero__copy">
            <p className="zi-eyebrow zi-hero__eyebrow">COLOMBIA → ST. LOUIS</p>
            <h1 id="zi-hero-title">Coffee,<span>with room to stay.</span></h1>
            <p className="zi-hero__body">Colombian specialty coffee, prepared with intention and served in a space made for slowing down.</p>
            <div className="zi-hero__actions">
              <a href={ORDER_URL} target="_blank" rel="noreferrer">Order online <span aria-hidden="true">↗</span></a>
              <a href={MENU_URL} target="_blank" rel="noreferrer">View menu</a>
            </div>
          </div>

          <div className="zi-product-wrap" onPointerMove={onProductMove} onPointerLeave={resetProduct}>
            <KineticObjects />
            <div ref={stage} className="zi-product-stage" aria-live="polite">
              <div className="zi-product-stage__halo" aria-hidden="true" />
              <Image
                key={product.image}
                src={product.image}
                alt="Zensia Zen at Home Colombian coffee"
                fill
                priority
                sizes="(max-width: 900px) 74vw, 44vw"
                className="zi-product-stage__image"
              />
              <div className="zi-product-stage__label">
                <span>{product.id}</span>
                <strong>{product.label}</strong>
                <p>{product.descriptor}</p>
              </div>
            </div>
          </div>

          <div className="zi-product-switcher" role="group" aria-label="Choose a Zensia coffee product">
            {PRODUCTS.map((item,index)=>(
              <button key={item.id} type="button" aria-pressed={activeProduct===index} onClick={()=>setActiveProduct(index)}>
                <span>{item.id}</span><b>{item.label}</b>
              </button>
            ))}
          </div>
        </section>

        <section className="zi-kinetic" aria-labelledby="zi-kinetic-title">
          <div className="zi-kinetic__sticky">
            <div className="zi-kinetic__word zi-kinetic__word--origin" aria-hidden="true">ORIGIN</div>
            <div className="zi-kinetic__word zi-kinetic__word--ritual" aria-hidden="true">RITUAL</div>

            <div className="zi-kinetic__center">
              <div className="zi-kinetic__orbit" aria-hidden="true">
                <span>POUR</span><span>AROMA</span><span>STAY</span><span>CALM</span>
              </div>
              <div className="zi-kinetic__disc">
                <Image src={PROFILE_IMAGES[1]} alt="" fill sizes="42vw" />
              </div>
              <div className="zi-kinetic__core">
                <p className="zi-eyebrow">THE RITUAL</p>
                <h2 id="zi-kinetic-title">A cup can<br/><em>change the pace.</em></h2>
              </div>
            </div>

            <div className="zi-kinetic__tile zi-kinetic__tile--a">
              <Image src={PROFILE_IMAGES[3]} alt="" fill sizes="220px" />
              <span>COLD / BOLD</span>
            </div>
            <div className="zi-kinetic__tile zi-kinetic__tile--b">
              <Image src={PROFILE_IMAGES[0]} alt="" fill sizes="220px" />
              <span>ESPRESSO / INTENSE</span>
            </div>
          </div>
        </section>

        <section id="zi-coffee" className="zi-intro">
          <div className="zi-intro__copy" data-zi-reveal>
            <p className="zi-eyebrow">THE COFFEE</p>
            <h2>One origin.<br/><em>More than one mood.</em></h2>
            <p>Zensia&apos;s public menu moves across bold espresso, creamy milk drinks, aromatic classics and cold coffee. The visual language now moves with those contrasts instead of flattening them into cards.</p>
          </div>

          <div className="zi-profile-grid">
            {COFFEE_PROFILES.map(([id,label,image])=>(
              <article key={id} className="zi-profile" data-zi-reveal>
                <div className="zi-profile__image" data-zi-mask="profile">
                  <Image src={image} alt={label} fill sizes="(max-width:700px) 90vw,24vw" />
                </div>
                <div className="zi-profile__meta"><span>{id}</span><h3>{label}</h3></div>
              </article>
            ))}
          </div>
        </section>

        <section className="zi-origin-story">
          <div className="zi-origin-story__media" data-zi-mask="origin">
            <Image src="https://static.wixstatic.com/media/859566_6b7702b0813d4b9388ff1a8752200691~mv2.png" alt="Zensia Coffee" fill sizes="(max-width:900px) 100vw,58vw" />
          </div>
          <div className="zi-origin-story__copy" data-zi-reveal>
            <p className="zi-eyebrow">FROM COLOMBIA</p>
            <h2>Origin is part<br/>of the <em>experience.</em></h2>
            <p>Zensia was created to share Colombian coffee through more than flavor alone — preparation, atmosphere, hospitality and the time you give the cup all matter.</p>
            <a href="#zi-visit">Find your pause <span aria-hidden="true">↓</span></a>
          </div>
          <div className="zi-origin-story__stamp" aria-hidden="true"><span>COLOMBIA</span><span>ST. LOUIS</span></div>
        </section>

        <section className="zi-club">
          <div className="zi-club__visual" data-zi-mask="club">
            <Image src="https://static.wixstatic.com/media/859566_dbb60c0fa9a444e589c870551afbcb7b~mv2.png" alt="Zensia Calm Club rewards" fill sizes="(max-width:900px) 88vw,42vw" />
            <div className="zi-club__ring zi-club__ring--one" aria-hidden="true" />
            <div className="zi-club__ring zi-club__ring--two" aria-hidden="true" />
          </div>
          <div className="zi-club__copy" data-zi-reveal>
            <p className="zi-eyebrow">CALM CLUB</p>
            <h2>Good coffee.<br/>Good calm.<br/><em>Rewards too.</em></h2>
            <p>Earn Zen when you visit and redeem it for treats, perks and future pauses.</p>
            <a href={CALM_URL} target="_blank" rel="noreferrer">Join Calm Club <span aria-hidden="true">↗</span></a>
          </div>
        </section>

        <section id="zi-visit" className="zi-visit">
          <div className="zi-visit__top" data-zi-reveal>
            <p className="zi-eyebrow">YOUR PAUSE STARTS HERE</p>
            <h2>Come for the coffee.<br/><em>Stay for the room.</em></h2>
          </div>
          <div className="zi-visit__grid">
            <a className="zi-visit__primary" href={MAP_URL} target="_blank" rel="noreferrer">
              <span>VISIT ZENSIA</span>
              <strong>8121 Maryland Avenue</strong>
              <small>Saint Louis, MO 63105</small>
              <b aria-hidden="true">↗</b>
            </a>
            <div className="zi-visit__links">
              <a href={ORDER_URL} target="_blank" rel="noreferrer"><span>Order online</span><b>↗</b></a>
              <a href={MENU_URL} target="_blank" rel="noreferrer"><span>View menu</span><b>↗</b></a>
              <a href={CALM_URL} target="_blank" rel="noreferrer"><span>Join Calm Club</span><b>↗</b></a>
            </div>
          </div>
          <footer className="zi-footer">
            <a href="#zi-main">ZENSIA COFFEE</a>
            <p>COLOMBIAN SPECIALTY COFFEE · CLAYTON, ST. LOUIS</p>
            <span>CONCEPT EXPERIENCE / FORGE</span>
          </footer>
        </section>
      </main>
    </div>
  );
}

"use client";
/* eslint-disable @next/next/no-img-element */

import { useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const ORDER_URL="https://zensia-coffee-llc.square.site/";
const MENU_URL="https://www.zensiacoffee.com/actual-menu";
const MAP_URL="https://www.google.com/maps/search/?api=1&query=8121+Maryland+Avenue+Saint+Louis+MO+63105";

const HERO_BG="https://static.wixstatic.com/media/859566_6b7702b0813d4b9388ff1a8752200691~mv2.png";
const ESPRESSO="https://static.wixstatic.com/media/859566_b618d3f2dc39473fa45047c95e676872~mv2.jpg";
const LATTE="https://static.wixstatic.com/media/859566_90db78bfbd21470fafaf59bd0646b4ba~mv2.jpg";
const CAPPUCCINO="https://static.wixstatic.com/media/859566_dda43df0514841eea1663f508724fcef~mv2.jpg";
const COLD_BREW="https://static.wixstatic.com/media/859566_26ddc1aef049454db886a6bd9d84b5b6~mv2.jpg";
const PANDEBONO="https://static.wixstatic.com/media/859566_c2dd3549ae574e75a12c2e5289b11818~mv2.jpg";

const BAGS=[
  {name:"Colombian",src:"https://static.wixstatic.com/media/820771_22ed744817524376bb36445174684e6f~mv2.png"},
  {name:"Guatemala",src:"https://static.wixstatic.com/media/820771_bf96a54cf492498799ce6d63f802a93e~mv2.jpeg"},
  {name:"Zen at Home",src:"https://static.wixstatic.com/media/820771_21b52780336c46bbb34cb3f00829da60~mv2.jpg"},
  {name:"House Selection",src:"https://static.wixstatic.com/media/820771_3db723033b014dd9a51fb2b01ed1fb95~mv2.jpg"},
] as const;

const RECIPES=[
  {name:"Espresso",src:ESPRESSO,note:"Bold, rich, iconic."},
  {name:"Cappuccino",src:CAPPUCCINO,note:"Velvety, balanced, classic."},
  {name:"Iced Latte",src:LATTE,note:"Chilled, smooth, refreshing."},
  {name:"Mocha",src:LATTE,note:"Coffee, milk, chocolate."},
  {name:"Cold Brew",src:COLD_BREW,note:"Slow, cold extraction with a clean finish."},
] as const;

const RACK_LABELS=[
  "Whole Bean","Ground","Cold Brew","Ready to Drink","Merch",
  "Espresso","Breakfast","Decaf","Mocha","Matcha","Vanilla","Seasonal",
] as const;

function HeroCup(){
  return (
    <div className="zc-cup-stage" aria-hidden="true">
      <div className="zc-steam">
        <i className="zc-steam__strand zc-steam__strand--1" />
        <i className="zc-steam__strand zc-steam__strand--2" />
        <i className="zc-steam__strand zc-steam__strand--3" />
      </div>
      <div className="zc-cup">
        <div className="zc-cup__rim" />
        <div className="zc-cup__coffee">
          <i className="zc-latte zc-latte--1" />
          <i className="zc-latte zc-latte--2" />
          <i className="zc-latte zc-latte--3" />
        </div>
        <div className="zc-cup__mark">Z</div>
        <div className="zc-cup__handle" />
      </div>
      <div className="zc-saucer" />
      <div className="zc-pour-stream" />
    </div>
  );
}

export function ZensiaCoffeeExperience(){
  const root=useRef<HTMLDivElement>(null);

  useLayoutEffect(()=>{
    gsap.registerPlugin(ScrollTrigger);
    const el=root.current;
    if(!el) return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx=gsap.context(()=>{
      if(reduced) return;

      gsap.from(".zc-hero-copy > *",{y:34,opacity:0,duration:.9,stagger:.08,ease:"power3.out"});
      gsap.from(".zc-header",{y:-18,opacity:0,duration:.7,ease:"power2.out"});

      gsap.to(".zc-steam__strand--1",{x:20,y:-28,rotate:9,duration:3.4,repeat:-1,yoyo:true,ease:"sine.inOut"});
      gsap.to(".zc-steam__strand--2",{x:-16,y:-36,rotate:-7,duration:4.2,repeat:-1,yoyo:true,ease:"sine.inOut"});
      gsap.to(".zc-steam__strand--3",{x:12,y:-24,rotate:5,duration:3.8,repeat:-1,yoyo:true,ease:"sine.inOut"});

      gsap.timeline({
        scrollTrigger:{trigger:".zc-hero",start:"top top",end:"bottom top",scrub:.8}
      })
        .to(".zc-cup-stage",{xPercent:-15,yPercent:52,scale:.77,rotate:-13,ease:"none"},0)
        .to(".zc-pour-stream",{scaleY:1,opacity:1,ease:"none"},.35)
        .to(".zc-steam",{opacity:.35,ease:"none"},.55);

      gsap.fromTo(".zc-glass__fill",{scaleY:.04},{scaleY:1,ease:"none",scrollTrigger:{trigger:".zc-coffee",start:"top 82%",end:"top 22%",scrub:.65}});
      gsap.to(".zc-cup-stage",{opacity:0,yPercent:82,ease:"none",scrollTrigger:{trigger:".zc-coffee",start:"58% center",end:"bottom 28%",scrub:.7}});

      gsap.utils.toArray<HTMLElement>(".zc-reveal").forEach(node=>{
        gsap.from(node,{y:38,opacity:0,duration:.85,ease:"power3.out",scrollTrigger:{trigger:node,start:"top 86%",once:true}});
      });

      gsap.fromTo(".zc-rack__row--top",{xPercent:-2},{xPercent:1.4,ease:"none",scrollTrigger:{trigger:".zc-rack",start:"top bottom",end:"bottom top",scrub:.8}});
      gsap.fromTo(".zc-rack__row--bottom",{xPercent:2},{xPercent:-1.4,ease:"none",scrollTrigger:{trigger:".zc-rack",start:"top bottom",end:"bottom top",scrub:.8}});
      gsap.fromTo(".zc-story__photo img",{scale:1.08},{scale:1,ease:"none",scrollTrigger:{trigger:".zc-story",start:"top bottom",end:"bottom top",scrub:.8}});
    },el);

    return ()=>ctx.revert();
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
      <a className="zc-skip" href="#main">Skip to content</a>

      <header className="zc-header">
        <a className="zc-brand" href="#main">ZENSIA <span>COFFEE</span></a>
        <nav className="zc-nav" aria-label="Primary">
          <a href="#coffee">Coffee</a>
          <a href={MENU_URL}>Menu</a>
          <a href="#recipes">Recipes</a>
          <a href="#story">Story</a>
          <a href="#visit">Visit</a>
        </nav>
        <div className="zc-header__actions">
          <a aria-label="View menu" href={MENU_URL}>⌕</a>
          <a className="zc-order" href={ORDER_URL}>Order online</a>
        </div>
      </header>

      <HeroCup />

      <main id="main">
        <section className="zc-hero">
          <img className="zc-hero__bg" src={HERO_BG} alt="" />
          <div className="zc-hero__shade" />
          <div className="zc-hero-copy">
            <p className="zc-kicker">More than coffee</p>
            <h1>A Coffee Experience <em>Worth Staying For</em></h1>
            <p>Specialty Colombian coffee, crafted with purpose. From its roots to your everyday moments, Zensia is a place to slow down and sip deeper.</p>
            <div className="zc-actions">
              <a className="zc-button zc-button--light" href="#coffee">Explore our coffee <span>→</span></a>
              <a className="zc-watch" href="#story"><span>▶</span> Watch our story</a>
            </div>
          </div>
          <p className="zc-side-note">GOOD<br/>COFFEE<br/>BRIGHTER<br/>DAYS</p>
        </section>

        <section className="zc-coffee" id="coffee">
          <div className="zc-coffee__copy zc-reveal">
            <p className="zc-kicker">Our coffee</p>
            <h2>Exceptional Coffee for <em>Every Moment</em></h2>
            <p>Thoughtfully sourced. Expertly crafted. A collection of coffees curated for curiosity, comfort, and connection.</p>
            <a className="zc-button zc-button--dark" href={ORDER_URL}>Shop all coffee <span>→</span></a>
          </div>

          <div className="zc-coffee__scene">
            <div className="zc-glass" aria-hidden="true"><div className="zc-glass__fill" /><span>Z</span></div>
            <div className="zc-bag-pair">
              <article className="zc-bag zc-bag--dark"><img src={BAGS[0].src} alt={BAGS[0].name}/></article>
              <article className="zc-bag zc-bag--light"><img src={BAGS[1].src} alt={BAGS[1].name}/></article>
            </div>
            <div className="zc-drinks">
              <img src={LATTE} alt="Zensia latte"/>
              <img src={COLD_BREW} alt="Zensia cold brew"/>
            </div>
          </div>
        </section>

        <section className="zc-rack" id="rack">
          <div className="zc-rack__copy zc-reveal">
            <p className="zc-kicker">Shop the favorites</p>
            <h2>From Our Café <em>to Your Day</em></h2>
            <p>Discover Zensia coffee, everyday café favorites, and coffee rituals arranged like the shop wall itself.</p>
            <a className="zc-button zc-button--light" href={ORDER_URL}>Shop now <span>→</span></a>
          </div>

          <div className="zc-rack__tabs">
            <span>Whole Bean</span><span>Ground</span><span>Cold Brew</span><span>Ready to Drink</span><span>Merch</span>
          </div>

          <div className="zc-rack__case">
            <div className="zc-rack__row zc-rack__row--top">
              {BAGS.map((bag,index)=><div className="zc-rack__bag" key={bag.name+index}><img src={bag.src} alt={bag.name}/></div>)}
              <div className="zc-rack__bottle"><span>Z</span><small>COLD BREW</small></div>
              <div className="zc-rack__bottle zc-rack__bottle--amber"><span>Z</span><small>READY</small></div>
              <div className="zc-rack__bottle"><span>Z</span><small>COFFEE</small></div>
            </div>
            <div className="zc-rack__row zc-rack__row--middle">
              <div className="zc-jar"><i/><span>BEANS</span></div>
              <div className="zc-jar"><i/><span>COLOMBIA</span></div>
              <div className="zc-merch-cup"><span>Z</span></div>
              <div className="zc-pourover">▽</div>
              <img className="zc-pandebono" src={PANDEBONO} alt="Zensia pan de bono"/>
            </div>
            <div className="zc-rack__row zc-rack__row--bottom">
              {RACK_LABELS.slice(5).map((label,index)=><div className={"zc-label-bag zc-label-bag--"+(index%4)} key={label}><strong>Z</strong><span>{label}</span></div>)}
            </div>
          </div>
        </section>

        <section className="zc-recipes" id="recipes">
          <div className="zc-recipes__intro zc-reveal">
            <p className="zc-kicker">Coffee recipes</p>
            <h2>Timeless <em>Favorites</em></h2>
            <p>Classic recipes, crafted to inspire your next cup at home or in the café.</p>
            <a className="zc-button zc-button--dark" href={MENU_URL}>Explore all recipes <span>→</span></a>
          </div>
          <div className="zc-recipe-track">
            {RECIPES.map(recipe=>(
              <article className="zc-recipe-card zc-reveal" key={recipe.name}>
                <div className="zc-recipe-card__media"><img src={recipe.src} alt={recipe.name}/></div>
                <h3>{recipe.name}</h3>
                <p>{recipe.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="zc-story" id="story">
          <div className="zc-story__photo"><img src={HERO_BG} alt="Zensia Coffee cafe experience"/></div>
          <div className="zc-story__mantra" aria-hidden="true">GOOD<br/>PEOPLE<br/>GREAT<br/>COFFEE<br/>BRIGHTER<br/>DAYS</div>
          <div className="zc-story__copy zc-reveal">
            <p className="zc-kicker">Our story</p>
            <h2>Rooted in <em>People and Coffee</em></h2>
            <p>Zensia began with a simple belief: great coffee brings people together. Colombian roots, thoughtful craft, and a room designed for presence come together in every cup.</p>
            <a className="zc-button zc-button--light" href={MAP_URL}>Our story <span>→</span></a>
          </div>
        </section>

        <section className="zc-visit" id="visit">
          <div className="zc-visit__bg"><img src={HERO_BG} alt="Zensia Coffee"/></div>
          <div className="zc-visit__shade"/>
          <div className="zc-visit__copy zc-reveal">
            <p className="zc-kicker">Visit our café or order online</p>
            <h2>Good Coffee <em>Brighter Days</em></h2>
            <p>Whether you are here for your morning routine, a mid-day reset, or a moment of inspiration, Zensia is always brewing something better.</p>
            <div className="zc-actions">
              <a className="zc-button zc-button--light" href={ORDER_URL}>Order online <span>→</span></a>
              <a className="zc-button zc-button--outline" href={MAP_URL}>Find a store</a>
            </div>
          </div>
          <div className="zc-visit__services">
            <span><b>☕</b><strong>Order Online</strong><small>Fresh coffee, delivered to your door.</small></span>
            <span><b>⌂</b><strong>Visit Our Café</strong><small>Experience Zensia in person.</small></span>
            <span><b>◇</b><strong>Coffee for Gifting</strong><small>Share a brighter day.</small></span>
          </div>
        </section>
      </main>
    </div>
  );
}

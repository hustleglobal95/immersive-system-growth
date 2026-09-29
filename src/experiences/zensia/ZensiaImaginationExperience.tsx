"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ZensiaImmersiveMenu } from "./ZensiaImmersiveMenu";
import { ZensiaHeroCup } from "./ZensiaHeroCup";

const ORDER_URL = "https://zensia-coffee-llc.square.site/";
const CALM_URL = "https://profile.squareup.com/loyalty/MLX5PRMQ9XZ02";
const MAP_URL = "https://www.google.com/maps/search/?api=1&query=8121+Maryland+Avenue+Saint+Louis+MO+63105";

const PRODUCTS = [
  {
    id: "01",
    label: "Zen at Home",
    note: "Colombian coffee for the kitchen ritual.",
    image: "https://static.wixstatic.com/media/820771_22ed744817524376bb36445174684e6f~mv2.png",
  },
  {
    id: "02",
    label: "Zen at Home",
    note: "Small-batch Colombian coffee, brought home.",
    image: "https://static.wixstatic.com/media/820771_bf96a54cf492498799ce6d63f802a93e~mv2.jpeg",
  },
  {
    id: "03",
    label: "Zen at Home",
    note: "A quieter cup, wherever the day starts.",
    image: "https://static.wixstatic.com/media/820771_21b52780336c46bbb34cb3f00829da60~mv2.jpg",
  },
  {
    id: "04",
    label: "Zen at Home",
    note: "Colombian origin, prepared your way.",
    image: "https://static.wixstatic.com/media/820771_3db723033b014dd9a51fb2b01ed1fb95~mv2.jpg",
  },
] as const;

const RECIPES = [
  { name: "Espresso", ratio: "1 : 2", detail: "18g coffee · 36g yield · 28 sec", accent: "Deep / concentrated" },
  { name: "Cappuccino", ratio: "1 : 1 : 1", detail: "Espresso · steamed milk · microfoam", accent: "Creamy / balanced" },
  { name: "Cold Brew", ratio: "1 : 8", detail: "Coarse coffee · cold water · 14 hr", accent: "Clean / chocolatey" },
] as const;

const PROFILE_IMAGES = [
  "https://static.wixstatic.com/media/859566_b618d3f2dc39473fa45047c95e676872~mv2.jpg",
  "https://static.wixstatic.com/media/859566_90db78bfbd21470fafaf59bd0646b4ba~mv2.jpg",
  "https://static.wixstatic.com/media/859566_dda43df0514841eea1663f508724fcef~mv2.jpg",
  "https://static.wixstatic.com/media/859566_26ddc1aef049454db886a6bd9d84b5b6~mv2.jpg",
] as const;

export function ZensiaImaginationExperience() {
  const root = useRef<HTMLDivElement>(null);
  const cupStage = useRef<HTMLDivElement>(null);
  const [activeProduct, setActiveProduct] = useState(0);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const element = root.current;
    if (!element) return;

    const context = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
      intro
        .fromTo(".zi-header", { yPercent: -110 }, { yPercent: 0, duration: 0.7 }, 0)
        .fromTo(".zi-hero__eyebrow", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55 }, 0.08)
        .fromTo(".zi-hero h1 .line", { yPercent: 110 }, { yPercent: 0, duration: 1.05, stagger: 0.06, ease: "expo.out" }, 0.12)
        .fromTo(".zi-hero__copy > p, .zi-hero__actions", { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.08 }, 0.3)
        .fromTo(".zi-cup-stage", { scale: 0.82, y: 80, rotate: 5, opacity: 0 }, { scale: 1, y: 0, rotate: 0, opacity: 1, duration: 1.25, ease: "expo.out" }, 0.18);

      if (reduced) return;

      gsap.to(".zi-cup__steam--1", { y: -48, x: 9, scaleX: 1.18, opacity: 0.1, duration: 2.8, repeat: -1, ease: "sine.inOut" });
      gsap.to(".zi-cup__steam--2", { y: -58, x: -7, scaleX: 0.9, opacity: 0.14, duration: 3.4, repeat: -1, ease: "sine.inOut", delay: 0.45 });
      gsap.to(".zi-cup__steam--3", { y: -42, x: 6, scaleX: 1.08, opacity: 0.08, duration: 3.05, repeat: -1, ease: "sine.inOut", delay: 0.9 });
      gsap.to(".zi-cup__coffee-shine", { xPercent: 170, duration: 3.8, repeat: -1, ease: "sine.inOut" });

      const mm = gsap.matchMedia();

      mm.add("(min-width: 981px)", () => {
        const journey = gsap.timeline({
          scrollTrigger: {
            trigger: ".zi-cup-journey",
            start: "top top",
            end: "bottom bottom",
            scrub: 0.85,
          },
        });

        journey
          .to(".zi-cup-stage", { xPercent: -38, yPercent: 47, scale: 0.77, rotate: -4, ease: "none" }, 0)
          .to(".zi-cup__saucer", { scaleX: 0.88, opacity: 0.62, ease: "none" }, 0)
          .fromTo(".zi-pour-stream", { scaleY: 0, transformOrigin: "top center", opacity: 0 }, { scaleY: 1, opacity: 1, ease: "none" }, 0.18)
          .to(".zi-pour-stream", { opacity: 0, ease: "none" }, 0.48)
          .to(".zi-cup-stage", { xPercent: 31, yPercent: 137, scale: 0.6, rotate: 3, ease: "none" }, 0.52)
          .to(".zi-cup__steam", { opacity: 0.38, ease: "none" }, 0.52);

        gsap.to(".zi-hero__ghost", {
          xPercent: -14,
          ease: "none",
          scrollTrigger: { trigger: ".zi-hero", start: "top top", end: "bottom top", scrub: 0.8 },
        });

        gsap.utils.toArray<HTMLElement>(".zi-photo-panel img").forEach((image, index) => {
          gsap.fromTo(image, { scale: 1.12, yPercent: index % 2 ? 4 : -4 }, {
            scale: 1.01,
            yPercent: index % 2 ? -5 : 5,
            ease: "none",
            scrollTrigger: { trigger: image.closest(".zi-photo-panel") ?? image, start: "top bottom", end: "bottom top", scrub: 0.8 },
          });
        });
      });

      mm.add("(max-width: 980px)", () => {
        gsap.to(".zi-cup-stage", {
          yPercent: 10,
          scale: 0.93,
          ease: "none",
          scrollTrigger: { trigger: ".zi-hero", start: "top top", end: "bottom top", scrub: 0.55 },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-zi-reveal]").forEach((node) => {
        gsap.fromTo(node, { y: 34, opacity: 0 }, {
          y: 0,
          opacity: 1,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: { trigger: node, start: "top 88%", once: true },
        });
      });

      gsap.utils.toArray<HTMLElement>(".zi-section-title").forEach((node) => {
        gsap.fromTo(node, { clipPath: "inset(0 0 100% 0)", yPercent: 12 }, {
          clipPath: "inset(0 0 0% 0)",
          yPercent: 0,
          duration: 1,
          ease: "expo.out",
          scrollTrigger: { trigger: node, start: "top 88%", once: true },
        });
      });

      return () => mm.revert();
    }, element);

    return () => context.revert();
  }, []);

  const onCupMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const node = cupStage.current;
    if (!node) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    gsap.to(node, {
      rotateY: x * 11,
      rotateX: y * -8,
      x: x * 18,
      y: y * 14,
      duration: 0.5,
      transformPerspective: 1100,
      ease: "power2.out",
    });
  };

  const resetCup = () => {
    if (!cupStage.current) return;
    gsap.to(cupStage.current, { rotateY: 0, rotateX: 0, x: 0, y: 0, duration: 0.7, ease: "power3.out" });
  };

  const product = PRODUCTS[activeProduct];

  return (
    <div ref={root} className="zi">
      <a className="zi-skip" href="#zi-main">Skip to content</a>

      <header className="zi-header">
        <a href="#zi-main" className="zi-brand" aria-label="Zensia Coffee home">ZENSIA <span>COFFEE</span></a>
        <p className="zi-origin-line">COLOMBIAN SPECIALTY COFFEE · CLAYTON, ST. LOUIS</p>
        <nav className="zi-nav" aria-label="Primary">
          <a href="#zi-menu">Menu</a>
          <a href="#zi-coffee">Coffee</a>
          <a href="#zi-visit">Visit</a>
          <a className="zi-nav__order" href={ORDER_URL} target="_blank" rel="noreferrer">Order online</a>
        </nav>
      </header>

      <main id="zi-main">
        <div className="zi-cup-flow">
          <div className="zi-cup-stage-shell" onPointerMove={onCupMove} onPointerLeave={resetCup}>
            <div ref={cupStage} className="zi-cup-stage">
              <ZensiaHeroCup />
              <span className="zi-cup-stage__note">MOVE THE CUP</span>
              <div className="zi-bean zi-bean--1" />
              <div className="zi-bean zi-bean--2" />
              <div className="zi-bean zi-bean--3" />
              <div className="zi-cup-orbit"><span>AROMA</span><span>ORIGIN</span><span>RITUAL</span></div>
            </div>
          </div>

        <section className="zi-hero" aria-labelledby="zi-hero-title">
          <div className="zi-hero__ghost" aria-hidden="true">ZENSIA</div>
          <div className="zi-hero__copy">
            <p className="zi-eyebrow zi-hero__eyebrow">COLOMBIA → ST. LOUIS</p>
            <h1 id="zi-hero-title">
              <span className="clip"><span className="line">Coffee</span></span>
              <span className="clip"><span className="line">you can</span></span>
              <span className="clip"><span className="line zi-accent">stay with.</span></span>
            </h1>
            <p className="zi-hero__body">A Colombian coffee house built around the cup: aroma, ritual, food, conversation and enough room to slow the day down.</p>
            <div className="zi-hero__actions">
              <a href={ORDER_URL} target="_blank" rel="noreferrer">Order online <span>↗</span></a>
              <a href="#zi-menu">Explore the menu</a>
            </div>
          </div>

        </section>

        <section className="zi-cup-journey zi-kinetic" aria-labelledby="zi-kinetic-title">
          <div className="zi-cup-journey__sticky">
            <div className="zi-pour-stream" aria-hidden="true" />
            <div className="zi-journey-copy zi-journey-copy--one" data-zi-reveal>
              <p className="zi-eyebrow">01 · THE POUR</p>
              <h2 id="zi-kinetic-title" className="zi-section-title">A cup can<br/><em>change the pace.</em></h2>
              <p>Scroll and the hero cup leaves the billboard, moves into the room, and becomes part of the preparation ritual instead of disappearing after the first screen.</p>
            </div>
            <div className="zi-journey-copy zi-journey-copy--two" data-zi-reveal>
              <p className="zi-eyebrow">02 · THE ROOM</p>
              <h2 className="zi-section-title">Coffee is only<br/><em>half the experience.</em></h2>
              <p>The rest is the table, the smell, the food, the person across from you and the decision to stay a little longer.</p>
            </div>
            <div className="zi-journey-rail" aria-hidden="true"><span>BEAN</span><span>GRIND</span><span>BLOOM</span><span>POUR</span></div>
          </div>
        </section>
        </div>

        <section id="zi-coffee" className="zi-rack">
          <div className="zi-rack__intro" data-zi-reveal>
            <p className="zi-eyebrow">ZEN AT HOME</p>
            <h2 className="zi-section-title">The coffee rack.</h2>
            <p>Four Zensia coffee expressions, staged like the shelf you actually want to reach for.</p>
          </div>

          <div className="zi-rack__layout">
            <div className="zi-rack__shelf" aria-label="Choose a Zensia coffee product">
              {PRODUCTS.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className="zi-rack__product"
                  aria-pressed={activeProduct === index}
                  onMouseEnter={() => setActiveProduct(index)}
                  onFocus={() => setActiveProduct(index)}
                  onClick={() => setActiveProduct(index)}
                >
                  <span>{item.id}</span>
                  <div className="zi-rack__product-image">
                    <Image src={item.image} alt="" fill sizes="(max-width: 800px) 38vw, 16vw" />
                  </div>
                  <strong>{item.label}</strong>
                </button>
              ))}
            </div>

            <div className="zi-rack__feature">
              <div className="zi-rack__feature-image">
                <Image key={product.image} src={product.image} alt="Zensia Zen at Home Colombian coffee" fill sizes="(max-width: 900px) 90vw, 42vw" />
              </div>
              <div className="zi-rack__feature-copy">
                <span>{product.id} / 04</span>
                <h3>{product.label}</h3>
                <p>{product.note}</p>
                <a href={ORDER_URL} target="_blank" rel="noreferrer">Shop coffee <span>↗</span></a>
              </div>
            </div>
          </div>
        </section>

        <section className="zi-recipes">
          <div className="zi-recipes__head" data-zi-reveal>
            <p className="zi-eyebrow">THE BREW BAR</p>
            <h2 className="zi-section-title">Three ways<br/>to read the same bean.</h2>
          </div>
          <div className="zi-recipes__grid">
            {RECIPES.map((recipe, index) => (
              <article key={recipe.name} className="zi-recipe" data-zi-reveal>
                <span className="zi-recipe__index">0{index + 1}</span>
                <div className="zi-recipe__dial" aria-hidden="true"><span>{recipe.ratio}</span></div>
                <div>
                  <p>{recipe.accent}</p>
                  <h3>{recipe.name}</h3>
                  <small>{recipe.detail}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="zi-photo-story">
          <div className="zi-photo-panel zi-photo-panel--large">
            <Image src={PROFILE_IMAGES[1]} alt="Zensia coffee preparation" fill sizes="(max-width: 900px) 100vw, 62vw" />
          </div>
          <div className="zi-photo-story__copy" data-zi-reveal>
            <p className="zi-eyebrow">THE COFFEE HOUSE</p>
            <h2 className="zi-section-title">Come for the cup.<br/><em>Stay for the room.</em></h2>
            <p>Zensia is treated here as a place, not a product grid. The website moves from object to ritual to menu to room so the experience feels like entering the coffee shop.</p>
          </div>
          <div className="zi-photo-panel zi-photo-panel--small">
            <Image src={PROFILE_IMAGES[3]} alt="Zensia cold coffee" fill sizes="(max-width: 900px) 46vw, 24vw" />
          </div>
        </section>

        <ZensiaImmersiveMenu orderUrl={ORDER_URL} />

        <section className="zi-origin">
          <div className="zi-origin__media zi-photo-panel">
            <Image src={PROFILE_IMAGES[0]} alt="Colombian coffee at Zensia" fill sizes="(max-width: 900px) 100vw, 54vw" />
          </div>
          <div className="zi-origin__copy" data-zi-reveal>
            <p className="zi-eyebrow">FROM COLOMBIA</p>
            <h2 className="zi-section-title">Origin is part<br/>of the <em>experience.</em></h2>
            <p>Zensia shares Colombian coffee through more than flavor alone: preparation, atmosphere, hospitality and the time you give the cup all matter.</p>
            <a href="#zi-visit">Find your pause <span>↓</span></a>
          </div>
        </section>

        <section className="zi-club">
          <div className="zi-club__copy" data-zi-reveal>
            <p className="zi-eyebrow">CALM CLUB</p>
            <h2 className="zi-section-title">Your regular cup<br/><em>should know you.</em></h2>
            <p>Join Zensia&apos;s loyalty experience for the people who turn a coffee stop into a ritual.</p>
            <a href={CALM_URL} target="_blank" rel="noreferrer">Join Calm Club <span>↗</span></a>
          </div>
          <div className="zi-club__mark" aria-hidden="true">
            <span>CALM</span><strong>Z</strong><span>CLUB</span>
          </div>
        </section>

        <section id="zi-visit" className="zi-visit">
          <div className="zi-visit__top" data-zi-reveal>
            <p className="zi-eyebrow">CLAYTON · ST. LOUIS</p>
            <h2 className="zi-section-title">Find your<br/><em>pause.</em></h2>
          </div>
          <div className="zi-visit__grid">
            <a className="zi-visit__primary" href={MAP_URL} target="_blank" rel="noreferrer">
              <span>VISIT ZENSIA</span>
              <strong>8121 Maryland Avenue</strong>
              <small>Saint Louis, Missouri 63105</small>
              <b>↗</b>
            </a>
            <div className="zi-visit__links">
              <a href={ORDER_URL} target="_blank" rel="noreferrer"><span>Order online</span><b>↗</b></a>
              <a href="#zi-menu"><span>Browse the full menu</span><b>↓</b></a>
              <a href={CALM_URL} target="_blank" rel="noreferrer"><span>Calm Club</span><b>↗</b></a>
            </div>
          </div>
          <footer className="zi-footer">
            <a href="#zi-main">ZENSIA COFFEE</a>
            <p>COLOMBIA → ST. LOUIS</p>
            <span>COFFEE WITH ROOM TO STAY</span>
          </footer>
        </section>
      </main>
    </div>
  );
}

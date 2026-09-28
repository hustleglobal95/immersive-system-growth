"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const ORDER_URL = "https://zensia-coffee-llc.square.site/";
const MENU_URL = "https://www.zensiacoffee.com/actual-menu";
const CALM_URL = "https://profile.squareup.com/loyalty/MLX5PRMQ9XZ02";
const MAP_URL = "https://www.google.com/maps/search/?api=1&query=8121+Maryland+Avenue+Saint+Louis+MO+63105";

const PRODUCTS = [
  {
    id: "01",
    label: "Zen at Home",
    descriptor: "Colombian coffee for the kitchen ritual.",
    image: "https://static.wixstatic.com/media/820771_22ed744817524376bb36445174684e6f~mv2.png",
    tone: "#4a271d",
    ink: "#f3ead8",
    accent: "#e0b878",
  },
  {
    id: "02",
    label: "Zen at Home",
    descriptor: "Small-batch Colombian coffee, brought home.",
    image: "https://static.wixstatic.com/media/820771_bf96a54cf492498799ce6d63f802a93e~mv2.jpeg",
    tone: "#253326",
    ink: "#f1eadc",
    accent: "#b7c08f",
  },
  {
    id: "03",
    label: "Zen at Home",
    descriptor: "A quieter cup, wherever the day starts.",
    image: "https://static.wixstatic.com/media/820771_21b52780336c46bbb34cb3f00829da60~mv2.jpg",
    tone: "#6d4029",
    ink: "#f7ecd6",
    accent: "#e2c17d",
  },
  {
    id: "04",
    label: "Zen at Home",
    descriptor: "Colombian origin, prepared your way.",
    image: "https://static.wixstatic.com/media/820771_3db723033b014dd9a51fb2b01ed1fb95~mv2.jpg",
    tone: "#35231e",
    ink: "#f2e6d4",
    accent: "#cc8f64",
  },
] as const;

const COFFEE_PROFILES = [
  {
    label: "Intense & flavorful",
    image: "https://static.wixstatic.com/media/859566_b618d3f2dc39473fa45047c95e676872~mv2.jpg",
  },
  {
    label: "Creamy & smooth",
    image: "https://static.wixstatic.com/media/859566_90db78bfbd21470fafaf59bd0646b4ba~mv2.jpg",
  },
  {
    label: "Robust & aromatic",
    image: "https://static.wixstatic.com/media/859566_dda43df0514841eea1663f508724fcef~mv2.jpg",
  },
  {
    label: "Refreshing & bold",
    image: "https://static.wixstatic.com/media/859566_26ddc1aef049454db886a6bd9d84b5b6~mv2.jpg",
  },
] as const;

export function ZensiaExperience() {
  const root = useRef<HTMLDivElement>(null);
  const productStage = useRef<HTMLDivElement>(null);
  const [activeProduct, setActiveProduct] = useState(0);
  const product = PRODUCTS[activeProduct];

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const element = root.current;
    if (!element) return;

    const context = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      gsap.fromTo(
        ".z2-hero__copy > *",
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.08, duration: 0.9, ease: "power3.out", delay: 0.1 },
      );

      gsap.fromTo(
        ".z2-product-stage",
        { xPercent: 10, rotate: 3, opacity: 0 },
        { xPercent: 0, rotate: 0, opacity: 1, duration: 1.15, ease: "power3.out", delay: 0.16 },
      );

      gsap.to(".z2-hero__word", {
        xPercent: -10,
        ease: "none",
        scrollTrigger: {
          trigger: ".z2-hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });

      gsap.to(".z2-product-stage", {
        yPercent: 8,
        scale: 0.94,
        ease: "none",
        scrollTrigger: {
          trigger: ".z2-hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.7,
        },
      });

      gsap.utils.toArray<HTMLElement>("[data-z2-reveal]").forEach((node) => {
        gsap.fromTo(
          node,
          { y: 34, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: { trigger: node, start: "top 86%", once: true },
          },
        );
      });
    }, element);

    return () => context.revert();
  }, []);

  const onProductMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!productStage.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    gsap.to(productStage.current, {
      rotateY: px * 7,
      rotateX: py * -5,
      x: px * 9,
      y: py * 7,
      duration: 0.5,
      ease: "power2.out",
      transformPerspective: 1000,
    });
  };

  const resetProduct = () => {
    if (!productStage.current) return;
    gsap.to(productStage.current, {
      rotateY: 0,
      rotateX: 0,
      x: 0,
      y: 0,
      duration: 0.7,
      ease: "power3.out",
    });
  };

  return (
    <div
      ref={root}
      className="z2"
      style={{
        "--z2-tone": product.tone,
        "--z2-ink": product.ink,
        "--z2-accent": product.accent,
      } as React.CSSProperties}
    >
      <a className="z2-skip" href="#z2-main">Skip to content</a>

      <header className="z2-header">
        <a href="#z2-main" className="z2-brand" aria-label="Zensia Coffee home">
          ZENSIA
          <span>COFFEE</span>
        </a>
        <p className="z2-origin">COLOMBIAN SPECIALTY COFFEE · CLAYTON, ST. LOUIS</p>
        <nav className="z2-nav" aria-label="Primary">
          <a href={MENU_URL} target="_blank" rel="noreferrer">Menu</a>
          <a href="#z2-coffee">Coffee</a>
          <a href="#z2-visit">Visit</a>
          <a className="z2-nav__order" href={ORDER_URL} target="_blank" rel="noreferrer">Order online</a>
        </nav>
      </header>

      <main id="z2-main">
        <section className="z2-hero" aria-labelledby="z2-hero-title">
          <div className="z2-hero__word" aria-hidden="true">ZENSIA</div>

          <div className="z2-hero__copy">
            <p className="z2-eyebrow">COLOMBIA → ST. LOUIS</p>
            <h1 id="z2-hero-title">
              Coffee,
              <span>with room to stay.</span>
            </h1>
            <p className="z2-hero__body">
              Colombian specialty coffee, prepared with intention and served in a space made for slowing down.
            </p>
            <div className="z2-hero__actions">
              <a href={ORDER_URL} target="_blank" rel="noreferrer">Order online <span aria-hidden="true">↗</span></a>
              <a href={MENU_URL} target="_blank" rel="noreferrer">View menu</a>
            </div>
          </div>

          <div
            className="z2-product-wrap"
            onPointerMove={onProductMove}
            onPointerLeave={resetProduct}
          >
            <div ref={productStage} className="z2-product-stage" aria-live="polite">
              <div className="z2-product-stage__halo" aria-hidden="true" />
              <Image
                key={product.image}
                src={product.image}
                alt="Zensia Zen at Home Colombian coffee"
                fill
                priority
                sizes="(max-width: 900px) 74vw, 44vw"
                className="z2-product-stage__image"
              />
              <div className="z2-product-stage__label">
                <span>{product.id}</span>
                <strong>{product.label}</strong>
                <p>{product.descriptor}</p>
              </div>
            </div>
          </div>

          <div className="z2-product-switcher" role="group" aria-label="Choose a Zensia coffee product">
            {PRODUCTS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={activeProduct === index}
                onClick={() => setActiveProduct(index)}
              >
                <span>{item.id}</span>
                <b>{item.label}</b>
              </button>
            ))}
          </div>

          <p className="z2-hero__edge" aria-hidden="true">SPECIALTY / COLOMBIAN / COFFEE</p>
        </section>

        <section id="z2-coffee" className="z2-intro">
          <div className="z2-intro__copy" data-z2-reveal>
            <p className="z2-eyebrow">THE COFFEE</p>
            <h2>One origin.<br /><em>More than one mood.</em></h2>
            <p>
              Zensia&apos;s public menu moves across bold espresso, creamy milk drinks, aromatic classics and cold coffee.
              The new site gives those choices the same visual weight as the café itself.
            </p>
          </div>

          <div className="z2-profile-grid">
            {COFFEE_PROFILES.map((item, index) => (
              <article key={item.label} className="z2-profile" data-z2-reveal>
                <div className="z2-profile__image">
                  <Image
                    src={item.image}
                    alt={item.label}
                    fill
                    sizes="(max-width: 700px) 88vw, 24vw"
                  />
                </div>
                <div className="z2-profile__meta">
                  <span>0{index + 1}</span>
                  <h3>{item.label}</h3>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="z2-origin-story">
          <div className="z2-origin-story__media" data-z2-reveal>
            <Image
              src="https://static.wixstatic.com/media/859566_6b7702b0813d4b9388ff1a8752200691~mv2.png"
              alt="Zensia Coffee"
              fill
              sizes="(max-width: 900px) 100vw, 58vw"
            />
          </div>
          <div className="z2-origin-story__copy" data-z2-reveal>
            <p className="z2-eyebrow">FROM COLOMBIA</p>
            <h2>Origin is part of the experience.</h2>
            <p>
              Zensia was created to share Colombian coffee through more than flavor alone — preparation, atmosphere,
              hospitality and the time you give the cup all matter.
            </p>
            <a href="#z2-visit">Find your pause <span aria-hidden="true">↓</span></a>
          </div>
          <div className="z2-origin-story__stamp" aria-hidden="true">
            <span>COLOMBIA</span>
            <span>ST. LOUIS</span>
          </div>
        </section>

        <section className="z2-club">
          <div className="z2-club__visual" data-z2-reveal>
            <Image
              src="https://static.wixstatic.com/media/859566_dbb60c0fa9a444e589c870551afbcb7b~mv2.png"
              alt="Zensia Calm Club rewards"
              fill
              sizes="(max-width: 900px) 88vw, 42vw"
            />
          </div>
          <div className="z2-club__copy" data-z2-reveal>
            <p className="z2-eyebrow">CALM CLUB</p>
            <h2>Good coffee.<br />Good calm.<br /><em>Rewards too.</em></h2>
            <p>
              Earn Zen when you visit and redeem it for treats, perks and future pauses.
            </p>
            <a href={CALM_URL} target="_blank" rel="noreferrer">Join Calm Club <span aria-hidden="true">↗</span></a>
          </div>
        </section>

        <section id="z2-visit" className="z2-visit">
          <div className="z2-visit__top">
            <p className="z2-eyebrow">YOUR PAUSE STARTS HERE</p>
            <h2>Come for the coffee.<br /><em>Stay for the room.</em></h2>
          </div>

          <div className="z2-visit__grid">
            <a className="z2-visit__primary" href={MAP_URL} target="_blank" rel="noreferrer" data-z2-reveal>
              <span>VISIT ZENSIA</span>
              <strong>8121 Maryland Avenue</strong>
              <small>Saint Louis, MO 63105</small>
              <b aria-hidden="true">↗</b>
            </a>

            <div className="z2-visit__links" data-z2-reveal>
              <a href={ORDER_URL} target="_blank" rel="noreferrer"><span>Order online</span><b>↗</b></a>
              <a href={MENU_URL} target="_blank" rel="noreferrer"><span>View menu</span><b>↗</b></a>
              <a href={CALM_URL} target="_blank" rel="noreferrer"><span>Join Calm Club</span><b>↗</b></a>
              <a href="https://www.zensiacoffee.com/" target="_blank" rel="noreferrer"><span>Current Zensia site</span><b>↗</b></a>
            </div>
          </div>

          <footer className="z2-footer">
            <a href="#z2-main" className="z2-footer__brand">ZENSIA COFFEE</a>
            <p>COLOMBIAN SPECIALTY COFFEE · CLAYTON, ST. LOUIS</p>
            <span>CONCEPT EXPERIENCE / FORGE</span>
          </footer>
        </section>
      </main>
    </div>
  );
}

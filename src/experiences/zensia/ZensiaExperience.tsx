"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createCssMaskStyle, createMaskReveal } from "@/src/lib/maskReveal";
import type { MaskRevealDefinition } from "@/src/types/experience";

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

const HERO_PRODUCT_MASK = createMaskReveal("diagonal-cut", {
  renderer: "dom",
  direction: "up",
  softness: 9,
  rotation: -7,
});
const ORIGIN_MASK = createMaskReveal("ink-spread", {
  renderer: "dom",
  origin: [46, 52],
  softness: 15,
  scale: 1.04,
  intensity: 1.18,
  seed: 607,
});
const CLUB_MASK = createMaskReveal("radial-iris", {
  renderer: "dom",
  origin: [52, 48],
  softness: 12,
  scale: 1.05,
});
const VISIT_MASK = createMaskReveal("diagonal-cut", {
  renderer: "dom",
  direction: "right",
  softness: 10,
  rotation: -8,
});

function applyMaskProgress(node: HTMLElement, progress: number, mask: MaskRevealDefinition) {
  const style = createCssMaskStyle(progress, mask);
  const set = (property: string, value: unknown) => {
    if (value === undefined || value === null) node.style.removeProperty(property);
    else node.style.setProperty(property, String(value));
  };
  set("-webkit-mask-image", style.WebkitMaskImage);
  set("mask-image", style.maskImage);
  set("-webkit-mask-size", style.WebkitMaskSize);
  set("mask-size", style.maskSize);
  set("-webkit-mask-repeat", style.WebkitMaskRepeat);
  set("mask-repeat", style.maskRepeat);
  set("-webkit-mask-position", style.WebkitMaskPosition);
  set("mask-position", style.maskPosition);
}

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

      const animateMask = (
        node: HTMLElement,
        mask: MaskRevealDefinition,
        startAt = "top 92%",
        endAt = "top 48%",
      ) => {
        applyMaskProgress(node, 0, mask);
        ScrollTrigger.create({
          trigger: node,
          start: startAt,
          end: endAt,
          onRefresh: (self) => applyMaskProgress(node, self.progress, mask),
          onUpdate: (self) => applyMaskProgress(node, self.progress, mask),
        });
      };

      const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      heroTimeline
        .fromTo(".z2-header", { yPercent: -105 }, { yPercent: 0, duration: 0.75 }, 0)
        .fromTo(
          ".z2-hero__copy .z2-eyebrow",
          { y: 22, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          0.08,
        )
        .fromTo(
          ".z2-hero__copy h1",
          { clipPath: "inset(0 0 100% 0)", yPercent: 8 },
          { clipPath: "inset(0 0 0% 0)", yPercent: 0, duration: 1.05, ease: "expo.out" },
          0.14,
        )
        .fromTo(
          ".z2-hero__body",
          { y: 28, opacity: 0 },
          { y: 0, opacity: 0.72, duration: 0.8 },
          0.32,
        )
        .fromTo(
          ".z2-hero__actions a",
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.65, stagger: 0.08 },
          0.44,
        )
        .fromTo(
          ".z2-product-stage",
          { xPercent: 11, rotateZ: 3.2, scale: 0.93, opacity: 0 },
          { xPercent: 0, rotateZ: 0, scale: 1, opacity: 1, duration: 1.2, ease: "power4.out" },
          0.16,
        )
        .fromTo(
          ".z2-product-switcher",
          { scaleX: 0, transformOrigin: "left center" },
          { scaleX: 1, duration: 0.95, ease: "expo.out" },
          0.42,
        )
        .fromTo(
          ".z2-product-switcher button",
          { y: 16, opacity: 0 },
          { y: 0, opacity: 0.46, duration: 0.65, stagger: 0.06 },
          0.52,
        );

      gsap.to(".z2-product-switcher button[aria-pressed='true']", { opacity: 1, duration: 0.2 });

      gsap.utils.toArray<HTMLElement>("[data-z2-mask='profile']").forEach((node, index) => {
        const direction = index % 2 === 0 ? "up" : "right";
        animateMask(
          node,
          createMaskReveal("linear-soft", {
            renderer: "dom",
            direction,
            softness: 9 + index * 1.5,
          }),
          "top 94%",
          "top 54%",
        );
      });
      gsap.utils.toArray<HTMLElement>("[data-z2-mask='origin']").forEach((node) => animateMask(node, ORIGIN_MASK, "top 94%", "top 38%"));
      gsap.utils.toArray<HTMLElement>("[data-z2-mask='club']").forEach((node) => animateMask(node, CLUB_MASK, "top 94%", "top 48%"));
      gsap.utils.toArray<HTMLElement>("[data-z2-mask='visit']").forEach((node) => animateMask(node, VISIT_MASK, "top 96%", "top 56%"));

      gsap.utils.toArray<HTMLElement>("[data-z2-reveal]").forEach((node) => {
        if (node.matches("[data-z2-mask]")) return;
        gsap.fromTo(
          node,
          { y: 34, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: { trigger: node, start: "top 88%", once: true },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>(".z2 h2").forEach((heading) => {
        gsap.fromTo(
          heading,
          { clipPath: "inset(0 0 100% 0)", yPercent: 10 },
          {
            clipPath: "inset(0 0 0% 0)",
            yPercent: 0,
            duration: 1.05,
            ease: "expo.out",
            scrollTrigger: { trigger: heading, start: "top 90%", once: true },
          },
        );
      });

      const mm = gsap.matchMedia();

      mm.add("(min-width: 981px)", () => {
        gsap.to(".z2-hero__word", {
          xPercent: -14,
          ease: "none",
          scrollTrigger: { trigger: ".z2-hero", start: "top top", end: "bottom top", scrub: 0.7 },
        });
        gsap.to(".z2-hero__copy", {
          yPercent: -10,
          ease: "none",
          scrollTrigger: { trigger: ".z2-hero", start: "top top", end: "bottom top", scrub: 0.8 },
        });
        gsap.to(".z2-product-stage", {
          yPercent: 14,
          scale: 0.91,
          rotateZ: -1.6,
          ease: "none",
          scrollTrigger: { trigger: ".z2-hero", start: "top top", end: "bottom top", scrub: 0.8 },
        });
        gsap.to(".z2-product-stage__label", {
          yPercent: -22,
          ease: "none",
          scrollTrigger: { trigger: ".z2-hero", start: "top 22%", end: "bottom top", scrub: 0.7 },
        });

        gsap.to(".z2-intro__copy h2", {
          xPercent: -4,
          ease: "none",
          scrollTrigger: { trigger: ".z2-intro", start: "top 80%", end: "bottom 20%", scrub: 0.8 },
        });
        gsap.to(".z2-intro__copy > p:last-child", {
          yPercent: -16,
          ease: "none",
          scrollTrigger: { trigger: ".z2-intro", start: "top 75%", end: "bottom 25%", scrub: 0.8 },
        });

        gsap.utils.toArray<HTMLElement>(".z2-profile__image img").forEach((image, index) => {
          gsap.fromTo(
            image,
            { scale: 1.14, yPercent: index % 2 === 0 ? -4 : 4 },
            {
              scale: 1.02,
              yPercent: index % 2 === 0 ? 5 : -5,
              ease: "none",
              scrollTrigger: { trigger: image.closest(".z2-profile"), start: "top bottom", end: "bottom top", scrub: 0.75 },
            },
          );
        });

        gsap.fromTo(
          ".z2-origin-story__media img",
          { scale: 1.13, yPercent: -4 },
          {
            scale: 1.02,
            yPercent: 5,
            ease: "none",
            scrollTrigger: { trigger: ".z2-origin-story", start: "top bottom", end: "bottom top", scrub: 0.85 },
          },
        );
        gsap.fromTo(
          ".z2-origin-story__copy",
          { yPercent: 8 },
          {
            yPercent: -8,
            ease: "none",
            scrollTrigger: { trigger: ".z2-origin-story", start: "top bottom", end: "bottom top", scrub: 0.9 },
          },
        );
        gsap.to(".z2-origin-story__stamp", {
          xPercent: 22,
          ease: "none",
          scrollTrigger: { trigger: ".z2-origin-story", start: "top 70%", end: "bottom 20%", scrub: 0.75 },
        });

        gsap.fromTo(
          ".z2-club__visual",
          { yPercent: 8, rotateZ: -2.5 },
          {
            yPercent: -8,
            rotateZ: 2.5,
            ease: "none",
            scrollTrigger: { trigger: ".z2-club", start: "top bottom", end: "bottom top", scrub: 0.8 },
          },
        );
        gsap.fromTo(
          ".z2-club__copy",
          { yPercent: -5 },
          {
            yPercent: 6,
            ease: "none",
            scrollTrigger: { trigger: ".z2-club", start: "top bottom", end: "bottom top", scrub: 0.9 },
          },
        );

        gsap.fromTo(
          ".z2-visit__top h2",
          { xPercent: -5 },
          {
            xPercent: 0,
            ease: "none",
            scrollTrigger: { trigger: ".z2-visit", start: "top 82%", end: "top 34%", scrub: 0.7 },
          },
        );
      });

      mm.add("(max-width: 980px)", () => {
        gsap.to(".z2-hero__word", {
          xPercent: -5,
          ease: "none",
          scrollTrigger: { trigger: ".z2-hero", start: "top top", end: "bottom top", scrub: 0.55 },
        });
        gsap.to(".z2-product-stage", {
          yPercent: 5,
          scale: 0.97,
          ease: "none",
          scrollTrigger: { trigger: ".z2-hero", start: "top top", end: "bottom top", scrub: 0.55 },
        });
        gsap.utils.toArray<HTMLElement>(".z2-profile__image img").forEach((image) => {
          gsap.fromTo(
            image,
            { scale: 1.08 },
            {
              scale: 1.01,
              ease: "none",
              scrollTrigger: { trigger: image.closest(".z2-profile"), start: "top bottom", end: "bottom top", scrub: 0.5 },
            },
          );
        });
        gsap.fromTo(
          ".z2-origin-story__media img",
          { scale: 1.08 },
          {
            scale: 1.01,
            ease: "none",
            scrollTrigger: { trigger: ".z2-origin-story", start: "top bottom", end: "bottom top", scrub: 0.55 },
          },
        );
      });

      gsap.fromTo(
        ".z2-visit__links a",
        { x: 32, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.72,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: ".z2-visit__links", start: "top 86%", once: true },
        },
      );

      return () => mm.revert();
    }, element);

    return () => context.revert();
  }, []);

  useLayoutEffect(() => {
    const element = root.current;
    const image = element?.querySelector<HTMLElement>(".z2-product-stage__image");
    const label = element?.querySelector<HTMLElement>(".z2-product-stage__label");
    if (!image) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      applyMaskProgress(image, 1, HERO_PRODUCT_MASK);
      return;
    }

    const state = { progress: 0 };
    applyMaskProgress(image, 0, HERO_PRODUCT_MASK);
    const reveal = gsap.to(state, {
      progress: 1,
      duration: 0.82,
      ease: "power3.inOut",
      onUpdate: () => applyMaskProgress(image, state.progress, HERO_PRODUCT_MASK),
    });
    const imageMotion = gsap.fromTo(
      image,
      { y: 26, rotateZ: 1.8, scale: 1.035 },
      { y: 0, rotateZ: 0, scale: 1, duration: 0.86, ease: "power3.out" },
    );
    const labelMotion = label
      ? gsap.fromTo(label, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.62, ease: "power3.out", delay: 0.16 })
      : null;

    return () => {
      reveal.kill();
      imageMotion.kill();
      labelMotion?.kill();
    };
  }, [activeProduct]);

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
            <div ref={productStage} className="z2-product-stage" aria-live="polite" data-z2-motion="product-stage">
              <div className="z2-product-stage__halo" aria-hidden="true" />
              <Image
                key={product.image}
                src={product.image}
                alt="Zensia Zen at Home Colombian coffee"
                fill
                priority
                sizes="(max-width: 900px) 74vw, 44vw"
                className="z2-product-stage__image"
                data-z2-mask="hero-product"
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
                <div className="z2-profile__image" data-z2-mask="profile">
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
          <div className="z2-origin-story__media" data-z2-reveal data-z2-mask="origin">
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
          <div className="z2-club__visual" data-z2-reveal data-z2-mask="club">
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
            <a className="z2-visit__primary" href={MAP_URL} target="_blank" rel="noreferrer" data-z2-reveal data-z2-mask="visit">
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

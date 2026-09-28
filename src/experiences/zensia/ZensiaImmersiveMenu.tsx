"use client";

import Image from "next/image";
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ZENSIA_MENU_CATEGORIES,
  ZENSIA_MENU_ITEMS,
  menuItemsForCategory,
  type ZensiaMenuCategoryId,
  type ZensiaMenuItem,
} from "./zensiaMenu";

type ZensiaImmersiveMenuProps = {
  orderUrl: string;
};

const MENU_SPLASH_URL =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_3FugzGV89ehMBrUoVdwLJxFujO5/ef1ed3e5-a0c5-4055-a347-5ab30d2c3454.webp";

const ZENSIA_PHOTO_POOLS = {
  hot: [
    "https://static.wixstatic.com/media/859566_90db78bfbd21470fafaf59bd0646b4ba~mv2.jpg",
    "https://static.wixstatic.com/media/859566_dda43df0514841eea1663f508724fcef~mv2.jpg",
  ],
  espresso: [
    "https://static.wixstatic.com/media/859566_b618d3f2dc39473fa45047c95e676872~mv2.jpg",
    "https://static.wixstatic.com/media/859566_dda43df0514841eea1663f508724fcef~mv2.jpg",
  ],
  cold: [
    "https://static.wixstatic.com/media/859566_26ddc1aef049454db886a6bd9d84b5b6~mv2.jpg",
    "https://static.wixstatic.com/media/859566_90db78bfbd21470fafaf59bd0646b4ba~mv2.jpg",
  ],
  bread: [
    "https://static.wixstatic.com/media/859566_6b7702b0813d4b9388ff1a8752200691~mv2.png",
    "https://static.wixstatic.com/media/859566_dbb60c0fa9a444e589c870551afbcb7b~mv2.png",
  ],
  empanada: [
    "https://static.wixstatic.com/media/859566_dbb60c0fa9a444e589c870551afbcb7b~mv2.png",
    "https://static.wixstatic.com/media/859566_6b7702b0813d4b9388ff1a8752200691~mv2.png",
  ],
  dessert: [
    "https://static.wixstatic.com/media/859566_90db78bfbd21470fafaf59bd0646b4ba~mv2.jpg",
    "https://static.wixstatic.com/media/859566_dbb60c0fa9a444e589c870551afbcb7b~mv2.png",
  ],
} as const;

function photoForItem(kind: keyof typeof ZENSIA_PHOTO_POOLS, index: number) {
  const pool = ZENSIA_PHOTO_POOLS[kind];
  return pool[index % pool.length];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function ZensiaImmersiveMenu({ orderUrl }: ZensiaImmersiveMenuProps) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const firstCategory = ZENSIA_MENU_CATEGORIES[0];
  const firstItem = ZENSIA_MENU_ITEMS[0];

  const [activeCategoryId, setActiveCategoryId] = useState<ZensiaMenuCategoryId>(firstCategory.id);
  const [activeItemId, setActiveItemId] = useState(firstItem.id);
  const [activeVariant, setActiveVariant] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const activeCategory =
    ZENSIA_MENU_CATEGORIES.find((category) => category.id === activeCategoryId) ?? firstCategory;
  const activeItem = ZENSIA_MENU_ITEMS.find((item) => item.id === activeItemId) ?? firstItem;

  const visibleItems = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return menuItemsForCategory(activeCategoryId);
    return ZENSIA_MENU_ITEMS.filter((item) => {
      const category = ZENSIA_MENU_CATEGORIES.find((entry) => entry.id === item.category);
      return normalize(
        [item.name, category?.label ?? "", ...(item.variants ?? [])].join(" "),
      ).includes(needle);
    });
  }, [activeCategoryId, query]);

  const selectItem = (item: ZensiaMenuItem) => {
    setActiveCategoryId(item.category);
    setActiveItemId(item.id);
    setActiveVariant(null);
  };

  const selectCategory = (categoryId: ZensiaMenuCategoryId) => {
    const item = menuItemsForCategory(categoryId)[0];
    setQuery("");
    setActiveCategoryId(categoryId);
    setActiveItemId(item?.id ?? firstItem.id);
    setActiveVariant(null);
  };

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const element = root.current;
    if (!element) return;

    const context = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      gsap.fromTo(
        ".zim-menu__heading",
        { clipPath: "inset(0 0 100% 0)", yPercent: 12 },
        {
          clipPath: "inset(0 0 0% 0)",
          yPercent: 0,
          duration: 1.05,
          ease: "expo.out",
          scrollTrigger: { trigger: element, start: "top 82%", once: true },
        },
      );

      gsap.fromTo(
        ".zim-menu__category",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.055,
          ease: "power3.out",
          scrollTrigger: { trigger: ".zim-menu__categories", start: "top 90%", once: true },
        },
      );

      gsap.fromTo(
        ".zim-menu__media-splash",
        { opacity: 0, scale: 0.74, xPercent: 12, rotate: -5 },
        {
          opacity: 0.94,
          scale: 1,
          xPercent: 0,
          rotate: 0,
          duration: 1.15,
          ease: "power4.out",
          scrollTrigger: { trigger: ".zim-menu__stage", start: "top 84%", once: true },
        },
      );

      const mm = gsap.matchMedia();
      mm.add("(min-width: 981px)", () => {
        gsap.to(".zim-menu__ghost", {
          xPercent: -12,
          ease: "none",
          scrollTrigger: { trigger: element, start: "top bottom", end: "bottom top", scrub: 0.8 },
        });
        gsap.fromTo(
          ".zim-menu__photo",
          { scale: 1.08, yPercent: -2 },
          {
            scale: 1.01,
            yPercent: 2,
            ease: "none",
            scrollTrigger: { trigger: element, start: "top bottom", end: "bottom top", scrub: 0.85 },
          },
        );
        gsap.fromTo(
          ".zim-menu__media-splash",
          { xPercent: 12, yPercent: -8, rotateZ: -5, scale: 0.9 },
          {
            xPercent: -11,
            yPercent: 9,
            rotateZ: 6,
            scale: 1.08,
            ease: "none",
            scrollTrigger: { trigger: element, start: "top bottom", end: "bottom top", scrub: 0.82 },
          },
        );
      });
      return () => mm.revert();
    }, element);

    return () => context.revert();
  }, []);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
    timeline
      .fromTo(".zim-menu__active-index", { y: -10, opacity: 0 }, { y: 0, opacity: 0.62, duration: 0.32 }, 0)
      .fromTo(".zim-menu__active-name", { y: 26, opacity: 0, clipPath: "inset(0 0 100% 0)" }, { y: 0, opacity: 1, clipPath: "inset(0 0 0% 0)", duration: 0.58 }, 0.03)
      .fromTo(".zim-menu__photo", { scale: 1.12, clipPath: "inset(0 0 100% 0)" }, { scale: 1, clipPath: "inset(0 0 0% 0)", duration: 0.72, ease: "power4.out" }, 0.04)
      .fromTo(".zim-menu__photo-caption", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42 }, 0.22)
      .fromTo(".zim-menu__media-splash", { scale: 0.91, opacity: 0.55 }, { scale: 1, opacity: 0.94, duration: 0.52 }, 0.04)
      .fromTo(".zim-menu__variant-row > *", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42, stagger: 0.045 }, 0.16);

    return () => { timeline.kill(); };
  }, [activeItemId, activeVariant]);

  const moveStage = (event: PointerEvent<HTMLDivElement>) => {
    const node = stage.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    gsap.to(node, {
      rotateY: x * 7,
      rotateX: y * -5,
      x: x * 9,
      y: y * 7,
      duration: 0.45,
      ease: "power2.out",
      transformPerspective: 1000,
    });
  };

  const resetStage = () => {
    const node = stage.current;
    if (!node) return;
    gsap.to(node, { rotateY: 0, rotateX: 0, x: 0, y: 0, duration: 0.7, ease: "power3.out" });
  };

  const categoryStyle = {
    "--zim-tone": activeCategory.tone,
    "--zim-accent": activeCategory.accent,
    "--zim-ink": activeCategory.ink,
  } as CSSProperties;

  const categoryItems = menuItemsForCategory(activeCategory.id);
  const categoryIndex = Math.max(0, categoryItems.findIndex((item) => item.id === activeItem.id));
  const activePhoto = photoForItem(activeCategory.kind, categoryIndex);
  const showCoffeeSplash = activeCategory.kind === "hot" || activeCategory.kind === "espresso" || activeCategory.kind === "cold";

  return (
    <section
      ref={root}
      id="zi-menu"
      className="zim-menu"
      data-menu-kind={activeCategory.kind}
      style={categoryStyle}
      aria-labelledby="zi-menu-title"
    >
      <div className="zim-menu__ghost" aria-hidden="true">MENU</div>

      <div className="zim-menu__header">
        <div>
          <p className="zim-menu__eyebrow">THE FULL MENU</p>
          <h2 id="zi-menu-title" className="zim-menu__heading">
            Everything,
            <span>inside the experience.</span>
          </h2>
        </div>
        <div className="zim-menu__header-note">
          <strong>44</strong>
          <span>core menu items</span>
          <small>plus 11 listed flavor choices</small>
        </div>
      </div>

      <div className="zim-menu__categories" role="group" aria-label="Menu categories">
        {ZENSIA_MENU_CATEGORIES.map((category) => {
          const count = menuItemsForCategory(category.id).length;
          return (
            <button
              key={category.id}
              type="button"
              className="zim-menu__category"
              aria-pressed={activeCategory.id === category.id && !query}
              aria-label={`${category.label}: ${count} items`}
              onClick={() => selectCategory(category.id)}
            >
              <span>{category.shortLabel}</span>
              <b>{String(count).padStart(2, "0")}</b>
            </button>
          );
        })}
      </div>

      <div className="zim-menu__shell">
        <div
          className="zim-menu__stage"
          onPointerMove={moveStage}
          onPointerLeave={resetStage}
        >
          <div ref={stage} className="zim-menu__stage-inner">
            <div className="zim-menu__stage-meta">
              <span className="zim-menu__active-index">
                {String(categoryIndex + 1).padStart(2, "0")} / {String(categoryItems.length).padStart(2, "0")}
              </span>
              <span>{activeCategory.label}</span>
            </div>

            <div className="zim-menu__photo-stage" aria-hidden="true">
              <Image
                key={`${activeItem.id}-${activePhoto}`}
                src={activePhoto}
                alt=""
                fill
                sizes="(max-width: 980px) 100vw, 58vw"
                className="zim-menu__photo"
              />
              <div className="zim-menu__photo-shade" />
              <div className="zim-menu__photo-caption">
                <span>AUTHENTIC ZENSIA PHOTOGRAPHY</span>
                <b>{activeCategory.shortLabel}</b>
              </div>
            </div>

            {showCoffeeSplash ? (
              <div
                className="zim-menu__media-splash"
                aria-hidden="true"
                data-source="uploaded-zensia-coffee-splash"
                style={{ backgroundImage: `url("${MENU_SPLASH_URL}")` }}
              />
            ) : null}

            <div className="zim-menu__stage-copy" aria-live="polite">
              <h3 className="zim-menu__active-name">{activeItem.name}</h3>
              <p className="zim-menu__photo-note">Real Zensia imagery. No synthetic menu render.</p>
              {activeVariant ? <p className="zim-menu__selected-variant">{activeVariant}</p> : null}
            </div>

            {activeItem.variants?.length ? (
              <div className="zim-menu__variant-block">
                <span>Choose a listed flavor</span>
                <div className="zim-menu__variant-row">
                  {activeItem.variants.map((variant) => (
                    <button
                      key={variant}
                      type="button"
                      aria-pressed={activeVariant === variant}
                      onClick={() => setActiveVariant(variant)}
                    >
                      {variant}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="zim-menu__variant-block zim-menu__variant-block--empty">
                <span>Current Zensia menu item</span>
              </div>
            )}

            <a className="zim-menu__order" href={orderUrl} target="_blank" rel="noreferrer">
              Order online <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <div className="zim-menu__index">
          <label className="zim-menu__search">
            <span>Find anything</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Latte, empanada, mango…"
              aria-label="Search the Zensia menu"
            />
          </label>

          <div className="zim-menu__index-head">
            <span>{query ? "Search results" : activeCategory.label}</span>
            <b>{String(visibleItems.length).padStart(2, "0")}</b>
          </div>

          <div className="zim-menu__items">
            {visibleItems.map((item, index) => {
              const itemCategory = ZENSIA_MENU_CATEGORIES.find((entry) => entry.id === item.category);
              const selected = item.id === activeItem.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="zim-menu__item"
                  aria-pressed={selected}
                  onMouseEnter={() => selectItem(item)}
                  onFocus={() => selectItem(item)}
                  onClick={() => selectItem(item)}
                >
                  <span className="zim-menu__item-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="zim-menu__item-name">{item.name}</span>
                  {query ? <span className="zim-menu__item-category">{itemCategory?.shortLabel}</span> : null}
                  {item.variants?.length ? <span className="zim-menu__item-variants">{item.variants.length} flavors</span> : null}
                  <span className="zim-menu__item-arrow" aria-hidden="true">↗</span>
                </button>
              );
            })}
            {visibleItems.length === 0 ? (
              <p className="zim-menu__empty">No current menu item matches that search.</p>
            ) : null}
          </div>
        </div>
      </div>

      <noscript>
        <div className="zim-menu__noscript">
          {ZENSIA_MENU_CATEGORIES.map((category) => (
            <section key={category.id}>
              <h3>{category.label}</h3>
              <ul>
                {menuItemsForCategory(category.id).map((item) => (
                  <li key={item.id}>
                    {item.name}
                    {item.variants?.length ? ` — ${item.variants.join(", ")}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </noscript>
    </section>
  );
}

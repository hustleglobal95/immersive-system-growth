"use client";

import Image from "next/image";
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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

const ZENSIA_ITEM_PHOTOS: Partial<Record<string, string>> = {
  "regular-espresso": "https://static.wixstatic.com/media/859566_b618d3f2dc39473fa45047c95e676872~mv2.jpg",
  "latte": "https://static.wixstatic.com/media/859566_90db78bfbd21470fafaf59bd0646b4ba~mv2.jpg",
  "cappuccino": "https://static.wixstatic.com/media/859566_dda43df0514841eea1663f508724fcef~mv2.jpg",
  "cold-brew": "https://static.wixstatic.com/media/820771_5c658f32b08d47f7ae25fc6045590669~mv2.jpg",
  "iced-latte": "https://static.wixstatic.com/media/859566_c6c1ece55ef84a9e8f18b65b712bffd2~mv2.png",
  "iced-matcha-sweet": "https://static.wixstatic.com/media/859566_7859c9e3e46947c7a006e921b2e80d44~mv2.png",
  "iced-matcha-unsweet": "https://static.wixstatic.com/media/859566_7859c9e3e46947c7a006e921b2e80d44~mv2.png",
  "fruit-slush-juice": "https://static.wixstatic.com/media/859566_1454d24fcd8646b094c02ab87892711c~mv2.png",
  "pandebono-cheese": "https://static.wixstatic.com/media/859566_c2dd3549ae574e75a12c2e5289b11818~mv2.jpg",
  "pandebono-guava-cheese": "https://static.wixstatic.com/media/859566_c2dd3549ae574e75a12c2e5289b11818~mv2.jpg",
};

function photoForItem(item: ZensiaMenuItem) {
  return ZENSIA_ITEM_PHOTOS[item.id] ?? null;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function ZensiaImmersiveMenu({ orderUrl }: ZensiaImmersiveMenuProps) {
  const root = useRef<HTMLElement>(null);
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
      .fromTo(".zim-menu__photo, .zim-menu__fallback", { scale: 1.045, clipPath: "inset(0 0 100% 0)" }, { scale: 1, clipPath: "inset(0 0 0% 0)", duration: 0.72, ease: "power4.out" }, 0.04)
      .fromTo(".zim-menu__photo-caption", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42 }, 0.22)
      .fromTo(".zim-menu__variant-row > *", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42, stagger: 0.045 }, 0.16);

    return () => { timeline.kill(); };
  }, [activeItemId, activeVariant]);


  const categoryStyle = {
    "--zim-tone": activeCategory.tone,
    "--zim-accent": activeCategory.accent,
    "--zim-ink": activeCategory.ink,
  } as CSSProperties;

  const categoryItems = menuItemsForCategory(activeCategory.id);
  const categoryIndex = Math.max(0, categoryItems.findIndex((item) => item.id === activeItem.id));
  const activePhoto = photoForItem(activeItem);
  const longActiveName = activeItem.name.length > 20;

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
            Find your pause.
            <span>The full Zensia menu.</span>
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
        <div className="zim-menu__stage">
          <div className="zim-menu__stage-inner" data-has-photo={activePhoto ? "true" : "false"}>
            <div className="zim-menu__stage-meta">
              <span className="zim-menu__active-index">
                {String(categoryIndex + 1).padStart(2, "0")} / {String(categoryItems.length).padStart(2, "0")}
              </span>
              <span>{activeCategory.label}</span>
            </div>

            {activePhoto ? (
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
                  <span>ZENSIA</span>
                  <b>{activeCategory.shortLabel}</b>
                </div>
              </div>
            ) : (
              <div className="zim-menu__fallback" aria-hidden="true">
                <span>{activeCategory.shortLabel}</span>
                <strong>{activeItem.name}</strong>
                <i />
              </div>
            )}

            <div className="zim-menu__stage-copy" aria-live="polite">
              <h3 className="zim-menu__active-name" data-long={longActiveName ? "true" : "false"}>{activeItem.name}</h3>
              {activeVariant ? <p className="zim-menu__selected-variant">{activeVariant}</p> : null}
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
                <p className="zim-menu__current-item">Current Zensia menu item</p>
              )}
            </div>

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
              const itemPhoto = photoForItem(item);
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
                  {itemPhoto ? (
                    <span className="zim-menu__item-thumb" aria-hidden="true">
                      <Image src={itemPhoto} alt="" fill sizes="56px" />
                    </span>
                  ) : (
                    <span className="zim-menu__item-mark" aria-hidden="true">{itemCategory?.shortLabel.slice(0, 1)}</span>
                  )}
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

"use client";

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

      gsap.to(".zim-menu__orbit--outer", { rotate: 360, duration: 32, repeat: -1, ease: "none" });
      gsap.to(".zim-menu__orbit--inner", { rotate: -360, duration: 19, repeat: -1, ease: "none" });
      gsap.to(".zim-menu__steam--a", { y: -24, x: 7, rotate: 5, duration: 3.4, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".zim-menu__steam--b", { y: -34, x: -8, rotate: -7, duration: 4.2, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".zim-menu__steam--c", { y: -18, x: 4, rotate: 3, duration: 3.8, repeat: -1, yoyo: true, ease: "sine.inOut" });

      const mm = gsap.matchMedia();
      mm.add("(min-width: 981px)", () => {
        gsap.to(".zim-menu__ghost", {
          xPercent: -12,
          ease: "none",
          scrollTrigger: { trigger: element, start: "top bottom", end: "bottom top", scrub: 0.8 },
        });
        gsap.fromTo(
          ".zim-menu__stage-object",
          { rotateZ: -7, scale: 0.9 },
          {
            rotateZ: 7,
            scale: 1.05,
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
      .fromTo(".zim-menu__stage-object", { scale: 0.78, rotateZ: -8 }, { scale: 1, rotateZ: 0, duration: 0.62, ease: "back.out(1.3)" }, 0.06)
      .fromTo(".zim-menu__variant-row > *", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42, stagger: 0.045 }, 0.16);

    return () => timeline.kill();
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

            <div className="zim-menu__stage-copy" aria-live="polite">
              <h3 className="zim-menu__active-name">{activeItem.name}</h3>
              {activeVariant ? <p className="zim-menu__selected-variant">{activeVariant}</p> : null}
            </div>

            <div className="zim-menu__stage-object" aria-hidden="true">
              <div className="zim-menu__orbit zim-menu__orbit--outer">
                <span>COLOMBIA</span>
                <span>ZENSIA</span>
                <span>ST. LOUIS</span>
              </div>
              <div className="zim-menu__orbit zim-menu__orbit--inner" />
              <div className="zim-menu__vessel">
                <i />
                <b />
                <em />
              </div>
              <div className="zim-menu__steam zim-menu__steam--a" />
              <div className="zim-menu__steam zim-menu__steam--b" />
              <div className="zim-menu__steam zim-menu__steam--c" />
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

          <div className="zim-menu__items" role="list">
            {visibleItems.map((item, index) => {
              const itemCategory = ZENSIA_MENU_CATEGORIES.find((entry) => entry.id === item.category);
              const selected = item.id === activeItem.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="listitem"
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

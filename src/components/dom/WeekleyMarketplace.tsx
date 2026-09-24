"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CinematicTextReveal, ParallaxLayer, MagneticSurface } from "@/src/components/motion";
import { useExperienceStore } from "@/src/store/experienceStore";
import communityData from "@/src/data/weekley-communities.json";

const official = "https://www.davidweekleyhomes.com";
let memorySaved = "[]";
const savedServerSnapshot = () => "[]";
function savedSnapshot() { try { return localStorage.getItem("dwh-saved-communities") || memorySaved; } catch { return memorySaved; } }
function subscribeSaved(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("dwh-saves-change", listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("dwh-saves-change", listener); };
}
function writeSaved(ids: string[]) {
  memorySaved = JSON.stringify(ids);
  try { localStorage.setItem("dwh-saved-communities", memorySaved); } catch { /* Keep saved places available for this visit. */ }
  window.dispatchEvent(new Event("dwh-saves-change"));
}
type Community = typeof communityData[number];
type Overlay = { kind: "community"; id: string } | { kind: "saved" | "compare" | "markets" | "gallery" } | null;
type IconName = "arrow" | "heart" | "search" | "close" | "chevron" | "pin" | "bed" | "size" | "grid" | "list" | "check" | "menu" | "expand";
function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    heart: <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    bed: <><path d="M3 18V6m18 12V9M3 14h18M3 18v3m18-3v3M3 9h18v9H3" /><path d="M7 9V6h4v3m2 0V6h4v3" /></>,
    size: <><path d="M4 10V4h6m4 0h6v6m0 4v6h-6m-4 0H4v-6" /><path d="m8 16 8-8" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
    list: <path d="M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1" />,
    check: <path d="m5 12 4 4L19 6" />,
    menu: <path d="M4 8h16M4 16h16" />,
    expand: <path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5" />,
  };
  return <svg className={`dw-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const number = (value: number) => value.toLocaleString("en-US");
const bedroomRange = (item: Community) => item.minBeds === item.maxBeds ? `${item.minBeds}` : `${item.minBeds}–${item.maxBeds}`;
const rooms = [
  { id: "living", name: "Living", image: "/assets/weekley/living.webp", title: "Room for real life.", copy: "Open, connected spaces that make an ordinary day feel a little more extraordinary.", detail: "Waterset · Apollo Beach, Florida" },
  { id: "kitchen", name: "Kitchen", image: "/assets/weekley/kitchen.webp", title: "The heart of home.", copy: "A place for slow mornings, shared meals and all the moments in between.", detail: "Bridgeland Central · Cypress, Texas" },
  { id: "dining", name: "Dining", image: "/assets/weekley/dining.webp", title: "Always room for one more.", copy: "Thoughtful spaces for everyday rituals and the people you love to bring together.", detail: "Waterset · Apollo Beach, Florida" },
  { id: "outdoors", name: "Outdoors", image: "/assets/weekley/outdoors.webp", title: "Take the long way home.", copy: "Step outside and discover the paths, parks and open spaces that connect a neighborhood.", detail: "Goodnight Ranch · Austin, Texas" },
];
const buyingPaths = [
  { title: "Find a home ready soon", label: "Quick move-in homes", copy: "Your next chapter may be closer than you think. Explore homes already under construction and see the details that make each one unique.", image: "/assets/weekley/waterset.webp", link: "/new-homes/fl/tampa/homes-ready-soon", action: "Explore quick move-ins" },
  { title: "Build a home around you", label: "A place to make your own", copy: "Start with a community you love. Explore floor plans, then discover the design choices available for your new home.", image: "/assets/weekley/bridgeland-detail.webp", link: "/new-homes", action: "Explore where we build" },
  { title: "See it. Walk it. Feel it.", label: "Model homes & virtual tours", copy: "See how the rooms connect, picture your furniture in the space and take your time finding the right fit.", image: "/assets/weekley/kitchen.webp", link: "/new-homes/fl/tampa/model-home-gallery", action: "Explore model homes" },
];
const markets = [
  ["Arizona", "Phoenix", "az/phoenix"], ["Arizona", "Scottsdale", "az/scottsdale"],
  ["Colorado", "Colorado Springs", "co/colorado-springs"], ["Colorado", "Denver", "co/denver"],
  ["Florida", "Jacksonville", "fl/jacksonville"], ["Florida", "Orlando", "fl/orlando"], ["Florida", "Sarasota", "fl/sarasota"], ["Florida", "Tampa", "fl/tampa"],
  ["Georgia", "Atlanta", "ga/atlanta"], ["Indiana", "Indianapolis", "in/indianapolis"], ["Minnesota", "Minneapolis/St. Paul", "mn/minneapolis-st-paul"],
  ["North Carolina", "Charlotte", "nc/charlotte"], ["North Carolina", "Raleigh, Durham, Chapel Hill", "nc/raleigh-durham-chapel-hill"],
  ["Oregon", "Portland", "or/portland"], ["South Carolina", "Charleston", "sc/charleston"], ["Tennessee", "Nashville", "tn/nashville"],
  ["Texas", "Austin", "tx/austin"], ["Texas", "Dallas/Ft. Worth", "tx/dallas-ft-worth"], ["Texas", "Houston", "tx/houston"], ["Texas", "San Antonio", "tx/san-antonio"],
  ["Utah", "Salt Lake City", "ut/salt-lake-city"], ["Washington", "Vancouver", "wa/vancouver"],
];

export function WeekleyMarketplace() {
  const site = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const roomImage = useRef<HTMLImageElement>(null);
  const pathImage = useRef<HTMLImageElement>(null);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);
  const [market, setMarket] = useState("All locations");
  const [budget, setBudget] = useState("Any price");
  const [beds, setBeds] = useState("Any beds");
  const [homeType, setHomeType] = useState("All homes");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");
  const [layout, setLayout] = useState("grid");
  const savedJson = useSyncExternalStore(subscribeSaved, savedSnapshot, savedServerSnapshot);
  const saved = useMemo<string[]>(() => {
    try { const ids: unknown = JSON.parse(savedJson); return Array.isArray(ids) ? ids.filter((id) => communityData.some((item) => item.id === id)) : []; } catch { return []; }
  }, [savedJson]);
  const [compare, setCompare] = useState<string[]>([]);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [room, setRoom] = useState(0);
  const [path, setPath] = useState(0);
  const [marketQuery, setMarketQuery] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 2800); return () => window.clearTimeout(timer); }, [notice]);
  const visible = useMemo(() => {
    const result = communityData.filter((item) =>
      (market === "All locations" || item.market === market) &&
      (budget === "Any price" || item.price <= Number(budget)) &&
      (beds === "Any beds" || item.maxBeds >= Number(beds)) &&
      (homeType === "All homes" || item.homeType === homeType) &&
      `${item.fullName} ${item.city} ${item.market}`.toLowerCase().includes(query.toLowerCase().trim()),
    );
    return sort === "price-low" ? result.sort((a, b) => a.price - b.price) : sort === "price-high" ? result.sort((a, b) => b.price - a.price) : sort === "size" ? result.sort((a, b) => b.maxSqft - a.maxSqft) : result;
  }, [market, budget, beds, homeType, query, sort]);
  const selected = overlay?.kind === "community" ? communityData.find((item) => item.id === overlay.id) : undefined;
  const selectedRoom = rooms[room];
  const reset = () => { setMarket("All locations"); setBudget("Any price"); setBeds("Any beds"); setHomeType("All homes"); setQuery(""); };
  const goToFinder = () => { setMenuOpen(false); document.getElementById("communities")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" }); };
  const toggleSaved = (item: Community) => { const exists = saved.includes(item.id); writeSaved(exists ? saved.filter((id) => id !== item.id) : [...saved, item.id]); setNotice(exists ? `${item.name} removed from your saved places` : `${item.name} saved to your places`); };
  const toggleCompare = (id: string) => setCompare((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : ids.length < 3 ? [...ids, id] : ids);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!overlay) { element.close(); return; }
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!element.open) element.showModal();
    return () => { document.body.style.overflow = oldOverflow; element.close(); previous?.focus(); };
  }, [overlay]);
  useEffect(() => {
    if (!site.current || reducedMotion) return;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.fromTo(".dw-hero__picture", { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.35, ease: "power3.inOut" });
      gsap.fromTo(".dw-hero__picture > img", { scale: 1.12 }, { scale: 1, duration: 2.2, ease: "power2.out" });
      gsap.fromTo(".dw-hero__intro, .dw-hero__actions, .dw-hero__foot", { y: 22, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.12, duration: 0.9, delay: 0.5, ease: "power3.out" });
      gsap.utils.toArray<HTMLElement>(".dw-reveal").forEach((element) => gsap.fromTo(element, { y: 36, opacity: 0.5 }, { y: 0, opacity: 1, duration: 0.85, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 92%", once: true } }));
      gsap.to(".dw-scroll-progress", { scaleX: 1, ease: "none", scrollTrigger: { trigger: site.current, start: "top top", end: "bottom bottom", scrub: true } });
      gsap.fromTo(".dw-life__title", { y: 60 }, { y: -25, ease: "none", scrollTrigger: { trigger: ".dw-life", start: "top bottom", end: "bottom top", scrub: 0.8 } });
    }, site);
    return () => context.revert();
  }, [reducedMotion]);
  useEffect(() => {
    if (!grid.current || reducedMotion) return;
    const tween = gsap.fromTo(grid.current.querySelectorAll(".dw-market-card"), { y: 18, opacity: 0.3 }, { y: 0, opacity: 1, stagger: 0.045, duration: 0.48, ease: "power2.out", clearProps: "transform,opacity" });
    return () => { tween.revert(); };
  }, [visible, layout, reducedMotion]);
  useEffect(() => {
    if (!roomImage.current || reducedMotion) return;
    const tween = gsap.fromTo(roomImage.current, { clipPath: "inset(0 0 0 100%)", scale: 1.04 }, { clipPath: "inset(0 0 0 0%)", scale: 1, duration: 0.85, ease: "power3.inOut" });
    return () => { tween.revert(); };
  }, [room, reducedMotion]);
  useEffect(() => {
    if (!pathImage.current || reducedMotion) return;
    const tween = gsap.fromTo(pathImage.current, { opacity: 0.3, scale: 1.035 }, { opacity: 1, scale: 1, duration: 0.7, ease: "power2.out" });
    return () => { tween.revert(); };
  }, [path, reducedMotion]);
  const filterSelects = (prefix: string) => <>
    <label><span>Location</span><select aria-label={`${prefix} location`} value={market} onChange={(event) => setMarket(event.target.value)}>{["All locations", "Tampa", "Austin", "Houston"].map((value) => <option key={value}>{value}</option>)}</select><Icon name="chevron" /></label>
    <label><span>Starting price</span><select aria-label={`${prefix} starting price`} value={budget} onChange={(event) => setBudget(event.target.value)}><option>Any price</option><option value="350000">Up to $350,000</option><option value="400000">Up to $400,000</option><option value="450000">Up to $450,000</option><option value="500000">Up to $500,000</option></select><Icon name="chevron" /></label>
    <label><span>Bedrooms</span><select aria-label={`${prefix} bedrooms`} value={beds} onChange={(event) => setBeds(event.target.value)}><option>Any beds</option><option value="3">3+ bedrooms</option><option value="4">4+ bedrooms</option><option value="5">5+ bedrooms</option></select><Icon name="chevron" /></label>
  </>;

  return <main className="dw-site" ref={site} id="top">
    <a className="dw-skip" href="#communities">Skip to home search</a>
    <header className="dw-header">
      <a className="dw-wordmark" href="#top" aria-label="David Weekley Homes home"><img src="/assets/weekley/logo.png" alt="David Weekley Homes" width="224" height="64" /></a>
      <nav id="dw-navigation" className={menuOpen ? "is-open" : ""} aria-label="Primary navigation">
        <a href="#communities" onClick={() => setMenuOpen(false)}>Find a home</a>
        <button onClick={() => { setOverlay({ kind: "markets" }); setMenuOpen(false); }}>Where we build <Icon name="chevron" /></button>
        <a href="#personalize" onClick={() => setMenuOpen(false)}>Design &amp; living</a>
        <a href="#difference" onClick={() => setMenuOpen(false)}>Our difference</a>
      </nav>
      <div className="dw-header__actions"><button className="dw-saved-button" aria-label={`Saved places (${saved.length})`} onClick={() => setOverlay({ kind: "saved" })}><Icon name="heart" /><span>Saved</span><b>{saved.length}</b></button><a className="dw-button dw-header__contact" href="#tour">Let’s connect <Icon name="arrow" /></a><button className="dw-menu-button dw-icon-button" aria-label={menuOpen ? "Close menu" : "Menu"} aria-expanded={menuOpen} aria-controls="dw-navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? "close" : "menu"} /></button></div>
      <div className="dw-scroll-progress" />
    </header>
    <div id="main-content">
      <section className="dw-hero" id="find" aria-label="Welcome to David Weekley Homes">
        <div className="dw-hero__content"><p className="dw-eyebrow"><span className="dw-rule" /> BUILDING DREAMS SINCE 1976</p><CinematicTextReveal as="h1" className="dw-hero__title">Life happens{" "}<br />here.</CinematicTextReveal><p className="dw-hero__intro">A home for the way you live.<br />A place for everything that comes next.</p><div className="dw-hero__actions"><MagneticSurface strength={0.08}><a className="dw-button" href="#communities">Find your community <Icon name="arrow" /></a></MagneticSurface><a className="dw-link" href="#personalize">Imagine the possibilities</a></div><div className="dw-hero__foot"><span>Designed around you.</span><a href="#difference">Discover the Weekley difference <Icon name="arrow" /></a></div></div>
        <div className="dw-hero__picture"><img src="/assets/weekley/hero.webp" alt="Homes along a welcoming street at The Twilight at Goodnight Ranch, Austin, at sunset" fetchPriority="high" width="2200" height="1467" /><div className="dw-hero__photo-gradient" /><span className="dw-image-tag">A PLACE TO BELONG</span><button className="dw-hero__caption" onClick={() => setOverlay({ kind: "community", id: "twilight" })}><span><small>AUSTIN, TEXAS</small><strong>The Twilight at Goodnight Ranch</strong></span><span className="dw-round-arrow"><Icon name="arrow" /></span></button></div>
      </section>
      <section className="dw-search-strip" aria-label="Start your home search"><div className="dw-search-strip__title"><Icon name="search" /><div><span>Let’s find your place.</span><small>Explore our featured communities</small></div></div><div className="dw-search">{filterSelects("Search")}<button className="dw-button" data-forge-interaction="market-search" onClick={goToFinder}>Explore homes <Icon name="arrow" /></button></div></section>
      <section className="dw-section dw-market-section" id="communities" aria-labelledby="markets-title">
        <div className="dw-section-head"><div><p className="dw-eyebrow">PLACES. POSSIBILITIES. YOURS.</p><h2 id="markets-title">Find your next chapter.</h2></div><button className="dw-link" onClick={() => setOverlay({ kind: "markets" })}>Explore all locations <Icon name="arrow" /></button></div>
        <div className="dw-finder"><div className="dw-finder-top"><div className="dw-segmented" aria-label="Home type">{["All homes", "Single-family", "Townhome"].map((type) => <button key={type} aria-pressed={homeType === type} onClick={() => setHomeType(type)}>{type === "Townhome" ? "Townhomes" : type}</button>)}</div><label className="dw-query"><Icon name="search" /><input aria-label="Search featured communities" placeholder="Search a place or community" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div><div className="dw-filter-row">{filterSelects("Filter")}<button className="dw-reset" onClick={reset}>Reset filters</button></div></div>
        <div className="dw-results-toolbar"><p role="status" aria-live="polite"><strong>{visible.length}</strong> featured {visible.length === 1 ? "community" : "communities"}{market !== "All locations" ? ` in ${market}` : " to explore"}</p><div><label className="dw-sort"><span>Sort by</span><select aria-label="Sort communities" value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="size">Largest homes</option></select></label><div className="dw-view-switch"><button className="dw-icon-button" aria-label="Grid view" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")}><Icon name="grid" /></button><button className="dw-icon-button" aria-label="List view" aria-pressed={layout === "list"} onClick={() => setLayout("list")}><Icon name="list" /></button></div></div></div>
        <div className={`dw-market-grid ${layout === "list" ? "is-list" : ""}`} ref={grid}>{visible.map((item) => <article className="dw-market-card" key={item.id}>
          <div className="dw-market-card__image"><button className="dw-card-photo" aria-label={`Explore ${item.fullName}`} onClick={() => setOverlay({ kind: "community", id: item.id })}><img src={item.image} alt={`${item.fullName} homes`} width="1200" height="800" loading="lazy" /><span className="dw-photo-action">Explore community <Icon name="arrow" /></span></button><span className="dw-card-tag">{item.homeType === "Townhome" ? "TOWNHOMES" : "NOW SELLING"}</span><button className={`dw-save ${saved.includes(item.id) ? "is-saved" : ""}`} aria-label={`${saved.includes(item.id) ? "Unsave" : "Save"} ${item.fullName}`} aria-pressed={saved.includes(item.id)} onClick={() => toggleSaved(item)}><Icon name="heart" /></button></div>
          <div className="dw-market-card__body"><p className="dw-card-location"><Icon name="pin" />{item.city}, {item.state}</p><button className="dw-card-title" onClick={() => setOverlay({ kind: "community", id: item.id })}><h3>{item.name}</h3><span>{item.collection}</span></button><p className="dw-card-price"><span>From</span> {money(item.price)}</p><div className="dw-card-specs"><span><Icon name="bed" />{bedroomRange(item)} beds</span><span><Icon name="size" />{number(item.minSqft)}–{number(item.maxSqft)} sq. ft.</span></div><div className="dw-market-card__actions"><label><input type="checkbox" checked={compare.includes(item.id)} disabled={!compare.includes(item.id) && compare.length >= 3} onChange={() => toggleCompare(item.id)} />Compare</label><button className="dw-link" onClick={() => setOverlay({ kind: "community", id: item.id })}>View details <Icon name="arrow" /></button></div></div>
        </article>)}</div>
        {!visible.length && <div className="dw-empty"><Icon name="search" /><h3>A small change opens up more possibilities.</h3><p>Try a different location, home type or starting price.</p><button className="dw-button" onClick={reset}>Clear all filters <Icon name="arrow" /></button></div>}
        <div className="dw-results-foot"><p>Featured community information as of September 24, 2026. Starting prices and availability may change. Optional bedroom configurations vary by plan.</p><a className="dw-link" href={`${official}/new-homes`} target="_blank" rel="noreferrer">Browse the full collection <Icon name="arrow" /></a></div>
      </section>
      <section className="dw-section dw-plans" id="plans" aria-label="Ways to buy"><div className="dw-plans__lead"><p className="dw-eyebrow">YOUR HOME. YOUR TIMELINE.</p><CinematicTextReveal as="h2">A new home.{" "}<br />Your way.</CinematicTextReveal><p>Whether you’re ready to move or ready to dream, there’s a place to begin.</p><div className="dw-paths" aria-label="Ways to buy">{buyingPaths.map((item, index) => <div className={`dw-path ${path === index ? "is-active" : ""}`} key={item.title}><button aria-expanded={path === index} aria-controls={`dw-path-${index}`} onClick={() => setPath(index)}><span>0{index + 1}</span>{item.title}<Icon name="arrow" /></button><div id={`dw-path-${index}`} hidden={path !== index}><p>{item.copy}</p><a className="dw-link" href={`${official}${item.link}`} target="_blank" rel="noreferrer">{item.action}<Icon name="arrow" /></a></div></div>)}</div></div><div className="dw-path-visual"><img ref={pathImage} src={buyingPaths[path].image} alt={buyingPaths[path].label} width="1200" height="1000" loading="lazy" /><span className="dw-path-caption"><small>THE POSSIBILITIES START HERE</small>{buyingPaths[path].label}</span></div></section>
      <section className="dw-section dw-personalize" id="personalize" aria-labelledby="personalize-title"><div className="dw-section-head"><div><p className="dw-eyebrow">THOUGHTFUL BY DESIGN</p><h2 id="personalize-title">Made for the everyday.<br />And everything else.</h2></div><p>Good design makes room for you.<br />Explore the spaces that bring it to life.</p></div><div className="dw-room-stage"><div className="dw-personalize__visual" data-gallery={selectedRoom.id}><img ref={roomImage} src={selectedRoom.image} alt={`${selectedRoom.name} at ${selectedRoom.detail}`} width="1800" height="1200" loading="lazy" /><button className="dw-expand dw-icon-button" aria-label="Enlarge room photography" onClick={() => setOverlay({ kind: "gallery" })}><Icon name="expand" /></button><span className="dw-room-location">{selectedRoom.detail}</span></div><div className="dw-room-copy"><p className="dw-room-index">0{room + 1}<span> / 04</span></p><div className="dw-gallery-label"><small>{selectedRoom.name}</small><h3>{selectedRoom.title}</h3></div><p>{selectedRoom.copy}</p><div className="dw-room-arrows"><button className="dw-icon-button" aria-label="Previous room" onClick={() => setRoom((room + rooms.length - 1) % rooms.length)}><Icon name="arrow" className="dw-reverse" /></button><button className="dw-icon-button" aria-label="Next room" onClick={() => setRoom((room + 1) % rooms.length)}><Icon name="arrow" /></button></div><a className="dw-link" href={`${official}/new-homes/fl/tampa/design-center`} target="_blank" rel="noreferrer">Explore design choices <Icon name="arrow" /></a></div></div><div className="dw-room-tabs" aria-label="Explore home spaces">{rooms.map((item, index) => <button key={item.id} data-forge-interaction="select-gallery" aria-pressed={room === index} onClick={() => setRoom(index)}><span>0{index + 1}</span>{item.name}<span className="dw-room-tab-line" /></button>)}</div></section>
      <section className="dw-life" id="life" aria-label="Life at Goodnight Ranch"><ParallaxLayer className="dw-life__image" speed={0.32} distance={180}><img src="/assets/weekley/outdoors.webp" alt="Tree-lined walking paths and open water at Goodnight Ranch in Austin" width="1800" height="1200" loading="lazy" /></ParallaxLayer><div className="dw-life__wash" /><div className="dw-life__content"><p className="dw-eyebrow">BEYOND YOUR FRONT DOOR</p><h2 className="dw-life__title">Home is more<br />than a house.</h2><div className="dw-life__bottom"><p>Room to roam. Places to gather.<br />Discover life at Goodnight Ranch, Austin.</p><button className="dw-button dw-button--white" onClick={() => setOverlay({ kind: "community", id: "goodnight" })}>Explore the neighborhood <Icon name="arrow" /></button></div></div><span className="dw-life__credit">GOODNIGHT RANCH · AUSTIN, TEXAS</span></section>
      <section className="dw-section dw-difference" id="difference" aria-labelledby="difference-title"><div className="dw-difference__intro"><p className="dw-eyebrow">THE DAVID WEEKLEY DIFFERENCE</p><h2 id="difference-title">Built around people.<br />Since 1976.</h2><p>A thoughtfully designed home is just the beginning. Our promise of Design, Choice and Service guides the whole experience.</p><a className="dw-link" href={`${official}/about-us`} target="_blank" rel="noreferrer">Get to know us <Icon name="arrow" /></a><div className="dw-trust"><strong>125,000+</strong><span>Homeowners and counting</span></div></div><div className="dw-values">{[{title:"Design",text:"Spaces that work beautifully.",copy:"LifeDesign℠ considers sight lines, room placement and natural light to create a home that lives as well as it looks."},{title:"Choice",text:"The details make it yours.",copy:"Explore floor plans, finishes and design selections that reflect your style and the way you want to live."},{title:"Service",text:"People beside you, every step.",copy:"From your first conversation through construction and beyond, a dedicated team helps you feel informed and at home."}].map((item,index)=><article className="dw-value dw-reveal" key={item.title}><span className="dw-value-number">0{index+1}</span><div><h3>{item.title}</h3><h4>{item.text}</h4><p>{item.copy}</p></div></article>)}</div></section>
      <section className="dw-tour" id="tour" aria-labelledby="tour-title"><div><p className="dw-eyebrow">LET’S MAKE IT REAL</p><h2 id="tour-title">Come see what<br />home feels like.</h2><p>Walk through a model. Explore a neighborhood.<br />Find answers from someone who knows the way.</p><div className="dw-tour-actions"><a className="dw-button dw-button--white" data-forge-interaction="schedule-tour" href={`${official}/contact-us`} target="_blank" rel="noreferrer">Plan your visit <Icon name="arrow" /></a><button className="dw-link" onClick={() => setOverlay({ kind: "markets" })}>Find a local team <Icon name="arrow" /></button></div></div><div className="dw-tour-image"><img src="/assets/weekley/waterset-detail.webp" alt="A welcoming David Weekley kitchen at Waterset" width="1200" height="800" loading="lazy" /></div></section>
    </div>
    <footer className="dw-footer"><div className="dw-footer-main"><a href="#top"><img src="/assets/weekley/logo.png" alt="David Weekley Homes" width="224" height="64" /></a><div><h3>Find your home</h3><button onClick={goToFinder}>Featured communities</button><button onClick={() => setOverlay({ kind: "markets" })}>Where we build</button><a href={`${official}/new-homes`}>All new homes</a></div><div><h3>Make it yours</h3><a href="#personalize">Design &amp; living</a><a href={`${official}/livingweekley/home-buying-made-simple`}>Homebuying resources</a><a href={`${official}/contact-us`}>Contact us</a></div><div><h3>David Weekley Homes</h3><a href={`${official}/about-us`}>Our story</a><a href={`${official}/page/reviews`}>Homeowner reviews</a><a href="https://www.workforweekley.com/">Careers</a></div></div><div className="dw-footer-bottom"><p>© {new Date().getFullYear()} David Weekley Homes. All rights reserved.</p><p>Equal Housing Opportunity</p><a href={`${official}/privacy-policy`}>Privacy policy</a><a href="#top">Back to top ↑</a></div></footer>
    {!!compare.length && <aside className="dw-compare" aria-label="Community comparison"><span><strong>{compare.length}</strong> of 3 communities selected</span><button className="dw-button" disabled={compare.length < 2} onClick={() => setOverlay({ kind: "compare" })}>Compare communities <Icon name="arrow" /></button><button className="dw-icon-button" aria-label="Clear comparison" onClick={() => setCompare([])}><Icon name="close" /></button></aside>}
    <div className="dw-mobile-dock"><button onClick={goToFinder}><Icon name="search" />Find a home</button><button onClick={() => setOverlay({ kind: "saved" })}><Icon name="heart" />Saved places ({saved.length})</button></div>
    <div className={`dw-toast ${notice ? "is-visible" : ""}`} role="status">{notice && <><Icon name="check" />{notice}</>}</div>
    <dialog ref={dialog} className={`dw-dialog ${overlay?.kind === "gallery" ? "dw-dialog--gallery" : ""}`} data-lenis-prevent onCancel={() => setOverlay(null)} onClick={(event) => { if (event.target === event.currentTarget) setOverlay(null); }} aria-labelledby="dw-dialog-title"><div className="dw-dialog-panel"><button className="dw-dialog-close dw-icon-button" aria-label="Close panel" onClick={() => setOverlay(null)}><Icon name="close" /></button>
      {overlay?.kind === "community" && selected && <><img className="dw-detail-hero" src={selected.image} alt={selected.fullName} /><div className="dw-detail-body"><p className="dw-eyebrow">{selected.city}, {selected.state} · {selected.homeType}</p><h2 id="dw-dialog-title">{selected.name}</h2><p className="dw-detail-collection">{selected.collection}</p><div className="dw-detail-stats"><span><small>STARTING FROM</small>{money(selected.price)}</span><span><small>BEDROOMS</small>{bedroomRange(selected)}</span><span><small>SQUARE FEET</small>{number(selected.minSqft)}–{number(selected.maxSqft)}</span></div><p>{selected.description}</p><div className="dw-amenities">{selected.amenities.filter((value)=>!["Emergency","Home Owners Association","Grocery","Hospital"].includes(value)).slice(0,8).map((value)=><span key={value}>{value}</span>)}</div><div className="dw-detail-actions"><a className="dw-button" href={selected.url} target="_blank" rel="noreferrer">Current homes &amp; availability <Icon name="arrow" /></a><button className="dw-button dw-button--outline" aria-pressed={saved.includes(selected.id)} onClick={()=>toggleSaved(selected)}><Icon name="heart" />{saved.includes(selected.id)?"Saved to your places":"Save this community"}</button></div><h3 className="dw-detail-subheading">A few ways to call it home.</h3><div className="dw-floorplans">{selected.plans.slice(0,4).map((plan)=><a href={plan.url} key={plan.name} target="_blank" rel="noreferrer"><strong>The {plan.name}</strong><span>{plan.beds === plan.maxBeds ? plan.beds : `${plan.beds}–${plan.maxBeds}`} beds · {number(plan.sqft)} sq. ft.</span><span>{plan.price ? `From ${money(plan.price)}` : "Ask about pricing"}</span><Icon name="arrow" /></a>)}</div><p className="dw-disclaimer">Information collected September 24, 2026. Prices, plan options and availability are subject to change. Confirm details with the community sales team.</p></div></>}
      {overlay?.kind === "saved" && <div className="dw-overlay-content"><p className="dw-eyebrow">KEEP THE POSSIBILITIES CLOSE</p><h2 id="dw-dialog-title">Your saved places.</h2><p>Saved on this browser, ready when you are.</p>{!saved.length ? <div className="dw-empty"><Icon name="heart" /><h3>A place for your favorites.</h3><p>Tap the heart on a community to keep it here.</p><button className="dw-button" onClick={()=>{setOverlay(null);goToFinder();}}>Explore communities <Icon name="arrow" /></button></div> : <div className="dw-saved-list">{communityData.filter(item=>saved.includes(item.id)).map(item=><article key={item.id}><img src={item.image} alt={item.fullName}/><div><small>{item.city}, {item.state}</small><h3>{item.fullName}</h3><p>From {money(item.price)}</p><button className="dw-link" onClick={()=>setOverlay({kind:"community",id:item.id})}>View community <Icon name="arrow" /></button></div><button className="dw-icon-button" aria-label={`Remove ${item.fullName}`} onClick={()=>toggleSaved(item)}><Icon name="close" /></button></article>)}</div>}</div>}
      {overlay?.kind === "compare" && <div className="dw-overlay-content"><p className="dw-eyebrow">A CLOSER LOOK</p><h2 id="dw-dialog-title">Compare your possibilities.</h2><div className="dw-comparison-grid">{communityData.filter(item=>compare.includes(item.id)).map(item=><article key={item.id}><img src={item.image} alt={item.fullName}/><p className="dw-eyebrow">{item.city}, {item.state}</p><h3>{item.fullName}</h3><dl><div><dt>Starting price</dt><dd>{money(item.price)}</dd></div><div><dt>Bedrooms</dt><dd>{bedroomRange(item)}</dd></div><div><dt>Size</dt><dd>{number(item.minSqft)}–{number(item.maxSqft)} sq. ft.</dd></div><div><dt>Home type</dt><dd>{item.homeType}</dd></div></dl><button className="dw-link" onClick={()=>setOverlay({kind:"community",id:item.id})}>Explore community <Icon name="arrow" /></button></article>)}</div><p className="dw-disclaimer">Starting prices shown as of September 24, 2026. Confirm current pricing and available configurations with David Weekley Homes.</p></div>}
      {overlay?.kind === "markets" && <div className="dw-overlay-content"><p className="dw-eyebrow">WHERE WE BUILD</p><h2 id="dw-dialog-title">A place you’ll love.</h2><label className="dw-query dw-market-query"><Icon name="search"/><input aria-label="Search all locations" placeholder="Search a city or state" value={marketQuery} onChange={event=>setMarketQuery(event.target.value)}/></label><div className="dw-all-markets">{[...new Set(markets.map(item=>item[0]))].map(state=>{const items=markets.filter(item=>item[0]===state&&item.join(" ").toLowerCase().includes(marketQuery.toLowerCase()));return !!items.length&&<div key={state}><h3>{state}</h3>{items.map(item=><a href={`${official}/new-homes/${item[2]}`} key={item[1]} target="_blank" rel="noreferrer">{item[1]}<Icon name="arrow"/></a>)}</div>})}</div>{!markets.some(item=>item.join(" ").toLowerCase().includes(marketQuery.toLowerCase()))&&<p>No locations match your search. Try a city or state name.</p>}</div>}
      {overlay?.kind === "gallery" && <div className="dw-lightbox"><h2 id="dw-dialog-title" className="dw-sr-only">{selectedRoom.name} photography</h2><img src={selectedRoom.image} alt={`${selectedRoom.name} at ${selectedRoom.detail}`}/><div><button className="dw-icon-button" aria-label="Previous gallery image" onClick={()=>setRoom((room+rooms.length-1)%rooms.length)}><Icon name="arrow" className="dw-reverse"/></button><p>{selectedRoom.detail}</p><button className="dw-icon-button" aria-label="Next gallery image" onClick={()=>setRoom((room+1)%rooms.length)}><Icon name="arrow"/></button></div></div>}
    </div></dialog>
  </main>;
}

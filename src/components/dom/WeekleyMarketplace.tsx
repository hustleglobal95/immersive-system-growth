"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const officialHomes = "https://www.davidweekleyhomes.com/new-homes";
const officialContact = "https://www.davidweekleyhomes.com/contact-us";
const officialLogo = "https://www.davidweekleyhomes.com/_images/dwh_logo.png";

const officialImages = {
  living: "https://www.davidweekleyhomes.com/media/HomeGalleryImage/71aa7185-90ac-4561-b600-53a6ccbab22b.jpg",
  kitchen: "https://www.davidweekleyhomes.com/media/HomeGalleryImage/aa45cb37-1050-43b1-9b8b-d139dbd31772.jpg",
  bedroom: "https://www.davidweekleyhomes.com/media/HomeGalleryImage/085436a0-01f1-4a12-bf9c-557f2f63be4a.jpg",
  exterior: "https://www.davidweekleyhomes.com/media/HomeGalleryImage/c8dcfecc-c338-4686-8bc0-8aa5f96cf9ff.jpg",
};

const marketDestinations: Record<string, { homes: string; ready: string; models: string }> = {
  Houston: {
    homes: "https://www.davidweekleyhomes.com/new-homes/tx/houston",
    ready: "https://www.davidweekleyhomes.com/new-homes/tx/houston/homes-ready-soon",
    models: "https://www.davidweekleyhomes.com/new-homes/tx/houston/model-home-gallery",
  },
  Austin: {
    homes: "https://www.davidweekleyhomes.com/new-homes/tx/austin",
    ready: "https://www.davidweekleyhomes.com/new-homes/tx/austin/homes-ready-soon",
    models: "https://www.davidweekleyhomes.com/new-homes/tx/austin/model-home-gallery",
  },
  Tampa: {
    homes: "https://www.davidweekleyhomes.com/new-homes/fl/tampa",
    ready: "https://www.davidweekleyhomes.com/new-homes/fl/tampa/homes-ready-soon",
    models: "https://www.davidweekleyhomes.com/new-homes/fl/tampa/model-home-gallery",
  },
};

const marketPaths = [
  {
    id: "houston",
    market: "Houston",
    title: "Houston",
    type: "Texas",
    copy: "Explore neighborhoods across David Weekley's home market, including city living and homes ready soon.",
    image: officialImages.exterior,
    imagePosition: "50% 48%",
    href: marketDestinations.Houston.homes,
  },
  {
    id: "austin",
    market: "Austin",
    title: "Austin",
    type: "Texas",
    copy: "Find new communities, ready homes and model homes throughout the Austin area.",
    image: officialImages.living,
    imagePosition: "50% 48%",
    href: marketDestinations.Austin.homes,
  },
  {
    id: "tampa",
    market: "Tampa",
    title: "Tampa Bay",
    type: "Florida",
    copy: "Discover coastal communities, South Tampa city homes and available homes across the region.",
    image: officialImages.kitchen,
    imagePosition: "50% 50%",
    href: marketDestinations.Tampa.homes,
  },
];

const planPaths = [
  {
    id: "ready",
    eyebrow: "01 / Move sooner",
    title: "A home ready soon",
    story: "Start with homes already underway. See the actual location, plan and expected timing on David Weekley's live listings.",
    specs: ["Live availability", "Actual home details", "A shorter path to move-in"],
    bestFor: "When timing leads the decision",
    destination: "ready" as const,
  },
  {
    id: "community",
    eyebrow: "02 / Choose a place",
    title: "Build in a community",
    story: "Find the neighborhood first, then explore its homes, floor plans and the choices available there.",
    specs: ["Community context", "Floor plan options", "Design choices"],
    bestFor: "When where you live matters most",
    destination: "homes" as const,
  },
  {
    id: "model",
    eyebrow: "03 / Experience it",
    title: "Walk through a model",
    story: "Move beyond floor plan diagrams and see how the spaces connect before you plan an in-person visit.",
    specs: ["Model home gallery", "Room-by-room views", "Visit planning"],
    bestFor: "When you need to feel the space",
    destination: "models" as const,
  },
];

const galleryViews = [
  { id: "living", name: "Living", image: officialImages.living, alt: "David Weekley Homes living and dining room" },
  { id: "kitchen", name: "Kitchen", image: officialImages.kitchen, alt: "David Weekley Homes kitchen" },
  { id: "bedroom", name: "Owner's retreat", image: officialImages.bedroom, alt: "David Weekley Homes owner's retreat" },
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  );
}

function Wordmark() {
  return (
    <a className="dw-wordmark" href="#top" aria-label="David Weekley Homes redesign concept home">
      <img src={officialLogo} alt="David Weekley Homes" />
    </a>
  );
}

export function WeekleyMarketplace() {
  const [market, setMarket] = useState("Any market");
  const [homeType, setHomeType] = useState("Any home type");
  const [timeline, setTimeline] = useState("Any timeline");
  const [searched, setSearched] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const comparePanelRef = useRef<HTMLElement>(null);
  const [gallery, setGallery] = useState("living");
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleMarkets = useMemo(
    () => market === "Any market" ? marketPaths : marketPaths.filter((item) => item.market === market),
    [market],
  );
  const selectedGallery = galleryViews.find((item) => item.id === gallery) ?? galleryViews[0];
  const selectedMarkets = marketPaths.filter((item) => compare.includes(item.id));
  const selectedDestination = marketDestinations[market];
  const readySoon = homeType === "Move-in ready" || timeline === "As soon as possible";
  const resultUrl = selectedDestination
    ? selectedDestination[readySoon ? "ready" : "homes"]
    : officialHomes;
  const resultLabel = selectedDestination
    ? `${readySoon ? "View homes ready soon" : "Explore new homes"} in ${market}`
    : "Choose a market on the official site";

  useEffect(() => {
    if (!compareOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = comparePanelRef.current;
    panel?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCompareOpen(false);
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('button, a[href]')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
  }, [compareOpen]);

  const runSearch = () => {
    setSearched(true);
    document.querySelector("#communities")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleCompare = (id: string) => {
    setCompare((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 3 ? [...current, id] : current,
    );
  };

  return (
    <main className="dw-site" id="top">
      <a className="dw-skip" href="#main-content">Skip to main content</a>
      <header className="dw-header">
        <Wordmark />
        <button
          className="dw-menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="dw-navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span /> <span /> <span />
          <b>{menuOpen ? "Close" : "Menu"}</b>
        </button>
        <nav id="dw-navigation" className={menuOpen ? "is-open" : ""} aria-label="Primary navigation">
          <a href="#communities" onClick={() => setMenuOpen(false)}>Find a home</a>
          <a href="#plans" onClick={() => setMenuOpen(false)}>Home plans</a>
          <a href="#personalize" onClick={() => setMenuOpen(false)}>Design &amp; Choice</a>
          <a href="#difference" onClick={() => setMenuOpen(false)}>Why Weekley</a>
        </nav>
        <a className="dw-header__cta" href={officialContact} target="_blank" rel="noreferrer">
          Talk to us <ArrowIcon />
        </a>
      </header>

      <div id="main-content">
        <section className="dw-hero" id="find" aria-labelledby="dw-hero-title">
          <div className="dw-hero__image" role="img" aria-label="David Weekley Homes exterior" />
          <div className="dw-hero__wash" />
          <div className="dw-hero__content">
            <p className="dw-kicker"><span>David Weekley Homes</span> / A better way to begin</p>
            <h1 id="dw-hero-title">Find the home<br />your life fits into.</h1>
            <p className="dw-hero__intro">The right home starts with the right questions. Explore where you want to be, how you want to live, and what comes next.</p>
            <a className="dw-text-link dw-text-link--light" href="#communities">Explore places to live <ArrowIcon /></a>
          </div>

          <div className="dw-hero__caption"><span>THE WEEKLEY EXPERIENCE</span><span>Design / Choice / Service</span></div>

          <div className="dw-search" aria-label="Home search">
            <div className="dw-search__heading">
              <span>Begin your search</span>
              <small>Find a path that fits your life.</small>
            </div>
            <label>
              <span>Where</span>
              <select value={market} onChange={(event) => { setMarket(event.target.value); setSearched(false); }}>
                <option>Any market</option>
                <option>Houston</option>
                <option>Austin</option>
                <option>Tampa</option>
              </select>
            </label>
            <label>
              <span>What</span>
              <select value={homeType} onChange={(event) => setHomeType(event.target.value)}>
                <option>Any home type</option>
                <option>Move-in ready</option>
                <option>Build from a plan</option>
              </select>
            </label>
            <label>
              <span>When</span>
              <select value={timeline} onChange={(event) => setTimeline(event.target.value)}>
                <option>Any timeline</option>
                <option>As soon as possible</option>
                <option>Within 12 months</option>
                <option>Still exploring</option>
              </select>
            </label>
            <button type="button" data-forge-interaction="market-search" onClick={runSearch}>
              Show my paths <ArrowIcon />
            </button>
          </div>
        </section>

        <section className="dw-proof-bar" aria-label="Company facts">
          <p><strong>Since 1976</strong><span>Building dreams, enhancing lives</span></p>
          <p><strong>125,000+</strong><span>Homeowners and counting</span></p>
          <p><strong>19 markets</strong><span>Across 13 states</span></p>
          <a href="#difference">Our difference <ArrowIcon /></a>
        </section>

        <section className="dw-section dw-market-section" id="communities" aria-labelledby="markets-title">
          <div className="dw-section-head">
            <div>
              <p className="dw-kicker">Explore by market</p>
              <h2 id="markets-title">Find your place.<br />Then find your home.</h2>
            </div>
            <p>Explore a few of the places David Weekley builds. Each destination opens real communities and current home information on the official website.</p>
          </div>

          {searched && (
            <div className="dw-search-result" role="status">
              <div><strong>{market === "Any market" ? "Start with a location" : `Your ${market} search`}</strong><span>{readySoon ? "Timing matters most. Start with current homes ready soon." : homeType === "Build from a plan" ? "Explore communities and available home designs." : "Explore communities and current home options."}</span></div>
              <a href={resultUrl} target="_blank" rel="noreferrer">{resultLabel} <ArrowIcon /></a>
            </div>
          )}

          <div className="dw-market-grid">
            {visibleMarkets.map((item, index) => (
              <article className="dw-market-card" key={item.id}>
                <div className="dw-market-card__image">
                  <img src={item.image} alt="David Weekley Homes photography" style={{ objectPosition: item.imagePosition }} />
                  <span>0{index + 1} / 03</span>
                </div>
                <div className="dw-market-card__body">
                  <p>{item.market} <span>{item.type}</span></p>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                  <div className="dw-market-card__actions">
                    <a href={item.href} target="_blank" rel="noreferrer">Explore {item.market} <ArrowIcon /></a>
                    <button
                      type="button"
                      className={compare.includes(item.id) ? "is-selected" : ""}
                      onClick={() => toggleCompare(item.id)}
                      data-forge-interaction="compare-community"
                      aria-pressed={compare.includes(item.id)}
                    >
                      {compare.includes(item.id) ? "Added" : "Compare"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="dw-section dw-plans" id="plans" aria-labelledby="plans-title">
          <div className="dw-plans__lead">
            <p className="dw-kicker">Plan finder</p>
            <h2 id="plans-title">Three ways<br />to move forward.</h2>
            <p>Your next step depends on what matters most today: timing, place, or the feeling of walking through a home.</p>
            <a className="dw-text-link" href={resultUrl} target="_blank" rel="noreferrer">Explore real homes <ArrowIcon /></a>
          </div>
          <div className="dw-plan-list">
            {planPaths.map((plan) => (
              <article className="dw-plan-card" key={plan.id}>
                <p>{plan.eyebrow}</p>
                <h3>{plan.title}</h3>
                <p>{plan.story}</p>
                <ul>{plan.specs.map((spec) => <li key={spec}>{spec}</li>)}</ul>
                <dl><dt>Best for</dt><dd>{plan.bestFor}</dd></dl>
                <a className="dw-plan-card__link" href={selectedDestination?.[plan.destination] ?? officialHomes} target="_blank" rel="noreferrer">
                  {plan.destination === "ready" ? "See homes ready soon" : plan.destination === "models" ? "Explore model homes" : "Browse communities"} <ArrowIcon />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="dw-personalize" id="personalize" aria-labelledby="personalize-title">
          <div className="dw-personalize__visual" data-gallery={selectedGallery.id}>
            <img src={selectedGallery.image} alt={selectedGallery.alt} />
            <div className="dw-gallery-label"><small>Home gallery</small><strong>{selectedGallery.name}</strong></div>
          </div>
          <div className="dw-personalize__content">
            <p className="dw-kicker">Design &amp; Choice</p>
            <h2 id="personalize-title">Make it yours without making it harder.</h2>
            <p>Explore real David Weekley Homes rooms, understand the decisions that matter, and see how thoughtful design supports everyday life.</p>
            <fieldset>
              <legend>Explore the home gallery</legend>
              {galleryViews.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={gallery === item.id ? "is-active" : ""}
                  onClick={() => setGallery(item.id)}
                  data-forge-interaction="select-gallery"
                  aria-pressed={gallery === item.id}
                >
                  <img src={item.image} alt="" />
                  {item.name}
                </button>
              ))}
            </fieldset>
            <a className="dw-text-link" href="https://www.davidweekleyhomes.com/new-homes/fl/tampa/design-center" target="_blank" rel="noreferrer">Explore the Tampa Design Center <ArrowIcon /></a>
          </div>
        </section>

        <section className="dw-section dw-difference" id="difference" aria-labelledby="difference-title">
          <div className="dw-section-head">
            <div>
              <p className="dw-kicker">The Weekley difference</p>
              <h2 id="difference-title">A home is a product.<br />The experience is personal.</h2>
            </div>
            <p>Design, Choice and Service are presented as one connected process, not three disconnected promises.</p>
          </div>
          <div className="dw-difference-grid">
            <article><span>01</span><h3>Design</h3><p>Plans begin with the way rooms connect, how light moves and how daily routines actually work.</p></article>
            <article><span>02</span><h3>Choice</h3><p>Personalize the decisions you will feel every day with guidance that keeps the whole home coherent.</p></article>
            <article><span>03</span><h3>Service</h3><p>Know what happens next, who owns the answer and where your home stands throughout the process.</p></article>
          </div>
          <blockquote>
            <p>“Building Dreams, Enhancing Lives” becomes useful when every next step feels clear.</p>
            <footer>FORGE redesign principle</footer>
          </blockquote>
        </section>

        <section className="dw-tour" id="tour" aria-labelledby="tour-title">
          <div className="dw-tour__content">
            <p className="dw-kicker">Your next step</p>
            <h2 id="tour-title">See the difference in person.</h2>
            <p>Tell a local team what matters to you. They can help you find the right community, home and timing without starting from scratch.</p>
            <div>
              <a className="dw-button dw-button--light" href={officialContact} target="_blank" rel="noreferrer" data-forge-interaction="schedule-tour">Plan a visit <ArrowIcon /></a>
              <a className="dw-text-link dw-text-link--light" href={officialHomes} target="_blank" rel="noreferrer">View live homes <ArrowIcon /></a>
            </div>
          </div>
          <div className="dw-tour__steps" aria-label="What happens next">
            <p><span>01</span><strong>Share your priorities</strong><small>Location, timing and the way you live.</small></p>
            <p><span>02</span><strong>Compare real options</strong><small>Communities, plans and available homes.</small></p>
            <p><span>03</span><strong>Visit with a purpose</strong><small>See the choices that fit, in person.</small></p>
          </div>
        </section>
      </div>

      <footer className="dw-footer">
        <div><Wordmark /><p>Building Dreams, Enhancing Lives.</p></div>
        <div><strong>Explore</strong><a href="#communities">Find a home</a><a href="#plans">Home plans</a><a href="#personalize">Design &amp; Choice</a></div>
        <div><strong>Learn</strong><a href="#difference">Why Weekley</a><a href={officialContact} target="_blank" rel="noreferrer">Contact</a><a href={officialHomes} target="_blank" rel="noreferrer">Official website</a></div>
        <div className="dw-footer__note"><strong>About this build</strong><p>Independent FORGE redesign concept. Live availability, pricing and company services remain on the official David Weekley Homes website.</p></div>
        <p className="dw-footer__bottom"><span>Concept built with FORGE</span><span>Not an official David Weekley Homes production site</span></p>
      </footer>

      {compare.length > 0 && (
        <aside className="dw-compare" aria-live="polite">
          <span><strong>{compare.length}</strong> {compare.length === 1 ? "market" : "markets"} selected</span>
          <button type="button" onClick={() => { setCompare([]); setCompareOpen(false); }}>Clear</button>
          <button type="button" className="dw-compare__open" onClick={() => setCompareOpen(true)}>Compare markets <ArrowIcon /></button>
        </aside>
      )}

      {compareOpen && selectedMarkets.length > 0 && (
        <div className="dw-compare-dialog" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCompareOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="dw-compare-title" className="dw-compare-dialog__panel" ref={comparePanelRef}>
            <div className="dw-compare-dialog__head">
              <div><p className="dw-kicker">Your shortlist</p><h2 id="dw-compare-title">Compare places to live.</h2></div>
              <button type="button" onClick={() => setCompareOpen(false)} aria-label="Close comparison">Close ×</button>
            </div>
            <p className="dw-compare-dialog__note">These are location paths, not inventory comparisons. Current communities, prices and availability are on the official site.</p>
            <div className="dw-compare-dialog__grid">
              {selectedMarkets.map((item) => (
                <article key={item.id}>
                  <img src={item.image} alt="David Weekley Homes photography" />
                  <p>{item.type}</p><h3>{item.title}</h3><p>{item.copy}</p>
                  <div><a href={item.href} target="_blank" rel="noreferrer">View communities <ArrowIcon /></a><a href={marketDestinations[item.market].ready} target="_blank" rel="noreferrer">Homes ready soon <ArrowIcon /></a></div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

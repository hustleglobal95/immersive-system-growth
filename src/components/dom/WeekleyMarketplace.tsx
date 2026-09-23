"use client";

import { useMemo, useState } from "react";

const officialHomes = "https://www.davidweekleyhomes.com/new-homes";
const officialContact = "https://www.davidweekleyhomes.com/contact-us";
const officialLogo = "https://www.davidweekleyhomes.com/_images/dwh_logo.png";

const officialImages = {
  living: "https://www.davidweekleyhomes.com/media/HomeGalleryImage/71aa7185-90ac-4561-b600-53a6ccbab22b.jpg",
  kitchen: "https://www.davidweekleyhomes.com/media/HomeGalleryImage/aa45cb37-1050-43b1-9b8b-d139dbd31772.jpg",
  bedroom: "https://www.davidweekleyhomes.com/media/HomeGalleryImage/085436a0-01f1-4a12-bf9c-557f2f63be4a.jpg",
  exterior: "https://www.davidweekleyhomes.com/media/HomeGalleryImage/c8dcfecc-c338-4686-8bc0-8aa5f96cf9ff.jpg",
};

const marketPaths = [
  {
    id: "houston",
    market: "Houston",
    title: "Houston communities",
    type: "Move-in ready + build",
    copy: "Compare community lifestyles, home types and timing before opening live inventory.",
    image: officialImages.exterior,
    imagePosition: "50% 48%",
  },
  {
    id: "austin",
    market: "Austin",
    title: "Austin-area homes",
    type: "Build + personalization",
    copy: "Start with the way you want to live, then narrow the official search to the right area.",
    image: officialImages.living,
    imagePosition: "50% 48%",
  },
  {
    id: "tampa",
    market: "Tampa",
    title: "Tampa Bay communities",
    type: "Planned communities",
    copy: "See the decisions that matter first, from location and amenities to plan flexibility.",
    image: officialImages.kitchen,
    imagePosition: "50% 50%",
  },
];

const planPaths = [
  {
    id: "courtyard",
    eyebrow: "Illustrative path 01",
    title: "Courtyard living",
    story: "A social center, strong indoor-outdoor connection and private bedroom wings.",
    specs: ["Single level", "Flexible study", "Outdoor room"],
    bestFor: "Hosting without losing privacy",
  },
  {
    id: "flex",
    eyebrow: "Illustrative path 02",
    title: "Flexible two-story",
    story: "Shared life downstairs, adaptable rooms upstairs and space that changes over time.",
    specs: ["Two levels", "Game room", "Guest option"],
    bestFor: "Growing and multigenerational households",
  },
  {
    id: "retreat",
    eyebrow: "Illustrative path 03",
    title: "Low-maintenance retreat",
    story: "An efficient footprint with generous light, useful storage and fewer unused rooms.",
    specs: ["Right-sized", "Open kitchen", "Covered patio"],
    bestFor: "Simpler daily living",
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
  const [gallery, setGallery] = useState("living");
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleMarkets = useMemo(
    () => market === "Any market" ? marketPaths : marketPaths.filter((item) => item.market === market),
    [market],
  );
  const selectedGallery = galleryViews.find((item) => item.id === gallery) ?? galleryViews[0];

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
          <div className="dw-hero__image" role="img" aria-label="David Weekley Homes owner's retreat" />
          <div className="dw-hero__wash" />
          <div className="dw-hero__content">
            <p className="dw-kicker"><span>New homes</span> built around real life</p>
            <h1 id="dw-hero-title">Find the home<br />your life fits into.</h1>
            <p className="dw-hero__intro">Start with where, how and when you want to live. We will help you turn those choices into a clearer path home.</p>
            <a className="dw-text-link dw-text-link--light" href="#difference">Why Weekley <ArrowIcon /></a>
          </div>

          <div className="dw-search" aria-label="Home search">
            <div className="dw-search__heading">
              <span>Start your search</span>
              <small>Three choices. A more useful first step.</small>
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
                <option>Build on your lot</option>
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
          <p><strong>Since 1976</strong><span>Building homes and relationships</span></p>
          <p><strong>13 states</strong><span>Local teams with national strength</span></p>
          <p><strong>19 markets</strong><span>More ways to find your fit</span></p>
          <a href="#difference">Our difference <ArrowIcon /></a>
        </section>

        <section className="dw-section dw-market-section" id="communities" aria-labelledby="markets-title">
          <div className="dw-section-head">
            <div>
              <p className="dw-kicker">Explore by market</p>
              <h2 id="markets-title">Do not start with a list.<br />Start with your life.</h2>
            </div>
            <p>Use these guided paths to understand the choice. Live availability, pricing and community details open on the official site.</p>
          </div>

          {searched && (
            <div className="dw-search-result" role="status">
              Showing {market === "Any market" ? "all concept pathways" : `${market} pathways`} for {homeType.toLowerCase()} and {timeline.toLowerCase()}.
            </div>
          )}

          <div className="dw-market-grid">
            {visibleMarkets.map((item, index) => (
              <article className="dw-market-card" key={item.id}>
                <div className="dw-market-card__image">
                  <img src={item.image} alt="" style={{ objectPosition: item.imagePosition }} />
                  <span>0{index + 1}</span>
                </div>
                <div className="dw-market-card__body">
                  <p>{item.market} <span>{item.type}</span></p>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                  <div className="dw-market-card__actions">
                    <a href={officialHomes} target="_blank" rel="noreferrer">Open live search <ArrowIcon /></a>
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
            <h2 id="plans-title">Choose the feeling first.</h2>
            <p>Square footage does not tell you how a home lives. Compare the choices that shape an ordinary Tuesday.</p>
            <a className="dw-text-link" href={officialHomes} target="_blank" rel="noreferrer">Browse official plans <ArrowIcon /></a>
          </div>
          <div className="dw-plan-list">
            {planPaths.map((plan) => (
              <article className="dw-plan-card" key={plan.id}>
                <p>{plan.eyebrow}</p>
                <h3>{plan.title}</h3>
                <p>{plan.story}</p>
                <ul>{plan.specs.map((spec) => <li key={spec}>{spec}</li>)}</ul>
                <dl><dt>Best for</dt><dd>{plan.bestFor}</dd></dl>
                <button type="button" onClick={() => toggleCompare(plan.id)} aria-pressed={compare.includes(plan.id)}>
                  {compare.includes(plan.id) ? "Remove from comparison" : "Add to comparison"}
                </button>
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
            <a className="dw-text-link" href={officialContact} target="_blank" rel="noreferrer">Meet the design team <ArrowIcon /></a>
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
          <span><strong>{compare.length}</strong> {compare.length === 1 ? "item" : "items"} selected</span>
          <button type="button" onClick={() => setCompare([])}>Clear</button>
          <a href="#plans">Review comparison <ArrowIcon /></a>
        </aside>
      )}
    </main>
  );
}

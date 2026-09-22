import Link from "next/link";
import { experience } from "@/src/lib/experience";

export function SiteFooter() {
  if (experience.meta.name.startsWith("David Weekley Homes")) {
    return (
      <footer className="weekley-footer" aria-label="Redesign concept details">
        <div className="weekley-footer__lead">
          <h2>Building dreams begins with finding your place.</h2>
          <p>This independent concept keeps search and conversion practical while using FORGE to make the journey between place, community, home, and personal tour feel continuous.</p>
        </div>
        <div className="weekley-footer__grid">
          <section aria-labelledby="weekley-footer-explore">
            <h3 id="weekley-footer-explore">Explore the concept</h3>
            <ul>{experience.scenes.map((scene, index) => <li key={scene.id}><Link href={`#${scene.id}`}>{String(index + 1).padStart(2, "0")} / {scene.label}</Link></li>)}</ul>
          </section>
          <section aria-labelledby="weekley-footer-next">
            <h3 id="weekley-footer-next">Continue</h3>
            <ul>
              <li><Link href="#tour">Schedule a tour</Link></li>
              <li><a href="https://www.davidweekleyhomes.com/new-homes">Explore official home search</a></li>
              <li><a href="https://www.davidweekleyhomes.com/contact-us">Official contact page</a></li>
            </ul>
          </section>
          <section aria-labelledby="weekley-footer-system">
            <h3 id="weekley-footer-system">Built in FORGE</h3>
            <ul>
              <li>One deterministic scroll clock</li>
              <li>Responsive camera paths</li>
              <li>Progressive 3D delivery</li>
              <li>Semantic DOM fallback</li>
            </ul>
          </section>
        </div>
        <div className="weekley-footer__base">
          <p>Independent redesign study. Not affiliated with, commissioned by, or endorsed by David Weekley Homes. Brand names are used only to identify the subject of the concept.</p>
          <p>FORGE concept / {new Date().getFullYear()}</p>
        </div>
      </footer>
    );
  }

  if (!experience.meta.name.startsWith("ATELIER MARIS")) return null;
  return (
    <footer className="maris-footer" aria-label="Studio details">
      <div className="maris-footer__lead">
        <p className="maris-footer__mark">ATELIER MARIS</p>
        <p className="maris-footer__line">A coastal architecture practice working between section, light and restraint.</p>
      </div>
      <div className="maris-footer__cols">
        <section aria-labelledby="footer-studio"><h2 id="footer-studio">Studio</h2><ul><li>Carrer de la Riera 14</li><li>17255 Begur, Girona</li><li>Costa Brava, Spain</li></ul></section>
        <section aria-labelledby="footer-contact"><h2 id="footer-contact">Contact</h2><ul><li><a href="mailto:studio@ateliermaris.es">studio@ateliermaris.es</a></li><li><a href="tel:+34972623140">+34 972 62 31 40</a></li><li><Link href="/about#enquire">New commissions</Link></li><li><Link href="/work">Selected work</Link></li><li><Link href="/about">The studio</Link></li></ul></section>
        <section aria-labelledby="footer-chapters"><h2 id="footer-chapters">Chapters</h2><ul>{experience.scenes.map((scene, index) => <li key={scene.id}><Link href={`#${scene.id}`}><span>{String(index + 1).padStart(2, "0")}</span>{scene.label}</Link></li>)}</ul></section>
        <section aria-labelledby="footer-practice"><h2 id="footer-practice">Practice</h2><ul><li>Private residences</li><li>Interior transformation</li><li>Coastal retreats</li><li>Feasibility and section studies</li></ul></section>
      </div>
      <div className="maris-footer__base"><p>Casa Lumen, Begur / Girona. Completed spring 2024.</p><p>© {new Date().getFullYear()} Atelier Maris</p></div>
    </footer>
  );
}

import Link from "next/link";
import { experience } from "@/src/lib/experience";

/**
 * The close of the site. A chapter sequence with no footer is not a finished site: this is where
 * navigation, contact and legal live, in ordinary accessible DOM after the scroll ends.
 */
export function SiteFooter() {
  if (!experience.meta.name.startsWith("ATELIER MARIS")) return null;
  return (
    <footer className="maris-footer" aria-label="Studio details">
      <div className="maris-footer__lead">
        <p className="maris-footer__mark">ATELIER MARIS</p>
        <p className="maris-footer__line">
          A coastal architecture practice working between section, light and restraint.
        </p>
      </div>
      <div className="maris-footer__cols">
        <section aria-labelledby="footer-studio">
          <h2 id="footer-studio">Studio</h2>
          <ul>
            <li>Carrer de la Riera 14</li>
            <li>17255 Begur, Girona</li>
            <li>Costa Brava, Spain</li>
          </ul>
        </section>
        <section aria-labelledby="footer-contact">
          <h2 id="footer-contact">Contact</h2>
          <ul>
            <li><a href="mailto:studio@ateliermaris.example">studio@ateliermaris.example</a></li>
            <li><a href="tel:+34972000000">+34 972 00 00 00</a></li>
            <li><Link href="#inquiry">New commissions</Link></li>
            <li><Link href="/work">Selected work</Link></li>
            <li><Link href="/about">The studio</Link></li>
          </ul>
        </section>
        <section aria-labelledby="footer-chapters">
          <h2 id="footer-chapters">Chapters</h2>
          <ul>
            {experience.scenes.map((scene, index) => (
              <li key={scene.id}>
                <Link href={`#${scene.id}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {scene.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="footer-practice">
          <h2 id="footer-practice">Practice</h2>
          <ul>
            <li>Private residences</li>
            <li>Interior transformation</li>
            <li>Coastal retreats</li>
            <li>Feasibility and section studies</li>
          </ul>
        </section>
      </div>
      <div className="maris-footer__base">
        <p>Casa Lumen / 01 — a fictional showcase built to demonstrate Forge at full production intent.</p>
        <p>© {new Date().getFullYear()} Atelier Maris</p>
      </div>
    </footer>
  );
}

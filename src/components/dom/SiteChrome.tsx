import Link from "next/link";
import { experience } from "@/src/lib/experience";
export function SiteChrome() {
  const nocterra = experience.meta.name.startsWith("NOCTERRA");
  if (nocterra) {
    return (
      <header className="site-chrome site-chrome--nocterra">
        <a className="skip-link" href="#experience-content">
          Skip to content
        </a>
        <Link href="#arrival" className="nocterra-brand" aria-label="NOCTERRA Residence 01">
          <strong>NOCTERRA</strong>
          <span>Residence 01</span>
        </Link>
        <nav className="nocterra-nav" aria-label="Residence navigation">
          <Link href="#exterior">Residence</Link>
          <Link href="#interior">Interior</Link>
          <Link href="#horizon">Horizon</Link>
          <Link href="#private-presentation" className="nocterra-nav__cta">
            Private presentation
          </Link>
        </nav>
      </header>
    );
  }
  return (
    <header className="site-chrome">
      <a className="skip-link" href="#experience-content">
        Skip to content
      </a>
      <Link href="/" className="wordmark">
        {experience.meta.name}
      </Link>
      <nav aria-label="Authoring tools"><Link href="/studio" className="lab-link">Studio</Link><Link href="/design" className="lab-link">Design atelier</Link><Link href="/lab" className="lab-link">
        Scene lab
      </Link></nav>
    </header>
  );
}

import Link from "next/link";
import { experience } from "@/src/lib/experience";

export function SiteChrome() {
  const nocterra = experience.meta.name.startsWith("NOCTERRA");
  const atelierMaris = experience.meta.name.startsWith("ATELIER MARIS");

  if (atelierMaris) {
    return (
      <header className="atelier-maris-chrome" aria-label="Atelier Maris navigation">
        <Link className="atelier-maris-brand" href="#approach" aria-label="Atelier Maris, return to project opening">
          <span>ATELIER</span><span>MARIS</span>
        </Link>
        <nav className="atelier-maris-nav" aria-label="Project chapters">
          <Link href="#parti">Project</Link>
          <Link href="#material">Material</Link>
          <Link href="/work">Work</Link>
          <Link href="/about">Studio</Link>
          <Link href="#inquiry">Inquire</Link>
        </nav>
        <div className="atelier-maris-meta">
          <span>Casa Lumen / 01</span><br />
          <span>Costa Brava, Spain</span>
          <i className="atelier-maris-rule" />
        </div>
      </header>
    );
  }

  if (nocterra) {
    return (
      <header className="nocterra-chrome" aria-label="NOCTERRA navigation">
        <Link className="nocterra-brand" href="#arrival" aria-label="NOCTERRA, return to opening">
          <span className="nocterra-brand__mark" aria-hidden="true">N</span>
          <span>NOCTERRA</span>
        </Link>
        <nav className="nocterra-nav" aria-label="Experience chapters">
          <Link href="#machine">Machine</Link>
          <Link href="#exterior">Residence</Link>
          <Link href="#material">Materials</Link>
        </nav>
        <div className="nocterra-inquire">
          <span>RESIDENCE 01 / TAMPA BAY</span>
          <Link href="#private-presentation">PRIVATE PRESENTATION</Link>
        </div>
      </header>
    );
  }

  return (
    <header className="site-chrome" aria-label="Experience navigation">
      <Link href="#experience-content">{experience.meta.name}</Link>
      <nav aria-label="Scene navigation">
        {experience.scenes.slice(0, 4).map((scene) => <Link key={scene.id} href={`#${scene.id}`}>{scene.label}</Link>)}
      </nav>
    </header>
  );
}

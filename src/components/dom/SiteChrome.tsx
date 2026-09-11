import Link from "next/link";
import { experience } from "@/src/lib/experience";
export function SiteChrome() {
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

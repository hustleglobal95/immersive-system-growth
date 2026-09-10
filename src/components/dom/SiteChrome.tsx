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
      <Link href="/lab" className="lab-link">
        Scene lab
      </Link>
    </header>
  );
}

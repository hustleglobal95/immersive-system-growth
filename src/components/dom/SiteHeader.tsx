import Link from "next/link";

/**
 * Chrome for the pages outside the scroll experience. ExperienceRuntime only mounts its own
 * chrome on the chapter routes, so these pages carry their own.
 */
export function SiteHeader({ current }: { current?: "work" | "about" }) {
  return (
    <header className="page-chrome" aria-label="Atelier Maris navigation">
      <Link className="page-chrome__brand" href="/site">
        <span>ATELIER</span><span>MARIS</span>
      </Link>
      <nav aria-label="Pages">
        <Link href="/site">Casa Lumen</Link>
        <Link href="/work" aria-current={current === "work" ? "page" : undefined}>Work</Link>
        <Link href="/about" aria-current={current === "about" ? "page" : undefined}>Studio</Link>
        <Link href="/about#enquire">Enquire</Link>
      </nav>
    </header>
  );
}

import Link from "next/link";

export function SiteChrome() {
  return (
    <header className="site-chrome">
      <Link href="/" className="wordmark">IMMERSIVE SITE FORGE</Link>
      <div className="site-chrome__meta"><span>R3F</span><span>GSAP</span><span>LENIS</span></div>
    </header>
  );
}

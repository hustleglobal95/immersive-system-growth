import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/src/components/dom/SiteHeader";
import { SiteFooter } from "@/src/components/dom/SiteFooter";
import { getProject, projectNeighbours, projects } from "@/src/lib/projects";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const project = getProject((await params).slug);
  if (!project) return { title: "Not found — Atelier Maris" };
  return {
    title: `${project.name} — Atelier Maris`,
    description: project.summary,
    openGraph: { title: project.name, description: project.summary, images: [project.hero] },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = getProject((await params).slug);
  if (!project) notFound();
  const { previous, next } = projectNeighbours(project.slug);

  return (
    <>
      <SiteHeader current="work" />
      <main className="page page--project" id="main">
        <figure className="project__hero">
          <img src={project.hero} alt={project.heroAlt} decoding="async" />
        </figure>
        <header className="page__head">
          <p className="page__eyebrow">{project.year} / {project.location}</p>
          <h1 className="page__title">{project.name}</h1>
          <p className="page__lede">{project.summary}</p>
        </header>
        <div className="project__body">
          <div className="project__prose">
            {project.body.map((paragraph) => <p key={paragraph.slice(0, 32)}>{paragraph}</p>)}
          </div>
          <dl className="project__facts">
            <div><dt>Typology</dt><dd>{project.typology}</dd></div>
            <div><dt>Status</dt><dd>{project.status}</dd></div>
            {project.facts.map((fact) => (
              <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
            ))}
          </dl>
        </div>
        {project.gallery.length > 0 && (
          <div className="project__gallery">
            {project.gallery.map((image) => (
              <figure key={image.src}>
                <img src={image.src} alt={image.alt} decoding="async" loading="lazy" />
                <figcaption>{image.alt}</figcaption>
              </figure>
            ))}
          </div>
        )}
        <nav className="project__pager" aria-label="More work">
          {previous && (
            <Link href={`/work/${previous.slug}`}>
              <span>Previous</span>
              <strong>{previous.name}</strong>
            </Link>
          )}
          <Link className="project__pager-all" href="/work">All work</Link>
          {next && (
            <Link href={`/work/${next.slug}`}>
              <span>Next</span>
              <strong>{next.name}</strong>
            </Link>
          )}
        </nav>
      </main>
      <SiteFooter />
    </>
  );
}

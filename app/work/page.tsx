import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/src/components/dom/SiteHeader";
import { SiteFooter } from "@/src/components/dom/SiteFooter";
import { projects } from "@/src/lib/projects";

export const metadata: Metadata = {
  title: "Work — Atelier Maris",
  description: "Nine houses on the Costa Brava. Each drawn from the section outward.",
};

export default function WorkIndexPage() {
  return (
    <>
      <SiteHeader current="work" />
      <main className="page" id="main">
        <header className="page__head">
          <p className="page__eyebrow">Selected work</p>
          <h1 className="page__title">Nine houses on this coast.</h1>
          <p className="page__lede">
            Each drawn from the section outward. The list is short on purpose.
          </p>
        </header>
        <ol className="work-index">
          {projects.map((project, index) => (
            <li key={project.slug}>
              <Link href={`/work/${project.slug}`}>
                <span className="work-index__no">{String(index + 1).padStart(2, "0")}</span>
                <img src={project.hero} alt="" decoding="async" loading="lazy" />
                <span className="work-index__name">{project.name}</span>
                <span className="work-index__type">{project.typology}</span>
                <span className="work-index__meta">{project.year} / {project.location}</span>
              </Link>
            </li>
          ))}
        </ol>
      </main>
      <SiteFooter />
    </>
  );
}

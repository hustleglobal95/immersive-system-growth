import type { Metadata } from "next";
import { responsiveImage } from "@/src/lib/responsiveImage";
import Link from "next/link";
import { SiteHeader } from "@/src/components/dom/SiteHeader";
import { SiteFooter } from "@/src/components/dom/SiteFooter";
import { projects } from "@/src/lib/projects";
import { LeadCapture } from "@/src/components/dom/LeadCapture";
import { experience } from "@/src/lib/experience";

export const metadata: Metadata = {
  title: "Studio — Atelier Maris",
  description:
    "A coastal architecture practice working between section, light and restraint. One studio, four stages, no handover.",
};

const STAGES = [
  { no: "01", title: "Site and feasibility", span: "6 to 10 weeks",
    body: "Survey, orientation, planning envelope and the first section. We will tell you here if the brief does not fit the plot." },
  { no: "02", title: "Concept and section", span: "10 to 14 weeks",
    body: "The house is resolved in section before any finish is chosen. Light is tested against four hours of the day." },
  { no: "03", title: "Technical design", span: "16 to 24 weeks",
    body: "Construction drawings, schedules and specification. The material schedule is fixed here and does not move." },
  { no: "04", title: "Construction oversight", span: "To completion",
    body: "Weekly on site, with the same people who drew it. Nothing is passed to a delivery team." },
];

const RULES = [
  { no: "01", title: "Section before surface",
    body: "The building is resolved in section first. Finishes are chosen last and change nothing structural." },
  { no: "02", title: "Light before finish",
    body: "Every room is tested against the sun at four hours of the day before a single material is selected." },
  { no: "03", title: "Restraint before gesture",
    body: "Nothing is added to be noticed. If a move does not serve the section or the light, it is removed." },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader current="about" />
      <main className="page page--about" id="main">
        <header className="page__head">
          <p className="page__eyebrow">The studio</p>
          <h1 className="page__title">Section before surface. Light before finish.</h1>
          <p className="page__lede">
            Atelier Maris is a coastal architecture practice in Begur, working between section,
            light and restraint. We take on four projects a year and run every one of them from
            the first survey to the last site visit.
          </p>
        </header>

        <section className="about-block" aria-labelledby="rules">
          <h2 id="rules">Three rules, applied without exception</h2>
          <ol className="about-grid">
            {RULES.map((rule) => (
              <li key={rule.no}>
                <span className="about-grid__no">{rule.no}</span>
                <h3>{rule.title}</h3>
                <p>{rule.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-block" aria-labelledby="process">
          <h2 id="process">One studio, four stages, no handover</h2>
          <ol className="about-grid about-grid--four">
            {STAGES.map((stage) => (
              <li key={stage.no}>
                <span className="about-grid__no">{stage.no}</span>
                <h3>{stage.title}</h3>
                <p className="about-grid__span">{stage.span}</p>
                <p>{stage.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-block" aria-labelledby="recent">
          <h2 id="recent">Recent work</h2>
          <ul className="about-work">
            {projects.slice(0, 3).map((project) => (
              <li key={project.slug}>
                <Link href={`/work/${project.slug}`}>
                  <img {...responsiveImage(project.hero, "(max-width: 760px) 44vw, 240px", 480)} alt="" decoding="async" loading="lazy" />
                  <strong>{project.name}</strong>
                  <span>{project.year} / {project.location}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link className="about-more" href="/work">All work</Link>
        </section>

        {experience.conversion && <LeadCapture section={experience.conversion} />}
      </main>
      <SiteFooter />
    </>
  );
}

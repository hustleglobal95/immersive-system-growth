import type { Metadata } from "next";
import Link from "next/link";
import { listForgeProjects } from "@/src/platform/forgeProjects";
import { ForgeNewProject } from "./ForgeNewProject";
import "./forge-home.css";

export const metadata: Metadata = {
  title: "Forge",
  description: "Forge workspace: start a project, open an existing one, or jump into a tool.",
};

export const dynamic = "force-dynamic";

const tools = [
  { href: "/studio", name: "Studio", note: "Scenes, motion, interaction, assets and shipping." },
  { href: "/director", name: "Director", note: "Turn a brief into creative territories and a treatment." },
  { href: "/director/intelligence", name: "Director Intelligence", note: "Review, stress-test and decide on a direction." },
  { href: "/studio/agent", name: "Creative Agent", note: "Plan asset-aware motion across scenes." },
  { href: "/structure", name: "Structure Engine", note: "Plan pages, sections and conversion paths." },
  { href: "/design", name: "Design Atelier", note: "Art directions, sections and typography." },
  { href: "/type-vault", name: "Type Vault", note: "Search fonts and pairings." },
  { href: "/lab", name: "Scene Lab", note: "Inspect camera, quality and scene timing." },
];

export default function ForgeHomePage() {
  const projects = listForgeProjects();
  return (
    <main className="forge-home">
      <header className="forge-home__bar">
        <Link href="/forge" className="forge-home__brand">FORGE</Link>
        <span>Workspace</span>
      </header>

      <div className="forge-home__body">
        <section className="forge-home__section" aria-labelledby="forge-new">
          <h2 id="forge-new">Start</h2>
          <ForgeNewProject />
        </section>

        <section className="forge-home__section" aria-labelledby="forge-projects">
          <h2 id="forge-projects">Your projects <small>{projects.length}</small></h2>
          <ul className="forge-home__projects">
            {projects.map((project) => (
              <li key={project.slug} className="forge-home__project">
                <div>
                  <strong>{project.name}</strong>
                  <p>{project.description}</p>
                  <span className="forge-home__meta">{project.sceneCount} scene{project.sceneCount === 1 ? "" : "s"}{project.active ? " · active site" : ""}</span>
                </div>
                <div className="forge-home__actions">
                  <Link className="forge-home__button forge-home__button--primary" href={`/studio?open=${project.slug}`}>Open in Studio</Link>
                  {project.liveHref && <Link className="forge-home__button" href={project.liveHref}>View site</Link>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="forge-home__section" aria-labelledby="forge-tools">
          <h2 id="forge-tools">Tools</h2>
          <ul className="forge-home__tools">
            {tools.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className="forge-home__tool"><strong>{tool.name}</strong><span>{tool.note}</span></Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

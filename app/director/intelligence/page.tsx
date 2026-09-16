import type { Metadata } from "next";
import { DirectorIntelligenceWorkbench } from "@/src/studio/DirectorIntelligenceWorkbench";
import "../director.css";
import "../handoff.css";
import "./intelligence.css";

export const metadata: Metadata = {
  title: "Forge Director Intelligence",
  description: "Creative memory, Council debate, originality, stress testing and production intelligence for Forge Director.",
};

export default function DirectorIntelligencePage() {
  return <main className="director-page">
    <header className="director-page__header">
      <a href="/director">← Director v1</a>
      <div><span>FORGE SYSTEMS</span><strong>Director Intelligence</strong></div>
      <a href="/studio">Forge Studio →</a>
    </header>
    <DirectorIntelligenceWorkbench />
  </main>;
}

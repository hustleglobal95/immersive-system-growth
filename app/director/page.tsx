import type { Metadata } from "next";
import { DirectorWorkbench } from "@/src/studio/DirectorWorkbench";
import "./director.css";

export const metadata: Metadata = {
  title: "Forge Director",
  description: "Executive creative direction, treatment, pacing, art direction and critique for Forge projects.",
};

export default function DirectorPage() {
  return <main className="director-page">
    <header className="director-page__header">
      <a href="/studio">← Forge Studio</a>
      <div><span>FORGE SYSTEMS</span><strong>Director</strong></div>
      <a href="/structure">Structure Engine →</a>
    </header>
    <DirectorWorkbench />
  </main>;
}

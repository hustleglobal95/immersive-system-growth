import type { Metadata } from "next";
import { StructurePlanner } from "@/src/studio/StructurePlanner";
import "./structure.css";

export const metadata: Metadata = {
  title: "Structure Engine | Forge",
  description: "Website architecture, hierarchy, section grammar and conversion planning for Forge projects.",
};

export default function StructurePage() {
  return <main className="structure-page"><header className="structure-page__header"><a href="/studio">← Forge Studio</a><div><span>FORGE SYSTEMS</span><strong>Structure Engine</strong></div><a href="/design">Design Atelier →</a></header><StructurePlanner /></main>;
}

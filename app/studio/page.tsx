import type { Metadata } from "next";
import Link from "next/link";
import { ProductionStudioWorkbench } from "@/src/studio/ProductionStudioWorkbench";
import "./studio.css";
import "./ui-refinement.css";
import "./production-studio.css";
import "./director-entry.css";

export const metadata: Metadata = {
  title: "Forge Studio",
  description: "Visual production control for immersive experiences.",
};

export default function StudioPage() {
  return <>
    <Link className="studio-director-entry" href="/director">Director <span>Start with the idea</span></Link>
    <ProductionStudioWorkbench />
  </>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { ProductionStudioWorkbench } from "@/src/studio/ProductionStudioWorkbench";
import { StudioWorkflowDock } from "@/src/studio/StudioWorkflowDock";
import "./studio.css";
import "./ui-refinement.css";
import "./production-studio.css";
import "./workflow-guide.css";
import "./director-entry.css";

export const metadata: Metadata = {
  title: "Forge Studio",
  description: "Visual production control for immersive experiences.",
};

export default function StudioPage() {
  return <>
    <div className="studio-intelligence-dock">
      <Link className="studio-director-entry" href="/director">Director <span>Start with the idea</span></Link>
      <Link className="studio-agent-entry" href="/studio/agent">Creative Agent <span>Direct this project</span></Link>
      <Link className="studio-asset-entry" href="/studio/assets/create">Asset Creator <span>Create missing production assets</span></Link>
    </div>
    <ProductionStudioWorkbench />
    <StudioWorkflowDock />
  </>;
}

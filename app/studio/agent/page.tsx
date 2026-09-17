import type { Metadata } from "next";
import { CreativeAgentWorkbench } from "@/src/studio/CreativeAgentWorkbench";
import "./creative-agent.css";
import "./creative-agent-assets.css";
import "./creative-agent-create.css";

export const metadata: Metadata = {
  title: "Forge Creative Agent",
  description: "Creative direction, mandatory scene asset strategy, direct asset creation, strategy switching and reversible production moves inside Forge Studio.",
};

export default function CreativeAgentPage() {
  return <CreativeAgentWorkbench />;
}

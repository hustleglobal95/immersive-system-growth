import type { Metadata } from "next";
import { CreativeAgentWorkbench } from "@/src/studio/CreativeAgentWorkbench";
import "./creative-agent.css";

export const metadata: Metadata = {
  title: "Forge Creative Agent",
  description: "Creative direction, strategy switching and reversible production moves inside Forge Studio.",
};

export default function CreativeAgentPage() {
  return <CreativeAgentWorkbench />;
}

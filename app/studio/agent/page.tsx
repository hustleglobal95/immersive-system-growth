import type { Metadata } from "next";
import { CreativeAgentWorkbench } from "@/src/studio/CreativeAgentWorkbench";
import "./creative-agent.css";
import "./creative-agent-assets.css";
import "./creative-agent-hierarchy.css";
import "./creative-agent-create.css";
import { requireStudioPageAccess } from "@/src/platform/studioPageAccess";

export const metadata: Metadata = {
  title: "Forge Creative Agent",
  description: "Creative direction, hierarchy intelligence, direct asset creation, strategy switching and reversible production moves inside Forge Studio.",
};

export default async function CreativeAgentPage() {
  await requireStudioPageAccess("/studio/agent");
  return <CreativeAgentWorkbench />;
}

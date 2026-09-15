import type { Metadata } from "next";
import { AssetIntakePanel } from "@/src/studio/AssetIntakePanel";
import rawProject from "@/config/studio-project.json";
import { parseStudioProject } from "@/src/platform/studioSchema";
import "../studio.css";
import "../workspace.css";
import "../studio-pro.css";
import "../intake.css";

const project = parseStudioProject(rawProject);

export const metadata: Metadata = {
  title: "Forge Studio — Client Intake",
  description: "Client asset intake and production-readiness planning for premium digital experiences.",
};

export default function StudioIntakePage() {
  return (
    <main className="studio-shell studio-pro-shell">
      <AssetIntakePanel defaultProjectName={project.name} />
    </main>
  );
}

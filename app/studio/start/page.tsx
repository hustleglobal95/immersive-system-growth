import type { Metadata } from "next";
import { GuidedBuildWorkbench } from "@/src/studio/GuidedBuildWorkbench";
import "./guided-build.css";

export const metadata: Metadata = {
  title: "Forge Guided Build",
  description: "A nontechnical end-to-end workflow from project brief to production and publishing review.",
};

export default function GuidedBuildPage() {
  return <GuidedBuildWorkbench />;
}

import type { Metadata } from "next";
import { StudioWorkbench } from "@/src/studio/StudioWorkbench";
import "./studio.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: "Forge Studio",
  description: "Visual production control for immersive experiences.",
};

export default function StudioPage() {
  return <StudioWorkbench />;
}

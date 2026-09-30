import type { Metadata } from "next";
import { ProductionStudioWorkbench } from "@/src/studio/ProductionStudioWorkbench";
import "./studio.css";
import "./ui-refinement.css";
import "./production-studio.css";
import "./interactive-3d-studio.css";
import "./workflow-guide.css";
import { requireStudioPageAccess } from "@/src/platform/studioPageAccess";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Forge Studio",
  description: "AI-native production studio for interactive 3D websites.",
};

export default async function StudioPage() {
  await requireStudioPageAccess("/studio");
  return <ProductionStudioWorkbench />;
}

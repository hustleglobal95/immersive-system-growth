import type { Metadata } from "next";
import { ProductionStudioWorkbench } from "@/src/studio/ProductionStudioWorkbench";
import "./studio.css";
import "./ui-refinement.css";
import "./production-studio.css";
import "./workflow-guide.css";
import { requireStudioPageAccess } from "@/src/platform/studioPageAccess";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Forge Studio",
  description: "Visual production control for immersive experiences.",
};

export default async function StudioPage() {
  await requireStudioPageAccess("/studio");
  return <ProductionStudioWorkbench />;
}

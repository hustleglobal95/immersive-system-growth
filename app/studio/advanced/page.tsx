import type { Metadata } from "next";
import { ProductionStudioWorkbench } from "@/src/studio/ProductionStudioWorkbench";
import "../studio.css";
import "../ui-refinement.css";
import "../production-studio.css";
import "../interactive-3d-studio.css";
import "../workflow-guide.css";
import { requireStudioPageAccess } from "@/src/platform/studioPageAccess";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Forge Studio Advanced",description:"Advanced Forge production controls."};

export default async function AdvancedStudioPage(){
  await requireStudioPageAccess("/studio/advanced");
  return <ProductionStudioWorkbench/>;
}

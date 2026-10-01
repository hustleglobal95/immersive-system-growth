import type { Metadata } from "next";
import { ProductionStudioWorkbench } from "@/src/studio/ProductionStudioWorkbench";
import "./studio.css";
import "./production-studio.css";
import "./reference-workbench.css";
import { requireStudioPageAccess } from "@/src/platform/studioPageAccess";

export const dynamic="force-dynamic";

export const metadata:Metadata={
  title:"Forge — Interactive 3D Website Editor",
  description:"Design, animate, interact, optimize and publish immersive 3D websites in Forge.",
};

export default async function StudioPage(){
  await requireStudioPageAccess("/studio");
  return <ProductionStudioWorkbench/>;
}

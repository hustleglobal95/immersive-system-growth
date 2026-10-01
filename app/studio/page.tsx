import type { Metadata } from "next";
import { ForgeEditor } from "@/src/studio/ForgeEditor";
import "./studio.css";
import "./reference-workbench.css";
import "./forge-editor.css";
import { requireStudioPageAccess } from "@/src/platform/studioPageAccess";

export const dynamic="force-dynamic";

export const metadata:Metadata={
  title:"Forge — Interactive 3D Website Editor",
  description:"Design, animate, interact, reference, optimize and publish immersive 3D websites in Forge.",
};

export default async function StudioPage(){
  await requireStudioPageAccess("/studio");
  return <ForgeEditor/>;
}

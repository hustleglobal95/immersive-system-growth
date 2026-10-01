import type { Metadata } from "next";
import { SimpleForgeStudio } from "@/src/studio/SimpleForgeStudio";
import "./studio.css";
import "./simple-forge-studio.css";
import { requireStudioPageAccess } from "@/src/platform/studioPageAccess";

export const dynamic="force-dynamic";

export const metadata:Metadata={
  title:"Forge Studio",
  description:"Build, edit and finish interactive 3D websites in Forge.",
};

export default async function StudioPage(){
  await requireStudioPageAccess("/studio");
  return <SimpleForgeStudio/>;
}

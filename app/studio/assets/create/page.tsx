import type { Metadata } from "next";
import { AssetCreationWorkbench } from "@/src/studio/AssetCreationWorkbench";
import "./asset-creator.css";
import { requireStudioPageAccess } from "@/src/platform/studioPageAccess";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Forge Asset Creator",
  description: "Create missing image, video and 3D production assets directly from Forge scene requirements.",
};

export default async function ForgeAssetCreatorPage() {
  await requireStudioPageAccess("/studio/assets/create");
  return <AssetCreationWorkbench />;
}

import type { Metadata } from "next";
import { AssetCreationWorkbench } from "@/src/studio/AssetCreationWorkbench";
import "./asset-creator.css";

export const metadata: Metadata = {
  title: "Forge Asset Creator",
  description: "Create missing image, video and 3D production assets directly from Forge scene requirements.",
};

export default function ForgeAssetCreatorPage() {
  return <AssetCreationWorkbench />;
}

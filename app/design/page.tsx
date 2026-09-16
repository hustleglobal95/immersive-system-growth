import { DesignWorkbench } from "@/src/design/DesignWorkbench";
import "../type-vault.css";

export const metadata = {
  title: "Type Vault & Design Atelier | Forge",
  description: "Typography, art directions, pairing presets and a broad curated font library for Immersive Site Forge.",
};

export default function DesignPage() {
  return <DesignWorkbench />;
}

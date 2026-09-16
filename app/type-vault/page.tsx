import { TypeVaultWorkbench } from "@/src/design/TypeVaultWorkbench";
import "../type-vault.css";

export const metadata = {
  title: "Type Vault | Forge",
  description: "Forge typography discovery, curation and pairing system across open and commercial-friendly font sources.",
};

export default function TypeVaultPage() {
  return <TypeVaultWorkbench />;
}

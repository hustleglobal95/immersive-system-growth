import type { ForgeCommandInputSchema } from "@/src/core/commands/inputSchema";

export type ForgeCommandImpact = "local" | "project" | "destructive" | "external";
export type ForgeCommandApproval = "auto" | "review" | "required";

export interface ForgeCommandDescriptor {
  type: string;
  label: string;
  description: string;
  category: string;
  impact: ForgeCommandImpact;
  approval: ForgeCommandApproval;
  reversible: boolean;
  agentVisible: boolean;
  inputSchema?: ForgeCommandInputSchema;
}

export type ForgeCommandDescriptorInput = Omit<ForgeCommandDescriptor, "type">;

export function conservativeCommandDescriptor(type: string): ForgeCommandDescriptor {
  return {
    type,
    label: type,
    description: "Unclassified Forge command. Explicit review is required before headless execution.",
    category: "unclassified",
    impact: "project",
    approval: "required",
    reversible: false,
    agentVisible: false,
  };
}

import type { PromptIntelligencePacket } from "@/src/platform/autonomy/types";

export interface FunctionalScenario {
  id: string;
  label: string;
  viewport: "desktop" | "mobile" | "both";
  required: boolean;
  steps: string[];
  passCondition: string;
}

export function buildFunctionalVerificationPlan(packet: PromptIntelligencePacket): FunctionalScenario[] {
  return [
    {
      id:"boot",
      label:"Experience boots without fatal runtime failure",
      viewport:"both",
      required:true,
      steps:["Load the production route from a cold start.","Wait for the authored ready state or fallback.","Check for fatal page/runtime errors."],
      passCondition:"A usable semantic experience is present and no fatal runtime error blocks progression.",
    },
    {
      id:"journey",
      label:"Primary narrative remains traversable",
      viewport:"both",
      required:true,
      steps:["Progress from opening through every major authored scene.","Reverse through at least one transition.","Confirm the persistent subject/state does not reset without reason."],
      passCondition:"Forward and reverse progression remain coherent and the visitor never becomes trapped.",
    },
    {
      id:"keyboard-navigation",
      label:"Keyboard navigation can advance and reverse scene focus",
      viewport:"desktop",
      required:true,
      steps:["Focus the document rather than an interactive control.","Use ArrowRight to advance one scene.","Use ArrowLeft to return."],
      passCondition:"Keyboard navigation moves between authored scenes without trapping focus or requiring pointer precision.",
    },
    {
      id:"interaction",
      label:"Semantic interaction surfaces remain operable",
      viewport:"both",
      required:true,
      steps:["Locate any declared hotspot or disclosure.","Activate it using an ordinary semantic control.","Confirm the disclosure/action state changes without requiring 3D raycast precision."],
      passCondition:"Declared semantic interaction surfaces remain directly operable; projects with no declared hotspot treat this check as not applicable.",
    },
    {
      id:"primary-action",
      label:"Primary commercial action is reachable",
      viewport:"both",
      required:true,
      steps:["Complete the intended narrative journey.","Locate the primary action: " + packet.primaryAction.value + ".","Confirm the action is keyboard/touch accessible."],
      passCondition:"The primary action remains legible, reachable and operable without precision 3D input.",
    },
    {
      id:"mobile-equivalence",
      label:"Mobile preserves the defining idea",
      viewport:"mobile",
      required:true,
      steps:["Run the same journey at a portrait mobile viewport.","Compare signature setup, payoff and primary action with desktop.","Check for hidden essential content or desktop-only hover dependencies."],
      passCondition:"Rendering may simplify, but the concept, evidence order and primary action remain equivalent.",
    },
    {
      id:"reduced-motion",
      label:"Reduced motion remains meaningful",
      viewport:"both",
      required:true,
      steps:["Enable prefers-reduced-motion.","Traverse the experience.","Confirm semantic order and actions survive without signature motion."],
      passCondition:"The experience remains understandable and operable without relying on motion for meaning.",
    },
  ];
}


export interface FunctionalVerificationResult {
  id:string;
  label:string;
  viewport:"desktop"|"mobile";
  reducedMotion:boolean;
  passed:boolean;
  details:string[];
}

export interface FunctionalVerificationReport {
  version:1;
  variant:"incumbent"|"candidate";
  project:string;
  results:FunctionalVerificationResult[];
  hardGateFailures:string[];
  runtimeErrors:Array<{ viewport:string; reducedMotion:boolean; type:string; message:string }>;
  passed:boolean;
}

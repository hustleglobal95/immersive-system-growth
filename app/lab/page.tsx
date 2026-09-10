import { ExperienceRuntime } from "@/src/components/runtime/ExperienceRuntime";

export const metadata = { title: "Scene Lab | Immersive Site Forge" };

export default function LabPage() {
  return <ExperienceRuntime forceDebug lab />;
}

"use client";

import { useState } from "react";
import { getSceneIndex } from "@/src/lib/experience";
import { StudioLivePreview } from "@/src/studio/StudioLivePreview";
import type { ExperienceConfig } from "@/src/types/experience";

export function AutonomyPreviewClient({
  experience,
  progress,
  viewport,
}: {
  experience: ExperienceConfig;
  progress: number;
  viewport: "desktop" | "mobile";
}) {
  const [active,setActive]=useState(()=>getSceneIndex(progress,experience));
  return (
    <main className="autonomy-preview" data-autonomy-preview>
      <StudioLivePreview
        experience={experience}
        active={active}
        setActive={setActive}
        progress={progress}
        onProgressChange={()=>{}}
        reviewMode
        reviewViewport={viewport}
      />
    </main>
  );
}

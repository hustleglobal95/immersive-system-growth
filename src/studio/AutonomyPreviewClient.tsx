"use client";

import { useEffect, useMemo, useState } from "react";
import { getSceneIndex } from "@/src/lib/experience";
import { sampleExperience } from "@/src/lib/sampleExperience";
import { useExperienceStore } from "@/src/store/experienceStore";
import { StudioLivePreview } from "@/src/studio/StudioLivePreview";
import type { ExperienceConfig } from "@/src/types/experience";

type ReviewBridge={
  seek:(value:number)=>void;
  snapshot:()=>Record<string,unknown>;
};

export function AutonomyPreviewClient({
  experience,
  progress,
  viewport,
  variant,
}: {
  experience: ExperienceConfig;
  progress: number;
  viewport: "desktop" | "mobile";
  variant: "incumbent" | "candidate";
}) {
  const [reviewProgress,setReviewProgress]=useState(progress);
  const [active,setActive]=useState(()=>getSceneIndex(progress,experience));
  const aspect=viewport==="mobile" ? 9/16 : 16/9;
  const sceneCount=experience.scenes.length;
  const sceneIds=useMemo(()=>experience.scenes.map((scene)=>scene.id),[experience]);

  useEffect(()=>setReviewProgress(progress),[progress]);

  useEffect(()=>{
    const bridge:ReviewBridge={
      seek(value:number){
        const next=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
        setReviewProgress(next);
        setActive(getSceneIndex(next,experience));
      },
      snapshot(){
        const store=useExperienceStore.getState();
        const sampled=sampleExperience(reviewProgress,store.reducedMotion,experience,aspect);
        return {
          progress:reviewProgress,
          viewport,
          sceneIndex:sampled.sceneIndex,
          sceneId:sampled.scene.id,
          localProgress:sampled.localProgress,
          camera:sampled.camera,
          hero:sampled.hero,
          world:sampled.world,
          post:sampled.post,
          renderer:{
            frameMs:store.rendererStats.frameMs,
            calls:store.rendererStats.calls,
            triangles:store.rendererStats.triangles,
            webglStatus:store.webglStatus,
            quality:store.quality,
          },
          reducedMotion:store.reducedMotion,
        };
      },
    };
    (window as unknown as { __FORGE_AUTONOMY_REVIEW__?:ReviewBridge }).__FORGE_AUTONOMY_REVIEW__=bridge;
    return ()=>{
      delete (window as unknown as { __FORGE_AUTONOMY_REVIEW__?:ReviewBridge }).__FORGE_AUTONOMY_REVIEW__;
    };
  },[aspect,experience,reviewProgress,viewport]);

  return (
    <main
      className="autonomy-preview"
      data-autonomy-preview
      data-autonomy-variant={variant}
      data-autonomy-scene-count={sceneCount}
      data-autonomy-scene-ids={sceneIds.join(",")}
    >
      <StudioLivePreview
        experience={experience}
        active={active}
        setActive={setActive}
        progress={reviewProgress}
        onProgressChange={setReviewProgress}
        reviewMode
        reviewViewport={viewport}
      />
    </main>
  );
}

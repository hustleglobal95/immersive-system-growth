"use client";

import { useEffect, useMemo, useState } from "react";
import type { CreativeFingerprint, CreativeMemoryGraph } from "@/src/platform/director-intelligence/types";
import type { CreativeTasteLayers } from "@/src/platform/director-intelligence/creativeTaste";

interface CreativeIntelligenceContextResponse {
  ok?:boolean;
  error?:string;
  tasteLayers?:CreativeTasteLayers;
  memory?:CreativeMemoryGraph;
  portfolio?:CreativeFingerprint[];
  counts?:{priorProjects:number;memoryNodes:number;portfolioFingerprints:number;tasteLayers:number};
}

export function useCreativeIntelligenceContext(projectName:string) {
  const [data,setData]=useState<CreativeIntelligenceContextResponse>({});
  const [loading,setLoading]=useState(false);
  const key=useMemo(()=>projectName.trim(),[projectName]);

  useEffect(()=>{
    let cancelled=false;
    if(!key) {
      queueMicrotask(()=>{ if(!cancelled) setData({}); });
      return ()=>{cancelled=true;};
    }
    queueMicrotask(()=>{ if(!cancelled) setLoading(true); });
    void fetch(`/api/studio/creative-intelligence/context?project=${encodeURIComponent(key)}`,{cache:"no-store"})
      .then(async(response)=>{
        const body=await response.json() as CreativeIntelligenceContextResponse;
        if(!response.ok || !body.ok) throw new Error(body.error ?? "Creative Intelligence context failed.");
        if(!cancelled) setData(body);
      })
      .catch((error)=>{ if(!cancelled) setData({error:error instanceof Error ? error.message : "Creative Intelligence context failed."}); })
      .finally(()=>{ if(!cancelled) setLoading(false); });
    return ()=>{cancelled=true;};
  },[key]);

  return {
    tasteLayers:data.tasteLayers,
    memory:data.memory,
    portfolio:data.portfolio,
    counts:data.counts,
    loading,
    loaded:Boolean(data.ok) && !data.error,
    error:data.error,
  };
}

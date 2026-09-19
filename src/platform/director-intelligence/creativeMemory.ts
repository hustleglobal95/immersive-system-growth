import type { CreativeMemoryGraph, MemoryNode } from "@/src/platform/director-intelligence/types";
import type { CreativeDNA } from "@/src/platform/director-intelligence/creativeDNA";

export interface CreativeMemorySignal {
  nodeId:string;
  type:MemoryNode["type"];
  label:string;
  similarity:number;
  reason:string;
}

export interface CreativeMemoryReview {
  repeatedSignals:CreativeMemorySignal[];
  usefulLessons:CreativeMemorySignal[];
  antiRepeat:string[];
  verdict:"clear"|"watch"|"rewrite";
}

const creativeTypes=new Set<MemoryNode["type"]>([
  "Concept","Territory","CreativePrinciple","FormDecision","ArtDirection","VisualLanguage","CreativeMutation","SignatureMoment","CameraGrammar",
  "MotionGrammar","TypographyGrammar","ColorGrammar","LightingGrammar","MaterialGrammar","ImageGrammar","SoundGrammar","InteractionGrammar","StructurePattern","FailurePattern","Lesson",
]);

export function reviewCreativeMemory(dna:CreativeDNA,memory?:CreativeMemoryGraph):CreativeMemoryReview {
  if(!memory?.nodes.length) return {repeatedSignals:[],usefulLessons:[],antiRepeat:[],verdict:"clear"};
  const dnaText=[
    dna.northStar,dna.contradiction,dna.memoryPromise,dna.signatureMechanism,
    ...Object.values(dna.composition),...Object.values(dna.typography),...Object.values(dna.color),
    ...Object.values(dna.image),...Object.values(dna.threeD),...Object.values(dna.motion),
    ...Object.values(dna.lighting),...Object.values(dna.interaction),...Object.values(dna.sound),
  ].join(" ");
  const nodes=memory.nodes.filter((node)=>creativeTypes.has(node.type));
  const signals=nodes.map((node)=>{
    const rawSimilarity=similarityPct(dnaText,node.label+" "+node.text+" "+node.tags.join(" "));
    const confidence=node.confidence ?? .6;
    const similarity=Math.round(rawSimilarity*(.72+.28*confidence));
    return {
      nodeId:node.id,type:node.type,label:node.label,similarity,
      reason:similarity>=72 ? "This creative signal materially overlaps the proposed project DNA."
        : similarity>=55 ? "This signal is familiar enough to watch for visible house-style repetition."
          : "Low overlap.",
    };
  }).sort((a,b)=>b.similarity-a.similarity);
  const repeatedSignals=signals.filter((item)=>item.similarity>=55).slice(0,10);
  const usefulLessons=signals.filter((item)=>["FailurePattern","Lesson"].includes(item.type) && item.similarity>=30).slice(0,8);
  const antiRepeat=repeatedSignals.filter((item)=>!["FailurePattern","Lesson"].includes(item.type)).map((item)=>`Do not repeat “${item.label}” unchanged; current DNA overlap is ${item.similarity}%.`);
  const peak=repeatedSignals[0]?.similarity ?? 0;
  const dense=repeatedSignals.filter((item)=>item.similarity>=65).length;
  const verdict:CreativeMemoryReview["verdict"]=peak>=82 || dense>=3 ? "rewrite" : peak>=60 ? "watch" : "clear";
  return {repeatedSignals,usefulLessons,antiRepeat,verdict};
}

function similarityPct(a:string,b:string) {
  const left=new Set(tokens(a));const right=new Set(tokens(b));
  if(left.size<4||right.size<4) return 0;
  let intersection=0;for(const item of left) if(right.has(item)) intersection++;
  const containment=intersection/Math.max(1,Math.min(left.size,right.size));
  const jaccard=intersection/Math.max(1,left.size+right.size-intersection);
  return Math.round((containment*.82+jaccard*.18)*100);
}
function tokens(value:string) {
  const stop=new Set(["the","and","that","with","from","this","into","should","only","when","where","project","creative","system"]);
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g," ").split(/\s+/).filter((token)=>token.length>3&&!stop.has(token));
}

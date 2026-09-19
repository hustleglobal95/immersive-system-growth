import type { DirectorBrief, DirectorTreatment } from "@/src/platform/directorSchema";
import type { CreativeDNA } from "@/src/platform/director-intelligence/creativeDNA";

export interface CreativeMutation {
  id:string;
  title:string;
  hypothesis:string;
  preserves:string[];
  changes:string[];
  systems:string[];
  originalityPotential:number;
  productionRisk:number;
  score:number;
  question:string;
}

const catalog=[
  {id:"remove-hero",title:"Remove the expected hero",types:["brand","portfolio","saas","campaign"],potential:9,risk:5,systems:["structure","typography","interaction"],question:"What if the expected hero asset disappears and the idea has to carry the opening by itself?"},
  {id:"type-becomes-world",title:"Typography becomes the environment",types:["brand","portfolio","fashion","campaign"],potential:9,risk:6,systems:["typography","spatial","motion"],question:"What if typography is not placed in the composition, but becomes the composition and spatial threshold?"},
  {id:"stillness-until-climax",title:"Withhold motion until the climax",types:["product","automotive","property","fashion","commerce"],potential:8,risk:3,systems:["motion","camera","hierarchy"],question:"What if almost nothing moves until the signature moment earns the first impossible gesture?"},
  {id:"light-is-signature",title:"Make light the signature mechanism",types:["product","automotive","property","hospitality","fashion"],potential:9,risk:5,systems:["lighting","material","camera"],question:"What if the signature transformation happens through light and surface response instead of geometry or layout?"},
  {id:"macro-origin",title:"Begin inside the detail",types:["product","automotive","fashion","commerce","hospitality"],potential:8,risk:4,systems:["camera","image","material"],question:"What if the visitor cannot understand the whole object/place until the experience earns enough distance to reveal it?"},
  {id:"persistent-anchor",title:"Never release the anchor",types:["brand","property","portfolio","campaign","commerce"],potential:8,risk:4,systems:["structure","camera","transitions"],question:"What if one visual anchor never leaves the experience and every chapter is a transformation of its state?"},
  {id:"interaction-is-story",title:"Interaction becomes the narrative mechanism",types:["saas","product","brand","portfolio","commerce"],potential:9,risk:7,systems:["interaction","structure","motion"],question:"What if the visitor's one primary action physically causes the story instead of merely navigating it?"},
  {id:"anti-spectacle",title:"Refuse the expected spectacle",types:["property","hospitality","luxury","product","automotive"],potential:8,risk:3,systems:["composition","camera","typography"],question:"What if restraint, proof and silence replace the category's expected cinematic flex?"},
  {id:"material-world",title:"One material controls the world",types:["product","automotive","fashion","commerce","property"],potential:8,risk:5,systems:["material","lighting","transitions"],question:"What if one project-specific material behavior controls transitions, interaction feedback and the signature reveal?"},
  {id:"reverse-narrative",title:"Start with possession, then reveal why",types:["product","commerce","hospitality","property"],potential:7,risk:5,systems:["narrative","camera","proof"],question:"What if the experience starts at the emotional payoff, then travels backward through the evidence that makes it credible?"},
] as const;

export function generateCreativeMutations(brief:DirectorBrief,treatment:DirectorTreatment,dna:CreativeDNA,limit=6):CreativeMutation[] {
  const brandTruth=brief.differentiators[0] || brief.brandTruth;
  return catalog.map((item)=>{
    const typeFit=(item.types as readonly string[]).includes(brief.projectType) ? 3 : 0;
    const antiFit=item.id==="anti-spectacle" && /generic|clich|luxury|spectacle/i.test(dna.antiPatterns.join(" ")) ? 2 : 0;
    const signatureFit=item.id==="light-is-signature" && /light|material|surface/i.test(treatment.signatureMoment.description) ? 2 : 0;
    const score=Math.min(10,Number((item.potential*0.62+typeFit+antiFit+signatureFit-item.risk*0.18).toFixed(1)));
    return {
      id:item.id,title:item.title,question:item.question,
      hypothesis:`${item.question} Test it without weakening the locked truth: ${brandTruth}.`,
      preserves:[`Brand truth: ${brandTruth}`,dna.northStar,dna.memoryPromise,`Primary action: ${brief.primaryAction}`],
      changes:[...item.systems.map((system)=>`Re-author ${system} around this counterfactual.`),`Do not automatically preserve the current signature mechanism: ${dna.signatureMechanism}`],
      systems:[...item.systems],
      originalityPotential:item.potential,
      productionRisk:item.risk,
      score,
    };
  }).sort((a,b)=>b.score-a.score || b.originalityPotential-a.originalityPotential).slice(0,limit);
}

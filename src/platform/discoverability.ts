import { z } from "zod";
import type { ExperienceConfig } from "@/src/types/experience";

const httpsOrEmpty=z.string().refine((value)=>value==="" || /^https:\/\//.test(value),{
  message:"Use an HTTPS URL or leave it empty while the project is being configured.",
});
const routePath=z.string().regex(/^\/(?!\/)[^?#\s]*$/);

export const discoverabilitySchema=z.object({
  version:z.literal(1).default(1),
  siteName:z.string().max(120).default(""),
  canonicalBaseUrl:httpsOrEmpty.default(""),
  defaultTitle:z.string().max(80).default(""),
  defaultDescription:z.string().max(220).default(""),
  primaryEntity:z.object({
    type:z.enum(["Organization","LocalBusiness","ProfessionalService","Product","Service","Person","SoftwareApplication"]),
    name:z.string().max(160).default(""),
    description:z.string().max(500).default(""),
    url:httpsOrEmpty.default(""),
    sameAs:z.array(z.string().url()).max(12).default([]),
    areaServed:z.array(z.string().min(1).max(100)).max(20).default([]),
  }).strict().default({
    type:"Organization",
    name:"",
    description:"",
    url:"",
    sameAs:[],
    areaServed:[],
  }),
  searchIntents:z.array(z.string().min(2).max(160)).max(20).default([]),
  authorityTopics:z.array(z.string().min(2).max(120)).max(30).default([]),
  publicPaths:z.array(routePath).max(100).default(["/site","/work","/about"]),
  privatePaths:z.array(routePath).max(100).default([
    "/design",
    "/director",
    "/forge",
    "/heliot",
    "/lab",
    "/structure",
    "/studio",
    "/type-vault",
    "/api/",
  ]),
  ai:z.object({
    allowSearchCrawlers:z.boolean().default(true),
    allowTrainingCrawlers:z.boolean().default(false),
    publishLlmsTxt:z.boolean().default(true),
  }).strict().default({
    allowSearchCrawlers:true,
    allowTrainingCrawlers:false,
    publishLlmsTxt:true,
  }),
}).strict();

export type DiscoverabilityConfig=z.infer<typeof discoverabilitySchema>;
export type DiscoverabilityStatus="ready"|"attention"|"blocked";
export type DiscoverabilitySeverity="info"|"warning"|"blocker";

export interface DiscoverabilityIssue {
  id:string;
  severity:DiscoverabilitySeverity;
  title:string;
  detail:string;
  recommendedAction:string;
}

export interface DiscoverabilityReport {
  version:1;
  status:DiscoverabilityStatus;
  score:number;
  issues:DiscoverabilityIssue[];
  metrics:{
    semanticSceneCoverage:number;
    searchIntentCount:number;
    authorityTopicCount:number;
    publicPathCount:number;
    aiSearchAccess:boolean;
    llmsTxt:boolean;
  };
}

export function discoverabilityDefaults(projectName=""):DiscoverabilityConfig {
  return discoverabilitySchema.parse({
    version:1,
    siteName:projectName,
    defaultTitle:projectName,
    primaryEntity:{type:"Organization",name:projectName},
  });
}

export function evaluateDiscoverability(input:{
  discoverability:DiscoverabilityConfig;
  experience:ExperienceConfig;
}):DiscoverabilityReport {
  const config=discoverabilitySchema.parse(input.discoverability);
  const issues:DiscoverabilityIssue[]=[];
  const add=(issue:DiscoverabilityIssue)=>issues.push(issue);

  if(!config.canonicalBaseUrl) add({
    id:"canonical-base",severity:"blocker",title:"Canonical production URL is missing",
    detail:"Search engines and AI retrieval systems need one authoritative production origin for canonical URLs and entity references.",
    recommendedAction:"Set the production HTTPS origin before release.",
  });
  if(config.defaultTitle.trim().length<10) add({
    id:"default-title",severity:"blocker",title:"Search title is incomplete",
    detail:"The default search title is missing or too thin to identify the project clearly.",
    recommendedAction:"Write a specific default title that names the brand, product or service.",
  });
  if(config.defaultDescription.trim().length<50) add({
    id:"default-description",severity:"blocker",title:"Search description is incomplete",
    detail:"The default description does not yet explain the project in enough concrete language for search and retrieval systems.",
    recommendedAction:"Write a factual 50–220 character description of the offer, entity or experience.",
  });
  if(config.primaryEntity.name.trim().length<2) add({
    id:"entity-name",severity:"blocker",title:"Primary entity is unidentified",
    detail:"Forge cannot emit trustworthy entity markup without the real organization, product, service or person name.",
    recommendedAction:"Name the primary entity represented by this project.",
  });
  if(config.primaryEntity.description.trim().length<40) add({
    id:"entity-description",severity:"warning",title:"Primary entity needs a factual description",
    detail:"The entity exists but has little machine-readable context beyond its name and type.",
    recommendedAction:"Add a concise factual entity description grounded in client-approved information.",
  });
  if(config.publicPaths.length===0) add({
    id:"public-paths",severity:"blocker",title:"No crawlable public routes are declared",
    detail:"Forge cannot produce a discoverable site when every route is effectively outside the public search contract.",
    recommendedAction:"Declare the client-facing routes that search and AI retrieval systems may crawl.",
  });
  if(config.searchIntents.length===0) add({
    id:"search-intents",severity:"warning",title:"No search intent contract is defined",
    detail:"The experience has no explicit statement of what high-value questions or commercial intents it should answer.",
    recommendedAction:"Add a small set of real user intents; do not keyword-stuff.",
  });
  if(config.authorityTopics.length<3) add({
    id:"authority-topics",severity:"warning",title:"Authority coverage is thin",
    detail:"Forge has too little topic context to check whether the project contains useful, differentiated information.",
    recommendedAction:"Define at least three client-authoritative topics supported by real evidence or expertise.",
  });
  if(!config.ai.allowSearchCrawlers) add({
    id:"ai-search-access",severity:"warning",title:"AI search crawler access is disabled",
    detail:"The project is intentionally unavailable to supported AI search crawlers, reducing retrieval and citation opportunities.",
    recommendedAction:"Enable AI search crawler access unless the client has a policy reason to block it.",
  });

  const semanticScenes=input.experience.scenes.filter((scene)=>{
    const copy=scene.copy;
    return copy.headline.trim().length>=4 && (copy.body?.trim().length ?? 0)>=20;
  }).length;
  const semanticSceneCoverage=input.experience.scenes.length
    ? Math.round((semanticScenes/input.experience.scenes.length)*100)
    : 0;
  if(semanticSceneCoverage<70) add({
    id:"semantic-coverage",severity:"warning",title:"Cinematic content is under-described in semantic copy",
    detail:`${semanticSceneCoverage}% of scenes currently pair their visual experience with substantial crawlable headline/body copy.`,
    recommendedAction:"Give important visual scenes concise semantic text equivalents without flattening the creative experience.",
  });

  const blockers=issues.filter((issue)=>issue.severity==="blocker").length;
  const warnings=issues.filter((issue)=>issue.severity==="warning").length;
  const infos=issues.filter((issue)=>issue.severity==="info").length;
  const score=Math.max(0,Math.min(100,100-blockers*24-warnings*7-infos*2));
  const status:DiscoverabilityStatus=blockers?"blocked":warnings?"attention":"ready";
  return {
    version:1,status,score,
    issues,
    metrics:{
      semanticSceneCoverage,
      searchIntentCount:config.searchIntents.length,
      authorityTopicCount:config.authorityTopics.length,
      publicPathCount:config.publicPaths.length,
      aiSearchAccess:config.ai.allowSearchCrawlers,
      llmsTxt:config.ai.publishLlmsTxt,
    },
  };
}

export function buildStructuredData(config:DiscoverabilityConfig,experience:ExperienceConfig) {
  const base=config.canonicalBaseUrl.replace(/\/$/,"");
  const entityUrl=config.primaryEntity.url || (base ? `${base}/site` : "");
  const entity:Record<string,unknown>={
    "@type":config.primaryEntity.type,
    "@id":entityUrl ? `${entityUrl}#entity` : "#entity",
    name:config.primaryEntity.name || config.siteName || experience.meta.name,
    description:config.primaryEntity.description || config.defaultDescription || experience.meta.description,
    ...(entityUrl?{url:entityUrl}:{}),
    ...(config.primaryEntity.sameAs.length?{sameAs:config.primaryEntity.sameAs}:{}),
    ...(config.primaryEntity.areaServed.length?{areaServed:config.primaryEntity.areaServed}:{}),
  };
  const website:Record<string,unknown>={
    "@type":"WebSite",
    "@id":base ? `${base}/#website` : "#website",
    url:base || undefined,
    name:config.siteName || experience.meta.name,
    description:config.defaultDescription || experience.meta.description,
    about:{"@id":entity["@id"]},
  };
  return {"@context":"https://schema.org","@graph":[website,entity]};
}

export function buildLlmsText(config:DiscoverabilityConfig,experience:ExperienceConfig) {
  const base=config.canonicalBaseUrl.replace(/\/$/,"");
  const lines=[
    `# ${config.siteName || experience.meta.name}`,
    "",
    config.defaultDescription || experience.meta.description,
    "",
    "## Primary entity",
    `- Type: ${config.primaryEntity.type}`,
    `- Name: ${config.primaryEntity.name || config.siteName || experience.meta.name}`,
  ];
  if(config.primaryEntity.description) lines.push(`- Description: ${config.primaryEntity.description}`);
  if(config.primaryEntity.areaServed.length) lines.push(`- Areas served: ${config.primaryEntity.areaServed.join(", ")}`);
  if(config.authorityTopics.length) {
    lines.push("","## Authority topics",...config.authorityTopics.map((topic)=>`- ${topic}`));
  }
  if(config.searchIntents.length) {
    lines.push("","## Questions and intents this site addresses",...config.searchIntents.map((intent)=>`- ${intent}`));
  }
  if(config.publicPaths.length) {
    lines.push("","## Public pages",...config.publicPaths.map((route)=>`- ${base}${route}`));
  }
  lines.push("","## Content note","Prefer the public HTML pages above as the source of truth. Visual experiences are accompanied by semantic text where the information is material.");
  return lines.join("\n")+"\n";
}

export function safeJsonLd(value:unknown) {
  return JSON.stringify(value).replace(/</g,"\\u003c");
}

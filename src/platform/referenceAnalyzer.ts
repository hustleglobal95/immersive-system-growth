import { z } from "zod";
import { studioReferenceSchema, studioReferenceSystemsSchema, type StudioReference } from "@/src/platform/studioReference";

type GatewayEnvironment={ [key:string]:string|undefined };

export const referenceScreenshotSchema=z.object({
  name:z.string().min(1).max(180),
  dataUrl:z.string().min(32).max(4_500_000).refine((value)=>/^data:image\/(png|jpeg|webp);base64,/i.test(value),{
    message:"Reference screenshots must be PNG, JPEG or WebP data URLs.",
  }),
}).strict();

const analysisSchema=z.object({
  evidence:z.array(z.string().min(1).max(400)).min(3).max(32),
  take:z.array(z.string().min(1).max(400)).min(1).max(24),
  doNotCopy:z.array(z.string().min(1).max(400)).min(1).max(24),
  systems:studioReferenceSystemsSchema,
}).strict();

export function referenceAnalyzerConfigured(environment:GatewayEnvironment=process.env) {
  return Boolean(environment.AI_GATEWAY_API_KEY || environment.VERCEL_OIDC_TOKEN);
}

export async function analyzeStudioReferenceScreenshots(input:{
  reference:StudioReference;
  screenshots:Array<z.infer<typeof referenceScreenshotSchema>>;
  environment?:GatewayEnvironment;
  fetchImpl?:typeof fetch;
}) {
  const reference=studioReferenceSchema.parse(input.reference);
  const screenshots=z.array(referenceScreenshotSchema).min(1).max(4).parse(input.screenshots);
  const environment=input.environment ?? process.env;
  const token=environment.AI_GATEWAY_API_KEY || environment.VERCEL_OIDC_TOKEN || "";
  if(!token) throw new Error("Reference analysis requires AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN.");
  const model=environment.FORGE_AI_GATEWAY_REFERENCE_MODEL?.trim()
    || environment.FORGE_AI_GATEWAY_PLANNER_MODEL?.trim()
    || "openai/gpt-5.4";
  const fetchImpl=input.fetchImpl ?? fetch;

  const instruction=[
    "You are Forge Reference Intelligence. Deconstruct supplied website screenshots into production-useful evidence for an interactive 3D website builder.",
    "The URL is a source locator only. Make visual claims ONLY from pixels visible in the supplied screenshots.",
    "Do not infer frameworks, libraries, shaders, WebGL implementation, animation code, CMS, performance characteristics, or interaction behavior that cannot be observed.",
    "If motion or pointer behavior is not visible across the supplied states, do not invent it. State only what the images establish.",
    "Separate observed facts from transferable causal principles.",
    "Transfer construction logic, never branding or a surface clone.",
    "doNotCopy must explicitly protect brand-owned imagery, exact composition, copy, palette/type bundle, and signature interaction/geometry when applicable.",
    "Map useful evidence into Forge systems: composition, typography, motion, interaction, threeD, transitions, mobile, performance.",
    "For a system not evidenced by the screenshots, return an empty string rather than guessing.",
    "Evidence statements must be concrete enough that another designer can point to the screenshot and verify them.",
    "Transfer rules must explain what Forge should do and why, without naming the reference as a style preset.",
    "Return only JSON matching the supplied schema.",
    "",
    "Reference name: "+reference.label,
    "Reference URL: "+reference.url,
    reference.take.length ? "Existing user transfer direction: "+reference.take.join("; ") : "",
    reference.doNotCopy.length ? "Existing no-copy constraints: "+reference.doNotCopy.join("; ") : "",
  ].filter(Boolean).join("\n");

  const response=await fetchImpl("https://ai-gateway.vercel.sh/v1/chat/completions",{
    method:"POST",
    headers:{authorization:"Bearer "+token,"content-type":"application/json"},
    body:JSON.stringify({
      model,
      messages:[{
        role:"user",
        content:[
          {type:"text",text:instruction},
          ...screenshots.map((screenshot)=>({type:"image_url",image_url:{url:screenshot.dataUrl,detail:"high"}})),
        ],
      }],
      response_format:{
        type:"json_schema",
        json_schema:{
          name:"forge_reference_analysis",
          description:"Evidence-backed deconstruction of supplied website screenshots.",
          schema:analysisJsonSchema(),
        },
      },
    }),
  });
  if(!response.ok) throw new Error("AI Gateway reference analysis failed ("+response.status+"): "+(await response.text()).slice(0,400));
  const payload=await response.json() as {choices?:Array<{message?:{content?:string|null}}>} ;
  const raw=payload.choices?.[0]?.message?.content;
  if(!raw) throw new Error("Reference analyzer returned no structured content.");
  const analysis=analysisSchema.parse(JSON.parse(raw));
  const evidenceStrength=Math.min(.95,.63+screenshots.length*.08);
  return studioReferenceSchema.parse({
    ...reference,
    reviewedAt:new Date().toISOString(),
    evidenceStrength,
    evidence:analysis.evidence,
    take:analysis.take,
    doNotCopy:analysis.doNotCopy,
    systems:analysis.systems,
  });
}

function analysisJsonSchema() {
  const line=(maxLength:number)=>({type:"string",minLength:1,maxLength});
  const text={type:"string",maxLength:900};
  return {
    type:"object",
    additionalProperties:false,
    required:["evidence","take","doNotCopy","systems"],
    properties:{
      evidence:{type:"array",items:line(400),minItems:3,maxItems:32},
      take:{type:"array",items:line(400),minItems:1,maxItems:24},
      doNotCopy:{type:"array",items:line(400),minItems:1,maxItems:24},
      systems:{
        type:"object",
        additionalProperties:false,
        required:["composition","typography","motion","interaction","threeD","transitions","mobile","performance"],
        properties:{
          composition:text,
          typography:text,
          motion:text,
          interaction:text,
          threeD:text,
          transitions:text,
          mobile:text,
          performance:text,
        },
      },
    },
  };
}

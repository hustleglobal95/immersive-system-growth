import { pairwiseVisualResponseSchema, visualDirectorResponseSchema, type CaptureCriticRequest, type PairwiseCriticRequest } from "@/src/platform/autonomy/visualDirector";

type GatewayEnvironment={ [key:string]:string|undefined };

export function aiGatewayVisualCriticConfigured(environment:GatewayEnvironment=process.env) {
  return Boolean(environment.AI_GATEWAY_API_KEY || environment.VERCEL_OIDC_TOKEN);
}

export async function callAiGatewaySingleVisualCritic(input:{
  request:CaptureCriticRequest;
  image:string;
  environment?:GatewayEnvironment;
  fetchImpl?:typeof fetch;
}) {
  const environment=input.environment ?? process.env;
  const token=environment.AI_GATEWAY_API_KEY || environment.VERCEL_OIDC_TOKEN || "";
  if(!token) throw new Error("AI Gateway visual critic requires AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN");
  const model=environment.FORGE_AI_GATEWAY_VISUAL_MODEL?.trim() || "openai/gpt-5.4";
  const fetchImpl=input.fetchImpl ?? fetch;
  const instruction=[
    "You are Forge's production art director reviewing one rendered website frame.",
    "Judge the screenshot as a composed final frame, not as evidence that the code is sophisticated.",
    "A technically valid but generic, flat, default-3D, poorly framed, weakly lit, illegible, or unfinished frame is not production-ready.",
    "Return only visible, evidence-based findings. Do not invent unseen interaction behavior, product facts, or brand rules.",
    "Use blocker for production-breaking visual failures, major for clear quality failures, minor for localized craft issues, and advisory sparingly.",
    "Every finding needs a concrete repair instruction that maps to the supplied critic dimension.",
    "Return only the requested structured JSON.",
    "",
    "Project context:",input.request.projectContext,
    "",
    "Capture:",JSON.stringify(input.request.capture),
    "",
    "Critic briefs:",...input.request.criticBriefs.map((brief)=>[
      "- "+brief.id+": "+brief.objective,
      "  Checks: "+brief.checks.join("; "),
      "  Do not: "+brief.prohibited.join("; "),
    ].join("\n")),
    "",
    "Rules:",...input.request.rules.map((rule)=>"- "+rule),
  ].join("\n");
  const response=await fetchImpl("https://ai-gateway.vercel.sh/v1/chat/completions",{
    method:"POST",
    headers:{authorization:"Bearer "+token,"content-type":"application/json"},
    body:JSON.stringify({
      model,
      messages:[{
        role:"user",
        content:[
          {type:"text",text:instruction},
          {type:"image_url",image_url:{url:"data:image/png;base64,"+input.image}},
        ],
      }],
      response_format:{
        type:"json_schema",
        json_schema:{
          name:"forge_single_frame_visual_review",
          description:"Production art-direction findings for one Forge rendered capture.",
          schema:{
            type:"object",
            properties:{
              findings:{
                type:"array",
                maxItems:48,
                items:{
                  type:"object",
                  properties:{
                    critic:{type:"string",enum:["composition","typography","camera","motion","continuity","brand","art-direction","color","lighting","material","image-direction","sound","originality","craft","interaction","mobile","performance"]},
                    captureId:{type:"string"},
                    severity:{type:"string",enum:["blocker","major","minor","advisory"]},
                    finding:{type:"string"},
                    evidence:{type:"array",items:{type:"string"},maxItems:12},
                    affectedSystems:{type:"array",items:{type:"string"},maxItems:12},
                    repair:{type:"string"},
                    confidence:{type:"number",minimum:0,maximum:1},
                  },
                  required:["critic","captureId","severity","finding","evidence","affectedSystems","repair","confidence"],
                  additionalProperties:false,
                },
              },
              summary:{type:"string"},
            },
            required:["findings"],
            additionalProperties:false,
          },
        },
      },
    }),
  });
  if(!response.ok) throw new Error("AI Gateway visual critic failed ("+response.status+"): "+(await response.text()).slice(0,300));
  const payload=await response.json() as { choices?:Array<{ message?:{ content?:string|null } }> };
  const text=payload.choices?.[0]?.message?.content;
  if(!text) throw new Error("AI Gateway visual critic returned no structured content");
  return visualDirectorResponseSchema.parse(JSON.parse(text));
}

export async function callAiGatewayPairwiseVisualCritic(input:{
  request:PairwiseCriticRequest;
  firstImage:string;
  secondImage:string;
  environment?:GatewayEnvironment;
  fetchImpl?:typeof fetch;
}) {
  const environment=input.environment ?? process.env;
  const token=environment.AI_GATEWAY_API_KEY || environment.VERCEL_OIDC_TOKEN || "";
  if(!token) throw new Error("AI Gateway visual critic requires AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN");
  const model=environment.FORGE_AI_GATEWAY_VISUAL_MODEL?.trim() || "openai/gpt-5.4";
  const fetchImpl=input.fetchImpl ?? fetch;
  const instruction=[
    "You are Forge's comparative visual judge.",
    "Compare the two rendered screenshots strictly against the project context and rules.",
    "Choose first, second, or tie. Do not reward novelty or complexity by itself.",
    "Report hard-gate failures only for visible production-breaking problems such as illegibility, missing content, broken layout or overflow.",
    "Return only the requested structured JSON.",
    "",
    "Project context:",input.request.projectContext,
    "",
    "Capture: "+input.request.captureId,
    "First version id: "+input.request.firstId,
    "Second version id: "+input.request.secondId,
    "",
    "Rules:",...input.request.rules.map((rule)=>"- "+rule),
  ].join("\n");
  const response=await fetchImpl("https://ai-gateway.vercel.sh/v1/chat/completions",{
    method:"POST",
    headers:{authorization:"Bearer "+token,"content-type":"application/json"},
    body:JSON.stringify({
      model,
      messages:[{
        role:"user",
        content:[
          {type:"text",text:instruction},
          {type:"image_url",image_url:{url:"data:image/png;base64,"+input.firstImage}},
          {type:"image_url",image_url:{url:"data:image/png;base64,"+input.secondImage}},
        ],
      }],
      response_format:{
        type:"json_schema",
        json_schema:{
          name:"forge_pairwise_visual_judgment",
          description:"Comparative judgment of two Forge rendered captures.",
          schema:{
            type:"object",
            properties:{
              winner:{type:"string",enum:["first","second","tie"]},
              confidence:{type:"number",minimum:0,maximum:1},
              reasons:{type:"array",items:{type:"string"},minItems:1,maxItems:12},
              firstHardGateFailures:{type:"array",items:{type:"string"},maxItems:12},
              secondHardGateFailures:{type:"array",items:{type:"string"},maxItems:12},
            },
            required:["winner","confidence","reasons","firstHardGateFailures","secondHardGateFailures"],
            additionalProperties:false,
          },
        },
      },
    }),
  });
  if(!response.ok) throw new Error("AI Gateway visual critic failed ("+response.status+"): "+(await response.text()).slice(0,300));
  const payload=await response.json() as { choices?:Array<{ message?:{ content?:string|null } }> };
  const text=payload.choices?.[0]?.message?.content;
  if(!text) throw new Error("AI Gateway visual critic returned no structured content");
  return pairwiseVisualResponseSchema.parse(JSON.parse(text));
}

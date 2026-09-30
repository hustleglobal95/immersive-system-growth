import {
  Interactive3DBlueprintSchema,
  parseInteractive3DBlueprint,
  type Interactive3DBlueprint,
} from "@/src/platform/interactive3dBlueprint";
import { evaluateInteractive3DBlueprintPolicy } from "@/src/platform/interactive3dPolicy";

type GatewayEnvironment = { [key: string]: string | undefined };

export function aiGatewayInteractive3DPlannerConfigured(environment: GatewayEnvironment = process.env) {
  return Boolean(environment.AI_GATEWAY_API_KEY || environment.VERCEL_OIDC_TOKEN);
}

export async function refineInteractive3DBlueprintWithAi(input: {
  prompt: string;
  base: Interactive3DBlueprint;
  environment?: GatewayEnvironment;
  fetchImpl?: typeof fetch;
}) {
  const environment = input.environment ?? process.env;
  const token = environment.AI_GATEWAY_API_KEY || environment.VERCEL_OIDC_TOKEN || "";
  if (!token) throw new Error("Interactive 3D AI planning requires AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN.");
  const model = environment.FORGE_AI_GATEWAY_PLANNER_MODEL?.trim() || "openai/gpt-5.4";
  const fetchImpl = input.fetchImpl ?? fetch;
  const instruction = [
    "You are Forge's spatial experience planner. Improve a validated baseline Interactive3DBlueprint for a production website.",
    "Do not write JSX, JavaScript, shader code or arbitrary camera coordinates.",
    "Operate only inside the blueprint grammar.",
    "Preserve all project facts, all scene IDs and their order, all asset IDs/status/source fields, and the renderer strategy.",
    "You may improve the experience archetype, thesis, visual world, signature scene choice, scene labels/purpose/subject/copy role/public-facing copy, depth strategy, registered camera move, interaction semantics, transitions, mobile translation, prewarm declarations, accessibility wording, art direction, and you may tighten performance budgets.",
    "Write concise public-facing scene copy that sounds specific to the supplied project. Do not expose production instructions in visitor copy and do not invent client facts, awards, prices, claims or locations.",
    "Never use camera.move=custom. Never invent a remote asset URL. Never convert a generated/missing asset into an existing asset.",
    "Use 3D only where it communicates material, space, transformation, mechanism or meaningful depth. Let semantic DOM own headings, prose, navigation and conversion.",
    "The signature moment must be visually specific and must have one dominant subject.",
    "Avoid generic AI website language, default orbiting objects, constant motion, excessive bloom, and arbitrary cursor-follow effects.",
    "Return only the complete JSON object matching the supplied schema.",
    "",
    "User prompt:",
    input.prompt,
    "",
    "Validated baseline:",
    JSON.stringify(input.base),
  ].join("\n");

  const response = await fetchImpl("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: instruction }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "forge_interactive_3d_blueprint",
          description: "A complete production interactive 3D blueprint constrained to Forge's compiler grammar.",
          schema: blueprintJsonSchema(),
        },
      },
    }),
  });
  if (!response.ok) {
    throw new Error("AI Gateway interactive 3D planner failed (" + response.status + "): " + (await response.text()).slice(0, 400));
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
  const text = payload.choices?.[0]?.message?.content;
  if (!text) throw new Error("AI Gateway interactive 3D planner returned no structured content.");
  const candidate = Interactive3DBlueprintSchema.parse(JSON.parse(text));
  const bounded = constrainAiBlueprint(input.base, candidate);
  const policy = evaluateInteractive3DBlueprintPolicy(bounded);
  if (!policy.passed) {
    throw new Error("AI planner returned a blueprint that violates Forge policy: " + policy.blockers.map((item) => item.message).join("; "));
  }
  return bounded;
}

export function constrainAiBlueprint(
  base: Interactive3DBlueprint,
  candidate: Interactive3DBlueprint,
): Interactive3DBlueprint {
  const baseIds = base.experience.scenes.map((scene) => scene.id);
  const candidateIds = candidate.experience.scenes.map((scene) => scene.id);
  if (JSON.stringify(baseIds) !== JSON.stringify(candidateIds)) {
    throw new Error("AI planner attempted to change the executable scene identity/order.");
  }
  if (candidate.experience.scenes.some((scene) => scene.camera.move === "custom")) {
    throw new Error("AI planner attempted to emit an unregistered custom camera move.");
  }
  const bounded = {
    ...candidate,
    project: structuredClone(base.project),
    renderer: structuredClone(base.renderer),
    assets: structuredClone(base.assets),
    references: structuredClone(base.references),
    performance: {
      targetFps: Math.max(base.performance.targetFps, candidate.performance.targetFps),
      initialCriticalMb: Math.min(base.performance.initialCriticalMb, candidate.performance.initialCriticalMb),
      maxActiveMb: Math.min(base.performance.maxActiveMb, candidate.performance.maxActiveMb),
      maxDrawCalls: Math.min(base.performance.maxDrawCalls, candidate.performance.maxDrawCalls),
      maxTriangles: Math.min(base.performance.maxTriangles, candidate.performance.maxTriangles),
    },
  };
  return parseInteractive3DBlueprint(bounded);
}

function blueprintJsonSchema() {
  const string = (maxLength: number) => ({ type:"string",minLength:1,maxLength });
  const scene = {
    type:"object",
    additionalProperties:false,
    required:["id","label","purpose","dominantSubject","copyRole","copy","medium","depthStrategy","camera","interaction","transition","mobile","prewarm"],
    properties:{
      id:{type:"string",pattern:"^[a-z0-9]+(?:-[a-z0-9]+)*$"},
      label:string(180), purpose:string(600), dominantSubject:string(600), copyRole:string(600),
      copy:{
        type:"object",additionalProperties:false,required:["headline","body"],
        properties:{eyebrow:{type:"string",maxLength:100},headline:string(120),body:string(800)},
      },
      medium:{type:"string",enum:["dom","hybrid","webgl"]},
      depthStrategy:{type:"string",enum:["flat","layered-dom","parallax","perspective","material","atmospheric","full-3d"]},
      camera:{
        type:"object",additionalProperties:false,required:["move","lens","rationale"],
        properties:{
          move:{type:"string",enum:["static","dolly","truck","crane","orbit","macro","reveal"]},
          start:{type:"array",items:{type:"number"},minItems:3,maxItems:3},
          end:{type:"array",items:{type:"number"},minItems:3,maxItems:3},
          lens:{type:"string",enum:["wide","normal","telephoto","macro","adaptive"]},
          rationale:string(600),
        },
      },
      interaction:{
        type:"object",additionalProperties:false,required:["input","physicalQuantity","behavior"],
        properties:{
          input:{type:"string",enum:["none","scroll","pointer","drag","tap","keyboard","mixed"]},
          physicalQuantity:{type:"string",enum:["none","position","proximity","velocity","displacement","orientation","impulse","progress"]},
          behavior:string(600),
        },
      },
      transition:string(600), mobile:string(600),
      prewarm:{type:"array",items:string(300),maxItems:12},
    },
  };
  const asset = {
    type:"object",additionalProperties:false,required:["id","label","type","status","role","heroCandidate"],
    properties:{
      id:{type:"string",pattern:"^[a-z0-9]+(?:-[a-z0-9]+)*$"},
      label:string(180),
      type:{type:"string",enum:["model","image","video","audio","copy","brand","data","other"]},
      status:{type:"string",enum:["existing","generate","commission","missing"]},
      role:string(600),
      source:{type:"string",maxLength:600},
      heroCandidate:{type:"boolean"},
    },
  };
  return {
    type:"object",additionalProperties:false,
    required:["version","project","experience","renderer","artDirection","assets","references","performance","accessibility"],
    properties:{
      version:{type:"number",enum:[1]},
      project:{
        type:"object",additionalProperties:false,
        required:["name","projectType","tier","audience","objective","primaryAction","brandTruth","differentiators","constraints"],
        properties:{
          name:string(180),projectType:{type:"string",enum:["brand","product","property","hospitality","portfolio","saas","commerce","campaign","automotive","fashion"]},
          tier:{type:"string",enum:["cinematic","immersive","signature","flagship"]},
          audience:string(600),objective:string(600),primaryAction:string(180),brandTruth:string(600),
          differentiators:{type:"array",items:string(300),maxItems:24},
          constraints:{type:"array",items:string(300),maxItems:24},
        },
      },
      experience:{
        type:"object",additionalProperties:false,
        required:["archetype","thesis","visualWorld","interactionModel","signatureMoment","signatureSceneId","scenes"],
        properties:{
          archetype:{type:"string",enum:["product-reveal","spatial-story","editorial-depth","interactive-gallery","configurator","data-sculpture","world-explorer"]},
          thesis:string(600),visualWorld:string(600),interactionModel:string(600),signatureMoment:string(600),
          signatureSceneId:{type:"string",pattern:"^[a-z0-9]+(?:-[a-z0-9]+)*$"},
          scenes:{type:"array",items:scene,minItems:2,maxItems:16},
        },
      },
      renderer:{
        type:"object",additionalProperties:false,required:["strategy","rationale"],
        properties:{strategy:{type:"string",enum:["webgl","webgpu-opt-in"]},rationale:string(600)},
      },
      artDirection:{
        type:"object",additionalProperties:false,required:["palette","typography","lighting","material","composition"],
        properties:{
          palette:{
            type:"object",additionalProperties:false,required:["background","foreground","accent","fog"],
            properties:{
              background:{type:"string",pattern:"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"},
              foreground:{type:"string",pattern:"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"},
              accent:{type:"string",pattern:"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"},
              fog:{type:"string",pattern:"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"},
            },
          },
          typography:string(600),lighting:string(600),material:string(600),composition:string(600),
        },
      },
      assets:{type:"array",items:asset,maxItems:80},
      references:{
        type:"array",maxItems:20,items:{
          type:"object",additionalProperties:false,required:["label","lesson","doNotCopy"],
          properties:{label:string(180),lesson:string(600),doNotCopy:string(600)},
        },
      },
      performance:{
        type:"object",additionalProperties:false,required:["targetFps","initialCriticalMb","maxActiveMb","maxDrawCalls","maxTriangles"],
        properties:{
          targetFps:{type:"integer",minimum:30,maximum:120},
          initialCriticalMb:{type:"number",exclusiveMinimum:0,maximum:64},
          maxActiveMb:{type:"number",exclusiveMinimum:0,maximum:512},
          maxDrawCalls:{type:"integer",minimum:1,maximum:5000},
          maxTriangles:{type:"integer",minimum:1,maximum:5000000},
        },
      },
      accessibility:{
        type:"object",additionalProperties:false,required:["semanticFallback","reducedMotion","keyboardPath"],
        properties:{semanticFallback:string(600),reducedMotion:string(600),keyboardPath:string(600)},
      },
    },
  };
}

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import rawExperience from "../config/experience.json";
import rawManifest from "../config/asset-manifest.json";
import rawProject from "../config/studio-project.json";
import { parseStudioProject } from "../src/platform/studioSchema";
import {
  activeStudioReferences,
  importStudioReferenceAnalysis,
  studioReferenceFromUrl,
  studioReferencesToBlueprintReferences,
  studioReferencesToDirectorReferences,
} from "../src/platform/studioReference";
import { planInteractive3DFromPrompt } from "../src/platform/interactive3dPlanner";
import { analyzeStudioReferenceScreenshots } from "../src/platform/referenceAnalyzer";

test("Forge imports structured reference analysis into transferable project intelligence",()=>{
  const fixture=JSON.parse(fs.readFileSync("tests/fixtures/reference-analysis.example.json","utf8"));
  const reference=importStudioReferenceAnalysis(fixture);
  assert.equal(reference.label,"CI Reference");
  assert.equal(reference.url,"https://reference.example/");
  assert.ok(reference.evidence.length>=6);
  assert.ok(reference.take.some((item)=>/Carry one meaningful subject/i.test(item)));
  assert.ok(reference.doNotCopy.includes("Exact composition"));
  assert.match(reference.systems.motion,/Scroll progression/i);
  assert.match(reference.systems.mobile,/Mobile preserves narrative order/i);
  assert.equal(activeStudioReferences([reference]).length,1);
});

test("URL-only references are stored but cannot steer a build without transfer direction",()=>{
  const reference=studioReferenceFromUrl("https://example.com/reference","Example");
  assert.equal(activeStudioReferences([reference]).length,0);
  assert.deepEqual(studioReferencesToBlueprintReferences([reference]),[]);
  assert.deepEqual(studioReferencesToDirectorReferences([reference]),[]);

  const evidenceOnly={...reference,evidence:["The subject remains centered across the supplied screenshot."]};
  assert.equal(activeStudioReferences([evidenceOnly]).length,0);

  const directed={...evidenceOnly,take:["Carry one persistent subject across chapters."],doNotCopy:["Exact composition"]};
  const director=studioReferencesToDirectorReferences([directed]);
  assert.equal(director.length,1);
  assert.match(director[0].lesson,/Carry one persistent subject/i);
  assert.match(director[0].lesson,/Do not copy: Exact composition/i);
});

test("Studio project schema persists website references",()=>{
  const fixture=JSON.parse(fs.readFileSync("tests/fixtures/reference-analysis.example.json","utf8"));
  const reference=importStudioReferenceAnalysis(fixture);
  const project=parseStudioProject({...rawProject,references:[reference]});
  assert.equal(project.references.length,1);
  assert.equal(project.references[0].label,"CI Reference");
});

test("interactive 3D planning carries evidence-directed references into the blueprint and Director path",()=>{
  const fixture=JSON.parse(fs.readFileSync("tests/fixtures/reference-analysis.example.json","utf8"));
  const reference=importStudioReferenceAnalysis(fixture);
  const plan=planInteractive3DFromPrompt({
    prompt:"Build a premium mechanical watch experience with a persistent product hero and restrained editorial motion.",
    projectName:"Reference Driven Watch",
    experience:rawExperience,
    manifest:rawManifest,
    references:[reference],
  });
  assert.equal(plan.blueprint.references.length,1);
  assert.match(plan.blueprint.references[0].lesson,/Carry one meaningful subject/i);
  assert.match(plan.blueprint.references[0].doNotCopy,/Exact composition/i);
  assert.ok(plan.decisions.some((item)=>/Reference intelligence: 1 evidence-directed/i.test(item)));
});


test("multimodal reference analyzer converts supplied screenshots into bounded Forge guidance",async()=>{
  const reference=studioReferenceFromUrl("https://example.com/reference","Screenshot Reference");
  let requestBody:unknown=null;
  const fetchImpl=async(_input:RequestInfo | URL,init?:RequestInit)=>{
    requestBody=init?.body ? JSON.parse(String(init.body)) : null;
    return new Response(JSON.stringify({
      choices:[{message:{content:JSON.stringify({
        evidence:[
          "Composition: The primary product remains centered while copy occupies a protected left column.",
          "Typography: One oversized display line dominates supporting labels.",
          "Depth: Foreground product scale separates from a restrained background plane."
        ],
        take:[
          "Protect one persistent focal subject while adjacent editorial content changes by chapter."
        ],
        doNotCopy:[
          "Exact composition",
          "Brand imagery and copy",
          "Palette and typeface bundle"
        ],
        systems:{
          composition:"Reserve a stable focal zone and a protected editorial copy column.",
          typography:"Use one dominant display scale with restrained support copy.",
          motion:"",
          interaction:"",
          threeD:"Keep the product as the persistent depth anchor across chapters.",
          transitions:"",
          mobile:"Preserve subject-first hierarchy and stack copy below when width collapses.",
          performance:""
        }
      })}}]
    }),{status:200,headers:{"content-type":"application/json"}});
  };
  const analyzed=await analyzeStudioReferenceScreenshots({
    reference,
    screenshots:[{
      name:"desktop.png",
      dataUrl:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB"
    }],
    environment:{AI_GATEWAY_API_KEY:"test-token"},
    fetchImpl:fetchImpl as typeof fetch,
  });
  assert.ok(analyzed.evidenceStrength>0.7);
  assert.match(analyzed.take[0],/persistent focal subject/i);
  assert.match(analyzed.systems.threeD,/persistent depth anchor/i);
  assert.ok(analyzed.doNotCopy.includes("Exact composition"));
  const outbound=requestBody as {messages?:Array<{content?:Array<{type?:string;image_url?:{url?:string}}>}>};
  assert.equal(outbound.messages?.[0]?.content?.some((item)=>item.type==="image_url" && item.image_url?.url?.startsWith("data:image/png;base64,")),true);
});

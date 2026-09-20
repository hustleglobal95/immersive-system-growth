import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import rawExperience from "../config/experience.json";
import rawManifest from "../config/asset-manifest.json";
import rawProject from "../config/studio-project.json";
import rawCinematic from "../config/cinematic-systems.json";
import rawGraph from "../config/interaction-graph.json";
import { parseExperience, sceneMediaSchema } from "../src/lib/configSchema";
import { sampleExperience } from "../src/lib/sampleExperience";
import { sampleTransitionLayer } from "../src/lib/transitionLayers";
import { assetManifestSchema } from "../src/platform/assetManifestSchema";
import type { AssetManifest } from "../src/types/assets";
import { publishStudioDraft, studioPublishPaths } from "../src/platform/studioPublish";
import { parseStudioProject } from "../src/platform/studioSchema";
// @ts-expect-error The optimizer is shared with the JavaScript CLI.
import { optimizeTexture } from "../scripts/asset-optimize-lib.mjs";

test("Studio Pro scene direction defaults remain deterministic", () => {
  const config = parseExperience(rawExperience);
  const first = sampleExperience(0.12, false, config);
  const second = sampleExperience(0.12, false, config);
  assert.deepEqual(first, second);
  assert.match(first.world.keyColor, /^#[a-f0-9]{6}$/i);
  assert.ok(first.world.exposure >= 0.25 && first.world.exposure <= 3);
  assert.ok(first.material.tintStrength >= 0 && first.material.tintStrength <= 1);
});

test("transition layers use a bounded envelope and unique IDs", () => {
  const layer = { id: "burn", kind: "color" as const, color: "#ff5500", blendMode: "screen" as const, opacity: 0.8, range: [0.2, 0.8] as [number, number], motion: "parallax-up" as const };
  assert.equal(sampleTransitionLayer(0.1, [0, 1], layer).visible, false);
  assert.equal(sampleTransitionLayer(0.5, [0, 1], layer).opacity, 0.8);
  assert.equal(sampleTransitionLayer(0.9, [0, 1], layer).visible, false);
  const media = { kind: "image", src: "/textures/reference/reveal-field.svg", alt: "Reveal", layers: [layer, { ...layer }] };
  assert.equal(sceneMediaSchema.safeParse(media).success, false);
});

test("asset manifests reject traversal and accept the production manifest", () => {
  assert.equal(assetManifestSchema.safeParse(rawManifest).success, true);
  const unsafe = structuredClone(rawManifest);
  unsafe.textures[0].path = "/textures/../secret.png";
  assert.equal(assetManifestSchema.safeParse(unsafe).success, false);
  const unsafeLineage: AssetManifest = structuredClone(rawManifest);
  unsafeLineage.textures[0].derivative = {
    sourcePath: "/textures/../master.png",
    operation: "image-optimize",
    format: "webp",
    width: 640,
    quality: 72,
  };
  assert.equal(assetManifestSchema.safeParse(unsafeLineage).success, false);
});

test("image optimizer preserves the source and records a verified output", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "forge-optimize-"));
  try {
    fs.mkdirSync(path.join(root, "public/textures"), { recursive: true });
    fs.mkdirSync(path.join(root, "config"), { recursive: true });
    const source = path.join(root, "public/textures/source.svg");
    fs.writeFileSync(source, '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#f97316"/></svg>');
    fs.writeFileSync(path.join(root, "config/asset-manifest.json"), JSON.stringify({ models: [], textures: [], hdr: [], video: [], budgets: { modelMb: 1, textureMb: 1, hdrMb: 1, videoMb: 1, totalMb: 5 } }));
    const result = await optimizeTexture({ root, input: "public/textures/source.svg", format: "webp", width: 640, quality: 70 });
    assert.equal(fs.existsSync(source), true);
    assert.equal(fs.existsSync(path.join(root, "public/textures/source.opt.webp")), true);
    assert.equal(result.width, 640);
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "config/asset-manifest.json"), "utf8"));
    assert.deepEqual(manifest.textures[0], {
      path: result.path,
      bytes: result.bytes,
      sha256: result.sha256,
      derivative: {
        sourcePath: "/textures/source.svg",
        operation: "image-optimize",
        format: "webp",
        width: 640,
        quality: 70,
      },
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Studio publishing resolves files inside the owning project bundle", () => {
  const active=parseStudioProject(rawProject);
  assert.deepEqual(studioPublishPaths(active),{
    project:"config/studio-project.json",
    assetManifest:"config/asset-manifest.json",
    interactionGraph:"config/interaction-graph.json",
    cinematicSystems:"config/cinematic-systems.json",
  });

  const nocterra=parseStudioProject(JSON.parse(fs.readFileSync("clients/nocterra-residences/studio-project.json","utf8")));
  assert.deepEqual(studioPublishPaths(nocterra),{
    project:"clients/nocterra-residences/studio-project.json",
    assetManifest:"clients/nocterra-residences/asset-manifest.json",
    interactionGraph:"clients/nocterra-residences/interaction-graph.json",
    cinematicSystems:"clients/nocterra-residences/cinematic-systems.json",
  });

  const heliot=parseStudioProject(JSON.parse(fs.readFileSync("clients/heliot/studio-project.json","utf8")));
  assert.deepEqual(studioPublishPaths(heliot),{
    project:"clients/heliot/studio-project.json",
    assetManifest:"src/experiences/heliot/asset-manifest.json",
    interactionGraph:"clients/heliot/interaction-graph.json",
    cinematicSystems:"clients/heliot/cinematic-systems.json",
  });
});

test("Studio publishing opens a review PR without exposing its token", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetcher = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes("/git/ref/heads/")) return Response.json({ object: { sha: "base-sha" } });
    if (url.endsWith("/pulls")) return Response.json({ number: 42, html_url: "https://github.com/example/repo/pull/42" });
    if (init.method === "GET" || !init.method) return Response.json({ sha: "old-file-sha" });
    return Response.json({});
  }) as typeof fetch;
  const result = await publishStudioDraft(
    { experience: rawExperience, project: rawProject, assetManifest: rawManifest, interactionGraph: rawGraph, title: "Studio direction", summary: "Review camera, layers and assets." },
    { repository: "example/repo", token: "server-only-token" },
    fetcher,
  );
  assert.equal(result.number, 42);
  assert.match(result.branch, new RegExp(`^forge/studio-${rawProject.id}-`));
  assert.equal(calls.length, 11);
  assert.ok(calls.every((call) => new Headers(call.init.headers).get("authorization") === "Bearer server-only-token"));
  assert.ok(calls.every((call) => !String(call.init.body ?? "").includes("server-only-token")));
  const pullBody = JSON.parse(String(calls.at(-1)?.init.body));
  assert.equal(pullBody.base, "main");
  assert.equal(pullBody.head, result.branch);
});

test("Studio publishing carries authored interactions into the review branch", async () => {
  const calls:Array<{url:string;init:RequestInit}>=[];
  const fetcher=(async(input:string|URL|Request,init:RequestInit={})=>{
    const url=String(input);
    calls.push({url,init});
    if(url.includes("/git/ref/heads/")) return Response.json({object:{sha:"base-sha"}});
    if(url.endsWith("/pulls")) return Response.json({number:44,html_url:"https://github.com/example/repo/pull/44"});
    if(init.method==="GET"||!init.method) return Response.json({sha:"old-file-sha"});
    return Response.json({});
  }) as typeof fetch;
  await publishStudioDraft(
    {experience:rawExperience,project:rawProject,assetManifest:rawManifest,interactionGraph:rawGraph},
    {repository:"example/repo",token:"server-only-token"},
    fetcher,
  );
  const graphPut=calls.find((call)=>call.url.includes("/contents/config/interaction-graph.json") && call.init.method==="PUT");
  assert.ok(graphPut);
  const payload=JSON.parse(String(graphPut?.init.body));
  const decoded=JSON.parse(Buffer.from(payload.content,"base64").toString("utf8"));
  assert.deepEqual(decoded,rawGraph);
});

test("Studio publishing creates missing client config files without borrowing global config", async () => {
  const project=parseStudioProject({
    ...rawProject,
    id:"fresh-client",
    name:"Fresh Client",
    experiencePath:"clients/fresh-client/experience.json",
    visualSystemsPath:"clients/fresh-client/visual-systems.json",
    creativeDirectionPath:"clients/fresh-client/creative-direction.json",
    experienceModesPath:"clients/fresh-client/experience-modes.json",
    deployment:{...rawProject.deployment,projectName:"fresh-client"},
  });
  const calls:Array<{url:string;init:RequestInit}>=[];
  const fetcher=(async(input:string|URL|Request,init:RequestInit={})=>{
    const url=String(input);
    calls.push({url,init});
    if(url.includes("/git/ref/heads/")) return Response.json({object:{sha:"base-sha"}});
    if(url.endsWith("/pulls")) return Response.json({number:45,html_url:"https://github.com/example/repo/pull/45"});
    if(url.includes("/contents/clients/fresh-client/") && (!init.method || init.method==="GET")) return Response.json({message:"Not Found"},{status:404});
    if(!init.method || init.method==="GET") return Response.json({sha:"old-file-sha"});
    return Response.json({});
  }) as typeof fetch;
  await publishStudioDraft(
    {experience:rawExperience,project,assetManifest:rawManifest,interactionGraph:rawGraph,cinematicSystems:rawCinematic},
    {repository:"example/repo",token:"server-only-token"},
    fetcher,
  );
  const puts=calls.filter((call)=>call.init.method==="PUT" && call.url.includes("/contents/clients/fresh-client/"));
  assert.equal(puts.length,5);
  for(const call of puts) {
    const payload=JSON.parse(String(call.init.body));
    assert.equal("sha" in payload,false);
  }
  assert.equal(calls.some((call)=>call.url.includes("/contents/config/interaction-graph.json")),false);
  assert.equal(calls.some((call)=>call.url.includes("/contents/config/cinematic-systems.json")),false);
});

test("Studio publishing carries live cinematic systems into the review branch", async () => {
  const calls:Array<{url:string;init:RequestInit}>=[];
  const fetcher=(async(input:string|URL|Request,init:RequestInit={})=>{
    const url=String(input);
    calls.push({url,init});
    if(url.includes("/git/ref/heads/")) return Response.json({object:{sha:"base-sha"}});
    if(url.endsWith("/pulls")) return Response.json({number:43,html_url:"https://github.com/example/repo/pull/43"});
    if(init.method==="GET"||!init.method) return Response.json({sha:"old-file-sha"});
    return Response.json({});
  }) as typeof fetch;
  await publishStudioDraft(
    {experience:rawExperience,project:rawProject,assetManifest:rawManifest,interactionGraph:rawGraph,cinematicSystems:rawCinematic},
    {repository:"example/repo",token:"server-only-token"},
    fetcher,
  );
  const cinematicPut=calls.find((call)=>call.url.includes("/contents/config/cinematic-systems.json") && call.init.method==="PUT");
  assert.ok(cinematicPut);
  const payload=JSON.parse(String(cinematicPut?.init.body));
  const decoded=JSON.parse(Buffer.from(payload.content,"base64").toString("utf8"));
  assert.deepEqual(decoded,rawCinematic);
});

test("Studio publishing fails closed on invalid repository settings", async () => {
  await assert.rejects(() => publishStudioDraft({ experience: rawExperience, project: rawProject, assetManifest: rawManifest, interactionGraph: rawGraph }, { repository: "not-a-repository", token: "token" }), /owner\/name/);
});

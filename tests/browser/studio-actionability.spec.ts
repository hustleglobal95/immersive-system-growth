import { expect, test } from "@playwright/test";

const editorNav=(page:import("@playwright/test").Page)=>page.getByRole("navigation",{name:"Editor modes"});

function minimalGlb(name="Rotor") {
  const json=Buffer.from(JSON.stringify({
    asset:{version:"2.0"},
    scenes:[{nodes:[0]}],
    nodes:[{name,mesh:0}],
    meshes:[{name:"RotorMesh",primitives:[{attributes:{POSITION:0}}]}],
    accessors:[{count:3}],
    materials:[],
  }));
  const paddedLength=Math.ceil(json.length/4)*4;
  const total=12+8+paddedLength;
  const buffer=Buffer.alloc(total,0x20);
  buffer.writeUInt32LE(0x46546c67,0);
  buffer.writeUInt32LE(2,4);
  buffer.writeUInt32LE(total,8);
  buffer.writeUInt32LE(paddedLength,12);
  buffer.writeUInt32LE(0x4e4f534a,16);
  json.copy(buffer,20);
  return buffer;
}

test("References workspace persists evidence-directed rules and feeds AI Build",async({page})=>{
  await page.goto("/studio");
  await editorNav(page).getByRole("button",{name:"References",exact:true}).click();
  await expect(page.getByText("PROJECT REFERENCES",{exact:true})).toBeVisible();

  await page.getByLabel("Reference URL").fill("https://example.com/reference");
  await page.getByLabel("Reference label").fill("Reference Test");
  await page.getByRole("button",{name:"＋ Add website",exact:true}).click();
  await expect(page.getByText("NEEDS DIRECTION",{exact:true})).toBeVisible();

  await page.locator("label.reference-editor__list").filter({hasText:"Transfer / take"}).locator("textarea").fill("Carry one persistent subject through chapter transitions.");
  await page.locator("label.reference-editor__list").filter({hasText:"Do not copy"}).locator("textarea").fill("Exact composition");
  await expect(page.getByText("REFERENCE ACTIVE",{exact:true})).toBeVisible();

  await expect.poll(()=>page.evaluate(()=>{
    const raw=localStorage.getItem("forge-studio-v2");
    return raw ? JSON.parse(raw).project?.references?.[0]?.take?.[0] : null;
  })).toBe("Carry one persistent subject through chapter transitions.");

  await page.getByRole("button",{name:/Canvas/}).first().click();
  await page.getByRole("button",{name:"AI Build",exact:true}).click();
  await expect(page.getByText(/1 evidence-directed reference active/)).toBeVisible();
});

test("Motion workspace preserves expert motion control",async({page})=>{
  await page.goto("/studio");
  await editorNav(page).getByRole("button",{name:"Motion",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Motion sequencer",level:2})).toBeVisible();
  await expect(page.getByLabel("Playback rate")).toBeVisible();
  await expect(page.getByLabel("Timeline snap")).toBeVisible();
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeVisible();
});

test("Interactions workspace preserves deterministic graph authoring",async({page})=>{
  await page.goto("/studio");
  await editorNav(page).getByRole("button",{name:"Interact",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Interaction graph",level:2})).toBeVisible();
  const nodes=page.getByRole("application",{name:"Interaction node graph"}).locator("button");
  const before=await nodes.count();
  await page.getByRole("button",{name:"Add trigger",exact:true}).click();
  await expect(nodes).toHaveCount(before+1);
});

test("Assets workspace can stage a file and mutate project asset state",async({page})=>{
  await page.goto("/studio");
  await editorNav(page).getByRole("button",{name:"Assets",exact:true}).click();
  const intake=page.locator("section.studio-card").filter({has:page.getByRole("heading",{name:"Inspect before repository upload",level:2})});
  const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZfKkAAAAASUVORK5CYII=","base64");
  await intake.locator('input[type="file"]').setInputFiles({name:"actionability.png",mimeType:"image/png",buffer:png});
  const status=intake.locator('p[role="status"]');
  await expect(status).toContainText("1 asset inspected locally");
  const record=page.locator(".asset-intake-list article").filter({hasText:"actionability.png"});
  await record.getByRole("button",{name:"Register",exact:true}).click();
  await record.getByRole("button",{name:"Use in draft",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>{
    const raw=localStorage.getItem("forge-studio-v2");
    if(!raw)return false;
    const draft=JSON.parse(raw);
    return draft.assetManifest?.textures?.some((item:{path?:string})=>item.path==="/textures/uploads/actionability.png")
      && draft.experience?.scenes?.[0]?.media?.src==="/textures/uploads/actionability.png";
  })).toBe(true);
});

test("GLB Inspector creates deterministic rig tracks from a staged model",async({page})=>{
  await page.goto("/studio");
  await editorNav(page).getByRole("button",{name:"Assets",exact:true}).click();
  const inspector=page.locator("section.studio-card").filter({has:page.getByRole("heading",{name:"GLB node mapper",level:2})});
  await inspector.locator('input[type="file"]').setInputFiles({name:"actionability.glb",mimeType:"model/gltf-binary",buffer:minimalGlb()});
  await expect(page.getByText("Rotor",{exact:true}).first()).toBeVisible();
  await page.getByLabel("Public model path").fill("/models/client/actionability.glb");
  await page.getByRole("button",{name:"Select recommended",exact:true}).click();
  const create=page.getByRole("button",{name:"Create deterministic rig tracks",exact:true});
  await expect(create).toBeEnabled();
  await create.click();
  await expect.poll(()=>page.evaluate(()=>{
    const raw=localStorage.getItem("forge-studio-v2");
    if(!raw)return false;
    const rig=JSON.parse(raw).experience?.productRig;
    return rig?.nodes?.includes("Rotor")&&rig?.tracks?.some((track:{node?:string})=>track.node==="Rotor");
  })).toBe(true);
});

test("Effects workspace authors cursor reveal and visual physics",async({page})=>{
  await page.goto("/studio");
  await editorNav(page).getByRole("button",{name:"Effects",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Visual Effects",level:2})).toBeVisible();
  const preset=page.locator("label").filter({hasText:"Preset"}).locator("select");
  await preset.selectOption("cursor");
  await expect(page.getByLabel("Cursor mode")).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>{
    const raw=localStorage.getItem("forge-studio-v2");
    if(!raw)return false;
    return JSON.parse(raw).cinematicSystems?.scenes?.some((scene:{cursorReveal?:unknown})=>Boolean(scene.cursorReveal))??false;
  })).toBe(true);
});

test("Performance quality tool mutates telemetry policy",async({page})=>{
  await page.goto("/studio");
  await page.getByRole("button",{name:"Quality",exact:true}).click();
  await page.getByRole("button",{name:"Performance",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Telemetry policy",level:2})).toBeVisible();
  const sample=page.locator("label").filter({hasText:"Sample rate"}).locator('input[type="range"]');
  await sample.fill("0.55");
  await expect.poll(()=>page.evaluate(()=>{
    const raw=localStorage.getItem("forge-studio-v2");
    return raw?JSON.parse(raw).project?.telemetry?.sampleRate:null;
  })).toBe(.55);
});

test("Search and AI quality tool mutates discoverability policy and Project Health",async({page})=>{
  await page.goto("/studio");
  await page.getByRole("button",{name:"Quality",exact:true}).click();
  await page.getByRole("button",{name:"Search & AI",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Discoverability contract",level:2})).toBeVisible();
  await page.getByLabel("Default search title").fill("Forge Search Verified");
  await expect.poll(()=>page.evaluate(()=>{
    const raw=localStorage.getItem("forge-studio-v2");
    return raw?JSON.parse(raw).project?.discoverability?.defaultTitle:null;
  })).toBe("Forge Search Verified");
  await page.getByRole("button",{name:"Project health",exact:true}).click();
  await expect(page.locator(".forge-next__health-page")).toBeVisible();
});

test("Publish honors Project Health and keeps release authority protected",async({page})=>{
  await page.goto("/studio");
  await page.getByRole("button",{name:"Publish",exact:true}).click();
  await expect(page.getByText("PUBLISH / RELEASE",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:/Ready to create a review|Finish the release setup/})).toBeVisible();
});

test("Project Vault exposes durable save actions and explicit configuration state",async({page})=>{
  await page.goto("/studio");
  await page.getByRole("button",{name:"Open command palette"}).click();
  await page.getByRole("button",{name:"Versions",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Durable projects and restore points."});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button",{name:"Save to Project Vault",exact:true})).toBeVisible();
});

test("Improvement engine remains executable from the new Forge editor",async({page})=>{
  await page.goto("/studio");
  await page.getByRole("button",{name:"Open command palette"}).click();
  await page.getByRole("button",{name:"Improve current site",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Closed-loop improvement with proof."});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("EXECUTABLE LOOP").first()).toBeVisible();
});

test("New website starts from isolated project state",async({page})=>{
  await page.goto("/studio");
  await page.getByRole("button",{name:"Open command palette"}).click();
  await page.getByRole("button",{name:"New website",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Start with a clean canvas."});
  await dialog.getByLabel("Project name").fill("Fresh Forge Test");
  await dialog.getByRole("button",{name:"custom",exact:true}).click();
  await dialog.getByRole("button",{name:"Create website",exact:true}).click();
  await expect(page.getByText("Fresh Forge Test",{exact:true}).first()).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>{
    const raw=localStorage.getItem("forge-studio-v2");
    if(!raw)return null;
    const draft=JSON.parse(raw);
    return {name:draft.project?.name,assets:draft.assetManifest?.models?.length??-1,refs:draft.project?.references?.length??-1};
  })).toEqual({name:"Fresh Forge Test",assets:0,refs:0});
});

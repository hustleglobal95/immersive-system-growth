import { expect, test } from "@playwright/test";

async function openAdvanced(page:import("@playwright/test").Page,label:RegExp) {
  const advanced=page.locator("details.production-advanced-menu");
  await advanced.locator("> summary").click();
  await advanced.getByRole("button",{name:label}).first().click();
}

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

test("Build rig inspector targets the selected part in simple Animate",async({page})=>{
  await page.goto("/studio");
  await openAdvanced(page,/Asset tools/);
  const inspector=page.locator("section.studio-card").filter({has:page.getByRole("heading",{name:"GLB node mapper",level:2})});
  await inspector.locator('input[type="file"]').setInputFiles({name:"actionability-rig.glb",mimeType:"model/gltf-binary",buffer:minimalGlb()});
  await expect(page.getByText("Rotor",{exact:true}).first()).toBeVisible();
  await page.getByLabel("Public model path").fill("/models/client/actionability-rig.glb");
  await page.getByRole("button",{name:"Select recommended",exact:true}).click();
  const create=page.getByRole("button",{name:"Create deterministic rig tracks",exact:true});
  await expect(create).toBeEnabled();
  await create.click();
  await expect.poll(()=>page.evaluate(()=>{
    const raw=localStorage.getItem("forge-studio-v2");
    if(!raw) return false;
    const rig=JSON.parse(raw).experience?.productRig;
    return rig?.nodes?.includes("Rotor") && rig?.tracks?.some((track:{node?:string})=>track.node==="Rotor");
  })).toBe(true);

  await page.locator(".production-advanced-head").getByRole("button",{name:/Back to Studio/}).click();
  await page.getByRole("button",{name:"Structure",exact:true}).click();
  await page.locator(".production-tree").getByRole("button",{name:/Rotor/}).click();
  await page.locator(".production-right").getByRole("button",{name:"Position",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Make something move.",level:2})).toBeVisible();
  await expect(page.getByLabel("Animate target")).toHaveValue("rig:Rotor:position");
});

test("Build asset inspector opens actionable Asset tools",async({page})=>{
  await page.goto("/studio");
  await page.locator(".production-left").getByRole("button",{name:"Assets",exact:true}).click();
  const firstAsset=page.locator(".production-left .production-tree button").first();
  await expect(firstAsset).toBeVisible();
  await firstAsset.click();
  await page.locator(".production-right").getByRole("button",{name:"Replace / optimize / inspect",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Inspect before repository upload",level:2})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Asset bank",level:2,exact:true})).toBeVisible();
});

test("Advanced Asset tools can stage a file and mutate project asset state",async({page})=>{
  await page.goto("/studio");
  await openAdvanced(page,/Asset tools/);
  const intake=page.locator("section.studio-card").filter({has:page.getByRole("heading",{name:"Inspect before repository upload",level:2})});
  const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZfKkAAAAASUVORK5CYII=","base64");
  await intake.locator('input[type="file"]').setInputFiles({name:"actionability.png",mimeType:"image/png",buffer:png});
  const intakeStatus=intake.locator('p[role="status"]');
  await expect(intakeStatus).toContainText("1 asset inspected locally");
  const record=page.locator(".asset-intake-list article").filter({hasText:"actionability.png"});
  await record.getByRole("button",{name:"Register",exact:true}).click();
  await expect(intakeStatus).toContainText("added to the draft manifest");
  await record.getByRole("button",{name:"Use in draft",exact:true}).click();
  await expect(intakeStatus).toContainText("Active scene media updated");
  await expect.poll(()=>page.evaluate(()=>{
    const raw=localStorage.getItem("forge-studio-v2");
    if(!raw) return false;
    const draft=JSON.parse(raw);
    return draft.assetManifest?.textures?.some((item:{path?:string})=>item.path==="/textures/uploads/actionability.png")
      && draft.experience?.scenes?.[0]?.media?.src==="/textures/uploads/actionability.png";
  })).toBe(true);
});

test("GLB Inspector creates deterministic rig tracks from a staged model",async({page})=>{
  await page.goto("/studio");
  await openAdvanced(page,/Asset tools/);
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
    if(!raw) return false;
    const rig=JSON.parse(raw).experience?.productRig;
    return rig?.nodes?.includes("Rotor") && rig?.tracks?.some((track:{node?:string})=>track.node==="Rotor");
  })).toBe(true);
});

test("Advanced Telemetry mutates policy without permanent navigation",async({page})=>{
  await page.goto("/studio");
  await openAdvanced(page,/Telemetry/);
  const sample=page.locator("label").filter({hasText:"Sample rate"}).locator('input[type="range"]');
  await expect(sample).toBeVisible();
  await sample.fill("0.55");
  await expect.poll(()=>page.evaluate(()=>{
    const raw=localStorage.getItem("forge-studio-v2");
    return raw ? JSON.parse(raw).project?.telemetry?.sampleRate : null;
  })).toBe(.55);
});

test("Guided Build persists a project brief and returns to production",async({page})=>{
  await page.goto("/studio");
  await page.getByRole("button",{name:/Guided Build/}).first().click();
  const guide=page.getByRole("dialog",{name:"Build the project without learning the machinery."});
  await expect(guide).toBeVisible();
  const brief="Create a precise luxury product reveal with a mechanical signature moment.";
  await guide.locator("textarea").fill(brief);
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem("forge-studio-guide-brief-v1"))).toBe(brief);
  await guide.getByRole("button",{name:"Close guide"}).click();
  await expect(page.getByRole("button",{name:"Build",exact:true})).toHaveAttribute("aria-current","page");
  await page.getByRole("button",{name:/Guided Build/}).first().click();
  await expect(page.getByRole("dialog").locator("textarea")).toHaveValue(brief);
});

test("Project Vault exposes durable save actions and explicit configuration state",async({page})=>{
  await page.goto("/studio");
  await page.getByRole("button",{name:"Open command palette"}).click();
  await page.getByRole("button",{name:"Project Vault",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Durable projects and restore points."});
  await expect(dialog).toBeVisible();
  const status=dialog.locator(".production-vault-status strong");
  await expect(status).not.toHaveText("Checking storage…");
  const save=dialog.getByRole("button",{name:"Save to Project Vault",exact:true});
  await expect(save).toBeVisible();
  const statusText=(await status.textContent())??"";
  if(statusText.includes("Vault not configured")){
    await expect(dialog.getByText(/Configure the server Vault/)).toBeVisible();
    await expect(save).toBeDisabled();
  } else {
    await expect(status).toContainText("Durable storage connected");
  }
});

test("Improvement evidence keeps the Loop Engine executable or explicitly fail-closed",async({page})=>{
  await page.goto("/studio");
  await page.getByRole("button",{name:"Open command palette"}).click();
  await page.getByRole("button",{name:"Improvement evidence",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Closed-loop improvement with proof."});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("EXECUTABLE LOOP").first()).toBeVisible();
  await expect(dialog.getByRole("button",{name:"Start from a proposal",exact:true}).first()).toBeVisible();
  const response=await page.request.post("/api/studio/loops/run",{
    data:{projectId:"test-project",loopId:"visual-polish",proposalId:"proposal-test",selectionKey:"scene:0",baselineFingerprint:"a".repeat(64),context:"Verify bounded improvement."},
  });
  expect([401,403,503]).toContain(response.status());
  if(response.status()===503){
    const body=await response.json();
    expect(String(body.error)).toMatch(/not enabled|requires/i);
  }
});

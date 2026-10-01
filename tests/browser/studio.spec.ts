import { expect, test } from "@playwright/test";

const nav=(page:import("@playwright/test").Page)=>page.getByRole("navigation",{name:"Editor modes"});

test("canvas edit persists into the working website",async({page})=>{
  await page.goto("/studio");
  await expect(page.locator(".forge-next__canvas")).toBeVisible();
  await page.getByRole("button",{name:"Content",exact:true}).click();
  await page.getByLabel("Headline").fill("Forge Canvas Edit");
  await expect.poll(()=>page.evaluate(()=>{
    const raw=localStorage.getItem("forge-studio-v2");
    return raw?JSON.parse(raw).experience?.scenes?.[0]?.copy?.headline:null;
  })).toBe("Forge Canvas Edit");
  await page.reload();
  await page.getByRole("button",{name:"Content",exact:true}).click();
  await expect(page.getByLabel("Headline")).toHaveValue("Forge Canvas Edit");
});

test("editor exposes website sections instead of scenes",async({page})=>{
  await page.goto("/studio");
  await expect(page.getByText("Sections",{exact:true})).toBeVisible();
  const sections=page.locator(".forge-next__scene-list>button");
  const before=await sections.count();
  await page.getByRole("button",{name:"＋ Add section",exact:true}).click();
  await expect(sections).toHaveCount(before+1);
  await page.getByRole("button",{name:"Design",exact:true}).last().click();
  await expect(page.locator(".forge-next__inspector").getByLabel("Name")).toHaveValue(`Section ${before+1}`);
});

test("editable R3F stage is the default Forge canvas",async({page})=>{
  await page.goto("/studio");
  await expect(page.locator(".forge-viewport-canvas")).toBeVisible();
  await expect(page.locator(".forge-viewport-canvas canvas")).toBeAttached();
  await expect(page.getByRole("group",{name:"Transform mode"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Preview",exact:true}).first()).toBeVisible();
});

test("layers select editable elements and inspector exposes transforms",async({page})=>{
  await page.goto("/studio");
  await page.getByRole("button",{name:"Layers",exact:true}).click();
  await page.getByRole("button",{name:"Headline",exact:true}).click();
  await expect(page.getByText("3D headline",{exact:true})).toBeVisible();
  await expect(page.getByLabel("Position X")).toBeVisible();
  await expect(page.getByLabel("Rotation Y")).toBeVisible();
  await expect(page.getByLabel("Scale Z")).toBeVisible();
});

test("transform inspector writes to the same canvas state",async({page})=>{
  await page.goto("/studio");
  await page.getByRole("button",{name:"Layers",exact:true}).click();
  await page.getByRole("button",{name:"Headline",exact:true}).click();
  await page.getByLabel("Position X").fill("1.25");
  await expect.poll(()=>page.evaluate(()=>{
    const raw=localStorage.getItem("forge-studio-v2");
    if(!raw)return null;
    const draft=JSON.parse(raw);
    const sectionId=draft.experience?.scenes?.[0]?.id;
    return sectionId?draft.project?.canvasEditor?.headlineTransforms?.[sectionId]?.position?.[0]:null;
  })).toBe(1.25);
});

test("canvas panels collapse without hiding the website",async({page})=>{
  await page.goto("/studio");
  await page.getByRole("button",{name:"Collapse layers"}).click();
  await expect(page.locator(".forge-next__layers")).toHaveAttribute("data-open","false");
  await expect(page.locator(".forge-next__canvas")).toBeVisible();
  await page.getByRole("button",{name:"Collapse inspector"}).click();
  await expect(page.locator(".forge-next__inspector")).toHaveAttribute("data-open","false");
  await expect(page.locator(".forge-next__canvas")).toBeVisible();
});

test("mode bar moves between real production workspaces",async({page})=>{
  await page.goto("/studio");
  await nav(page).getByRole("button",{name:"References",exact:true}).click();
  await expect(page.getByRole("heading",{name:"References",level:1})).toBeVisible();
  await nav(page).getByRole("button",{name:"Motion",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Motion sequencer",level:2})).toBeVisible();
  await nav(page).getByRole("button",{name:"Interact",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Interaction graph",level:2})).toBeVisible();
  await nav(page).getByRole("button",{name:"Effects",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Visual Effects",level:2})).toBeVisible();
});

test("AI Build is an overlay on the editor instead of a separate product",async({page})=>{
  await page.goto("/studio");
  await page.getByRole("button",{name:"AI Build",exact:true}).click();
  await expect(page.locator(".forge-next__ai-drawer")).toBeVisible();
  await expect(page.locator(".forge-next__canvas")).toBeVisible();
  await page.locator(".forge-next__drawer-head").getByRole("button").click();
  await expect(page.locator(".forge-next__ai-drawer")).toHaveCount(0);
});

test("quality is one click from the editor and exposes project health",async({page})=>{
  await page.goto("/studio");
  await page.getByRole("button",{name:"Quality",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Quality",level:1})).toBeVisible();
  await expect(page.locator(".forge-next__health-page")).toBeVisible();
  await expect(page.getByRole("button",{name:"Performance",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Search & AI",exact:true})).toBeVisible();
});

test("project menu keeps Director, agent, versions and export reachable",async({page})=>{
  await page.goto("/studio");
  await page.getByRole("button",{name:"Project menu"}).click();
  await expect(page.getByRole("link",{name:"Director",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Creative Agent",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Asset Creator",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Versions",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Improve current site",exact:true})).toBeVisible();
});

test("editor remains usable at a narrow viewport",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/studio");
  await expect(page.locator("main.forge-next")).toBeVisible();
  await expect(page.locator(".forge-next__canvas")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});

// A deterministic view isolates pointer hit testing from each project's authored camera.
test("canvas selection, orbit and gizmo edits stay in sync with Layers and inspector",async({page},testInfo)=>{
  await page.goto("/studio");
  await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem("forge-studio-v2"))).toBe(true);
  await page.evaluate(()=>{
    const draft=JSON.parse(localStorage.getItem("forge-studio-v2")!);
    draft.experience.heroVisible=false;
    draft.experience.assets=[];
    const section=draft.experience.scenes[0];
    section.copy.headline="FORGE";
    section.camera.from={...section.camera.from,position:[0,.7,8],target:[0,.7,0],fov:50};
    section.camera.to={...section.camera.to,position:[0,.7,8],target:[0,.7,0],fov:50};
    draft.project.canvasEditor={headlineTransforms:{[section.id]:{position:[0,.7,0],rotation:[0,0,0],scale:[1,1,1]}}};
    localStorage.setItem("forge-studio-v2",JSON.stringify(draft));
  });
  await page.reload();
  const canvas=page.locator(".forge-viewport-canvas canvas");
  const bounds=await canvas.boundingBox();
  if(!bounds)throw new Error("The edit canvas has no dimensions");
  const center={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
  // Retry while the font worker finishes preparing the text geometry.
  await expect(async()=>{
    await page.mouse.click(center.x,center.y);
    await expect(page.locator('.forge-next__layer-row[data-active="true"]')).toHaveText("Headline");
  }).toPass();
  await expect(page.getByLabel("Position X")).toHaveValue("0");
  await page.getByLabel("Position X").fill("1.25");
  await expect(page.getByLabel("Position X")).toHaveValue("1.25");
  await page.reload();
  await page.getByRole("button",{name:"Layers",exact:true}).click();
  await page.getByRole("button",{name:"Headline",exact:true}).click();
  await expect(page.getByLabel("Position X")).toHaveValue("1.25");
  await page.getByLabel("Position X").fill("0");
  // The gizmo size depends on the canvas aspect ratio; probe along its X handle.
  for(const offset of [30,45,60,75,90]){
    await page.mouse.move(center.x+offset,center.y);
    await page.mouse.down();
    await page.mouse.move(center.x+offset+65,center.y,{steps:12});
    await page.mouse.up();
    if(Number(await page.getByLabel("Position X").inputValue())>.1)break;
  }
  await expect.poll(async()=>Number(await page.getByLabel("Position X").inputValue())).toBeGreaterThan(.1);
  const moved=await page.getByLabel("Position X").inputValue();
  await page.reload();
  await page.getByRole("button",{name:"Layers",exact:true}).click();
  await page.getByRole("button",{name:"Headline",exact:true}).click();
  await expect(page.getByLabel("Position X")).toHaveValue(moved);
  await testInfo.attach("canvas-gizmo",{body:await canvas.screenshot(),contentType:"image/png"});
  // Orbit from an empty corner; selected element transforms must stay unchanged.
  const before=await canvas.screenshot();
  await page.mouse.move(bounds.x+25,bounds.y+25);
  await page.mouse.down();
  await page.mouse.move(bounds.x+125,bounds.y+65,{steps:12});
  await page.mouse.up();
  await expect.poll(async()=>Buffer.compare(before,await canvas.screenshot())).not.toBe(0);
  await expect(page.getByLabel("Position X")).toHaveValue(moved);
  await testInfo.attach("canvas-orbit",{body:await canvas.screenshot(),contentType:"image/png"});
});

test("hero scale fields preserve the entered uniform scale",async({page})=>{
  await page.goto("/studio");
  await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem("forge-studio-v2"))).toBe(true);
  await page.evaluate(()=>{
    const draft=JSON.parse(localStorage.getItem("forge-studio-v2")!);
    draft.experience.heroVisible=true;
    draft.experience.heroModel="";
    localStorage.setItem("forge-studio-v2",JSON.stringify(draft));
  });
  await page.reload();
  await page.getByRole("button",{name:"Layers",exact:true}).click();
  await page.getByRole("button",{name:"Hero 3D",exact:true}).click();
  await page.getByLabel("Scale Y").fill("2");
  for(const axis of ["X","Y","Z"])await expect(page.getByLabel(`Scale ${axis}`)).toHaveValue("2");
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("forge-studio-v2")!).experience.scenes[0].hero.from.scale)).toBe(2);
});

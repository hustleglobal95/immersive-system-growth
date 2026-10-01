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

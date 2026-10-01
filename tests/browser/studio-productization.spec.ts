import { expect, test } from "@playwright/test";

test("Studio opens directly as the complete interactive 3D website editor", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio");

  await expect(page.locator("main.production-studio")).toBeVisible();
  await expect(page.getByRole("button",{name:"Canvas",exact:true})).toHaveAttribute("aria-current","page");
  await expect(page.getByRole("button",{name:"References",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Motion",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Interactions",exact:true})).toBeVisible();
  await expect(page.locator(".production-topbar nav").getByRole("button",{name:"Assets",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Effects",exact:true})).toBeVisible();
  await expect(page.getByText("LIVE SITE CANVAS")).toBeVisible();
  await expect(page.getByText("LAYERS + SCENES")).toBeVisible();
  await expect(page.getByText("INSPECTOR")).toBeVisible();
  await expect(page.getByText("SCROLL TIMELINE")).toBeVisible();
  await expect(page.locator(".production-runtime canvas").first()).toBeAttached();
});

test("Studio has no simple or advanced product split", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.locator("main.forge-builder")).toHaveCount(0);
  await expect(page.locator("details.production-advanced-menu")).toHaveCount(0);
  await expect(page.getByText("Start Guided Build")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"AI Build",exact:true})).toBeVisible();
});

test("Editor exposes command control without hiding the production UI", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByRole("button", { name: "Open command palette" })).toBeVisible();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
  await expect(page.getByRole("dialog", { name: "Go anywhere. Do anything." })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Go anywhere. Do anything." }).getByRole("button",{name:"Motion",exact:true})).toBeVisible();
});

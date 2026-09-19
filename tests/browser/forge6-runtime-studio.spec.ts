import { expect, test } from "@playwright/test";

test("Studio authors lifecycle triggers and complete runtime command actions", async ({ page }) => {
  await page.goto("/studio");
  await page.getByText("Advanced", { exact: true }).click();
  await page.getByRole("button", { name: /Interactions/ }).click();
  await expect(page.getByRole("heading", { name: "Interaction graph", level: 2 })).toBeVisible();

  await page.getByRole("button", { name: "Add trigger" }).click();
  await page.getByLabel("Interaction trigger event").selectOption("sequence-complete");
  await page.getByLabel("Interaction trigger name").fill("ingredients");
  await expect(page.getByText("Production schema valid")).toBeVisible();

  await page.getByRole("button", { name: "Add action" }).click();
  const actionType = page.getByLabel("Interaction action type");

  await actionType.selectOption("sequence");
  await page.getByLabel("Sequence action name").fill("ingredients");
  await page.getByLabel("Sequence duration ms").fill("900");
  await page.getByLabel("Sequence release").check();
  await expect(page.getByText("Production schema valid")).toBeVisible();

  await actionType.selectOption("camera");
  await page.getByLabel("Camera shot action name").fill("detail-approach");
  await page.getByLabel("Camera duration ms").fill("700");
  await expect(page.getByText("Production schema valid")).toBeVisible();

  await actionType.selectOption("audio");
  await page.getByLabel("Audio cue action name").fill("ambient");
  await page.getByLabel("Audio action source").fill("/audio/ambient.mp3");
  await page.getByLabel("Audio fade ms").fill("500");
  await page.getByLabel("Audio loop").check();
  await expect(page.getByText("Production schema valid")).toBeVisible();

  await actionType.selectOption("shader");
  await page.getByLabel("Shader action target").fill("hero");
  await page.getByLabel("Shader action parameter").fill("roughness");
  await page.getByLabel("Shader action duration ms").fill("450");
  await page.getByLabel("Shader action easing").selectOption("ease-in-out");
  await expect(page.getByText("Production schema valid")).toBeVisible();

  await actionType.selectOption("orbit");
  await page.getByLabel("Orbit action target").fill("hero");
  await page.getByLabel("Orbit action command").selectOption("enable");
  await page.getByLabel("Orbit sensitivity").fill("0.008");
  await expect(page.getByText("Production schema valid")).toBeVisible();

  await actionType.selectOption("navigate");
  await page.getByLabel("Navigate action href").fill("/contact");
  await expect(page.getByText("Production schema valid")).toBeVisible();
});

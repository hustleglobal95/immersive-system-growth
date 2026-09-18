import test from "node:test";
import assert from "node:assert/strict";
import { assetGenerationRequestSchema, preferredAssetProvider } from "../src/platform/assetGeneration";

test("asset generation chooses connected providers by production medium", () => {
  assert.equal(preferredAssetProvider("model"), "meshy");
  assert.equal(preferredAssetProvider("image"), "higgsfield-image");
  assert.equal(preferredAssetProvider("texture"), "higgsfield-image");
  assert.equal(preferredAssetProvider("ui"), "higgsfield-image");
  assert.equal(preferredAssetProvider("video"), "higgsfield-video");
  assert.equal(preferredAssetProvider("hdri"), null);
  assert.equal(preferredAssetProvider("audio"), null);
});

test("asset generation requests are bounded and explicit", () => {
  const parsed = assetGenerationRequestSchema.parse({
    action: "submit",
    name: "hero-product.glb",
    type: "model",
    prompt: "Create a clean premium hero product model with believable materials.",
  });
  assert.equal(parsed.type, "model");
  assert.throws(() => assetGenerationRequestSchema.parse({
    action: "submit",
    name: "",
    type: "model",
    prompt: "short",
  }));
});

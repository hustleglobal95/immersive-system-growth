import assert from "node:assert/strict";
import test from "node:test";
import { applyContentMappings, assertAllowedIntegrationUrl, getJsonPath } from "../src/platform/integrations";

test("content mappings update a cloned experience without mutating the source", () => {
  const target = { scenes: [{ copy: { headline: "Old" } }] };
  const result = applyContentMappings(target, { hero: { title: "New" } }, [
    { from: "$.hero.title", to: "$.scenes[0].copy.headline" },
  ]);
  assert.equal(result.scenes[0].copy.headline, "New");
  assert.equal(target.scenes[0].copy.headline, "Old");
  assert.equal(getJsonPath(result, "$.scenes[0].copy.headline"), "New");
});

test("integration endpoints require HTTPS and an explicit host allowlist", () => {
  assert.equal(assertAllowedIntegrationUrl("https://content.example.com/feed", ["example.com"]).hostname, "content.example.com");
  assert.throws(() => assertAllowedIntegrationUrl("http://example.com/feed", ["example.com"]), /HTTPS/);
  assert.throws(() => assertAllowedIntegrationUrl("https://attacker.test/feed", ["example.com"]), /not allowed/);
});

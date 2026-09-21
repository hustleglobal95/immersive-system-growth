import assert from "node:assert/strict";
import test from "node:test";
import {
  premiumFoundries,
  premiumLibraries,
  premiumSignatureFamilyCount,
  premiumTypeSources,
} from "../src/design/premiumTypeNetwork";

test("premium Type Vault network is broad and structurally valid", () => {
  assert.ok(premiumTypeSources.length >= 60, "premium source network should remain intentionally broad");
  assert.ok(premiumFoundries.length >= 55, "premium foundry coverage regressed");
  assert.ok(premiumLibraries.length >= 4, "major premium libraries should remain represented");
  assert.ok(premiumSignatureFamilyCount >= 150, "signature-family reference depth regressed");

  const ids = new Set<string>();
  for (const source of premiumTypeSources) {
    assert.ok(source.id.length > 1);
    assert.ok(!ids.has(source.id), `duplicate premium source id: ${source.id}`);
    ids.add(source.id);

    assert.match(source.url, /^https:\/\//);
    assert.ok(source.name.trim().length > 1);
    assert.ok(source.note.trim().length > 20);
    assert.ok(source.tags.length >= 3);
    assert.equal(source.verified, "2026-09-21");
  }
});

test("premium Type Vault preserves licensing separation", () => {
  for (const source of premiumTypeSources) {
    assert.notEqual(source.access, "" as never);
    assert.ok(["Subscription", "Retail", "Trial + retail", "Mixed"].includes(source.access));
  }
});

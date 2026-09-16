import assert from "node:assert/strict";
import test from "node:test";
import rawExperience from "../config/experience.json";
import rawProject from "../config/studio-project.json";
import rawManifest from "../config/asset-manifest.json";
import rawGraph from "../config/interaction-graph.json";
import { parseExperience } from "../src/lib/configSchema";
import { parseInteractionGraph } from "../src/lib/interactionGraph";
import { parseStudioProject } from "../src/platform/studioSchema";
import type { AssetManifest } from "../src/types/assets";
import {
  STUDIO_DRAFT_VERSION,
  StudioDraftIntegrityError,
  createStudioDraftEnvelope,
  fingerprintPayload,
  migrateLegacyStudioDraft,
  parseStudioDraftEnvelope,
  recoverStudioDraftRecords,
  studioDraftRecoveryMeta,
} from "../src/studio/studioDraftStorage";

const payload = {
  experience: parseExperience(rawExperience),
  project: parseStudioProject(rawProject),
  assetManifest: rawManifest as AssetManifest,
  interactionGraph: parseInteractionGraph(rawGraph),
};
const fallbacks = { assetManifest: payload.assetManifest, interactionGraph: payload.interactionGraph };

test("Studio draft envelope round-trips with deterministic full-draft integrity", () => {
  const envelope = createStudioDraftEnvelope(payload, {
    sessionId: "session-test",
    autosaveSequence: 12,
    experienceRevision: 7,
    savedAt: "2026-09-16T15:00:00.000Z",
  });
  assert.equal(envelope.version, STUDIO_DRAFT_VERSION);
  assert.equal(envelope.fingerprint, fingerprintPayload(payload));

  const parsed = parseStudioDraftEnvelope(JSON.parse(JSON.stringify(envelope)));
  assert.deepEqual(parsed.payload, payload);
  assert.equal(parsed.autosaveSequence, 12);
  assert.equal(parsed.experienceRevision, 7);
  assert.equal(parsed.fingerprint, envelope.fingerprint);
});

test("tampered Studio draft content fails integrity validation", () => {
  const envelope = createStudioDraftEnvelope(payload, {
    sessionId: "session-test",
    autosaveSequence: 2,
    experienceRevision: 1,
  });
  const tampered = structuredClone(envelope);
  tampered.payload.experience.scenes[0].label = "Tampered label";
  assert.throws(() => parseStudioDraftEnvelope(tampered), StudioDraftIntegrityError);
});

test("invalid Studio autosave and experience revisions fail closed", () => {
  const envelope = createStudioDraftEnvelope(payload, {
    sessionId: "session-test",
    autosaveSequence: 1,
    experienceRevision: 1,
  });
  assert.throws(() => parseStudioDraftEnvelope({ ...envelope, autosaveSequence: -1 }), /non-negative integer/);
  assert.throws(() => parseStudioDraftEnvelope({ ...envelope, experienceRevision: 1.25 }), /non-negative integer/);
});

test("legacy v2 raw draft shape migrates into the v3 recovery envelope", () => {
  const legacy = {
    experience: rawExperience,
    project: rawProject,
    assetManifest: rawManifest,
    interactionGraph: rawGraph,
  };
  const migrated = migrateLegacyStudioDraft(legacy, fallbacks, {
    sessionId: "legacy-upgrade",
    savedAt: "2026-09-16T15:30:00.000Z",
  });

  assert.equal(migrated.version, 3);
  assert.equal(migrated.sessionId, "legacy-upgrade");
  assert.equal(migrated.autosaveSequence, 0);
  assert.equal(migrated.experienceRevision, 0);
  assert.deepEqual(migrated.payload.experience, payload.experience);
  assert.equal(parseStudioDraftEnvelope(migrated).fingerprint, migrated.fingerprint);
});

test("legacy drafts can use canonical manifest and interaction fallbacks", () => {
  const legacy = { experience: rawExperience, project: rawProject };
  const migrated = migrateLegacyStudioDraft(legacy, fallbacks, { sessionId: "legacy-fallback" });

  assert.deepEqual(migrated.payload.assetManifest, payload.assetManifest);
  assert.deepEqual(migrated.payload.interactionGraph, payload.interactionGraph);
});

test("recovery selector prefers a valid primary record", () => {
  const primary = createStudioDraftEnvelope(payload, { sessionId: "primary", autosaveSequence: 5, experienceRevision: 3 });
  const backup = createStudioDraftEnvelope(payload, { sessionId: "backup", autosaveSequence: 4, experienceRevision: 2 });
  const selected = recoverStudioDraftRecords({
    primary: JSON.stringify(primary),
    backup: JSON.stringify(backup),
  }, fallbacks, { legacySessionId: "legacy" });

  assert.equal(selected.source, "primary");
  assert.equal(selected.envelope?.sessionId, "primary");
  assert.deepEqual(selected.invalidSlots, []);
});

test("recovery selector rejects a tampered primary and restores the valid backup", () => {
  const primary = createStudioDraftEnvelope(payload, { sessionId: "primary", autosaveSequence: 5, experienceRevision: 3 });
  primary.payload.experience.scenes[0].label = "Corrupt without fingerprint update";
  const backup = createStudioDraftEnvelope(payload, { sessionId: "backup", autosaveSequence: 4, experienceRevision: 2 });

  const selected = recoverStudioDraftRecords({
    primary: JSON.stringify(primary),
    backup: JSON.stringify(backup),
  }, fallbacks, { legacySessionId: "legacy" });

  assert.equal(selected.source, "backup");
  assert.equal(selected.envelope?.sessionId, "backup");
  assert.deepEqual(selected.invalidSlots, ["primary"]);
});

test("recovery selector falls through invalid v3 slots and migrates the legacy draft", () => {
  const legacy = JSON.stringify({ experience: rawExperience, project: rawProject });
  const selected = recoverStudioDraftRecords({
    primary: "{not-json",
    backup: JSON.stringify({ version: 3, broken: true }),
    legacy,
  }, fallbacks, {
    legacySessionId: "legacy-recovered",
    migratedAt: "2026-09-16T16:30:00.000Z",
  });

  assert.equal(selected.source, "legacy");
  assert.equal(selected.envelope?.sessionId, "legacy-recovered");
  assert.deepEqual(selected.invalidSlots, ["primary", "backup"]);
});

test("recovery selector returns fresh when every stored slot is unusable", () => {
  const selected = recoverStudioDraftRecords({
    primary: "bad",
    backup: "bad",
    legacy: "bad",
  }, fallbacks, { legacySessionId: "new" });

  assert.equal(selected.source, "fresh");
  assert.equal(selected.envelope, null);
  assert.deepEqual(selected.invalidSlots, ["primary", "backup", "legacy"]);
});

test("recovery metadata retains the origin that restored the session", () => {
  const envelope = createStudioDraftEnvelope(payload, {
    sessionId: "recovered-session",
    autosaveSequence: 20,
    experienceRevision: 11,
    savedAt: "2026-09-16T16:00:00.000Z",
  });
  const meta = studioDraftRecoveryMeta(envelope, "backup");
  assert.equal(meta.source, "backup");
  assert.equal(meta.autosaveSequence, 20);
  assert.equal(meta.experienceRevision, 11);
  assert.equal(meta.fingerprint, envelope.fingerprint);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intakeProfiles, requirementsFor, universalRequirements } from '../src/studio/assetIntakeCatalog';
import { buildClientRequestPack, createItemState, readiness, type IntakeItemState } from '../src/studio/assetReadiness';

test('asset intake covers a broad reference-gallery production taxonomy', () => {
  assert.ok(intakeProfiles.length >= 16);
  assert.ok(universalRequirements.length >= 8);
  for (const profile of intakeProfiles) {
    assert.ok(profile.items.length >= 4, profile.id);
    assert.ok(profile.outcome.length > 20, profile.id);
  }
});

test('requirements combine universal, archetype and capability modules without duplicate ids', () => {
  const requirements = requirementsFor('architecture-real-estate', ['module-3d','module-audio','module-live-data'], 'immersive');
  assert.ok(requirements.some((entry) => entry.id === 'arch-source'));
  assert.ok(requirements.some((entry) => entry.id === 'mod-3d-source'));
  assert.ok(requirements.some((entry) => entry.id === 'mod-audio-master'));
  assert.equal(new Set(requirements.map((entry) => entry.id)).size, requirements.length);
});

test('readiness keeps required received files as blockers until they are actually ready', () => {
  const requirements = requirementsFor('luxury-product', [], 'editorial');
  const states: Record<string, IntakeItemState> = Object.fromEntries(requirements.map((entry) => [entry.id, createItemState()]));
  states['brand-logo-system'] = { ...createItemState(), status: 'received' };
  states['product-cad'] = { ...createItemState(), status: 'ready' };
  const report = readiness(requirements, states);
  assert.ok(report.blockers.some((entry) => entry.id === 'brand-logo-system'));
  assert.ok(!report.blockers.some((entry) => entry.id === 'product-cad'));
  assert.ok(report.percent > 0 && report.percent < 100);
});

test('client request pack calls out missing required source and what it unlocks', () => {
  const requirements = requirementsFor('architecture-real-estate', ['module-3d'], 'immersive');
  const text = buildClientRequestPack('North Tower', 'Architecture / real estate', 'https://example.com/reference', requirements, {});
  assert.match(text, /North Tower/);
  assert.match(text, /Highest-fidelity architecture source/);
  assert.match(text, /Used for:/);
  assert.match(text, /reference quality/i);
});

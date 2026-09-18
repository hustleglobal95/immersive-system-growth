import {
  immersiveReferenceCorpus,
} from "../src/platform/director-intelligence/referenceCorpus.ts";
import {
  immersiveConstructionPatterns,
} from "../src/platform/director-intelligence/constructionKnowledge.ts";

const errors = [];
const ids = new Set();
const knownPatterns = new Set(immersiveConstructionPatterns.map((pattern) => pattern.id));

for (const reference of immersiveReferenceCorpus) {
  if (ids.has(reference.id)) errors.push(`Duplicate reference id: ${reference.id}`);
  ids.add(reference.id);

  if (reference.evidenceLevel === "catalog") {
    if (
      reference.observedTraits.length ||
      reference.transferableLessons.length ||
      reference.constructionPatternIds.length
    ) {
      errors.push(`Catalog-only reference ${reference.id} contains inferred lessons.`);
    }
  } else {
    if (!reference.observedTraits.length) errors.push(`Reviewed reference ${reference.id} has no observed traits.`);
    if (!reference.transferableLessons.length) errors.push(`Reviewed reference ${reference.id} has no transferable lessons.`);
    if (!reference.evidenceNotes.length) errors.push(`Reviewed reference ${reference.id} has no evidence notes.`);
  }

  for (const patternId of reference.constructionPatternIds) {
    if (!knownPatterns.has(patternId)) {
      errors.push(`Reference ${reference.id} points to unknown pattern ${patternId}.`);
    }
  }
}

const hostCounts = countBy(immersiveReferenceCorpus, (reference) => sourceHost(reference.source));
const evidenceCounts = countBy(immersiveReferenceCorpus, (reference) => reference.evidenceLevel);
const industryCounts = countBy(immersiveReferenceCorpus, (reference) => reference.industry);
const patternSupport = new Map();

for (const reference of immersiveReferenceCorpus) {
  for (const patternId of reference.constructionPatternIds) {
    const bucket = patternSupport.get(patternId) ?? { references: new Set(), hosts: new Set() };
    bucket.references.add(reference.id);
    bucket.hosts.add(sourceHost(reference.source));
    patternSupport.set(patternId, bucket);
  }
}

const underSupported = immersiveConstructionPatterns
  .map((pattern) => {
    const support = patternSupport.get(pattern.id);
    return {
      id: pattern.id,
      references: support?.references.size ?? 0,
      hosts: support?.hosts.size ?? 0,
    };
  })
  .filter((item) => item.references < 2 || item.hosts < 2)
  .sort((a, b) => a.references - b.references || a.id.localeCompare(b.id));

console.log("Forge immersive reference corpus audit");
console.log(`references: ${immersiveReferenceCorpus.length}`);
console.log(`construction patterns: ${immersiveConstructionPatterns.length}`);
console.log("\nevidence levels:");
printCounts(evidenceCounts);
console.log("\nsource hosts:");
printCounts(hostCounts);
console.log("\nindustries:");
printCounts(industryCounts);

console.log("\npatterns needing more independent support:");
if (!underSupported.length) console.log("- none");
for (const item of underSupported) {
  console.log(`- ${item.id}: ${item.references} references / ${item.hosts} source hosts`);
}

if (immersiveReferenceCorpus.length < 144) {
  errors.push(`Expected at least 144 references; found ${immersiveReferenceCorpus.length}.`);
}
if (immersiveConstructionPatterns.length < 81) {
  errors.push(`Expected at least 81 construction patterns; found ${immersiveConstructionPatterns.length}.`);
}

if (errors.length) {
  console.error("\nReference corpus audit failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("\nReference corpus audit passed.");

function countBy(items, selector) {
  const counts = new Map();
  for (const item of items) {
    const key = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function printCounts(counts) {
  for (const [label, count] of [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))) {
    console.log(`- ${label}: ${count}`);
  }
}

function sourceHost(source) {
  try {
    return new URL(source).hostname.replace(/^www\./, "");
  } catch {
    return source;
  }
}

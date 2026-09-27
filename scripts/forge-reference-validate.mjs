import { loadReferenceAnalyses, parseDelimitedList } from "./lib/reference-intelligence.mjs";

const options=Object.fromEntries(process.argv.slice(2)
  .filter((arg)=>arg.startsWith("--")&&arg.includes("="))
  .map((arg)=>arg.slice(2).split(/=(.*)/s,2)));
const analyses=parseDelimitedList(options.analysis||options["reference-analysis"]);
const urls=parseDelimitedList(options.url||options["reference-url"]);
if(!analyses.length){
  console.error("Usage: npm run forge:reference:validate -- --analysis=<file[;file]> [--url=<reference-url[;url]>]");
  process.exit(2);
}
const rows=await loadReferenceAnalyses(analyses,urls);
console.log("Forge reference intelligence VALID");
for(const row of rows){
  console.log("- "+row.analysis.reference.name);
  console.log("  URL: "+row.analysis.reference.url);
  console.log("  confidence: "+row.analysis.confidence.toFixed(2));
  console.log("  evidence artifacts: "+row.analysis.evidence.sources.filter((source)=>source.sha256).length);
  console.log("  observed categories: "+Object.values(row.analysis.observedFacts).filter((items)=>items.length).length);
  console.log("  transferable lessons: "+row.analysis.transferableLessons.length);
}

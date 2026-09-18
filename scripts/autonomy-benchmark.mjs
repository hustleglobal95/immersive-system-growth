import { runAutonomyBenchmark } from "../src/platform/autonomy/autonomyBenchmark.ts";

const report = runAutonomyBenchmark();
console.log("Forge Autonomy Bench v" + report.version);
console.log(report.passed + "/" + report.total + " passed (" + report.score + "%)");
for (const result of report.results.filter((item) => !item.passed)) {
  console.error("- " + result.id + ": " + result.failures.join(" "));
}
if (report.score < 90) process.exit(1);

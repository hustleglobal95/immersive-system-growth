import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const lockPath = 'config/project-integrity-lock.json';
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

function gitObject(path) {
  try {
    return execFileSync('git', ['rev-parse', `HEAD:${path}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const stderr = error?.stderr?.toString?.().trim();
    throw new Error(`Unable to resolve protected path ${path}${stderr ? `: ${stderr}` : ''}`);
  }
}

const failures = [];
let protectedPathCount = 0;

for (const [projectId, project] of Object.entries(lock.projects ?? {})) {
  for (const [path, expected] of Object.entries(project.paths ?? {})) {
    protectedPathCount += 1;
    const actual = gitObject(path);
    if (actual !== expected) {
      failures.push({ projectId, path, expected, actual });
    }
  }
}

if (failures.length) {
  console.error('Project integrity audit failed. Protected creative work changed without an updated integrity lock.');
  for (const failure of failures) {
    console.error(`- ${failure.projectId}: ${failure.path}`);
    console.error(`  expected ${failure.expected}`);
    console.error(`  actual   ${failure.actual}`);
  }
  console.error('\nPreview/show/deploy tasks must never update protected project files or this lock.');
  console.error('Only update config/project-integrity-lock.json during an explicit creative-change task after reviewing the project diff.');
  process.exit(1);
}

console.log(`Project integrity valid: ${protectedPathCount} protected paths across ${Object.keys(lock.projects ?? {}).length} project(s).`);

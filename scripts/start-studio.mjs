/** Local-only launcher. Installs the lockfile dependencies, preserves other servers,
 * and opens the Studio only after this child process is serving its health route. */
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error('Forge Studio needs Node.js 22.13 or newer. Install Node, then run this launcher again.');
  process.exit(1);
}
const windows = process.platform === 'win32';
const npm = windows ? 'npm.cmd' : 'npm';
function npmTask(args) {
  return spawn(npm, args, { cwd: root, stdio: 'inherit', shell: windows });
}
async function freePort(port) {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
  });
}
try {
  await access(path.join(root, 'node_modules', 'next', 'package.json'));
} catch {
  console.log('Preparing the dependencies pinned by this project...');
  const install = npmTask(['ci']);
  const code = await new Promise((resolve, reject) => { install.once('error', reject); install.once('exit', resolve); });
  if (code !== 0) process.exit(typeof code === 'number' ? code : 1);
}
let port = 3000;
while (port < 3011 && !(await freePort(port))) port++;
if (port === 3011) {
  console.error('Ports 3000 through 3010 are in use. Stop an unused server, then launch again. No existing servers were stopped.');
  process.exit(1);
}
const url = `http://127.0.0.1:${port}/studio`;
console.log(`\nForge Studio: ${url}\nKeep this terminal open. Press Ctrl+C to stop this server.\n`);
const server = npmTask(['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(port)]);
let stopped = false;
server.once('error', error => { stopped = true; console.error(error.message); process.exitCode = 1; });
server.once('exit', code => { stopped = true; process.exitCode = code ?? 0; });
for (let attempt = 0; attempt < 120 && !stopped; attempt++) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1000) });
    if (response.ok) {
      const command = process.platform === 'darwin' ? 'open' : windows ? 'cmd.exe' : 'xdg-open';
      const args = windows ? ['/c', 'start', '', url] : [url];
      const opener = spawn(command, args, { stdio: 'ignore', detached: true });
      opener.on('error', () => console.log(`Open this address in your browser: ${url}`));
      opener.unref();
      break;
    }
  } catch { /* The development server is still starting. */ }
  await new Promise(resolve => setTimeout(resolve, 1000));
}

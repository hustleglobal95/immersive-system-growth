// HELIOT is a prerendered, client-interactive route with no server actions or API calls.
// Package its actual Next build HTML and hashed assets for static hosting.
import fs from 'node:fs';
const output = 'out';
const source = '.next/server/app/heliot.html';
if (!fs.existsSync(source)) throw new Error('Run npm run build before exporting HELIOT.');
fs.mkdirSync(`${output}/heliot`, { recursive: true });
fs.copyFileSync(source, `${output}/heliot/index.html`);
fs.cpSync('.next/static', `${output}/_next/static`, { recursive: true });
fs.cpSync('public/models/heliot', `${output}/models/heliot`, { recursive: true });
fs.cpSync('public/decoders', `${output}/decoders`, { recursive: true });
fs.writeFileSync(`${output}/index.html`, '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>HELIOT — The Anatomy of Light</title><meta http-equiv="refresh" content="0;url=/heliot"></head><body style="background:#151719;color:#e8e4dc;font:20px sans-serif;padding:10vw"><a style="color:inherit" href="/heliot">Enter HELIOT — The Anatomy of Light</a></body></html>');
console.log(`Exported ${output}: / redirects to /heliot; the original app and Studio are not exposed.`);

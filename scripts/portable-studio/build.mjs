import { build } from 'esbuild';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd(), output = process.argv[2] || 'dist/forge-studio-portable.html';
const assets = {};
async function walk(directory) {
  for (const item of await readdir(directory,{withFileTypes:true})) {
    const file=path.join(directory,item.name);
    if(item.isDirectory()) { if(item.name !== 'fonts') await walk(file); }
    else if (/\.(glb|png|jpg|webp|hdr|svg|wasm|js)$/.test(item.name)) {
      assets['/'+path.relative(path.join(root,'public'),file).replaceAll('\\','/')]=(await readFile(file)).toString('base64');
    }
  }
}
await walk(path.join(root,'public'));
const result=await build({entryPoints:['scripts/portable-studio/entry.tsx'],bundle:true,write:false,minify:true,format:'iife',target:'es2022',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},alias:{'@':root,'next/dynamic':path.join(root,'scripts/portable-studio/dynamic.tsx')},loader:{'.woff2':'empty','.woff':'empty'},logLevel:'warning'});
const css=(await Promise.all(['studio.css','workspace.css','builder.css','studio-pro.css'].map(f=>readFile(path.join(root,'app/studio',f),'utf8')))).join('\n');
// Offline assets are served from this document, never through a proxy or a network bypass.
const host=await readFile('scripts/portable-studio/host.js','utf8');
const html='<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><title>Forge Studio - Portable Scene Editor</title><style>html,body{margin:0;background:#101214}*{box-sizing:border-box}'+css+'</style></head><body><div id="root"></div><script>window.__FORGE_EMBEDDED__='+JSON.stringify(assets)+';</script><script>'+host.replaceAll('</script','<\\/script')+'</script><script>'+result.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script></body></html>';
await mkdir(path.dirname(output),{recursive:true}); await writeFile(output,html); console.log(`Portable editor: ${output} (${Math.round(Buffer.byteLength(html)/1024)} KB); ${Object.keys(assets).length} embedded assets. No font files embedded.`);

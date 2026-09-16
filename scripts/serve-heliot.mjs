// Local verification server for the exact static deployment output.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('out');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.woff2':'font/woff2','.wasm':'application/wasm','.json':'application/json'};
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/health'){res.end('ok');return;}
  let file=path.resolve(root,`.${decodeURIComponent(url.pathname)}`);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(3000,'127.0.0.1');

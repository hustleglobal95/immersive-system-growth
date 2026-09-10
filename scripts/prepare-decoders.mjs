import fs from "node:fs";
import path from "node:path";
const source = "node_modules/three/examples/jsm/libs";
for (const [dir, files] of [
  ["draco", ["draco_decoder.wasm", "draco_wasm_wrapper.js"]],
  ["basis", ["basis_transcoder.js", "basis_transcoder.wasm"]],
]) {
  fs.mkdirSync(`public/decoders/${dir}`, { recursive: true });
  for (const file of files)
    fs.copyFileSync(
      path.join(source, dir, dir === "draco" ? "gltf" : "", file),
      `public/decoders/${dir}/${file}`,
    );
}
console.log("Prepared local decoders from locked Three version.");

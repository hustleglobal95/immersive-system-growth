import fs from "node:fs";
const data=JSON.parse(fs.readFileSync("config/creative-recipes.json","utf8"));
const expected=["burger-showcase","real-estate","restaurant","automotive","product","saas"];
for(const id of expected){const r=data.recipes[id];if(!r||r.arc.length<3||!r.concept||!r.anchor||!r.cta) throw new Error(`incomplete creative recipe: ${id}`);}
console.log(`CREATIVE RECIPES VALID: ${expected.length} packages`);

// Reproducible original optical instrument. No external assets or services.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result=result; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }
};
const output = 'public/models/heliot';
fs.mkdirSync(output,{recursive:true});
fs.mkdirSync('src/experiences/heliot',{recursive:true});
const nodes=['Mount','Housing','FocusRing','FrontCrown','FrontGlass','Doublet','RearGlass','Iris'];
function model(segments) {
  const root=new T.Group();root.name='HELIOT_01';
  const graphite=new T.MeshStandardMaterial({name:'Patinated bronze shell',color:'#51473a',metalness:.8,roughness:.42});
  const titanium=new T.MeshStandardMaterial({name:'Machined bronze edge',color:'#987347',metalness:.84,roughness:.34});
  const black=new T.MeshStandardMaterial({name:'Internal light baffle',color:'#060a0b',metalness:.45,roughness:.37});
  const white=new T.MeshStandardMaterial({name:'Engraved scale',color:'#d9d4c7',metalness:.3,roughness:.55});
  function part(name,z){const g=new T.Group();g.name=name;g.position.z=z;root.add(g);return g;}
  function ring(parent,outer,inner,depth,z,material){
    const bevel=.025;
    const points=[[inner,-depth/2],[outer-bevel,-depth/2],[outer,-depth/2+bevel],[outer,depth/2-bevel],[outer-bevel,depth/2],[inner,depth/2],[inner,-depth/2]].map(([x,y])=>new T.Vector2(x,y));
    const mesh=new T.Mesh(new T.LatheGeometry(points,segments),material);mesh.rotation.x=Math.PI/2;mesh.position.z=z;parent.add(mesh);return mesh;
  }
  function repeated(parent,count,radius,z,w,h,d,material){
    const geometries=[];
    for(let i=0;i<count;i++){const a=i/count*Math.PI*2;const g=new T.BoxGeometry(w,h,d);g.rotateZ(a);g.translate(Math.sin(-a)*radius,Math.cos(a)*radius,z);geometries.push(g);}
    parent.add(new T.Mesh(mergeGeometries(geometries),material));geometries.forEach(g=>g.dispose());
  }
  const mount=part('Mount',-.48);ring(mount,1.18,.95,.11,0,graphite);repeated(mount,32,1.09,0,.035,.09,.14,titanium);
  const body=part('Housing',0);ring(body,1.2,1.07,.82,0,graphite);ring(body,1.205,1.04,.035,-.42,titanium);ring(body,1.205,1.04,.035,.42,titanium);
  const focus=part('FocusRing',0);repeated(focus,Math.min(segments,96),.99,0,.012,.24,.8,titanium);
  const front=part('FrontCrown',.47);ring(front,1.2,.91,.09,0,graphite);ring(front,1.2,1.17,.012,.05,titanium);repeated(front,72,1.14,.054,.008,.03,.003,white);
  const dot=new T.Mesh(new T.SphereGeometry(.037,12,8),new T.MeshStandardMaterial({color:'#ef5536',roughness:.35}));dot.position.set(0,1.18,.23);front.add(dot);
  function optic(name,z,r){const g=part(name,z);ring(g,r+.035,r-.02,.06,0,titanium);repeated(g,24,r,0,.012,.055,.08,black);return g;}
  optic('FrontGlass',.36,.9);optic('Doublet',0,.89);optic('RearGlass',-.36,.9);
  const iris=part('Iris',-.18);ring(iris,.91,.86,.035,0,black);
  // The moving diaphragm is rendered by the light-lab system; structural GLB nodes remain immutable.
  root.updateMatrixWorld(true);return root;
}
const manifest=[];
for(const [name,segments] of [['heliot-01',128],['heliot-01-low',48]]){
  const buffer=await new GLTFExporter().parseAsync(model(segments),{binary:true});
  const file=path.join(output,`${name}.glb`);fs.writeFileSync(file,Buffer.from(buffer));
  manifest.push({path:`/models/heliot/${name}.glb`,bytes:buffer.byteLength,sha256:crypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex')});
}
const shots=[
  [[5,2.2,8],[-1.6,.7,-1],43],[[-2,1.2,3],[0,0,-.5],48],[[0,0,-1.4],[0,.2,-5],58],[[0,.3,-4],[0,0,-8],50],[[5,2,-3],[0,0,-8],45],[[0,.6,-3],[0,0,-8],43],[[0,.6,-2],[0,0,-8],43],[[3,1,-3],[0,0,-8],46],[[0,.3,3],[0,0,-2],52],[[-5,4,7],[0,0,-1],46],[[4,2.6,6],[0,-.2,0],43],
];
for(let i=3;i<=7;i++){shots[i][0][1]-=5.5;shots[i][0][2]-=8;shots[i][1]=[-.65,-5.05,-16];}
shots[2][1]=[0,-3,-7];
const acts=[
  ['first-light','The observatory','dolly','A FIELD STUDY IN LIGHT / NO. 001','Observatory\nfor the unseen.','At the edge of the familiar, a place to see differently. An imagined architecture shaped by a single element: light.'],
  ['form','Cross the threshold','subject-orbit','01 / THE THRESHOLD','Space begins\nwith an opening.','An annulus in a volcanic landscape. A frame for the horizon. Step through, and the immense becomes intimate.'],
  ['surface','Inside the observatory','dolly','02 / THE INNER WORLD','You are\ninside the light.','Beyond the bronze threshold, a vaulted gallery opens beneath the landscape. Follow the floor inlay toward the suspended optical assembly.'],
  ['separation','Under the surface','pullback','03 / STRUCTURAL ANATOMY','An architecture\nof relationships.','Eight systems. One shared axis. Follow the shell, the radial field and the diaphragm as the observatory opens itself to inspection.'],
  ['optical-path','Trace the invisible','arc','04 / THE OPTICAL SECTION','Follow\nthe invisible.','Incident light crosses the radial field and meets a controlled opening. The section turns a spatial idea into a readable path.'],
  ['aperture','The light laboratory','subject-orbit','05 / INTERACTIVE LIGHT LAB','Less opening.\nMore intention.', 'Move the aperture. Watch the diaphragm and beam respond. The area of the opening determines the relative light admitted.'],
  ['perspective','Material / perspective','arc','06 / YOUR OBSERVATORY','A different\npoint of view.','Turn the architectural maquette. Compare its two material studies. The structure stays constant; its response to light changes.'],
  ['convergence','Return to the field','subject-orbit','07 / FROM OBJECT TO LANDSCAPE','Nothing exists\nin isolation.','The parts return to their original positions. The observatory belongs to a larger field: terrain, horizon, and the movement of a distant sun.'],
  ['signature','The eclipse','crane','08 / AN INTERVAL OF STILLNESS','Between\nlight & shadow.','For a moment, the frame becomes the subject. Then the world beyond it returns.'],
  ['keep-light','Your field study','linear','09 / THE FIELD ARCHIVE','Take a little\nlight with you.','Keep your material and aperture study as a designed field sheet. A record of the way you chose to see.'],
];
const c=(shot,mobile=false)=>{let target=shot[1];if(mobile){const i=shots.indexOf(shot);if(shot[1][2]===-16)target=[0,-6.3,-16];else if(i===0)target=[0,-2,-1];else if(i>=8)target=[0,-1.8,shot[1][2]];}return{position:shot[0],target,fov:mobile?Math.min(72,shot[2]+18):shot[2]};};
const identity={position:[0,-5.05,-16],rotation:[0,0,0],scale:1};
const config={meta:{name:'HELIOT / Observatory for the unseen',description:'An imagined light observatory. Move from landscape and bronze to an architectural maquette, a live aperture laboratory, and a personal field study.',themeColor:'#151719',backgroundColor:'#151719'},runtime:{sceneHeightVh:125,cameraDamping:9,objectDamping:9,pointerInfluence:.06,minDpr:.75,maxDpr:1.5,maxPixels:2200000,preloadMb:8},heroModel:'/models/heliot/heliot-01.glb',heroLowModel:'/models/heliot/heliot-01-low.glb',heroVisible:true,stage:'minimal',assets:[],hotspots:[],productRig:{nodes,tracks:nodes.map((node,i)=>({node,property:'position',mode:'offset',keyframes:[{at:0,value:[0,0,0],easing:'cinematic'},{at:.29,value:[0,0,0],easing:'cinematic'},{at:.43,value:[0,0,[-1.9,-1.1,-.5,2,2.5,.7,-1.5,0][i]],easing:'cinematic'},{at:.46,value:[0,0,[-1.9,-1.1,-.5,2,2.5,.7,-1.5,0][i]],easing:'cinematic'},{at:.50,value:[0,0,0],easing:'cinematic'},{at:1,value:[0,0,0],easing:'cinematic'}]}))},scenes:acts.map((a,i)=>({id:a[0],label:a[1],range:[i/10,(i+1)/10],easing:'cinematic',camera:{path:a[2],from:c(shots[i]),to:c(shots[i+1])},mobileCamera:{path:a[2],from:c(shots[i],true),to:c(shots[i+1],true)},hero:{motion:'linear',from:identity,to:identity},world:{background:'#151719',fog:'#151719',fogDensity:0,ambient:i<2||i>7?.65:.28,key:i<2||i>7?4:1.5,rim:6,keyColor:'#ffe1a2',rimColor:'#d4a16a',exposure:1.05},material:{tint:'#ffffff',tintStrength:0,metalness:null,roughness:null,clearcoat:null},post:{bloom:0,vignette:.15},motionTracks:[],blocks:[],copy:{eyebrow:a[3],headline:a[4],body:a[5],align:'left'}}))};
const flightWaypoints={0:[[2.5,2.5,5],[-.2,1.5,3.8]],1:[[-.65,.4,1.6],[0,.05,.55],[0,0,-.5]],2:[[0,-1.5,-4],[0,-3.5,-6],[0,-5.2,-9.5]],7:[[0,-5.2,-10],[0,-3.5,-6],[0,-1.5,-4],[0,0,-1.4],[0,.05,.6]],8:[[-1,1.2,4],[-3,3,5]]};
for(const [index,points] of Object.entries(flightWaypoints)){for(const viewport of ['camera','mobileCamera'])config.scenes[Number(index)][viewport].waypoints=points;}
config.scenes[1].camera.path=config.scenes[1].mobileCamera.path='threshold';
config.scenes[2].camera.path=config.scenes[2].mobileCamera.path='dolly';
fs.writeFileSync('src/experiences/heliot/experience.json',JSON.stringify(config,null,2)+'\n');
fs.writeFileSync('src/experiences/heliot/experience.json',JSON.stringify(config,null,2)+'\n');
const textures=['observatory-landscape.webp','observatory-macro.webp','basalt.webp','distant-landscape.webp'].filter(name=>fs.existsSync(path.join(output,name))).map(name=>{const data=fs.readFileSync(path.join(output,name));return {path:`/models/heliot/${name}`,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex'),source:'Original generated architectural art; see docs/HELIOT_ART_DIRECTION.md'};});
fs.writeFileSync('src/experiences/heliot/asset-manifest.json',JSON.stringify({models:manifest,textures,hdr:[],video:[],budgets:{modelMb:12,textureMb:5,hdrMb:12,videoMb:20,totalMb:20}},null,2)+'\n');
console.log(manifest);

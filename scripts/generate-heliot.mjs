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
  const graphite=new T.MeshStandardMaterial({name:'Obsidian anodized aluminum',color:'#313438',metalness:.85,roughness:.29});
  const rubber=new T.MeshStandardMaterial({name:'Fine cut focus grip',color:'#111415',metalness:.2,roughness:.66});
  const titanium=new T.MeshStandardMaterial({name:'Brushed titanium',color:'#c0ad90',metalness:.92,roughness:.24});
  const black=new T.MeshStandardMaterial({name:'Internal light baffle',color:'#060a0b',metalness:.45,roughness:.37});
  const glass=new T.MeshPhysicalMaterial({name:'Petrol optical coating',color:'#173d43',metalness:.62,roughness:.085,clearcoat:1,clearcoatRoughness:.06,iridescence:.7,iridescenceIOR:1.3});
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
  const mount=part('Mount',-1.22);ring(mount,.91,.68,.22,0,titanium);ring(mount,.8,.63,.2,-.15,black);repeated(mount,8,.8,-.12,.07,.04,.08,graphite);
  const body=part('Housing',-.45);ring(body,1.02,.84,1.26,0,graphite);ring(body,1.06,.84,.08,-.5,titanium);ring(body,1.075,.85,.065,.38,titanium);
  for(let i=0;i<7;i++)ring(body,.89,.79,.02,-.45+i*.13,black);
  const focus=part('FocusRing',.2);ring(focus,1.105,.92,.56,0,rubber);repeated(focus,segments,1.107,0,.018,.023,.49,graphite);ring(focus,1.117,1.02,.042,.29,titanium);ring(focus,1.117,1.02,.042,-.29,graphite);
  const front=part('FrontCrown',.94);ring(front,1.19,.96,.57,0,graphite);ring(front,1.2,.97,.045,.29,titanium);ring(front,1.08,.91,.10,.25,black);repeated(front,72,1.16,.318,.012,.032,.006,white);
  const dot=new T.Mesh(new T.SphereGeometry(.037,12,8),new T.MeshStandardMaterial({color:'#ef5536',roughness:.35}));dot.position.set(0,1.18,.23);front.add(dot);
  function optic(name,z,r){const g=part(name,z);ring(g,r+.047,r-.025,.08,0,titanium);const mesh=new T.Mesh(new T.SphereGeometry(r,segments,segments/2),glass);mesh.scale.z=.075;g.add(mesh);return g;}
  optic('FrontGlass',1.14,.94);optic('Doublet',-.05,.79);optic('RearGlass',-.97,.63);
  const iris=part('Iris',-.6);ring(iris,.82,.43,.045,0,black);
  for(let i=0;i<9;i++){const shape=new T.Shape();shape.moveTo(.35,-.15);shape.lineTo(.76,-.3);shape.quadraticCurveTo(.87,.3,.44,.36);shape.lineTo(.35,-.15);const blade=new T.Mesh(new T.ShapeGeometry(shape),i%2?graphite:black);blade.rotation.z=i/9*Math.PI*2;blade.position.z=.02+i*.001;blade.name=`Blade_${i+1}`;iris.add(blade);}
  root.updateMatrixWorld(true);return root;
}
const manifest=[];
for(const [name,segments] of [['heliot-01',128],['heliot-01-low',48]]){
  const buffer=await new GLTFExporter().parseAsync(model(segments),{binary:true});
  const file=path.join(output,`${name}.glb`);fs.writeFileSync(file,Buffer.from(buffer));
  manifest.push({path:`/models/heliot/${name}.glb`,bytes:buffer.byteLength,sha256:crypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex')});
}
const shots=[
  [[4.2,2.2,7.2],[-1.5,0,0],38],[[4,1.8,7],[-.7,0,0],38],[[-4,2.4,7],[-1.2,0,0],40],[[-2.5,1,4.8],[-1,0,.2],38],[[6,3,8],[-2.3,0,0],44],[[7,2,5],[-2.3,0,0],45],[[0,.8,9],[-.6,0,0],38],[[3,1.6,8],[-.6,0,0],38],[[-5,3,7],[0,0,0],42],[[4,2,9],[-.8,0,0],38],[[4,2,9],[-.8,0,0],38],
];
const acts=[
  ['first-light','First light','dolly','THE ANATOMY OF LIGHT','Light.\nHeld still.','An instrument for looking closer. A study in glass, metal, and the space between.'],
  ['form','The instrument','subject-orbit','01 / FORM','Less object.\nMore intention.','Every radius has a reason. Every surface is shaped around the path of light.'],
  ['surface','Material study','dolly','02 / SURFACE','Precision you\ncan feel.','Fine-cut aluminum. A titanium index. A focus ring made for the slow, deliberate turn.'],
  ['separation','Anatomy','pullback','03 / ANATOMY','Nothing hidden.\nNothing extra.','Move beyond the surface. The optical groups separate along one continuous axis.'],
  ['optical-path','Optical path','arc','04 / TRANSMISSION','A path through\nthe invisible.','Glass bends the incoming field toward a shared plane. Explore the principle behind the picture.'],
  ['aperture','Aperture study','subject-orbit','05 / APERTURE','Shape the\nlight.', 'A smaller opening narrows the light cone. Change the aperture to explore relative light gathering.'],
  ['perspective','Your perspective','arc','06 / INSPECTION','Make it\nyour own.','Turn the instrument. Choose its finish. Find the angle that feels like you.'],
  ['convergence','Convergence','subject-orbit','07 / CONVERGENCE','Many parts.\nOne vision.','The assembly returns to its starting geometry. Precision is the relationship between every part.'],
  ['signature','Edition 01','crane','08 / SIGNATURE','A different\npoint of view.','HELIOT 01. An original optical concept, made to celebrate the act of seeing.'],
  ['keep-light','Keep the light','linear','09 / YOUR EDITION','Keep the\nlight.','Save your chosen finish and aperture as a configuration file. Or return to the first frame.'],
];
const c=(shot,mobile=false)=>({position:mobile?shot[0].map((v,i)=>i===1?v+.8:v*1.18):shot[0],target:mobile?[0,-1.75,0]:shot[1],fov:mobile?48:shot[2]});
const identity={position:[0,0,0],rotation:[0,0,0],scale:1};
const config={meta:{name:'HELIOT / The Anatomy of Light',description:'A ten-act interactive study of an original precision optical instrument. Scroll to direct the film. Inspect, separate and reassemble the anatomy of light.',themeColor:'#151719',backgroundColor:'#151719'},runtime:{sceneHeightVh:125,cameraDamping:9,objectDamping:9,pointerInfluence:.06,minDpr:1,maxDpr:1.75,maxPixels:3600000,preloadMb:8},heroModel:'/models/heliot/heliot-01.glb',heroLowModel:'/models/heliot/heliot-01-low.glb',heroVisible:true,stage:'minimal',assets:[],hotspots:[],productRig:{nodes,tracks:nodes.map((node,i)=>({node,property:'position',mode:'offset',keyframes:[{at:0,value:[0,0,0],easing:'cinematic'},{at:.29,value:[0,0,0],easing:'cinematic'},{at:.43,value:[0,0,[-1.9,-1.1,-.5,2,2.5,.7,-1.5,0][i]],easing:'cinematic'},{at:.53,value:[0,0,[-1.9,-1.1,-.5,2,2.5,.7,-1.5,0][i]],easing:'cinematic'},{at:.65,value:[0,0,0],easing:'cinematic'},{at:1,value:[0,0,0],easing:'cinematic'}]}))},scenes:acts.map((a,i)=>({id:a[0],label:a[1],range:[i/10,(i+1)/10],easing:'cinematic',camera:{path:a[2],from:c(shots[i]),to:c(shots[i+1])},mobileCamera:{path:a[2],from:c(shots[i],true),to:c(shots[i+1],true)},hero:{motion:'linear',from:identity,to:identity},world:{background:'#151719',fog:'#151719',fogDensity:0,ambient:.5,key:i===0?3.6:4.4,rim:9,keyColor:'#fff1db',rimColor:'#a3c9cd',exposure:1.05},material:{tint:'#ffffff',tintStrength:0,metalness:null,roughness:null,clearcoat:null},post:{bloom:0,vignette:.15},motionTracks:[],blocks:[],copy:{eyebrow:a[3],headline:a[4],body:a[5],align:'left'}}))};
fs.writeFileSync('src/experiences/heliot/experience.json',JSON.stringify(config,null,2)+'\n');
fs.writeFileSync('src/experiences/heliot/asset-manifest.json',JSON.stringify({models:manifest,textures:[],hdr:[],video:[],budgets:{modelMb:12,textureMb:5,hdrMb:12,videoMb:20,totalMb:20}},null,2)+'\n');
console.log(manifest);

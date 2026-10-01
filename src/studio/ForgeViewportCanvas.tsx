"use client";

import { Suspense, useLayoutEffect, useRef, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls, Text, TransformControls } from "@react-three/drei";
import type { Group } from "three";
import { GLTFModel } from "@/src/components/three/GLTFModel";
import type { ExperienceConfig, SceneAsset, Vec3 } from "@/src/types/experience";

export type ForgeCanvasSelection =
  | { kind:"section"; id:string }
  | { kind:"hero"; id:"hero" }
  | { kind:"asset"; id:string }
  | { kind:"text"; id:"headline" };

export type ForgeTransformMode="translate"|"rotate"|"scale";

export interface ForgeNodeTransform {
  position:Vec3;
  rotation:Vec3;
  scale:Vec3;
}

export function ForgeViewportCanvas({
  experience,
  activeSection,
  selection,
  transformMode,
  headlineTransform,
  onSelect,
  onHeroTransform,
  onAssetTransform,
  onHeadlineTransform,
  onTransformBegin,
  onTransformEnd,
}:{
  experience:ExperienceConfig;
  activeSection:number;
  selection:ForgeCanvasSelection;
  transformMode:ForgeTransformMode;
  headlineTransform:ForgeNodeTransform;
  onSelect:(selection:ForgeCanvasSelection)=>void;
  onHeroTransform:(transform:ForgeNodeTransform)=>void;
  onAssetTransform:(assetId:string,transform:ForgeNodeTransform)=>void;
  onHeadlineTransform:(transform:ForgeNodeTransform)=>void;
  onTransformBegin:()=>void;
  onTransformEnd:()=>void;
}){
  const section=experience.scenes[Math.min(activeSection,experience.scenes.length-1)];
  const assets=experience.assets.filter((asset)=>asset.persist || !asset.scenes || asset.scenes.includes(section.id));
  const hero=section.hero.from;
  const camera=section.camera.from;

  return <div className="forge-viewport-canvas" data-section={section.id}>
    <Canvas
      key={section.id}
      camera={{position:camera.position,fov:camera.fov,near:.05,far:160}}
      dpr={[1,1.5]}
      gl={{antialias:true,alpha:false,powerPreference:"high-performance"}}
      onPointerMissed={()=>onSelect({kind:"section",id:section.id})}
    >
      <color attach="background" args={["#09090b"]}/>
      <ambientLight intensity={.8}/>
      <directionalLight position={[10,10,5]} intensity={1.5}/>
      <directionalLight position={[-6,4,-5]} intensity={.45}/>

      <Grid
        infiniteGrid
        position={[0,-1.25,0]}
        cellSize={1}
        cellThickness={.8}
        cellColor="#27272a"
        sectionSize={5}
        sectionThickness={1.2}
        sectionColor="#3f3f46"
        fadeDistance={30}
        fadeStrength={1}
      />

      <OrbitControls
        makeDefault
        target={camera.target}
        enableDamping
        dampingFactor={.05}
        minDistance={1}
        maxDistance={80}
      />

      <Suspense fallback={null}>
        {experience.heroVisible&&<EditableNode
          selection={{kind:"hero",id:"hero"}}
          selected={selection.kind==="hero"}
          mode={transformMode}
          transform={{position:hero.position,rotation:hero.rotation,scale:[hero.scale,hero.scale,hero.scale]}}
          onSelect={onSelect}
          onChange={onHeroTransform}
          onBegin={onTransformBegin}
          onEnd={onTransformEnd}
        >
          {experience.heroModel
            ? <GLTFModel url={experience.heroModel}/>
            : <mesh castShadow receiveShadow>
                <torusKnotGeometry args={[.78,.2,96,16]}/>
                <meshStandardMaterial color="#8d83ff" metalness={.65} roughness={.2}/>
              </mesh>}
        </EditableNode>}

        {assets.map((asset)=><EditableAsset
          key={asset.id}
          asset={asset}
          selected={selection.kind==="asset"&&selection.id===asset.id}
          mode={transformMode}
          onSelect={onSelect}
          onChange={(transform)=>onAssetTransform(asset.id,transform)}
          onBegin={onTransformBegin}
          onEnd={onTransformEnd}
        />)}

        <EditableNode
          selection={{kind:"text",id:"headline"}}
          selected={selection.kind==="text"}
          mode={transformMode}
          transform={headlineTransform}
          onSelect={onSelect}
          onChange={onHeadlineTransform}
          onBegin={onTransformBegin}
          onEnd={onTransformEnd}
        >
          <Text
            fontSize={.58}
            maxWidth={7}
            color={selection.kind==="text"?"#ffffff":"#d8d8dc"}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            outlineWidth={selection.kind==="text" ? .008 : 0}
            outlineColor="#7067f0"
          >
            {section.copy.headline}
          </Text>
        </EditableNode>
      </Suspense>
    </Canvas>
  </div>;
}

function EditableAsset({
  asset,selected,mode,onSelect,onChange,onBegin,onEnd,
}:{
  asset:SceneAsset;
  selected:boolean;
  mode:ForgeTransformMode;
  onSelect:(selection:ForgeCanvasSelection)=>void;
  onChange:(transform:ForgeNodeTransform)=>void;
  onBegin:()=>void;
  onEnd:()=>void;
}){
  return <EditableNode
    selection={{kind:"asset",id:asset.id}}
    selected={selected}
    mode={mode}
    transform={{position:asset.position,rotation:asset.rotation,scale:[asset.scale,asset.scale,asset.scale]}}
    onSelect={onSelect}
    onChange={onChange}
    onBegin={onBegin}
    onEnd={onEnd}
  >
    {asset.kind==="model"
      ? <GLTFModel url={asset.url}/>
      : <group>
          <mesh castShadow receiveShadow>
            <boxGeometry args={asset.kind==="panorama"||asset.kind==="environment"?[1.4,.9,.08]:[1.6,.95,.08]}/>
            <meshStandardMaterial
              color={asset.kind==="video"?"#1f2937":asset.kind==="image"?"#27272a":"#18181b"}
              metalness={.1}
              roughness={.7}
            />
          </mesh>
          <Text position={[0,0,.07]} fontSize={.14} color="#d4d4d8" anchorX="center" anchorY="middle">
            {asset.id}
          </Text>
        </group>}
  </EditableNode>;
}

function EditableNode({
  selection,selected,mode,transform,onSelect,onChange,onBegin,onEnd,children,
}:{
  selection:ForgeCanvasSelection;
  selected:boolean;
  mode:ForgeTransformMode;
  transform:ForgeNodeTransform;
  onSelect:(selection:ForgeCanvasSelection)=>void;
  onChange:(transform:ForgeNodeTransform)=>void;
  onBegin:()=>void;
  onEnd:()=>void;
  children:ReactNode;
}){
  const root=useRef<Group>(null!);
  const dragging=useRef(false);

  useLayoutEffect(()=>{
    if(!root.current||dragging.current)return;
    root.current.position.set(...transform.position);
    root.current.rotation.set(...transform.rotation);
    root.current.scale.set(...transform.scale);
  },[transform]);

  const emit=()=>{
    const object=root.current;
    if(!object)return;
    onChange({
      position:object.position.toArray() as Vec3,
      rotation:[object.rotation.x,object.rotation.y,object.rotation.z],
      scale:object.scale.toArray() as Vec3,
    });
  };

  const node=<group
    ref={root}
    position={transform.position}
    rotation={transform.rotation}
    scale={transform.scale}
    onClick={(event)=>{event.stopPropagation();onSelect(selection);}}
  >
    {children}
    {selected&&<mesh position={[0,-.12,0]} rotation={[-Math.PI/2,0,0]} renderOrder={999}>
      <ringGeometry args={[.82,.86,64]}/>
      <meshBasicMaterial color="#8d83ff" transparent opacity={.9} depthTest={false}/>
    </mesh>}
  </group>;

  return <>{node}{selected&&<TransformControls
    object={root}
    mode={mode}
    space={mode==="translate"?"world":"local"}
    size={.78}
    translationSnap={.1}
    rotationSnap={Math.PI/12}
    scaleSnap={.05}
    onMouseDown={()=>{dragging.current=true;onBegin();}}
    onObjectChange={emit}
    onMouseUp={()=>{emit();dragging.current=false;onEnd();}}
  />}</>;
}

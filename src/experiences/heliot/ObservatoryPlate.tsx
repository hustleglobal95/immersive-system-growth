'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { ShaderMaterial, Vector2 } from 'three';
import { useCinematicFrame } from '@/src/components/three/CinematicFrame';
import { useExperienceStore } from '@/src/store/experienceStore';

// A camera-independent image plane in the persistent Canvas. The aperture mask
// connects landscape, macro and maquette without creating another animation clock.
export function ObservatoryPlate() {
  const [landscape, macro] = useTexture(['/models/heliot/observatory-landscape.webp', '/models/heliot/observatory-macro.webp']);
  const frame = useCinematicFrame();
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    landscape: { value: landscape }, macro: { value: macro }, progress: { value: 0 },
    aspect: { value: 1.5 }, pointer: { value: new Vector2() }, reduced: { value: 0 },
  }), [landscape, macro]);
  useFrame(({ size }) => {
    const state = useExperienceStore.getState();
    if (!material.current) return;
    const values = material.current.uniforms;
    values.progress.value = state.reducedMotion ? 0 : frame.progress;
    values.aspect.value = size.width / size.height;
    values.reduced.value = state.reducedMotion ? 1 : 0;
    values.pointer.value.set(state.reducedMotion ? 0 : state.pointer.x, state.reducedMotion ? 0 : state.pointer.y);
  });
  return <mesh frustumCulled={false} renderOrder={-20}>
    <planeGeometry args={[2, 2]} />
    <shaderMaterial ref={material} uniforms={uniforms} depthTest={false} depthWrite={false} toneMapped={false}
      vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.999,1.);}`}
      fragmentShader={`precision highp float;
      uniform sampler2D landscape; uniform sampler2D macro; uniform float progress; uniform float aspect; uniform vec2 pointer; uniform float reduced; varying vec2 vUv;
      vec2 cover(vec2 uv,float imageAspect){vec2 s=vec2(min(1.,aspect/imageAspect),min(1.,imageAspect/aspect));return (uv-.5)*s+vec2(aspect<.85?.68:.5,.5);}
      void main(){
        float p=progress;
        float approach=smoothstep(0.,.18,p)*(1.-smoothstep(.18,.3,p));
        vec2 uv=cover(vUv,1.5);
        uv=(uv-vec2(.69,.54))/(1.+approach*.38)+vec2(.69,.54);
        uv+=pointer*.003*(.3+pow(1.-vUv.y,2.));
        vec3 a=texture2D(landscape,clamp(uv,.001,.999)).rgb;
        vec2 muv=cover(vUv,1.5)+pointer*.002;
        vec3 b=texture2D(macro,clamp(muv,.001,.999)).rgb;
        float wipe=smoothstep(.14,.205,p);
        float edge=smoothstep(wipe-.05,wipe+.05,1.-vUv.x);
        vec3 color=mix(b,a,edge);
        float dist=length((vUv-vec2(.66,.5))*vec2(aspect,1.));
        float exitRadius=mix(2.,-.15,smoothstep(.265,.315,p));
        float visibility=1.-smoothstep(exitRadius-.04,exitRadius+.04,dist);
        float returnRadius=mix(-.15,2.,smoothstep(.79,.89,p));
        float returnMask=1.-smoothstep(returnRadius-.025,returnRadius+.025,dist);
        color=mix(color,a,step(.5,p));visibility=max(visibility,returnMask);
        float eclipse=sin(smoothstep(.81,.90,p)*3.14159265)*.3;
        color*=1.-eclipse*(1.-smoothstep(.15,.6,dist));
        if(visibility<.5)discard;
        gl_FragColor=vec4(color,1.);
      }`} />
  </mesh>;
}

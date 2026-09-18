import type { ExperienceConfig, Vec3 } from "@/src/types/experience";

export interface MotionReviewPoint {
  id:string;
  progress:number;
  sceneId:string;
  kind:"sample"|"boundary-before"|"boundary-after";
}

export interface MotionReviewPlan {
  version:1;
  samplesPerScene:number;
  points:MotionReviewPoint[];
}

export interface MotionSnapshot {
  progress:number;
  viewport:"desktop"|"mobile";
  sceneIndex:number;
  sceneId:string;
  localProgress:number;
  camera:{ position:Vec3; target:Vec3; fov:number };
  runtimeCamera?:{ position:Vec3; target:Vec3; fov:number };
  hero:{ position:Vec3; rotation:Vec3; scale:number };
  renderer?:{ frameMs?:number; calls?:number; triangles?:number; webglStatus?:string; quality?:string };
  reducedMotion?:boolean;
}

export interface MotionQualityFinding {
  code:string;
  severity:"blocker"|"major"|"minor"|"advisory";
  sceneId?:string;
  progress?:number;
  message:string;
  metric?:number;
  threshold?:number;
}

export interface MotionQualityReport {
  version:1;
  viewport:"desktop"|"mobile";
  qualityScore:number;
  reversible:boolean;
  finite:boolean;
  findings:MotionQualityFinding[];
  hardGateFailures:string[];
  metrics:{
    sampleCount:number;
    boundaryCount:number;
    maxFrameMs:number;
    medianFrameMs:number;
    maxCameraStep:number;
    maxHeroStep:number;
    maxCameraVelocityRatio:number;
    maxHeroVelocityRatio:number;
    maxRuntimeCameraDrift:number;
  };
}

export function buildMotionReviewPlan(experience:ExperienceConfig,samplesPerScene=10):MotionReviewPlan {
  const count=Math.max(5,Math.min(24,Math.trunc(samplesPerScene)));
  const points:MotionReviewPoint[]=[];
  for(const scene of experience.scenes) {
    const span=Math.max(0.000001,scene.range[1]-scene.range[0]);
    for(let i=0;i<count;i++) {
      const t=count===1 ? 0.5 : i/(count-1);
      const progress=clamp(scene.range[0]+span*(0.03+0.94*t));
      points.push({
        id:scene.id+"-sample-"+String(i).padStart(2,"0"),
        progress,
        sceneId:scene.id,
        kind:"sample",
      });
    }
  }
  for(let i=0;i<experience.scenes.length-1;i++) {
    const current=experience.scenes[i];
    const next=experience.scenes[i+1];
    const boundary=current.range[1];
    const epsilon=Math.max(0.00005,Math.min(0.0005,(current.range[1]-current.range[0])*0.005,(next.range[1]-next.range[0])*0.005));
    points.push({ id:current.id+"-boundary-before",progress:clamp(boundary-epsilon),sceneId:current.id,kind:"boundary-before" });
    points.push({ id:next.id+"-boundary-after",progress:clamp(boundary+epsilon),sceneId:next.id,kind:"boundary-after" });
  }
  points.sort((a,b)=>a.progress-b.progress || a.id.localeCompare(b.id));
  return { version:1,samplesPerScene:count,points };
}

export function analyzeMotionQuality(input:{
  plan:MotionReviewPlan;
  forward:Array<{ point:MotionReviewPoint; snapshot:MotionSnapshot }>;
  reverse:Array<{ point:MotionReviewPoint; snapshot:MotionSnapshot }>;
  viewport:"desktop"|"mobile";
}):MotionQualityReport {
  const findings:MotionQualityFinding[]=[];
  const hardGateFailures:string[]=[];
  const forwardById=new Map(input.forward.map((item)=>[item.point.id,item.snapshot]));
  const reverseById=new Map(input.reverse.map((item)=>[item.point.id,item.snapshot]));
  let finite=true;
  let reversible=true;
  let maxRuntimeCameraDrift=0;

  for(const point of input.plan.points) {
    const a=forwardById.get(point.id);
    const b=reverseById.get(point.id);
    if(!a || !b) {
      const message=point.id+": missing deterministic motion sample";
      findings.push({ code:"motion.sample.missing",severity:"blocker",sceneId:point.sceneId,progress:point.progress,message });
      hardGateFailures.push(message);
      reversible=false;
      continue;
    }
    if(!snapshotFinite(a) || !snapshotFinite(b)) {
      const message=point.id+": motion state contains non-finite values";
      findings.push({ code:"motion.sample.nonfinite",severity:"blocker",sceneId:point.sceneId,progress:point.progress,message });
      hardGateFailures.push(message);
      finite=false;
    }
    const drift=snapshotDistance(a,b);
    if(drift>0.0025) {
      const message=point.id+": authored forward/reverse state drifted at identical progress";
      findings.push({ code:"motion.reverse.drift",severity:"blocker",sceneId:point.sceneId,progress:point.progress,message,metric:round(drift),threshold:0.0025 });
      hardGateFailures.push(message);
      reversible=false;
    }
    if(a.runtimeCamera && b.runtimeCamera) {
      const runtimeDrift=cameraStateDistance(a.runtimeCamera,b.runtimeCamera);
      maxRuntimeCameraDrift=Math.max(maxRuntimeCameraDrift,runtimeDrift);
      if(runtimeDrift>0.75) {
        const severe=runtimeDrift>3;
        const message=point.id+": actual damped camera differs by direction at the same progress state";
        findings.push({
          code:"motion.runtime-camera.hysteresis",
          severity:severe ? "blocker" : "major",
          sceneId:point.sceneId,
          progress:point.progress,
          message,
          metric:round(runtimeDrift),
          threshold:severe ? 3 : 0.75,
        });
        if(severe) hardGateFailures.push(message);
      }
    }
  }

  const samples=input.forward.filter((item)=>item.point.kind==="sample").sort((a,b)=>a.point.progress-b.point.progress);
  const cameraSteps:number[]=[];
  const heroSteps:number[]=[];
  let maxCameraVelocityRatio=0;
  let maxHeroVelocityRatio=0;
  const byScene=new Map<string,typeof samples>();
  for(const item of samples) {
    const rows=byScene.get(item.point.sceneId) ?? [];
    rows.push(item);
    byScene.set(item.point.sceneId,rows);
  }

  for(const [sceneId,rows] of byScene) {
    const localCamera:number[]=[];
    const localHero:number[]=[];
    for(let i=1;i<rows.length;i++) {
      const a=rows[i-1].snapshot;
      const b=rows[i].snapshot;
      const cameraStep=vecDistance(a.camera.position,b.camera.position)+0.35*vecDistance(a.camera.target,b.camera.target)+0.025*Math.abs(a.camera.fov-b.camera.fov);
      const heroStep=vecDistance(a.hero.position,b.hero.position)+0.3*vecDistance(a.hero.rotation,b.hero.rotation)+0.6*Math.abs(a.hero.scale-b.hero.scale);
      localCamera.push(cameraStep);
      localHero.push(heroStep);
      cameraSteps.push(cameraStep);
      heroSteps.push(heroStep);
    }
    for(let i=1;i<localCamera.length;i++) {
      const ratio=velocityRatio(localCamera[i-1],localCamera[i]);
      maxCameraVelocityRatio=Math.max(maxCameraVelocityRatio,ratio);
      if(ratio>6 && Math.max(localCamera[i-1],localCamera[i])>0.12) {
        findings.push({
          code:"motion.camera.velocity-spike",
          severity:ratio>10 ? "major" : "minor",
          sceneId,
          message:"Camera step velocity changes abruptly inside the scene.",
          metric:round(ratio),
          threshold:6,
        });
      }
      const heroRatio=velocityRatio(localHero[i-1],localHero[i]);
      maxHeroVelocityRatio=Math.max(maxHeroVelocityRatio,heroRatio);
      if(heroRatio>6 && Math.max(localHero[i-1],localHero[i])>0.12) {
        findings.push({
          code:"motion.hero.velocity-spike",
          severity:heroRatio>10 ? "major" : "minor",
          sceneId,
          message:"Hero motion changes velocity abruptly inside the scene.",
          metric:round(heroRatio),
          threshold:6,
        });
      }
    }
  }

  const boundaryPairs=pairBoundaries(input.forward);
  for(const pair of boundaryPairs) {
    const cameraJump=vecDistance(pair.before.snapshot.camera.position,pair.after.snapshot.camera.position);
    const targetJump=vecDistance(pair.before.snapshot.camera.target,pair.after.snapshot.camera.target);
    const fovJump=Math.abs(pair.before.snapshot.camera.fov-pair.after.snapshot.camera.fov);
    const heroJump=vecDistance(pair.before.snapshot.hero.position,pair.after.snapshot.hero.position);
    const heroScaleRatio=ratio(pair.before.snapshot.hero.scale,pair.after.snapshot.hero.scale);
    const severe=cameraJump>4 || targetJump>4 || fovJump>18 || heroJump>4 || heroScaleRatio>2.25;
    const noticeable=cameraJump>2 || targetJump>2 || fovJump>10 || heroJump>2 || heroScaleRatio>1.6;
    if(severe || noticeable) {
      const severity=severe ? "blocker" : "major";
      const message=pair.before.point.sceneId+" → "+pair.after.point.sceneId+": scene-boundary transform discontinuity";
      findings.push({
        code:"motion.boundary.discontinuity",
        severity,
        sceneId:pair.after.point.sceneId,
        progress:pair.after.point.progress,
        message,
        metric:round(Math.max(cameraJump,targetJump,heroJump,fovJump/4,heroScaleRatio-1)),
        threshold:severe ? 4 : 2,
      });
      if(severe) hardGateFailures.push(message);
    }
  }

  const frameMs=input.forward.map((item)=>Number(item.snapshot.renderer?.frameMs ?? 0)).filter((value)=>Number.isFinite(value)&&value>0);
  const maxFrameMs=frameMs.length ? Math.max(...frameMs) : 0;
  const medianFrameMs=median(frameMs);
  if(maxFrameMs>80) {
    findings.push({
      code:"motion.renderer.frame-spike",
      severity:"advisory",
      message:"Headless review observed a large renderer frame-time spike; confirm on real hardware before release.",
      metric:round(maxFrameMs),
      threshold:80,
    });
  }

  const blockers=findings.filter((item)=>item.severity==="blocker").length;
  const majors=findings.filter((item)=>item.severity==="major").length;
  const minors=findings.filter((item)=>item.severity==="minor").length;
  const qualityScore=Math.max(0,Math.min(100,100-blockers*25-majors*8-minors*2));

  return {
    version:1,
    viewport:input.viewport,
    qualityScore,
    reversible,
    finite,
    findings,
    hardGateFailures:[...new Set(hardGateFailures)],
    metrics:{
      sampleCount:input.forward.length,
      boundaryCount:boundaryPairs.length,
      maxFrameMs:round(maxFrameMs),
      medianFrameMs:round(medianFrameMs),
      maxCameraStep:round(cameraSteps.length?Math.max(...cameraSteps):0),
      maxHeroStep:round(heroSteps.length?Math.max(...heroSteps):0),
      maxCameraVelocityRatio:round(maxCameraVelocityRatio),
      maxHeroVelocityRatio:round(maxHeroVelocityRatio),
      maxRuntimeCameraDrift:round(maxRuntimeCameraDrift),
    },
  };
}

function pairBoundaries(rows:Array<{ point:MotionReviewPoint; snapshot:MotionSnapshot }>) {
  const before=rows.filter((item)=>item.point.kind==="boundary-before").sort((a,b)=>a.point.progress-b.point.progress);
  const after=rows.filter((item)=>item.point.kind==="boundary-after").sort((a,b)=>a.point.progress-b.point.progress);
  return before.slice(0,Math.min(before.length,after.length)).map((item,index)=>({ before:item,after:after[index] }));
}
function snapshotFinite(snapshot:MotionSnapshot) {
  return [
    snapshot.progress,snapshot.localProgress,
    ...snapshot.camera.position,...snapshot.camera.target,snapshot.camera.fov,
    ...snapshot.hero.position,...snapshot.hero.rotation,snapshot.hero.scale,
  ].every(Number.isFinite);
}
function snapshotDistance(a:MotionSnapshot,b:MotionSnapshot) {
  return vecDistance(a.camera.position,b.camera.position)
    +vecDistance(a.camera.target,b.camera.target)
    +Math.abs(a.camera.fov-b.camera.fov)*0.02
    +vecDistance(a.hero.position,b.hero.position)
    +vecDistance(a.hero.rotation,b.hero.rotation)*0.2
    +Math.abs(a.hero.scale-b.hero.scale)*0.4;
}
function cameraStateDistance(a:{ position:Vec3; target:Vec3; fov:number },b:{ position:Vec3; target:Vec3; fov:number }) {
  return vecDistance(a.position,b.position)+0.35*vecDistance(a.target,b.target)+0.025*Math.abs(a.fov-b.fov);
}
function vecDistance(a:Vec3,b:Vec3) {
  return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
}
function velocityRatio(a:number,b:number) {
  const high=Math.max(a,b), low=Math.max(0.01,Math.min(a,b));
  return high/low;
}
function ratio(a:number,b:number) {
  const high=Math.max(Math.abs(a),Math.abs(b),0.0001);
  const low=Math.max(0.0001,Math.min(Math.abs(a),Math.abs(b)));
  return high/low;
}
function median(values:number[]) {
  if(!values.length) return 0;
  const sorted=[...values].sort((a,b)=>a-b);
  const middle=Math.floor(sorted.length/2);
  return sorted.length%2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2;
}
function clamp(value:number){ return Math.max(0,Math.min(1,Number(value.toFixed(6)))); }
function round(value:number){ return Number(value.toFixed(4)); }

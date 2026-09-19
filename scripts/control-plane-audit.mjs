import { forgeCapabilityRegistry, validateCapabilityRegistry } from "../src/platform/control-plane/capabilityRegistry.ts";

const issues=validateCapabilityRegistry();
const selectionKinds=new Set(forgeCapabilityRegistry.flatMap((item)=>item.selectionKinds));
const requiredKinds=["scene","camera","node","asset","environment"];
for(const kind of requiredKinds) {
  if(!selectionKinds.has(kind)) issues.push({capabilityId:"registry",message:"No Control Plane capability covers selection kind "+kind+"."});
}

const deep=forgeCapabilityRegistry.filter((item)=>item.executionClass==="deep");
const previewed=deep.filter((item)=>item.riskClass==="preview-required" || item.riskClass==="approval-required");
if(previewed.length!==deep.length) {
  issues.push({capabilityId:"registry",message:"Every deep capability must require preview or approval."});
}

if(issues.length) {
  console.error("Control Plane audit failed:");
  for(const issue of issues) console.error("- "+issue.capabilityId+": "+issue.message);
  process.exitCode=1;
} else {
  const counts=Object.fromEntries(["fast","deep","editor","navigation"].map((kind)=>[
    kind,
    forgeCapabilityRegistry.filter((item)=>item.executionClass===kind).length,
  ]));
  console.log(
    "Control Plane audit passed: "
    +forgeCapabilityRegistry.length+" capabilities · "
    +requiredKinds.length+" selection kinds · "
    +JSON.stringify(counts)
  );
}

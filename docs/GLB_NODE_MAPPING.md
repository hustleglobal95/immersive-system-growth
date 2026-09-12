# GLB node mapping contract

Forge treats a client GLB as an authored rig, not an anonymous binary. Inspection produces a deterministic mapping record for every selected mesh node.

## Mapping record

- `id` is derived from the full hierarchy path and a deterministic hash. It remains stable when the same named hierarchy is inspected again.
- `node` is the runtime mesh name used by the existing product rig and motion-track targets.
- `path` preserves the complete hierarchy location for review and disambiguation.
- `role` classifies the node as `primary`, `component`, `accent`, or `animated`.
- `confidence` records the inspector suggestion strength. It is a review signal, not permission to skip visual inspection.
- `required` marks nodes that must remain mapped for the authored experience to be valid.

The mapping is stored with `productRig` in the validated experience document. Tracks continue to target runtime node names, while the mapping record gives Studio and release validation the stable context needed to detect renamed or missing nodes.

## Safety rules

1. Mapping IDs and hierarchy paths are unique within a rig.
2. Every mapping node must be declared by `productRig.nodes`.
3. The inspector never uploads the source file. The browser and CLI inspect the local binary.
4. A confidence score does not replace a human review of the model.
5. If a node is renamed or moved, the mapping must be reviewed before publishing.
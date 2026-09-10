# Shader Library

`src/shaders` contains starter GLSL snippets for dissolve and portal treatments plus refraction guidance.

Use custom shaders only when standard Three.js or Drei materials cannot express the art direction. For glass, start with `MeshTransmissionMaterial`. For metallic products, start with `MeshPhysicalMaterial`. Custom shader code adds maintenance cost, mobile GPU risk and accessibility considerations.

When adding a shader, document its uniforms, expected geometry UVs, performance cost and reduced-motion fallback.

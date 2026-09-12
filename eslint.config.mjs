import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // R3F deliberately mutates owned engine objects in useFrame/useEffect; these files are not React Compiler targets.
  {
    files: ["src/components/three/**/*.{ts,tsx}"],
    rules: { "react-hooks/immutability": "off" },
  },
  // The graph simulator intentionally resets its isolated local snapshot when a different graph identity/initial state is loaded.
  // It does not synchronize production runtime state and only runs in the authoring surface.
  {
    files: ["src/studio/InteractionGraphEditor.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  globalIgnores([
    ".next/**",
    "test-results/**",
    "playwright-report/**",
    "dist/**",
    "coverage/**",
    "public/generated/**",
    "public/decoders/**",
  ]),
]);

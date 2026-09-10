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

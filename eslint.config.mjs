import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Synced from music-room-server (linted there).
    "src/contracts/**",
  ]),
  {
    // Keep Zod out of the browser bundle: runtime values come from the zod-free
    // contract files; the barrel is for types only.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "zod", message: "Zod is server-side only. Use src/lib/validate.ts." },
            {
              name: "@/contracts",
              message: "Import values from @/contracts/<file> (constants, text, youtube, events, version).",
              allowTypeImports: true,
            },
            { name: "@/contracts/schemas", message: "Schemas pull in Zod.", allowTypeImports: true },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;

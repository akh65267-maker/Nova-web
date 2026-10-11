import { defineConfig, globalIgnores } from "eslint/config";
import { base } from "@taskmanager/config/eslint";

const eslintConfig = defineConfig([
  ...base,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

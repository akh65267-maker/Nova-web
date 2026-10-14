import { defineConfig, globalIgnores } from "eslint/config";
import { base } from "@taskmanager/config/eslint";

export default defineConfig([
  ...base,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

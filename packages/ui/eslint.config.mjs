import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The same rules as the app (see apps/web/eslint.config.mjs), minus the one that looks for a
// Next.js `pages` directory, which a component package does not have. If a third config appears,
// extract these into a shared packages/config instead of copying them again.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: { "@next/next/no-html-link-for-pages": "off" } },
  globalIgnores(["node_modules/**"]),
]);

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The rules every app and package shares: Next.js core-web-vitals plus its TypeScript rules.
export const base = [...nextVitals, ...nextTs];

// For a package of components or helpers (not an app). The one rule dropped looks for a Next.js
// `pages` directory, which a package does not have and which makes ESLint print a warning.
export function library() {
  return defineConfig([
    ...base,
    { rules: { "@next/next/no-html-link-for-pages": "off" } },
    globalIgnores(["node_modules/**"]),
  ]);
}

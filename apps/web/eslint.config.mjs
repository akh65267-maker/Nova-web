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
  ]),
  // Keeps the admin area separable from the shop, so splitting it into its own app later stays
  // a mechanical move (see docs/frontend.md, "Admin Panel"). Admin may use the shared layers
  // (components/ui, lib, store/auth, features/*/api and hooks) but nothing shop-specific.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/app/admin/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/admin", "@/app/admin/*"],
              message: "Admin pages are self-contained: nothing outside app/admin may import from them.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/admin/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/components/layout/*",
                "@/store/cart-store",
                "@/features/catalog/product-card",
                "@/features/catalog/product-row",
                "@/features/catalog/product-filters",
              ],
              message: "Admin must not depend on shop-specific UI or the cart; use the shared layers.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;

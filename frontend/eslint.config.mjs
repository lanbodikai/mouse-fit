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
    // Legacy and raw public scripts are intentionally excluded from strict linting.
    "public/src/js/**",
    "src/components/legacy/**",
    "src/components/landing/VideoBackdrop.tsx",
    "src/app/(shell)/**",
    "src/lib/theme.tsx",
    "src/lib/session.ts",
  ]),
]);

export default eslintConfig;

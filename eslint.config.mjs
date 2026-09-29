import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

// Own module is expressed as `${from.module}`: the capture group of the element
// patterns below. That is what keeps `catalog/ui` out of `markets/domain`.
const ownModule = (type) => [type, { module: "${from.module}" }];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["src/**/*.{ts,tsx}"],
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**/*", mode: "full" },
        {
          type: "module",
          pattern: "src/modules/*/index.ts",
          mode: "full",
          capture: ["module"],
        },
        {
          type: "domain",
          pattern: "src/modules/*/domain/**/*",
          mode: "full",
          capture: ["module"],
        },
        {
          type: "data",
          pattern: "src/modules/*/data/**/*",
          mode: "full",
          capture: ["module"],
        },
        {
          type: "ui",
          pattern: "src/modules/*/ui/**/*",
          mode: "full",
          capture: ["module"],
        },
        { type: "shared", pattern: "src/shared/**/*", mode: "full" },
      ],
      "import/resolver": {
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          message: "${file.type} is not allowed to import ${dependency.type}",
          rules: [
            // Routing composes: modules through their public API, plus shared primitives.
            { from: ["app"], allow: ["app", "module", "shared"] },
            // A module's index.ts is the only file that may see all of its own
            // layers, and the only one that may reach another module — through
            // that module's index.ts, never into its layers.
            {
              from: ["module"],
              allow: [
                "module",
                ownModule("domain"),
                ownModule("data"),
                ownModule("ui"),
                "shared",
              ],
            },
            // I/O layer: maps upstream responses onto its own domain types.
            {
              from: ["data"],
              allow: [ownModule("data"), ownModule("domain"), "shared"],
            },
            // Presentation: props in, markup out. No data access.
            {
              from: ["ui"],
              allow: [ownModule("ui"), ownModule("domain"), "shared"],
            },
            // Pure TypeScript. Depends on nothing but itself.
            { from: ["domain"], allow: [ownModule("domain")] },
            { from: ["shared"], allow: ["shared"] },
          ],
        },
      ],
      "boundaries/no-unknown": "error",
      "boundaries/no-unknown-files": "error",
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Aliases are duplicated from tsconfig.json rather than pulled in with a
  // plugin: three lines beat another dependency.
  resolve: {
    alias: {
      "@app": src("./src/app"),
      "@modules": src("./src/modules"),
      "@shared": src("./src/shared"),
    },
  },
  test: {
    // domain/ is pure TypeScript, so no browser environment is needed.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@/lib": path.resolve(import.meta.dirname, "src/lib"),
      "@/components": path.resolve(import.meta.dirname, "src/components"),
      "@/hooks": path.resolve(import.meta.dirname, "src/hooks"),
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});

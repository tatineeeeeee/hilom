import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/App.tsx", "src/**/*.d.ts", "src/test/**"],
    },
  },
});

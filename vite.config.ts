import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Absolute asset paths so deep links such as /recipients/abc load assets.
  base: "/",
  server: {
    // Local development mirrors the production Nginx routes:
    //   VITE_DATA_API_URL=/api/v1  VITE_BEACON_API_URL=/api/beacon/v1
    proxy: {
      "/api/beacon": {
        target: "http://127.0.0.1:8100",
        rewrite: (path) => path.replace(/^\/api\/beacon/, "")
      },
      "/api": {
        target: "http://127.0.0.1:8000",
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts"
  }
});

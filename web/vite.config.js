import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL(".", import.meta.url)), "");
  const apiTarget =
    process.env.API_PROXY_TARGET ||
    env.API_PROXY_TARGET ||
    "http://127.0.0.1:8000";
  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 4173,
      strictPort: false,
      allowedHosts: ["terminal.local"],
      proxy: {
        "/api": apiTarget,
        "/media": apiTarget,
      },
    },
    build: {
      // The lazily loaded Three.js anatomy chunk is ~145 kB after gzip.
      // Raise the warning threshold to avoid flagging that expected 3D feature bundle.
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            three: ["three"],
            react: ["react", "react-dom", "react-router-dom"],
          },
        },
      },
    },
  };
});

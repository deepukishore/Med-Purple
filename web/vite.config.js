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
      // Keep the warning visible: the measured core Three.js chunk is 704 kB
      // minified (182 kB gzip) and is only fetched with the lazy 3D experience.
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const path = id.replaceAll("\\", "/");
            // Keep full-atlas loaders and controls out of the heart preview's
            // core Three.js download. The atlas route requests these on demand.
            if (path.includes("/node_modules/three/examples/jsm/"))
              return "three-extras";
            if (path.includes("/node_modules/three/")) return "three";
            if (
              /\/node_modules\/(react|react-dom|react-router|react-router-dom)\//.test(
                path,
              )
            )
              return "react";
          },
        },
      },
    },
  };
});

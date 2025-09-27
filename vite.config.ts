// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // dev → your local backend (adjust to 3000 if you run node on 3000 in dev)
      "/api": { target: "http://127.0.0.1:5000", changeOrigin: true },

      // make bare /rpc and /tx behave like prod (/api/rpc, /api/tx)
      "/rpc": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/rpc/, "/api/rpc"),
      },
      "/tx": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tx/, "/api/tx"),
      },
    },
  },
  plugins: [react(), nodePolyfills(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  optimizeDeps: { esbuildOptions: { define: { global: "globalThis" } } },
}));

import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const publicPort = Number(process.env.PORT ?? 3000);
const internalPort = Number(process.env.VITE_INTERNAL_PORT ?? 5173);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: path.resolve(__dirname, ".."),
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  // IDKit resolves its WASM binary relative to import.meta.url. Vite's dependency
  // pre-bundler relocates the JS into .vite/deps without copying that sibling WASM.
  optimizeDeps: { exclude: ["@worldcoin/idkit", "@worldcoin/idkit-core"] },
  server: {
    host: "127.0.0.1",
    port: internalPort,
    strictPort: true,
    hmr: { clientPort: publicPort },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@worldcoin") || id.includes("idkit")) return "world-id";
          if (id.includes("react-dom") || id.includes("react-router") || id.includes("/react/")) return "react-vendor";
          if (id.includes("qrcode")) return "qr-code";
        },
      },
    },
  },
});

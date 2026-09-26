import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { proxy: { "/api": "http://localhost:3001" } },
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

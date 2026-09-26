import path from "node:path";
import { createReadStream } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const publicPort = Number(process.env.PORT ?? 3000);
const internalPort = Number(process.env.VITE_INTERNAL_PORT ?? 5173);
const idkitWasmPath = path.resolve(__dirname, "node_modules/@worldcoin/idkit-core/dist/idkit_wasm_bg.wasm");

function serveIdkitWasm(): Plugin {
  return {
    name: "serve-idkit-wasm",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?", 1)[0] !== "/node_modules/.vite/deps/idkit_wasm_bg.wasm") return next();
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/wasm");
        response.setHeader("Cache-Control", "no-cache");
        createReadStream(idkitWasmPath).pipe(response);
      });
    },
  };
}

export default defineConfig({
  plugins: [
    serveIdkitWasm(),
    react(),
    tailwindcss(),
    VitePWA({
      selfDestroying: true,
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon-32x32.png", "favicon-16x16.png", "pwa-icon.svg", "apple-touch-icon.png", "brand-icon.png"],
      manifest: {
        name: "Promise",
        short_name: "Promise",
        description: "Make clear promises with verified humans and keep them together.",
        theme_color: "#d9ff5b",
        background_color: "#f6f5ed",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "portrait-primary",
        categories: ["lifestyle", "utilities"],
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  envDir: path.resolve(__dirname, ".."),
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
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

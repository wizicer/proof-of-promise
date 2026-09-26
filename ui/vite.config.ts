import path from "node:path";
import { createReadStream } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

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
  plugins: [serveIdkitWasm(), react(), tailwindcss()],
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

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Choose WSS when running in production or when HTTPS is enabled
const useWSS = process.env.FORCE_WSS === 'true' || process.env.HTTPS === 'true' || process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5433,
    allowedHosts: ["*"],
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
    middlewareMode: false,
    hmr: {
      protocol: useWSS ? 'wss' : 'ws',
      host: "0.0.0.0",
      port: 5433,
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ["leaflet"],
          react: ["react", "react-dom"],
          lucide: ["lucide-react"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "leaflet", "lucide-react"],
    exclude: [],
  },
});

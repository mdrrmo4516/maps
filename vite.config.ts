// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Choose WSS when running in production or when HTTPS is enabled
const useWSS = process.env.FORCE_WSS === 'true' || process.env.HTTPS === 'true' || process.env.NODE_ENV === 'production';

// Define your port configuration
const PORTS = {
  app: 5433,        // Main dev server port
  api: 3001,        // Backend API server
  apiAlt: 3002,     // Alternative API server (if needed)
  hmr: 5434,        // HMR WebSocket port
  fallback: 5435    // Fallback port if main port is busy
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: PORTS.app,
    strictPort: false, // Allow Vite to try fallback ports if app port is busy
    allowedHosts: ["*"],
    proxy: {
      "/api": {
        target: `http://localhost:${PORTS.api}`,
        changeOrigin: true,
      },
    },
    middlewareMode: false,
    hmr: {
      protocol: useWSS ? 'wss' : 'ws',
      // Do not hardcode the client host; leave undefined so the client
      // uses the page's hostname (window.location.hostname). This avoids
      // initiating insecure ws:// connections when the page is served over HTTPS.
      host: process.env.HMR_HOST || undefined,
      port: PORTS.hmr,
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
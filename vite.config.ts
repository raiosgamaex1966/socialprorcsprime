import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // we register manually with iframe/preview guards in main.tsx
      devOptions: {
        enabled: false, // never run the SW during dev / Lovable preview
      },
      includeAssets: ["favicon.ico", "robots.txt", "placeholder.svg"],
      manifestFilename: "manifest.webmanifest",
      manifest: false, // keep using the existing public/manifest.webmanifest
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB — fits the main JS bundle
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));

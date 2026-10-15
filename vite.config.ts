import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig(({ mode }) => ({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Native assets are updated by the APK, not a second web-app cache.
      disable: mode === "android",
      registerType: "autoUpdate",
      manifest: {
        name: "LinguaTube",
        short_name: "LinguaTube",
        description:
          "Discover videos. Watch with synchronized English and Vietnamese transcripts.",
        theme_color: "#101114",
        background_color: "#101114",
        display: "standalone",
        start_url: ".",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
  server: { port: 5173 },
  build: { outDir: "dist" },
}));

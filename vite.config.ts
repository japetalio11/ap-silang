import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["silang.svg", "fonts/*.otf"],
      manifest: {
        name: "Silang — Maternal & Birth Monitoring System",
        short_name: "Silang",
        description: "Maternal and birth monitoring for rural health facilities.",
        theme_color: "#003f2c",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "/silang.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,otf}"],
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              !url.pathname.startsWith("/api/") &&
              ["", "script", "style", "font", "image"].includes(request.destination),
            handler: "NetworkFirst",
            options: {
              cacheName: "silang-app-shell",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 5000, maxAgeSeconds: 2592000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "silang-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
        navigateFallbackAllowlist: [/^\/.*$/],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

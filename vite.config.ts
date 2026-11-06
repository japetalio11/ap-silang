import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["silang.svg"],
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
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,otf}"],
        runtimeCaching: [
          {
            // In development the app is served as many /src modules rather
            // than production bundles. Cache these shell resources too so a
            // deep-route refresh can still boot after an online visit.
            urlPattern: ({ url, request }) => url.origin === self.location.origin
              && !url.pathname.startsWith("/api/")
              && ["", "script", "style", "font", "image"].includes(request.destination),
            handler: "NetworkFirst",
            options: {
              cacheName: "silang-app-shell",
              networkTimeoutSeconds: 3,
              // Vite serves the development app as hundreds of individual
              // modules; a small cache evicts entry modules before reload.
              expiration: { maxEntries: 5000, maxAgeSeconds: 2592000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "silang-fonts", expiration: { maxEntries: 30, maxAgeSeconds: 31536000 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
      // Keep deep-link refreshes usable while developing/testing offline too.
      devOptions: {
        enabled: true,
        type: "module",
        navigateFallbackAllowlist: [/^\/$/, /^\/dashboard(?:\/.*)?$/],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

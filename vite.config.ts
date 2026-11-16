import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const backendUrl = (env.BACKEND_API_URL || env.VITE_BACKEND_API_URL || "https://bms-backend-1-zzt5.onrender.com")
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/+$/, "")

  return {
  server: {
    proxy: {
      "/api": { target: backendUrl, changeOrigin: true, secure: true },
      "/socket.io": { target: backendUrl, changeOrigin: true, ws: true, secure: true },
    },
  },
  preview: {
    proxy: {
      "/api": { target: backendUrl, changeOrigin: true, secure: true },
      "/socket.io": { target: backendUrl, changeOrigin: true, ws: true, secure: true },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "silang.svg",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "pwa-maskable-512x512.png",
        "apple-touch-icon.png",
        "fonts/*.otf",
      ],
      manifest: {
        name: "Silang — Maternal & Birth Monitoring System",
        short_name: "Silang",
        description: "Maternal and birth monitoring for rural health facilities.",
        theme_color: "#003f2c",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/silang.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
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
              request.mode !== "navigate" &&
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
  }
})

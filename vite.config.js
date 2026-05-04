import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  build: {
    rollupOptions: {
      input: {
        note: resolve(__dirname, "note.html"),
        export: resolve(__dirname, "export.html"),
        share: resolve(__dirname, "share.html"),
      },
      // Share uses src/share-entry.jsx (not main.jsx) to avoid App.css transparent background
    },
  },

  clearScreen: false,
  server: {
    port: 1426,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1427,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));

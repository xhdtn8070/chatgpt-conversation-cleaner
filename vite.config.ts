import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: resolve(rootDir, "popup.html"),
        content: resolve(rootDir, "src/content/main.ts"),
        pageBridge: resolve(rootDir, "src/content/page-bridge.ts")
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "content"
            ? "assets/content.js"
            : chunk.name === "pageBridge"
              ? "assets/page-bridge.js"
            : "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
        manualChunks: undefined
      }
    }
  }
});

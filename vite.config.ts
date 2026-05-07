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
        speedMain: resolve(rootDir, "src/content/speed-main.ts"),
        content: resolve(rootDir, "src/content/main.ts")
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "content"
            ? "assets/content.js"
            : chunk.name === "speedMain"
              ? "assets/speed-main.js"
              : "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
        manualChunks: undefined
      }
    }
  }
});

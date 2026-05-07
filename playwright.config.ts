import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: 0,
  use: {
    viewport: { width: 1280, height: 900 },
    trace: "on-first-retry"
  }
});

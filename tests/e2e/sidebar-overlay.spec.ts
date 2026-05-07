import { expect, test } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

declare global {
  interface Window {
    __navigated: boolean;
  }
}

test("content script renders stable checkbox overlay and isolates row clicks", async ({ page }) => {
  await page.addInitScript(() => {
    const storage: Record<string, unknown> = { "gptbd.bulkMode": true };

    window.chrome = {
      storage: {
        local: {
          get(key: string, callback: (items: Record<string, unknown>) => void) {
            callback({ [key]: storage[key] });
          },
          set(items: Record<string, unknown>, callback?: () => void) {
            Object.assign(storage, items);
            callback?.();
          }
        }
      },
      runtime: {
        onMessage: {
          addListener() {
            return undefined;
          }
        }
      }
    } as unknown as typeof chrome;
  });

  await page.goto(pathToFileURL(resolve("fixtures/sidebar.html")).toString());
  await page.addScriptTag({ path: resolve("dist/assets/content.js") });
  await page.waitForSelector("html[data-gptbd-ready='true']");

  const alphaCheckbox = page.getByRole("checkbox", { name: /select alpha planning thread/i });
  await expect(alphaCheckbox).toBeVisible();

  await alphaCheckbox.click();
  await expect(page.locator("#row-alpha")).toHaveAttribute("data-gptbd-row-selected", "true");
  await expect(page.getByText("1 selected")).toBeVisible();

  await expect.poll(() => page.evaluate(() => window.__navigated)).toBe(false);

  const box = await alphaCheckbox.boundingBox();
  expect(box?.width).toBe(32);
  expect(box?.height).toBe(32);

  await page.getByRole("link", { name: /beta release notes/i }).click();
  await expect(page.locator("#row-beta")).toHaveAttribute("data-gptbd-row-selected", "true");
  await expect(page.getByText("2 selected")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__navigated)).toBe(false);
});

import { expect, test } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

declare global {
  interface Window {
    __navigated: boolean;
    __voiceClicked: boolean;
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
  await expect(page.locator("[data-gptbd-toolbar-spacer='true']")).toHaveCount(1);
  await expect(page.locator("#row-alpha a")).toHaveCSS("padding-left", "44px");

  const actionBar = page.locator("#gptbd-root .action-bar");
  const modeSwitch = page.getByRole("switch", { name: "Bulk delete mode" });
  await expect(modeSwitch).toHaveText("On");
  await modeSwitch.click();
  await expect(page.getByText("Bulk delete off", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /select alpha planning thread/i })).toHaveCount(0);
  await modeSwitch.click();
  await expect(alphaCheckbox).toBeVisible();

  const actionBarBox = await actionBar.boundingBox();
  const recentBox = await page.getByText("Recent", { exact: true }).boundingBox();
  const sidebarBox = await page.locator("nav").boundingBox();
  expect(actionBarBox).not.toBeNull();
  expect(recentBox).not.toBeNull();
  expect(sidebarBox).not.toBeNull();
  expect(actionBarBox!.y).toBeGreaterThanOrEqual(recentBox!.y + recentBox!.height - 2);
  expect(actionBarBox!.x + actionBarBox!.width).toBeLessThanOrEqual(sidebarBox!.x + sidebarBox!.width);

  await alphaCheckbox.click();
  await expect(page.locator("#row-alpha")).toHaveAttribute("data-gptbd-row-selected", "true");
  await expect(page.getByText("1 selected")).toBeVisible();

  await expect.poll(() => page.evaluate(() => window.__navigated)).toBe(false);

  const box = await alphaCheckbox.boundingBox();
  expect(box?.width).toBe(32);
  expect(box?.height).toBe(32);

  const betaLinkBox = await page.getByRole("link", { name: /beta release notes/i }).boundingBox();
  expect(betaLinkBox).not.toBeNull();
  await page.mouse.click(betaLinkBox!.x + Math.min(80, betaLinkBox!.width / 2), betaLinkBox!.y + betaLinkBox!.height / 2);
  await expect(page.locator("#row-beta")).toHaveAttribute("data-gptbd-row-selected", "true");
  await expect(page.getByText("2 selected")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__navigated)).toBe(false);

  const gammaLinkBox = await page.getByRole("link", { name: /gamma qa checklist/i }).boundingBox();
  expect(gammaLinkBox).not.toBeNull();
  await page.mouse.click(
    gammaLinkBox!.x + Math.min(80, gammaLinkBox!.width / 2),
    gammaLinkBox!.y + gammaLinkBox!.height / 2
  );
  await expect(page.locator("#row-gamma")).toHaveAttribute("data-gptbd-row-selected", "true");
  await expect.poll(() => page.evaluate(() => window.__navigated)).toBe(false);
  await expect(page.getByRole("button", { name: "Deselect all" })).toHaveText("None");

  await page.getByRole("checkbox", { name: "Pinned design review is pinned. Unpin before selecting." }).click();
  await expect(page.locator("#row-pinned")).not.toHaveAttribute("data-gptbd-row-selected", "true");
  await expect(page.getByText('"Pinned design review" is pinned. Unpin it in ChatGPT before selecting.')).toBeVisible();

  await page.getByRole("button", { name: "Deselect all" }).click();
  await expect(page.getByText("0 selected", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Select all" }).click();
  await expect(page.getByRole("button", { name: "Deselect all" })).toHaveText("None");
});

test("content script applies archive and delete through visible ChatGPT menu controls", async ({
  page
}) => {
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

  await page.getByRole("checkbox", { name: /select alpha planning thread/i }).click();
  await page.getByRole("button", { name: "Archive" }).click();
  await page.locator("#gptbd-root .dialog").getByRole("button", { name: "Archive" }).click();
  await expect(page.getByRole("link", { name: "Alpha planning thread" })).toHaveCount(0);

  await page.getByRole("checkbox", { name: /select beta release notes/i }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.locator("#gptbd-root .dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("link", { name: /beta release notes/i })).toHaveCount(0);
});

test("content script does not click unrelated page buttons when delete confirmation is missing", async ({
  page
}) => {
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

  await page.getByRole("checkbox", { name: /select gamma qa checklist/i }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.locator("#gptbd-root .dialog").getByRole("button", { name: "Delete" }).click();

  await expect(page.getByRole("link", { name: "Gamma QA checklist" })).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.__voiceClicked)).toBe(false);
  await expect(page.getByText(/0 deleted, 1 failed/i)).toBeVisible();
});

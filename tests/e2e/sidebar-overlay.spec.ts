import { expect, test } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

declare global {
  interface Window {
    __navigated: boolean;
    __voiceClicked: boolean;
    __menuOpened: boolean;
    __apiCalls: string[];
  }
}

function refreshController() {
  const controller = window.__gptbdController as unknown as { refresh: () => void } | undefined;
  controller?.refresh();
}

test("content script uses first-run defaults from browser language", async ({ page }) => {
  await page.addInitScript(() => {
    window.chrome = {
      i18n: {
        getUILanguage() {
          return "ko-KR";
        }
      },
      storage: {
        local: {
          get(key: string, callback: (items: Record<string, unknown>) => void) {
            callback({ [key]: undefined });
          },
          set(_items: Record<string, unknown>, callback?: () => void) {
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

  await expect.poll(() => page.evaluate(() => window.__gptbdController?.getState().extensionEnabled)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__gptbdController?.getState().bulkMode)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__gptbdController?.getState().language)).toBe("ko");
  await expect.poll(() => page.evaluate(() => window.__gptbdController?.getState().sidebarControls)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__gptbdController?.getState().speedMode)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__gptbdController?.getState().speedVisibleMessages)).toBe(10);
  await expect.poll(() => page.evaluate(() => window.__gptbdController?.getState().speedBatchMessages)).toBe(5);
  await expect(page.getByText("일괄 정리 꺼짐", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /alpha planning thread/i })).toHaveCount(0);
});

test("content script keeps the sidebar action bar on its own row in nowrap flex sidebars", async ({ page }) => {
  await page.addInitScript(() => {
    window.chrome = {
      storage: {
        local: {
          get(key: string, callback: (items: Record<string, unknown>) => void) {
            callback({ [key]: undefined });
          },
          set(_items: Record<string, unknown>, callback?: () => void) {
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
  await page.addStyleTag({
    content: `
      body { grid-template-columns: 570px 1fr; }
      nav {
        display: flex;
        flex-wrap: nowrap;
        align-content: flex-start;
        align-items: center;
      }
      nav > .text-token-text-tertiary {
        flex: 0 0 auto;
        width: auto;
      }
      nav > ol {
        flex: 0 0 100%;
      }
    `
  });
  await page.addScriptTag({ path: resolve("dist/assets/content.js") });
  await page.waitForSelector("html[data-gptbd-ready='true']");

  const actionBarBox = await page.locator("[data-gptbd-action-bar='true']").boundingBox();
  const recentBox = await page.getByText("Recent", { exact: true }).boundingBox();
  expect(actionBarBox).not.toBeNull();
  expect(recentBox).not.toBeNull();
  expect(actionBarBox!.y + actionBarBox!.height).toBeLessThanOrEqual(recentBox!.y + 2);
});

test("content script inserts the sidebar action bar outside header-only rows", async ({ page }) => {
  await page.addInitScript(() => {
    window.chrome = {
      storage: {
        local: {
          get(key: string, callback: (items: Record<string, unknown>) => void) {
            callback({ [key]: undefined });
          },
          set(_items: Record<string, unknown>, callback?: () => void) {
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
  await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>(".text-token-text-tertiary");
    if (!header) {
      return;
    }

    const row = document.createElement("div");
    row.dataset.testid = "history-heading-row";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.width = "100%";
    row.style.flexWrap = "nowrap";
    header.style.width = "auto";
    header.style.flex = "0 0 auto";
    header.before(row);
    row.append(header);
  });
  await page.addScriptTag({ path: resolve("dist/assets/content.js") });
  await page.waitForSelector("html[data-gptbd-ready='true']");

  const actionBar = page.locator("[data-gptbd-action-bar='true']");
  const headingRow = page.locator("[data-testid='history-heading-row']");
  await expect(actionBar).toBeVisible();
  await expect(headingRow).toBeVisible();
  await expect(actionBar.locator("xpath=following-sibling::*[1]")).toHaveAttribute("data-testid", "history-heading-row");

  const actionBarBox = await actionBar.boundingBox();
  const recentBox = await page.getByText("Recent", { exact: true }).boundingBox();
  expect(actionBarBox).not.toBeNull();
  expect(recentBox).not.toBeNull();
  expect(actionBarBox!.y + actionBarBox!.height).toBeLessThanOrEqual(recentBox!.y + 2);
});

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
  await expect(page.locator("nav > [data-gptbd-action-bar='true']")).toHaveCount(1);
  await expect(page.locator("#row-alpha a")).toHaveCSS("padding-left", "44px");

  const actionBar = page.locator("[data-gptbd-action-bar='true']");
  const modeSwitch = page.getByRole("switch", { name: "Bulk delete mode" });
  await expect(modeSwitch).toHaveAttribute("aria-checked", "true");
  await expect(modeSwitch.locator(".mode-toggle-thumb")).toBeVisible();
  await modeSwitch.click();
  await expect(modeSwitch).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("Bulk delete off", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /select alpha planning thread/i })).toHaveCount(0);
  await modeSwitch.click();
  await expect(modeSwitch).toHaveAttribute("aria-checked", "true");
  await expect(alphaCheckbox).toBeVisible();

  const actionBarBox = await actionBar.boundingBox();
  const recentBox = await page.getByText("Recent", { exact: true }).boundingBox();
  const sidebarBox = await page.locator("nav").boundingBox();
  expect(actionBarBox).not.toBeNull();
  expect(recentBox).not.toBeNull();
  expect(sidebarBox).not.toBeNull();
  expect(actionBarBox!.y + actionBarBox!.height).toBeLessThanOrEqual(recentBox!.y + 2);
  expect(actionBarBox!.x + actionBarBox!.width).toBeLessThanOrEqual(sidebarBox!.x + sidebarBox!.width);
  await expect(actionBar).toHaveAttribute("data-density", "compact");
  expect(
    await page.evaluate(() => {
      const panel = document.querySelector('[data-gptbd-action-bar="true"]');
      const recent = Array.from(document.querySelectorAll("nav div")).find(
        (element) => element.textContent?.trim() === "Recent"
      );
      return Boolean(panel && recent && panel.nextElementSibling === recent);
    })
  ).toBe(true);

  const actionButtonRows = await page
    .locator("[data-gptbd-action-bar='true'] .toolbar-actions button")
    .evaluateAll((buttons) =>
      Array.from(new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().top))))
    );
  expect(actionButtonRows).toHaveLength(2);

  await page.evaluate(() => window.__gptbdController?.setSidebarControls(false));
  await expect(actionBar).toBeHidden();
  await expect(page.locator("[data-gptbd-action-bar='true']")).toHaveCount(0);
  await expect(alphaCheckbox).toBeVisible();

  await page.evaluate(() => window.__gptbdController?.setSidebarControls(true));
  await expect(actionBar).toBeVisible();
  await expect(page.locator("nav > [data-gptbd-action-bar='true']")).toHaveCount(1);

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

  await page.evaluate(() => {
    const list = document.querySelector("ol");
    for (let index = 0; index < 30; index += 1) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `/c/extra-${index}`;
      link.setAttribute("aria-label", `Extra scroll row ${index}`);
      link.textContent = `Extra scroll row ${index}`;
      item.append(link);
      list?.append(item);
    }
    const controller = window.__gptbdController as unknown as { refresh: () => void } | undefined;
    controller?.refresh();
  });

  const scrollBefore = await page.locator("nav").evaluate((element) => element.scrollTop);
  await page.mouse.move(betaLinkBox!.x + Math.min(80, betaLinkBox!.width / 2), betaLinkBox!.y + betaLinkBox!.height / 2);
  await page.mouse.wheel(0, 420);
  await expect.poll(() => page.locator("nav").evaluate((element) => element.scrollTop)).toBeGreaterThan(scrollBefore);

  await page.locator("nav").evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.evaluate(refreshController);
  const checkboxBox = await alphaCheckbox.boundingBox();
  expect(checkboxBox).not.toBeNull();
  const checkboxScrollBefore = await page.locator("nav").evaluate((element) => element.scrollTop);
  await page.mouse.move(checkboxBox!.x + checkboxBox!.width / 2, checkboxBox!.y + checkboxBox!.height / 2);
  await page.mouse.wheel(0, 420);
  await expect
    .poll(() => page.locator("nav").evaluate((element) => element.scrollTop))
    .toBeGreaterThan(checkboxScrollBefore);

  await page.locator("nav").evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.evaluate(refreshController);

  await page.getByRole("checkbox", { name: "Pinned design review is pinned. Unpin before selecting." }).click();
  await expect(page.locator("#row-pinned")).not.toHaveAttribute("data-gptbd-row-selected", "true");
  const pinnedNotice = page.getByText('"Pinned design review" is pinned. Unpin it in ChatGPT before selecting.');
  await expect(pinnedNotice).toBeVisible();
  const noticeBox = await pinnedNotice.boundingBox();
  const pinnedCheckboxBox = await page
    .getByRole("checkbox", { name: "Pinned design review is pinned. Unpin before selecting." })
    .boundingBox();
  expect(noticeBox).not.toBeNull();
  expect(pinnedCheckboxBox).not.toBeNull();
  expect(noticeBox!.x).toBeGreaterThanOrEqual(pinnedCheckboxBox!.x + pinnedCheckboxBox!.width);
  await expect(pinnedNotice).toBeHidden({ timeout: 4000 });

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

test("content script uses ChatGPT API before scoped UI fallback", async ({ page }) => {
  await page.addInitScript(() => {
    const storage: Record<string, unknown> = { "gptbd.bulkMode": true };
    const originalFetch = window.fetch.bind(window);

    window.__apiCalls = [];
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith("/api/auth/session")) {
        return new Response(JSON.stringify({ accessToken: "test-access-token-1234567890" }), {
          headers: { "Content-Type": "application/json" },
          status: 200
        });
      }

      if (url.includes("/backend-api/conversation/alpha")) {
        window.__apiCalls.push(`${init?.method ?? "GET"} ${url} ${String(init?.body ?? "")}`);
        document.getElementById("row-alpha")?.remove();
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200
        });
      }

      if (url.includes("/backend-api/conversation/beta")) {
        window.__apiCalls.push(`${init?.method ?? "GET"} ${url} ${String(init?.body ?? "")}`);
        document.getElementById("row-beta")?.remove();
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200
        });
      }

      return originalFetch(input, init);
    };

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
  await expect.poll(() => page.evaluate(() => window.__menuOpened)).toBe(false);
  await expect
    .poll(() => page.evaluate(() => window.__apiCalls.some((call) => call.includes('"is_archived":true'))))
    .toBe(true);

  await page.getByRole("checkbox", { name: /select beta release notes/i }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.locator("#gptbd-root .dialog").getByRole("button", { name: "Delete" }).click();

  await expect(page.getByRole("link", { name: /beta release notes/i })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__menuOpened)).toBe(false);
  await expect
    .poll(() => page.evaluate(() => window.__apiCalls.some((call) => call.includes('"is_visible":false'))))
    .toBe(true);
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

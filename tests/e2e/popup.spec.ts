import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

declare global {
  interface Window {
    __popupStorage: Record<string, unknown>;
  }
}

test("popup switches between Korean and English UI", async ({ page }) => {
  await page.addInitScript(() => {
    const storage: Record<string, unknown> = {
      "gptbd.language": "ko",
      "gptbd.sidebarControls": true,
      "gptbd.speedMode": false
    };

    window.__popupStorage = storage;
    window.chrome = {
      i18n: {
        getUILanguage() {
          return "ko-KR";
        }
      },
      storage: {
        local: {
          async get(key: string) {
            return { [key]: storage[key] };
          },
          async set(items: Record<string, unknown>) {
            Object.assign(storage, items);
          }
        }
      },
      tabs: {
        async query() {
          return [{ id: 1 }];
        },
        async sendMessage(
          _tabId: number,
          message: { type: string; language?: "en" | "ko"; enabled?: boolean }
        ) {
          if (message.type === "GPTBD_SET_LANGUAGE" && message.language) {
            storage["gptbd.language"] = message.language;
          }
          if (message.type === "GPTBD_SET_SIDEBAR_CONTROLS") {
            storage["gptbd.sidebarControls"] = Boolean(message.enabled);
          }
          if (message.type === "GPTBD_SET_SPEED_MODE") {
            storage["gptbd.speedMode"] = Boolean(message.enabled);
          }

          return {
            available: true,
            bulkMode: false,
            selectedCount: 0,
            visibleCount: 0,
            isDeleting: false,
            language: storage["gptbd.language"] ?? "ko",
            sidebarControls: storage["gptbd.sidebarControls"] ?? true,
            speedMode: storage["gptbd.speedMode"] ?? false
          };
        }
      }
    } as unknown as typeof chrome;
  });

  await page.goto(pathToFileURL(resolve("dist/popup.html")).toString());
  await page.addScriptTag({ path: resolve("dist/assets/popup.js") });

  await expect(page.getByRole("heading", { name: "정리" })).toBeVisible();
  await expect(page.getByRole("button", { name: "영어로 전환" })).toHaveText("EN");
  await expect(page.getByRole("switch", { name: "좌측 일괄 컨트롤 표시" })).toHaveAttribute(
    "aria-checked",
    "true"
  );
  await expect(page.getByRole("switch", { name: "긴 대화 속도 모드" })).toHaveAttribute(
    "aria-checked",
    "false"
  );

  await page.getByRole("button", { name: "영어로 전환" }).click();

  await expect(page.getByRole("heading", { name: "Cleaner" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Switch language to Korean" })).toHaveText("KO");
  await expect.poll(() => page.evaluate(() => window.__popupStorage["gptbd.language"])).toBe("en");

  await page.getByRole("switch", { name: "Show sidebar bulk controls" }).click();
  await expect(page.getByRole("switch", { name: "Show sidebar bulk controls" })).toHaveAttribute(
    "aria-checked",
    "false"
  );
  await expect.poll(() => page.evaluate(() => window.__popupStorage["gptbd.sidebarControls"])).toBe(false);

  await page.getByRole("switch", { name: "Speed mode for long conversations" }).click();
  await expect(page.getByRole("switch", { name: "Speed mode for long conversations" })).toHaveAttribute(
    "aria-checked",
    "true"
  );
  await expect.poll(() => page.evaluate(() => window.__popupStorage["gptbd.speedMode"])).toBe(true);
});

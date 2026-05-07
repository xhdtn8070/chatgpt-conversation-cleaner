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
      "gptbd.enabled": true,
      "gptbd.bulkMode": false,
      "gptbd.language": "ko",
      "gptbd.sidebarControls": true,
      "gptbd.speedMode": false,
      "gptbd.speedVisibleMessages": 10,
      "gptbd.speedBatchMessages": 5
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
          message: {
            type: string;
            language?: "en" | "ko";
            enabled?: boolean;
            visibleMessages?: number;
            batchMessages?: number;
          }
        ) {
          if (message.type === "GPTBD_SET_LANGUAGE" && message.language) {
            storage["gptbd.language"] = message.language;
          }
          if (message.type === "GPTBD_SET_EXTENSION_ENABLED") {
            storage["gptbd.enabled"] = Boolean(message.enabled);
          }
          if (message.type === "GPTBD_SET_BULK_MODE") {
            storage["gptbd.bulkMode"] = Boolean(message.enabled);
          }
          if (message.type === "GPTBD_SET_SIDEBAR_CONTROLS") {
            storage["gptbd.sidebarControls"] = Boolean(message.enabled);
          }
          if (message.type === "GPTBD_SET_SPEED_MODE") {
            storage["gptbd.speedMode"] = Boolean(message.enabled);
          }
          if (message.type === "GPTBD_SET_SPEED_SETTINGS") {
            storage["gptbd.speedVisibleMessages"] = message.visibleMessages;
            storage["gptbd.speedBatchMessages"] = message.batchMessages;
          }
          return {
            available: true,
            extensionEnabled: storage["gptbd.enabled"] ?? true,
            bulkMode: storage["gptbd.bulkMode"] ?? false,
            selectedCount: 0,
            visibleCount: 0,
            isDeleting: false,
            language: storage["gptbd.language"] ?? "ko",
            sidebarControls: storage["gptbd.sidebarControls"] ?? true,
            speedMode: storage["gptbd.speedMode"] ?? false,
            speedVisibleMessages: storage["gptbd.speedVisibleMessages"] ?? 10,
            speedBatchMessages: storage["gptbd.speedBatchMessages"] ?? 5,
            speedRenderStatus: "complete",
            speedRenderMs: 1234,
            speedRenderMessageCount: 30
          };
        }
      }
    } as unknown as typeof chrome;
  });

  await page.goto(pathToFileURL(resolve("dist/popup.html")).toString());
  await page.addScriptTag({ path: resolve("dist/assets/popup.js") });

  await expect(page.getByRole("heading", { name: "정리" })).toBeVisible();
  await expect(page.getByRole("button", { name: "영어로 전환" })).toHaveText("EN");
  await expect(page.getByText("모든 기능은 계속 무료예요.")).toBeVisible();
  await expect(page.getByRole("link", { name: "커피 한 잔 보내기" })).toHaveAttribute(
    "href",
    "https://www.buymeacoffee.com/tikim"
  );
  await expect(page.getByRole("link", { name: "GitHub에서 소스 보기" })).toHaveAttribute(
    "href",
    "https://github.com/xhdtn8070/chatgpt-conversation-cleaner"
  );
  await expect(
    page.getByRole("switch", { name: "Conversation Cleaner 전체 켜기 또는 끄기" })
  ).toBeChecked();
  await expect(page.getByRole("switch", { name: "정리 모드" })).toHaveAttribute(
    "aria-checked",
    "false"
  );
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
  await expect(page.getByText("All features stay free.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Buy me a coffee" })).toHaveAttribute(
    "href",
    "https://www.buymeacoffee.com/tikim"
  );
  await expect(page.getByRole("link", { name: "View source on GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/xhdtn8070/chatgpt-conversation-cleaner"
  );
  await expect.poll(() => page.evaluate(() => window.__popupStorage["gptbd.language"])).toBe("en");

  await page.getByRole("switch", { name: "Cleanup mode" }).click();
  await expect(page.getByRole("switch", { name: "Cleanup mode" })).toHaveAttribute(
    "aria-checked",
    "true"
  );
  await expect.poll(() => page.evaluate(() => window.__popupStorage["gptbd.bulkMode"])).toBe(true);

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
  await expect(page.getByText("Recent 10 · Load 5 each")).toBeVisible();
  await expect(page.getByRole("region", { name: "Speed mode settings" })).toBeVisible();
  await expect(page.getByText("Render: 1.23 s")).toBeVisible();
  await page.getByLabel("Recent messages").fill("12");
  await page.getByLabel("Load more size").fill("3");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Recent 12 · Load 3 each")).toBeVisible();
  await expect(page.getByText("Saved")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__popupStorage["gptbd.speedMode"])).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__popupStorage["gptbd.speedVisibleMessages"])).toBe(12);
  await expect.poll(() => page.evaluate(() => window.__popupStorage["gptbd.speedBatchMessages"])).toBe(3);

  await page.getByRole("switch", { name: "Turn Conversation Cleaner on or off" }).click();
  await expect.poll(() => page.evaluate(() => window.__popupStorage["gptbd.enabled"])).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__popupStorage["gptbd.bulkMode"])).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__popupStorage["gptbd.speedMode"])).toBe(true);
  await expect(page.getByRole("switch", { name: "Cleanup mode" })).toHaveAttribute(
    "aria-checked",
    "true"
  );
  await expect(page.getByRole("switch", { name: "Speed mode for long conversations" })).toHaveAttribute(
    "aria-checked",
    "true"
  );
  await expect(page.getByRole("region", { name: "Speed mode settings" })).toBeVisible();
  await expect(page.getByText("Extension off")).toBeVisible();
});

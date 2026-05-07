import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

declare global {
  interface Window {
    __speedApiCalls: number;
  }
}

test("speed mode trims ChatGPT conversation fetch and reveals cached older messages", async ({
  page
}) => {
  const conversation = buildConversation(30);
  let apiCalls = 0;

  await page.addInitScript(() => {
    const storage: Record<string, unknown> = {
      "gptbd.bulkMode": false,
      "gptbd.speedMode": true,
      "gptbd.sidebarControls": true
    };

    window.__speedApiCalls = 0;
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
  await page.addInitScript({ path: resolve("dist/assets/speed-main.js") });

  await page.route("https://chatgpt.com/c/speed-alpha", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: conversationHtml()
    });
  });
  await page.route("https://chatgpt.com/backend-api/conversation/speed-alpha", async (route) => {
    apiCalls += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(conversation)
    });
  });

  await page.goto("https://chatgpt.com/c/speed-alpha");
  await page.waitForFunction(() => document.querySelectorAll("section[data-testid^='conversation-turn-']").length === 20);
  await expect.poll(() => apiCalls).toBe(1);

  await page.addScriptTag({ path: resolve("dist/assets/content.js") });
  await page.waitForSelector("html[data-gptbd-ready='true']");

  await expect(page.getByText("10 hidden · 20 shown")).toBeVisible();
  await page.getByRole("button", { name: "Load 2 more" }).click();
  await expect(page.locator(".gptbd-speed-turn")).toHaveCount(2);
  await expect(page.getByText("8 hidden · 22 shown")).toBeVisible();
  await expect.poll(() => apiCalls).toBe(1);

  await page.getByRole("button", { name: "Load 2 more" }).click();
  await expect(page.locator(".gptbd-speed-turn")).toHaveCount(4);
  await expect(page.getByText("6 hidden · 24 shown")).toBeVisible();
  await expect.poll(() => apiCalls).toBe(1);

  await page.getByRole("button", { name: "View all" }).click();
  await page.waitForFunction(() => document.querySelectorAll("section[data-testid^='conversation-turn-']").length === 30);
  await expect.poll(() => apiCalls).toBe(2);
});

function conversationHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Mock ChatGPT Conversation</title>
    <script>
      localStorage.setItem("gptbd.speedBridge", JSON.stringify({
        enabled: true,
        visibleMessages: 20,
        batchMessages: 2
      }));
      window.__speedApiCalls = window.__speedApiCalls || 0;
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (...args) => {
        const url = typeof args[0] === "string" ? args[0] : args[0].url;
        if (String(url).includes("/backend-api/conversation/speed-alpha")) {
          window.__speedApiCalls += 1;
        }
        return originalFetch(...args);
      };
    </script>
  </head>
  <body>
    <main>
      <div id="thread"></div>
    </main>
    <script>
      function visibleNodes(data) {
        const mapping = data.mapping;
        const chain = [];
        let id = data.current_node;
        while (id && mapping[id]) {
          chain.push(id);
          id = mapping[id].parent;
        }
        return chain.reverse().filter((nodeId) => {
          const role = mapping[nodeId].message?.author?.role;
          return role === "user" || role === "assistant" || role === "tool";
        });
      }

      async function render() {
        const response = await fetch("/backend-api/conversation/speed-alpha");
        const data = await response.json();
        const thread = document.getElementById("thread");
        thread.replaceChildren();

        for (const nodeId of visibleNodes(data)) {
          const node = data.mapping[nodeId];
          const section = document.createElement("section");
          section.dataset.testid = "conversation-turn-" + nodeId;
          section.dataset.turnId = nodeId;
          section.textContent = node.message.content.parts.join("");
          thread.append(section);
        }
      }

      render();
    </script>
  </body>
</html>`;
}

function buildConversation(messageCount: number): Record<string, unknown> {
  const mapping: Record<string, unknown> = {
    root: {
      id: "root",
      parent: null,
      children: ["msg-1"],
      message: null
    }
  };

  for (let index = 1; index <= messageCount; index += 1) {
    const id = `msg-${index}`;
    const next = index < messageCount ? `msg-${index + 1}` : null;

    mapping[id] = {
      id,
      parent: index === 1 ? "root" : `msg-${index - 1}`,
      children: next ? [next] : [],
      message: {
        id,
        author: {
          role: index % 2 === 0 ? "assistant" : "user"
        },
        create_time: index,
        content: {
          content_type: "text",
          parts: [`Message ${index}`]
        }
      }
    };
  }

  return {
    mapping,
    current_node: `msg-${messageCount}`,
    root: "root"
  };
}

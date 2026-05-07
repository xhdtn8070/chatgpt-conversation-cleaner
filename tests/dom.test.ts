import { collectConversationRows, findSidebarRoot, getConversationId, normalizeTitle } from "../src/content/dom";
import { mockRect, rect } from "./test-utils";

describe("sidebar conversation parser", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <nav data-testid="sidebar">
        <ol>
          <li id="row-alpha"><a id="alpha" href="/c/alpha-123"> Alpha   Project </a></li>
          <li id="row-beta"><a id="beta" href="/c/beta-456" aria-label="Beta plan"></a></li>
          <li id="row-duplicate"><a id="alpha-duplicate" href="/c/alpha-123">Duplicate</a></li>
          <li id="row-pinned"><a id="pinned" href="/c/pinned-789">Pinned plan</a><button aria-label="Unpin conversation"></button></li>
        </ol>
      </nav>
      <main>
        <a id="outside" href="/c/outside-999">Outside link</a>
      </main>
    `;

    const sidebar = document.querySelector("nav")!;
    mockRect(sidebar, rect(0, 0, 320, 800));
    mockRect(document.getElementById("row-alpha")!, rect(8, 80, 300, 44));
    mockRect(document.getElementById("alpha")!, rect(16, 84, 280, 36));
    mockRect(document.getElementById("row-beta")!, rect(8, 128, 300, 44));
    mockRect(document.getElementById("beta")!, rect(16, 132, 280, 36));
    mockRect(document.getElementById("row-duplicate")!, rect(8, 176, 300, 44));
    mockRect(document.getElementById("alpha-duplicate")!, rect(16, 180, 280, 36));
    mockRect(document.getElementById("row-pinned")!, rect(8, 224, 300, 44));
    mockRect(document.getElementById("pinned")!, rect(16, 228, 280, 36));
    mockRect(document.getElementById("outside")!, rect(620, 80, 240, 36));
  });

  it("extracts conversation ids from ChatGPT URLs", () => {
    expect(getConversationId("https://chatgpt.com/c/abc-123?model=gpt")).toBe("abc-123");
    expect(getConversationId("/c/local-id")).toBe("local-id");
    expect(getConversationId("/g/g-custom")).toBeNull();
  });

  it("normalizes titles", () => {
    expect(normalizeTitle("  A   long\n title  ")).toBe("A long title");
  });

  it("chooses the sidebar root", () => {
    expect(findSidebarRoot()).toBe(document.querySelector("nav"));
  });

  it("collects visible unique sidebar conversation rows", () => {
    const rows = collectConversationRows();

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.id)).toEqual(["alpha-123", "beta-456", "pinned-789"]);
    expect(rows[0].title).toBe("Alpha Project");
    expect(rows[1].title).toBe("Beta plan");
    expect(rows[2].isPinned).toBe(true);
  });
});

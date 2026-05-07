import { trimChatGptConversation } from "../src/content/speed-trim";

describe("ChatGPT speed trim utility", () => {
  it("trims the active mapping chain and reconnects kept nodes", () => {
    const conversation = buildConversation(30);
    const result = trimChatGptConversation(conversation, 20);

    expect(result).not.toBeNull();
    expect(result?.trimmed).toBe(true);
    expect(result?.stats.totalVisible).toBe(30);
    expect(result?.stats.keptVisible).toBe(20);
    expect(result?.stats.hiddenVisible).toBe(10);
    expect(result?.stats.nativeStartIndex).toBe(10);

    const mapping = result?.data.mapping as Record<
      string,
      { parent: string | null; children: string[]; message?: { author?: { role?: string } } }
    >;
    const visibleRoles = Object.values(mapping)
      .map((node) => node.message?.author?.role)
      .filter((role) => role === "user" || role === "assistant" || role === "tool");

    expect(visibleRoles).toHaveLength(20);
    expect(mapping["msg-11"].parent).toBe("root");
    expect(mapping.root.children).toEqual(["msg-11"]);
    expect(mapping["msg-30"].children).toEqual([]);
  });
});

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

const CONTENT_SOURCE = "gptbd-content";
const PAGE_SOURCE = "gptbd-page";
const SETTINGS_KEY = "gptbd.speedBridge.v2";
const CONVERSATION_API_PATH = /\/backend-api\/conversation\/([^/?#]+)/;
const ACK_TIMEOUT_MS = 80;

type BridgeSettings = {
  enabled: boolean;
  visibleMessages: number;
  batchMessages: number;
};

type ConversationApiPayload = {
  id: string;
  source: typeof PAGE_SOURCE;
  type: "GPTBD_CONVERSATION_API_READY";
  conversationId: string;
  messageCount: number;
  visibleMessages: number;
  batchMessages: number;
  startedAt: number;
  readyAt: number;
};

declare global {
  interface Window {
    __gptbdConversationApiBridgeInstalled?: boolean;
  }
}

export function installConversationApiBridge(): void {
  if (window.__gptbdConversationApiBridgeInstalled || typeof window.fetch !== "function") {
    return;
  }

  window.__gptbdConversationApiBridgeInstalled = true;
  let settings = readSettings();
  const originalFetch = window.fetch.bind(window);

  window.addEventListener("message", (event) => {
    if (event.source !== window || !isSettingsMessage(event.data)) {
      return;
    }

    settings = normalizeSettings(event.data.settings);
  });

  window.fetch = async (...args) => {
    const startedAt = performance.now();
    const response = await originalFetch(...args);
    const requestUrl = getRequestUrl(args[0], response.url);
    const conversationId = getConversationId(requestUrl);

    if (!conversationId || !settings.enabled || !isJsonResponse(response)) {
      return response;
    }

    try {
      const messageCount = countConversationMessages(await response.clone().json());

      if (messageCount > settings.visibleMessages) {
        await notifyApiReady({
          id: createId(),
          source: PAGE_SOURCE,
          type: "GPTBD_CONVERSATION_API_READY",
          conversationId,
          messageCount,
          visibleMessages: Math.min(settings.visibleMessages, messageCount),
          batchMessages: settings.batchMessages,
          startedAt,
          readyAt: performance.now()
        });
      }
    } catch {
      // If ChatGPT changes the response shape, leave its native fetch untouched.
    }

    return response;
  };
}

function notifyApiReady(payload: ConversationApiPayload): Promise<void> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handleAck);
      resolve();
    }, ACK_TIMEOUT_MS);

    function handleAck(event: MessageEvent): void {
      if (event.source !== window || !isAckMessage(event.data, payload.id)) {
        return;
      }

      window.clearTimeout(timeout);
      window.removeEventListener("message", handleAck);
      resolve();
    }

    window.addEventListener("message", handleAck);
    window.postMessage(payload, "*");
  });
}

function readSettings(): BridgeSettings {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}"));
  } catch {
    return normalizeSettings({});
  }
}

function normalizeSettings(settings: unknown): BridgeSettings {
  const raw = settings && typeof settings === "object" ? settings as Record<string, unknown> : {};

  return {
    enabled: raw.enabled === true,
    visibleMessages: clampNumber(raw.visibleMessages, 1, 100, 10),
    batchMessages: clampNumber(raw.batchMessages, 1, 50, 5)
  };
}

function isSettingsMessage(data: unknown): data is {
  source: typeof CONTENT_SOURCE;
  type: "GPTBD_SPEED_SETTINGS";
  settings: unknown;
} {
  return (
    Boolean(data) &&
    typeof data === "object" &&
    (data as { source?: unknown }).source === CONTENT_SOURCE &&
    (data as { type?: unknown }).type === "GPTBD_SPEED_SETTINGS"
  );
}

function isAckMessage(data: unknown, id: string): boolean {
  return (
    Boolean(data) &&
    typeof data === "object" &&
    (data as { source?: unknown }).source === CONTENT_SOURCE &&
    (data as { type?: unknown }).type === "GPTBD_CONVERSATION_API_READY_ACK" &&
    (data as { id?: unknown }).id === id
  );
}

function getRequestUrl(input: RequestInfo | URL, responseUrl: string): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url || responseUrl;
}

function getConversationId(url: string): string | null {
  try {
    return new URL(url, window.location.href).pathname.match(CONVERSATION_API_PATH)?.[1] ?? null;
  } catch {
    return null;
  }
}

function isJsonResponse(response: Response): boolean {
  return response.headers.get("content-type")?.toLowerCase().includes("json") ?? false;
}

function countConversationMessages(data: unknown): number {
  const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const mapping = record.mapping && typeof record.mapping === "object"
    ? record.mapping as Record<string, unknown>
    : null;
  const currentNode = typeof record.current_node === "string" ? record.current_node : null;

  if (!mapping || !currentNode || !mapping[currentNode]) {
    return 0;
  }

  const chain = collectCurrentChain(mapping, currentNode);
  return chain.filter((nodeId) => isVisibleConversationNode(mapping[nodeId])).length;
}

function collectCurrentChain(mapping: Record<string, unknown>, currentNode: string): string[] {
  const chain: string[] = [];
  const seen = new Set<string>();
  let nodeId: string | null = currentNode;

  while (nodeId && mapping[nodeId] && !seen.has(nodeId)) {
    seen.add(nodeId);
    chain.push(nodeId);
    const node = mapping[nodeId] as Record<string, unknown>;
    nodeId = typeof node.parent === "string" ? node.parent : null;
  }

  return chain.reverse();
}

function isVisibleConversationNode(node: unknown): boolean {
  const nodeRecord = node && typeof node === "object" ? node as Record<string, unknown> : {};
  const message = nodeRecord.message && typeof nodeRecord.message === "object"
    ? nodeRecord.message as Record<string, unknown>
    : null;
  const author = message?.author && typeof message.author === "object"
    ? message.author as Record<string, unknown>
    : null;
  const role = author?.role;

  return role === "user" || role === "assistant" || role === "tool";
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.floor(value)))
    : fallback;
}

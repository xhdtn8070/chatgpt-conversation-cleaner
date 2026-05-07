import {
  getConversationIdFromApiUrl,
  getOlderTurns,
  trimChatGptConversation,
  type ConversationTrimResult,
  type SpeedTurn
} from "./speed-trim";

const PAGE_SOURCE = "gptbd-main";
const CONTENT_SOURCE = "gptbd-content";
const BRIDGE_KEY = "gptbd.speedBridge";
const BYPASS_KEY = "gptbd.speedBypassOnce";
const TRIMMED_ATTR = "data-gptbd-speed-trimmed";
const CONVERSATION_ATTR = "data-gptbd-speed-conversation-id";
const DEFAULT_SETTINGS: SpeedSettings = {
  enabled: false,
  visibleMessages: 10,
  batchMessages: 2
};

type SpeedSettings = {
  enabled: boolean;
  visibleMessages: number;
  batchMessages: number;
};

type CacheEntry = {
  conversationId: string;
  url: string;
  original: Record<string, unknown>;
  turns: SpeedTurn[];
  stats: ConversationTrimResult["stats"];
  responseMeta: {
    status: number;
    statusText: string;
    headers: [string, string][];
    url: string;
  };
};

type ContentRequest = {
  source?: string;
  type?: string;
  requestId?: string;
  settings?: Partial<SpeedSettings>;
  conversationId?: string;
  olderCount?: number;
};

declare global {
  interface Window {
    __gptbdSpeedPatched?: boolean;
  }
}

const cache = new Map<string, CacheEntry>();
let settings = readSettings();

if (!window.__gptbdSpeedPatched) {
  window.__gptbdSpeedPatched = true;
  patchFetch();
  bindMessages();
}

function patchFetch(): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = parseFetchInput(input, init);

    if (request.conversationId && request.method !== "GET") {
      cache.delete(request.conversationId);
      clearTrimmedAttributes(request.conversationId);
      return originalFetch(input, init);
    }

    if (!request.conversationId || request.method !== "GET") {
      return originalFetch(input, init);
    }

    settings = readSettings();

    if (!settings.enabled) {
      clearTrimmedAttributes(request.conversationId);
      return originalFetch(input, init);
    }

    if (consumeBypassFlag()) {
      cache.delete(request.conversationId);
      clearTrimmedAttributes(request.conversationId);
      return originalFetch(input, init);
    }

    const cached = cache.get(request.conversationId);

    if (cached) {
      const trimmed = trimChatGptConversation(cached.original, settings.visibleMessages);

      if (trimmed?.trimmed) {
        cache.set(request.conversationId, {
          ...cached,
          turns: trimmed.turns,
          stats: trimmed.stats
        });
        setTrimmedAttributes(request.conversationId);
        return buildResponse(cached.responseMeta, JSON.stringify(trimmed.data));
      }
    }

    const response = await originalFetch(input, init);

    if (!response.ok) {
      return response;
    }

    try {
      const text = stripBom(await response.clone().text());
      const data = JSON.parse(text) as Record<string, unknown>;
      const trimmed = trimChatGptConversation(data, settings.visibleMessages);

      if (!trimmed) {
        return response;
      }

      cache.set(request.conversationId, {
        conversationId: request.conversationId,
        url: request.url,
        original: data,
        turns: trimmed.turns,
        stats: trimmed.stats,
        responseMeta: {
          status: response.status,
          statusText: response.statusText,
          headers: [...new Headers(response.headers)],
          url: response.url
        }
      });

      if (!trimmed.trimmed) {
        clearTrimmedAttributes(request.conversationId);
        return response;
      }

      setTrimmedAttributes(request.conversationId);
      return buildResponse(
        {
          status: response.status,
          statusText: response.statusText,
          headers: [...new Headers(response.headers)],
          url: response.url
        },
        JSON.stringify(trimmed.data)
      );
    } catch {
      return response;
    }
  };
}

function bindMessages(): void {
  window.addEventListener("message", (event: MessageEvent<ContentRequest>) => {
    if (event.source !== window || event.data?.source !== CONTENT_SOURCE) {
      return;
    }

    const request = event.data;

    if (request.type === "GPTBD_SPEED_SETTINGS") {
      settings = normalizeSettings(request.settings);
      writeSettings(settings);
      return;
    }

    if (!request.requestId) {
      return;
    }

    if (request.type === "GPTBD_SPEED_GET_STATUS") {
      respond(request.requestId, getStatus(request.conversationId));
      return;
    }

    if (request.type === "GPTBD_SPEED_GET_OLDER") {
      respond(request.requestId, getOlder(request.conversationId, request.olderCount));
      return;
    }

    if (request.type === "GPTBD_SPEED_BYPASS_FULL") {
      try {
        localStorage.setItem(BYPASS_KEY, "true");
      } catch {
        // Ignore localStorage failures; the next fetch will simply keep trimming.
      }
      respond(request.requestId, { ok: true });
    }
  });
}

function getStatus(conversationId: string | undefined): Record<string, unknown> {
  const entry = conversationId ? cache.get(conversationId) : null;

  if (!entry) {
    return {
      cacheReady: false,
      enabled: settings.enabled,
      visibleMessages: settings.visibleMessages,
      batchMessages: settings.batchMessages
    };
  }

  return {
    cacheReady: true,
    enabled: settings.enabled,
    conversationId: entry.conversationId,
    totalVisible: entry.stats.totalVisible,
    nativeVisible: entry.stats.keptVisible,
    hiddenVisible: entry.stats.hiddenVisible,
    nativeStartIndex: entry.stats.nativeStartIndex,
    visibleMessages: settings.visibleMessages,
    batchMessages: settings.batchMessages,
    trimmed: entry.stats.hiddenVisible > 0
  };
}

function getOlder(
  conversationId: string | undefined,
  olderCount: number | undefined
): Record<string, unknown> {
  const entry = conversationId ? cache.get(conversationId) : null;

  if (!entry) {
    return { cacheReady: false, turns: [] };
  }

  return {
    cacheReady: true,
    turns: getOlderTurns(entry.turns, entry.stats.nativeStartIndex, olderCount ?? 0)
  };
}

function respond(requestId: string, payload: Record<string, unknown>): void {
  window.postMessage(
    {
      source: PAGE_SOURCE,
      type: "GPTBD_SPEED_RESPONSE",
      requestId,
      payload
    },
    "*"
  );
}

function parseFetchInput(
  input: RequestInfo | URL,
  init?: RequestInit
): { url: string; method: string; conversationId: string | null } {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const method = (
    init?.method ??
    (input instanceof Request ? input.method : "GET")
  ).toUpperCase();

  return {
    url,
    method,
    conversationId: getConversationIdFromApiUrl(url)
  };
}

function buildResponse(
  meta: CacheEntry["responseMeta"],
  body: string
): Response {
  const headers = new Headers(meta.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.delete("content-length");
  headers.delete("content-encoding");

  const response = new Response(body, {
    status: meta.status,
    statusText: meta.statusText,
    headers
  });
  Object.defineProperty(response, "url", { value: meta.url });
  return response;
}

function setTrimmedAttributes(conversationId: string): void {
  document.documentElement.setAttribute(TRIMMED_ATTR, "true");
  document.documentElement.setAttribute(CONVERSATION_ATTR, conversationId);
  window.dispatchEvent(new CustomEvent("gptbd-speed-cache-updated"));
}

function clearTrimmedAttributes(conversationId: string): void {
  if (document.documentElement.getAttribute(CONVERSATION_ATTR) === conversationId) {
    document.documentElement.removeAttribute(TRIMMED_ATTR);
    document.documentElement.removeAttribute(CONVERSATION_ATTR);
  }
}

function consumeBypassFlag(): boolean {
  try {
    if (localStorage.getItem(BYPASS_KEY) !== "true") {
      return false;
    }

    localStorage.removeItem(BYPASS_KEY);
    return true;
  } catch {
    return false;
  }
}

function readSettings(): SpeedSettings {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(BRIDGE_KEY) ?? "null"));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(nextSettings: SpeedSettings): void {
  try {
    localStorage.setItem(BRIDGE_KEY, JSON.stringify(nextSettings));
  } catch {
    // MAIN world cannot fall back to chrome.storage; keep the in-memory value.
  }
}

function normalizeSettings(input: unknown): SpeedSettings {
  const raw = input && typeof input === "object" ? (input as Partial<SpeedSettings>) : {};

  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_SETTINGS.enabled,
    visibleMessages: DEFAULT_SETTINGS.visibleMessages,
    batchMessages: clampNumber(raw.batchMessages, DEFAULT_SETTINGS.batchMessages, 1, 50)
  };
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.floor(value)))
    : fallback;
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

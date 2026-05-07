import { t, type LanguageCode, type MessageKey } from "./i18n";

export const SPEED_BRIDGE_KEY = "gptbd.speedBridge.v2";
export const SPEED_DEFAULTS = {
  visibleMessages: 10,
  batchMessages: 2
} as const;
export type SpeedSettings = {
  visibleMessages: number;
  batchMessages: number;
};

const CONTENT_SOURCE = "gptbd-content";
const PAGE_SOURCE = "gptbd-main";
const REQUEST_TIMEOUT_MS = 1200;
const CONVERSATION_PATH = /\/c\/([^/?#]+)/;
const MESSAGE_SELECTOR = 'main section[data-testid^="conversation-turn-"]';

type SpeedStatus = {
  cacheReady: boolean;
  enabled: boolean;
  conversationId?: string;
  totalVisible?: number;
  nativeVisible?: number;
  hiddenVisible?: number;
  nativeStartIndex?: number;
  visibleMessages: number;
  batchMessages: number;
  trimmed?: boolean;
};

type SpeedTurn = {
  id: string;
  nodeId: string;
  role: "user" | "assistant" | "tool" | "system" | "unknown";
  text: string;
  truncated: boolean;
};

type SpeedResponse = {
  source?: string;
  type?: string;
  requestId?: string;
  payload?: unknown;
};

type PendingRequest = {
  resolve: (payload: unknown) => void;
  timeout: number;
};

export class SpeedControls {
  private enabled = false;
  private language: LanguageCode = "en";
  private settings: SpeedSettings = { ...SPEED_DEFAULTS };
  private renderedOlderCount = 0;
  private currentConversationId: string | null = null;
  private root: HTMLElement | null = null;
  private olderList: HTMLElement | null = null;
  private mutationObserver: MutationObserver | null = null;
  private pending = new Map<string, PendingRequest>();
  private refreshQueued = false;
  private lastUrl = window.location.href;
  private urlPoll: number | null = null;

  init(enabled: boolean, language: LanguageCode, settings: SpeedSettings): void {
    this.enabled = enabled;
    this.language = language;
    this.settings = settings;
    this.writeBridge();
    this.bindPageMessages();
    this.bindObservers();
    this.scheduleRefresh();
  }

  async setEnabled(enabled: boolean): Promise<void> {
    if (this.enabled === enabled) {
      return;
    }

    this.enabled = enabled;
    this.renderedOlderCount = 0;
    this.writeBridge();

    if (!isConversationPage()) {
      this.cleanup();
      return;
    }

    const status = await this.requestStatus().catch(() => null);

    if (enabled) {
      if (!status?.trimmed) {
        window.location.reload();
      } else {
        this.scheduleRefresh();
      }
      return;
    }

    this.cleanup();

    if (status?.trimmed) {
      await this.requestPage("GPTBD_SPEED_BYPASS_FULL", {});
      window.location.reload();
    }
  }

  setLanguage(language: LanguageCode): void {
    this.language = language;
    this.scheduleRefresh();
  }

  setSettings(settings: SpeedSettings): void {
    this.settings = settings;
    this.writeBridge();
    this.scheduleRefresh();
  }

  getEnabled(): boolean {
    return this.enabled;
  }

  private bindPageMessages(): void {
    window.addEventListener("message", (event: MessageEvent<SpeedResponse>) => {
      if (event.source !== window || event.data?.source !== PAGE_SOURCE) {
        return;
      }

      const requestId = event.data.requestId;

      if (!requestId) {
        return;
      }

      const pending = this.pending.get(requestId);

      if (!pending) {
        return;
      }

      window.clearTimeout(pending.timeout);
      this.pending.delete(requestId);
      pending.resolve(event.data.payload);
    });
  }

  private bindObservers(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      if (mutations.every((mutation) => this.isOwnMutation(mutation))) {
        return;
      }

      this.scheduleRefresh();
    });
    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("gptbd-speed-cache-updated", () => this.scheduleRefresh());
    window.addEventListener("popstate", () => this.handleUrlMaybeChanged());
    this.patchHistoryMethod("pushState");
    this.patchHistoryMethod("replaceState");
    this.urlPoll = window.setInterval(() => this.handleUrlMaybeChanged(), 500);
  }

  private patchHistoryMethod(method: "pushState" | "replaceState"): void {
    const original = history[method].bind(history);

    history[method] = (...args: Parameters<typeof history.pushState>) => {
      original(...args);
      this.handleUrlMaybeChanged();
    };
  }

  private handleUrlMaybeChanged(): void {
    if (this.lastUrl === window.location.href) {
      return;
    }

    this.lastUrl = window.location.href;
    this.currentConversationId = null;
    this.renderedOlderCount = 0;
    this.cleanup();
    this.scheduleRefresh();
  }

  private scheduleRefresh(): void {
    if (this.refreshQueued) {
      return;
    }

    this.refreshQueued = true;
    window.requestAnimationFrame(() => {
      this.refreshQueued = false;
      void this.refresh();
    });
  }

  private async refresh(): Promise<void> {
    if (!this.enabled || !isConversationPage()) {
      this.cleanup();
      return;
    }

    const status = await this.requestStatus().catch(() => null);

    if (!status?.cacheReady || !status.trimmed || !status.conversationId) {
      this.cleanup();
      return;
    }

    if (this.currentConversationId !== status.conversationId) {
      this.currentConversationId = status.conversationId;
      this.renderedOlderCount = 0;
    }

    await this.render(status);
  }

  private async render(status: SpeedStatus): Promise<void> {
    const firstMessage = document.querySelector<HTMLElement>(MESSAGE_SELECTOR);
    const container = firstMessage?.parentElement;

    if (!container) {
      this.cleanup();
      return;
    }

    const hiddenTotal = Math.max(0, status.hiddenVisible ?? 0);
    this.renderedOlderCount = Math.min(this.renderedOlderCount, hiddenTotal);
    const hiddenRemaining = Math.max(0, hiddenTotal - this.renderedOlderCount);
    const batchSize = Math.min(status.batchMessages, hiddenRemaining);

    if (!this.root) {
      this.root = this.createRoot();
    }

    if (this.root.parentElement !== container || this.root.nextSibling !== firstMessage) {
      container.insertBefore(this.root, firstMessage);
    }

    const toolbar = this.root.querySelector<HTMLElement>(".gptbd-speed-toolbar");
    const summary = this.root.querySelector<HTMLElement>(".gptbd-speed-summary");
    const loadMore = this.root.querySelector<HTMLButtonElement>(".gptbd-speed-load-more");
    const viewAll = this.root.querySelector<HTMLButtonElement>(".gptbd-speed-view-all");

    if (summary) {
      summary.textContent = t("speedHiddenSummary", {
        hidden: hiddenRemaining,
        visible: (status.nativeVisible ?? 0) + this.renderedOlderCount,
        initial: status.visibleMessages
      });
    }

    if (toolbar) {
      toolbar.setAttribute("lang", this.language);
    }

    if (loadMore) {
      loadMore.textContent =
        batchSize > 0 ? t("speedLoadMore", { count: batchSize }) : t("speedAllShown");
      loadMore.disabled = batchSize === 0;
    }

    if (viewAll) {
      viewAll.textContent = t("speedViewAll");
      viewAll.disabled = hiddenRemaining === 0;
    }

    const older = await this.requestOlder(this.renderedOlderCount).catch(() => []);
    this.renderOlderTurns(older);
  }

  private createRoot(): HTMLElement {
    const root = document.createElement("div");
    root.className = "gptbd-speed-panel";

    const toolbar = document.createElement("div");
    toolbar.className = "gptbd-speed-toolbar";

    const summary = document.createElement("span");
    summary.className = "gptbd-speed-summary";

    const actions = document.createElement("div");
    actions.className = "gptbd-speed-actions";

    const loadMore = document.createElement("button");
    loadMore.type = "button";
    loadMore.className = "gptbd-speed-load-more";
    loadMore.addEventListener("click", () => {
      void this.handleLoadMore();
    });

    const viewAll = document.createElement("button");
    viewAll.type = "button";
    viewAll.className = "gptbd-speed-view-all";
    viewAll.addEventListener("click", () => {
      void this.handleViewAll();
    });

    this.olderList = document.createElement("div");
    this.olderList.className = "gptbd-speed-older-list";

    actions.append(loadMore, viewAll);
    toolbar.append(summary, actions);
    root.append(toolbar, this.olderList);
    return root;
  }

  private async handleLoadMore(): Promise<void> {
    const status = await this.requestStatus().catch(() => null);

    if (!status?.cacheReady) {
      return;
    }

    const hiddenTotal = Math.max(0, status.hiddenVisible ?? 0);
    this.renderedOlderCount = Math.min(
      hiddenTotal,
      this.renderedOlderCount + status.batchMessages
    );
    await this.render(status);
  }

  private async handleViewAll(): Promise<void> {
    const status = await this.requestStatus().catch(() => null);

    if (!status?.cacheReady) {
      return;
    }

    this.renderedOlderCount = Math.max(0, status.hiddenVisible ?? 0);
    await this.render(status);
  }

  private renderOlderTurns(turns: SpeedTurn[]): void {
    if (!this.olderList) {
      return;
    }

    this.olderList.replaceChildren(...turns.map((turn) => this.createTurnPreview(turn)));
  }

  private createTurnPreview(turn: SpeedTurn): HTMLElement {
    const article = document.createElement("article");
    article.className = "gptbd-speed-turn";
    article.dataset.expanded = "false";

    const role = document.createElement("span");
    role.className = "gptbd-speed-role";
    role.textContent = t(roleMessageKey(turn.role));

    const body = document.createElement("p");
    body.className = "gptbd-speed-body";
    body.textContent = turn.text || t("speedUnknownRole");

    article.append(role, body);

    if (shouldCollapseTurn(turn)) {
      const expand = document.createElement("button");
      expand.type = "button";
      expand.className = "gptbd-speed-expand";
      expand.textContent = t("speedExpandTurn");
      expand.addEventListener("click", () => {
        const expanded = article.dataset.expanded === "true";
        article.dataset.expanded = String(!expanded);
        expand.textContent = t(expanded ? "speedExpandTurn" : "speedCollapseTurn");
      });
      article.append(expand);
    } else {
      article.dataset.expanded = "true";
    }

    if (turn.truncated) {
      const truncated = document.createElement("span");
      truncated.className = "gptbd-speed-truncated";
      truncated.textContent = t("speedTruncated");
      article.append(truncated);
    }

    return article;
  }

  private cleanup(): void {
    this.root?.remove();
    this.root = null;
    this.olderList = null;
  }

  private isOwnMutation(mutation: MutationRecord): boolean {
    if (!this.root) {
      return false;
    }

    const nodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];

    return (
      this.root.contains(mutation.target) ||
      nodes.some((node) => node === this.root || this.root?.contains(node))
    );
  }

  private async requestStatus(): Promise<SpeedStatus> {
    const payload = await this.requestPage("GPTBD_SPEED_GET_STATUS", {
      conversationId: getConversationIdFromLocation()
    });
    return payload as SpeedStatus;
  }

  private async requestOlder(olderCount: number): Promise<SpeedTurn[]> {
    const payload = await this.requestPage("GPTBD_SPEED_GET_OLDER", {
      conversationId: getConversationIdFromLocation(),
      olderCount
    });
    const turns = (payload as { turns?: unknown }).turns;
    return Array.isArray(turns) ? (turns as SpeedTurn[]) : [];
  }

  private requestPage(type: string, payload: Record<string, unknown>): Promise<unknown> {
    const requestId = `gptbd-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Timed out waiting for ${type}`));
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(requestId, { resolve, timeout });
      window.postMessage(
        {
          source: CONTENT_SOURCE,
          type,
          requestId,
          ...payload
        },
        "*"
      );
    });
  }

  private writeBridge(): void {
    const settings = {
      enabled: this.enabled,
      visibleMessages: this.settings.visibleMessages,
      batchMessages: this.settings.batchMessages
    };

    try {
      localStorage.setItem(SPEED_BRIDGE_KEY, JSON.stringify(settings));
    } catch {
      // Keep the runtime message path working even if localStorage is blocked.
    }

    window.postMessage(
      {
        source: CONTENT_SOURCE,
        type: "GPTBD_SPEED_SETTINGS",
        settings
      },
      "*"
    );
  }
}

function getConversationIdFromLocation(): string | null {
  return window.location.pathname.match(CONVERSATION_PATH)?.[1] ?? null;
}

function isConversationPage(): boolean {
  return Boolean(getConversationIdFromLocation());
}

function roleMessageKey(role: SpeedTurn["role"]): MessageKey {
  if (role === "user") {
    return "speedUserRole";
  }

  if (role === "assistant") {
    return "speedAssistantRole";
  }

  if (role === "tool") {
    return "speedToolRole";
  }

  return "speedUnknownRole";
}

function shouldCollapseTurn(turn: SpeedTurn): boolean {
  return turn.truncated || turn.text.length > 900 || turn.text.split("\n").length > 8;
}

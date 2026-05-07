import { t, type LanguageCode } from "./i18n";

export const SPEED_BRIDGE_KEY = "gptbd.speedBridge.v2";
export const SPEED_DEFAULTS = {
  visibleMessages: 10,
  batchMessages: 5
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
const COMPOSER_SELECTOR = [
  "#prompt-textarea",
  "[data-testid='prompt-textarea']",
  "form textarea",
  "form [contenteditable='true']"
].join(",");
const GENERATING_SELECTOR = [
  "[data-testid='stop-button']",
  "button[aria-label*='Stop' i]",
  "button[aria-label*='중지']",
  "main [aria-busy='true']",
  "main [data-is-streaming='true']"
].join(",");

type SpeedStatus = {
  cacheReady: boolean;
  enabled: boolean;
  conversationId?: string;
  totalVisible?: number;
  nativeVisible?: number;
  hiddenVisible?: number;
  nativeStartIndex?: number;
  visibleMessages: number;
  targetVisibleMessages?: number;
  batchMessages: number;
  trimmed?: boolean;
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
  private currentConversationId: string | null = null;
  private root: HTMLElement | null = null;
  private mutationObserver: MutationObserver | null = null;
  private pending = new Map<string, PendingRequest>();
  private refreshQueued = false;
  private lastUrl = window.location.href;
  private urlPoll: number | null = null;
  private noticeText: string | null = null;
  private noticeTimeout: number | null = null;

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
    this.writeBridge();

    if (!isConversationPage()) {
      this.cleanup();
      return;
    }

    const status = await this.requestStatus().catch(() => null);

    if (enabled) {
      await this.softRerenderConversation();
      this.scheduleRefresh();
      return;
    }

    this.cleanup();

    if (status?.cacheReady && canSoftRerenderConversation()) {
      await this.setNativeVisibleCount(status.totalVisible ?? status.nativeVisible ?? this.settings.visibleMessages);
      await this.softRerenderConversation();
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

    if (
      !status?.cacheReady ||
      !status.conversationId ||
      (status.totalVisible ?? 0) <= status.visibleMessages
    ) {
      this.cleanup();
      return;
    }

    if (this.currentConversationId !== status.conversationId) {
      this.currentConversationId = status.conversationId;
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

    const nativeMessageCount = countNativeMessages();
    const totalVisible = Math.max(status.totalVisible ?? 0, nativeMessageCount);
    const statusVisible = status.targetVisibleMessages ?? status.nativeVisible ?? this.settings.visibleMessages;
    const nativeVisible = Math.min(
      totalVisible,
      nativeMessageCount > 0 ? nativeMessageCount : statusVisible
    );
    const hiddenRemaining = Math.max(0, totalVisible - nativeVisible);
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
      summary.textContent =
        this.noticeText ??
        t("speedHiddenSummary", {
          hidden: hiddenRemaining,
          visible: nativeVisible,
          initial: status.visibleMessages
        });
    }

    if (toolbar) {
      toolbar.setAttribute("lang", this.language);
      toolbar.toggleAttribute("data-notice", Boolean(this.noticeText));
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

    actions.append(loadMore, viewAll);
    toolbar.append(summary, actions);
    root.append(toolbar);
    return root;
  }

  private async handleLoadMore(): Promise<void> {
    const status = await this.requestStatus().catch(() => null);

    if (!status?.cacheReady) {
      return;
    }

    const totalVisible = status.totalVisible ?? countNativeMessages();
    const currentVisible = Math.max(countNativeMessages(), status.nativeVisible ?? 0);
    const nextVisible = Math.min(totalVisible, currentVisible + status.batchMessages);

    if (nextVisible <= currentVisible) {
      return;
    }

    if (!canSoftRerenderConversation()) {
      this.showNotice(t("speedRerenderBlocked"));
      return;
    }

    await this.setNativeVisibleCount(nextVisible);
    await this.softRerenderConversation();
    this.scheduleRefresh();
  }

  private async handleViewAll(): Promise<void> {
    const status = await this.requestStatus().catch(() => null);

    if (!status?.cacheReady) {
      return;
    }

    if (!canSoftRerenderConversation()) {
      this.showNotice(t("speedRerenderBlocked"));
      return;
    }

    await this.setNativeVisibleCount(status.totalVisible ?? status.nativeVisible ?? countNativeMessages());
    await this.softRerenderConversation();
    this.scheduleRefresh();
  }

  private cleanup(): void {
    this.root?.remove();
    this.root = null;
  }

  private showNotice(message: string): void {
    this.noticeText = message;

    if (this.noticeTimeout) {
      window.clearTimeout(this.noticeTimeout);
    }

    this.noticeTimeout = window.setTimeout(() => {
      this.noticeText = null;
      this.noticeTimeout = null;
      this.scheduleRefresh();
    }, 3600);
    this.scheduleRefresh();
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

  private async setNativeVisibleCount(visibleMessages: number): Promise<SpeedStatus> {
    const payload = await this.requestPage("GPTBD_SPEED_SET_VISIBLE_COUNT", {
      conversationId: getConversationIdFromLocation(),
      visibleMessages
    });
    return payload as SpeedStatus;
  }

  private async softRerenderConversation(): Promise<boolean> {
    const conversationPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (!isConversationPage()) {
      return false;
    }

    if (!canSoftRerenderConversation()) {
      this.showNotice(t("speedRerenderBlocked"));
      return false;
    }

    try {
      history.replaceState(history.state, "", `/?gptbd-speed-rerender=${Date.now()}`);
      window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
      await delay(80);
    } finally {
      history.replaceState(history.state, "", conversationPath);
      window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
      await delay(180);
    }

    return true;
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

function countNativeMessages(): number {
  return document.querySelectorAll(MESSAGE_SELECTOR).length;
}

function canSoftRerenderConversation(): boolean {
  return !hasComposerDraftOrFocus() && !isGeneratingResponse();
}

function hasComposerDraftOrFocus(): boolean {
  const activeElement = document.activeElement;

  return Array.from(document.querySelectorAll<HTMLElement>(COMPOSER_SELECTOR)).some((element) => {
    if (!isVisibleElement(element)) {
      return false;
    }

    const text =
      element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement
        ? element.value
        : element.innerText || element.textContent || "";

    return text.trim().length > 0 || (activeElement instanceof Node && element.contains(activeElement));
  });
}

function isGeneratingResponse(): boolean {
  return Array.from(document.querySelectorAll<HTMLElement>(GENERATING_SELECTOR)).some(isVisibleElement);
}

function isVisibleElement(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

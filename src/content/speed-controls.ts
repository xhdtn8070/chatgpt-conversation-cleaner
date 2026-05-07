import { t, type LanguageCode } from "./i18n";
import type { SpeedStrategy } from "../shared/messages";

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
const CONVERSATION_PATH = /\/c\/([^/?#]+)/;
const MESSAGE_SELECTOR = [
  'main article[data-testid^="conversation-turn-"]',
  'main section[data-testid^="conversation-turn-"]',
  'main div[data-testid^="conversation-turn-"]'
].join(",");
const HIDDEN_ATTR = "data-gptbd-speed-hidden";
const HIDDEN_CLASS = "gptbd-speed-hidden";
const PANEL_CLASS = "gptbd-speed-panel";
const PREHIDE_ATTR = "data-gptbd-speed-prehide";
const VISIBLE_ATTR = "data-gptbd-speed-visible";
const METRIC_SETTLE_MS = 350;

type AnchorSnapshot = {
  element: HTMLElement;
  top: number;
  scroller: HTMLElement | Window;
};

type InitialRenderMetric = {
  messageCount: number;
  ms: number;
};

export class SpeedControls {
  private enabled = false;
  private language: LanguageCode = "en";
  private settings: SpeedSettings = { ...SPEED_DEFAULTS };
  private strategy: SpeedStrategy = "after-render";
  private currentConversationId: string | null = null;
  private root: HTMLElement | null = null;
  private mutationObserver: MutationObserver | null = null;
  private refreshQueued = false;
  private lastUrl = window.location.href;
  private urlPoll: number | null = null;
  private visibleLimits = new Map<string, number>();
  private historyPatched = false;
  private routeStartedAt = 0;
  private metricTimer: number | null = null;
  private initialRenderMetric: InitialRenderMetric | null = null;

  init(
    enabled: boolean,
    language: LanguageCode,
    settings: SpeedSettings,
    strategy: SpeedStrategy
  ): void {
    this.enabled = enabled;
    this.language = language;
    this.settings = settings;
    this.strategy = strategy;
    this.applyPrehideState();
    this.writeBridge();
    this.bindObservers();
    this.scheduleRefresh();
  }

  async setEnabled(enabled: boolean): Promise<void> {
    if (this.enabled === enabled) {
      return;
    }

    this.enabled = enabled;
    this.applyPrehideState();
    this.writeBridge();

    if (enabled) {
      this.scheduleRefresh();
      return;
    }

    this.cleanup(true);
  }

  setLanguage(language: LanguageCode): void {
    this.language = language;
    this.scheduleRefresh();
  }

  setStrategy(strategy: SpeedStrategy): void {
    if (this.strategy === strategy) {
      return;
    }

    this.strategy = strategy;
    this.clearMetric();
    this.applyPrehideState();
    this.writeBridge();
    this.scheduleRefresh();
  }

  setSettings(settings: SpeedSettings): void {
    const visibleCountChanged = settings.visibleMessages !== this.settings.visibleMessages;

    this.settings = settings;
    this.writeBridge();

    if (visibleCountChanged) {
      this.visibleLimits.clear();
    }

    this.scheduleRefresh();
  }

  getEnabled(): boolean {
    return this.enabled;
  }

  getStrategy(): SpeedStrategy {
    return this.strategy;
  }

  getInitialRenderMetric(): InitialRenderMetric | null {
    return this.initialRenderMetric;
  }

  private bindObservers(): void {
    if (!this.mutationObserver) {
      this.mutationObserver = new MutationObserver((mutations) => {
        if (mutations.every((mutation) => this.isOwnMutation(mutation))) {
          return;
        }

        this.scheduleRefresh();
      });
      this.mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
    }

    if (!this.historyPatched) {
      window.addEventListener("popstate", () => this.handleUrlMaybeChanged());
      this.patchHistoryMethod("pushState");
      this.patchHistoryMethod("replaceState");
      this.historyPatched = true;
    }

    if (!this.urlPoll) {
      this.urlPoll = window.setInterval(() => this.handleUrlMaybeChanged(), 500);
    }
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
    this.routeStartedAt = performance.now();
    this.clearMetric();
    this.cleanup(false);
    this.applyPrehideState();
    this.scheduleRefresh();
  }

  private scheduleRefresh(): void {
    if (this.refreshQueued) {
      return;
    }

    this.refreshQueued = true;
    queueMicrotask(() => {
      this.refreshQueued = false;
      this.refresh(false);
    });
  }

  private refresh(preserveAnchor: boolean): void {
    if (!this.enabled) {
      this.setPrehideActive(false);
      this.cleanup(true);
      return;
    }

    if (!isConversationPage()) {
      this.setPrehideActive(false);
      this.cleanup(false);
      return;
    }

    this.applyPrehideState();
    const conversationId = getConversationIdFromLocation();
    const messages = queryMessages();

    if (!conversationId || messages.length === 0) {
      this.cleanupPanel();
      return;
    }

    if (this.currentConversationId !== conversationId) {
      this.currentConversationId = conversationId;
      this.clearMetric();
    }

    const visibleLimit = this.getVisibleLimit(conversationId, messages.length);
    this.applyVisibility(messages, visibleLimit, preserveAnchor);
    this.render(messages, visibleLimit);
    this.scheduleInitialMetric(conversationId, messages.length);
  }

  private getVisibleLimit(conversationId: string, totalMessages: number): number {
    const storedLimit = this.visibleLimits.get(conversationId);
    const rawLimit = storedLimit ?? this.settings.visibleMessages;
    const nextLimit = clampNumber(rawLimit, 1, Math.max(1, totalMessages), this.settings.visibleMessages);

    if (storedLimit && storedLimit !== nextLimit) {
      this.visibleLimits.set(conversationId, nextLimit);
    }

    return nextLimit;
  }

  private applyVisibility(
    messages: HTMLElement[],
    visibleLimit: number,
    preserveAnchor: boolean
  ): void {
    const snapshot = preserveAnchor ? captureAnchor(messages) : null;
    const hiddenCount = Math.max(0, messages.length - visibleLimit);

    messages.forEach((message, index) => {
      if (index < hiddenCount) {
        hideMessage(message);
        return;
      }

      showMessage(message);
    });

    restoreAnchor(snapshot);
  }

  private render(messages: HTMLElement[], visibleLimit: number): void {
    const totalMessages = messages.length;
    const hiddenRemaining = Math.max(0, totalMessages - visibleLimit);
    const shownCount = totalMessages - hiddenRemaining;
    const batchSize = Math.min(this.settings.batchMessages, hiddenRemaining);
    const firstVisibleMessage = messages[hiddenRemaining] ?? messages[0];
    const container = firstVisibleMessage?.parentElement;

    if (!container || !firstVisibleMessage) {
      this.cleanup(false);
      return;
    }

    if (!this.root) {
      this.root = this.createRoot();
    }

    if (this.root.parentElement !== container || this.root.nextSibling !== firstVisibleMessage) {
      container.insertBefore(this.root, firstVisibleMessage);
    }

    const toolbar = this.root.querySelector<HTMLElement>(".gptbd-speed-toolbar");
    const summary = this.root.querySelector<HTMLElement>(".gptbd-speed-summary");
    const loadMore = this.root.querySelector<HTMLButtonElement>(".gptbd-speed-load-more");
    const viewAll = this.root.querySelector<HTMLButtonElement>(".gptbd-speed-view-all");

    if (summary) {
      const baseSummary = t("speedHiddenSummary", {
        hidden: hiddenRemaining,
        visible: shownCount
      });
      const strategyLabel = t(
        this.strategy === "prehide" ? "speedStrategyPrehide" : "speedStrategyAfter"
      );
      const metricLabel = this.initialRenderMetric
        ? t("speedRenderMetric", { seconds: formatSeconds(this.initialRenderMetric.ms) })
        : t("speedRenderPending");
      summary.textContent = `${baseSummary} · ${strategyLabel} · ${metricLabel}`;
    }

    if (toolbar) {
      toolbar.setAttribute("lang", this.language);
      toolbar.removeAttribute("data-notice");
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
    root.className = PANEL_CLASS;

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
      this.handleLoadMore();
    });

    const viewAll = document.createElement("button");
    viewAll.type = "button";
    viewAll.className = "gptbd-speed-view-all";
    viewAll.addEventListener("click", () => {
      this.handleViewAll();
    });

    actions.append(loadMore, viewAll);
    toolbar.append(summary, actions);
    root.append(toolbar);
    return root;
  }

  private handleLoadMore(): void {
    const conversationId = getConversationIdFromLocation();
    const messages = queryMessages();

    if (!this.enabled || !conversationId || messages.length === 0) {
      return;
    }

    const currentVisible = this.getVisibleLimit(conversationId, messages.length);
    const nextVisible = Math.min(messages.length, currentVisible + this.settings.batchMessages);

    if (nextVisible <= currentVisible) {
      return;
    }

    this.visibleLimits.set(conversationId, nextVisible);
    this.refresh(true);
  }

  private handleViewAll(): void {
    const conversationId = getConversationIdFromLocation();
    const messages = queryMessages();

    if (!this.enabled || !conversationId || messages.length === 0) {
      return;
    }

    this.visibleLimits.set(conversationId, messages.length);
    this.refresh(true);
  }

  private cleanup(restoreMessages: boolean): void {
    this.cleanupPanel();

    if (restoreMessages) {
      this.setPrehideActive(false);
      this.restoreManagedMessages();
    }
  }

  private cleanupPanel(): void {
    this.root?.remove();
    this.root = null;
  }

  private restoreManagedMessages(): void {
    document.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}="true"]`).forEach(showMessage);
  }

  private isOwnMutation(mutation: MutationRecord): boolean {
    const nodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];

    return (
      Boolean(this.root && (mutation.target === this.root || this.root.contains(mutation.target))) ||
      nodes.some((node) => isSpeedPanelNode(node))
    );
  }

  private scheduleInitialMetric(conversationId: string, messageCount: number): void {
    if (this.initialRenderMetric) {
      return;
    }

    if (this.metricTimer) {
      window.clearTimeout(this.metricTimer);
    }

    this.metricTimer = window.setTimeout(() => {
      this.metricTimer = null;

      if (!this.enabled || this.currentConversationId !== conversationId) {
        return;
      }

      const stableCount = queryMessages().length || messageCount;
      this.initialRenderMetric = {
        messageCount: stableCount,
        ms: Math.max(0, performance.now() - this.routeStartedAt)
      };
      this.scheduleRefresh();
    }, METRIC_SETTLE_MS);
  }

  private clearMetric(): void {
    if (this.metricTimer) {
      window.clearTimeout(this.metricTimer);
      this.metricTimer = null;
    }

    this.initialRenderMetric = null;
  }

  private applyPrehideState(): void {
    this.setPrehideActive(
      this.enabled && this.strategy === "prehide" && isConversationPage()
    );
  }

  private setPrehideActive(active: boolean): void {
    document.documentElement.toggleAttribute(PREHIDE_ATTR, active);
  }

  private writeBridge(): void {
    const settings = {
      enabled: this.enabled,
      visibleMessages: this.settings.visibleMessages,
      batchMessages: this.settings.batchMessages,
      strategy: this.strategy,
      mode: "dom-hide"
    };

    try {
      localStorage.setItem(SPEED_BRIDGE_KEY, JSON.stringify(settings));
    } catch {
      // Keep runtime behavior in-memory if localStorage is blocked.
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

export function applySpeedBootstrap(): void {
  try {
    const raw = localStorage.getItem(SPEED_BRIDGE_KEY);

    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as {
      enabled?: unknown;
      strategy?: unknown;
    };
    const shouldPrehide =
      parsed.enabled === true &&
      parsed.strategy === "prehide" &&
      isConversationPage();
    document.documentElement.toggleAttribute(PREHIDE_ATTR, shouldPrehide);
  } catch {
    document.documentElement.removeAttribute(PREHIDE_ATTR);
  }
}

function queryMessages(): HTMLElement[] {
  const seen = new Set<HTMLElement>();

  return Array.from(document.querySelectorAll<HTMLElement>(MESSAGE_SELECTOR)).filter((element) => {
    if (seen.has(element) || element.closest(`.${PANEL_CLASS}`)) {
      return false;
    }

    if (element.parentElement?.closest(MESSAGE_SELECTOR)) {
      return false;
    }

    seen.add(element);
    return true;
  });
}

function hideMessage(element: HTMLElement): void {
  element.classList.add(HIDDEN_CLASS);
  element.setAttribute(HIDDEN_ATTR, "true");
  setVisibleMarker(element, false);
  element.setAttribute("aria-hidden", "true");
}

function showMessage(element: HTMLElement): void {
  element.classList.remove(HIDDEN_CLASS);
  element.removeAttribute(HIDDEN_ATTR);
  setVisibleMarker(element, true);
  element.removeAttribute("aria-hidden");
}

function setVisibleMarker(element: HTMLElement, visible: boolean): void {
  const targets = [
    element,
    ...Array.from(element.querySelectorAll<HTMLElement>(MESSAGE_SELECTOR))
  ];

  targets.forEach((target) => {
    if (visible) {
      target.setAttribute(VISIBLE_ATTR, "true");
      return;
    }

    target.removeAttribute(VISIBLE_ATTR);
  });
}

function captureAnchor(messages: HTMLElement[]): AnchorSnapshot | null {
  const anchor =
    messages.find((message) => !isSpeedHidden(message) && message.getBoundingClientRect().bottom > 0) ??
    messages.find((message) => !isSpeedHidden(message));

  if (!anchor) {
    return null;
  }

  return {
    element: anchor,
    top: anchor.getBoundingClientRect().top,
    scroller: findScrollContainer(anchor)
  };
}

function restoreAnchor(snapshot: AnchorSnapshot | null): void {
  if (!snapshot?.element.isConnected) {
    return;
  }

  const delta = snapshot.element.getBoundingClientRect().top - snapshot.top;

  if (Math.abs(delta) < 1) {
    return;
  }

  if (snapshot.scroller instanceof Window) {
    snapshot.scroller.scrollBy(0, delta);
    return;
  }

  snapshot.scroller.scrollTop += delta;
}

function findScrollContainer(element: HTMLElement): HTMLElement | Window {
  let current = element.parentElement;

  while (current && current !== document.body) {
    const style = getComputedStyle(current);

    if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight + 1) {
      return current;
    }

    current = current.parentElement;
  }

  return window;
}

function isSpeedHidden(element: HTMLElement): boolean {
  return element.getAttribute(HIDDEN_ATTR) === "true";
}

function formatSeconds(ms: number): string {
  return (ms / 1000).toFixed(2);
}

function isSpeedPanelNode(node: Node): boolean {
  return (
    node instanceof HTMLElement &&
    (node.classList.contains(PANEL_CLASS) || Boolean(node.closest(`.${PANEL_CLASS}`)))
  );
}

function getConversationIdFromLocation(): string | null {
  return window.location.pathname.match(CONVERSATION_PATH)?.[1] ?? null;
}

function isConversationPage(): boolean {
  return Boolean(getConversationIdFromLocation());
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.floor(value)))
    : fallback;
}

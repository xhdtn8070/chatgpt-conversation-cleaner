import { collectConversationRows, type ConversationRow } from "./dom";
import { computeActionBarWidth, computeCheckboxLayout } from "./positioning";
import type {
  DeleteItemResult,
  DeleteSummary,
  ExtensionMessage,
  ExtensionState
} from "../shared/messages";
import { clearSelection, removeSelected, selectAll, toggleSelection } from "./selection";
import { DOCUMENT_CSS, SHADOW_CSS } from "./styles";

const ROOT_ID = "gptbd-root";
const DOCUMENT_STYLE_ID = "gptbd-document-style";
const STORAGE_KEYS = {
  bulkMode: "gptbd.bulkMode"
} as const;
const MESSAGE_TYPES = {
  getState: "GPTBD_GET_STATE",
  setBulkMode: "GPTBD_SET_BULK_MODE",
  selectAllVisible: "GPTBD_SELECT_ALL_VISIBLE",
  clearSelection: "GPTBD_CLEAR_SELECTION",
  deleteSelected: "GPTBD_DELETE_SELECTED"
} as const;
const DELETE_LABELS = ["delete", "삭제"];
const CONFIRM_LABELS = ["delete", "confirm", "삭제", "확인"];
const MENU_LABELS = ["options", "more", "menu", "conversation options", "옵션", "더 보기"];
const HISTORY_HEADER_CLASS = "text-token-text-tertiary";

declare global {
  interface Window {
    __gptbdController?: BulkDeleteController;
  }
}

class BulkDeleteController {
  private bulkMode = false;
  private selectedIds = new Set<string>();
  private rows = new Map<string, ConversationRow>();
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private overlayRoot: HTMLElement;
  private checkboxLayer: HTMLElement;
  private actionBar: HTMLElement;
  private dialogHost: HTMLElement;
  private notice: HTMLElement;
  private toolbarSpacer: HTMLElement;
  private observer: MutationObserver;
  private refreshQueued = false;
  private isDeleting = false;
  private lastDeleteSummary: DeleteSummary | undefined;
  private handleBulkRowPointerDown = (event: PointerEvent): void => {
    if (!this.bulkMode || this.isDeleting || event.defaultPrevented || event.button !== 0) {
      return;
    }

    const row = this.findRowFromEvent(event);

    if (!row) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    this.toggleRowSelection(row.id, true);
  };
  private handleBulkRowMouseDown = (event: MouseEvent): void => {
    if (!this.bulkMode || this.isDeleting || event.button !== 0) {
      return;
    }

    this.suppressBulkRowNavigation(event);
  };
  private handleBulkRowClick = (event: MouseEvent): void => {
    if (!this.bulkMode || this.isDeleting || event.button !== 0) {
      return;
    }

    this.suppressBulkRowNavigation(event);
  };

  constructor() {
    injectDocumentStyle();

    this.host = document.getElementById(ROOT_ID) ?? document.createElement("div");
    this.host.id = ROOT_ID;

    if (!this.host.isConnected) {
      document.documentElement.append(this.host);
    }

    this.shadow = this.host.shadowRoot ?? this.host.attachShadow({ mode: "open" });
    this.shadow.replaceChildren();
    this.shadow.append(createStyle(SHADOW_CSS));

    this.overlayRoot = document.createElement("section");
    this.overlayRoot.className = "overlay-root";
    this.overlayRoot.setAttribute("aria-label", "ChatGPT bulk delete controls");

    this.checkboxLayer = document.createElement("div");
    this.actionBar = document.createElement("div");
    this.dialogHost = document.createElement("div");
    this.toolbarSpacer = document.createElement("div");
    this.toolbarSpacer.dataset.gptbdToolbarSpacer = "true";
    this.notice = document.createElement("div");
    this.notice.className = "notice";
    this.notice.hidden = true;

    this.overlayRoot.append(this.checkboxLayer, this.actionBar, this.dialogHost, this.notice);
    this.shadow.append(this.overlayRoot);

    this.observer = new MutationObserver(() => this.scheduleRefresh());
  }

  async init(): Promise<void> {
    this.bulkMode = await storageGet(STORAGE_KEYS.bulkMode, false);
    this.bindRuntimeMessages();
    this.bindPageListeners();
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.refresh();
    document.documentElement.dataset.gptbdReady = "true";
  }

  getState(): ExtensionState {
    return {
      available: true,
      bulkMode: this.bulkMode,
      selectedCount: this.selectedIds.size,
      visibleCount: this.rows.size,
      isDeleting: this.isDeleting,
      lastDeleteSummary: this.lastDeleteSummary
    };
  }

  async setBulkMode(enabled: boolean): Promise<ExtensionState> {
    this.bulkMode = enabled;
    await storageSet(STORAGE_KEYS.bulkMode, enabled);
    this.refresh();
    return this.getState();
  }

  selectAllVisible(): ExtensionState {
    this.selectedIds = selectAll(this.rows.keys());
    this.render();
    return this.getState();
  }

  clearSelection(): ExtensionState {
    this.selectedIds = clearSelection();
    this.lastDeleteSummary = undefined;
    this.render();
    return this.getState();
  }

  requestDeleteSelected(): ExtensionState {
    if (this.selectedIds.size > 0 && !this.isDeleting) {
      this.showDeleteDialog();
    }

    return this.getState();
  }

  private bindRuntimeMessages(): void {
    if (typeof chrome === "undefined" || !chrome.runtime?.onMessage) {
      return;
    }

    chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
      void this.handleMessage(message)
        .then(sendResponse)
        .catch((error: unknown) => {
          sendResponse({
            available: true,
            bulkMode: this.bulkMode,
            selectedCount: this.selectedIds.size,
            visibleCount: this.rows.size,
            isDeleting: this.isDeleting,
            error: getErrorMessage(error)
          });
        });

      return true;
    });
  }

  private async handleMessage(message: ExtensionMessage): Promise<ExtensionState> {
    switch (message.type) {
      case MESSAGE_TYPES.getState:
        this.refresh();
        return this.getState();
      case MESSAGE_TYPES.setBulkMode:
        return this.setBulkMode(message.enabled);
      case MESSAGE_TYPES.selectAllVisible:
        return this.selectAllVisible();
      case MESSAGE_TYPES.clearSelection:
        return this.clearSelection();
      case MESSAGE_TYPES.deleteSelected:
        return this.requestDeleteSelected();
    }
  }

  private bindPageListeners(): void {
    window.addEventListener("resize", () => this.scheduleRefresh(), { passive: true });
    window.addEventListener("scroll", () => this.scheduleRefresh(), { capture: true, passive: true });
    document.addEventListener("pointerdown", this.handleBulkRowPointerDown, true);
    document.addEventListener("mousedown", this.handleBulkRowMouseDown, true);
    document.addEventListener("click", this.handleBulkRowClick, true);
  }

  private scheduleRefresh(): void {
    if (this.refreshQueued) {
      return;
    }

    this.refreshQueued = true;
    window.requestAnimationFrame(() => {
      this.refreshQueued = false;
      this.refresh();
    });
  }

  private refresh(): void {
    this.clearRowHighlights();
    const nextRows = collectConversationRows();
    this.rows = new Map(nextRows.map((row) => [row.id, row]));
    this.applyRowHighlights();
    this.render();
  }

  private render(): void {
    document.documentElement.classList.toggle("gptbd-bulk-active", this.bulkMode);
    this.host.toggleAttribute("data-active", this.bulkMode);
    this.clearRowHighlights();
    this.applyRowHighlights();
    if (this.syncToolbarSpacer()) {
      this.clearRowHighlights();
      const nextRows = collectConversationRows();
      this.rows = new Map(nextRows.map((row) => [row.id, row]));
      this.applyRowHighlights();
    }
    this.renderSelectionLayer();
    this.renderActionBar();
    this.renderNoticePosition();
  }

  private renderSelectionLayer(): void {
    this.checkboxLayer.replaceChildren();

    if (!this.bulkMode || this.isDeleting) {
      return;
    }

    for (const row of this.rows.values()) {
      this.checkboxLayer.append(this.createRowHitTarget(row));
    }

    for (const row of this.rows.values()) {
      this.checkboxLayer.append(this.createCheckboxTarget(row));
    }
  }

  private createRowHitTarget(row: ConversationRow): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "row-hit-target";
    button.setAttribute("aria-label", `Toggle ${row.title}`);
    button.style.left = `${Math.max(row.sidebarRect.left, row.rect.left)}px`;
    button.style.top = `${row.rect.top}px`;
    button.style.width = `${Math.max(0, Math.min(row.rect.right, row.sidebarRect.right) - Math.max(row.sidebarRect.left, row.rect.left))}px`;
    button.style.height = `${row.rect.height}px`;

    button.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.toggleRowSelection(row.id, true);
    });

    button.addEventListener("mousedown", stopSelectionEvent);
    button.addEventListener("click", stopSelectionEvent);

    return button;
  }

  private createCheckboxTarget(row: ConversationRow): HTMLButtonElement {
    const layout = computeCheckboxLayout(row.rect, row.sidebarRect);
    const button = document.createElement("button");
    const selected = this.selectedIds.has(row.id);
    button.type = "button";
    button.className = "checkbox-target";
    button.setAttribute("role", "checkbox");
    button.setAttribute("aria-checked", String(selected));
    button.setAttribute("aria-label", `Select ${row.title}`);
    button.style.left = `${layout.left}px`;
    button.style.top = `${layout.top}px`;
    button.style.width = `${layout.size}px`;
    button.style.height = `${layout.size}px`;
    button.style.setProperty("--gptbd-visible-size", `${layout.visibleSize}px`);

    const visual = document.createElement("span");
    visual.className = "checkbox-visual";
    button.append(visual);

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.toggleRowSelection(row.id);
    });

    return button;
  }

  private renderActionBar(): void {
    this.actionBar.className = "action-bar";
    this.actionBar.dataset.mode = this.bulkMode ? "on" : "off";
    this.actionBar.hidden = !this.toolbarSpacer.isConnected;

    if (!this.toolbarSpacer.isConnected) {
      this.actionBar.replaceChildren();
      this.actionBar.removeAttribute("style");
      return;
    }

    const sidebarRect = this.getSidebarRect();
    const toolbarRect = this.toolbarSpacer.isConnected
      ? this.toolbarSpacer.getBoundingClientRect()
      : null;
    const left = Math.max(sidebarRect.left + 8, 8);
    const availableWidth = Math.max(0, sidebarRect.right - left - 8);
    this.actionBar.style.left = `${left}px`;
    this.actionBar.style.top = `${this.getActionBarTop(sidebarRect, toolbarRect)}px`;
    this.actionBar.style.bottom = "auto";
    this.actionBar.style.width = `${Math.min(computeActionBarWidth(sidebarRect), availableWidth)}px`;

    const topRow = document.createElement("div");
    topRow.className = "toolbar-top";

    const count = document.createElement("span");
    count.className = "selected-count";
    count.textContent = this.bulkMode ? `${this.selectedIds.size} selected` : "Bulk delete off";

    const toggleButton = createActionButton(this.bulkMode ? "On" : "Off", () => {
      void this.setBulkMode(!this.bulkMode);
    });
    toggleButton.className = "mode-toggle";
    toggleButton.setAttribute("role", "switch");
    toggleButton.setAttribute("aria-checked", String(this.bulkMode));
    toggleButton.setAttribute("aria-label", "Bulk delete mode");

    topRow.append(count, toggleButton);

    if (!this.bulkMode) {
      this.actionBar.replaceChildren(topRow);
      return;
    }

    const actionsRow = document.createElement("div");
    actionsRow.className = "toolbar-actions";

    const allVisibleSelected = this.rows.size > 0 && this.selectedIds.size === this.rows.size;
    const selectAllButton = createActionButton(allVisibleSelected ? "Deselect all" : "Select all", () => {
      if (allVisibleSelected) {
        this.clearSelection();
        return;
      }

      this.selectAllVisible();
    });
    selectAllButton.disabled = this.rows.size === 0 || this.isDeleting;

    const clearButton = createActionButton("Clear", () => {
      this.clearSelection();
    });
    clearButton.disabled = this.selectedIds.size === 0 || this.isDeleting;

    const deleteButton = createActionButton("Delete", () => {
      this.showDeleteDialog();
    });
    deleteButton.className = "danger";
    deleteButton.disabled = this.selectedIds.size === 0 || this.isDeleting;

    actionsRow.append(selectAllButton, clearButton, deleteButton);
    this.actionBar.replaceChildren(topRow, actionsRow);
  }

  private syncToolbarSpacer(): boolean {
    let changed = false;
    const anchor = this.findHistoryHeader();

    if (!anchor) {
      changed = this.toolbarSpacer.isConnected;
      this.toolbarSpacer.remove();
      return changed;
    }

    if (this.toolbarSpacer.dataset.gptbdMode !== (this.bulkMode ? "on" : "off")) {
      changed = true;
    }
    this.toolbarSpacer.dataset.gptbdMode = this.bulkMode ? "on" : "off";

    if (this.toolbarSpacer.parentElement !== anchor.parentElement) {
      anchor.after(this.toolbarSpacer);
      return true;
    }

    if (this.toolbarSpacer.previousElementSibling !== anchor) {
      anchor.after(this.toolbarSpacer);
      return true;
    }

    return changed;
  }

  private showDeleteDialog(): void {
    if (this.selectedIds.size === 0 || this.isDeleting) {
      return;
    }

    const backdrop = document.createElement("div");
    backdrop.className = "dialog-backdrop";

    const dialog = document.createElement("section");
    dialog.className = "dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "gptbd-confirm-title");

    const title = document.createElement("h2");
    title.id = "gptbd-confirm-title";
    title.textContent = "Confirm delete";

    const body = document.createElement("p");
    body.textContent = `Delete ${this.selectedIds.size} selected conversations? This uses ChatGPT's visible delete controls and cannot be undone here.`;

    const actions = document.createElement("div");
    actions.className = "dialog-actions";

    const cancel = createActionButton("Cancel", () => {
      this.dialogHost.replaceChildren();
    });
    const confirm = createActionButton("Delete", () => {
      this.dialogHost.replaceChildren();
      void this.deleteSelectedConversations();
    });
    confirm.className = "danger";

    actions.append(cancel, confirm);
    dialog.append(title, body, actions);
    backdrop.append(dialog);
    this.dialogHost.replaceChildren(backdrop);
    cancel.focus();
  }

  private async deleteSelectedConversations(): Promise<void> {
    const selectedRows = Array.from(this.selectedIds)
      .map((id) => this.rows.get(id))
      .filter((row): row is ConversationRow => Boolean(row));

    if (selectedRows.length === 0) {
      this.showNotice("No visible selected conversations to delete.");
      return;
    }

    this.isDeleting = true;
    this.lastDeleteSummary = undefined;
    this.render();

    const results: DeleteItemResult[] = [];

    for (const row of selectedRows) {
      this.showNotice(`Deleting "${truncate(row.title, 42)}"...`);

      try {
        await deleteConversationThroughUi(row);
        results.push({ id: row.id, title: row.title, ok: true });
        this.selectedIds = removeSelected(this.selectedIds, [row.id]);
      } catch (error) {
        results.push({
          id: row.id,
          title: row.title,
          ok: false,
          error: getErrorMessage(error)
        });
      }

      this.refresh();
      await delay(250);
    }

    const deleted = results.filter((result) => result.ok).length;
    const failed = results.length - deleted;
    this.lastDeleteSummary = {
      attempted: results.length,
      deleted,
      failed,
      items: results
    };
    this.isDeleting = false;
    this.showNotice(
      failed > 0
        ? `${deleted} deleted, ${failed} failed. Failed items remain selected.`
        : `${deleted} conversations deleted.`
    );
    this.refresh();
  }

  private clearRowHighlights(): void {
    for (const row of this.rows.values()) {
      row.row.removeAttribute("data-gptbd-row");
      row.row.removeAttribute("data-gptbd-row-selected");
    }
  }

  private applyRowHighlights(): void {
    for (const row of this.rows.values()) {
      if (this.bulkMode) {
        row.row.setAttribute("data-gptbd-row", "true");
      } else {
        row.row.removeAttribute("data-gptbd-row");
      }

      if (this.selectedIds.has(row.id)) {
        row.row.setAttribute("data-gptbd-row-selected", "true");
      } else {
        row.row.removeAttribute("data-gptbd-row-selected");
      }
    }
  }

  private findRowFromEvent(event: Event): ConversationRow | null {
    const path = event.composedPath();

    if (path.includes(this.host)) {
      return null;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
      return null;
    }

    for (const row of this.rows.values()) {
      if (row.row.contains(target) || row.anchor.contains(target)) {
        return row;
      }
    }

    return null;
  }

  private suppressBulkRowNavigation(event: MouseEvent): void {
    if (event.defaultPrevented) {
      return;
    }

    const row = this.findRowFromEvent(event);

    if (!row) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  }

  private findHistoryHeader(): HTMLElement | null {
    const firstRow = this.rows.values().next().value;

    if (!firstRow) {
      return null;
    }

    const sidebarRoot =
      firstRow.row.closest<HTMLElement>(
        'nav,aside,[data-testid*="sidebar" i],[aria-label*="sidebar" i],[class*="sidebar" i],[id*="sidebar" i]'
      ) ?? firstRow.row.parentElement;

    if (!sidebarRoot) {
      return null;
    }

    const exactHeader = Array.from(
      sidebarRoot.querySelectorAll<HTMLElement>(`.${HISTORY_HEADER_CLASS}`)
    )
      .filter((element) => {
        const text = normalizeToolbarText(element.textContent ?? "");
        return (
          text.length > 0 &&
          element.classList.contains("flex") &&
          element.classList.contains("w-full") &&
          element.classList.contains("items-center") &&
          element.compareDocumentPosition(firstRow.row) & Node.DOCUMENT_POSITION_FOLLOWING
        );
      })
      .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0];

    if (exactHeader) {
      return exactHeader;
    }

    return Array.from(sidebarRoot.querySelectorAll<HTMLElement>("div,p,span,h2,h3"))
      .filter((element) => {
        if (element === this.toolbarSpacer || element.querySelector('a[href*="/c/"]')) {
          return false;
        }

        const text = normalizeToolbarText(element.textContent ?? "");
        const rect = element.getBoundingClientRect();
        return (
          text.length > 0 &&
          text.length <= 32 &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.top < firstRow.rect.top
        );
      })
      .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0] ?? null;
  }

  private getActionBarTop(sidebarRect: DOMRect, toolbarRect: DOMRect | null): number {
    if (toolbarRect && toolbarRect.height > 0) {
      return Math.round(toolbarRect.top + 4);
    }

    const firstRow = this.rows.values().next().value;

    if (firstRow) {
      return Math.max(sidebarRect.top + 8, Math.round(firstRow.rect.top - 48));
    }

    return Math.max(sidebarRect.top + 8, 8);
  }

  private getSidebarRect(): DOMRect {
    return (
      this.rows.values().next().value?.sidebarRect ??
      ({
        left: 0,
        right: Math.min(360, window.innerWidth),
        top: 0,
        bottom: window.innerHeight,
        width: Math.min(360, window.innerWidth),
        height: window.innerHeight
      } as DOMRect)
    );
  }

  private showNotice(message: string): void {
    this.notice.textContent = message;
    this.notice.hidden = false;
    this.renderNoticePosition();
  }

  private renderNoticePosition(): void {
    const sidebarRect = this.getSidebarRect();
    this.notice.style.left = `${Math.max(sidebarRect.left + 8, 8)}px`;
    this.notice.style.bottom = "12px";
    this.notice.style.width = `${computeActionBarWidth(sidebarRect)}px`;
  }

  private toggleRowSelection(id: string, deferRender = false): void {
    this.selectedIds = toggleSelection(this.selectedIds, id);
    this.lastDeleteSummary = undefined;

    if (deferRender) {
      this.clearRowHighlights();
      this.applyRowHighlights();
      window.requestAnimationFrame(() => this.render());
      return;
    }

    this.render();
  }
}

async function deleteConversationThroughUi(row: ConversationRow): Promise<void> {
  row.row.scrollIntoView({ block: "center", inline: "nearest" });
  revealRow(row.row);
  await delay(180);

  const menuButton = await waitFor(() => findMenuButton(row.row), 2200);
  clickElement(menuButton);

  const deleteItem = await waitFor(() => findVisibleControlByText(DELETE_LABELS), 2600);
  clickElement(deleteItem);

  const confirmButton = await waitFor(() => findDialogConfirmButton(CONFIRM_LABELS), 3000);
  clickElement(confirmButton);

  await waitFor(() => !findAnchorByConversationId(row.id), 7000);
}

function findMenuButton(row: HTMLElement): HTMLElement | null {
  revealRow(row);
  const candidates = Array.from(row.querySelectorAll<HTMLElement>('button,[role="button"]')).filter(
    isVisibleElement
  );

  const labelled = candidates.find((candidate) => {
    const label = getAccessibleLabel(candidate);
    return MENU_LABELS.some((keyword) => label.includes(keyword));
  });

  return labelled ?? candidates.at(-1) ?? null;
}

function findVisibleControlByText(keywords: string[]): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      'button,[role="button"],[role="menuitem"],[role="option"],div[tabindex],span[tabindex]'
    )
  ).filter(isVisibleElement);

  return (
    candidates.find((candidate) => {
      const label = getAccessibleLabel(candidate);
      return keywords.some((keyword) => label.includes(keyword));
    }) ?? null
  );
}

function findDialogConfirmButton(keywords: string[]): HTMLElement | null {
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"],dialog')).filter(
    isVisibleElement
  );
  const roots = dialogs.length > 0 ? dialogs : [document.body];

  for (const root of roots) {
    const buttons = Array.from(root.querySelectorAll<HTMLElement>('button,[role="button"]')).filter(
      isVisibleElement
    );
    const match = buttons.find((button) => {
      const label = getAccessibleLabel(button);
      return keywords.some((keyword) => label.includes(keyword));
    });

    if (match) {
      return match;
    }
  }

  return null;
}

function findAnchorByConversationId(id: string): HTMLAnchorElement | null {
  const escaped = cssEscape(id);
  return document.querySelector<HTMLAnchorElement>(`a[href*="/c/${escaped}"]`);
}

function revealRow(row: HTMLElement): void {
  for (const type of ["pointerover", "mouseover", "mouseenter"]) {
    row.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
  }
}

function clickElement(element: HTMLElement): void {
  element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
  element.click();
}

function isVisibleElement(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    Number(style.opacity || "1") > 0
  );
}

function getAccessibleLabel(element: HTMLElement): string {
  return [
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.textContent
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function waitFor<T>(
  getter: () => T | null | undefined,
  timeoutMs: number,
  intervalMs = 80
): Promise<T> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const value = getter();
    if (value) {
      return value;
    }
    await delay(intervalMs);
  }

  throw new Error("Timed out waiting for ChatGPT delete control.");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createActionButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
}

function stopSelectionEvent(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}

function createStyle(css: string): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = css;
  return style;
}

function injectDocumentStyle(): void {
  if (document.getElementById(DOCUMENT_STYLE_ID)) {
    return;
  }

  const style = createStyle(DOCUMENT_CSS);
  style.id = DOCUMENT_STYLE_ID;
  document.documentElement.append(style);
}

function storageGet<T>(key: string, fallback: T): Promise<T> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return Promise.resolve(fallback);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: T) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    try {
      const maybePromise = chrome.storage.local.get(key, (items) => {
        finish((items[key] as T | undefined) ?? fallback);
      }) as Promise<Record<string, unknown>> | undefined;

      if (maybePromise && typeof maybePromise.then === "function") {
        void maybePromise.then((items) => finish((items[key] as T | undefined) ?? fallback));
      }
    } catch {
      finish(fallback);
    }
  });
}

function storageSet<T>(key: string, value: T): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    try {
      const maybePromise = chrome.storage.local.set({ [key]: value }, finish) as
        | Promise<void>
        | undefined;

      if (maybePromise && typeof maybePromise.then === "function") {
        void maybePromise.then(finish);
      }
    } catch {
      finish();
    }
  });
}

function cssEscape(value: string): string {
  return window.CSS?.escape?.(value) ?? value.replace(/["\\]/g, "\\$&");
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function normalizeToolbarText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (!window.__gptbdController) {
  window.__gptbdController = new BulkDeleteController();
  void window.__gptbdController.init();
}

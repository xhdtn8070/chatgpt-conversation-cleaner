import { collectConversationRows, type ConversationRow } from "./dom";
import { computeActionBarWidth, computeCheckboxLayout } from "./positioning";
import type {
  DeleteItemResult,
  DeleteSummary,
  ExtensionMessage,
  ExtensionState
} from "../shared/messages";
import {
  getDefaultLanguage,
  normalizeLanguage,
  setActiveLanguage,
  t,
  type LanguageCode,
  type MessageKey
} from "./i18n";
import { clearSelection, removeSelected, selectAll, toggleSelection } from "./selection";
import { SpeedControls } from "./speed-controls";
import { DOCUMENT_CSS, SHADOW_CSS } from "./styles";

const ROOT_ID = "gptbd-root";
const DOCUMENT_STYLE_ID = "gptbd-document-style";
const STORAGE_KEYS = {
  bulkMode: "gptbd.bulkMode",
  language: "gptbd.language",
  sidebarControls: "gptbd.sidebarControls",
  speedMode: "gptbd.speedMode"
} as const;
const FIRST_RUN_DEFAULTS = {
  bulkMode: false,
  sidebarControls: true,
  speedMode: false
} as const;
const MESSAGE_TYPES = {
  getState: "GPTBD_GET_STATE",
  setBulkMode: "GPTBD_SET_BULK_MODE",
  setLanguage: "GPTBD_SET_LANGUAGE",
  setSidebarControls: "GPTBD_SET_SIDEBAR_CONTROLS",
  setSpeedMode: "GPTBD_SET_SPEED_MODE",
  selectAllVisible: "GPTBD_SELECT_ALL_VISIBLE",
  clearSelection: "GPTBD_CLEAR_SELECTION",
  archiveSelected: "GPTBD_ARCHIVE_SELECTED",
  deleteSelected: "GPTBD_DELETE_SELECTED"
} as const;
type BulkConversationAction = "archive" | "delete";
type ToolbarDensity = "normal" | "compact";
type BulkActionConfig = {
  apiPayload: Record<string, boolean>;
  labels: string[];
  confirmLabels: string[];
  dialogTitleKey: MessageKey;
  dialogBodyKey: MessageKey;
  buttonLabelKey: MessageKey;
  busySelectedKey: MessageKey;
  busyItemKey: MessageKey;
  summarySuccessKey: MessageKey;
  summaryFailedKey: MessageKey;
  danger: boolean;
  requiresMenuConfirm: boolean;
};
const ACTION_CONFIG: Record<BulkConversationAction, BulkActionConfig> = {
  archive: {
    apiPayload: { is_archived: true },
    labels: ["archive", "archived", "보관", "아카이브"],
    confirmLabels: ["archive", "confirm", "보관", "확인"],
    dialogTitleKey: "dialogArchiveTitle",
    dialogBodyKey: "dialogArchiveBody",
    buttonLabelKey: "actionArchive",
    busySelectedKey: "busyArchiveSelected",
    busyItemKey: "busyArchiveItem",
    summarySuccessKey: "summaryArchiveSuccess",
    summaryFailedKey: "summaryArchiveFailed",
    danger: false,
    requiresMenuConfirm: false
  },
  delete: {
    apiPayload: { is_visible: false },
    labels: ["delete", "삭제"],
    confirmLabels: ["delete", "confirm", "삭제", "확인"],
    dialogTitleKey: "dialogDeleteTitle",
    dialogBodyKey: "dialogDeleteBody",
    buttonLabelKey: "actionDelete",
    busySelectedKey: "busyDeleteSelected",
    busyItemKey: "busyDeleteItem",
    summarySuccessKey: "summaryDeleteSuccess",
    summaryFailedKey: "summaryDeleteFailed",
    danger: true,
    requiresMenuConfirm: true
  }
};
const MENU_LABELS = [
  "options",
  "more",
  "menu",
  "conversation options",
  "대화 옵션",
  "옵션",
  "더 보기"
];
const HISTORY_HEADER_CLASS = "text-token-text-tertiary";
const AUTH_SESSION_ENDPOINT = "/api/auth/session";
const CONVERSATION_API_PREFIX = "/backend-api/conversation/";
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

declare global {
  interface Window {
    __gptbdController?: BulkDeleteController;
  }
}

class BulkDeleteController {
  private bulkMode = false;
  private language: LanguageCode = getDefaultLanguage();
  private sidebarControls = true;
  private speedMode = false;
  private selectedIds = new Set<string>();
  private rows = new Map<string, ConversationRow>();
  private speedControls = new SpeedControls();
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private overlayRoot: HTMLElement;
  private checkboxLayer: HTMLElement;
  private actionBar: HTMLElement;
  private dialogHost: HTMLElement;
  private busyShield: HTMLElement;
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
    this.overlayRoot.setAttribute("aria-label", t("overlayAria"));

    this.checkboxLayer = document.createElement("div");
    this.actionBar = document.createElement("div");
    this.dialogHost = document.createElement("div");
    this.busyShield = document.createElement("div");
    this.busyShield.className = "busy-shield";
    this.busyShield.hidden = true;
    this.toolbarSpacer = document.createElement("div");
    this.toolbarSpacer.dataset.gptbdToolbarSpacer = "true";
    this.notice = document.createElement("div");
    this.notice.className = "notice";
    this.notice.hidden = true;

    this.overlayRoot.append(
      this.checkboxLayer,
      this.actionBar,
      this.dialogHost,
      this.busyShield,
      this.notice
    );
    this.shadow.append(this.overlayRoot);

    this.observer = new MutationObserver((mutations) => {
      if (mutations.every((mutation) => this.isOwnMutation(mutation))) {
        return;
      }

      this.scheduleRefresh();
    });
  }

  async init(): Promise<void> {
    this.bulkMode = await storageGet(STORAGE_KEYS.bulkMode, FIRST_RUN_DEFAULTS.bulkMode);
    this.language = normalizeLanguage(await storageGet(STORAGE_KEYS.language, this.language));
    this.sidebarControls = await storageGet(
      STORAGE_KEYS.sidebarControls,
      FIRST_RUN_DEFAULTS.sidebarControls
    );
    this.speedMode = await storageGet(STORAGE_KEYS.speedMode, FIRST_RUN_DEFAULTS.speedMode);
    setActiveLanguage(this.language);
    this.syncStaticI18n();
    this.speedControls.init(this.speedMode, this.language);
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
      language: this.language,
      sidebarControls: this.sidebarControls,
      speedMode: this.speedMode,
      lastDeleteSummary: this.lastDeleteSummary
    };
  }

  async setBulkMode(enabled: boolean): Promise<ExtensionState> {
    if (this.bulkMode === enabled) {
      return this.getState();
    }

    this.bulkMode = enabled;
    void storageSet(STORAGE_KEYS.bulkMode, enabled);
    this.syncToolbarSpacer();
    this.refreshRows();
    this.render({ recollectOnSpacerChange: false });
    return this.getState();
  }

  async setLanguage(language: LanguageCode): Promise<ExtensionState> {
    this.language = normalizeLanguage(language);
    setActiveLanguage(this.language);
    this.syncStaticI18n();
    this.speedControls.setLanguage(this.language);
    void storageSet(STORAGE_KEYS.language, this.language);
    this.refresh();
    return this.getState();
  }

  async setSidebarControls(enabled: boolean): Promise<ExtensionState> {
    if (this.sidebarControls === enabled) {
      return this.getState();
    }

    this.sidebarControls = enabled;
    void storageSet(STORAGE_KEYS.sidebarControls, enabled);
    this.render();
    return this.getState();
  }

  async setSpeedMode(enabled: boolean): Promise<ExtensionState> {
    if (this.speedMode === enabled) {
      return this.getState();
    }

    this.speedMode = enabled;
    void storageSet(STORAGE_KEYS.speedMode, enabled);
    await this.speedControls.setEnabled(enabled);
    return this.getState();
  }

  selectAllVisible(): ExtensionState {
    this.selectedIds = selectAll(this.selectableRows().map((row) => row.id));
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
    return this.requestActionSelected("delete");
  }

  requestArchiveSelected(): ExtensionState {
    return this.requestActionSelected("archive");
  }

  requestActionSelected(action: BulkConversationAction): ExtensionState {
    if (this.selectedIds.size > 0 && !this.isDeleting) {
      const pinnedRow = Array.from(this.selectedIds)
        .map((id) => this.rows.get(id))
        .find((row) => row?.isPinned);

      if (pinnedRow) {
        this.showPinnedNotice(pinnedRow);
        return this.getState();
      }

      this.showActionDialog(action);
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
            language: this.language,
            sidebarControls: this.sidebarControls,
            speedMode: this.speedMode,
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
      case MESSAGE_TYPES.setLanguage:
        return this.setLanguage(message.language);
      case MESSAGE_TYPES.setSidebarControls:
        return this.setSidebarControls(message.enabled);
      case MESSAGE_TYPES.setSpeedMode:
        return this.setSpeedMode(message.enabled);
      case MESSAGE_TYPES.selectAllVisible:
        return this.selectAllVisible();
      case MESSAGE_TYPES.clearSelection:
        return this.clearSelection();
      case MESSAGE_TYPES.archiveSelected:
        return this.requestArchiveSelected();
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
    this.refreshRows();
    this.render();
  }

  private refreshRows(): void {
    this.clearRowHighlights();
    const nextRows = collectConversationRows();
    this.rows = new Map(nextRows.map((row) => [row.id, row]));
    this.applyRowHighlights();
  }

  private render(options: { recollectOnSpacerChange?: boolean } = {}): void {
    const recollectOnSpacerChange = options.recollectOnSpacerChange ?? true;
    document.documentElement.classList.toggle("gptbd-bulk-active", this.bulkMode);
    this.host.toggleAttribute("data-active", this.bulkMode);
    this.clearRowHighlights();
    this.applyRowHighlights();
    if (this.syncToolbarSpacer() && recollectOnSpacerChange) {
      this.refreshRows();
    }
    this.renderSelectionLayer();
    this.renderActionBar();
    this.renderNoticePosition();
  }

  private syncStaticI18n(): void {
    this.overlayRoot.setAttribute("aria-label", t("overlayAria"));
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
    button.setAttribute("aria-label", t("rowToggleAria", { title: row.title }));
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

      if (row.isPinned) {
        this.showPinnedNotice(row);
        return;
      }

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
    button.classList.toggle("is-pinned", row.isPinned);
    button.setAttribute("role", "checkbox");
    button.setAttribute("aria-checked", String(selected));
    button.setAttribute(
      "aria-label",
      row.isPinned
        ? t("pinnedSelectAria", { title: row.title })
        : t("rowSelectAria", { title: row.title })
    );
    button.toggleAttribute("data-pinned", row.isPinned);
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

      if (row.isPinned) {
        this.showPinnedNotice(row);
        return;
      }

      this.toggleRowSelection(row.id);
    });

    return button;
  }

  private renderActionBar(): void {
    this.actionBar.className = "action-bar";
    this.actionBar.dataset.mode = this.bulkMode ? "on" : "off";
    this.actionBar.hidden = !this.sidebarControls || !this.toolbarSpacer.isConnected;

    if (!this.sidebarControls || !this.toolbarSpacer.isConnected) {
      this.actionBar.replaceChildren();
      this.actionBar.removeAttribute("style");
      return;
    }

    const sidebarRect = this.getSidebarRect();
    const toolbarRect = this.toolbarSpacer.isConnected
      ? this.toolbarSpacer.getBoundingClientRect()
      : null;
    const metrics = this.getActionBarMetrics(sidebarRect);
    this.actionBar.dataset.density = metrics.density;
    this.toolbarSpacer.dataset.gptbdDensity = metrics.density;
    this.actionBar.style.left = `${metrics.left}px`;
    this.actionBar.style.top = `${this.getActionBarTop(sidebarRect, toolbarRect)}px`;
    this.actionBar.style.bottom = "auto";
    this.actionBar.style.width = `${metrics.width}px`;

    const topRow = document.createElement("div");
    topRow.className = "toolbar-top";

    const count = document.createElement("span");
    count.className = "selected-count";
    count.textContent = this.bulkMode
      ? t("toolbarSelectedCount", { count: this.selectedIds.size })
      : t("toolbarOff");

    const toggleButton = createActionButton("", () => {
      void this.setBulkMode(!this.bulkMode);
    });
    toggleButton.className = "mode-toggle";
    toggleButton.setAttribute("role", "switch");
    toggleButton.setAttribute("aria-checked", String(this.bulkMode));
    toggleButton.setAttribute("aria-label", t("bulkModeAria"));
    toggleButton.title = t("bulkModeAria");

    const toggleThumb = document.createElement("span");
    toggleThumb.className = "mode-toggle-thumb";
    toggleButton.append(toggleThumb);

    topRow.append(count, toggleButton);

    if (!this.bulkMode) {
      this.actionBar.replaceChildren(topRow);
      return;
    }

    const selectableRows = this.selectableRows();
    const allVisibleSelected =
      selectableRows.length > 0 &&
      selectableRows.every((row) => this.selectedIds.has(row.id));
    const actionsRow = document.createElement("div");
    actionsRow.className = "toolbar-actions";

    const selectAllButton = createActionButton(
      allVisibleSelected ? t("actionDeselectAllShort") : t("actionSelectAllShort"),
      () => {
        if (allVisibleSelected) {
          this.clearSelection();
          return;
        }

        this.selectAllVisible();
      }
    );
    selectAllButton.setAttribute(
      "aria-label",
      allVisibleSelected ? t("actionDeselectAll") : t("actionSelectAll")
    );
    selectAllButton.disabled = selectableRows.length === 0 || this.isDeleting;

    const clearButton = createActionButton(t("actionClear"), () => {
      this.clearSelection();
    });
    clearButton.disabled = this.selectedIds.size === 0 || this.isDeleting;

    const archiveButton = createActionButton(t("actionArchive"), () => {
      this.showActionDialog("archive");
    });
    archiveButton.disabled = this.selectedIds.size === 0 || this.isDeleting;

    const deleteButton = createActionButton(t("actionDelete"), () => {
      this.showActionDialog("delete");
    });
    deleteButton.className = "danger";
    deleteButton.disabled = this.selectedIds.size === 0 || this.isDeleting;

    actionsRow.append(selectAllButton, clearButton, archiveButton, deleteButton);
    this.actionBar.replaceChildren(topRow, actionsRow);
  }

  private syncToolbarSpacer(): boolean {
    let changed = false;
    const anchor = this.findHistoryHeader();

    if (!anchor || !this.sidebarControls) {
      changed = this.toolbarSpacer.isConnected;
      this.toolbarSpacer.remove();
      return changed;
    }

    if (this.toolbarSpacer.dataset.gptbdMode !== (this.bulkMode ? "on" : "off")) {
      changed = true;
    }
    this.toolbarSpacer.dataset.gptbdMode = this.bulkMode ? "on" : "off";
    const density = this.getActionBarMetrics(this.getSidebarRect()).density;
    if (this.toolbarSpacer.dataset.gptbdDensity !== density) {
      changed = true;
    }
    this.toolbarSpacer.dataset.gptbdDensity = density;

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

  private showActionDialog(action: BulkConversationAction): void {
    if (this.selectedIds.size === 0 || this.isDeleting) {
      return;
    }

    const config = ACTION_CONFIG[action];
    const backdrop = document.createElement("div");
    backdrop.className = "dialog-backdrop";

    const dialog = document.createElement("section");
    dialog.className = "dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", `gptbd-confirm-${action}-title`);

    const title = document.createElement("h2");
    title.id = `gptbd-confirm-${action}-title`;
    title.textContent = t(config.dialogTitleKey);

    const body = document.createElement("p");
    body.textContent = t(config.dialogBodyKey, { count: this.selectedIds.size });

    const actions = document.createElement("div");
    actions.className = "dialog-actions";

    const cancel = createActionButton(t("actionCancel"), () => {
      this.dialogHost.replaceChildren();
    });
    const confirm = createActionButton(t(config.buttonLabelKey), () => {
      this.dialogHost.replaceChildren();
      void this.applyActionToSelectedConversations(action);
    });
    if (config.danger) {
      confirm.className = "danger";
    }

    actions.append(cancel, confirm);
    dialog.append(title, body, actions);
    backdrop.append(dialog);
    this.dialogHost.replaceChildren(backdrop);
    cancel.focus();
  }

  private async applyActionToSelectedConversations(action: BulkConversationAction): Promise<void> {
    const config = ACTION_CONFIG[action];
    const selectedRows = Array.from(this.selectedIds)
      .map((id) => this.rows.get(id))
      .filter((row): row is ConversationRow => Boolean(row));

    if (selectedRows.length === 0) {
      this.showNotice(t("noVisibleSelected"));
      return;
    }

    this.isDeleting = true;
    this.lastDeleteSummary = undefined;
    this.showBusyShield(t(config.busySelectedKey));
    this.render();

    const results: DeleteItemResult[] = [];

    for (const row of selectedRows) {
      if (row.isPinned) {
        results.push({
          id: row.id,
          title: row.title,
          ok: false,
          error: t("pinnedError")
        });
        this.showPinnedNotice(row);
        continue;
      }

      const truncatedTitle = truncate(row.title, 42);
      this.showBusyShield(t(config.busyItemKey, { title: truncatedTitle }));
      this.showNotice(t(config.busyItemKey, { title: truncatedTitle }));

      try {
        await applyConversationAction(row, config);
        results.push({ id: row.id, title: row.title, ok: true });
        this.selectedIds = removeSelected(this.selectedIds, [row.id]);
      } catch (error) {
        results.push({
          id: row.id,
          title: row.title,
          ok: false,
          error: getErrorMessage(error)
        });
        break;
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
    this.hideBusyShield();
    this.showNotice(
      failed > 0
        ? t(config.summaryFailedKey, { done: deleted, failed })
        : t(config.summarySuccessKey, { count: deleted })
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

  private getActionBarMetrics(sidebarRect: DOMRect): {
    left: number;
    width: number;
    density: ToolbarDensity;
  } {
    const left = Math.max(sidebarRect.left + 8, 8);
    const availableWidth = Math.max(0, sidebarRect.right - left - 8);
    const width = Math.min(computeActionBarWidth(sidebarRect), availableWidth);
    return {
      left,
      width,
      density: width < 310 ? "compact" : "normal"
    };
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
    const row = this.rows.get(id);

    if (row?.isPinned && !this.selectedIds.has(id)) {
      this.showPinnedNotice(row);
      return;
    }

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

  private isOwnMutation(mutation: MutationRecord): boolean {
    const nodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];

    return nodes.length > 0 && nodes.every((node) => node === this.toolbarSpacer);
  }

  private selectableRows(): ConversationRow[] {
    return Array.from(this.rows.values()).filter((row) => !row.isPinned);
  }

  private showPinnedNotice(row: ConversationRow): void {
    this.showNotice(t("pinnedNotice", { title: truncate(row.title, 42) }));
  }

  private showBusyShield(message: string): void {
    this.busyShield.textContent = message;
    this.busyShield.hidden = false;
  }

  private hideBusyShield(): void {
    this.busyShield.hidden = true;
    this.busyShield.textContent = "";
  }
}

async function applyConversationAction(
  row: ConversationRow,
  config: BulkActionConfig
): Promise<void> {
  if (await applyConversationApiAction(row, config)) {
    return;
  }

  await applyConversationUiAction(row, config);
}

async function applyConversationApiAction(
  row: ConversationRow,
  config: BulkActionConfig
): Promise<boolean> {
  const token = await getChatGptAccessToken();

  if (!token) {
    return false;
  }

  try {
    const response = await fetch(`${CONVERSATION_API_PREFIX}${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(config.apiPayload)
    });

    if (!response.ok) {
      return false;
    }

    const result = await parseJsonSafely(response);

    if (result && typeof result === "object" && "success" in result && result.success === false) {
      return false;
    }

    removeVisibleConversationRow(row);
    await waitFor(() => !findAnchorByConversationId(row.id), 1400, 80).catch(() => null);
    return true;
  } catch {
    return false;
  }
}

async function applyConversationUiAction(
  row: ConversationRow,
  config: BulkActionConfig
): Promise<void> {
  row.row.scrollIntoView({ block: "center", inline: "nearest" });
  revealRow(row.row);
  await delay(180);

  const actionItem = await openConversationMenuForAction(row, config);
  clickElement(actionItem);

  if (config.requiresMenuConfirm) {
    await confirmConversationDialog(row, config);
  } else {
    const confirmButton = await waitFor(
      () => findDialogConfirmButton(config),
      900
    ).catch(() => null);

    if (confirmButton) {
      clickElement(confirmButton);
    }
  }

  await waitFor(() => !findAnchorByConversationId(row.id), 7000);
}

async function confirmConversationDialog(
  row: ConversationRow,
  config: BulkActionConfig
): Promise<void> {
  for (const activate of [
    clickElement,
    clickElement,
    clickElement,
    keyboardActivateElement,
    spaceActivateElement
  ]) {
    const confirmButton = await waitFor(
      () => findDialogConfirmButton(config),
      4000,
      60
    );
    confirmButton.scrollIntoView({ block: "center", inline: "nearest" });
    activate(confirmButton);

    const deleted = await waitFor(
      () => !findAnchorByConversationId(row.id),
      1400,
      80
    ).catch(() => false);

    if (deleted) {
      return;
    }

    const currentButton = findDialogConfirmButton(config);

    if (!currentButton) {
      break;
    }
  }

  await waitFor(() => !findAnchorByConversationId(row.id), 5000, 100);
}

async function openConversationMenuForAction(
  row: ConversationRow,
  config: BulkActionConfig
): Promise<HTMLElement> {
  const menuButton = await waitFor(() => findMenuButton(row.row), 2200);
  const cleanupExpose = forceExposeMenuButton(row.row, menuButton);

  try {
    for (const activate of [clickElement, keyboardActivateElement]) {
      const cleanupPrevent = preventAnchorNavigation(row.anchor);
      let actionItem: HTMLElement | null = null;

      try {
        activate(menuButton);
        actionItem = await waitFor(
          () => findVisibleMenuAction(config),
          1000,
          60
        ).catch(() => null);
      } finally {
        cleanupPrevent();
      }

      if (actionItem) {
        return actionItem;
      }

      await delay(120);
    }
  } finally {
    cleanupExpose();
  }

  throw new Error(`Could not open menu for "${row.title}".`);
}

function findMenuButton(row: HTMLElement): HTMLElement | null {
  revealRow(row);
  const candidates = Array.from(
    row.querySelectorAll<HTMLElement>(
      'button,[role="button"],[aria-haspopup="menu"],[data-testid*="menu" i],[data-testid*="option" i]'
    )
  );

  const labelled = candidates.find((candidate) => {
    const label = getAccessibleLabel(candidate);
    return MENU_LABELS.some((keyword) => label.includes(keyword));
  });

  if (labelled) {
    return labelled;
  }

  const rowRect = row.getBoundingClientRect();
  const overlapping = candidates
    .map((candidate) => ({ candidate, rect: candidate.getBoundingClientRect() }))
    .filter(({ rect }) => rect.right > rowRect.left && rect.left < rowRect.right)
    .sort((a, b) => b.rect.left - a.rect.left);

  return overlapping[0]?.candidate ?? candidates.at(-1) ?? null;
}

function forceExposeMenuButton(row: HTMLElement, menuButton: HTMLElement): () => void {
  const previous = {
    rowForce: row.getAttribute("data-gptbd-force-menu"),
    opacity: menuButton.style.getPropertyValue("opacity"),
    opacityPriority: menuButton.style.getPropertyPriority("opacity"),
    pointerEvents: menuButton.style.getPropertyValue("pointer-events"),
    pointerEventsPriority: menuButton.style.getPropertyPriority("pointer-events"),
    visibility: menuButton.style.getPropertyValue("visibility"),
    visibilityPriority: menuButton.style.getPropertyPriority("visibility")
  };

  row.setAttribute("data-gptbd-force-menu", "true");
  menuButton.style.setProperty("opacity", "1", "important");
  menuButton.style.setProperty("pointer-events", "auto", "important");
  menuButton.style.setProperty("visibility", "visible", "important");
  revealRow(row);

  return () => {
    if (previous.rowForce === null) {
      row.removeAttribute("data-gptbd-force-menu");
    } else {
      row.setAttribute("data-gptbd-force-menu", previous.rowForce);
    }

    restoreStyleProperty(menuButton, "opacity", previous.opacity, previous.opacityPriority);
    restoreStyleProperty(
      menuButton,
      "pointer-events",
      previous.pointerEvents,
      previous.pointerEventsPriority
    );
    restoreStyleProperty(
      menuButton,
      "visibility",
      previous.visibility,
      previous.visibilityPriority
    );
  };
}

function restoreStyleProperty(
  element: HTMLElement,
  property: string,
  value: string,
  priority: string
): void {
  if (value) {
    element.style.setProperty(property, value, priority);
    return;
  }

  element.style.removeProperty(property);
}

function preventAnchorNavigation(anchor: HTMLAnchorElement): () => void {
  const prevent = (event: Event) => {
    const target = event.target;

    if (target instanceof Node && anchor.contains(target)) {
      event.preventDefault();
    }
  };

  anchor.addEventListener("click", prevent, true);
  anchor.addEventListener("auxclick", prevent, true);

  return () => {
    anchor.removeEventListener("click", prevent, true);
    anchor.removeEventListener("auxclick", prevent, true);
  };
}

function findVisibleMenuAction(config: BulkActionConfig): HTMLElement | null {
  const menuRoots = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="menu"],[role="listbox"],[data-radix-popper-content-wrapper]'
    )
  ).filter(isVisibleElement);

  for (const root of menuRoots) {
    const candidates = findVisibleActionCandidates(root);
    const textMatch = findByAccessibleLabel(candidates, config.labels);

    if (textMatch) {
      return textMatch;
    }

    if (config.danger) {
      const dangerMatch = candidates.find(isDangerElement);

      if (dangerMatch) {
        return dangerMatch;
      }

      const menuItems = candidates.filter((candidate) => getRole(candidate) === "menuitem");

      if (menuItems.length >= 3) {
        return menuItems.at(-1) ?? null;
      }
    }
  }

  return null;
}

function findDialogConfirmButton(config: BulkActionConfig): HTMLElement | null {
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"],dialog')).filter(
    isVisibleElement
  );

  for (const root of dialogs) {
    const buttons = Array.from(root.querySelectorAll<HTMLElement>('button,[role="button"]')).filter(
      (button) => isVisibleElement(button) && isEnabledElement(button)
    );
    const dangerMatch = config.danger ? buttons.find(isDangerElement) : null;

    if (dangerMatch) {
      return dangerMatch;
    }

    const match = findByAccessibleLabel(buttons, config.confirmLabels);

    if (match) {
      return match;
    }

    if (config.danger && buttons.length >= 2) {
      return buttons.at(-1) ?? null;
    }
  }

  return null;
}

function findVisibleActionCandidates(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button,[role="button"],[role="menuitem"],[role="option"],div[tabindex],span[tabindex]'
    )
  ).filter(isVisibleElement);
}

function findByAccessibleLabel(
  candidates: HTMLElement[],
  keywords: string[]
): HTMLElement | null {
  return (
    candidates.find((candidate) => {
      const label = getAccessibleLabel(candidate);
      return keywords.some((keyword) => label.includes(keyword));
    }) ?? null
  );
}

function isDangerElement(element: HTMLElement): boolean {
  const attrValues = [
    element.getAttribute("class"),
    element.getAttribute("data-testid"),
    element.getAttribute("data-variant"),
    element.getAttribute("data-state"),
    element.getAttribute("aria-label"),
    element.getAttribute("title")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(danger|destructive|error|critical)\b/.test(attrValues)) {
    return true;
  }

  if (/(^|\s)(?:[\w-]+:)*(text|bg|border)-red[-\w/]*/.test(attrValues)) {
    return true;
  }

  const elementsToCheck = [element, ...Array.from(element.querySelectorAll<HTMLElement>("svg,*"))];
  return elementsToCheck.some((target) => {
    const style = window.getComputedStyle(target);
    return [style.color, style.backgroundColor, style.borderColor].some(isRedLikeColor);
  });
}

function getRole(element: HTMLElement): string {
  return element.getAttribute("role")?.toLowerCase() ?? "";
}

function isRedLikeColor(value: string): boolean {
  const rgb = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);

  if (!rgb) {
    return false;
  }

  const red = Number(rgb[1]);
  const green = Number(rgb[2]);
  const blue = Number(rgb[3]);

  return red >= 150 && red > green + 35 && red > blue + 35;
}

function findAnchorByConversationId(id: string): HTMLAnchorElement | null {
  const escaped = cssEscape(id);
  return document.querySelector<HTMLAnchorElement>(`a[href*="/c/${escaped}"]`);
}

async function getChatGptAccessToken(): Promise<string | null> {
  const now = Date.now();

  if (cachedAccessToken && cachedAccessToken.expiresAt > now) {
    return cachedAccessToken.token;
  }

  const bootstrapToken = readAccessTokenFromBootstrap();

  if (bootstrapToken) {
    cachedAccessToken = { token: bootstrapToken, expiresAt: now + 60_000 };
    return bootstrapToken;
  }

  try {
    const response = await fetch(AUTH_SESSION_ENDPOINT, {
      credentials: "include",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      return null;
    }

    const session = await parseJsonSafely(response);
    const token = findAccessTokenInJson(session);

    if (!token) {
      return null;
    }

    cachedAccessToken = { token, expiresAt: now + 60_000 };
    return token;
  } catch {
    return null;
  }
}

function readAccessTokenFromBootstrap(): string | null {
  const candidates = [
    document.getElementById("client-bootstrap")?.textContent,
    document.getElementById("__NEXT_DATA__")?.textContent
  ].filter((value): value is string => Boolean(value));

  for (const value of candidates) {
    try {
      const parsed = JSON.parse(value);
      const token = findAccessTokenInJson(parsed);

      if (token) {
        return token;
      }
    } catch {
      // Ignore non-JSON bootstrap content.
    }
  }

  return null;
}

function findAccessTokenInJson(value: unknown, depth = 0): string | null {
  if (!value || depth > 8) {
    return null;
  }

  if (typeof value !== "object") {
    return null;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "accessToken" && typeof child === "string" && child.length > 20) {
      return child;
    }

    const nested = findAccessTokenInJson(child, depth + 1);

    if (nested) {
      return nested;
    }
  }

  return null;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function removeVisibleConversationRow(row: ConversationRow): void {
  if (row.row.isConnected) {
    row.row.remove();
    return;
  }

  row.anchor.remove();
}

function revealRow(row: HTMLElement): void {
  for (const type of ["pointerover", "mouseover", "mouseenter"]) {
    row.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
  }
}

function clickElement(element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  const clientX = Math.round(rect.left + rect.width / 2);
  const clientY = Math.round(rect.top + rect.height / 2);
  const pointerInit: PointerEventInit = {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    button: 0,
    buttons: 1,
    pointerId: 1,
    pointerType: "mouse",
    isPrimary: true
  };
  const mouseInit: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX,
    clientY,
    button: 0,
    buttons: 1
  };

  element.dispatchEvent(new PointerEvent("pointerover", pointerInit));
  element.dispatchEvent(new PointerEvent("pointerenter", pointerInit));
  element.dispatchEvent(new MouseEvent("mouseover", mouseInit));
  element.dispatchEvent(new MouseEvent("mouseenter", mouseInit));
  element.dispatchEvent(new PointerEvent("pointerdown", pointerInit));
  element.dispatchEvent(new MouseEvent("mousedown", mouseInit));
  element.dispatchEvent(new PointerEvent("pointerup", { ...pointerInit, buttons: 0 }));
  element.dispatchEvent(new MouseEvent("mouseup", { ...mouseInit, buttons: 0 }));
  element.click();
}

function keyboardActivateElement(element: HTMLElement): void {
  element.focus({ preventScroll: true });
  const keyboardInit: KeyboardEventInit = {
    bubbles: true,
    cancelable: true,
    key: "Enter",
    code: "Enter"
  };
  element.dispatchEvent(new KeyboardEvent("keydown", keyboardInit));
  element.dispatchEvent(new KeyboardEvent("keyup", keyboardInit));
}

function spaceActivateElement(element: HTMLElement): void {
  element.focus({ preventScroll: true });
  const keyboardInit: KeyboardEventInit = {
    bubbles: true,
    cancelable: true,
    key: " ",
    code: "Space"
  };
  element.dispatchEvent(new KeyboardEvent("keydown", keyboardInit));
  element.dispatchEvent(new KeyboardEvent("keyup", keyboardInit));
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

function isEnabledElement(element: HTMLElement): boolean {
  if (element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true") {
    return false;
  }

  if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
    return !element.disabled;
  }

  return true;
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

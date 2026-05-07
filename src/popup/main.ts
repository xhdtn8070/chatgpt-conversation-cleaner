import {
  MESSAGE_TYPES,
  type ExtensionMessage,
  type ExtensionState
} from "../shared/messages";
import "./styles.css";

const bulkMode = getElement<HTMLInputElement>("bulkMode");
const statusText = getElement<HTMLElement>("statusText");
const visibleCount = getElement<HTMLElement>("visibleCount");
const selectedCount = getElement<HTMLElement>("selectedCount");
const selectAll = getElement<HTMLButtonElement>("selectAll");
const clear = getElement<HTMLButtonElement>("clear");
const archiveButton = getElement<HTMLButtonElement>("archive");
const deleteButton = getElement<HTMLButtonElement>("delete");
const hint = getElement<HTMLElement>("hint");

let currentState: ExtensionState | null = null;

bulkMode.addEventListener("change", () => {
  void sendAndRender({ type: MESSAGE_TYPES.setBulkMode, enabled: bulkMode.checked });
});

selectAll.addEventListener("click", () => {
  if (isAllVisibleSelected(currentState)) {
    void sendAndRender({ type: MESSAGE_TYPES.clearSelection });
    return;
  }

  void sendAndRender({ type: MESSAGE_TYPES.selectAllVisible });
});

clear.addEventListener("click", () => {
  void sendAndRender({ type: MESSAGE_TYPES.clearSelection });
});

archiveButton.addEventListener("click", () => {
  void sendAndRender({ type: MESSAGE_TYPES.archiveSelected });
});

deleteButton.addEventListener("click", () => {
  void sendAndRender({ type: MESSAGE_TYPES.deleteSelected });
});

void refresh();

async function refresh(): Promise<void> {
  try {
    const state = await sendToActiveTab<ExtensionState>({ type: MESSAGE_TYPES.getState });
    renderState(state);
  } catch {
    renderUnavailable();
  }
}

async function sendAndRender(message: ExtensionMessage): Promise<void> {
  setBusy(true);

  try {
    const state = await sendToActiveTab<ExtensionState>(message);
    renderState(state);
  } catch {
    renderUnavailable();
  } finally {
    setBusy(false);
  }
}

async function sendToActiveTab<T>(message: ExtensionMessage): Promise<T> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab?.id) {
    throw new Error("No active tab.");
  }

  return chrome.tabs.sendMessage(tab.id, message) as Promise<T>;
}

function renderState(state: ExtensionState): void {
  currentState = state;
  bulkMode.checked = state.bulkMode;
  statusText.textContent = state.isDeleting
    ? "Working"
    : state.bulkMode
      ? "Bulk mode on"
      : "Bulk mode off";
  visibleCount.textContent = String(state.visibleCount);
  selectedCount.textContent = String(state.selectedCount);
  hint.textContent =
    state.visibleCount > 0
      ? "The checkbox lane is rendered directly on the ChatGPT sidebar."
      : "No visible sidebar conversations were detected on this page.";

  const enabled = state.bulkMode && !state.isDeleting;
  selectAll.textContent = isAllVisibleSelected(state) ? "Deselect all" : "Select all";
  selectAll.disabled = !enabled || state.visibleCount === 0;
  clear.disabled = !enabled || state.selectedCount === 0;
  archiveButton.disabled = !enabled || state.selectedCount === 0;
  deleteButton.disabled = !enabled || state.selectedCount === 0;
}

function renderUnavailable(): void {
  currentState = null;
  bulkMode.checked = false;
  statusText.textContent = "Open ChatGPT";
  visibleCount.textContent = "0";
  selectedCount.textContent = "0";
  hint.textContent = "Open chatgpt.com, then reopen this popup to control Bulk mode.";
  selectAll.textContent = "Select all";
  selectAll.disabled = true;
  clear.disabled = true;
  archiveButton.disabled = true;
  deleteButton.disabled = true;
}

function setBusy(isBusy: boolean): void {
  bulkMode.disabled = isBusy;
  const state = currentState;
  const canUseActions = Boolean(state?.bulkMode) && !state?.isDeleting && !isBusy;
  selectAll.disabled = !canUseActions || (state?.visibleCount ?? 0) === 0;
  clear.disabled = !canUseActions || (state?.selectedCount ?? 0) === 0;
  archiveButton.disabled = !canUseActions || (state?.selectedCount ?? 0) === 0;
  deleteButton.disabled = !canUseActions || (state?.selectedCount ?? 0) === 0;
}

function isAllVisibleSelected(state: ExtensionState | null): boolean {
  return Boolean(state && state.visibleCount > 0 && state.selectedCount === state.visibleCount);
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing #${id}`);
  }

  return element as T;
}

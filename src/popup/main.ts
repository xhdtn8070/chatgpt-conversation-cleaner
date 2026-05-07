import {
  MESSAGE_TYPES,
  STORAGE_KEYS,
  type ExtensionMessage,
  type ExtensionState,
  type LanguagePreference
} from "../shared/messages";
import {
  getDefaultLanguage,
  normalizeLanguage,
  setActiveLanguage,
  t,
  type LanguageCode
} from "../shared/i18n";
import "./styles.css";

const bulkMode = getElement<HTMLInputElement>("bulkMode");
const bulkModeSwitch = getElement<HTMLLabelElement>("bulkModeSwitch");
const languageToggle = getElement<HTMLButtonElement>("languageToggle");
const appHeading = getElement<HTMLElement>("appHeading");
const statusLabel = getElement<HTMLElement>("statusLabel");
const statusText = getElement<HTMLElement>("statusText");
const visibleLabel = getElement<HTMLElement>("visibleLabel");
const visibleCount = getElement<HTMLElement>("visibleCount");
const selectedLabel = getElement<HTMLElement>("selectedLabel");
const selectedCount = getElement<HTMLElement>("selectedCount");
const bulkActions = getElement<HTMLElement>("bulkActions");
const selectAll = getElement<HTMLButtonElement>("selectAll");
const clear = getElement<HTMLButtonElement>("clear");
const archiveButton = getElement<HTMLButtonElement>("archive");
const deleteButton = getElement<HTMLButtonElement>("delete");
const hint = getElement<HTMLElement>("hint");

let currentState: ExtensionState | null = null;
let currentLanguage: LanguageCode = getDefaultLanguage();

setActiveLanguage(currentLanguage);
applyStaticCopy();

bulkMode.addEventListener("change", () => {
  void sendAndRender({ type: MESSAGE_TYPES.setBulkMode, enabled: bulkMode.checked });
});

languageToggle.addEventListener("click", () => {
  void changeLanguage(currentLanguage === "ko" ? "en" : "ko");
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

void init();

async function init(): Promise<void> {
  applyLanguage(await loadLanguagePreference());
  await refresh();
}

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

async function changeLanguage(language: LanguagePreference): Promise<void> {
  applyLanguage(language);
  await persistLanguagePreference(language);

  try {
    const state = await sendToActiveTab<ExtensionState>({
      type: MESSAGE_TYPES.setLanguage,
      language
    });
    renderState(state);
  } catch {
    renderUnavailable();
  }
}

function renderState(state: ExtensionState): void {
  if (state.language !== currentLanguage) {
    applyLanguage(state.language);
  }

  currentState = state;
  bulkMode.checked = state.bulkMode;
  statusText.textContent = state.isDeleting
    ? t("popupStatusWorking")
    : state.bulkMode
      ? t("popupStatusOn")
      : t("popupStatusOff");
  visibleCount.textContent = String(state.visibleCount);
  selectedCount.textContent = String(state.selectedCount);
  hint.textContent =
    state.visibleCount > 0
      ? t("popupHintReady")
      : t("popupHintNoRows");

  const enabled = state.bulkMode && !state.isDeleting;
  selectAll.textContent = isAllVisibleSelected(state) ? t("actionDeselectAll") : t("actionSelectAll");
  clear.textContent = t("actionClear");
  archiveButton.textContent = t("actionArchive");
  deleteButton.textContent = t("actionDelete");
  selectAll.disabled = !enabled || state.visibleCount === 0;
  clear.disabled = !enabled || state.selectedCount === 0;
  archiveButton.disabled = !enabled || state.selectedCount === 0;
  deleteButton.disabled = !enabled || state.selectedCount === 0;
}

function renderUnavailable(): void {
  currentState = null;
  bulkMode.checked = false;
  statusText.textContent = t("popupStatusOpenChatGpt");
  visibleCount.textContent = "0";
  selectedCount.textContent = "0";
  hint.textContent = t("popupHintUnavailable");
  selectAll.textContent = t("actionSelectAll");
  clear.textContent = t("actionClear");
  archiveButton.textContent = t("actionArchive");
  deleteButton.textContent = t("actionDelete");
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

function applyStaticCopy(): void {
  const nextLanguage = currentLanguage === "ko" ? "en" : "ko";
  const nextLanguageName = t(nextLanguage === "ko" ? "languageKorean" : "languageEnglish");

  document.documentElement.lang = currentLanguage;
  document.title = t("extensionName");
  appHeading.textContent = t("popupHeading");
  bulkModeSwitch.title = t("popupToggleTitle");
  languageToggle.textContent = nextLanguage.toUpperCase();
  languageToggle.title = t("languageToggleAria", { language: nextLanguageName });
  languageToggle.setAttribute("aria-label", t("languageToggleAria", { language: nextLanguageName }));
  statusLabel.textContent = t("popupStatusLabel");
  statusText.textContent = t("popupConnecting");
  visibleLabel.textContent = t("popupVisibleLabel");
  selectedLabel.textContent = t("popupSelectedLabel");
  bulkActions.setAttribute("aria-label", t("popupBulkActionsAria"));
  selectAll.textContent = t("actionSelectAll");
  clear.textContent = t("actionClear");
  archiveButton.textContent = t("actionArchive");
  deleteButton.textContent = t("actionDelete");
  hint.textContent = t("popupHintInitial");
}

function applyLanguage(language: LanguagePreference): void {
  currentLanguage = normalizeLanguage(language);
  setActiveLanguage(currentLanguage);
  applyStaticCopy();
}

async function loadLanguagePreference(): Promise<LanguagePreference> {
  try {
    const items = await chrome.storage.local.get(STORAGE_KEYS.language);
    return normalizeLanguage(items[STORAGE_KEYS.language]);
  } catch {
    return getDefaultLanguage();
  }
}

async function persistLanguagePreference(language: LanguagePreference): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.language]: language });
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing #${id}`);
  }

  return element as T;
}

import {
  FIRST_RUN_DEFAULTS,
  MESSAGE_TYPES,
  STORAGE_KEYS,
  type ExtensionMessage,
  type ExtensionState,
  type LanguagePreference,
  type SpeedStrategy
} from "../shared/messages";
import {
  getDefaultLanguage,
  normalizeLanguage,
  setActiveLanguage,
  t,
  type LanguageCode
} from "../shared/i18n";
import "./styles.css";

const extensionEnabled = getElement<HTMLInputElement>("extensionEnabled");
const extensionEnabledSwitch = getElement<HTMLLabelElement>("extensionEnabledSwitch");
const languageToggle = getElement<HTMLButtonElement>("languageToggle");
const appHeading = getElement<HTMLElement>("appHeading");
const cleanupModeLabel = getElement<HTMLElement>("cleanupModeLabel");
const cleanupModeHint = getElement<HTMLElement>("cleanupModeHint");
const cleanupModeToggle = getElement<HTMLButtonElement>("cleanupModeToggle");
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
const sidebarPanelLabel = getElement<HTMLElement>("sidebarPanelLabel");
const sidebarPanelHint = getElement<HTMLElement>("sidebarPanelHint");
const sidebarPanelToggle = getElement<HTMLButtonElement>("sidebarPanelToggle");
const speedModeLabel = getElement<HTMLElement>("speedModeLabel");
const speedModeHint = getElement<HTMLElement>("speedModeHint");
const speedModeSummary = getElement<HTMLElement>("speedModeSummary");
const speedModeToggle = getElement<HTMLButtonElement>("speedModeToggle");
const speedSettings = getElement<HTMLElement>("speedSettings");
const speedVisibleLabel = getElement<HTMLElement>("speedVisibleLabel");
const speedVisibleMessages = getElement<HTMLInputElement>("speedVisibleMessages");
const speedBatchLabel = getElement<HTMLElement>("speedBatchLabel");
const speedBatchMessages = getElement<HTMLInputElement>("speedBatchMessages");
const speedStrategyLabel = getElement<HTMLElement>("speedStrategyLabel");
const speedStrategyAfter = getElement<HTMLButtonElement>("speedStrategyAfter");
const speedStrategyPrehide = getElement<HTMLButtonElement>("speedStrategyPrehide");
const speedMetric = getElement<HTMLElement>("speedMetric");
const speedSettingsSave = getElement<HTMLButtonElement>("speedSettingsSave");
const speedSettingsSaved = getElement<HTMLElement>("speedSettingsSaved");
const supportTitle = getElement<HTMLElement>("supportTitle");
const supportText = getElement<HTMLElement>("supportText");
const supportLink = getElement<HTMLAnchorElement>("supportLink");
const sourceLink = getElement<HTMLAnchorElement>("sourceLink");
const hint = getElement<HTMLElement>("hint");

let currentState: ExtensionState | null = null;
let currentLanguage: LanguageCode = getDefaultLanguage();

setActiveLanguage(currentLanguage);
applyStaticCopy();

extensionEnabled.addEventListener("change", () => {
  void sendAndRender({
    type: MESSAGE_TYPES.setExtensionEnabled,
    enabled: extensionEnabled.checked
  });
});

languageToggle.addEventListener("click", () => {
  void changeLanguage(currentLanguage === "ko" ? "en" : "ko");
});

cleanupModeToggle.addEventListener("click", () => {
  void sendAndRender({
    type: MESSAGE_TYPES.setBulkMode,
    enabled: cleanupModeToggle.getAttribute("aria-checked") !== "true"
  });
});

sidebarPanelToggle.addEventListener("click", () => {
  void sendAndRender({
    type: MESSAGE_TYPES.setSidebarControls,
    enabled: sidebarPanelToggle.getAttribute("aria-checked") !== "true"
  });
});

speedModeToggle.addEventListener("click", () => {
  void sendAndRender({
    type: MESSAGE_TYPES.setSpeedMode,
    enabled: speedModeToggle.getAttribute("aria-checked") !== "true"
  });
});

speedSettingsSave.addEventListener("click", () => {
  void saveSpeedSettings();
});

speedStrategyAfter.addEventListener("click", () => {
  void setSpeedStrategy("after-render");
});

speedStrategyPrehide.addEventListener("click", () => {
  void setSpeedStrategy("prehide");
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
  extensionEnabled.checked = state.extensionEnabled;
  extensionEnabled.disabled = state.isDeleting;
  cleanupModeToggle.setAttribute("aria-checked", String(state.bulkMode));
  statusText.textContent = state.isDeleting
    ? t("popupStatusWorking")
    : !state.extensionEnabled
      ? t("popupStatusMasterOff")
      : state.bulkMode
        ? t("popupStatusOn")
        : t("popupStatusReady");
  visibleCount.textContent = String(state.visibleCount);
  selectedCount.textContent = String(state.selectedCount);
  hint.textContent =
    !state.extensionEnabled
      ? t("popupHintDisabled")
      : state.visibleCount > 0
        ? state.bulkMode
          ? t("popupHintReady")
          : t("popupHintCleanupOff")
        : t("popupHintNoRows");

  const enabled = state.extensionEnabled && state.bulkMode && !state.isDeleting;
  selectAll.textContent = isAllVisibleSelected(state) ? t("actionDeselectAll") : t("actionSelectAll");
  clear.textContent = t("actionClear");
  archiveButton.textContent = t("actionArchive");
  deleteButton.textContent = t("actionDelete");
  sidebarPanelToggle.setAttribute("aria-checked", String(state.sidebarControls));
  speedModeToggle.setAttribute("aria-checked", String(state.speedMode));
  renderSpeedSettings(state);
  selectAll.disabled = !enabled || state.visibleCount === 0;
  clear.disabled = !enabled || state.selectedCount === 0;
  archiveButton.disabled = !enabled || state.selectedCount === 0;
  deleteButton.disabled = !enabled || state.selectedCount === 0;
  cleanupModeToggle.disabled = state.isDeleting;
  sidebarPanelToggle.disabled = state.isDeleting;
  speedModeToggle.disabled = state.isDeleting;
  speedVisibleMessages.disabled = state.isDeleting;
  speedBatchMessages.disabled = state.isDeleting;
  speedStrategyAfter.disabled = state.isDeleting;
  speedStrategyPrehide.disabled = state.isDeleting;
  speedSettingsSave.disabled = state.isDeleting;
}

function renderUnavailable(): void {
  currentState = null;
  extensionEnabled.checked = false;
  extensionEnabled.disabled = true;
  cleanupModeToggle.setAttribute("aria-checked", String(FIRST_RUN_DEFAULTS.bulkMode));
  statusText.textContent = t("popupStatusOpenChatGpt");
  visibleCount.textContent = "0";
  selectedCount.textContent = "0";
  hint.textContent = t("popupHintUnavailable");
  selectAll.textContent = t("actionSelectAll");
  clear.textContent = t("actionClear");
  archiveButton.textContent = t("actionArchive");
  deleteButton.textContent = t("actionDelete");
  sidebarPanelToggle.setAttribute("aria-checked", String(FIRST_RUN_DEFAULTS.sidebarControls));
  speedModeToggle.setAttribute("aria-checked", String(FIRST_RUN_DEFAULTS.speedMode));
  speedVisibleMessages.value = String(FIRST_RUN_DEFAULTS.speedVisibleMessages);
  speedBatchMessages.value = String(FIRST_RUN_DEFAULTS.speedBatchMessages);
  renderSpeedStrategy(FIRST_RUN_DEFAULTS.speedStrategy);
  speedMetric.textContent = t("popupSpeedMetricPending");
  speedModeSummary.textContent = t("popupSpeedSummary", {
    visible: FIRST_RUN_DEFAULTS.speedVisibleMessages,
    batch: FIRST_RUN_DEFAULTS.speedBatchMessages
  });
  speedSettings.hidden = true;
  speedSettingsSaved.textContent = "";
  selectAll.disabled = true;
  clear.disabled = true;
  archiveButton.disabled = true;
  deleteButton.disabled = true;
  cleanupModeToggle.disabled = true;
  sidebarPanelToggle.disabled = true;
  speedModeToggle.disabled = true;
  speedVisibleMessages.disabled = true;
  speedBatchMessages.disabled = true;
  speedStrategyAfter.disabled = true;
  speedStrategyPrehide.disabled = true;
  speedSettingsSave.disabled = true;
}

function setBusy(isBusy: boolean): void {
  extensionEnabled.disabled = isBusy;
  const state = currentState;
  const canUseActions =
    Boolean(state?.extensionEnabled) && Boolean(state?.bulkMode) && !state?.isDeleting && !isBusy;
  selectAll.disabled = !canUseActions || (state?.visibleCount ?? 0) === 0;
  clear.disabled = !canUseActions || (state?.selectedCount ?? 0) === 0;
  archiveButton.disabled = !canUseActions || (state?.selectedCount ?? 0) === 0;
  deleteButton.disabled = !canUseActions || (state?.selectedCount ?? 0) === 0;
  cleanupModeToggle.disabled = isBusy || !state;
  sidebarPanelToggle.disabled = isBusy || !state;
  speedModeToggle.disabled = isBusy || !state;
  speedVisibleMessages.disabled = isBusy || !state;
  speedBatchMessages.disabled = isBusy || !state;
  speedStrategyAfter.disabled = isBusy || !state;
  speedStrategyPrehide.disabled = isBusy || !state;
  speedSettingsSave.disabled = isBusy || !state;
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
  extensionEnabledSwitch.title = t("popupMasterToggleTitle");
  extensionEnabled.setAttribute("aria-label", t("popupMasterToggleTitle"));
  languageToggle.textContent = nextLanguage.toUpperCase();
  languageToggle.title = t("languageToggleAria", { language: nextLanguageName });
  languageToggle.setAttribute("aria-label", t("languageToggleAria", { language: nextLanguageName }));
  statusLabel.textContent = t("popupStatusLabel");
  statusText.textContent = t("popupConnecting");
  cleanupModeLabel.textContent = t("popupCleanupModeLabel");
  cleanupModeHint.textContent = t("popupCleanupModeHint");
  cleanupModeToggle.title = t("popupCleanupModeAria");
  cleanupModeToggle.setAttribute("aria-label", t("popupCleanupModeAria"));
  visibleLabel.textContent = t("popupVisibleLabel");
  selectedLabel.textContent = t("popupSelectedLabel");
  bulkActions.setAttribute("aria-label", t("popupBulkActionsAria"));
  selectAll.textContent = t("actionSelectAll");
  clear.textContent = t("actionClear");
  archiveButton.textContent = t("actionArchive");
  deleteButton.textContent = t("actionDelete");
  sidebarPanelLabel.textContent = t("popupSidebarPanelLabel");
  sidebarPanelHint.textContent = t("popupSidebarPanelHint");
  sidebarPanelToggle.title = t("popupSidebarPanelAria");
  sidebarPanelToggle.setAttribute("aria-label", t("popupSidebarPanelAria"));
  speedModeLabel.textContent = t("popupSpeedModeLabel");
  speedModeHint.textContent = t("popupSpeedModeHint");
  speedModeToggle.title = t("popupSpeedModeAria");
  speedModeToggle.setAttribute("aria-label", t("popupSpeedModeAria"));
  speedSettings.setAttribute("aria-label", t("popupSpeedSettingsAria"));
  speedVisibleLabel.textContent = t("popupSpeedVisibleLabel");
  speedBatchLabel.textContent = t("popupSpeedBatchLabel");
  speedStrategyLabel.textContent = t("popupSpeedStrategyLabel");
  speedStrategyAfter.textContent = t("popupSpeedStrategyAfter");
  speedStrategyPrehide.textContent = t("popupSpeedStrategyPrehide");
  speedSettingsSave.textContent = t("popupSpeedSave");
  supportTitle.textContent = t("popupSupportTitle");
  supportText.textContent = t("popupSupportText");
  supportLink.textContent = t("popupSupportLink");
  supportLink.setAttribute("aria-label", t("popupSupportLink"));
  sourceLink.textContent = t("popupSourceLink");
  sourceLink.setAttribute("aria-label", t("popupSourceLink"));
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

function renderSpeedSettings(state: ExtensionState): void {
  speedVisibleMessages.value = String(state.speedVisibleMessages);
  speedBatchMessages.value = String(state.speedBatchMessages);
  renderSpeedStrategy(state.speedStrategy);
  speedMetric.textContent =
    state.speedRenderMs === null
      ? t("popupSpeedMetricPending")
      : t("popupSpeedMetric", { seconds: formatSeconds(state.speedRenderMs) });
  speedModeSummary.textContent = t("popupSpeedSummary", {
    visible: state.speedVisibleMessages,
    batch: state.speedBatchMessages
  });
  speedSettings.hidden = !state.speedMode;
  speedSettingsSaved.textContent = "";
}

function renderSpeedStrategy(strategy: SpeedStrategy): void {
  speedStrategyAfter.setAttribute("aria-pressed", String(strategy === "after-render"));
  speedStrategyPrehide.setAttribute("aria-pressed", String(strategy === "prehide"));
}

async function setSpeedStrategy(strategy: SpeedStrategy): Promise<void> {
  await sendAndRender({
    type: MESSAGE_TYPES.setSpeedStrategy,
    strategy
  });
}

async function saveSpeedSettings(): Promise<void> {
  const state = currentState;

  if (!state) {
    return;
  }

  await sendAndRender({
    type: MESSAGE_TYPES.setSpeedSettings,
    visibleMessages: clampNumber(speedVisibleMessages.valueAsNumber, 1, 100),
    batchMessages: clampNumber(speedBatchMessages.valueAsNumber, 1, 50)
  });
  speedSettingsSaved.textContent = t("popupSpeedSaved");
}

function clampNumber(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : min;
}

function formatSeconds(ms: number): string {
  return (ms / 1000).toFixed(2);
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing #${id}`);
  }

  return element as T;
}

export const STORAGE_KEYS = {
  bulkMode: "gptbd.bulkMode",
  language: "gptbd.language",
  sidebarControls: "gptbd.sidebarControls",
  speedMode: "gptbd.speedMode",
  speedVisibleMessages: "gptbd.speedVisibleMessages",
  speedBatchMessages: "gptbd.speedBatchMessages"
} as const;

export const FIRST_RUN_DEFAULTS = {
  bulkMode: false,
  sidebarControls: true,
  speedMode: false,
  speedVisibleMessages: 10,
  speedBatchMessages: 2
} as const;

export const MESSAGE_TYPES = {
  getState: "GPTBD_GET_STATE",
  setBulkMode: "GPTBD_SET_BULK_MODE",
  setLanguage: "GPTBD_SET_LANGUAGE",
  setSidebarControls: "GPTBD_SET_SIDEBAR_CONTROLS",
  setSpeedMode: "GPTBD_SET_SPEED_MODE",
  setSpeedSettings: "GPTBD_SET_SPEED_SETTINGS",
  selectAllVisible: "GPTBD_SELECT_ALL_VISIBLE",
  clearSelection: "GPTBD_CLEAR_SELECTION",
  archiveSelected: "GPTBD_ARCHIVE_SELECTED",
  deleteSelected: "GPTBD_DELETE_SELECTED"
} as const;

export type LanguagePreference = "en" | "ko";

export type DeleteItemResult = {
  id: string;
  title: string;
  ok: boolean;
  error?: string;
};

export type DeleteSummary = {
  attempted: number;
  deleted: number;
  failed: number;
  items: DeleteItemResult[];
};

export type ExtensionState = {
  available: boolean;
  bulkMode: boolean;
  selectedCount: number;
  visibleCount: number;
  isDeleting: boolean;
  language: LanguagePreference;
  sidebarControls: boolean;
  speedMode: boolean;
  speedVisibleMessages: number;
  speedBatchMessages: number;
  lastDeleteSummary?: DeleteSummary;
};

export type ExtensionMessage =
  | { type: typeof MESSAGE_TYPES.getState }
  | { type: typeof MESSAGE_TYPES.setBulkMode; enabled: boolean }
  | { type: typeof MESSAGE_TYPES.setLanguage; language: LanguagePreference }
  | { type: typeof MESSAGE_TYPES.setSidebarControls; enabled: boolean }
  | { type: typeof MESSAGE_TYPES.setSpeedMode; enabled: boolean }
  | {
      type: typeof MESSAGE_TYPES.setSpeedSettings;
      visibleMessages: number;
      batchMessages: number;
    }
  | { type: typeof MESSAGE_TYPES.selectAllVisible }
  | { type: typeof MESSAGE_TYPES.clearSelection }
  | { type: typeof MESSAGE_TYPES.archiveSelected }
  | { type: typeof MESSAGE_TYPES.deleteSelected };

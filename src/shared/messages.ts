export const STORAGE_KEYS = {
  bulkMode: "gptbd.bulkMode",
  language: "gptbd.language"
} as const;

export const MESSAGE_TYPES = {
  getState: "GPTBD_GET_STATE",
  setBulkMode: "GPTBD_SET_BULK_MODE",
  setLanguage: "GPTBD_SET_LANGUAGE",
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
  lastDeleteSummary?: DeleteSummary;
};

export type ExtensionMessage =
  | { type: typeof MESSAGE_TYPES.getState }
  | { type: typeof MESSAGE_TYPES.setBulkMode; enabled: boolean }
  | { type: typeof MESSAGE_TYPES.setLanguage; language: LanguagePreference }
  | { type: typeof MESSAGE_TYPES.selectAllVisible }
  | { type: typeof MESSAGE_TYPES.clearSelection }
  | { type: typeof MESSAGE_TYPES.archiveSelected }
  | { type: typeof MESSAGE_TYPES.deleteSelected };

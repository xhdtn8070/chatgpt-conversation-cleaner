export type LanguageCode = "en" | "ko";

type MessageDefinition = {
  message: string;
  placeholders?: readonly string[];
};

const EN_MESSAGES = {
  overlayAria: { message: "ChatGPT bulk delete controls" },
  bulkModeAria: { message: "Bulk delete mode" },
  toolbarOff: { message: "Bulk delete off" },
  toolbarSelectedCount: { message: "$count selected", placeholders: ["count"] },
  modeOn: { message: "On" },
  modeOff: { message: "Off" },
  actionSelectAllShort: { message: "All" },
  actionDeselectAllShort: { message: "None" },
  actionSelectAll: { message: "Select all" },
  actionDeselectAll: { message: "Deselect all" },
  actionClear: { message: "Clear" },
  actionArchive: { message: "Archive" },
  actionDelete: { message: "Delete" },
  actionCancel: { message: "Cancel" },
  rowToggleAria: { message: "Toggle $title", placeholders: ["title"] },
  rowSelectAria: { message: "Select $title", placeholders: ["title"] },
  pinnedSelectAria: {
    message: "$title is pinned. Unpin before selecting.",
    placeholders: ["title"]
  },
  pinnedNotice: {
    message: "\"$title\" is pinned. Unpin it in ChatGPT before selecting.",
    placeholders: ["title"]
  },
  pinnedError: { message: "Pinned conversations must be unpinned first." },
  noVisibleSelected: { message: "No visible selected conversations to process." },
  dialogArchiveTitle: { message: "Confirm archive" },
  dialogArchiveBody: {
    message:
      "Archive $count selected conversations? You can restore archived chats from ChatGPT settings.",
    placeholders: ["count"]
  },
  dialogDeleteTitle: { message: "Confirm delete" },
  dialogDeleteBody: {
    message:
      "Delete $count selected conversations? This uses ChatGPT's visible delete controls and cannot be undone here.",
    placeholders: ["count"]
  },
  busyArchiveSelected: { message: "Archiving selected conversations..." },
  busyDeleteSelected: { message: "Deleting selected conversations..." },
  busyArchiveItem: { message: "Archiving \"$title\"...", placeholders: ["title"] },
  busyDeleteItem: { message: "Deleting \"$title\"...", placeholders: ["title"] },
  summaryArchiveSuccess: { message: "$count conversations archived.", placeholders: ["count"] },
  summaryDeleteSuccess: { message: "$count conversations deleted.", placeholders: ["count"] },
  summaryArchiveFailed: {
    message: "$done archived, $failed failed. Failed items remain selected.",
    placeholders: ["done", "failed"]
  },
  summaryDeleteFailed: {
    message: "$done deleted, $failed failed. Failed items remain selected.",
    placeholders: ["done", "failed"]
  },
  speedModeAria: { message: "Speed mode for long conversations" },
  speedHiddenSummary: {
    message: "$hidden older collapsed · $visible shown",
    placeholders: ["hidden", "visible"]
  },
  speedLoadMore: { message: "Load $count more", placeholders: ["count"] },
  speedViewAll: { message: "View all" },
  speedAllShown: { message: "All shown" }
} as const satisfies Record<string, MessageDefinition>;

export type MessageKey = keyof typeof EN_MESSAGES;

const KO_MESSAGES: Record<MessageKey, MessageDefinition> = {
  overlayAria: { message: "ChatGPT 일괄 삭제 컨트롤" },
  bulkModeAria: { message: "일괄 삭제 모드" },
  toolbarOff: { message: "일괄 정리 꺼짐" },
  toolbarSelectedCount: { message: "$count개 선택됨", placeholders: ["count"] },
  modeOn: { message: "켬" },
  modeOff: { message: "끔" },
  actionSelectAllShort: { message: "전체" },
  actionDeselectAllShort: { message: "해제" },
  actionSelectAll: { message: "전체 선택" },
  actionDeselectAll: { message: "전체 해제" },
  actionClear: { message: "초기화" },
  actionArchive: { message: "보관" },
  actionDelete: { message: "삭제" },
  actionCancel: { message: "취소" },
  rowToggleAria: { message: "$title 선택 전환", placeholders: ["title"] },
  rowSelectAria: { message: "$title 선택", placeholders: ["title"] },
  pinnedSelectAria: {
    message: "$title은 고정된 대화입니다. 선택하기 전에 고정을 해제하세요.",
    placeholders: ["title"]
  },
  pinnedNotice: {
    message: "\"$title\"은 고정된 대화입니다. ChatGPT에서 고정을 해제한 뒤 선택하세요.",
    placeholders: ["title"]
  },
  pinnedError: { message: "고정된 대화는 먼저 고정을 해제해야 합니다." },
  noVisibleSelected: { message: "처리할 수 있는 표시된 선택 대화가 없습니다." },
  dialogArchiveTitle: { message: "보관 확인" },
  dialogArchiveBody: {
    message: "선택한 대화 $count개를 보관할까요? 보관된 대화는 ChatGPT 설정에서 복원할 수 있습니다.",
    placeholders: ["count"]
  },
  dialogDeleteTitle: { message: "삭제 확인" },
  dialogDeleteBody: {
    message: "선택한 대화 $count개를 삭제할까요? ChatGPT의 삭제 흐름을 사용하며 여기서는 되돌릴 수 없습니다.",
    placeholders: ["count"]
  },
  busyArchiveSelected: { message: "선택한 대화를 보관 중..." },
  busyDeleteSelected: { message: "선택한 대화를 삭제 중..." },
  busyArchiveItem: { message: "\"$title\" 보관 중...", placeholders: ["title"] },
  busyDeleteItem: { message: "\"$title\" 삭제 중...", placeholders: ["title"] },
  summaryArchiveSuccess: { message: "대화 $count개를 보관했습니다.", placeholders: ["count"] },
  summaryDeleteSuccess: { message: "대화 $count개를 삭제했습니다.", placeholders: ["count"] },
  summaryArchiveFailed: {
    message: "$done개 보관됨, $failed개 실패. 실패 항목은 선택 상태로 남아 있습니다.",
    placeholders: ["done", "failed"]
  },
  summaryDeleteFailed: {
    message: "$done개 삭제됨, $failed개 실패. 실패 항목은 선택 상태로 남아 있습니다.",
    placeholders: ["done", "failed"]
  },
  speedModeAria: { message: "긴 대화 속도 모드" },
  speedHiddenSummary: {
    message: "이전 $hidden개 접힘 · $visible개 표시 중",
    placeholders: ["hidden", "visible"]
  },
  speedLoadMore: { message: "$count개 더 보기", placeholders: ["count"] },
  speedViewAll: { message: "전체 보기" },
  speedAllShown: { message: "모두 표시됨" }
};

let activeLanguage = getDefaultLanguage();

export function t(key: MessageKey, values: Record<string, string | number | boolean> = {}): string {
  const definition = getMessages(activeLanguage)[key] ?? EN_MESSAGES[key];
  return interpolate(definition.message, values);
}

export function setActiveLanguage(language: LanguageCode): void {
  activeLanguage = language;
}

export function getDefaultLanguage(): LanguageCode {
  if (typeof chrome !== "undefined" && chrome.i18n?.getUILanguage) {
    return normalizeLanguage(chrome.i18n.getUILanguage());
  }

  return normalizeLanguage(navigator.language || document.documentElement.lang);
}

export function normalizeLanguage(language: unknown): LanguageCode {
  return typeof language === "string" && language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

function getMessages(language: LanguageCode): Record<MessageKey, MessageDefinition> {
  return language === "ko" ? KO_MESSAGES : EN_MESSAGES;
}

function interpolate(message: string, values: Record<string, string | number | boolean>): string {
  return message.replace(/\$([a-zA-Z][a-zA-Z0-9_]*)/g, (_match, name: string) =>
    String(values[name] ?? "")
  );
}

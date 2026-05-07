export type LanguageCode = "en" | "ko";

type MessageDefinition = {
  message: string;
  placeholders?: readonly string[];
};

const EN_MESSAGES = {
  extensionName: { message: "Conversation Cleaner for ChatGPT" },
  extensionDescription: {
    message:
      "A safer bulk selection layer for archiving or deleting ChatGPT conversations from the sidebar."
  },
  popupHeading: { message: "Cleaner" },
  popupToggleTitle: { message: "Toggle bulk selection mode" },
  popupBulkActionsAria: { message: "Bulk actions" },
  popupStatusLabel: { message: "Status" },
  popupVisibleLabel: { message: "Visible" },
  popupSelectedLabel: { message: "Selected" },
  popupConnecting: { message: "Connecting..." },
  popupStatusWorking: { message: "Working" },
  popupStatusOn: { message: "Bulk mode on" },
  popupStatusOff: { message: "Bulk mode off" },
  popupStatusOpenChatGpt: { message: "Open ChatGPT" },
  popupHintReady: { message: "The checkbox lane is rendered directly on the ChatGPT sidebar." },
  popupHintNoRows: { message: "No visible sidebar conversations were detected on this page." },
  popupHintUnavailable: {
    message: "Open chatgpt.com, then reopen this popup to control Bulk mode."
  },
  popupHintInitial: {
    message: "Open ChatGPT and turn on Bulk mode to show the sidebar checkbox lane."
  },
  popupSidebarPanelLabel: { message: "Sidebar panel" },
  popupSidebarPanelHint: { message: "Show bulk controls inside ChatGPT's sidebar." },
  popupSidebarPanelAria: { message: "Show sidebar bulk controls" },
  popupSpeedModeLabel: { message: "Speed mode" },
  popupSpeedModeHint: {
    message: "Open long chats with only recent messages rendered first."
  },
  popupSpeedModeAria: { message: "Speed mode for long conversations" },
  popupSpeedSummary: {
    message: "Initial $visible · Load $batch each",
    placeholders: ["visible", "batch"]
  },
  popupSpeedSettingsAria: { message: "Speed mode settings" },
  popupSpeedVisibleLabel: { message: "Initial messages" },
  popupSpeedBatchLabel: { message: "Load more size" },
  popupSpeedSave: { message: "Save" },
  popupSpeedSaved: { message: "Saved" },
  languageToggleAria: { message: "Switch language to $language", placeholders: ["language"] },
  languageEnglish: { message: "English" },
  languageKorean: { message: "Korean" },
  actionSelectAll: { message: "Select all" },
  actionDeselectAll: { message: "Deselect all" },
  actionClear: { message: "Clear" },
  actionArchive: { message: "Archive" },
  actionDelete: { message: "Delete" }
} as const satisfies Record<string, MessageDefinition>;

export type MessageKey = keyof typeof EN_MESSAGES;

const KO_MESSAGES: Record<MessageKey, MessageDefinition> = {
  extensionName: { message: "ChatGPT 대화 정리" },
  extensionDescription: {
    message: "ChatGPT 사이드바에서 대화를 더 안전하게 일괄 선택하고 보관하거나 삭제합니다."
  },
  popupHeading: { message: "정리" },
  popupToggleTitle: { message: "일괄 선택 모드 전환" },
  popupBulkActionsAria: { message: "일괄 작업" },
  popupStatusLabel: { message: "상태" },
  popupVisibleLabel: { message: "표시됨" },
  popupSelectedLabel: { message: "선택됨" },
  popupConnecting: { message: "연결 중..." },
  popupStatusWorking: { message: "작업 중" },
  popupStatusOn: { message: "일괄 모드 켜짐" },
  popupStatusOff: { message: "일괄 모드 꺼짐" },
  popupStatusOpenChatGpt: { message: "ChatGPT 열기" },
  popupHintReady: { message: "체크박스 영역이 ChatGPT 사이드바에 표시됩니다." },
  popupHintNoRows: { message: "이 페이지에서 표시된 사이드바 대화를 찾지 못했습니다." },
  popupHintUnavailable: {
    message: "chatgpt.com을 연 다음 팝업을 다시 열어 일괄 모드를 제어하세요."
  },
  popupHintInitial: {
    message: "ChatGPT를 열고 일괄 모드를 켜면 사이드바 체크박스가 표시됩니다."
  },
  popupSidebarPanelLabel: { message: "좌측 패널" },
  popupSidebarPanelHint: { message: "ChatGPT 사이드바 안에 일괄 컨트롤을 표시합니다." },
  popupSidebarPanelAria: { message: "좌측 일괄 컨트롤 표시" },
  popupSpeedModeLabel: { message: "속도 모드" },
  popupSpeedModeHint: { message: "긴 대화는 최근 메시지만 먼저 렌더링합니다." },
  popupSpeedModeAria: { message: "긴 대화 속도 모드" },
  popupSpeedSummary: {
    message: "초기 $visible개 · 더보기 $batch개씩",
    placeholders: ["visible", "batch"]
  },
  popupSpeedSettingsAria: { message: "속도 모드 설정" },
  popupSpeedVisibleLabel: { message: "초기 표시" },
  popupSpeedBatchLabel: { message: "더보기 개수" },
  popupSpeedSave: { message: "저장" },
  popupSpeedSaved: { message: "저장됨" },
  languageToggleAria: { message: "$language로 전환", placeholders: ["language"] },
  languageEnglish: { message: "영어" },
  languageKorean: { message: "한국어" },
  actionSelectAll: { message: "전체 선택" },
  actionDeselectAll: { message: "전체 해제" },
  actionClear: { message: "초기화" },
  actionArchive: { message: "보관" },
  actionDelete: { message: "삭제" }
};

let activeLanguage = getDefaultLanguage();

export function t(key: MessageKey, values: Record<string, string | number | boolean> = {}): string {
  const definition = getMessages(activeLanguage)[key] ?? EN_MESSAGES[key];
  return interpolate(definition.message, values);
}

export function setActiveLanguage(language: LanguageCode): void {
  activeLanguage = language;
}

export function getActiveLanguage(): LanguageCode {
  return activeLanguage;
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

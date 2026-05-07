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
  popupMasterToggleTitle: { message: "Turn Conversation Cleaner on or off" },
  popupBulkActionsAria: { message: "Bulk actions" },
  popupStatusLabel: { message: "Status" },
  popupVisibleLabel: { message: "Visible" },
  popupSelectedLabel: { message: "Selected" },
  popupConnecting: { message: "Connecting..." },
  popupStatusWorking: { message: "Working" },
  popupStatusOn: { message: "Bulk mode on" },
  popupStatusOff: { message: "Bulk mode off" },
  popupStatusReady: { message: "Ready" },
  popupStatusMasterOff: { message: "Extension off" },
  popupStatusOpenChatGpt: { message: "Open ChatGPT" },
  popupHintReady: { message: "The checkbox lane is rendered directly on the ChatGPT sidebar." },
  popupHintCleanupOff: { message: "Turn on Cleanup mode to select sidebar conversations." },
  popupHintDisabled: { message: "The extension is off. Turn on the top switch to use cleanup or speed mode." },
  popupHintNoRows: { message: "No visible sidebar conversations were detected on this page." },
  popupHintUnavailable: {
    message: "Open chatgpt.com, then reopen this popup to control Bulk mode."
  },
  popupHintInitial: {
    message: "Open ChatGPT and turn on Bulk mode to show the sidebar checkbox lane."
  },
  popupCleanupModeLabel: { message: "Cleanup mode" },
  popupCleanupModeHint: { message: "Enable sidebar selection and cleanup actions." },
  popupCleanupModeAria: { message: "Cleanup mode" },
  popupSidebarPanelLabel: { message: "Sidebar panel" },
  popupSidebarPanelHint: { message: "Show bulk controls inside ChatGPT's sidebar." },
  popupSidebarPanelAria: { message: "Show sidebar bulk controls" },
  popupSpeedModeLabel: { message: "Speed mode" },
  popupSpeedModeHint: {
    message: "Keep long chats focused on recent messages first."
  },
  popupSpeedModeAria: { message: "Speed mode for long conversations" },
  popupSpeedSummary: {
    message: "Recent $visible · Load $batch each",
    placeholders: ["visible", "batch"]
  },
  popupSpeedSettingsAria: { message: "Speed mode settings" },
  popupSpeedVisibleLabel: { message: "Recent messages" },
  popupSpeedBatchLabel: { message: "Load more size" },
  popupSpeedMetricPending: { message: "Render: measuring" },
  popupSpeedMetricNotApplicable: { message: "Render: long chats only" },
  popupSpeedMetric: {
    message: "Render: $seconds s",
    placeholders: ["seconds"]
  },
  popupSpeedSave: { message: "Save" },
  popupSpeedSaved: { message: "Saved" },
  popupSupportTitle: { message: "Support Cleaner" },
  popupSupportText: {
    message: "Free and open source. Support development on GitHub Sponsors."
  },
  popupSupportLink: { message: "Sponsor on GitHub" },
  popupSourceLink: { message: "View source on GitHub" },
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
  popupMasterToggleTitle: { message: "Conversation Cleaner 전체 켜기 또는 끄기" },
  popupBulkActionsAria: { message: "일괄 작업" },
  popupStatusLabel: { message: "상태" },
  popupVisibleLabel: { message: "표시됨" },
  popupSelectedLabel: { message: "선택됨" },
  popupConnecting: { message: "연결 중..." },
  popupStatusWorking: { message: "작업 중" },
  popupStatusOn: { message: "일괄 모드 켜짐" },
  popupStatusOff: { message: "일괄 모드 꺼짐" },
  popupStatusReady: { message: "대기 중" },
  popupStatusMasterOff: { message: "전체 꺼짐" },
  popupStatusOpenChatGpt: { message: "ChatGPT 열기" },
  popupHintReady: { message: "체크박스 영역이 ChatGPT 사이드바에 표시됩니다." },
  popupHintCleanupOff: { message: "정리 모드를 켜면 사이드바 대화를 선택할 수 있습니다." },
  popupHintDisabled: { message: "확장 기능이 꺼져 있습니다. 상단 스위치를 켜면 정리/속도 모드를 사용할 수 있습니다." },
  popupHintNoRows: { message: "이 페이지에서 표시된 사이드바 대화를 찾지 못했습니다." },
  popupHintUnavailable: {
    message: "chatgpt.com을 연 다음 팝업을 다시 열어 일괄 모드를 제어하세요."
  },
  popupHintInitial: {
    message: "ChatGPT를 열고 일괄 모드를 켜면 사이드바 체크박스가 표시됩니다."
  },
  popupCleanupModeLabel: { message: "정리 모드" },
  popupCleanupModeHint: { message: "사이드바 선택과 정리 작업을 활성화합니다." },
  popupCleanupModeAria: { message: "정리 모드" },
  popupSidebarPanelLabel: { message: "좌측 패널" },
  popupSidebarPanelHint: { message: "ChatGPT 사이드바 안에 일괄 컨트롤을 표시합니다." },
  popupSidebarPanelAria: { message: "좌측 일괄 컨트롤 표시" },
  popupSpeedModeLabel: { message: "속도 모드" },
  popupSpeedModeHint: { message: "긴 대화는 최근 메시지를 먼저 보여줍니다." },
  popupSpeedModeAria: { message: "긴 대화 속도 모드" },
  popupSpeedSummary: {
    message: "최근 $visible개 · 더보기 $batch개씩",
    placeholders: ["visible", "batch"]
  },
  popupSpeedSettingsAria: { message: "속도 모드 설정" },
  popupSpeedVisibleLabel: { message: "최근 표시" },
  popupSpeedBatchLabel: { message: "더보기 개수" },
  popupSpeedMetricPending: { message: "렌더 측정 대기" },
  popupSpeedMetricNotApplicable: { message: "렌더 긴 대화에서만 적용" },
  popupSpeedMetric: {
    message: "렌더 $seconds초",
    placeholders: ["seconds"]
  },
  popupSpeedSave: { message: "저장" },
  popupSpeedSaved: { message: "저장됨" },
  popupSupportTitle: { message: "프로젝트 응원하기" },
  popupSupportText: {
    message: "무료 오픈소스 유지를 GitHub Sponsors로 응원해주세요."
  },
  popupSupportLink: { message: "GitHub Sponsors로 후원하기" },
  popupSourceLink: { message: "GitHub에서 소스 보기" },
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

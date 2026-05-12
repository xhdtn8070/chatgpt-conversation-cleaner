export type ConversationRow = {
  id: string;
  href: string;
  title: string;
  anchor: HTMLAnchorElement;
  row: HTMLElement;
  rect: DOMRect;
  sidebarRect: DOMRect;
  isPinned: boolean;
};

const CONVERSATION_PATH = /\/c\/([^/?#]+)/;

const SIDEBAR_SELECTORS = [
  "nav",
  "aside",
  '[data-testid*="sidebar" i]',
  '[aria-label*="sidebar" i]',
  '[class*="sidebar" i]',
  '[id*="sidebar" i]'
].join(",");

export function getConversationId(href: string, baseUrl = window.location.href): string | null {
  try {
    const url = new URL(href, baseUrl);
    return url.pathname.match(CONVERSATION_PATH)?.[1] ?? null;
  } catch {
    return href.match(CONVERSATION_PATH)?.[1] ?? null;
  }
}

export function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function findSidebarRoot(doc: Document = document): HTMLElement | null {
  const candidates = Array.from(doc.querySelectorAll<HTMLElement>(SIDEBAR_SELECTORS));
  let best: HTMLElement | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const anchors = candidate.querySelectorAll('a[href*="/c/"]').length;
    if (anchors === 0) {
      continue;
    }

    const rect = candidate.getBoundingClientRect();
    const leftBias = rect.left < 480 ? 2 : 0;
    const semanticBias = candidate.matches("nav,aside") ? 2 : 0;
    const widthBias = rect.width > 0 && rect.width <= 460 ? 1 : 0;
    const score = anchors * 4 + leftBias + semanticBias + widthBias;

    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

export function collectConversationRows(doc: Document = document): ConversationRow[] {
  const sidebar = findSidebarRoot(doc);
  const searchRoot: ParentNode = sidebar ?? doc;
  const anchors = Array.from(searchRoot.querySelectorAll<HTMLAnchorElement>('a[href*="/c/"]'));
  const sidebarRect = sidebar?.getBoundingClientRect() ?? defaultSidebarRect();
  const byId = new Map<string, ConversationRow>();

  for (const anchor of anchors) {
    const id = getConversationId(anchor.href);
    if (!id || byId.has(id)) {
      continue;
    }

    const rect = anchor.getBoundingClientRect();
    if (!isProbablySidebarConversation(rect, sidebarRect, Boolean(sidebar))) {
      continue;
    }

    const row = resolveRowElement(anchor);
    const title = resolveTitle(anchor);

    byId.set(id, {
      id,
      href: anchor.href,
      title: title || "Untitled conversation",
      anchor,
      row,
      rect,
      sidebarRect,
      isPinned: isPinnedConversation(row, sidebar)
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.rect.top - b.rect.top);
}

export function resolveRowElement(anchor: HTMLAnchorElement): HTMLElement {
  const matched = anchor.closest<HTMLElement>(
    'li,[role="listitem"],[data-testid*="conversation" i],[class*="conversation" i]'
  );

  if (matched) {
    return matched;
  }

  return anchor.parentElement ?? anchor;
}

export function isProbablySidebarConversation(
  rect: DOMRect,
  sidebarRect: DOMRect,
  hasSidebarRoot: boolean
): boolean {
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  if (rect.height < 18 || rect.height > 96) {
    return false;
  }

  if (!hasSidebarRoot) {
    return rect.left < Math.min(520, window.innerWidth * 0.5);
  }

  const horizontallyOverlapsSidebar = rect.left < sidebarRect.right && rect.right > sidebarRect.left;

  return horizontallyOverlapsSidebar;
}

function resolveTitle(anchor: HTMLAnchorElement): string {
  const label =
    anchor.getAttribute("aria-label") ??
    anchor.getAttribute("title") ??
    anchor.textContent ??
    "";

  return normalizeTitle(label);
}

function isPinnedConversation(row: HTMLElement, sidebar: HTMLElement | null): boolean {
  const attrValues = [row, ...Array.from(row.querySelectorAll<HTMLElement>("*"))]
    .flatMap((element) => [
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.getAttribute("data-testid"),
      element.getAttribute("data-state"),
      element.getAttribute("class")
    ])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /\b(pinned|unpin)\b/.test(attrValues) ||
    /고정된 대화|고정됨|고정 해제|핀 해제/.test(attrValues)
  ) {
    return true;
  }

  if (!sidebar) {
    return false;
  }

  const rowRect = row.getBoundingClientRect();
  const header = Array.from(sidebar.querySelectorAll<HTMLElement>("div,p,span,h2,h3"))
    .filter((element) => {
      if (element.contains(row) || element.querySelector('a[href*="/c/"]')) {
        return false;
      }

      const text = normalizeTitle(element.textContent ?? "");
      const rect = element.getBoundingClientRect();
      return text.length > 0 && text.length <= 32 && rect.top < rowRect.top;
    })
    .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0];

  const headerText = normalizeTitle(header?.textContent ?? "").toLowerCase();
  return /\bpinned\b/.test(headerText) || /고정/.test(headerText);
}

function defaultSidebarRect(): DOMRect {
  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: Math.min(360, window.innerWidth),
    bottom: window.innerHeight,
    width: Math.min(360, window.innerWidth),
    height: window.innerHeight,
    toJSON: () => ({})
  } as DOMRect;
}

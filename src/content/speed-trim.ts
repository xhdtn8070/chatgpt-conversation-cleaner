export type ConversationTrimStats = {
  totalVisible: number;
  keptVisible: number;
  hiddenVisible: number;
  nativeStartIndex: number;
  currentNodeId: string;
  nodeCount: number;
};

export type ConversationTrimResult = {
  data: Record<string, unknown>;
  trimmed: boolean;
  stats: ConversationTrimStats;
};

const CONVERSATION_API_ID = /\/backend-api\/conversation\/([^/?#]+)/;
const VISIBLE_ROLES = new Set(["user", "assistant", "tool"]);

type JsonRecord = Record<string, unknown>;
type MappingNode = JsonRecord & {
  id?: string;
  parent?: string | null;
  children?: unknown;
  message?: unknown;
};

export function getConversationIdFromApiUrl(url: string, base = window.location.href): string | null {
  try {
    const parsed = new URL(url, base);

    if (parsed.pathname === "/backend-api/conversations") {
      return null;
    }

    return parsed.pathname.match(CONVERSATION_API_ID)?.[1] ?? null;
  } catch {
    return url.match(CONVERSATION_API_ID)?.[1] ?? null;
  }
}

export function trimChatGptConversation(
  input: unknown,
  visibleLimit: number
): ConversationTrimResult | null {
  if (!isRecord(input) || !isRecord(input.mapping)) {
    return null;
  }

  const mapping = input.mapping as Record<string, MappingNode>;
  const currentNodeId = typeof input.current_node === "string" ? input.current_node : null;

  if (!currentNodeId || !mapping[currentNodeId]) {
    return null;
  }

  const chain = buildActiveChain(mapping, currentNodeId);

  if (chain.length === 0) {
    return null;
  }

  const visibleEntries = chain
    .map((nodeId) => ({ nodeId, node: mapping[nodeId] }))
    .filter(({ node }) => isVisibleConversationNode(node));
  const totalVisible = visibleEntries.length;
  const normalizedLimit = Math.max(1, Math.floor(visibleLimit));
  const nativeStartIndex = Math.max(0, totalVisible - normalizedLimit);
  const keptVisible = Math.min(totalVisible, normalizedLimit);
  const hiddenVisible = Math.max(0, totalVisible - keptVisible);

  if (hiddenVisible === 0) {
    return {
      data: input,
      trimmed: false,
      stats: {
        totalVisible,
        keptVisible: totalVisible,
        hiddenVisible: 0,
        nativeStartIndex: 0,
        currentNodeId,
        nodeCount: Object.keys(mapping).length
      }
    };
  }

  const cutoffNodeId = visibleEntries[nativeStartIndex]?.nodeId;
  const cutoffChainIndex = cutoffNodeId ? chain.indexOf(cutoffNodeId) : 0;
  const kept = new Set<string>();

  for (let index = 0; index < cutoffChainIndex; index += 1) {
    const nodeId = chain[index];

    if (!isVisibleConversationNode(mapping[nodeId])) {
      kept.add(nodeId);
    }
  }

  for (let index = cutoffChainIndex; index < chain.length; index += 1) {
    kept.add(chain[index]);
  }

  const keptChain = chain.filter((nodeId) => kept.has(nodeId));
  const newMapping: Record<string, MappingNode> = {};

  for (let index = 0; index < keptChain.length; index += 1) {
    const nodeId = keptChain[index];
    const node = deepClone(mapping[nodeId]);
    node.parent = index > 0 ? keptChain[index - 1] : null;
    node.children = index < keptChain.length - 1 ? [keptChain[index + 1]] : [];
    newMapping[nodeId] = node;
  }

  return {
    data: {
      ...input,
      mapping: newMapping,
      root: keptChain[0] ?? currentNodeId,
      current_node: currentNodeId
    },
    trimmed: true,
    stats: {
      totalVisible,
      keptVisible,
      hiddenVisible,
      nativeStartIndex,
      currentNodeId,
      nodeCount: Object.keys(mapping).length
    }
  };
}

function buildActiveChain(mapping: Record<string, MappingNode>, currentNodeId: string): string[] {
  const chain: string[] = [];
  const visited = new Set<string>();
  let nodeId: string | null = currentNodeId;

  while (nodeId && mapping[nodeId] && !visited.has(nodeId)) {
    visited.add(nodeId);
    chain.push(nodeId);
    const parent: unknown = mapping[nodeId].parent;
    nodeId = typeof parent === "string" ? parent : null;
  }

  return chain.reverse();
}

function isVisibleConversationNode(node: MappingNode): boolean {
  const message = isRecord(node.message) ? node.message : null;
  const role = normalizeRole(getNestedString(message, ["author", "role"]));

  return Boolean(message && VISIBLE_ROLES.has(role));
}

function normalizeRole(role: unknown): string {
  if (typeof role === "string") {
    return role;
  }

  return "unknown";
}

function getNestedString(input: unknown, path: string[]): string | undefined {
  let value = input;

  for (const key of path) {
    if (!isRecord(value)) {
      return undefined;
    }

    value = value[key];
  }

  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

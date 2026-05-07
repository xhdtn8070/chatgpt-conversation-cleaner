export type RectLike = Pick<DOMRect, "top" | "left" | "right" | "height" | "width">;

export type CheckboxLayout = {
  left: number;
  top: number;
  size: number;
  visibleSize: number;
};

export function computeCheckboxLayout(
  rowRect: RectLike,
  sidebarRect: RectLike,
  targetSize = 32,
  visibleSize = 16
): CheckboxLayout {
  const sidebarLeft = Number.isFinite(sidebarRect.left) ? sidebarRect.left : 0;
  const rowLeft = Number.isFinite(rowRect.left) ? rowRect.left : sidebarLeft;
  const rowTop = Number.isFinite(rowRect.top) ? rowRect.top : 0;
  const rowHeight = Math.max(rowRect.height, targetSize);
  const laneLeft = Math.max(0, Math.round(Math.max(sidebarLeft + 2, rowLeft - 28)));

  return {
    left: laneLeft,
    top: Math.round(rowTop + rowHeight / 2 - targetSize / 2),
    size: targetSize,
    visibleSize
  };
}

export function computeActionBarWidth(sidebarRect: RectLike): number {
  if (sidebarRect.width > 0) {
    return Math.min(Math.max(sidebarRect.width - 16, 260), 420);
  }

  const inferredWidth = sidebarRect.right - sidebarRect.left;
  return Math.min(Math.max(inferredWidth - 16, 260), 420);
}

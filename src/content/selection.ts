export type SelectionState = ReadonlySet<string>;

export function toggleSelection(
  selected: SelectionState,
  id: string,
  force?: boolean
): Set<string> {
  const next = new Set(selected);
  const shouldSelect = force ?? !next.has(id);

  if (shouldSelect) {
    next.add(id);
  } else {
    next.delete(id);
  }

  return next;
}

export function selectAll(ids: Iterable<string>): Set<string> {
  return new Set(ids);
}

export function clearSelection(): Set<string> {
  return new Set();
}

export function removeSelected(selected: SelectionState, idsToRemove: Iterable<string>): Set<string> {
  const next = new Set(selected);

  for (const id of idsToRemove) {
    next.delete(id);
  }

  return next;
}

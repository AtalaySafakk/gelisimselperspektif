/** Soft delete sonrası unique (parentId, order) slotunu serbest bırakır */
const ARCHIVED_ORDER_BASE = 9_000_000;

export function archivedOrderSlot(): number {
  return ARCHIVED_ORDER_BASE + (Date.now() % 1_000_000);
}

export function resolveOrderInsert(
  items: { order: number }[],
  requested?: number,
): number {
  if (requested === undefined || requested < 0) {
    const max = items.reduce((m, i) => Math.max(m, i.order), -1);
    return max + 1;
  }
  const taken = new Set(items.map((i) => i.order));
  if (!taken.has(requested)) return requested;
  let candidate = requested;
  while (taken.has(candidate)) candidate += 1;
  return candidate;
}

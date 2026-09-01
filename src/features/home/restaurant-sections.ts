/** Keep every restaurant in exactly one home card section, keyed by its ID. */
export function buildHomeSections<T extends { id: string; open: boolean }>(
  restaurants: readonly T[],
  openOnly: boolean,
) {
  const seen = new Set<string>();
  const items = restaurants.filter((item) => {
    if (seen.has(item.id) || (openOnly && !item.open)) return false;
    seen.add(item.id);
    return true;
  });
  const featured = openOnly ? [] : items.filter((item) => item.open).slice(0, 3);
  const featuredIds = new Set(featured.map((item) => item.id));
  const remaining = items.filter((item) => !featuredIds.has(item.id));
  return { items, featured, remaining };
}

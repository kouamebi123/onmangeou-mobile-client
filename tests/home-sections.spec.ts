import { describe, expect, it } from 'vitest';
import { buildHomeSections } from '../src/features/home/restaurant-sections';

const restaurants = [
  { id: 'gaston', name: 'Maquis Gaston Tardif', open: true },
  { id: 'republique', name: 'Attiéké République', open: true },
  { id: 'pontchaillou', name: 'Pontchaillou Poulet', open: true },
  { id: 'awa', name: 'Chez Awa', open: true },
  { id: 'plateau', name: 'Maquis du Plateau', open: false },
];

describe('home restaurant sections', () => {
  it('shows the three featured restaurants only once across all cards', () => {
    const { featured, remaining } = buildHomeSections(restaurants, false);
    expect(featured.map((item) => item.id)).toEqual(['gaston', 'republique', 'pontchaillou']);
    expect(remaining.map((item) => item.id)).toEqual(['awa', 'plateau']);
    expect(new Set([...featured, ...remaining].map((item) => item.id)).size).toBe(restaurants.length);
  });

  it('deduplicates repeated API IDs without merging different branches with the same name', () => {
    const branch = { ...restaurants[0]!, id: 'gaston-branch' };
    const { items } = buildHomeSections([...restaurants, restaurants[0]!, branch], false);
    expect(items).toHaveLength(6);
    expect(items.filter((item) => item.name === 'Maquis Gaston Tardif')).toHaveLength(2);
  });

  it('uses one list when the open-only filter is enabled', () => {
    const { featured, remaining } = buildHomeSections(restaurants, true);
    expect(featured).toEqual([]);
    expect(remaining).toEqual(restaurants.filter((item) => item.open));
  });

  it('handles empty and closed-only results', () => {
    expect(buildHomeSections([], false)).toEqual({ items: [], featured: [], remaining: [] });
    const closed = restaurants.filter((item) => !item.open);
    expect(buildHomeSections(closed, false).remaining).toEqual(closed);
  });

  it('does not mutate cached results and avoids repeated cards for a small result set', () => {
    const input = Object.freeze(restaurants.slice(0, 2));
    const { items, featured, remaining } = buildHomeSections(input, false);
    expect(input).toHaveLength(2);
    expect(items).not.toBe(input);
    expect(featured).toHaveLength(2);
    expect(remaining).toEqual([]);
  });
});

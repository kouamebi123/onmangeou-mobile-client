const FALLBACK_COVERS = [
  'https://images.unsplash.com/photo-1598103442097-8b74394b95c2?auto=format&fit=crop&w=1400&q=70',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1400&q=70',
  'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1400&q=70',
  'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=1400&q=70',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=70',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=70',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=70',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1400&q=70',
] as const;

export function restaurantCoverUrl(coverImageUrl: string | null | undefined, seed: string): string {
  if (coverImageUrl) {
    return coverImageUrl;
  }
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash + seed.charCodeAt(index) * (index + 1)) % FALLBACK_COVERS.length;
  }
  return FALLBACK_COVERS[hash] ?? FALLBACK_COVERS[0];
}

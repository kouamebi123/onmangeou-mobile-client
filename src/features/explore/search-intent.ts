export interface SearchIntent {
  q?: string;
  openNow?: boolean;
}

const OPEN_PATTERN = /\b(ouvert(?:e|s|es)?|open(?:\s+now)?)\b/gi;

/** Interprète une saisie libre comme Google Maps : « ouvert », plat, quartier. */
export function parseSearchIntent(raw: string): SearchIntent {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }
  let openNow = false;
  const withoutOpen = trimmed
    .replace(OPEN_PATTERN, () => {
      openNow = true;
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return {
    q: withoutOpen || undefined,
    openNow: openNow || undefined,
  };
}

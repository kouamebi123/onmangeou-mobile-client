/**
 * Sauvegarde et relecture du panier, pour qu'il survive à la fermeture de
 * l'application. Logique pure : ni React Native ni stockage ici.
 */

export interface CartLine {
  productId: string;
  name: string;
  unitAmount: string;
  formatted: string;
  quantity: number;
}

export interface CartSnapshot {
  establishmentId: string;
  establishmentName: string;
  establishmentSlug: string;
  lines: CartLine[];
}

export const MAX_LINE_QUANTITY = 20;
const MAX_LINES = 40;
/** Le stockage sécurisé d'iOS n'accepte pas de valeurs volumineuses : au-delà, on ne sauvegarde pas. */
export const MAX_SNAPSHOT_BYTES = 1900;

const SNAPSHOT_VERSION = 1;

function isText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

/** Panier compact à enregistrer, ou `null` s'il est vide ou trop volumineux. */
export function serializeCart(cart: {
  establishmentId: string | null;
  establishmentName: string | null;
  establishmentSlug: string | null;
  lines: readonly CartLine[];
}): string | null {
  if (!cart.establishmentId || !cart.establishmentName || !cart.establishmentSlug || cart.lines.length === 0) {
    return null;
  }
  const raw = JSON.stringify({
    v: SNAPSHOT_VERSION,
    e: [cart.establishmentId, cart.establishmentName, cart.establishmentSlug],
    l: cart.lines.map((line) => [line.productId, line.name, line.unitAmount, line.formatted, line.quantity]),
  });
  return raw.length > MAX_SNAPSHOT_BYTES ? null : raw;
}

/**
 * Relit un panier enregistré. Toute donnée inattendue (ancienne version,
 * contenu altéré) donne `null` : le panier repart vide plutôt que faux.
 */
export function parseCart(raw: string | null): CartSnapshot | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { v, e, l } = data as { v?: unknown; e?: unknown; l?: unknown };
  if (v !== SNAPSHOT_VERSION || !Array.isArray(e) || e.length !== 3 || !Array.isArray(l)) return null;
  if (!isText(e[0], 64) || !isText(e[1], 200) || !isText(e[2], 200)) return null;
  if (l.length === 0 || l.length > MAX_LINES) return null;

  const lines: CartLine[] = [];
  for (const entry of l) {
    if (!Array.isArray(entry) || entry.length !== 5) return null;
    const [productId, name, unitAmount, formatted, quantity] = entry as unknown[];
    if (!isText(productId, 64) || !isText(name, 200) || !isText(formatted, 40)) return null;
    if (typeof unitAmount !== 'string' || !/^\d{1,12}$/.test(unitAmount)) return null;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      return null;
    }
    lines.push({ productId, name, unitAmount, formatted, quantity });
  }

  return { establishmentId: e[0], establishmentName: e[1], establishmentSlug: e[2], lines };
}

export interface ReorderItem {
  productId: string;
  name: string;
  quantity: number;
}

export interface MenuEntry {
  id: string;
  name: string;
  available: boolean;
  price: { amount: string; formatted: string };
}

/**
 * Reconstitue un panier à partir d'une ancienne commande, aux prix et à la
 * disponibilité d'aujourd'hui. Les plats retirés ou en rupture sont listés à part.
 */
export function reorderLines(
  items: readonly ReorderItem[],
  menu: readonly MenuEntry[],
): { lines: CartLine[]; missing: string[] } {
  const byId = new Map(menu.map((product) => [product.id, product]));
  const lines: CartLine[] = [];
  const missing: string[] = [];

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product || !product.available) {
      missing.push(item.name);
      continue;
    }
    const existing = lines.find((line) => line.productId === product.id);
    if (existing) {
      existing.quantity = Math.min(MAX_LINE_QUANTITY, existing.quantity + item.quantity);
      continue;
    }
    lines.push({
      productId: product.id,
      name: product.name,
      unitAmount: product.price.amount,
      formatted: product.price.formatted,
      quantity: Math.min(MAX_LINE_QUANTITY, Math.max(1, item.quantity)),
    });
  }

  return { lines, missing };
}

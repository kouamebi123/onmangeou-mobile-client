import { parseCart, serializeCart } from './cart-snapshot';
import { useCartStore } from './cart-store';
import { kvDelete, kvGet, kvSet } from './kv-store';

const CART_KEY = 'onmangeou.cart.v1';

let started = false;

/**
 * Relit le panier enregistré puis le sauvegarde à chaque changement, pour le
 * retrouver après la fermeture de l'application. Sans effet si le stockage échoue.
 */
export async function startCartPersistence(): Promise<void> {
  if (started) {
    return;
  }
  started = true;

  const saved = parseCart(await kvGet(CART_KEY).catch(() => null));
  // Un plat ajouté pendant la relecture l'emporte sur le panier enregistré.
  if (saved && useCartStore.getState().lines.length === 0) {
    useCartStore.getState().replace(saved);
  }

  let last = serializeCart(useCartStore.getState());
  useCartStore.subscribe((state) => {
    const next = serializeCart(state);
    if (next === last) {
      return;
    }
    last = next;
    void (next === null ? kvDelete(CART_KEY) : kvSet(CART_KEY, next)).catch(() => undefined);
  });
}

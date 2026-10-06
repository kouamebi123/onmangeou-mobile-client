import { describe, expect, it } from 'vitest';

import { MAX_SNAPSHOT_BYTES, parseCart, reorderLines, serializeCart, type CartLine } from '../../src/store/cart-snapshot';

const line = (id: string, quantity = 1): CartLine => ({
  productId: id,
  name: `Plat ${id}`,
  unitAmount: '2500',
  formatted: '2 500 FCFA',
  quantity,
});

const cart = {
  establishmentId: 'est-1',
  establishmentName: 'Chez Tante Marie',
  establishmentSlug: 'chez-tante-marie',
  lines: [line('a', 2), line('b')],
};

describe('cart snapshot', () => {
  it('restores exactly what was saved', () => {
    expect(parseCart(serializeCart(cart))).toEqual(cart);
  });

  it('saves nothing for an empty cart', () => {
    expect(serializeCart({ ...cart, lines: [] })).toBeNull();
    expect(serializeCart({ ...cart, establishmentId: null })).toBeNull();
  });

  it('refuses to save a cart too large for secure storage', () => {
    const lines = Array.from({ length: 40 }, (_, index) => line(`produit-${index}`));
    expect(serializeCart({ ...cart, lines })).toBeNull();
    const saved = serializeCart(cart);
    expect(saved).not.toBeNull();
    expect((saved ?? '').length).toBeLessThanOrEqual(MAX_SNAPSHOT_BYTES);
  });

  it('starts empty rather than wrong when the saved data is unexpected', () => {
    expect(parseCart(null)).toBeNull();
    expect(parseCart('pas du json')).toBeNull();
    expect(parseCart('{"v":2,"e":["a","b","c"],"l":[]}')).toBeNull();
    expect(parseCart('{"v":1,"e":["a","b"],"l":[["p","n","100","100 FCFA",1]]}')).toBeNull();
    // Quantité hors limites, montant non numérique, quantité décimale.
    expect(parseCart('{"v":1,"e":["a","b","c"],"l":[["p","n","100","100 FCFA",21]]}')).toBeNull();
    expect(parseCart('{"v":1,"e":["a","b","c"],"l":[["p","n","-100","100 FCFA",1]]}')).toBeNull();
    expect(parseCart('{"v":1,"e":["a","b","c"],"l":[["p","n","100","100 FCFA",1.5]]}')).toBeNull();
  });
});

describe('reorder', () => {
  const menu = [
    { id: 'a', name: 'Poulet braisé', available: true, price: { amount: '3000', formatted: '3 000 FCFA' } },
    { id: 'b', name: 'Attiéké poisson', available: false, price: { amount: '2500', formatted: '2 500 FCFA' } },
  ];

  it('uses the current price, not the one paid last time', () => {
    const result = reorderLines([{ productId: 'a', name: 'Poulet braisé', quantity: 2 }], menu);
    expect(result.lines).toEqual([
      { productId: 'a', name: 'Poulet braisé', unitAmount: '3000', formatted: '3 000 FCFA', quantity: 2 },
    ]);
    expect(result.missing).toEqual([]);
  });

  it('sets aside dishes that are sold out or removed from the menu', () => {
    const result = reorderLines(
      [
        { productId: 'a', name: 'Poulet braisé', quantity: 1 },
        { productId: 'b', name: 'Attiéké poisson', quantity: 1 },
        { productId: 'z', name: 'Ancien plat', quantity: 3 },
      ],
      menu,
    );
    expect(result.lines.map((entry) => entry.productId)).toEqual(['a']);
    expect(result.missing).toEqual(['Attiéké poisson', 'Ancien plat']);
  });

  it('merges repeated dishes and caps the quantity', () => {
    const result = reorderLines(
      [
        { productId: 'a', name: 'Poulet braisé', quantity: 15 },
        { productId: 'a', name: 'Poulet braisé', quantity: 15 },
      ],
      menu,
    );
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.quantity).toBe(20);
  });
});

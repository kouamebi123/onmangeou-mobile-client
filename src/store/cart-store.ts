import { create } from 'zustand';

export interface CartLine {
  productId: string;
  name: string;
  unitAmount: string;
  formatted: string;
  quantity: number;
}

interface CartState {
  establishmentId: string | null;
  establishmentName: string | null;
  establishmentSlug: string | null;
  lines: CartLine[];
  add: (input: {
    establishmentId: string;
    establishmentName: string;
    establishmentSlug: string;
    productId: string;
    name: string;
    unitAmount: string;
    formatted: string;
  }) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  establishmentId: null,
  establishmentName: null,
  establishmentSlug: null,
  lines: [],

  add: (input) => {
    const current = get();
    if (current.establishmentId && current.establishmentId !== input.establishmentId) {
      set({
        establishmentId: input.establishmentId,
        establishmentName: input.establishmentName,
        establishmentSlug: input.establishmentSlug,
        lines: [
          {
            productId: input.productId,
            name: input.name,
            unitAmount: input.unitAmount,
            formatted: input.formatted,
            quantity: 1,
          },
        ],
      });
      return;
    }
    const existing = current.lines.find((line) => line.productId === input.productId);
    set({
      establishmentId: input.establishmentId,
      establishmentName: input.establishmentName,
      establishmentSlug: input.establishmentSlug,
      lines: existing
        ? current.lines.map((line) =>
            line.productId === input.productId ? { ...line, quantity: Math.min(20, line.quantity + 1) } : line,
          )
        : [
            ...current.lines,
            {
              productId: input.productId,
              name: input.name,
              unitAmount: input.unitAmount,
              formatted: input.formatted,
              quantity: 1,
            },
          ],
    });
  },

  increment: (productId) =>
    set({
      lines: get().lines.map((line) =>
        line.productId === productId ? { ...line, quantity: Math.min(20, line.quantity + 1) } : line,
      ),
    }),

  decrement: (productId) =>
    set({
      lines: get()
        .lines.map((line) =>
          line.productId === productId ? { ...line, quantity: line.quantity - 1 } : line,
        )
        .filter((line) => line.quantity > 0),
    }),

  clear: () => set({ establishmentId: null, establishmentName: null, establishmentSlug: null, lines: [] }),
}));

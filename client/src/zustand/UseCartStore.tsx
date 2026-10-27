
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, CartItem } from "../types";

interface CartStore {
  items: CartItem[];
  isCartOpen: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;

  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setIsCartOpen: (open: boolean) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
isCartOpen: false,
_hasHydrated: false,
setHasHydrated: (value) => set({ _hasHydrated: value }),

      addToCart: (product, quantity = 1) =>
        set((state) => {
          const existing = state.items.find(
            (item) => item.product._id === product._id
          );

          const items = existing
            ? state.items.map((item) =>
                item.product._id === product._id
                  ? {
                      ...item,
                      quantity: item.quantity + quantity,
                    }
                  : item
              )
            : [...state.items, { product, quantity }];

          return { items, isCartOpen: true };
        }),

      removeFromCart: (productId) =>
        set((state) => ({
          items: state.items.filter(
            (item) => item.product._id !== productId
          ),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter(
                  (item) => item.product._id !== productId
                )
              : state.items.map((item) =>
                  item.product._id === productId
                    ? { ...item, quantity }
                    : item
                ),
        })),

      clearCart: () =>
        set({ items: [], isCartOpen: false }),

      setIsCartOpen: (open) =>
        set({ isCartOpen: open }),
    }),
    {
  name: "app_cart",

  partialize: (state) => ({
    items: state.items,
  }),

  onRehydrateStorage: () => (state) => {
    if (state) {
      state.setIsCartOpen(state.items.length > 0);
      state.setHasHydrated(true);
    }
  },
}
  )
);


import { useCartStore } from "../zustand/UseCartStore";
import { Link } from "react-router-dom";
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ShoppingCart,
  Truck,
} from "lucide-react";

const CartSidebar = () => {
  const currency = import.meta.env.VITE_CURRENCY_SYMBOL || "₹";

  // Zustand
  const items = useCartStore((state) => state.items);

  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const hasHydrated = useCartStore(
  (state) => state._hasHydrated
);
  const setIsCartOpen = useCartStore((state) => state.setIsCartOpen);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);

  // Derived cart values
  const cartCount = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  // Original tutorial pricing rule
  const deliveryFee = cartTotal > 1000 ? 0 : 49;
  const grandTotal = cartTotal + deliveryFee;

  const formatPrice = (price: number) =>
    `${currency}${price.toLocaleString("en-IN")}`;

  // Free delivery progress
  const deliveryThreshold = 1001;
  const amountRemaining = Math.max(deliveryThreshold - cartTotal, 0);
  const deliveryProgress = Math.min(
    (cartTotal / deliveryThreshold) * 100,
    100
  );

  if (!hasHydrated || !isCartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Sidebar */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-app-border bg-white px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-app-blue/5 text-app-blue">
              <ShoppingBag className="size-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-app-blue">
                Your Cart
              </h2>
              <p className="text-xs text-app-text-light">
                {cartCount} {cartCount === 1 ? "item" : "items"} in your cart
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close shopping cart"
            className="flex size-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-app-blue"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Cart contents */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 px-4 py-4 sm:px-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100">
                <ShoppingCart className="size-9 text-app-blue/40" />
              </div>

              <h3 className="text-lg font-bold text-app-blue">
                Your cart is empty
              </h3>

              <p className="mt-2 max-w-xs text-sm leading-6 text-gray-500">
                Looks like you haven't added any automotive parts yet.
                Find the right parts for your next upgrade.
              </p>

              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-app-blue px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-blue-light"
              >
                Explore products
                <ArrowRight className="size-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Compact free-deljivery progress */}
              <div className="mb-4 rounded-xl border border-gray-100 bg-white px-3.5 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <Truck className="size-4 shrink-0 text-app-amber-dark" />
                  <p className="text-xs text-app-text-light">
                    {deliveryFee === 0 ? (
                      <span className="font-medium text-app-green">
                        You've unlocked free delivery!
                      </span>
                    ) : (
                      <>
                        Add{" "}
                        <span className="font-semibold text-app-blue">
                          {formatPrice(amountRemaining)}
                        </span>{" "}
                        more for free delivery
                      </>
                    )}
                  </p>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-app-amber transition-all duration-300"
                    style={{ width: `${deliveryProgress}%` }}
                  />
                </div>
              </div>

              {/* Product list */}
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Cart items
                </h3>

                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-slate-400 transition hover:text-red-500"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {items.map(({ product, quantity }) => (
                  <div
                    key={product._id}
                    className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3 transition-colors hover:border-app-amber/40"
                  >
                    {/* Product image */}
                    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 p-1.5 sm:size-22">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="size-full object-contain"
                      />
                    </div>

                    {/* Product information */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="line-clamp-2 text-sm font-semibold leading-5 text-gray-800">
                          {product.name}
                        </h4>

                        <button
                          type="button"
                          aria-label={`Remove ${product.name}`}
                          onClick={() => removeFromCart(product._id)}
                          className="flex size-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <p className="mt-1 text-sm font-bold text-app-blue">
                        {formatPrice(product.price)}
                      </p>

                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        {/* Quantity controls */}
                        <div className="flex items-center rounded-lg border border-gray-200">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${product.name}`}
                            onClick={() =>
                              updateQuantity(product._id, quantity - 1)
                            }
                            className="flex size-7 items-center justify-center rounded-l-lg text-gray-600 transition hover:bg-amber-50 hover:text-app-blue"
                          >
                            <Minus className="size-3.5" />
                          </button>

                          <span className="min-w-7 text-center text-xs font-semibold">
                            {quantity}
                          </span>

                          <button
                            type="button"
                            aria-label={`Increase quantity of ${product.name}`}
                            onClick={() =>
                              updateQuantity(product._id, quantity + 1)
                            }
                            className="flex size-7 items-center justify-center rounded-r-lg text-gray-600 transition hover:bg-amber-50 hover:text-app-blue"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>

                        <span className="text-sm font-semibold text-app-blue">
                          {formatPrice(product.price * quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Order summary */}
        {items.length > 0 && (
          <div className="shrink-0 border-t border-app-border bg-white px-5 py-4 sm:px-6">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-app-text-light">
                Subtotal ({cartCount} items)
              </span>
              <span className="font-medium text-app-blue">
                {formatPrice(cartTotal)}
              </span>
            </div>

            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-app-text-light">Delivery</span>
              <span
                className={`font-medium ${
                  deliveryFee === 0 ? "text-app-green" : "text-app-blue"
                }`}
              >
                {deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}
              </span>
            </div>

            {/*  total */}
            <div className="flex items-center justify-between border-t border-app-border pt-3">
              <span className="font-semibold text-app-blue">Total</span>
              <span className="text-xl font-bold text-app-blue">
                {formatPrice(grandTotal)}
              </span>
            </div>

            <p className="mb-3 mt-2 text-[11px] leading-4 text-gray-400">
              Taxes, if applicable, are calculated at checkout.
            </p>

            <Link
              to="/checkout"
              onClick={() => setIsCartOpen(false)}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-app-amber px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-app-amber-dark active:scale-[0.99]"
            >
              Proceed to checkout
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </aside>
    </>
  );
};

export default CartSidebar;

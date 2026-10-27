
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  HomeIcon,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import type { Product } from "../types";
import { dummyProducts } from "../assets/assets";
import Loader from "../components/LoaderSecondary";
import { useCartStore } from "../zustand/UseCartStore";
import DummyReviewsSection from "../assets/DummyReviewsSection";

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const handleLoaderComplete = useCallback(() => setLoading(true), []);
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  // Global Zustand cart state
  const items = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addToCart);
  const updateQuantity = useCartStore(
    (state) => state.updateQuantity
  );
  const setIsCartOpen = useCartStore(
    (state) => state.setIsCartOpen
  );

  useEffect(() => {
    setLoading(true);
    setIsImageExpanded(false);

    const foundProduct = dummyProducts.find(
      (item) => item._id === id
    );

    setProduct(foundProduct ?? null);
    setLoading(false);
  }, [id]);

  if (loading) return <Loader onComplete={handleLoaderComplete} />;

  if (!product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <PackageCheck className="size-14 text-slate-300" />

        <h1 className="text-2xl font-bold text-slate-800">
          Product not found
        </h1>

        <p className="text-sm text-slate-500">
          This product may have been removed or the link may be incorrect.
        </p>

        <Link
          to="/products"
          className="rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  // Derive the product's cart state directly from Zustand.
  const cartItem = items.find(
    (item) => item.product._id === product._id
  );

  const inCart = Boolean(cartItem);
  const cartQuantity = cartItem?.quantity ?? 0;

  const categoryLabel = product.category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const currency =
    import.meta.env.VITE_CURRENCY_SYMBOL || "₹";

  const formatPrice = (price: number) =>
    `${currency}${price.toLocaleString("en-IN")}`;

  const discountPercentage =
    product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) /
            product.originalPrice) *
            100
        )
      : product.discount;

  const savings =
    product.originalPrice > product.price
      ? product.originalPrice - product.price
      : 0;

  // Add exactly one unit, then open the cart.
  const handleAddToCart = () => {
    if (product.stock <= 0 || inCart) return;

    addToCart(product);
    setIsCartOpen(true);
  };

  // Both quantity controls update the global Zustand store.
  const incrementQuantity = () => {
    if (!inCart || cartQuantity >= product.stock) return;

    updateQuantity(product._id, cartQuantity + 1);
  };

  const decrementQuantity = () => {
    if (!inCart) return;

    // The store's existing action removes the item when
    // the quantity reaches zero, as in the cart sidebar.
    updateQuantity(product._id, cartQuantity - 1);
  };

  const relatedProducts = dummyProducts
    .filter(
      (item) =>
        item._id !== product._id &&
        item.category === product.category
    )
    .slice(0, 4);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-50/70 via-slate-50 to-rose-50/50">
      {/* Decorative background accents */}
      <div className="pointer-events-none absolute -left-32 top-48 size-72 rounded-full bg-amber-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-96 size-80 rounded-full bg-rose-200/20 blur-3xl" />

      <main className="relative mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        {/* Breadcrumb + Back button */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-500 sm:text-sm"
          >
            <Link
              to="/"
              aria-label="Home"
              className="shrink-0 transition hover:text-orange-600"
            >
              <HomeIcon className="size-4" />
            </Link>

            <span>/</span>

            <Link
              to="/products"
              className="shrink-0 transition hover:text-orange-600"
            >
              Products
            </Link>

            <span>/</span>

            <Link
              to={`/products?category=${encodeURIComponent(product.category)}`}
              className="transition hover:text-orange-600"
            >
              {categoryLabel}
            </Link>

            <span>/</span>

            <span className="max-w-[130px] truncate font-semibold text-slate-800 sm:max-w-xs">
              {product.name}
            </span>
          </nav>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-amber-100 hover:text-orange-700"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        </div>

        {/* Product details */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5">
          <div className="grid md:grid-cols-[0.9fr_1.1fr]">
            {/* Product image */}
            <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50/70 to-rose-50/50 p-7 sm:min-h-[420px] sm:p-10">
              <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full border-[28px] border-orange-200/20" />

              <div className="pointer-events-none absolute -bottom-16 -left-12 size-52 rounded-full bg-amber-200/20 blur-2xl" />

              {/* Discount badge */}
              {discountPercentage > 0 && (
                <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-md">
                  {discountPercentage}% OFF
                </span>
              )}

              {/* Genuine badge */}
              {product.isGenuine && (
                <span className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
                  <BadgeCheck className="size-4" />
                  Genuine
                </span>
              )}

              <button
                type="button"
                onClick={() => setIsImageExpanded(true)}
                aria-label={`Expand image of ${product.name}`}
                className="group relative flex h-full w-full items-center justify-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="max-h-[300px] w-full max-w-[360px] object-contain drop-shadow-sm transition duration-300 ease-out group-hover:scale-105 group-active:scale-95 sm:max-h-[370px]"
                />

                <span className="absolute bottom-1 rounded-full border border-white/80 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm transition group-hover:opacity-100">
                  Click to enlarge
                </span>
              </button>
            </div>

            {/* Product information */}
            <div className="flex flex-col p-5 sm:p-7 lg:p-8">
              {/* Brand */}
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-orange-700">
                  {product.brand}
                </span>

                {product.isGenuine && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                    <CheckCircle2 className="size-3" />
                    Verified genuine
                  </span>
                )}
              </div>

              {/* Product name */}
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                {product.name}
              </h1>

              {/* Star rating */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-0.5 rounded-lg bg-amber-50 px-2 py-1.5">
                  {[1, 2, 3, 4, 5].map((starNumber) => {
                    const fillAmount = Math.max(
                      0,
                      Math.min(
                        1,
                        product.rating - (starNumber - 1)
                      )
                    );

                    return (
                      <span
                        key={starNumber}
                        className="relative inline-flex size-4"
                      >
                        <Star className="absolute inset-0 size-4 fill-slate-200 text-slate-200" />

                        <span
                          className="absolute inset-y-0 left-0 overflow-hidden"
                          style={{
                            width: `${fillAmount * 100}%`,
                          }}
                        >
                          <Star className="size-4 max-w-none fill-amber-400 text-amber-400" />
                        </span>
                      </span>
                    );
                  })}

                  <span className="ml-1 text-xs font-bold text-slate-800">
                    {product.rating.toFixed(1)}
                  </span>
                </div>

                <span className="text-xs text-slate-500">
                  ({product.reviewCount} reviews)
                </span>
              </div>

              <div className="my-5 border-t border-slate-200" />

              {/* Pricing */}
              <div className="rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50/80 via-amber-50/60 to-white p-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                    {formatPrice(product.price)}
                  </span>

                  {product.originalPrice > product.price && (
                    <span className="text-sm text-slate-400 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}

                  {discountPercentage > 0 && (
                    <span className="rounded-md bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700">
                      Save {discountPercentage}%
                    </span>
                  )}
                </div>

                {savings > 0 && (
                  <p className="mt-1.5 text-xs font-semibold text-emerald-700">
                    You save {formatPrice(savings)}
                  </p>
                )}

                <p className="mt-2 text-xs text-slate-500">
                  Price per {product.unit || "unit"}
                </p>
              </div>

              {/* Description */}
              <p className="mt-5 text-sm leading-6 text-slate-600">
                {product.description}
              </p>

              {/* Part number and availability */}
              <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">
                    Part Number
                  </span>
                  <span className="font-semibold text-slate-800">
                    {product.partNumber || "Not specified"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">
                    Availability
                  </span>

                  <span
                    className={`font-semibold ${
                      product.stock > 0
                        ? "text-emerald-700"
                        : "text-rose-600"
                    }`}
                  >
                    {product.stock > 0
                      ? `${product.stock} in stock`
                      : "Out of stock"}
                  </span>
                </div>
              </div>

              {/* Quality features */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <ShieldCheck className="size-5 shrink-0 text-emerald-600" />
                  <span>
                    {product.isGenuine
                      ? "Genuine product"
                      : "Quality auto part"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <PackageCheck className="size-5 shrink-0 text-orange-600" />
                  <span>Secure packaging</span>
                </div>
              </div>

              {/* Compatible vehicles */}
              {product.compatibleVehicles &&
                product.compatibleVehicles.length > 0 && (
                  <div className="mt-5">
                    <h2 className="text-sm font-bold text-slate-800">
                      Compatible Vehicles
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.compatibleVehicles.map((vehicle) => (
                        <span
                          key={vehicle}
                          className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-orange-300 hover:bg-orange-50"
                        >
                          {vehicle}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Add to cart + global quantity controls */}
              <div className="mt-6 border-t border-slate-200 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Add exactly one item */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={product.stock <= 0 || inCart}
                    className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white shadow-md transition duration-200 sm:px-5 ${
                      product.stock <= 0
                        ? "cursor-not-allowed bg-slate-300 text-slate-500 shadow-none"
                        : inCart
                          ? "cursor-not-allowed bg-emerald-600 shadow-none"
                          : "bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 shadow-orange-500/20 hover:-translate-y-0.5 hover:from-amber-400 hover:via-orange-500 hover:to-orange-500 hover:shadow-lg hover:shadow-orange-500/25 active:scale-[0.99]"
                    }`}
                  >
                    {inCart ? (
                      <CheckCircle2 className="size-5 shrink-0" />
                    ) : (
                      <ShoppingCart className="size-5 shrink-0" />
                    )}

                    <span>
                      {product.stock <= 0
                        ? "Out of Stock"
                        : inCart
                          ? "Added to Cart"
                          : "Add to Cart"}
                    </span>
                  </button>

                  {/* Quantity reflects Zustand, not local state */}
                  <div className="flex shrink-0 items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={decrementQuantity}
                      disabled={!inCart}
                      aria-label="Decrease quantity"
                      className="p-2.5 text-slate-600 transition hover:bg-amber-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Minus className="size-4" />
                    </button>

                    <span className="min-w-10 text-center text-sm font-bold text-slate-800">
                      {inCart ? cartQuantity : 1}
                    </span>

                    <button
                      type="button"
                      onClick={incrementQuantity}
                      disabled={
                        !inCart ||
                        cartQuantity >= product.stock ||
                        product.stock <= 0
                      }
                      aria-label="Increase quantity"
                      className="p-2.5 text-slate-600 transition hover:bg-amber-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

              
              </div>
            </div>
          </div>
        </section>

        <div>
          {product.reviewCount >0 && <DummyReviewsSection product={product}/>}
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-orange-600">
                  More from {categoryLabel}
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                  Related Parts
                </h2>
              </div>

              <Link
                to={`/products?category=${encodeURIComponent(product.category)}`}
                className="text-sm font-semibold text-orange-700 transition hover:text-rose-600"
              >
                View all
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
              {relatedProducts.map((related) => (
                <Link
                  key={related._id}
                  to={`/products/${related._id}`}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-md"
                >
                  <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50/60 p-4 sm:h-44">
                    {related.discount > 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-bold text-white">
                        {related.discount}% OFF
                      </span>
                    )}

                    <img
                      src={related.image}
                      alt={related.name}
                      loading="lazy"
                      className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                    />
                  </div>

                  <div className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
                      {related.brand}
                    </p>

                    <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold text-slate-800">
                      {related.name}
                    </h3>

                    <p className="mt-2 font-bold text-slate-900">
                      {formatPrice(related.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Expanded product image */}
      {isImageExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
          onClick={() => setIsImageExpanded(false)}
          role="presentation"
        >
          <button
            type="button"
            onClick={() => setIsImageExpanded(false)}
            aria-label="Close expanded image"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20"
          >
            <X className="size-6" />
          </button>

          <div
            className="flex max-h-[90vh] max-w-5xl flex-col items-center"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Expanded image of ${product.name}`}
          >
            <img
              src={product.image}
              alt={product.name}
              className="max-h-[78vh] max-w-full rounded-xl object-contain"
            />

            <p className="mt-4 text-center text-sm font-medium text-white">
              {product.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPage;

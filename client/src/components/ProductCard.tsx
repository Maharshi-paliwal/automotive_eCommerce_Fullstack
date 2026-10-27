
import { useNavigate } from "react-router-dom";
import type { Product } from "../types";
import { Plus, Star } from "lucide-react";
import { useCartStore } from "../zustand/UseCartStore";

interface Props {
  product: Product;
}

const ProductCard = ({ product }: Props) => {
  const currency = import.meta.env.VITE_CURRENCY_SYMBOL || "₹";

  // Zustand 
  const addToCart = useCartStore((state) => state.addToCart);

  // React Router navigation
  const navigate = useNavigate();

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow transition-all duration-300 hover:shadow-md animate-fade-in"
      onClick={() => navigate(`/products/${product._id}`)}
    >
      {/* Product image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover p-4 transition-all duration-300 group-hover:p-2"
        />

        {product.discount > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-app-amber px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
            {product.discount}% OFF
          </span>
        )}
      </div>

      {/* Product information */}
      <div className="p-3.5 text-zinc-700">
        <h3 className="mb-1.5 line-clamp-2 text-sm leading-snug">
          {product.name}
        </h3>

        {product.rating > 0 && (
          <div className="mb-2 flex items-center gap-1">
            <Star className="size-3 fill-app-warning text-app-warning" />
            <span className="text-xs font-medium text-app-text">
              {product.rating}
            </span>
            <span className="text-xs text-app-text-light">
              ({product.reviewCount})
            </span>
          </div>
        )}

        {/* Price and add-to-cart button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1 truncate">
            <span className="text-base font-medium">
              {currency}{product.price.toFixed(2)}
            </span>

            <span className="block text-xs text-app-text-light">
              /{product.unit}
            </span>

            {product.originalPrice > product.price && (
              <span className="ml-1.5 text-xs text-app-text-light line-through">
                {currency}{product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          <button
            type="button"
            aria-label={`Add ${product.name} to cart`}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-app-amber text-white transition-colors hover:bg-app-amber-dark active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product);
            }}
          >
            <Plus size={17} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
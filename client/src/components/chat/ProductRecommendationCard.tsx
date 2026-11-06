import { useState } from "react";
import { ArrowUpRight, ImageOff } from "lucide-react";
import { Link } from "react-router-dom";
import type { ChatProduct } from "../../api/chatApi";

interface ProductRecommendationCardProps {
  product: ChatProduct;
}

const ProductRecommendationCard = ({ product }: ProductRecommendationCardProps) => {
  const [imageFailed, setImageFailed] = useState(!product.image);
  const price = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(product.price);

  return (
    <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-app-border bg-white p-2.5 shadow-sm">
      <div className="flex size-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-app-surface-muted">
        {!imageFailed && product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-contain p-1"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <ImageOff aria-hidden="true" className="size-5 text-app-text-light" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-app-blue-dark">
          {product.name}
        </h3>
        <p className="mt-1 text-sm font-bold text-app-blue">{price}</p>
        <Link
          to={`/products/${product.id}`}
          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-app-amber-dark hover:text-app-blue"
        >
          View product <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </article>
  );
};

export default ProductRecommendationCard;

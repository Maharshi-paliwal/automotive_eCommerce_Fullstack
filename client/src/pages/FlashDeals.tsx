
import { useCallback, useEffect, useState } from "react";
import { Zap } from "lucide-react";
import {
  dummyProducts,
} from "../assets/assets";
import type { Product } from "../types";
import Loader from "../components/LoaderSecondary";
import ProductCard from "../components/ProductCard";

const FlashDeals = () => {
  const [Products, setProducts] = useState<Product[]>([]);
  const [Loading, setLoading] = useState(true);
  const handleLoaderComplete = useCallback(() => setLoading(true), []);

  useEffect(() => {
    let cancelled = false;

    const loadDeals = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (cancelled) return;

      const deals = dummyProducts.filter(
        (product) => product.stock > 0
      );

      setProducts(deals);
      setLoading(false);
    };

    loadDeals();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-app-background">
      {/* Banner */}
      <div className="bg-linear-to-r from-app-amber to-app-amber-dark py-7 text-white sm:py-8">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Zap className="size-6 fill-white" />

            <h2 className="text-3xl font-semibold">
              Flash Deals
            </h2>

            <Zap className="size-6 fill-white" />
          </div>

          <p className="text-white/80 max-w-2xl mx-auto">
            Limited-time offers on genuine auto parts.
            Grab the best deals before they're gone!
          </p>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-8xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
        {Loading ? (
          <Loader onComplete={handleLoaderComplete} />
        ) : Products.length === 0 ? (
          <div className="text-center py-16">
            <Zap className="size-16 text-app-border mx-auto mb-4" />

            <h2 className="text-lg font-semibold text-app-blue mb-2">
              No deals right now
            </h2>

            <p className="text-sm text-app-text-light">
              Check back soon for amazing offers!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {Products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashDeals;

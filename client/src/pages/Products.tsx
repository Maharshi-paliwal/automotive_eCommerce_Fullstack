
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Product } from "../types/index";
import {
  BrandsData,
  categories,
  dummyProducts,
} from "../assets/assets";
import {
  ChevronDown,
  Home,
  SlidersHorizontal,
  X,
} from "lucide-react";
import ProductCard from "../components/ProductCard";
import LoaderSecondary from "../components/LoaderSecondary";
import FiltersPanel from "../components/FiltersPanel";

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [Products, setProducts] = useState<Product[]>([]);
  const [TotalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const handleLoaderComplete = useCallback(() => setLoading(true), []);
  const [mobileFiltersOpen, setmobileFiltersOpen] = useState(false);

  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || "";
  const sort = searchParams.get("sort") || "";
  const page = Number(searchParams.get("page")) || 1;
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setLoading(true);

      // Simulate a brief loading state for local dummy data.
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (cancelled) return;

      const selectedBrand = BrandsData.find(
        (b) => b.slug === brand
      );

      let filteredProducts = dummyProducts.filter((p) => {
        const matchesCategory =
          !category ||
          p.category.toLowerCase() === category.toLowerCase();

        const matchesBrand =
          !brand ||
          p.brand.toLowerCase() ===
            (selectedBrand?.name ?? brand).toLowerCase();

        const matchesMinPrice =
          !minPrice || p.price >= Number(minPrice);

        const matchesMaxPrice =
          !maxPrice || p.price <= Number(maxPrice);

        return (
          matchesCategory &&
          matchesBrand &&
          matchesMinPrice &&
          matchesMaxPrice
        );
      });

      // Sorting
      switch (sort) {
        case "price_asc":
          filteredProducts.sort((a, b) => a.price - b.price);
          break;

        case "price_desc":
          filteredProducts.sort((a, b) => b.price - a.price);
          break;

        case "rating":
          filteredProducts.sort((a, b) => b.rating - a.rating);
          break;

        case "top":
          filteredProducts.sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          break;

        default:
          break;
      }

      // Exclude out-of-stock products.
      filteredProducts = filteredProducts.filter(
        (product) => product.stock > 0
      );

      const pageSize = 8;
      const totalPages = Math.max(
        1,
        Math.ceil(filteredProducts.length / pageSize)
      );

      const currentPage = Math.min(page, totalPages);
      const startIndex = (currentPage - 1) * pageSize;

      setProducts(
        filteredProducts.slice(startIndex, startIndex + pageSize)
      );

      setTotalPages(totalPages);
      setLoading(false);
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [category, brand, sort, page, minPrice, maxPrice]);

  // Update URL filters and close the mobile drawer
  // after selecting a brand or category.
  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);

    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }

    if (key !== "page") {
      newParams.delete("page");
    }

    setSearchParams(newParams);

    if (key === "brand" || key === "category") {
      setmobileFiltersOpen(false);
    }
  };

  const hasFilters = Boolean(
    category || brand || minPrice || maxPrice
  );

  const clearFilters = () => {
    setSearchParams({});
    setmobileFiltersOpen(false);
  };

  const activeCategory = categories.find(
    (c) => c.id === category
  );

  const activeBrand = BrandsData.find(
    (b) => b.slug === brand
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-app-text-light mb-4">
          <Link
            to="/"
            className="hover:text-app-blue transition-colors flex items-center gap-2"
          >
            <Home className="size-4" />
            <span>/</span>
          </Link>

          <span className="text-app-blue font-medium">
            {activeCategory?.title ||
              activeBrand?.name ||
              "All Products"}
          </span>
        </nav>

        <div className="flex gap-5 xl:gap-7">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-white rounded-2xl p-4 sticky top-24">
              <FiltersPanel
                brands={BrandsData}
                categories={categories}
                brand={brand}
                category={category}
                minPrice={minPrice}
                maxPrice={maxPrice}
                hasFilters={hasFilters}
                updateFilter={updateFilter}
                clearFilters={clearFilters}
              />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-6">
              <h1 className="text-2xl font-semibold text-app-blue">
                {activeBrand?.name ||
                  activeCategory?.title ||
                  "All Products"}
              </h1>

              {!loading && (
                <p className="text-sm text-app-text-light shrink-0">
                  {Products.length} Products found
                </p>
              )}
            </div>

            {/* Filters and Sorting - Single Row */}
            <div className="flex items-center justify-between gap-3 mb-6">
              {/* Mobile Filter Button */}
              <button
                type="button"
                onClick={() => setmobileFiltersOpen(true)}
                aria-expanded={mobileFiltersOpen}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-white border border-app-border rounded-xl hover:border-app-amber transition-colors lg:hidden"
              >
                <SlidersHorizontal className="size-4" />
                Filters
                {hasFilters && (
                  <span className="size-2 rounded-full bg-app-amber" />
                )}
              </button>

              {/* Desktop keeps its sidebar; sort stays on the right. */}
              <div className="relative ml-auto">
                <select
                  value={sort}
                  onChange={(e) =>
                    updateFilter("sort", e.target.value)
                  }
                  aria-label="Sort products"
                  className="appearance-none pl-3 pr-8 py-2 text-sm bg-white rounded-xl border border-app-border focus:border-app-amber outline-none cursor-pointer"
                >
                  <option value="">Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                  <option value="top">A to Z</option>
                </select>

                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-text-light pointer-events-none" />
              </div>
            </div>

            {/* Mobile Left-Side Filter Drawer */}
            {mobileFiltersOpen && (
              <div className="lg:hidden fixed inset-0 z-[100]">
                {/* Backdrop */}
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setmobileFiltersOpen(false)}
                  className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                />

                {/* Drawer */}
                <aside
                  role="dialog"
                  aria-modal="true"
                  aria-label="Product filters"
                  className="absolute inset-y-0 left-0 flex h-full w-[88%] max-w-sm flex-col overflow-hidden border-r border-app-border bg-white shadow-2xl animate-in slide-in-from-left duration-300"
                >
                  {/* Fixed Header */}
                  <div className="flex shrink-0 items-center justify-between border-b border-app-border px-5 py-4">
                    <h2 className="text-base font-semibold text-app-blue">
                      Filters
                    </h2>

                    <button
                      type="button"
                      aria-label="Close filters"
                      onClick={() => setmobileFiltersOpen(false)}
                      className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-app-amber/20 hover:text-app-blue"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  {/* Scrollable Filter Content */}
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                    <FiltersPanel
                      brands={BrandsData}
                      categories={categories}
                      brand={brand}
                      category={category}
                      minPrice={minPrice}
                      maxPrice={maxPrice}
                      hasFilters={hasFilters}
                      updateFilter={updateFilter}
                      clearFilters={clearFilters}
                    />
                  </div>

                  {/* Fixed Bottom Actions */}
                  <div className="flex shrink-0 gap-3 border-t border-app-border bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="rounded-xl border border-app-border px-4 py-3 text-sm font-semibold text-app-blue transition-colors hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setmobileFiltersOpen(false)}
                      className="flex-1 rounded-xl bg-app-blue px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-app-blue-light"
                    >
                      Show Products
                    </button>
                  </div>
                </aside>
              </div>
            )}

            {/* Product Results */}
            {loading ? (
              <div className="min-h-[360px] flex items-center justify-center">
                <LoaderSecondary onComplete={handleLoaderComplete} />
              </div>
            ) : Products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg font-semibold text-app-blue mb-2">
                  No products found
                </p>

                <p className="text-sm text-app-text-light mb-4">
                  Try adjusting your filters or search terms.
                </p>

                <button
                  type="button"
                  className="px-5 py-2 text-sm font-medium bg-app-blue text-white rounded-xl hover:bg-app-blue-light transition-colors"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {Products.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && TotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-16">
                {Array.from({ length: TotalPages }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`size-9 rounded-lg text-sm font-medium transition-colors ${
                      page === i + 1
                        ? "bg-app-blue text-white"
                        : "bg-white text-app-text-light hover:bg-app-amber"
                    }`}
                    onClick={() => {
                      updateFilter("page", String(i + 1));
                      window.scrollTo({
                        top: 0,
                        behavior: "instant",
                      });
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Products;

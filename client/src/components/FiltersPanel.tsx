import { useState } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

const FiltersPanel = ({
  brands,
  categories,
  brand,
  category,
  maxPrice,
  minPrice,
  updateFilter,
  clearFilters,
  hasFilters,
}: any) => {
  const BrandsWithAll = [
    { slug: "", name: "All Brands" },
    ...brands,
  ];

  const CategoriesWithAll = [
    { id: "", title: "All Categories" },
    ...categories,
  ];

  const [isBrandFilterOpen, setisBrandFilterOpen] =
    useState(false);

  const [isCategoryFilterOpen, setisCategoryFilterOpen] =
    useState(false);

  const selectedBrand =
    BrandsWithAll.find((b: any) => b.slug === brand)?.name ||
    "All Brands";

  const selectedCategory =
    CategoriesWithAll.find((c: any) => c.id === category)
      ?.title || "All Categories";

  return (
    <div className="space-y-5">
      {/* Filter Heading */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-wide text-app-blue">
          Filter Products
        </h3>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-app-text-light hover:text-app-amber transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Brand Filter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-app-blue">
            Brands
          </h4>

          {brand && (
            <button
              type="button"
              onClick={() => updateFilter("brand", "")}
              className="text-xs text-app-text-light hover:text-app-amber"
            >
              Reset
            </button>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-expanded={isBrandFilterOpen}
            onClick={() =>
              setisBrandFilterOpen(!isBrandFilterOpen)
            }
            className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-sm bg-white transition-all duration-200 ${
              isBrandFilterOpen
                ? "border-app-amber ring-2 ring-app-amber/20 shadow-sm"
                : "border-app-border hover:border-app-blue/40"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Search className="size-4 shrink-0 text-app-text-light" />
              <span className="truncate font-medium text-app-blue">
                {selectedBrand}
              </span>
            </span>

            <ChevronDown
              className={`size-4 shrink-0 text-app-text-light transition-transform duration-200 ${
                isBrandFilterOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isBrandFilterOpen && (
            <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-app-border bg-white shadow-xl">
              <div className="max-h-56 overflow-y-auto p-1.5">
                {BrandsWithAll.map((b: any) => {
                  const isSelected = brand === b.slug;

                  return (
                    <button
                      type="button"
                      key={b.slug || "all-brands"}
                      onClick={() => {
                        updateFilter("brand", b.slug);
                        setisBrandFilterOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-app-blue text-white"
                          : "text-app-text-light hover:bg-app-amber/15 hover:text-app-blue"
                      }`}
                    >
                      {b.name}
                      {isSelected && (
                        <Check className="size-4 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-app-blue">
            Categories
          </h4>

          {category && (
            <button
              type="button"
              onClick={() => updateFilter("category", "")}
              className="text-xs text-app-text-light hover:text-app-amber"
            >
              Reset
            </button>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-expanded={isCategoryFilterOpen}
            onClick={() =>
              setisCategoryFilterOpen(!isCategoryFilterOpen)
            }
            className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-sm bg-white transition-all duration-200 ${
              isCategoryFilterOpen
                ? "border-app-amber ring-2 ring-app-amber/20 shadow-sm"
                : "border-app-border hover:border-app-blue/40"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Search className="size-4 shrink-0 text-app-text-light" />
              <span className="truncate font-medium text-app-blue">
                {selectedCategory}
              </span>
            </span>

            <ChevronDown
              className={`size-4 shrink-0 text-app-text-light transition-transform duration-200 ${
                isCategoryFilterOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isCategoryFilterOpen && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-app-border bg-white shadow-xl">
              <div className="max-h-56 overflow-y-auto p-1.5">
                {CategoriesWithAll.map((c: any) => {
                  const isSelected = category === c.id;

                  return (
                    <button
                      type="button"
                      key={c.id || "all-categories"}
                      onClick={() => {
                        updateFilter("category", c.id);
                        setisCategoryFilterOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-app-blue text-white"
                          : "text-app-text-light hover:bg-app-amber/15 hover:text-app-blue"
                      }`}
                    >
                      {c.title}
                      {isSelected && (
                        <Check className="size-4 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Price  */}
<div className="space-y-3 border-t border-app-border pt-5">
  <div className="flex items-center justify-between">
    <h4 className="text-sm font-semibold text-app-blue">
      Price Range
    </h4>

    {(minPrice || maxPrice) && (
      <button
        type="button"
        onClick={() => {
          updateFilter("minPrice", "");
          updateFilter("maxPrice", "");
        }}
        className="text-xs text-app-text-light hover:text-app-amber transition-colors"
      >
        Reset
      </button>
    )}
  </div>

  <div className="grid grid-cols-2 gap-3">
    {/* Minimum Price */}
    <div className="space-y-1.5">
      <label
        htmlFor="minPrice"
        className="text-xs text-app-text-light"
      >
        Minimum (₹)
      </label>

      <input
        id="minPrice"
        type="number"
        min="0"
        placeholder="0"
        value={minPrice}
        onChange={(e) =>
          updateFilter("minPrice", e.target.value)
        }
        className="w-full min-w-0 rounded-xl border border-app-border bg-white px-3 py-2.5 text-sm text-app-blue outline-none transition-all focus:border-app-amber focus:ring-2 focus:ring-app-amber/20"
      />
    </div>

    {/* Maximum Price */}
    <div className="space-y-1.5">
      <label
        htmlFor="maxPrice"
        className="text-xs text-app-text-light"
      >
        Maximum (₹)
      </label>

      <input
        id="maxPrice"
        type="number"
        min="0"
        placeholder="Any"
        value={maxPrice}
        onChange={(e) =>
          updateFilter("maxPrice", e.target.value)
        }
        className="w-full min-w-0 rounded-xl border border-app-border bg-white px-3 py-2.5 text-sm text-app-blue outline-none transition-all focus:border-app-amber focus:ring-2 focus:ring-app-amber/20"
      />
    </div>
  </div>

  {(minPrice || maxPrice) && (
    <p className="text-xs text-app-text-light">
      Showing products
      {minPrice ? ` from ₹${minPrice}` : ""}
      {maxPrice ? ` up to ₹${maxPrice}` : ""}
    </p>
  )}
</div>
    </div>
  );
};

export default FiltersPanel;

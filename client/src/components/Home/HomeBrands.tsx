
import { Link } from "react-router-dom";
import { BrandsData } from "../../assets/assets";

const HomeBrands = () => {
  return (
    <section className="py-16 overflow-hidden">
      <div className="max-w-8xl mx-auto px-4">
        <h2 className="text-2xl font-semibold">
          Browse by Brands
        </h2>

        <p className="text-sm text-app-text-light">
          Find exactly what you need
        </p>

        <div className="category-marquee mt-8">
          <div className="category-marquee-track">
            {[...BrandsData, ...BrandsData].map((brand, index) => (
              <Link
                key={`${brand.slug}-${index}`}
                to={`/products?brand=${encodeURIComponent(brand.slug)}`}
                onClick={() => window.scrollTo(0, 0)}
                className="group flex w-40 shrink-0 flex-col items-center gap-3 p-4"
              >
                <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-app-surface-muted transition-colors group-hover:bg-app-blue-light">
                  <img
                    src={brand.image}
                    alt={brand.name}
                    className="h-full w-full object-contain"
                  />
                </div>

                <span className="text-center text-sm font-medium">
                  {brand.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeBrands;
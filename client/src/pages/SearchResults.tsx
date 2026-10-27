
// import { useEffect, useState } from "react";
// import { Link, useSearchParams } from "react-router-dom";
// import { Home } from "lucide-react";
// import type { Product } from "../types";
// import { dummyProducts } from "../assets/assets";

// const SearchResults = () => {
//   const [products, setProducts] = useState<Product[]>([]);
//   const [loading, setLoading] = useState(true);

//   const [searchParams] = useSearchParams();
//   const query = searchParams.get("q")?.trim() || "";

//   useEffect(() => {
//     setLoading(true);

//     if (!query) {
//       setProducts([]);
//       setLoading(false);
//       return;
//     }

//     const filteredProducts = dummyProducts.filter((product) =>
//       product.name.toLowerCase().includes(query.toLowerCase())
//     );

//     setProducts(filteredProducts);
//     setLoading(false);
//   }, [query]);

//   return (
//     <div className="min-h-screen bg-app-background px-4 py-6 sm:px-6 lg:px-8">
//       <div className="mx-auto max-w-7xl">
//         {/* Breadcrumb */}
//         <nav className="mb-6 flex items-center gap-2 text-sm text-app-text-light">
//           <Link
//             to="/"
//             className="flex items-center gap-2 transition-colors hover:text-app-blue"
//           >
//             <Home className="size-4" />
//             <span>/</span>
//           </Link>

//           <span className="font-medium text-app-blue">
//             Search Results
//           </span>
//         </nav>

//         {/* Heading */}
//         <div className="mb-8">
//           <h1 className="mb-1 text-2xl font-semibold text-app-blue">
//             {query ? `Results for "${query}"` : "Search Products"}
//           </h1>

//           <p className="text-sm text-app-text-light">
//             {loading
//               ? "Searching..."
//               : `${products.length} items found`}
//           </p>
//         </div>

//         {/* Results */}
//         {!loading && products.length > 0 ? (
//           <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
//             {products.map((product) => (
//               <div
//                 key={(product as any).id ?? (product as any)._id ?? product.name}
//                 className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
//               >
//                 <img src={product.image} alt="" />
//                 <h2 className="font-semibold text-app-blue">
//                   {product.name}
//                 </h2>

//                 <p className="mt-2 text-sm text-app-text-light">
//                   Brand: {product.brand}
//                 </p>

//                 <p className="mt-2 font-semibold text-app-blue">
//                   ₹{product.price}
//                 </p>
//               </div>
//             ))}
//           </div>
//         ) : (
//           !loading && (
//             <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
//               <h2 className="text-lg font-semibold text-app-blue">
//                 {query ? "No products found" : "Enter a search term"}
//               </h2>

//               <p className="mt-2 text-sm text-slate-500">
//                 {query
//                   ? `We couldn't find products matching "${query}". Try another keyword.`
//                   : "Use the search bar above to find automobile parts."}
//               </p>

//               <Link
//                 to="/products"
//                 className="mt-5 inline-flex rounded-xl bg-app-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
//               >
//                 Browse all products
//               </Link>
//             </div>
//           )
//         )}
//       </div>
//     </div>
//   );
// };

// export default SearchResults;


import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Home } from "lucide-react";
import type { Product } from "../types";
import { dummyProducts } from "../assets/assets";
import ProductCard from "../components/ProductCard";

const SearchResults = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() || "";

  useEffect(() => {
    setLoading(true);

    if (!query) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const normalizedQuery = query.toLowerCase();

    const filteredProducts = dummyProducts.filter((product) => {
      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.brand.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery)
      );
    });

    setProducts(filteredProducts);
    setLoading(false);
  }, [query]);

  return (
    <div className="min-h-screen bg-app-background px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-sm text-app-text-light">
          <Link
            to="/"
            className="flex items-center gap-2 transition-colors hover:text-app-blue"
          >
            <Home className="size-4" />
            <span>/</span>
          </Link>

          <span className="font-medium text-app-blue">
            Search Results
          </span>
        </nav>

        {/* Heading */}
        <div className="mb-5">
          <h1 className="mb-1 text-2xl font-semibold text-app-blue">
            {query ? `Results for "${query}"` : "Search Products"}
          </h1>

          <p className="text-sm text-app-text-light">
            {loading ? "Searching..." : `${products.length} items found`}
          </p>
        </div>

        {/* Product results */}
        {loading ? (
          <div className="py-16 text-center text-sm text-app-text-light">
            Searching products...
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center">
            <h2 className="text-lg font-semibold text-app-blue">
              {query ? "No products found" : "Enter a search term"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {query
                ? `We couldn't find products matching "${query}". Try another keyword.`
                : "Use the search bar above to find automobile parts."}
            </p>

            <Link
              to="/products"
              className="mt-5 inline-flex rounded-xl bg-app-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Browse all products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;


import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Zap, ArrowUpRight } from "lucide-react";

import { categories } from "../../assets/assets";


gsap.registerPlugin(ScrollTrigger);



const CategoriesHome = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".category-card",
        {
          y: 28,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            once: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="my-16 w-full"
    >
      {/* Section heading */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
              Find your parts
            </span>
            <span className="h-px w-12 bg-red-500" />
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-[#142B3B] sm:text-4xl">
            Shop by{" "}
            <span className="text-amber-500">Category</span>
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            From essential replacements to performance upgrades,
            find the right parts for your next repair.
          </p>
        </div>

        <Link
          to="/products"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#24445F] transition-colors hover:text-red-600"
        >
          Explore all parts
          <ArrowUpRight size={17} />
        </Link>
      </div>

      {/* Six category cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const Animation = category.animation;
          const isRed = category.accent === "red";

          return (
            <Link
              key={category.id}
             to={`/products?category=${category.id}`}
onClick={() => {
  window.scrollTo({
    top: 0,
    behavior: "instant",
  });
}}
             className="group relative overflow-hidden rounded-2xl
  border border-slate-200 bg-white
  shadow-sm
  transition-all duration-300 ease-out
  hover:-translate-y-1
  hover:border-red-200
  hover:shadow-lg hover:shadow-slate-900/10
  active:scale-[0.99]"
            >
              {/* Visual area */}
              <div className="relative flex h-70 items-center justify-center overflow-hidden bg-slate-50 px-5">
                {/* Subtle decorative accent */}
                <div
                  className={`absolute -right-10 mb-4 -top-12 h-36 w-36 rounded-full ${
                    isRed ? "bg-red-100/60" : "bg-amber-100/60"
                  } transition-transform duration-500 group-hover:scale-125`}
                />

               

                {Animation ? (
                  <div className="relative z-10 h-full w-full max-w-[300px]">
                    <Animation />
                  </div>
                ) : (
                  <img
                    src={category.image}
                    alt={category.title}
                    loading="lazy"
                    className="relative z-10 h-40 w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                {category.id === "electrical" && (
                  <div className="absolute right-4 top-4 rounded-lg bg-white p-2 text-amber-500 shadow-sm">
                    <Zap size={19} />
                  </div>
                )}
              </div>

              {/* Category details */}
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold leading-snug text-[#142B3B] transition-colors group-hover:text-red-600">
                    {category.title}
                  </h3>

                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 group-hover:text-white ${
                      isRed
                        ? "bg-red-50 text-red-600 group-hover:bg-red-600"
                        : "bg-amber-50 text-amber-600 group-hover:bg-amber-500"
                    }`}
                  >
                    <ArrowUpRight size={17} />
                  </span>
                </div>

                <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
                  {category.description}
                </p>

                <div className="mt-4 flex items-center gap-2">
                 
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Explore category
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default CategoriesHome;

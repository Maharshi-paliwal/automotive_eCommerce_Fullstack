import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ShieldCheck,
  CarFront,
  Truck,
  Headset,
  Users,
  Package,
  Star,
  Clock3,
  ChevronRight,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

// Benefits displayed on the left
const whyChooseUsData = [
  {
    icon: ShieldCheck,
    title: "Genuine, quality-checked parts",
    description: "Sourced from trusted manufacturers with quality in mind.",
  },
  {
    icon: CarFront,
    title: "Fitment guidance for your vehicle",
    description: "Find compatible parts with less guesswork.",
  },
  {
    icon: Truck,
    title: "Fast, dependable dispatch",
    description: "Get your essential parts moving without unnecessary delays.",
  },
  {
    icon: Headset,
    title: "Secure checkout and easy support",
    description:
      "Shop confidently with secure payments and helpful assistance.",
  },
];

const statsData = [
  {
    icon: Users,
    value: 10000,
    suffix: "+",
    label: "Customers served",
    format: "compact",
  },
  {
    icon: Package,
    value: 500,
    suffix: "+",
    label: "Parts & accessories",
    format: "normal",
  },
  {
    icon: Star,
    value: 98,
    suffix: "%",
    label: "Customer satisfaction",
    format: "normal",
  },
  {
    icon: Clock3,
    value: 24,
    suffix: "/7",
    label: "Order assistance",
    format: "normal",
  },
];

const PromoBanner = () => {
  const sectionRef = useRef<HTMLElement>(null);

  // Animate each number from zero to its target
  gsap.utils.toArray<HTMLElement>(".stat-value").forEach((el) => {
    const target = Number(el.dataset.target);
    const suffix = el.dataset.suffix ?? "";
    const format = el.dataset.format;
    const counter = { value: 0 };

    gsap.to(counter, {
      value: target,
      duration: 2.5,
      ease: "power3.out",
      snap: { value: 1 },

      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        once: true,
      },

      onUpdate: () => {
        const current = Math.round(counter.value);

        const formatted =
          format === "compact" && current >= 1000
            ? `${Math.floor(current / 1000)}K`
            : current.toLocaleString("en-IN");

        el.textContent = `${formatted}${suffix}`;
      },

      onComplete: () => {
        const formatted =
          format === "compact" && target >= 1000
            ? `${Math.floor(target / 1000)}K`
            : target.toLocaleString("en-IN");

        el.textContent = `${formatted}${suffix}`;
      },
    });
  });

  return (
    <section
      ref={sectionRef}
      className="mx-auto my-16 w-full max-w-8xl px-4 sm:px-6 lg:px-8"
    >
      <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
        {/* LEFT: Why choose Torquenext */}
        <div className="p-6 sm:p-9 lg:p-12">
          <div className="mb-7">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
                The Torquenext difference
              </span>
              <span className="h-px w-12 bg-red-500" />
            </div>

            <h2 className="max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-[#142B3B] sm:text-4xl">
              Parts you trust.
              <br />
              <span className="text-amber-500">Service</span> that moves.
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
              From quality parts to reliable delivery, Torquenext helps keep you
              on the road with convenience and support you can count on.
            </p>
          </div>

          {/* Benefits array */}
          <div className="divide-y divide-slate-100">
            {whyChooseUsData.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="why-point group flex items-center gap-4 py-4"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-amber-500 transition-colors duration-300 group-hover:bg-red-50 group-hover:text-red-600">
                    <Icon size={25} strokeWidth={1.8} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-[#142B3B] sm:text-base">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                      {item.description}
                    </p>
                  </div>

                  <ChevronRight
                    size={19}
                    className="shrink-0 text-slate-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-red-500"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Animated statistics */}
        <div className="relative isolate overflow-hidden bg-[#102B3E] p-6 sm:p-9 lg:p-10">
          {/* Decorative background elements */}
          <div className="pointer-events-none absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full border border-slate-400/15" />
          <div className="pointer-events-none absolute -right-8 -top-8 -z-10 h-48 w-48 rounded-full border border-red-500/20" />
          <div className="pointer-events-none absolute bottom-0 right-0 -z-10 h-1 w-2/3 bg-gradient-to-r from-transparent via-amber-500 to-red-600" />

          {/* Small red accent */}
          <div className="mb-8 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                Built around your drive
              </p>

              <h3 className="mt-2 text-2xl font-bold text-white">
                Driven by trust.
              </h3>
            </div>

            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-400">
              <CarFront size={27} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {statsData.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="stat-card group rounded-2xl border border-white/10
     bg-white/[0.04] p-5 transition-all duration-300
    hover:-translate-y-1 hover:border-red-500/60
    hover:bg-red-500/[0.06] sm:p-6"
                >
                  <Icon
                    size={27}
                    strokeWidth={1.8}
                    className="text-amber-400 transition-colors duration-300 group-hover:text-red-400"
                  />

                  <div
                    className="stat-value mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
                    data-target={stat.value}
                    data-suffix={stat.suffix}
                    data-format={stat.format}
                  >
                    0{stat.suffix}
                  </div>

                  <p className="mt-2 text-sm font-medium text-slate-300">
                    {stat.label}
                  </p>

                  <div />
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-xs leading-5 text-slate-400">
            Your next ride deserves the right parts. We're here to help you find
            them.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;

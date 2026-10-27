
import {
  CalendarIcon,
  ChevronRight,
  IndianRupee,
  PackageIcon,
} from "lucide-react";

import type { Order } from "../types";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCartStore } from "../zustand/UseCartStore";
import {
  dummyDashboardOrdersData,
  statusColors,
} from "../assets/assets";
import Loader from "../components/LoaderSecondary";

const MyOrders = () => {
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const handleLoaderComplete = useCallback(() => setLoading(true), []);
  const [activeTab, setActiveTab] = useState("all");

  const [searchParams, setSearchParams] = useSearchParams();
  const { clearCart } = useCartStore();

  const tabs = [
    "all",
    "placed",
    "Out for delivery",
    "Delivered",
  ];

  const fetchOrders = async () => {
    setMyOrders(dummyDashboardOrdersData as Order[]);
    setLoading(false);
  };

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const loadOrders = async () => {
      setLoading(true);

      if (searchParams.get("clearCart")) {
        clearCart();

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("clearCart");
        setSearchParams(nextParams, { replace: true });

        timeoutId = setTimeout(() => {
          void fetchOrders();
        }, 2000);
      } else {
        await fetchOrders();
      }
    };

    void loadOrders();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [activeTab, searchParams, setSearchParams, clearCart]);

  // Filter orders according to the selected tab.
  const filteredOrders =
    activeTab === "all"
      ? myOrders
      : myOrders.filter(
          (order) =>
            order.status.toLowerCase() === activeTab.toLowerCase()
        );

 
return (
  <div className="relative mb-10 min-h-screen overflow-hidden bg-gradient-to-br from-orange-50/70 via-stone-50 to-amber-50/40">
    {/* Subtle background accents */}
    <div className="pointer-events-none absolute -left-24 top-20 size-64 rounded-full bg-amber-200/20 blur-3xl" />
    <div className="pointer-events-none absolute -right-20 top-96 size-72 rounded-full bg-red-200/15 blur-3xl" />

    <div className="relative mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
      {/* Page heading */}
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-700 shadow-sm">
            <PackageIcon className="size-3.5" />
            Your purchases
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-app-blue sm:text-4xl">
            My Orders
            <span className="ml-2 text-orange-500">.</span>
          </h1>

          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Track your orders and keep your vehicle running smoothly.
          </p>
        </div>

        <Link
          to="/products"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/25 active:scale-[0.98]"
        >
          Explore Parts
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* Order status tabs */}
      <div className="mb-6 rounded-2xl border border-orange-100 bg-white/80 p-2 shadow-sm backdrop-blur-sm">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === tab
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-600 hover:bg-orange-50 hover:text-orange-700"
              }`}
            >
              {tab === "all" ? "All Orders" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Orders content */}
      {loading ? (
        <div className="rounded-2xl border border-orange-100 bg-white/80 p-6 shadow-sm">
          <Loader onComplete={handleLoaderComplete} />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-orange-100 bg-white/80 px-5 py-16 text-center shadow-sm backdrop-blur-sm">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-orange-600">
            <PackageIcon className="size-8" />
          </div>

          <h2 className="mb-2 text-xl font-bold text-app-blue">
            {activeTab === "all" ? "No Orders Yet" : "No Orders Found"}
          </h2>

          <p className="mx-auto mb-6 max-w-sm text-sm leading-6 text-slate-500">
            {activeTab === "all"
              ? "Your next ride deserves the right parts. Explore our collection to get started."
              : "There are no orders with this status yet. Try selecting another filter."}
          </p>

          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg active:scale-[0.98]"
          >
            Start Shopping
            <ChevronRight className="size-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Link
              key={order._id}
              to={`/orders/${order._id}`}
              className="group relative block max-w-4xl overflow-hidden rounded-2xl border border-orange-100/80 bg-white/95 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg hover:shadow-orange-900/5 sm:p-5"
            >
              {/* Subtle accent along the top */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-400 opacity-70 transition-opacity group-hover:opacity-100" />

              {/* Order ID, date, status */}
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-app-blue sm:text-base">
                    Order #{order._id.slice(-8).toUpperCase()}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <CalendarIcon className="size-3.5 shrink-0 text-orange-500" />

                    <span className="text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString(
                        "en-IN",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold sm:px-3 sm:text-xs ${
                      statusColors[order.status] ??
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {order.status}
                  </span>

                  <ChevronRight className="size-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-orange-600" />
                </div>
              </div>

              {/* Product thumbnails */}
              <div className="mb-4 flex items-center gap-3">
                {order.items.slice(0, 4).map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-orange-50 to-stone-50 p-1 transition-transform duration-200 group-hover:border-orange-200 sm:size-16"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="size-full rounded-lg object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ))}

                {order.items.length > 4 && (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-orange-200 bg-orange-50 text-xs font-bold text-orange-700 sm:size-16">
                    +{order.items.length - 4}
                  </div>
                )}
              </div>

              {/* Item count and total */}
              <div className="flex items-center justify-between gap-3 border-t border-dashed border-orange-100 pt-3">
                <span className="text-xs font-medium text-slate-500 sm:text-sm">
                  {order.items.length}{" "}
                  {order.items.length === 1 ? "item" : "items"}
                </span>

                <span className="flex items-center text-base font-extrabold text-app-blue sm:text-lg">
                  <IndianRupee className="size-4 sm:size-[18px]" />
                  {Number(order.total).toFixed(2)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Bottom shopping prompt */}
      {!loading && filteredOrders.length > 0 && (
        <div className="mt-8 flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 via-orange-50 to-red-50/60 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-bold text-app-blue">
              Need more parts for your ride?
            </p>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Find the right components for your next repair or upgrade.
            </p>
          </div>

          <Link
            to="/products"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-orange-700 transition hover:text-red-600"
          >
            Browse Parts
            <ChevronRight className="size-4" />
          </Link>
        </div>
      )}
    </div>
  </div>
);
};

export default MyOrders;

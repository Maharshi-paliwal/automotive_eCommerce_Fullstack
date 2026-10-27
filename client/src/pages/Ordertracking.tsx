import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import type { Order } from "../types";
import { dummyDashboardOrdersData } from "../assets/assets";
import Loader from "../components/LoaderSecondary";

import {
  ArrowLeftIcon,
  IndianRupeeIcon,
  MapPinIcon,
  PhoneIcon,
  PackageIcon,
  UserRoundIcon,
  TruckIcon,
  ReceiptTextIcon,
} from "lucide-react";

import OrderOTP from "../components/OrderTracking/OrderOTP";
import LiveMap from "../components/OrderTracking/LiveMap";
import OrderTimeLine from "../components/OrderTracking/OrderTimeLine";

const Ordertracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const handleLoaderComplete = useCallback(() => setLoading(true), []);

  const [liveLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    setLoading(true);

    const foundOrder = dummyDashboardOrdersData.find(
      (o) => o._id === id
    );

    setOrder((foundOrder as Order) ?? null);
    setLoading(false);
  }, [id]);

  if (loading) return <Loader onComplete={handleLoaderComplete} />;

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <PackageIcon className="size-12 text-slate-300" />

        <h2 className="text-xl font-semibold text-[#24445F]">
          Order not found
        </h2>

        <p className="text-sm text-slate-500">
          We couldn't find an order matching this ID.
        </p>

        <button
          onClick={() => navigate("/orders")}
          className="rounded-xl bg-[#24445F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#19354B]"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const isDelivered = order.status === "Delivered";
  const isCancelled = order.status === "Cancelled";
  const partner = order.deliveryPartner;

  const isTrackingAvailable = !isDelivered && !isCancelled;

  const formatPrice = (amount: number) =>
    `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="min-h-screen bg-app-background pb-8 sm:pb-10">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">

        {/* Back navigation */}
        <button
          onClick={() => navigate("/orders")}
          className="mb-5 inline-flex items-center gap-2 rounded-lg text-sm font-medium text-slate-500 transition hover:text-[#24445F]"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Orders
        </button>

        {/* Order heading */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Order details
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-[#24445F] sm:text-3xl">
              Order #{order._id.slice(-8).toUpperCase()}
            </h1>

            <p className="text-sm text-slate-500">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Order status */}
          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
              isDelivered
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : isCancelled
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-[#F0A52B]/40 bg-[#FFF7E8] text-[#8A5700]"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                isDelivered
                  ? "bg-emerald-500"
                  : isCancelled
                    ? "bg-red-500"
                    : "bg-[#F0A52B]"
              }`}
            />
            {order.status}
          </span>
        </header>

        {/* Tracking content */}
        <section className="space-y-5">

          {/* Active order: OTP and map */}
          {isTrackingAvailable ? (
            <>
              <div className="min-w-0">
                <OrderOTP order={order} />
              </div>

              <div className="min-w-0 overflow-hidden rounded-2xl">
                <LiveMap
                  order={order}
                  liveLocation={liveLocation}
                />
              </div>

              {/* Full-width tracker below the map */}
              <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
                <OrderTimeLine order={order} />
              </div>
            </>
          ) : (
            /* Completed/cancelled: use the full available width */
            <div
              className={`flex items-start gap-3 rounded-2xl border p-5 sm:p-6 ${
                isDelivered
                  ? "border-[#24445F]/15 bg-white"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                  isDelivered
                    ? "bg-[#24445F]/10 text-[#24445F]"
                    : "bg-red-100 text-red-600"
                }`}
              >
                <PackageIcon className="size-5" />
              </div>

              <div>
                <p
                  className={`text-sm font-semibold sm:text-base ${
                    isDelivered ? "text-[#24445F]" : "text-red-800"
                  }`}
                >
                  {isDelivered
                    ? "Order successfully delivered"
                    : "Order cancelled"}
                </p>

                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {isDelivered
                    ? "This order has reached its destination."
                    : "Live delivery tracking is unavailable for this order."}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Order information cards */}
        <section className="mt-6 grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">

          {/* Delivery partner */}
          <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#24445F]/10 text-[#24445F]">
                <TruckIcon className="size-5" />
              </div>

              <div>
                <h2 className="font-semibold text-[#24445F]">
                  Delivery partner
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Your delivery contact
                </p>
              </div>
            </div>

            {partner && isTrackingAvailable ? (
              <>
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#24445F] text-lg font-semibold text-white">
                    {partner.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {partner.name}
                    </p>

                    <p className="mt-1 text-sm capitalize text-slate-500">
                      {partner.vehicleType}
                    </p>
                  </div>
                </div>

                {partner.phone && (
                  <a
                    href={`tel:${partner.phone}`}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#24445F]/15 bg-[#24445F]/5 px-4 py-3 text-sm font-semibold text-[#24445F] transition hover:bg-[#24445F]/10"
                  >
                    <PhoneIcon className="size-4" />
                    Contact partner
                  </a>
                )}
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl bg-slate-50 px-4 py-6 text-center">
                <UserRoundIcon className="size-7 text-slate-400" />

                <p className="mt-2 text-sm font-medium text-slate-600">
                  {isDelivered
                    ? "Delivery completed"
                    : isCancelled
                      ? "No active delivery"
                      : "Partner not assigned yet"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {isDelivered
                    ? "Your order has arrived."
                    : isCancelled
                      ? "This order is no longer active."
                      : "Partner details will appear here."}
                </p>
              </div>
            )}
          </article>

          {/* Delivery address */}
          <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#24445F]/10 text-[#24445F]">
                <MapPinIcon className="size-5" />
              </div>

              <div>
                <h2 className="font-semibold text-[#24445F]">
                  Delivery address
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Shipping destination
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-1.5 text-sm leading-relaxed text-slate-600">
              <p className="font-semibold text-slate-800">
                {order.shippingAddress.label}
              </p>

              <p>{order.shippingAddress.address}</p>

              <p>
                {order.shippingAddress.city},{" "}
                {order.shippingAddress.state}{" "}
                {order.shippingAddress.zip}
              </p>
            </div>
          </article>

          {/* Order summary */}
          <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:col-span-2 xl:col-span-1">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F0A52B]/15 text-[#8A5700]">
                <ReceiptTextIcon className="size-5" />
              </div>

              <div>
                <h2 className="font-semibold text-[#24445F]">
                  Order summary
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {order.items.length}{" "}
                  {order.items.length === 1 ? "item" : "items"} in this order
                </p>
              </div>
            </div>

            {/* Products */}
            <div className="flex-1 space-y-4">
              {order.items.map((item, i) => (
                <div
                  key={i}
                  className="flex min-w-0 items-center gap-3"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="size-full object-contain"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-slate-800">
                      {item.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Qty: {item.quantity}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-semibold tabular-nums text-[#24445F]">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm">
              <div className="flex items-center justify-between gap-3 text-slate-500">
                <span>Subtotal</span>
                <span className="tabular-nums text-slate-700">
                  {formatPrice(order.subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-slate-500">
                <span>Delivery fee</span>

                {order.deliveryFee === 0 ? (
                  <span className="font-semibold text-[#24445F]">
                    Free
                  </span>
                ) : (
                  <span className="tabular-nums text-slate-700">
                    {formatPrice(order.deliveryFee)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 text-slate-500">
                <span>Tax</span>
                <span className="tabular-nums text-slate-700">
                  {formatPrice(order.tax)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-dashed border-slate-200 pt-4">
                <span className="font-semibold text-[#24445F]">
                  Total paid
                </span>

                <span className="flex items-center gap-1 text-lg font-bold tabular-nums text-[#24445F]">
                  <IndianRupeeIcon className="size-4" />

                  {order.total.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
};

export default Ordertracking;

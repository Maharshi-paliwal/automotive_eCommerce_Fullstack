
import {
  ClockIcon,
  CheckIcon,
  TruckIcon,
  PackageIcon,
  CircleCheckIcon,
} from "lucide-react";
import type { Order } from "../../types";

export default function OrderTimeLine({ order }: { order: Order }) {
  const allStatuses = [
    "Placed",
    "Confirmed",
    "Assigned",
    "Packed",
    "Out for Delivery",
    "Delivered",
  ];

  const currentIdx = allStatuses.indexOf(order.status);
  const isCancelled = order.status === "Cancelled";

  const statusIcons: Record<string, any> = {
    Placed: ClockIcon,
    Confirmed: CheckIcon,
    Assigned: TruckIcon,
    Packed: PackageIcon,
    "Out for Delivery": TruckIcon,
    Delivered: CircleCheckIcon,
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#24445F]">
            Delivery progress
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Follow your order from dispatch to delivery.
          </p>
        </div>

        {!isCancelled && currentIdx >= 0 && (
          <span className="shrink-0 rounded-full bg-[#24445F]/10 px-3 py-1.5 text-xs font-semibold text-[#24445F]">
            {currentIdx + 1} of {allStatuses.length}
          </span>
        )}
      </div>

      {/* Cancelled state */}
      {isCancelled ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <CircleCheckIcon className="size-4 rotate-45" />
          </div>

          <div>
            <p className="text-sm font-semibold text-red-800">
              Order cancelled
            </p>
            <p className="mt-1 text-sm leading-relaxed text-red-700">
              Delivery progress is no longer available for this order.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: vertical timeline */}
          <div className="lg:hidden">
            {allStatuses.map((status, i) => {
              const Icon = statusIcons[status] || PackageIcon;
              const isCompleted = currentIdx >= 0 && i < currentIdx;
              const isCurrent = i === currentIdx;
              const isReached = currentIdx >= 0 && i <= currentIdx;

              const historyEntry = order.statusHistory?.find(
                (h: any) => h.status === status
              );

              return (
                <div key={status} className="flex gap-3">
                  {/* Icon and connector */}
                  <div className="flex w-9 shrink-0 flex-col items-center">
                    <div
                      className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        isCompleted
                          ? "border-[#24445F] bg-[#24445F] text-white"
                          : isCurrent
                            ? "border-[#F0A52B] bg-[#FFF4DC] text-[#9A6100] ring-4 ring-[#F0A52B]/15"
                            : "border-slate-200 bg-slate-50 text-slate-400"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>

                    {i < allStatuses.length - 1 && (
                      <div
                        className={`my-1 min-h-8 w-0.5 flex-1 rounded-full ${
                          isReached && !isCurrent
                            ? "bg-[#24445F]"
                            : "bg-slate-200"
                        }`}
                      />
                    )}
                  </div>

                  {/* Status details */}
                  <div
                    className={`mb-4 min-w-0 flex-1 rounded-xl border px-3 py-3 ${
                      isCurrent
                        ? "border-[#F0A52B]/40 bg-[#FFF9ED]"
                        : "border-transparent"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        className={`text-sm font-semibold ${
                          isReached
                            ? "text-[#24445F]"
                            : "text-slate-400"
                        }`}
                      >
                        {status}
                      </p>

                      {isCurrent && (
                        <span className="rounded-full bg-[#F0A52B]/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#805000]">
                          Current
                        </span>
                      )}

                      {isCompleted && (
                        <CheckIcon className="size-4 text-[#24445F]" />
                      )}
                    </div>

                    {historyEntry ? (
                      <p className="mt-1.5 text-xs text-slate-500">
                        {new Date(historyEntry.timestamp).toLocaleString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    ) : (
                      !isReached && (
                        <p className="mt-1.5 text-xs text-slate-400">
                          Awaiting update
                        </p>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: horizontal timeline */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-6">
              {allStatuses.map((status, i) => {
                const Icon = statusIcons[status] || PackageIcon;
                const isCompleted = currentIdx >= 0 && i < currentIdx;
                const isCurrent = i === currentIdx;
                const isReached = currentIdx >= 0 && i <= currentIdx;

                const historyEntry = order.statusHistory?.find(
                  (h: any) => h.status === status
                );

                return (
                  <div key={status} className="min-w-0">
                    {/* Icon row and horizontal connector */}
                    <div className="relative mb-3 flex items-center">
                      {i > 0 && (
                        <div
                          className={`absolute right-1/2 left-[-50%] top-1/2 h-0.5 -translate-y-1/2 ${
                            currentIdx >= i
                              ? "bg-[#24445F]"
                              : "bg-slate-200"
                          }`}
                        />
                      )}

                      <div
                        className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isCompleted
                            ? "border-[#24445F] bg-[#24445F] text-white"
                            : isCurrent
                              ? "border-[#F0A52B] bg-[#FFF4DC] text-[#9A6100] ring-4 ring-[#F0A52B]/15"
                              : "border-slate-200 bg-slate-50 text-slate-400"
                        }`}
                      >
                        <Icon className="size-4" />
                      </div>
                    </div>

                    {/* Step label */}
                    <div
                      className={`mr-2 min-h-[88px] rounded-xl border p-2.5 ${
                        isCurrent
                          ? "border-[#F0A52B]/40 bg-[#FFF9ED]"
                          : "border-transparent"
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold leading-5 ${
                          isReached
                            ? "text-[#24445F]"
                            : "text-slate-400"
                        }`}
                      >
                        {status}
                      </p>

                      {isCurrent && (
                        <span className="mt-1 inline-block rounded-full bg-[#F0A52B]/20 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#805000]">
                          Current
                        </span>
                      )}

                      {historyEntry ? (
                        <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
                          {new Date(historyEntry.timestamp).toLocaleString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      ) : (
                        !isReached && (
                          <p className="mt-1.5 text-[10px] leading-4 text-slate-400">
                            Awaiting update
                          </p>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

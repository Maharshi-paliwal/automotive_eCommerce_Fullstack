
import { KeyRoundIcon, ShieldCheckIcon } from "lucide-react";

export default function OrderOTP({ order }: { order: any }) {
  const showOtp =
    order.deliveryOtp &&
    ["Assigned", "Packed", "Out for Delivery"].includes(order.status);

  if (!showOtp) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-800/20 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-6 sm:p-7 text-white shadow-sm">
      {/* Subtle decorative glow */}
      <div className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10">
              <KeyRoundIcon className="size-5 text-emerald-200" />
            </div>

            <div>
              <h3 className="text-base font-semibold tracking-tight">
                Delivery verification
              </h3>
              <p className="mt-1 text-sm text-emerald-100/70">
                Your one-time delivery code
              </p>
            </div>
          </div>

          <ShieldCheckIcon className="mt-1 size-5 shrink-0 text-emerald-200/80" />
        </div>

        <div className="my-6 border-t border-white/10" />

        <div className="flex flex-wrap gap-2.5 sm:gap-3">
          {String(order.deliveryOtp)
            .split("")
            .map((digit: string, i: number) => (
              <div
                key={i}
                className="flex size-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 font-mono text-xl font-semibold tracking-wide shadow-sm transition-colors duration-200 hover:bg-white/15 sm:size-12 sm:text-2xl"
              >
                {digit}
              </div>
            ))}
        </div>

        <p className="mt-5 text-xs leading-relaxed text-emerald-100/70">
          Share this code with your delivery partner only when your order
          arrives.
        </p>
      </div>
    </section>
  );
}
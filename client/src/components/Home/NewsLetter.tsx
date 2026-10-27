import {
  MailIcon,
  ArrowRightIcon,
  WrenchIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from "lucide-react";

const NewsLetter = () => {
  return (
    <section className="mx-auto mb-20 mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="relative isolate overflow-hidden rounded-3xl bg-app-blue shadow-xl">

        {/* Background decoration */}
        <div className="pointer-events-none absolute -right-24 -top-32 -z-10 size-96 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-10 -top-20 -z-10 size-72 rounded-full border border-[#F0A52B]/20" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 size-80 rounded-full bg-[#F0A52B]/10 blur-3xl" />

        {/* Amber accent */}
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-[#F0A52B] to-transparent" />

        <div className="grid items-center gap-10 px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-16 lg:py-16">

          {/* Left: Newsletter introduction */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#F0A52B]/30 bg-[#F0A52B]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#F0A52B]">
              <SparklesIcon className="size-4" />
              The TorqueNest Insider
            </div>

            <h2 className="max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              Stay Ahead of
              <span className="block text-[#F0A52B]">
                the Curve.
              </span>
            </h2>

            <p className="mt-5 max-w-lg text-sm leading-7 text-white/70 sm:text-base">
              Get the latest parts, practical maintenance tips, new arrivals,
              and exclusive deals delivered straight to your inbox.
              Less searching. Smarter upgrades. Better drives.
            </p>

            {/* Benefits */}
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-x-6">
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <WrenchIcon className="size-4 shrink-0 text-[#F0A52B]" />
                Maintenance tips
              </div>

              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <SparklesIcon className="size-4 shrink-0 text-[#F0A52B]" />
                Exclusive offers
              </div>

              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <ShieldCheckIcon className="size-4 shrink-0 text-[#F0A52B]" />
                No spam, ever
              </div>
            </div>
          </div>

          {/* Right: Subscription form */}
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-sm sm:p-8">

            <div className="mb-6 flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#F0A52B] text-app-blue shadow-lg shadow-black/10">
                <MailIcon className="size-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">
                  Get in the driver’s seat.
                </h3>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  Your next favourite upgrade could be one email away.
                </p>
              </div>
            </div>

            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => e.preventDefault()}
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>

              <input
                id="newsletter-email"
                type="email"
                placeholder="Enter your email address"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-white/15 bg-[#10283A]/80 px-4 py-4 text-sm text-white outline-none transition-all placeholder:text-white/40 focus:border-[#F0A52B] focus:ring-2 focus:ring-[#F0A52B]/20"
              />

              <button
                type="submit"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#F0A52B] px-5 py-4 text-sm font-bold text-[#172D40] shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ffbb45] hover:shadow-xl active:scale-[0.98]"
              >
                Join the TorqueNest Club
                <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </form>

            <p className="mt-4 text-center text-xs leading-5 text-white/45">
              By subscribing, you agree to receive TorqueNest updates.
              Unsubscribe anytime.
            </p>
          </div>
        </div>

        {/* Bottom accent */}
        <div className="h-1 w-full bg-gradient-to-r from-[#F0A52B]/0 via-[#F0A52B]/70 to-[#F0A52B]/0" />
      </div>
    </section>
  );
};

export default NewsLetter;
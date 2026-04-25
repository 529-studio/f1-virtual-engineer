import Link from "next/link";

export function LandingCTA() {
  return (
    <section className="px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pb-28">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/6 px-6 py-12 backdrop-blur-sm sm:px-10 lg:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.18),transparent_45%)]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-red-300">
                Final call
              </p>
              <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.05em] text-white sm:text-4xl lg:text-5xl">
                Turn race data into a mission-control moment users actually want to try.
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                The MVP only gets one first impression. Make it feel like telemetry, strategy, and AI are finally working as one system.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="#mission-control"
                className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-3 text-sm font-bold uppercase tracking-[0.22em] text-white transition hover:bg-red-500"
              >
                Launch mission control
              </Link>
              <Link
                href="#top"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-slate-200 transition hover:border-white/25 hover:bg-white/10"
              >
                Back to pole position
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

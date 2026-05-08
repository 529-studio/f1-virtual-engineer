import Link from "next/link";

export function LandingCTA() {
  return (
    <section className="py-20 px-6">
      <div className="mx-auto max-w-6xl">
        <div
          className="relative overflow-hidden px-8 py-14 sm:px-14"
          style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
        >
          {/* Subtle accent glow top-left */}
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{ background: "radial-gradient(circle at 0% 0%, var(--accent-glow), transparent 40%)" }}
          />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="label mb-4" style={{ color: "var(--accent)" }}>Final call</p>
              <h2 className="display text-3xl sm:text-4xl mb-4" style={{ color: "var(--foreground)" }}>
                Turn race data into a mission-control moment.
              </h2>
              <p className="text-sm leading-7" style={{ color: "var(--foreground-dim)" }}>
                The MVP only gets one first impression. Make it feel like telemetry, strategy,
                and AI are finally working as one system.
              </p>
            </div>

            <Link
              href="/mission-control"
              className="inline-flex items-center readout text-[0.65rem] font-bold uppercase tracking-widest px-6 py-3 shrink-0 transition-all"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Launch Mission Control →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

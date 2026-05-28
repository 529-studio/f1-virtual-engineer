import Link from "next/link";

export function LandingCTA() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="card relative overflow-hidden px-8 py-14 sm:px-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{ background: "radial-gradient(circle at 0% 0%, var(--accent-glow), transparent 40%)" }}
          />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="label mb-4 text-accent">Pit wall awaits</p>
              <h2 className="display mb-4 text-[length:var(--text-h1)] text-foreground">
                Step into the pit wall.
              </h2>
              <p className="text-[length:var(--text-small)] leading-7 text-foreground-dim">
                One demo session loaded. Pick any race after that — every call is cited, every
                chart redraws from lap data.
              </p>
            </div>

            <Link href="/mission-control" className="btn btn--accent shrink-0">
              Launch Mission Control →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

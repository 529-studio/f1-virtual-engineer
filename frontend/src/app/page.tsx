import Link from "next/link";
import { CapabilityGrid } from "@/components/landing/CapabilityGrid";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingHero } from "@/components/landing/LandingHero";

const navItems = [
  { label: "Capabilities", href: "#capabilities" },
  { label: "Mission Control", href: "/mission-control" },
];

export default function Home() {
  return (
    <main
      id="top"
      className="min-h-screen overflow-x-hidden"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Ambient glow — stays fixed */}
      <div className="hero-glow pointer-events-none fixed inset-0 opacity-60" />

      {/* Nav */}
      <header
        className="sticky top-0 z-50"
        style={{ borderBottom: "1px solid var(--border)", background: "rgba(8,8,8,0.8)", backdropFilter: "blur(20px)" }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center font-black italic text-sm rounded-sm"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              A
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--foreground)" }}>
                Apex Intelligence
              </p>
              <p className="text-[0.55rem] uppercase tracking-[0.3em]" style={{ color: "var(--foreground-dim)" }}>
                Virtual F1 Race Engineer
              </p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="readout text-[0.6rem] uppercase tracking-widest transition-colors hover:text-foreground"
                style={{ color: "var(--foreground-dim)" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <Link
            href="/mission-control"
            className="readout text-[0.6rem] font-bold uppercase tracking-widest px-4 py-2 transition-all"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Launch
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <LandingHero />

        <section id="capabilities" className="py-20">
          <div className="mb-10">
            <p className="label mb-2">Core capabilities</p>
            <h2 className="display text-3xl" style={{ color: "var(--foreground)" }}>
              Telemetry → Decision. No guesswork.
            </h2>
          </div>
          <CapabilityGrid />
        </section>
      </div>

      <LandingCTA />
    </main>
  );
}

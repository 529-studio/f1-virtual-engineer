import { CapabilityGrid } from "@/components/landing/CapabilityGrid";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingHero } from "@/components/landing/LandingHero";
import { MissionControlPreview } from "@/components/landing/MissionControlPreview";
import { SectionShell } from "@/components/landing/SectionShell";
import { StrategyStory } from "@/components/landing/StrategyStory";

const navItems = [
  { label: "Capabilities", href: "#capabilities" },
  { label: "Strategy Loop", href: "#strategy-story" },
  { label: "Mission Control", href: "/mission-control" },
];

export default function Home() {
  return (
    <main id="top" className="min-h-screen overflow-x-hidden bg-[#05070b] text-slate-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_28%)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-red-600 font-black italic text-white shadow-[0_0_20px_rgba(239,68,68,0.45)]">
              A
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-white">
                Apex Intelligence
              </p>
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                Virtual F1 Race Engineer
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 transition hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <a
            href="/mission-control"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/20 hover:bg-white/10"
          >
            Launch
          </a>
        </div>
      </header>

      <div className="relative z-10">
        <LandingHero />

        <SectionShell
          className="py-18 lg:py-24"
          eyebrow="Core capabilities"
          title="A landing page that sells the system, not just the screen."
          description="The first fold should signal what the product does. The next fold should prove why users should believe it."
        >
          <div id="capabilities">
            <CapabilityGrid />
          </div>
        </SectionShell>

        <SectionShell
          className="py-18 lg:py-24"
          eyebrow="Strategy story"
          title="Translate race data into decisions users can trust."
          description="The strongest version of this homepage makes strategy reasoning visible, explainable, and emotionally compelling at the same time."
        >
          <div id="strategy-story">
            <StrategyStory />
          </div>
        </SectionShell>

        <SectionShell
          className="py-18 lg:py-24"
          eyebrow="Mission control preview"
          title="End the story by showing a real operator surface."
          description="A high-impact landing page should end with proof that the product already has substance."
        >
          <MissionControlPreview />
        </SectionShell>

        <LandingCTA />
      </div>
    </main>
  );
}

import { TelemetryQueryPanel } from "@/components/TelemetryQueryPanel";

export function MissionControlPreview() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
      <div id="mission-control" className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-3 shadow-[0_32px_64px_rgba(2,6,23,0.45)] backdrop-blur-xl">
        <TelemetryQueryPanel />
      </div>

      <div className="space-y-4">
        <article className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-red-300">
            Operator view
          </p>
          <h3 className="mt-4 text-2xl font-bold tracking-[-0.03em] text-white">
            Give users a real cockpit, not a fake product render.
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            The homepage should end by proving the system already works. Reuse the real telemetry query surface so brand promise and product proof stay tightly connected.
          </p>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">
              Recommendation preview
            </p>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-300">
              Explainable
            </span>
          </div>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-red-300">
                Suggested call
              </p>
              <p className="mt-2 text-lg font-bold text-white">Box before the undercut window peaks.</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Pace decay is compounding while traffic-loss projection remains acceptable within the next stop window.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-400" />
                Recommendation ties to visible metrics instead of invisible prompting.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-sky-400" />
                Query flow is close enough to the real dashboard to reduce trust gap.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-300" />
                Empty, loading, and error states are already grounded in the product surface.
              </li>
            </ul>
          </div>
        </article>
      </div>
    </div>
  );
}

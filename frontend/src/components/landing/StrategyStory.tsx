const storySteps = [
  {
    index: "01",
    title: "Ingest race context",
    body: "Year, event, session, and driver selection become the operating frame before the system makes any claim.",
  },
  {
    index: "02",
    title: "Read telemetry signals",
    body: "Speed, gear, RPM, and pace delta are normalized into a compact snapshot a human can verify quickly.",
  },
  {
    index: "03",
    title: "Compare strategic scenarios",
    body: "The engine checks undercut pressure, tyre decay, and expected traffic loss before escalating a recommendation.",
  },
  {
    index: "04",
    title: "Deliver explainable action",
    body: "Outputs stay grounded in measurable evidence, assumptions, and fallback honesty instead of black-box AI theatre.",
  },
];

export function StrategyStory() {
  return (
    <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
      <div className="lg:sticky lg:top-24">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-red-300">
            Decision flow
          </p>
          <h3 className="mt-4 text-3xl font-black uppercase tracking-[-0.05em] text-white">
            Show the thinking, not just the answer.
          </h3>
          <p className="mt-5 text-sm leading-7 text-slate-300">
            This section is the bridge between cinematic branding and trust. It should visually communicate how raw race data becomes a strategy recommendation users can believe.
          </p>
          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-5">
            <div className="story-track h-2 rounded-full bg-white/10">
              <div className="story-track__progress h-full rounded-full bg-gradient-to-r from-red-500 via-orange-400 to-sky-400" />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <StoryMetric label="Pace decay" value="0.31 s/lap" />
              <StoryMetric label="Pit window" value="L18-L22" />
              <StoryMetric label="Fallback honesty" value="Structured" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {storySteps.map((step) => (
          <article
            key={step.index}
            className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-red-500/30 hover:bg-white/8"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 font-mono text-sm text-red-300">
                {step.index}
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-[-0.03em] text-white">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{step.body}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function StoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-3 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

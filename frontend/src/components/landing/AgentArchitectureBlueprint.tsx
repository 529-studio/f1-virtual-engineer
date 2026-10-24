"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface BlueprintNode {
  id: string;
  step: string;
  title: string;
  component: string;
  sourceFile: string;
  description: string;
  inputPayload: string;
  outputPayload: string;
}

const BLUEPRINT_NODES: BlueprintNode[] = [
  {
    id: "intent",
    step: "01",
    title: "Intent & Memory Resolver",
    component: "LangGraph State Machine",
    sourceFile: "backend/agents/race_engineer.py",
    description:
      "Parses driver acronyms, race session parameters, and pronouns ('what about him?') via a 10-turn sliding window deque memory.",
    inputPayload: JSON.stringify(
      { query: "Should Leclerc undercut Verstappen now? What about his tyres?", session: "R", event: "Italian Grand Prix" },
      null,
      2
    ),
    outputPayload: JSON.stringify(
      { driver: "LEC", target_rival: "VER", year: 2024, intent_type: "strategy_undercut", context_resolved: true },
      null,
      2
    ),
  },
  {
    id: "tools",
    step: "02",
    title: "Parallel Tool Orchestration",
    component: "FastF1 + Pirelli Physics + RAG",
    sourceFile: "backend/tools/strategy_helper.py",
    description:
      "Executes sensor telemetry fetching, stint lap decay modeling, and hybrid BM25 + ChromaDB semantic search over FIA Sporting Regulations concurrently.",
    inputPayload: JSON.stringify(
      { driver: "LEC", lap: 15, tyre_compound: "MEDIUM", stint_age: 15, pit_loss_seconds: 22.4 },
      null,
      2
    ),
    outputPayload: JSON.stringify(
      { pit_window: [18, 22], undercut_margin_seconds: 1.84, tyre_cliff_laps: 3.2, citations: ["FIA Art 33.4", "Stint Deg Curve"] },
      null,
      2
    ),
  },
  {
    id: "debate",
    step: "03",
    title: "Dual-Perspective Legal Reasoner",
    component: "Gemini Flash (Closed Grounding)",
    sourceFile: "backend/core/llm.py",
    description:
      "Prompts the LLM under strict zero-hallucination constraints to argue race incidents from both the FIA Steward's and Team Lawyer's viewpoints.",
    inputPayload: JSON.stringify(
      { incident: "T1 braking collision", cited_regs: ["Art 33.4 - Car alongside at apex"], telemetry_delta: "-0.18s late braking" },
      null,
      2
    ),
    outputPayload: JSON.stringify(
      {
        steward_argument: "Car 16 failed to establish front axle overlap prior to turn-in point.",
        team_argument: "Car 1 had sufficient track width on exit; racing incident under Art 33.4.",
        verdict_likelihood: "steward favoured"
      },
      null,
      2
    ),
  },
  {
    id: "guardrail",
    step: "04",
    title: "Production Guardrails & Cache",
    component: "Redis L2 + Fail-Closed Fallback",
    sourceFile: "backend/core/redis_cache.py",
    description:
      "Caches responses in Redis via SHA-256 context hashing. If Gemini reaches quota or latency limits, degrades silently to deterministic mathematical templates.",
    inputPayload: JSON.stringify(
      { context_hash: "sha256:4f8e71b...", ttl_seconds: 3600, rate_limit_status: "429_exceeded" },
      null,
      2
    ),
    outputPayload: JSON.stringify(
      { fallback_engaged: true, rationale_source: "deterministic_template", status: 200, error_prevented: true },
      null,
      2
    ),
  },
];

export function AgentArchitectureBlueprint() {
  const prefersReduced = useReducedMotion();
  const [activeNode, setActiveNode] = useState<BlueprintNode>(BLUEPRINT_NODES[0]);

  return (
    <section id="agent-blueprint" className="py-20 border-t border-border">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mb-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <p className="label">Systems Architecture</p>
          </div>
          <h2 className="display text-[length:var(--text-h1)] text-foreground">
            Inside the Virtual Pit Wall: Autonomous LangGraph Pipeline
          </h2>
          <p className="text-[length:var(--text-body)] text-foreground-dim max-w-2xl leading-relaxed">
            Not a single prompt wrapper. A resilient state graph coordinating live telemetry, mathematical tire physics, and vector-indexed FIA regulations with deterministic fallbacks.
          </p>
        </div>

        {/* Blueprint Flow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          {BLUEPRINT_NODES.map((node) => {
            const isSelected = node.id === activeNode.id;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setActiveNode(node)}
                className={`text-left p-4 rounded-xs border transition-all cursor-pointer relative ${
                  isSelected
                    ? "border-accent bg-surface-elevated shadow-md"
                    : "border-border bg-surface hover:border-border-strong hover:bg-surface-elevated/60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="readout text-[0.62rem] font-bold text-accent tracking-[var(--track-wide)]">
                    STEP {node.step}
                  </span>
                  {isSelected && (
                    <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
                  )}
                </div>
                <p className="text-[0.78rem] font-bold text-foreground mb-1 leading-snug">
                  {node.title}
                </p>
                <p className="readout text-[0.58rem] uppercase tracking-[var(--track-wide)] text-foreground-dim truncate">
                  {node.component}
                </p>
              </button>
            );
          })}
        </div>

        {/* Detailed Inspector Drawer */}
        <motion.div
          key={activeNode.id}
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="border border-border bg-surface rounded-xs p-6 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="readout text-[0.62rem] uppercase font-bold text-accent">
                  Active Inspector // Step {activeNode.step}
                </span>
                <span className="text-foreground-faint text-xs">·</span>
                <span className="readout text-[0.62rem] text-foreground-dim font-mono">
                  {activeNode.sourceFile}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground">{activeNode.title}</h3>
            </div>
            <span className="readout px-2.5 py-1 text-[0.6rem] uppercase tracking-[var(--track-wide)] border border-border bg-surface-elevated text-foreground-dim self-start sm:self-auto">
              Production Tested · CI Verified
            </span>
          </div>

          <p className="text-[0.82rem] leading-relaxed text-foreground-dim">
            {activeNode.description}
          </p>

          {/* Code/Payload Inspector Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="label text-[0.6rem]">State Context In (JSON)</p>
              <pre className="readout p-3.5 bg-background border border-border text-[0.65rem] text-foreground-dim font-mono overflow-x-auto rounded-xs leading-relaxed max-h-52">
                {activeNode.inputPayload}
              </pre>
            </div>
            <div className="space-y-1.5">
              <p className="label text-[0.6rem]">Agent Verdict Out (JSON)</p>
              <pre className="readout p-3.5 bg-background border border-border text-[0.65rem] text-status-ok font-mono overflow-x-auto rounded-xs leading-relaxed max-h-52">
                {activeNode.outputPayload}
              </pre>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

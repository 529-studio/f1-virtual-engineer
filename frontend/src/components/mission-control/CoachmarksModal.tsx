"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "apex_coachmarks_seen";

interface CoachmarksModalProps {
  onDismiss?: () => void;
}

const STEPS = [
  {
    title: "Shared Lap Scrubber",
    tagline: "Scrub to any lap in the race",
    body: "Drag the slider to move the race timeline. All panels — Pit Exit projection, Tyre status, and the timing header — stay locked to the exact same lap.",
    highlight: "lap-scrubber",
  },
  {
    title: "Pit Exit Projection",
    tagline: "Know where you rejoin before boxing",
    body: "Deterministic calculation: if the driver pits this lap, see projected rejoin position, nearest rivals ahead and behind, and whether you exit into clean air or traffic.",
    highlight: "pit-exit-card",
  },
  {
    title: "Strategy Comparison",
    tagline: "Stack what-if scenarios side-by-side",
    body: "Evaluate undercut timing (e.g. Pit now vs Hold +3 laps) with live track gaps and break-even calculations without guessing.",
    highlight: "strategy-comparison",
  },
];

export function CoachmarksModal({ onDismiss }: CoachmarksModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        queueMicrotask(() => setVisible(true));
      }
    } catch {
      // Ignore localStorage errors in private mode
    }
  }, []);

  const closeTour = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignore
    }
    setVisible(false);
    onDismiss?.();
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      closeTour();
    }
  };

  if (!visible) return null;

  const step = STEPS[currentStep];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-2xl"
        >
          {/* Progress bar */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-6 rounded-full transition-colors ${
                    i === currentStep
                      ? "bg-accent"
                      : i < currentStep
                      ? "bg-accent/40"
                      : "bg-surface-elevated"
                  }`}
                />
              ))}
            </div>
            <span className="readout font-mono text-[0.6rem] uppercase tracking-wider text-foreground-faint">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <span className="label text-[0.65rem] uppercase tracking-wider text-accent">
              {step.tagline}
            </span>
            <h3 className="text-lg font-bold text-foreground">
              {step.title}
            </h3>
            <p className="text-xs leading-relaxed text-foreground-dim">
              {step.body}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <button
              type="button"
              onClick={closeTour}
              className="text-xs text-foreground-faint transition-colors hover:text-foreground"
            >
              Skip tour
            </button>

            <button
              type="button"
              onClick={nextStep}
              className="btn btn--accent px-4 py-1.5 text-xs font-semibold"
            >
              {currentStep < STEPS.length - 1 ? "Next →" : "Got it"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

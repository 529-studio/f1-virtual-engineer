"use client";

import { useId, useState } from "react";

interface HintTooltipProps {
  label: string;
  children: React.ReactNode;
}

// Block-level hint — a small `?` button that explains what an entire
// section does, distinct from JargonTooltip which explains a term inline.
export function HintTooltip({ label, children }: HintTooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-label={`What is ${label}?`}
        aria-describedby={open ? id : undefined}
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-foreground-faint/40 text-[0.5rem] text-foreground-faint transition-colors hover:border-foreground-dim hover:text-foreground-dim focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-64 border border-border bg-overlay p-3 text-[length:var(--text-small)] leading-snug text-foreground shadow-xl"
        >
          {children}
        </span>
      )}
    </span>
  );
}

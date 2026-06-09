"use client";

import { useId, useRef, useState } from "react";

interface HintTooltipProps {
  label: string;
  children: React.ReactNode;
}

// Block-level hint — a small `?` button that explains what an entire
// section does, distinct from JargonTooltip which explains a term inline.
// Uses fixed positioning calculated from getBoundingClientRect so the
// tooltip renders above the overflow-y-auto scroll container without clipping.
export function HintTooltip({ label, children }: HintTooltipProps) {
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function open() {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    // Prefer showing below; clamp left so it doesn't overflow the right edge.
    const tooltipWidth = 256; // w-64
    const left = Math.min(r.left, window.innerWidth - tooltipWidth - 8);
    setPos({ top: r.bottom + 6, left });
  }

  function close() {
    setPos(null);
  }

  return (
    <span className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        aria-label={`What is ${label}?`}
        aria-describedby={pos ? id : undefined}
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-foreground-dim text-[0.5rem] text-foreground-dim transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
      >
        ?
      </button>
      {pos && (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none fixed z-[200] w-64 border border-border bg-overlay p-3 text-[length:var(--text-small)] leading-snug text-foreground shadow-xl"
          style={{ top: pos.top, left: pos.left }}
        >
          {children}
        </span>
      )}
    </span>
  );
}

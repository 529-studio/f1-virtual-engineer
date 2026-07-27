"use client";

import { motion } from "framer-motion";
import {
  GAUGE_BAR_HEIGHT,
  GAUGE_BAR_WIDTH,
  GAUGE_BAR_X,
  GAUGE_SVG_WIDTH,
  GAUGE_SCALE_HEADROOM,
  GAUGE_FILL_OPACITY,
  GAUGE_THRESHOLD_X1,
  GAUGE_THRESHOLD_X2,
  GAUGE_THRESHOLD_LABEL_X,
  GAUGE_THRESHOLD_LABEL_DY,
  GAUGE_THRESHOLD_FONT_SIZE,
  GAUGE_CONTAINER_MIN_WIDTH,
} from "./strategy-canvas.constants";

interface GapGaugeProps {
  currentGap: number;
  pitLoss: number;
  /** 'high' | 'medium' | 'low' */
  undercutRisk: string;
  competitor?: string | null;
}

// Vertical thermometer gauge: gap vs pit-loss threshold.
// Green fill = gap < pitLoss (undercut potentially viable).
// Red fill   = gap >= pitLoss (undercut costs more than the gap).
export function GapGauge({ currentGap, pitLoss, undercutRisk, competitor }: GapGaugeProps) {
  const maxVal = Math.max(currentGap, pitLoss) * GAUGE_SCALE_HEADROOM;

  // Fractions within 0–GAUGE_BAR_HEIGHT (top = max, bottom = 0 → invert)
  const gapFrac  = Math.min(currentGap / maxVal, 1);
  const lossFrac = Math.min(pitLoss    / maxVal, 1);

  // Y positions within SVG: bottom = GAUGE_BAR_HEIGHT, top = 0
  const gapY  = GAUGE_BAR_HEIGHT * (1 - gapFrac);
  const lossY = GAUGE_BAR_HEIGHT * (1 - lossFrac);
  const fillH = GAUGE_BAR_HEIGHT - gapY;

  const isViable  = currentGap < pitLoss;
  const fillColor = isViable ? "var(--status-ok)" : "var(--status-error)";

  const numColor =
    undercutRisk === "high"   ? "var(--status-error)" :
    undercutRisk === "medium" ? "var(--status-warn)"  :
                                "var(--status-ok)";

  // Center X for the bar + transform-origin for the fill animation
  const barCenterX = GAUGE_BAR_X + GAUGE_BAR_WIDTH / 2;

  return (
    <div
      className="flex flex-col items-center"
      style={{
        border: "1px solid var(--border)",
        backgroundColor: "var(--surface)",
        padding: "12px 16px",
        minWidth: `${GAUGE_CONTAINER_MIN_WIDTH}px`,
      }}
    >
      <p className="label mb-2" style={{ color: "var(--foreground-dim)", whiteSpace: "nowrap" }}>
        Gap Gauge
      </p>

      {/* SVG thermometer */}
      <svg width={GAUGE_SVG_WIDTH} height={GAUGE_BAR_HEIGHT + 4} style={{ overflow: "visible" }}>
        {/* Background bar */}
        <rect
          x={GAUGE_BAR_X}
          y="0"
          width={GAUGE_BAR_WIDTH}
          height={GAUGE_BAR_HEIGHT}
          fill="var(--surface-elevated)"
        />

        {/* Colored fill — animates scaleY from bottom */}
        <motion.rect
          x={GAUGE_BAR_X}
          y={gapY}
          width={GAUGE_BAR_WIDTH}
          height={fillH}
          fill={fillColor}
          fillOpacity={GAUGE_FILL_OPACITY}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          style={{ transformOrigin: `${barCenterX}px ${GAUGE_BAR_HEIGHT}px` }}
        />

        {/* Threshold dashed line */}
        <line
          x1={GAUGE_THRESHOLD_X1}
          y1={lossY}
          x2={GAUGE_THRESHOLD_X2}
          y2={lossY}
          stroke="var(--foreground-dim)"
          strokeWidth="1"
          strokeDasharray="3 2"
          vectorEffect="non-scaling-stroke"
        />

        {/* Threshold label */}
        <text
          x={GAUGE_THRESHOLD_LABEL_X}
          y={lossY + GAUGE_THRESHOLD_LABEL_DY}
          fontSize={GAUGE_THRESHOLD_FONT_SIZE}
          fill="var(--foreground-faint)"
          fontFamily="var(--font-mono)"
          textAnchor="start"
        >
          {pitLoss.toFixed(0)}s
        </text>
      </svg>

      {/* Gap readout */}
      <p className="readout mt-2 text-base font-bold leading-none" style={{ color: numColor }}>
        {currentGap.toFixed(1)}s
      </p>

      <p className="readout mt-1 text-[0.55rem] uppercase tracking-wide" style={{ color: "var(--foreground-faint)" }}>
        gap
      </p>

      {competitor && (
        <p className="readout mt-0.5 text-[0.55rem] uppercase tracking-wide" style={{ color: "var(--foreground-dim)" }}>
          vs {competitor}
        </p>
      )}

      <p className="readout mt-2 text-[0.55rem] uppercase tracking-wide" style={{ color: fillColor }}>
        {isViable ? "✓ viable" : "✕ too wide"}
      </p>
    </div>
  );
}

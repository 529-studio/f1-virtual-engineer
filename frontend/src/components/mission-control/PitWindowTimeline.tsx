"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  TIMELINE_VIEWBOX_W,
  TIMELINE_SVG_H,
  TIMELINE_TRACK_Y,
  TIMELINE_TRACK_H,
  TIMELINE_MARKER_Y1,
  TIMELINE_MARKER_Y2,
  TIMELINE_TICK_Y1,
  TIMELINE_TICK_Y2,
  TIMELINE_AXIS_Y,
  TIMELINE_AXIS_TICK_Y1,
  TIMELINE_AXIS_TICK_Y2,
  TIMELINE_ZONE_OPACITY,
  TIMELINE_DEFAULT_TOTAL_LAPS,
  TIMELINE_BOUNDARY_STROKE_W,
  TIMELINE_TICK_STROKE_W,
  TIMELINE_LABEL_FONT_SIZE,
  TIMELINE_AXIS_FONT_SIZE,
  TIMELINE_BOUNDARY_LABEL_TOP,
  TIMELINE_TARGET_LABEL_TOP,
  TIMELINE_AXIS_LABEL_TOP,
} from "./strategy-canvas.constants";

export interface PitWindowTimelineProps {
  pitWindow: [number, number] | number[];
  targetLap?: number | null;
  totalLaps?: number;
  fallback?: boolean;
}

export const PitWindowTimeline: React.FC<PitWindowTimelineProps> = ({
  pitWindow,
  targetLap,
  totalLaps = TIMELINE_DEFAULT_TOTAL_LAPS,
  fallback = false,
}) => {
  const lapToX = (lap: number) => (lap / totalLaps) * TIMELINE_VIEWBOX_W;
  const lapToPercent = (lap: number) => (lap / totalLaps) * 100;

  const startLap = pitWindow[0] ?? 0;
  const endLap = pitWindow[1] ?? 0;
  const startX = lapToX(startLap);
  const endX = lapToX(endLap);
  const zoneWidth = Math.max(0, endX - startX);
  const targetX = targetLap != null ? lapToX(targetLap) : null;
  const midLap = Math.floor(totalLaps / 2);

  const borderColor = fallback ? "var(--status-warn)" : "var(--border)";

  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        padding: "12px 16px",
        backgroundColor: "var(--surface)",
      }}
    >
      <p className="label mb-2" style={{ color: "var(--foreground-dim)" }}>
        Pit Window Timeline
      </p>

      <div style={{ width: "100%", height: `${TIMELINE_SVG_H}px`, position: "relative" }}>
        <svg
          width="100%"
          height={TIMELINE_SVG_H}
          viewBox={`0 0 ${TIMELINE_VIEWBOX_W} ${TIMELINE_SVG_H}`}
          preserveAspectRatio="none"
          style={{ display: "block" }}
        >
          {/* Background track */}
          <rect
            x="0"
            y={TIMELINE_TRACK_Y}
            width={TIMELINE_VIEWBOX_W}
            height={TIMELINE_TRACK_H}
            fill="var(--surface-elevated)"
          />

          {/* Pit window zone */}
          {zoneWidth > 0 && (
            <motion.rect
              x={startX}
              y={TIMELINE_TRACK_Y}
              width={zoneWidth}
              height={TIMELINE_TRACK_H}
              fill="var(--accent)"
              fillOpacity={TIMELINE_ZONE_OPACITY}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              style={{ transformOrigin: `${startX}px 0` }}
            />
          )}

          {/* Target lap white tick */}
          {targetX !== null && (
            <line
              x1={targetX}
              y1={TIMELINE_TICK_Y1}
              x2={targetX}
              y2={TIMELINE_TICK_Y2}
              stroke="white"
              strokeWidth={TIMELINE_TICK_STROKE_W}
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Window boundary markers */}
          <line
            x1={startX} y1={TIMELINE_MARKER_Y1} x2={startX} y2={TIMELINE_MARKER_Y2}
            stroke="var(--foreground-dim)"
            strokeWidth={TIMELINE_BOUNDARY_STROKE_W}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={endX} y1={TIMELINE_MARKER_Y1} x2={endX} y2={TIMELINE_MARKER_Y2}
            stroke="var(--foreground-dim)"
            strokeWidth={TIMELINE_BOUNDARY_STROKE_W}
            vectorEffect="non-scaling-stroke"
          />

          {/* Lap axis base line */}
          <line
            x1="0" y1={TIMELINE_AXIS_Y} x2={TIMELINE_VIEWBOX_W} y2={TIMELINE_AXIS_Y}
            stroke="var(--border)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />

          {/* Axis tick marks */}
          {[0, TIMELINE_VIEWBOX_W / 2, TIMELINE_VIEWBOX_W].map((x) => (
            <line
              key={x}
              x1={x} y1={TIMELINE_AXIS_TICK_Y1} x2={x} y2={TIMELINE_AXIS_TICK_Y2}
              stroke="var(--border)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* HTML overlay — avoids text stretch from preserveAspectRatio="none" */}
        <div
          className="readout"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            fontFamily: "var(--font-mono)",
          }}
        >
          {/* Window start label */}
          <div
            style={{
              position: "absolute",
              left: `${lapToPercent(startLap)}%`,
              top: `${TIMELINE_BOUNDARY_LABEL_TOP}px`,
              transform: "translateX(-50%)",
              fontSize: `${TIMELINE_LABEL_FONT_SIZE}px`,
              color: "var(--foreground-dim)",
            }}
          >
            L{startLap}
          </div>

          {/* Window end label */}
          <div
            style={{
              position: "absolute",
              left: `${lapToPercent(endLap)}%`,
              top: `${TIMELINE_BOUNDARY_LABEL_TOP}px`,
              transform: "translateX(-50%)",
              fontSize: `${TIMELINE_LABEL_FONT_SIZE}px`,
              color: "var(--foreground-dim)",
            }}
          >
            L{endLap}
          </div>

          {/* Target lap label */}
          {targetLap != null && (
            <div
              style={{
                position: "absolute",
                left: `${lapToPercent(targetLap)}%`,
                top: `${TIMELINE_TARGET_LABEL_TOP}px`,
                transform: "translateX(6px)",
                fontSize: `${TIMELINE_AXIS_FONT_SIZE}px`,
                color: "white",
                whiteSpace: "nowrap",
              }}
            >
              OPT
            </div>
          )}

          {/* Axis — start */}
          <div
            style={{
              position: "absolute",
              left: "0%",
              top: `${TIMELINE_AXIS_LABEL_TOP}px`,
              fontSize: `${TIMELINE_AXIS_FONT_SIZE}px`,
              color: "var(--foreground-faint)",
            }}
          >
            LAP 1
          </div>

          {/* Axis — midpoint */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: `${TIMELINE_AXIS_LABEL_TOP}px`,
              transform: "translateX(-50%)",
              fontSize: `${TIMELINE_AXIS_FONT_SIZE}px`,
              color: "var(--foreground-faint)",
            }}
          >
            {midLap}
          </div>

          {/* Axis — end */}
          <div
            style={{
              position: "absolute",
              right: "0%",
              top: `${TIMELINE_AXIS_LABEL_TOP}px`,
              transform: "translateX(-2px)",
              fontSize: `${TIMELINE_AXIS_FONT_SIZE}px`,
              color: "var(--foreground-faint)",
            }}
          >
            {totalLaps}
          </div>
        </div>
      </div>
    </div>
  );
};

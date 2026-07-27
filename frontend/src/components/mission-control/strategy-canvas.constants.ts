/**
 * strategy-canvas.constants.ts
 *
 * Single source of truth for all magic numbers, animation timings,
 * dimension tokens, and scale factors used in the Strategy Canvas
 * and its sub-components (PitWindowTimeline, GapGauge, StrategyCanvas).
 *
 * RULE: No bare numeric or string literals in component render code —
 *       import from here instead.
 */

// ---------------------------------------------------------------------------
// PitWindowTimeline
// ---------------------------------------------------------------------------

/** SVG coordinate-space width (viewBox units). Laps map to 0–TIMELINE_VIEWBOX_W. */
export const TIMELINE_VIEWBOX_W = 1000;

/** SVG pixel height of the timeline bar wrapper (px). */
export const TIMELINE_SVG_H = 64;

/** Y position (viewBox units) where the track rectangle starts. */
export const TIMELINE_TRACK_Y = 20;

/** Height (viewBox units) of the track + pit-window zone rectangle. */
export const TIMELINE_TRACK_H = 18;

/** Y range for boundary marker lines: top → bottom (viewBox units). */
export const TIMELINE_MARKER_Y1 = 16;
export const TIMELINE_MARKER_Y2 = 42;

/** Y range for the optional target-lap white tick (viewBox units). */
export const TIMELINE_TICK_Y1 = 14;
export const TIMELINE_TICK_Y2 = 44;

/** Y position of the axis base line (viewBox units). */
export const TIMELINE_AXIS_Y = 56;

/** Y range for axis tick marks (viewBox units). */
export const TIMELINE_AXIS_TICK_Y1 = 53;
export const TIMELINE_AXIS_TICK_Y2 = 59;

/** Fill opacity for the pit-window zone rectangle. */
export const TIMELINE_ZONE_OPACITY = 0.75;

/** Default number of race laps when `totalLaps` prop is omitted. */
export const TIMELINE_DEFAULT_TOTAL_LAPS = 70;

/** Stroke width for the boundary marker lines (non-scaling). */
export const TIMELINE_BOUNDARY_STROKE_W = 1.5;

/** Stroke width for the optimal-lap white tick (non-scaling). */
export const TIMELINE_TICK_STROKE_W = 2.5;

/** Font size (px) for lap number labels overlaid on the SVG. */
export const TIMELINE_LABEL_FONT_SIZE = 10;

/** Font size (px) for axis tick labels. */
export const TIMELINE_AXIS_FONT_SIZE = 9;

/** Top offset (px) for lap-boundary HTML labels. */
export const TIMELINE_BOUNDARY_LABEL_TOP = 2;

/** Top offset (px) for target-lap "OPT" HTML label. */
export const TIMELINE_TARGET_LABEL_TOP = 28;

/** Top offset (px) for axis tick HTML labels. */
export const TIMELINE_AXIS_LABEL_TOP = 54;

// ---------------------------------------------------------------------------
// GapGauge
// ---------------------------------------------------------------------------

/** Height (px) of the thermometer bar area in the SVG. */
export const GAUGE_BAR_HEIGHT = 140;

/** Width (px) of the thermometer bar rectangle. */
export const GAUGE_BAR_WIDTH = 20;

/** X offset (px) of the thermometer bar from the SVG left edge. */
export const GAUGE_BAR_X = 10;

/** Total SVG width (px) for the GapGauge. */
export const GAUGE_SVG_WIDTH = 40;

/** Scalar applied to max(gap, pitLoss) to add headroom above the highest value. */
export const GAUGE_SCALE_HEADROOM = 1.25;

/** Fill opacity for the thermometer colored fill. */
export const GAUGE_FILL_OPACITY = 0.85;

/** X positions for the dashed threshold line (non-scaling-stroke). */
export const GAUGE_THRESHOLD_X1 = 4;
export const GAUGE_THRESHOLD_X2 = 36;

/** X position for the threshold label text anchor. */
export const GAUGE_THRESHOLD_LABEL_X = 38;

/** Vertical nudge (px) for the threshold label relative to lossY. */
export const GAUGE_THRESHOLD_LABEL_DY = 3;

/** Font size (px) for the threshold label inside the SVG. */
export const GAUGE_THRESHOLD_FONT_SIZE = 7;

/** Minimum width (px) of the GapGauge container. */
export const GAUGE_CONTAINER_MIN_WIDTH = 96;

// ---------------------------------------------------------------------------
// StrategyCanvas — framer-motion animation timings
// ---------------------------------------------------------------------------

/** Base duration (s) for canvas row enter animations. */
export const CANVAS_ANIM_DURATION = 0.25;

/** Stagger delay (s) between canvas rows (row 1 → 2 → 3). */
export const CANVAS_ANIM_STAGGER = 0.08;

/** Enter Y offset (px) for slide-up animation. */
export const CANVAS_ANIM_Y_OFFSET = 8;

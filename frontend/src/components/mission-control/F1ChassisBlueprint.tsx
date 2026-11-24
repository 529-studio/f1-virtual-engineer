"use client";

import React, { useId } from "react";

export interface F1ChassisBlueprintProps {
  /** Optional class name for the wrapper group */
  className?: string;
  /** Whether to render aerodynamic streamline flow paths */
  showStreamlines?: boolean;
  /** Whether to render technical CAD micro-labels */
  showLabels?: boolean;
  /** Opacity of the entire blueprint overlay (0 to 1) */
  opacity?: number;
}

/**
 * F1ChassisBlueprint
 * 
 * High-Tech Minimalist CAD Engineering Blueprint of a Next-Gen Formula 1
 * Ground-Effect Chassis (2022-2026 Regulations).
 * 
 * Accurately represents:
 * - Swept multi-element front wing with curved endplate diveplanes
 * - Slender aerodynamic nosecone with datum crosshairs & pitot probe
 * - Double-wishbone push-rod front suspension geometry
 * - Titanium Halo structure with aerodynamic fairing & central pylon
 * - Driver survival cell, cockpit aperture & steering wheel yoke
 * - Aggressive sidepod undercuts, venturi tunnel floor strakes & cooling louvers
 * - Engine cover dorsal shark fin & beam wing
 * - Modern curved rear wing with DRS actuator pod & rear diffuser tunnels
 * - FIA central flashing rain light
 * - Aerodynamic flow streamlines and engineering datum annotations
 */
export function F1ChassisBlueprint({
  className = "",
  showStreamlines = true,
  showLabels = true,
  opacity = 0.9,
}: F1ChassisBlueprintProps) {
  const blueprintId = useId();

  return (
    <g
      id={`f1-chassis-blueprint-${blueprintId}`}
      className={`select-none pointer-events-none transition-opacity duration-300 ${className}`}
      opacity={opacity}
    >
      <defs>
        {/* Subtle cyan glow for CAD datum points */}
        <filter id={`cad-glow-${blueprintId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Linear gradient for chassis carbon monocoque */}
        <linearGradient id={`carbon-grad-${blueprintId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0B132B" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#0D1B2A" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#070C18" stopOpacity="0.98" />
        </linearGradient>

        {/* Sidepod undercut shadow gradient */}
        <linearGradient id={`undercut-grad-${blueprintId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#020617" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#0F172A" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
        </linearGradient>

        {/* Aerodynamic streamline stroke gradient */}
        <linearGradient id={`streamline-grad-${blueprintId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.1" />
          <stop offset="30%" stopColor="#38BDF8" stopOpacity="0.5" />
          <stop offset="70%" stopColor="#2DD4BF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* ─────────────────────────────────────────────────────────────
          1. ENGINEERING CAD BACKGROUND GRID & REFERENCE AXES
          ───────────────────────────────────────────────────────────── */}
      <g className="cad-grid" opacity="0.35">
        {/* Longitudinal Centerline Axis */}
        <line
          x1="300"
          y1="18"
          x2="300"
          y2="385"
          stroke="#0EA5E9"
          strokeWidth="0.8"
          strokeDasharray="5 4"
        />

        {/* Front Wheel Axle Datum (Y=75) */}
        <line
          x1="165"
          y1="75"
          x2="435"
          y2="75"
          stroke="#38BDF8"
          strokeWidth="0.8"
          strokeDasharray="3 3"
        />
        {/* Rear Wheel Axle Datum (Y=250) */}
        <line
          x1="150"
          y1="250"
          x2="450"
          y2="250"
          stroke="#38BDF8"
          strokeWidth="0.8"
          strokeDasharray="3 3"
        />

        {/* Vehicle Perimeter Bounding Wireframe (Iso-perspective ground guide) */}
        <polygon
          points="210,40 390,40 460,360 140,360"
          fill="none"
          stroke="#1E293B"
          strokeWidth="0.6"
          strokeDasharray="4 6"
        />

        {/* Precision Crosshairs / Datum Markers */}
        {/* Front Axle Center */}
        <circle cx="300" cy="75" r="3" fill="none" stroke="#38BDF8" strokeWidth="0.9" />
        <line x1="295" y1="75" x2="305" y2="75" stroke="#38BDF8" strokeWidth="0.9" />
        <line x1="300" y1="70" x2="300" y2="80" stroke="#38BDF8" strokeWidth="0.9" />

        {/* Rear Axle Center */}
        <circle cx="300" cy="250" r="3" fill="none" stroke="#38BDF8" strokeWidth="0.9" />
        <line x1="295" y1="250" x2="305" y2="250" stroke="#38BDF8" strokeWidth="0.9" />
        <line x1="300" y1="245" x2="300" y2="255" stroke="#38BDF8" strokeWidth="0.9" />
      </g>

      {/* ─────────────────────────────────────────────────────────────
          2. AERODYNAMIC VENTURI FLOOR & SIDE EDGES
          ───────────────────────────────────────────────────────────── */}
      <g className="venturi-floor">
        {/* Left Ground-Effect Floor Edge & Venturi Inlets */}
        <path
          d="M 270 140 
             L 236 172 
             L 230 220 
             L 232 265 
             L 255 315 
             L 270 315 Z"
          fill="#050914"
          stroke="#0284C7"
          strokeWidth="0.9"
          strokeOpacity="0.7"
        />
        {/* Right Ground-Effect Floor Edge & Venturi Inlets */}
        <path
          d="M 330 140 
             L 364 172 
             L 370 220 
             L 368 265 
             L 345 315 
             L 330 315 Z"
          fill="#050914"
          stroke="#0284C7"
          strokeWidth="0.9"
          strokeOpacity="0.7"
        />

        {/* Floor Strakes / Vortex Generator Fins (Left) */}
        <line x1="242" y1="180" x2="238" y2="225" stroke="#38BDF8" strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="249" y1="185" x2="245" y2="235" stroke="#38BDF8" strokeWidth="0.8" strokeOpacity="0.5" />
        {/* Floor Strakes / Vortex Generator Fins (Right) */}
        <line x1="358" y1="180" x2="362" y2="225" stroke="#38BDF8" strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="351" y1="185" x2="355" y2="235" stroke="#38BDF8" strokeWidth="0.8" strokeOpacity="0.5" />
      </g>

      {/* ─────────────────────────────────────────────────────────────
          3. FRONT WING ASSEMBLY (2022-2026 Ground Effect Curved Spec)
          ───────────────────────────────────────────────────────────── */}
      <g className="front-wing">
        {/* Main Plane (Swept curved aerofoil) */}
        <path
          d="M 180 48 
             Q 235 40 300 48 
             Q 365 40 420 48 
             L 422 72 
             Q 365 62 300 66 
             Q 235 62 178 72 Z"
          fill="#090E1A"
          stroke="#38BDF8"
          strokeWidth="1.2"
        />

        {/* Secondary Upper Flap Tier */}
        <path
          d="M 182 56 
             Q 235 48 300 54 
             Q 365 48 418 56"
          fill="none"
          stroke="#0284C7"
          strokeWidth="0.9"
          strokeDasharray="12 2"
        />

        {/* Tertiary Flap Trailing Edge */}
        <path
          d="M 184 64 
             Q 235 56 300 61 
             Q 365 56 416 64"
          fill="none"
          stroke="#475569"
          strokeWidth="0.75"
        />

        {/* Left Curved Endplate & Outwash Diveplane */}
        <path
          d="M 178 42 
             C 176 52 177 68 180 78 
             L 186 76 
             C 183 66 182 52 184 44 Z"
          fill="#1E293B"
          stroke="#38BDF8"
          strokeWidth="1"
        />
        {/* Left Diveplane Fin */}
        <path d="M 176 58 Q 172 62 174 68" fill="none" stroke="#38BDF8" strokeWidth="1.2" />

        {/* Right Curved Endplate & Outwash Diveplane */}
        <path
          d="M 422 42 
             C 424 52 423 68 420 78 
             L 414 76 
             C 417 66 418 52 416 44 Z"
          fill="#1E293B"
          stroke="#38BDF8"
          strokeWidth="1"
        />
        {/* Right Diveplane Fin */}
        <path d="M 424 58 Q 428 62 426 68" fill="none" stroke="#38BDF8" strokeWidth="1.2" />

        {/* Front Wing Pylons anchoring to Nosecone */}
        <line x1="292" y1="46" x2="292" y2="60" stroke="#0284C7" strokeWidth="1.2" />
        <line x1="308" y1="46" x2="308" y2="60" stroke="#0284C7" strokeWidth="1.2" />
      </g>

      {/* ─────────────────────────────────────────────────────────────
          4. NOSECONE & FRONT IMPACT STRUCTURE
          ───────────────────────────────────────────────────────────── */}
      <g className="nosecone">
        {/* Slender Aerodynamic Nose Cone Envelope */}
        <path
          d="M 300 28 
             C 295 38 290 62 287 95 
             L 284 125 
             L 316 125 
             L 313 95 
             C 310 62 305 38 300 28 Z"
          fill={`url(#carbon-grad-${blueprintId})`}
          stroke="#38BDF8"
          strokeWidth="1.2"
        />

        {/* Pitot Static Speed Probe Needle */}
        <line x1="300" y1="18" x2="300" y2="28" stroke="#38BDF8" strokeWidth="1.5" />
        <circle cx="300" cy="18" r="1.5" fill="#38BDF8" />

        {/* Front Bulkhead Access Hatch / Chassis Vanity Panel */}
        <path
          d="M 292 78 L 308 78 L 306 95 L 294 95 Z"
          fill="none"
          stroke="#334155"
          strokeWidth="0.8"
        />
        <circle cx="300" cy="86" r="1.2" fill="#38BDF8" opacity="0.8" />

        {/* S-Duct Exhaust Vent / Nose Slit */}
        <line x1="296" y1="68" x2="304" y2="68" stroke="#0284C7" strokeWidth="1" />
      </g>

      {/* ─────────────────────────────────────────────────────────────
          5. FRONT SUSPENSION WISHBONES (Push-Rod & Aero Fairings)
          ───────────────────────────────────────────────────────────── */}
      <g className="front-suspension">
        {/* Front Left Wishbones (Connecting Chassis to Wheel Hub at x=172) */}
        {/* Upper Wishbone Forward Arm */}
        <line x1="287" y1="72" x2="173" y2="62" stroke="#475569" strokeWidth="1.3" />
        {/* Upper Wishbone Rear Arm */}
        <line x1="285" y1="92" x2="173" y2="78" stroke="#475569" strokeWidth="1.3" />
        {/* Lower Wishbone Aerodynamic Blended Fairing */}
        <line x1="286" y1="82" x2="173" y2="88" stroke="#334155" strokeWidth="1.5" />
        {/* High-Mounted Push-Rod (Rocker to upright) */}
        <line x1="290" y1="65" x2="173" y2="82" stroke="#38BDF8" strokeWidth="1.2" strokeOpacity="0.8" />
        {/* Steering Track Rod */}
        <line x1="284" y1="102" x2="173" y2="98" stroke="#64748B" strokeWidth="1" strokeDasharray="2 2" />

        {/* Front Right Wishbones (Connecting Chassis to Wheel Hub at x=428) */}
        {/* Upper Wishbone Forward Arm */}
        <line x1="313" y1="72" x2="427" y2="62" stroke="#475569" strokeWidth="1.3" />
        {/* Upper Wishbone Rear Arm */}
        <line x1="315" y1="92" x2="427" y2="78" stroke="#475569" strokeWidth="1.3" />
        {/* Lower Wishbone Aerodynamic Blended Fairing */}
        <line x1="314" y1="82" x2="427" y2="88" stroke="#334155" strokeWidth="1.5" />
        {/* High-Mounted Push-Rod */}
        <line x1="310" y1="65" x2="427" y2="82" stroke="#38BDF8" strokeWidth="1.2" strokeOpacity="0.8" />
        {/* Steering Track Rod */}
        <line x1="316" y1="102" x2="427" y2="98" stroke="#64748B" strokeWidth="1" strokeDasharray="2 2" />
      </g>

      {/* ─────────────────────────────────────────────────────────────
          6. COCKPIT, DRIVER SURVIVAL CELL & HALO TITANIUM FRAME
          ───────────────────────────────────────────────────────────── */}
      <g className="cockpit-halo">
        {/* Driver Survival Cell Surround */}
        <path
          d="M 284 125 
             L 274 155 
             L 272 180 
             L 328 180 
             L 326 155 
             L 316 125 Z"
          fill="#060A14"
          stroke="#1E293B"
          strokeWidth="1.2"
        />

        {/* Cockpit Opening Aperture */}
        <ellipse
          cx="300"
          cy="154"
          rx="18"
          ry="25"
          fill="#030712"
          stroke="#334155"
          strokeWidth="1"
        />

        {/* Driver Helmet Silhouette */}
        <ellipse
          cx="300"
          cy="158"
          rx="10"
          ry="12"
          fill="#0F172A"
          stroke="#0284C7"
          strokeWidth="0.9"
        />
        {/* Helmet Visor Strip */}
        <path d="M 294 153 Q 300 151 306 153" fill="none" stroke="#38BDF8" strokeWidth="1.2" />

        {/* Steering Wheel Display Yoke */}
        <path
          d="M 292 136 L 308 136 L 307 142 L 293 142 Z"
          fill="#1E293B"
          stroke="#38BDF8"
          strokeWidth="0.8"
        />

        {/* ─── HALO STRUCTURE (3D Titanium Hoop & Pylon) ─── */}
        {/* Central Titanium Pylon Pillar */}
        <path
          d="M 298 128 L 302 128 L 301 146 L 299 146 Z"
          fill="#38BDF8"
          stroke="#0284C7"
          strokeWidth="0.8"
          filter={`url(#cad-glow-${blueprintId})`}
        />
        {/* Halo Titanium Aerodynamic Ring */}
        <ellipse
          cx="300"
          cy="152"
          rx="21"
          ry="27"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="2.2"
          strokeOpacity="0.9"
        />
        {/* Halo Outer Aerodynamic Fairing Edge */}
        <ellipse
          cx="300"
          cy="152"
          rx="23"
          ry="29"
          fill="none"
          stroke="#0284C7"
          strokeWidth="0.8"
          strokeDasharray="8 4"
        />
        {/* Halo Rear Anchor Flanges */}
        <line x1="281" y1="168" x2="272" y2="175" stroke="#38BDF8" strokeWidth="1.8" />
        <line x1="319" y1="168" x2="328" y2="175" stroke="#38BDF8" strokeWidth="1.8" />
      </g>

      {/* ─────────────────────────────────────────────────────────────
          7. ENGINE AIRBOX & ROLL HOOP
          ───────────────────────────────────────────────────────────── */}
      <g className="engine-airbox">
        {/* Primary Airbox Intake Scoop (Triangular) */}
        <polygon
          points="300,174 292,185 308,185"
          fill="#020617"
          stroke="#38BDF8"
          strokeWidth="1.2"
        />
        {/* Internal Turbo Splitter Vane */}
        <line x1="300" y1="174" x2="300" y2="185" stroke="#0284C7" strokeWidth="1" />

        {/* FIA Camera Mount Fairing on Roll Hoop Top */}
        <rect
          x="298"
          y="170"
          width="4"
          height="5"
          fill="#38BDF8"
          rx="1"
        />
      </g>

      {/* ─────────────────────────────────────────────────────────────
          8. SIDEPODS & AGGRESSIVE GROUND-EFFECT UNDERCUTS
          ───────────────────────────────────────────────────────────── */}
      <g className="sidepods">
        {/* Left Sidepod Bodywork with Deep Undercut */}
        <path
          d="M 272 178 
             L 242 178 
             C 236 195 240 220 248 245 
             C 255 268 262 288 274 315 
             L 282 315 
             L 278 270 
             L 272 205 Z"
          fill={`url(#carbon-grad-${blueprintId})`}
          stroke="#38BDF8"
          strokeWidth="1.2"
        />

        {/* Right Sidepod Bodywork with Deep Undercut */}
        <path
          d="M 328 178 
             L 358 178 
             C 364 195 360 220 352 245 
             C 345 268 338 288 326 315 
             L 318 315 
             L 322 270 
             L 328 205 Z"
          fill={`url(#carbon-grad-${blueprintId})`}
          stroke="#38BDF8"
          strokeWidth="1.2"
        />

        {/* Left Radiator Air Intake Mouth */}
        <polygon
          points="242,178 270,178 266,192 244,192"
          fill="#020617"
          stroke="#0284C7"
          strokeWidth="1"
        />

        {/* Right Radiator Air Intake Mouth */}
        <polygon
          points="358,178 330,178 334,192 356,192"
          fill="#020617"
          stroke="#0284C7"
          strokeWidth="1"
        />

        {/* Sidepod Top Cooling Gills / Louvers (Left) */}
        <g stroke="#334155" strokeWidth="0.8">
          <line x1="256" y1="210" x2="268" y2="210" />
          <line x1="258" y1="216" x2="269" y2="216" />
          <line x1="260" y1="222" x2="270" y2="222" />
          <line x1="262" y1="228" x2="271" y2="228" />
        </g>

        {/* Sidepod Top Cooling Gills / Louvers (Right) */}
        <g stroke="#334155" strokeWidth="0.8">
          <line x1="344" y1="210" x2="332" y2="210" />
          <line x1="342" y1="216" x2="331" y2="216" />
          <line x1="340" y1="222" x2="330" y2="222" />
          <line x1="338" y1="228" x2="329" y2="228" />
        </g>
      </g>

      {/* ─────────────────────────────────────────────────────────────
          9. ENGINE COVER, SHARK FIN DORSAL VANE & BEAM WING
          ───────────────────────────────────────────────────────────── */}
      <g className="engine-cover">
        {/* Tapered Engine Cowling Spine */}
        <path
          d="M 284 185 
             L 278 270 
             L 282 315 
             L 318 315 
             L 322 270 
             L 316 185 Z"
          fill="#070C18"
          stroke="#1E293B"
          strokeWidth="1"
        />

        {/* Dorsal Shark Fin (Centerline Aerodynamic Stabilizer) */}
        <line
          x1="300"
          y1="185"
          x2="300"
          y2="325"
          stroke="#38BDF8"
          strokeWidth="2"
          strokeLinecap="round"
          filter={`url(#cad-glow-${blueprintId})`}
        />

        {/* Central Exhaust Tailpipe Exit */}
        <circle
          cx="300"
          cy="318"
          r="4.5"
          fill="#020617"
          stroke="#F59E0B"
          strokeWidth="1.2"
        />

        {/* Twin Element Beam Wing (Span between uprights: x=245 to x=355) */}
        <path
          d="M 252 316 L 348 316 L 344 324 L 256 324 Z"
          fill="#0F172A"
          stroke="#38BDF8"
          strokeWidth="1"
        />
        <line x1="256" y1="320" x2="344" y2="320" stroke="#0284C7" strokeWidth="0.8" />
      </g>

      {/* ─────────────────────────────────────────────────────────────
          10. REAR SUSPENSION WISHBONES & GEARBOX UPRIGHTS
          ───────────────────────────────────────────────────────────── */}
      <g className="rear-suspension">
        {/* Rear Left Multi-Link (Connecting Gearbox to Hub at x=157) */}
        <line x1="278" y1="245" x2="158" y2="238" stroke="#475569" strokeWidth="1.5" />
        <line x1="278" y1="265" x2="158" y2="252" stroke="#475569" strokeWidth="1.5" />
        <line x1="282" y1="290" x2="158" y2="270" stroke="#334155" strokeWidth="1.6" />
        {/* Rear Left Pull-Rod */}
        <line x1="280" y1="280" x2="158" y2="246" stroke="#38BDF8" strokeWidth="1.2" strokeOpacity="0.8" />

        {/* Rear Right Multi-Link (Connecting Gearbox to Hub at x=443) */}
        <line x1="322" y1="245" x2="442" y2="238" stroke="#475569" strokeWidth="1.5" />
        <line x1="322" y1="265" x2="442" y2="252" stroke="#475569" strokeWidth="1.5" />
        <line x1="318" y1="290" x2="442" y2="270" stroke="#334155" strokeWidth="1.6" />
        {/* Rear Right Pull-Rod */}
        <line x1="320" y1="280" x2="442" y2="246" stroke="#38BDF8" strokeWidth="1.2" strokeOpacity="0.8" />
      </g>

      {/* ─────────────────────────────────────────────────────────────
          11. REAR WING ASSEMBLY & DIFFUSER TUNNELS
          ───────────────────────────────────────────────────────────── */}
      <g className="rear-wing">
        {/* Rear Diffuser Tunnel Exit Structure */}
        <path
          d="M 265 328 L 335 328 L 342 352 L 258 352 Z"
          fill="#020617"
          stroke="#1E293B"
          strokeWidth="1.2"
        />
        {/* Diffuser Vertical Strakes */}
        <line x1="280" y1="332" x2="276" y2="350" stroke="#0284C7" strokeWidth="1" />
        <line x1="290" y1="332" x2="288" y2="350" stroke="#0284C7" strokeWidth="1" />
        <line x1="310" y1="332" x2="312" y2="350" stroke="#0284C7" strokeWidth="1" />
        <line x1="320" y1="332" x2="324" y2="350" stroke="#0284C7" strokeWidth="1" />

        {/* FIA Rain Light / ERS Recovery Indicator (Pulsing Red) */}
        <rect
          x="296"
          y="350"
          width="8"
          height="5"
          rx="1.5"
          fill="#EF4444"
          stroke="#991B1B"
          strokeWidth="0.8"
          className="animate-pulse"
        />

        {/* Rear Wing Endplates (Swept aero profile) */}
        {/* Left Endplate */}
        <path
          d="M 205 315 L 214 315 L 212 355 L 203 355 Z"
          fill="#0F172A"
          stroke="#38BDF8"
          strokeWidth="1"
        />
        {/* Right Endplate */}
        <path
          d="M 386 315 L 395 315 L 397 355 L 388 355 Z"
          fill="#0F172A"
          stroke="#38BDF8"
          strokeWidth="1"
        />

        {/* DRS Main Plane (Aerofoil) */}
        <path
          d="M 214 330 L 386 330 L 384 344 L 216 344 Z"
          fill="#090E1A"
          stroke="#38BDF8"
          strokeWidth="1.2"
        />
        {/* DRS Flap Upper Chord */}
        <line x1="216" y1="335" x2="384" y2="335" stroke="#0284C7" strokeWidth="1" strokeDasharray="8 2" />

        {/* Central DRS Hydraulic Actuator Pod */}
        <rect
          x="297"
          y="327"
          width="6"
          height="12"
          rx="2"
          fill="#1E293B"
          stroke="#38BDF8"
          strokeWidth="0.9"
        />
      </g>

      {/* ─────────────────────────────────────────────────────────────
          12. AERODYNAMIC STREAMLINES (Airflow Dynamics)
          ───────────────────────────────────────────────────────────── */}
      {showStreamlines && (
        <g className="streamlines" opacity="0.45">
          {/* Outboard Left Inwash / Undercut Flow */}
          <path
            d="M 205 45 C 200 90 220 160 236 210 C 248 250 252 285 254 335"
            fill="none"
            stroke={`url(#streamline-grad-${blueprintId})`}
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          {/* Outboard Right Inwash / Undercut Flow */}
          <path
            d="M 395 45 C 400 90 380 160 364 210 C 352 250 348 285 346 335"
            fill="none"
            stroke={`url(#streamline-grad-${blueprintId})`}
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Inboard Left Nosecone Flow */}
          <path
            d="M 285 45 C 278 80 274 120 268 160"
            fill="none"
            stroke={`url(#streamline-grad-${blueprintId})`}
            strokeWidth="0.8"
            strokeDasharray="3 3"
          />
          {/* Inboard Right Nosecone Flow */}
          <path
            d="M 315 45 C 322 80 326 120 332 160"
            fill="none"
            stroke={`url(#streamline-grad-${blueprintId})`}
            strokeWidth="0.8"
            strokeDasharray="3 3"
          />
        </g>
      )}

      {/* ─────────────────────────────────────────────────────────────
          13. TECHNICAL CAD MICRO-LABELS & ANNOTATIONS
          ───────────────────────────────────────────────────────────── */}
      {showLabels && (
        <g className="cad-annotations" fill="#64748B" fontSize="6.5" fontFamily="monospace" letterSpacing="0.08em">
          {/* Front Aero Datum */}
          <text x="300" y="14" textAnchor="middle" fill="#38BDF8" opacity="0.8">
            CHASSIS DATUM 0.0 // NOSE CONE
          </text>

          {/* Front Axle Spec */}
          <text x="175" y="72" textAnchor="end" opacity="0.7">
            PUSH-ROD SUSP
          </text>
          <text x="425" y="72" textAnchor="start" opacity="0.7">
            FRONT AXLE
          </text>

          {/* Halo Safety Cell */}
          <text x="325" y="132" textAnchor="start" fill="#38BDF8" opacity="0.8">
            HALO TITANIUM
          </text>

          {/* Ground-Effect Venturi Inlet */}
          <text x="228" y="170" textAnchor="end" opacity="0.7">
            VENTURI INLET
          </text>
          <text x="372" y="170" textAnchor="start" opacity="0.7">
            UNDERCUT COANDA
          </text>

          {/* Rear Axle Spec */}
          <text x="155" y="247" textAnchor="end" opacity="0.7">
            PULL-ROD MULTI-LINK
          </text>
          <text x="445" y="247" textAnchor="start" opacity="0.7">
            REAR AXLE
          </text>

          {/* Rear Wing & DRS */}
          <text x="300" y="367" textAnchor="middle" fill="#38BDF8" opacity="0.8">
            DRS ACTUATOR // BEAM WING &amp; DIFFUSER
          </text>
        </g>
      )}
    </g>
  );
}

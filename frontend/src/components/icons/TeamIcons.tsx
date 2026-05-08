/**
 * Original minimalist pixel-style SVG icons for 2026 F1 teams.
 * 11×11px footprint. No official logos, no trademarked shapes.
 * Original artwork — safe for commercial frontend use.
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size = 11) {
  return { width: size, height: size, viewBox: "0 0 11 11", fill: "none" } as const;
}

export function McLarenIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#FF8700"/>
      <path d="M2 7L4 4L6 6L9 3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function FerrariIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#DC0000"/>
      <path d="M3 8L5.5 2L8 8" stroke="#F7D038" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function RedBullIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#1E2A78"/>
      <path d="M2 6H9" stroke="#FFD43B" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M5.5 3V8" stroke="#FF4D4D" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

export function MercedesIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#111111"/>
      <circle cx="5.5" cy="5.5" r="2.5" stroke="#00D2BE" strokeWidth="1.2"/>
      <path d="M5.5 2.5V8.5" stroke="#00D2BE" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

export function AstonMartinIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#006F62"/>
      <path d="M2 7L5.5 3L9 7" stroke="#B6FFCE" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function AlpineIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#1F5EFF"/>
      <path d="M2 8L5.5 3L9 8" stroke="#FF87C8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function WilliamsIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#005AFF"/>
      <path d="M2 3L3.5 8L5.5 4.5L7.5 8L9 3" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function HaasIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#B6BABD"/>
      <path d="M3 2V9" stroke="#C40000" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M8 2V9" stroke="#111111" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

export function RBIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#F2F5F7"/>
      <path d="M2 6H9" stroke="#203A8F" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="5.5" cy="5.5" r="1.2" fill="#203A8F"/>
    </svg>
  );
}

export function SauberIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#0F0F0F"/>
      <path d="M3 8L5.5 3L8 8" stroke="#7CFF4F" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function CadillacIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#0B0B0B"/>
      <path d="M8 3H4L3 5.5L4 8H8" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Lookup map: teamId → icon component ── */
export const TEAM_ICON_MAP = {
  ferrari:     FerrariIcon,
  redbull:     RedBullIcon,
  mercedes:    MercedesIcon,
  mclaren:     McLarenIcon,
  alpine:      AlpineIcon,
  astonmartin: AstonMartinIcon,
  williams:    WilliamsIcon,
  haas:        HaasIcon,
  rb:          RBIcon,
  sauber:      SauberIcon,
  cadillac:    CadillacIcon,
} as const;

export type TeamIconId = keyof typeof TEAM_ICON_MAP;

/** Render the icon for any team id. Falls back to a neutral dot. */
export function TeamIcon({ id, size = 11, ...p }: { id: string; size?: number } & SVGProps<SVGSVGElement>) {
  const Icon = TEAM_ICON_MAP[id as TeamIconId];
  if (!Icon) {
    return (
      <svg width={size} height={size} viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg" {...p}>
        <rect width="11" height="11" rx="2" fill="rgba(245,245,247,0.12)"/>
        <circle cx="5.5" cy="5.5" r="2" fill="rgba(245,245,247,0.4)"/>
      </svg>
    );
  }
  return <Icon size={size} {...p} />;
}

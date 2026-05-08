/**
 * Pixel-art 11×11 SVG icons for the 2026 F1 season.
 * Original artwork — no official trademarks reproduced.
 * Each icon captures the dominant visual identity of the team.
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size = 11) {
  return { width: size, height: size, viewBox: "0 0 11 11", fill: "none" } as const;
}

/** McLaren — papaya speed mark (iconic Speed Mark swoosh) */
export function McLarenIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      {/* Swept swoosh from lower-left to upper-right */}
      <rect x="8" y="1" width="1" height="1" fill="#FF8700"/>
      <rect x="7" y="2" width="2" height="1" fill="#FF8700"/>
      <rect x="6" y="3" width="3" height="1" fill="#FF8700"/>
      <rect x="5" y="4" width="3" height="1" fill="#FF8700"/>
      <rect x="3" y="5" width="5" height="1" fill="#FF8700"/>
      <rect x="2" y="6" width="5" height="1" fill="#FF8700"/>
      <rect x="1" y="7" width="4" height="1" fill="#FF8700"/>
      <rect x="2" y="8" width="2" height="1" fill="#FF8700"/>
    </svg>
  );
}

/** Ferrari — yellow shield, red top stripe, prancing horse */
export function FerrariIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      {/* Yellow shield body */}
      <path fill="#FDFF00" d="M1 0H9V7L5 10L1 7Z"/>
      {/* Red stripe at top */}
      <rect x="1" y="0" width="8" height="2" fill="#CE1126"/>
      {/* Prancing horse — head, raised front legs, body, back legs */}
      <rect x="5" y="2" width="2" height="1" fill="#000000"/>
      <rect x="4" y="3" width="2" height="1" fill="#000000"/>
      <rect x="6" y="3" width="2" height="1" fill="#000000"/>
      <rect x="7" y="4" width="1" height="1" fill="#000000"/>
      <rect x="3" y="4" width="4" height="1" fill="#000000"/>
      <rect x="2" y="5" width="5" height="1" fill="#000000"/>
      <rect x="2" y="6" width="5" height="1" fill="#000000"/>
      <rect x="2" y="7" width="1" height="1" fill="#000000"/>
      <rect x="5" y="7" width="1" height="1" fill="#000000"/>
    </svg>
  );
}

/** Red Bull Racing — dark navy, yellow sun circle, two red bull silhouettes */
export function RedBullIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" fill="#0B1F4F"/>
      {/* Yellow sun */}
      <circle cx="5.5" cy="4" r="2.5" fill="#FFD600"/>
      {/* Left bull (red) */}
      <rect x="1" y="4" width="2" height="1" fill="#CC0000"/>
      <rect x="1" y="5" width="3" height="1" fill="#CC0000"/>
      <rect x="1" y="6" width="3" height="1" fill="#CC0000"/>
      <rect x="2" y="7" width="2" height="1" fill="#CC0000"/>
      <rect x="1" y="3" width="1" height="1" fill="#CC0000"/>
      {/* Right bull (red, mirrored) */}
      <rect x="8" y="4" width="2" height="1" fill="#CC0000"/>
      <rect x="7" y="5" width="3" height="1" fill="#CC0000"/>
      <rect x="7" y="6" width="3" height="1" fill="#CC0000"/>
      <rect x="7" y="7" width="2" height="1" fill="#CC0000"/>
      <rect x="9" y="3" width="1" height="1" fill="#CC0000"/>
    </svg>
  );
}

/** Mercedes — dark bg, silver ring, three-pointed star (trident Y) */
export function MercedesIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" fill="#1A1A1A"/>
      <circle cx="5.5" cy="5.5" r="4.5" fill="none" stroke="#C0C0C0" strokeWidth="0.8"/>
      {/* Three-armed star — Y shape, silver */}
      <path
        d="M5.5 1V5.5 M5.5 5.5L2 9 M5.5 5.5L9 9"
        stroke="#C0C0C0"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Aston Martin — dark racing green, white wing silhouettes, AM badge */
export function AstonMartinIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" fill="#00443C"/>
      {/* Left wing */}
      <path fill="#FFFFFF" d="M1 5L3 3L5 4L5 6L3 7Z"/>
      {/* Right wing */}
      <path fill="#FFFFFF" d="M6 4L8 3L10 5L8 7L6 6Z"/>
      {/* Center body strip */}
      <rect x="4" y="4" width="3" height="3" fill="#00665C"/>
      {/* AM text */}
      <text
        x="5.5" y="7.2"
        textAnchor="middle"
        fontFamily="Arial"
        fontSize="2.4"
        fontWeight="bold"
        fill="#FFFFFF"
      >AM</text>
    </svg>
  );
}

/** Alpine — blue bg, white mountain A logo */
export function AlpineIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" fill="#0090D4"/>
      {/* Bold A shape */}
      <path fill="#FFFFFF" d="M2 9L5 1H6L9 9H8L7 7H4L3 9Z"/>
      {/* Crossbar cutout */}
      <rect x="4.2" y="5.5" width="2.6" height="1.1" fill="#0090D4"/>
    </svg>
  );
}

/** Williams — white bg, royal blue bold W */
export function WilliamsIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" fill="#F0F4FF"/>
      <path
        fill="#0057A8"
        d="M1 2H2L3.5 7.5L5.5 4L7.5 7.5L9 2H10L8 10H7L5.5 6.5L4 10H3Z"
      />
    </svg>
  );
}

/** Haas — dark bg, red circular ring, double diagonal slashes */
export function HaasIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" fill="#1A1A1A"/>
      <circle cx="5.5" cy="5.5" r="4.5" fill="none" stroke="#E10600" strokeWidth="0.8"/>
      {/* Double slash marks */}
      <path fill="#E10600" d="M3 8L5 2H6L4 8Z M6 8L8 2H9L7 8Z"/>
    </svg>
  );
}

/** Racing Bulls — dark blue bg, white RB lettermark + bull */
export function RBIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" fill="#1E3CCB"/>
      {/* White bull silhouette (simplified) */}
      <rect x="7" y="2" width="3" height="1" fill="#FFFFFF"/>
      <rect x="7" y="3" width="3" height="2" fill="#FFFFFF"/>
      <rect x="8" y="5" width="2" height="1" fill="#FFFFFF"/>
      <rect x="7" y="6" width="1" height="1" fill="#FFFFFF"/>
      <rect x="9" y="6" width="1" height="1" fill="#FFFFFF"/>
      {/* RB lettering */}
      <text
        x="0.5" y="8.5"
        fontFamily="Arial"
        fontSize="5.5"
        fontWeight="bold"
        fill="#FFFFFF"
      >RB</text>
    </svg>
  );
}

/** Revolut Audi F1 Team — dark bg, silver four-ring Audi logo */
export function AudiIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" fill="#111111"/>
      {/* Audi four rings — silver, slight overlap */}
      <circle cx="1.5" cy="6" r="1.4" fill="none" stroke="#C8C8C8" strokeWidth="0.9"/>
      <circle cx="4.0" cy="6" r="1.4" fill="none" stroke="#C8C8C8" strokeWidth="0.9"/>
      <circle cx="6.5" cy="6" r="1.4" fill="none" stroke="#C8C8C8" strokeWidth="0.9"/>
      <circle cx="9.0" cy="6" r="1.4" fill="none" stroke="#C8C8C8" strokeWidth="0.9"/>
    </svg>
  );
}

/** Cadillac F1 — dark bg, gold-outlined shield, colored crest bands */
export function CadillacIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" fill="#0B0B0B"/>
      {/* Shield top red band */}
      <path fill="#CC0000" d="M2 1H9V3H2Z"/>
      {/* Gold left column */}
      <rect x="2" y="3" width="2.3" height="6" fill="#D4AF37"/>
      {/* Blue center column */}
      <rect x="4.3" y="3" width="2.4" height="6" fill="#002FA7"/>
      {/* Gold right column */}
      <rect x="6.7" y="3" width="2.3" height="6" fill="#D4AF37"/>
      {/* Gold shield outline */}
      <path fill="none" stroke="#D4AF37" strokeWidth="0.8" d="M2 1H9V7L5.5 10L2 7Z"/>
    </svg>
  );
}

/* ── Lookup map ── */
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
  audi:        AudiIcon,
  cadillac:    CadillacIcon,
} as const;

export type TeamIconId = keyof typeof TEAM_ICON_MAP;

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

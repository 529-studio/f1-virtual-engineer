/**
 * SVG icons for the 2026 F1 season.
 * Original artwork — no official trademarks reproduced.
 * Ferrari, Red Bull, Mercedes, McLaren, Audi: 24×24 viewBox.
 * All others: 11×11 viewBox.
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base11(size = 11) {
  return { width: size, height: size, viewBox: "0 0 11 11", fill: "none" } as const;
}

function base24(size = 11) {
  return { width: size, height: size, viewBox: "0 0 24 24", fill: "none" } as const;
}

export function McLarenIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base24(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#FF8700"/>
      <path d="M4 14 C8 10, 13 8, 19 8 L15 12 C13 14, 10 15, 6 15 Z" fill="#111111"/>
    </svg>
  );
}

export function FerrariIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base24(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#FFD600"/>
      <rect x="0" y="0" width="24" height="2" fill="#009246"/>
      <rect x="0" y="2" width="24" height="2" fill="#FFFFFF"/>
      <rect x="0" y="4" width="24" height="2" fill="#CE2B37"/>
      <path d="M7 6H17V14C17 17.5 14.5 19.5 12 20C9.5 19.5 7 17.5 7 14V6Z"
        fill="#FFE44D" stroke="#111111" strokeWidth="0.6"/>
      <path d="M12 8 L13.2 9.2 L14.2 10 L13.8 12.2 L14.6 14.5 L13.6 16 L12.8 14.4
               L11.6 15.8 L10.7 14 L9.8 14.8 L10.2 12 L9.3 10.6 L10.2 9 L11 8.2 Z"
        fill="#111111"/>
      <text x="12" y="18" textAnchor="middle" fontSize="2.6"
        fontFamily="Arial, Helvetica, sans-serif" fill="#111111" fontWeight="700">SF</text>
    </svg>
  );
}

export function RedBullIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base24(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#0A1E5A"/>
      <circle cx="12" cy="12" r="4" fill="#FFD400"/>
      <path d="M4 12 L7 10 L9 11 L8 13 L6 14 L4 12Z" fill="#E10600" stroke="#FFFFFF" strokeWidth="0.5"/>
      <path d="M20 12 L17 10 L15 11 L16 13 L18 14 L20 12Z" fill="#E10600" stroke="#FFFFFF" strokeWidth="0.5"/>
      <rect x="1" y="18" width="22" height="2" rx="1" fill="#031633"/>
    </svg>
  );
}

export function MercedesIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base24(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#0E1117"/>
      <circle cx="12" cy="12" r="8" stroke="#C7CCD1" strokeWidth="1.4"/>
      <path d="M12 5L12 12" stroke="#C7CCD1" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M12 12L7 17" stroke="#C7CCD1" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M12 12L17 17" stroke="#C7CCD1" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="1.3" fill="#00D2BE"/>
    </svg>
  );
}

export function AstonMartinIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base11(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#006F62"/>
      <path d="M1.5 4H4.5L5.5 5L6.5 4H9.5" stroke="#D6FFE8" strokeWidth="0.7"/>
      <path d="M2 6L5.5 7.5L9 6" stroke="#D6FFE8" strokeWidth="0.7"/>
    </svg>
  );
}

export function AlpineIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base11(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#186BFF"/>
      <path d="M2 8L5 3H6.5L9 8H7.5L6.8 6.8H4.2L3.5 8H2Z" fill="#FFFFFF"/>
    </svg>
  );
}

export function WilliamsIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base11(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#005AFF"/>
      <path d="M1.5 3L3 8L5.5 4.5L8 8L9.5 3" stroke="#FFFFFF" strokeWidth="1"/>
    </svg>
  );
}

export function HaasIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base11(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#111111"/>
      <circle cx="5.5" cy="5.5" r="3" stroke="#E10600" strokeWidth="1"/>
      <path d="M4 7L7 4" stroke="#E10600" strokeWidth="1"/>
    </svg>
  );
}

export function RBIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base11(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#1A1A1A"/>
      <path d="M2 6L4 5L5 6L4 7L2 6Z" fill="#FFFFFF"/>
      <path d="M9 6L7 5L6 6L7 7L9 6Z" fill="#FFFFFF"/>
      <circle cx="5.5" cy="6" r="1" fill="#C0C0C0"/>
    </svg>
  );
}

export function AudiIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base24(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#111111"/>
      <text x="12" y="7" textAnchor="middle" fontSize="3"
        fontFamily="Arial, Helvetica, sans-serif" fill="#FFFFFF" fontWeight="700">R</text>
      <circle cx="6"  cy="14" r="2.5" stroke="#FFFFFF" strokeWidth="0.8"/>
      <circle cx="10" cy="14" r="2.5" stroke="#FFFFFF" strokeWidth="0.8"/>
      <circle cx="14" cy="14" r="2.5" stroke="#FFFFFF" strokeWidth="0.8"/>
      <circle cx="18" cy="14" r="2.5" stroke="#FFFFFF" strokeWidth="0.8"/>
    </svg>
  );
}

export function CadillacIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base11(size)} {...p} xmlns="http://www.w3.org/2000/svg">
      <rect width="11" height="11" rx="2" fill="#C0C0C0"/>
      <rect x="2" y="3" width="2" height="2" fill="#D91C1C"/>
      <rect x="4" y="3" width="2" height="2" fill="#F5D547"/>
      <rect x="6" y="3" width="2" height="2" fill="#1C5FD9"/>
      <rect x="3" y="5" width="2" height="2" fill="#FFFFFF"/>
      <rect x="5" y="5" width="2" height="2" fill="#D91C1C"/>
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

"use client";

import type { RadioMessage } from "@/types/radio";
import { Radio, Volume2 } from "lucide-react";

interface RadioLivePopupProps {
  message: RadioMessage | null;
  isVisible: boolean;
  onPlay: (message: RadioMessage) => void;
  onDismiss: () => void;
}

export function RadioLivePopup({
  message,
  isVisible,
  onPlay,
  onDismiss,
}: RadioLivePopupProps) {
  if (!isVisible || !message) return null;

  const teamColor = message.team_color || "#3671C6";

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-lg border border-accent/40 bg-surface-elevated/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      {/* Radio Pulse Wave Icon */}
      <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/20 text-accent">
        <Radio className="h-5 w-5 animate-pulse" strokeWidth={1.5} />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
        </span>
      </div>

      {/* Message Info */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-mono font-bold"
            style={{
              backgroundColor: `${teamColor}20`,
              color: "#FFFFFF",
              border: `1px solid ${teamColor}60`,
            }}
          >
            {message.driver_code}
          </span>
          <span className="text-[10px] font-mono tracking-wider text-accent uppercase">
            LIVE TEAM RADIO
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-foreground">
          &ldquo;{message.transcript}&rdquo;
        </p>
      </div>

      {/* Action Buttons (Min 44px touch targets) */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => onPlay(message)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-accent bg-accent/20 text-accent transition-colors hover:bg-accent/30"
          aria-label={`Listen to ${message.driver_code} radio`}
        >
          <Volume2 className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-border bg-surface text-foreground-dim transition-colors hover:text-foreground"
          aria-label="Dismiss live radio notification"
        >
          <span className="text-sm font-mono">&times;</span>
        </button>
      </div>
    </div>
  );
}

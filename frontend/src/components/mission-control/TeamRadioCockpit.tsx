"use client";

import { useTeamRadio } from "@/hooks/useTeamRadio";
import { RadioPlaylist } from "@/components/mission-control/RadioPlaylist";
import { RadioWaveformVisualizer } from "@/components/mission-control/RadioWaveformVisualizer";
import { RadioTranscriptCard } from "@/components/mission-control/RadioTranscriptCard";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface TeamRadioCockpitProps {
  sessionKey?: number;
  compact?: boolean;
  eventLabel?: string;
}

export function TeamRadioCockpit({ sessionKey = 9165, compact = false, eventLabel }: TeamRadioCockpitProps) {
  const {
    filteredMessages,
    activeMessage,
    status,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    isPitWallFilter,
    driverFilter,
    frequencyData,
    selectMessage,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    togglePitWallFilter,
    setDriverFilter,
    reloadFeed,
  } = useTeamRadio(sessionKey);

  const PLAYBACK_RATES = [1.0, 1.25, 1.5];

  return (
    <div className={`w-full rounded-lg border border-border bg-surface-base/80 ${compact ? "p-2.5 space-y-3" : "p-4 space-y-4"} backdrop-blur-md overflow-hidden`}>
      {/* Cockpit Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-accent/40 bg-accent/15 text-accent shadow-sm">
            <Radio className="h-4 w-4" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-mono font-bold tracking-wider text-foreground uppercase">
                AI Team Radio Cockpit
              </h2>
              <span className="flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-mono text-accent">
                <Sparkles className="h-3 w-3" strokeWidth={1.5} />
                WHISPER STT
              </span>
            </div>
            <p className="text-[11px] font-mono text-foreground-dim truncate">
              {eventLabel ? `${eventLabel} · ` : ""}Session {sessionKey} · Live Timing Broadcast Stream
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={reloadFeed}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded border border-border bg-surface px-2.5 text-xs font-mono text-foreground-dim transition-colors hover:border-accent hover:text-foreground cursor-pointer"
          aria-label="Refresh radio feed"
          title="Reload latest radio feed"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          {!compact && <span className="hidden sm:inline">REFRESH</span>}
        </button>
      </div>

      {/* Main Grid: Always 1 Column when inside narrow StrategyHUD drawer (`compact`), 2 Columns on wide desktop */}
      <div className={`grid grid-cols-1 gap-3 ${compact ? "" : "lg:grid-cols-12 lg:gap-4"}`}>
        {/* Left Column: Playlist */}
        <div className={compact ? "w-full min-w-0" : "lg:col-span-5 min-w-0"}>
          <div className="rounded border border-border/70 bg-surface/40 p-2.5 sm:p-3">
            <RadioPlaylist
              messages={filteredMessages}
              activeId={activeMessage?.id || null}
              onSelect={selectMessage}
              driverFilter={driverFilter}
              onFilterChange={setDriverFilter}
              status={status}
              onRetry={reloadFeed}
            />
          </div>
        </div>

        {/* Right Column: Audio Player & Waveform & Transcript */}
        <div className={`space-y-3 min-w-0 ${compact ? "w-full" : "lg:col-span-7"}`}>
          {/* Waveform Spectrum Visualizer */}
          <div className="rounded border border-border/70 bg-surface/40 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-mono text-foreground-dim">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-foreground-faint text-[10px]">
                <Radio className="h-3.5 w-3.5 text-accent shrink-0" strokeWidth={1.5} />
                Live Waveform (60 FPS)
              </span>
              <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-foreground-dim border border-border">
                {isPitWallFilter ? "300Hz-3.4kHz EQ" : "FLAT EQ"}
              </span>
            </div>

            <RadioWaveformVisualizer
              frequencyData={frequencyData}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onSeek={seek}
              teamColor={activeMessage?.team_color || "#3671C6"}
            />

            {/* Audio Controls Toolbar (All targets >= 44px, fits 288px drawer without clipping) */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-border/40">
              {/* Play / Pause Toggle Button */}
              <button
                type="button"
                onClick={togglePlay}
                disabled={!activeMessage}
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded border border-accent bg-accent/20 ${compact ? "px-3" : "px-5"} text-xs font-mono font-bold text-accent shadow-sm transition-all hover:bg-accent/30 disabled:opacity-50 cursor-pointer`}
                aria-label={isPlaying ? "Pause team radio audio" : "Play team radio audio"}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span>PAUSE</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span>{compact ? "PLAY" : "PLAY RADIO"}</span>
                  </>
                )}
              </button>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1">
                {PLAYBACK_RATES.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setPlaybackRate(rate)}
                    className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded border ${compact ? "px-1.5" : "px-2.5"} text-xs font-mono font-bold transition-colors cursor-pointer ${
                      playbackRate === rate
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface text-foreground-dim hover:text-foreground"
                    }`}
                    aria-label={`Playback speed ${rate}x`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* Volume & Mute Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-border bg-surface text-foreground-dim hover:text-foreground transition-colors cursor-pointer"
                  aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4 text-red-400" strokeWidth={1.5} />
                  ) : (
                    <Volume2 className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className={`h-2 cursor-pointer accent-accent ${compact ? "w-14" : "w-16 sm:w-20"}`}
                  aria-label="Volume slider"
                />
              </div>
            </div>
          </div>

          {/* Transcript & Tactical Analysis Card */}
          <RadioTranscriptCard
            message={activeMessage}
            isPitWallFilter={isPitWallFilter}
            onToggleFilter={togglePitWallFilter}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useCallback } from "react";

interface RadioWaveformVisualizerProps {
  frequencyData: Uint8Array;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  teamColor?: string;
}

export function RadioWaveformVisualizer({
  frequencyData,
  isPlaying,
  currentTime,
  duration,
  onSeek,
  teamColor = "#EF1A2D",
}: RadioWaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const drawBars = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    // Background track line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const barCount = 32;
    const gap = 3;
    const totalGap = gap * (barCount - 1);
    const barWidth = Math.max(2, (width - totalGap) / barCount);

    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, teamColor);
    gradient.addColorStop(0.7, "#00D2BE");
    gradient.addColorStop(1, "#FFFFFF");

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap);
      const val = frequencyData[i] || 0;
      const normalized = isPlaying ? Math.max(0.1, val / 255) : 0.08;
      const barHeight = Math.max(4, normalized * (height - 8));
      const y = (height - barHeight) / 2;

      // Draw rounded bar
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }

    // Draw playhead cursor line
    if (duration > 0) {
      const progress = Math.min(1, Math.max(0, currentTime / duration));
      const playheadX = progress * width;

      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Small glowing head
      ctx.fillStyle = teamColor;
      ctx.beginPath();
      ctx.arc(playheadX, height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [frequencyData, isPlaying, currentTime, duration, teamColor]);

  useEffect(() => {
    drawBars();
  }, [drawBars]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const seekRatio = clickX / rect.width;
    onSeek(seekRatio * duration);
  };

  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const ms = Math.floor((secs % 1) * 10);
    return `00:0${s}.${ms}`;
  };

  return (
    <div className="w-full space-y-1.5">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        className="group relative h-16 w-full cursor-pointer rounded border border-border bg-surface-elevated/40 p-1.5 backdrop-blur-sm transition-colors hover:border-accent/40"
        role="slider"
        aria-label="Audio scrubber timeline"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
      >
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>

      <div className="flex items-center justify-between px-1 text-[11px] font-mono tracking-wider text-foreground-dim">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

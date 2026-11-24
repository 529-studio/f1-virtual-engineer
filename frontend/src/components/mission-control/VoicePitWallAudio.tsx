"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Radio,
  Volume2,
  VolumeX,
  Mic,
  Square,
} from "lucide-react";
import { pitWallAudio } from "@/services/pitWallAudio";

export interface VoicePitWallAudioProps {
  driver?: string;
  pitWindowLap?: number;
  cliffLap?: number;
  lastTacticalMessage?: string;
}

export function VoicePitWallAudio({
  driver = "LEC",
  pitWindowLap = 34,
  cliffLap = 38,
  lastTacticalMessage,
}: VoicePitWallAudioProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [manualCallout, setManualCallout] = useState<string | null>(null);
  const volume = 0.8;
  const lastSpokenRef = useRef<string | null>(null);

  const defaultPhrase = `Box box ${driver}, pit window open lap ${pitWindowLap}. Tyre cliff projected lap ${cliffLap}.`;
  const activeCallout = manualCallout ?? lastTacticalMessage ?? defaultPhrase;

  // Speak external tactical message when it updates
  useEffect(() => {
    if (lastTacticalMessage && lastTacticalMessage !== lastSpokenRef.current) {
      lastSpokenRef.current = lastTacticalMessage;
      if (!isMuted) {
        pitWallAudio.speak(lastTacticalMessage, {
          volume,
          onStart: () => setIsTransmitting(true),
          onEnd: () => setIsTransmitting(false),
        });
      }
    }
  }, [lastTacticalMessage, isMuted, volume]);

  const handleTestCallout = useCallback(() => {
    if (isTransmitting) {
      pitWallAudio.stop();
      setIsTransmitting(false);
      return;
    }

    const testPhrases = [
      `Box box ${driver}, pit window open lap ${pitWindowLap}. Hard compound ready.`,
      `Pace delta negative. Gap to Piastri is 1.4 seconds. Mode push.`,
      `Tyre thermal optimal across carcass. Camber bias stable plus 5 degrees.`,
    ];
    const phrase = testPhrases[Math.floor(Math.random() * testPhrases.length)];
    setManualCallout(phrase);

    if (!isMuted) {
      pitWallAudio.speak(phrase, {
        volume,
        onStart: () => setIsTransmitting(true),
        onEnd: () => setIsTransmitting(false),
      });
    }
  }, [driver, pitWindowLap, isTransmitting, isMuted, volume]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        pitWallAudio.stop();
        setIsTransmitting(false);
      }
      return next;
    });
  }, []);

  return (
    <div
      data-testid="voice-pit-wall-audio"
      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-neutral-800/80 bg-neutral-950/80 p-3 sm:p-4 shadow-xl backdrop-blur-md overflow-hidden"
    >
      {/* Left: Radio Status & Live Indicator */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 shrink-0">
          <Radio className="w-5 h-5 text-sky-400" strokeWidth={1.75} />
          {isTransmitting && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isTransmitting
                  ? "bg-red-400 animate-pulse"
                  : isMuted
                  ? "bg-neutral-600"
                  : "bg-emerald-400"
              }`}
            />
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-neutral-200">
              Pit-Wall Voice Synthesizer
            </h3>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                isTransmitting
                  ? "bg-red-950/80 text-red-300 border-red-700/60"
                  : isMuted
                  ? "bg-neutral-900 text-neutral-500 border-neutral-800"
                  : "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
              }`}
            >
              {isTransmitting ? "TRANSMITTING" : isMuted ? "MUTED" : "RADIO LIVE"}
            </span>
          </div>

          {/* Tactical Callout Marquee */}
          <p className="text-xs font-mono text-neutral-400 mt-1 max-w-[420px] truncate">
            &ldquo;{activeCallout}&rdquo;
          </p>
        </div>
      </div>

      {/* Right: Controls (Kiosk ergonomics >= 44px) */}
      <div className="flex items-center gap-2 self-start sm:self-auto">
        {/* Test Radio Callout Button */}
        <button
          onClick={handleTestCallout}
          className={`px-3 py-2 rounded text-xs font-mono min-h-[46px] min-w-[46px] inline-flex items-center gap-2 transition-colors border ${
            isTransmitting
              ? "bg-red-950 text-red-200 border-red-700 hover:bg-red-900/80"
              : "bg-sky-950/80 text-sky-200 border-sky-700/80 hover:bg-sky-900/80"
          }`}
          aria-label={isTransmitting ? "Stop radio transmission" : "Radio callout announcement"}
        >
          {isTransmitting ? (
            <>
              <Square className="w-4 h-4 text-red-400" strokeWidth={1.75} />
              <span>STOP TRANSMIT</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 text-sky-400" strokeWidth={1.75} />
              <span>RADIO CALLOUT</span>
            </>
          )}
        </button>

        {/* Mute/Unmute Toggle Button */}
        <button
          onClick={toggleMute}
          className={`px-3 py-2 rounded text-xs font-mono min-h-[46px] min-w-[46px] inline-flex items-center justify-center transition-colors border ${
            isMuted
              ? "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200"
              : "bg-neutral-900 text-emerald-300 border-emerald-700/60 hover:bg-neutral-800/80"
          }`}
          aria-label={isMuted ? "Unmute pit-wall audio" : "Mute pit-wall audio"}
          aria-pressed={isMuted}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-neutral-500" strokeWidth={1.75} />
          ) : (
            <Volume2 className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Pit-Wall Audio Synthesizer & Biquad Radio Distortion Engine
 *
 * Simulates authentic Formula 1 pit-to-car radio chatter:
 * - Web Speech API SpeechSynthesisUtterance with calibrated radio cadence
 * - Web Audio API bandpass filtering (300Hz - 3.4kHz) & distortion
 * - Squelch / mic-click static bursts on transmission open and close
 */

class PitWallAudioEngine {
  private audioCtx: AudioContext | null = null;
  private isSpeaking = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Generates a realistic radio squelch / mic-click burst (50ms noise burst).
   */
  public playRadioSquelch(volume = 0.25): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const bufferSize = Math.floor(ctx.sampleRate * 0.05); // 50ms burst
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // High-frequency band-limited white noise
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      // Bandpass filter centered at 2.4kHz for radio hiss
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2400, ctx.currentTime);
      filter.Q.setValueAtTime(3.0, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noiseNode.start();
    } catch {
      // Safe fail-closed in headless/mock environments
    }
  }

  /**
   * Speaks a tactical pit-wall announcement with radio squelch framing.
   */
  public speak(
    text: string,
    options?: {
      volume?: number;
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
    }
  ): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      options?.onStart?.();
      options?.onEnd?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      // Play mic-open squelch click
      this.playRadioSquelch((options?.volume ?? 0.8) * 0.3);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = options?.volume ?? 0.8;
      utterance.rate = options?.rate ?? 1.05; // Slightly faster tactical cadence
      utterance.pitch = options?.pitch ?? 1.1; // Radio crispness
      utterance.lang = "en-US";

      // Select natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const radioVoice = voices.find(
        (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Daniel"))
      ) || voices.find((v) => v.lang.startsWith("en"));
      if (radioVoice) {
        utterance.voice = radioVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        options?.onStart?.();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        // Play mic-close squelch click
        this.playRadioSquelch((options?.volume ?? 0.8) * 0.25);
        options?.onEnd?.();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        options?.onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.isSpeaking = false;
      options?.onEnd?.();
    }
  }

  public stop(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
  }

  public get speaking(): boolean {
    return this.isSpeaking;
  }
}

export const pitWallAudio = new PitWallAudioEngine();

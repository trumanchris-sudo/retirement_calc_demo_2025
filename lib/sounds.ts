'use client';

/**
 * Subtle Sound Effects for Financial Calculator
 *
 * Uses Web Audio API to generate professional, non-intrusive audio feedback.
 * All sounds are synthesized (no external files needed) and designed to be
 * subtle and appropriate for a financial planning tool.
 */

// Storage key for sound preferences
const STORAGE_KEY = 'retirement-calc-sounds';
const VOLUME_KEY = 'retirement-calc-volume';

// Default volume (0.0 to 1.0) - kept low for subtlety
const DEFAULT_VOLUME = 0.15;

// Type definitions
export type SoundType =
  | 'click'      // Button clicks
  | 'success'    // Milestone achievements
  | 'error'      // Validation errors
  | 'whoosh'     // Transitions
  | 'coin'       // Money-related actions
  | 'tick';      // Number changes

export interface SoundPreferences {
  enabled: boolean;
  volume: number;
}

// Singleton AudioContext (created on first interaction)
let audioContext: AudioContext | null = null;

/**
 * Get or create the AudioContext
 * Must be called from a user interaction event handler on first use
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      console.warn('Web Audio API not supported');
      return null;
    }
  }

  // Resume if suspended (browsers require user interaction)
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {
      // Ignore resume errors
    });
  }

  return audioContext;
}

/**
 * Get stored sound preferences
 */
export function getSoundPreferences(): SoundPreferences {
  if (typeof window === 'undefined') {
    return { enabled: false, volume: DEFAULT_VOLUME };
  }

  try {
    const enabled = localStorage.getItem(STORAGE_KEY);
    const volume = localStorage.getItem(VOLUME_KEY);

    return {
      enabled: enabled === 'true',
      volume: volume !== null ? parseFloat(volume) : DEFAULT_VOLUME,
    };
  } catch {
    return { enabled: false, volume: DEFAULT_VOLUME };
  }
}

/**
 * Save sound preferences
 */
export function setSoundPreferences(prefs: Partial<SoundPreferences>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getSoundPreferences();

    if (prefs.enabled !== undefined) {
      localStorage.setItem(STORAGE_KEY, String(prefs.enabled));
    }
    if (prefs.volume !== undefined) {
      const clampedVolume = Math.max(0, Math.min(1, prefs.volume));
      localStorage.setItem(VOLUME_KEY, String(clampedVolume));
    }

    // Dispatch event for listeners
    window.dispatchEvent(new CustomEvent('soundprefschange', {
      detail: { ...current, ...prefs }
    }));
  } catch {
    // localStorage might not be available
  }
}

/**
 * Toggle sounds on/off
 */
export function toggleSounds(): boolean {
  const current = getSoundPreferences();
  const newEnabled = !current.enabled;
  setSoundPreferences({ enabled: newEnabled });
  return newEnabled;
}

/**
 * Check if sounds are enabled
 */
export function isSoundEnabled(): boolean {
  return getSoundPreferences().enabled;
}

/**
 * Get current volume level
 */
export function getVolume(): number {
  return getSoundPreferences().volume;
}

/**
 * Set volume level (0.0 to 1.0)
 */
export function setVolume(volume: number): void {
  setSoundPreferences({ volume });
}

// ============================================================================
// Sound Generation Functions
// Each function creates a subtle, professional sound using Web Audio API
// ============================================================================

/**
 * Create a gain node with envelope for smooth attack/release
 */
function createEnvelope(
  ctx: AudioContext,
  attackTime: number,
  decayTime: number,
  sustainLevel: number,
  releaseTime: number,
  duration: number
): GainNode {
  const gain = ctx.createGain();
  const now = ctx.currentTime;

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(1, now + attackTime);
  gain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
  gain.gain.setValueAtTime(sustainLevel, now + duration - releaseTime);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  return gain;
}

/**
 * Soft click sound - short, muted tap
 */
function playClick(ctx: AudioContext, volume: number): void {
  const duration = 0.05;
  const now = ctx.currentTime;

  // Short noise burst with high-pass filter for a soft click
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    // Exponential decay noise
    const decay = Math.exp(-i / (bufferSize * 0.1));
    data[i] = (Math.random() * 2 - 1) * decay;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // High-pass filter for a cleaner click
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 2000;

  // Low-pass to soften
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 6000;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume * 0.3, now);

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(ctx.destination);

  source.start(now);
  source.stop(now + duration);
}

/**
 * Success chime - pleasant two-tone ascending
 */
function playSuccess(ctx: AudioContext, volume: number): void {
  const now = ctx.currentTime;

  // Two ascending tones (major third interval)
  const frequencies = [523.25, 659.25]; // C5, E5
  const duration = 0.25;

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const gain = ctx.createGain();
    const startTime = now + i * 0.08;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume * 0.2, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

/**
 * Error buzz - short, low frequency pulse
 */
function playError(ctx: AudioContext, volume: number): void {
  const now = ctx.currentTime;
  const duration = 0.15;

  // Low frequency oscillator with slight detune for "buzz"
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();

  osc1.type = 'triangle';
  osc2.type = 'triangle';
  osc1.frequency.value = 180;
  osc2.frequency.value = 185; // Slight detune for subtle beating

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume * 0.15, now + 0.01);
  gain.gain.linearRampToValueAtTime(volume * 0.15, now + duration * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // Low-pass filter to keep it subtle
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
}

/**
 * Whoosh - filtered noise sweep for transitions
 */
function playWhoosh(ctx: AudioContext, volume: number): void {
  const now = ctx.currentTime;
  const duration = 0.2;

  // Create noise
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    // Noise with amplitude envelope
    const envelope = Math.sin((i / bufferSize) * Math.PI);
    data[i] = (Math.random() * 2 - 1) * envelope;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Sweeping bandpass filter
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(200, now);
  filter.frequency.exponentialRampToValueAtTime(2000, now + duration * 0.7);
  filter.frequency.exponentialRampToValueAtTime(800, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume * 0.15, now);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(now);
  source.stop(now + duration);
}

/**
 * Coin sound - metallic ping for money-related actions
 */
function playCoin(ctx: AudioContext, volume: number): void {
  const now = ctx.currentTime;
  const duration = 0.3;

  // Metallic sound using multiple harmonics
  const baseFreq = 1200;
  const harmonics = [1, 2.4, 3.8, 5.1]; // Inharmonic for metallic quality

  harmonics.forEach((ratio, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = baseFreq * ratio;

    const gain = ctx.createGain();
    const amplitude = volume * 0.08 / (i + 1); // Higher harmonics quieter

    gain.gain.setValueAtTime(amplitude, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration / (i + 1));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  });
}

/**
 * Tick sound - very short, subtle click for number changes
 */
function playTick(ctx: AudioContext, volume: number): void {
  const now = ctx.currentTime;
  const duration = 0.025;

  // Very short sine wave burst
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 1000;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume * 0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

// ============================================================================
// Main Sound Playing Function
// ============================================================================

// Track last play time to prevent sound spam
const lastPlayTime: Record<SoundType, number> = {
  click: 0,
  success: 0,
  error: 0,
  whoosh: 0,
  coin: 0,
  tick: 0,
};

// Minimum time between sounds of the same type (ms)
const DEBOUNCE_TIMES: Record<SoundType, number> = {
  click: 50,
  success: 500,
  error: 200,
  whoosh: 100,
  coin: 100,
  tick: 30,
};

/**
 * Play a sound effect
 *
 * @param type - The type of sound to play
 * @param options - Optional overrides
 */
export function playSound(
  type: SoundType,
  options?: {
    volume?: number;  // Override volume (0.0 to 1.0)
    force?: boolean;  // Bypass enabled check
  }
): void {
  // Check if sounds are enabled (unless forced)
  if (!options?.force && !isSoundEnabled()) {
    return;
  }

  // Debounce to prevent sound spam
  const now = Date.now();
  if (now - lastPlayTime[type] < DEBOUNCE_TIMES[type]) {
    return;
  }
  lastPlayTime[type] = now;

  // Get audio context
  const ctx = getAudioContext();
  if (!ctx) return;

  // Calculate final volume
  const baseVolume = options?.volume ?? getVolume();
  const volume = Math.max(0, Math.min(1, baseVolume));

  // Play the appropriate sound
  try {
    switch (type) {
      case 'click':
        playClick(ctx, volume);
        break;
      case 'success':
        playSuccess(ctx, volume);
        break;
      case 'error':
        playError(ctx, volume);
        break;
      case 'whoosh':
        playWhoosh(ctx, volume);
        break;
      case 'coin':
        playCoin(ctx, volume);
        break;
      case 'tick':
        playTick(ctx, volume);
        break;
    }
  } catch {
    // Silently fail if audio playback fails
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/** Play click sound */
export const click = () => playSound('click');

/** Play success chime */
export const success = () => playSound('success');

/** Play error buzz */
export const error = () => playSound('error');

/** Play whoosh transition */
export const whoosh = () => playSound('whoosh');

/** Play coin sound */
export const coin = () => playSound('coin');

/** Play tick sound */
export const tick = () => playSound('tick');

// ============================================================================
// React Hook for Sound Preferences
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

/**
 * React hook for managing sound preferences
 *
 * @example
 * const { enabled, volume, toggle, setVolume } = useSoundPreferences();
 */
export function useSoundPreferences() {
  const [prefs, setPrefs] = useState<SoundPreferences>(() => getSoundPreferences());

  // Listen for preference changes
  useEffect(() => {
    const handleChange = (e: CustomEvent<SoundPreferences>) => {
      setPrefs(e.detail);
    };

    window.addEventListener('soundprefschange', handleChange as EventListener);
    return () => {
      window.removeEventListener('soundprefschange', handleChange as EventListener);
    };
  }, []);

  // Initialize AudioContext on first interaction (required by browsers)
  useEffect(() => {
    const initAudio = () => {
      getAudioContext();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
      window.removeEventListener('keydown', initAudio);
    };

    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });

    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
  }, []);

  const toggle = useCallback(() => {
    const newEnabled = toggleSounds();
    // Play a sound to confirm (if enabling)
    if (newEnabled) {
      playSound('click', { force: true });
    }
  }, []);

  const updateVolume = useCallback((volume: number) => {
    setVolume(volume);
    // Play a tick to demonstrate the volume
    playSound('tick', { force: true, volume });
  }, []);

  return {
    enabled: prefs.enabled,
    volume: prefs.volume,
    toggle,
    setVolume: updateVolume,
    playSound,
  };
}

// ============================================================================
// Presets for Common Interactions
// ============================================================================

/**
 * Sound presets for common UI interactions
 * Use these for consistent sound experience across the app
 */
export const soundPresets = {
  /** Button click */
  button: () => click(),

  /** Form submission success */
  formSuccess: () => success(),

  /** Validation error */
  validationError: () => error(),

  /** Page/section transition */
  transition: () => whoosh(),

  /** Currency input change */
  moneyChange: () => coin(),

  /** Slider or number input tick */
  numberTick: () => tick(),

  /** Milestone reached (savings goal, retirement age, etc.) */
  milestone: () => success(),

  /** Download/export action */
  download: () => whoosh(),

  /** Toggle switch */
  toggle: () => click(),

  /** Delete/remove action */
  remove: () => click(),

  /** Add/create action */
  add: () => coin(),
} as const;

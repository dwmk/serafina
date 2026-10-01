/**
 * Lightweight Web Audio synthesizer for elegant, subtle haptics.
 */

class SoundEffects {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Soft subtle click on sending message
  playSend() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {
      // Audio not permitted or supported
    }
  }

  // Gentle low chime when Serafina's first token arrives
  playReceive() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Low warm frequency matching Serafina's contralto
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(240, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {
      // Ignore
    }
  }
}

import { VOICE_CONFIG } from '../constants';

export const soundManager = new SoundEffects();

function isLikelyMaleVoice(voice: SpeechSynthesisVoice): boolean {
  const name = (voice.name || '').toLowerCase();
  return VOICE_CONFIG.maleKeywords.some((kw) => name.includes(kw));
}

function findVoiceFromList(voices: SpeechSynthesisVoice[], allowUniversalFallback = false): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // 1. Strict Priority order queue: check name, lang code, and voiceURI for priority items
  // Priority queue: ['Bangla', 'Bengali', 'Veena', 'Google বাংলা', 'India']
  for (const keyword of VOICE_CONFIG.priorityQueue) {
    const kw = keyword.toLowerCase();
    const match = voices.find((v) => {
      const name = (v.name || '').toLowerCase();
      const lang = (v.lang || '').toLowerCase();
      const uri = (v.voiceURI || '').toLowerCase();
      const isPriority =
        name.includes(kw) ||
        lang.includes(kw) ||
        uri.includes(kw) ||
        ((kw === 'bangla' || kw === 'bengali') && (lang.startsWith('bn') || uri.includes('bn')));
      return isPriority && !isLikelyMaleVoice(v);
    });
    if (match) return match;
  }

  // 2. High-preference: Universal female voice option sourced from VOICE_CONFIG.femaleKeywords
  const universalFemale = voices.find((v) => {
    const name = (v.name || '').toLowerCase();
    const lang = (v.lang || '').toLowerCase();
    return VOICE_CONFIG.femaleKeywords.some((kw) => name.includes(kw) || lang.includes(kw)) && !isLikelyMaleVoice(v);
  });
  if (universalFemale) return universalFemale;

  // 3. Fallback: Any voice that is not explicitly identified as male
  const anyNonMale = voices.find((v) => !isLikelyMaleVoice(v));
  if (anyNonMale) return anyNonMale;

  // 4. Guaranteed universal voice fallback:
  // If the browser/device only offers system-level or untagged default voices,
  // return the default voice to guarantee speech synthesis never fails on any device.
  if (allowUniversalFallback) {
    return voices.find((v) => v.default) || voices[0] || null;
  }

  return null;
}

// Prompt browser to initialize voices immediately and warm network voice cache
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.getVoices();
  } catch {
    // Ignore
  }
}

/**
 * Waits until the browser's voice synthesis engine has fully loaded its voices,
 * prioritizing the first voice model in the priority queue and downloading/selecting
 * it to run universally for any browser and device type.
 */
export async function waitForSerafinaVoice(timeoutMs = 2500): Promise<SpeechSynthesisVoice | null> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const currentVoices = window.speechSynthesis.getVoices();
  if (currentVoices && currentVoices.length > 0) {
    const found = findVoiceFromList(currentVoices, false);
    if (found) return found;
  }

  // Wait for onvoiceschanged or poll until loaded
  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
      clearInterval(pollTimer);
      clearTimeout(failTimer);
    };

    const attemptResolve = (isFinal = false) => {
      if (settled) return;
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const voice = findVoiceFromList(voices, isFinal);
        if (voice) {
          settled = true;
          cleanup();
          resolve(voice);
          return;
        }
      }
    };

    // 1. Listen to onvoiceschanged
    window.speechSynthesis.onvoiceschanged = () => {
      attemptResolve(false);
    };

    // 2. Poll every 50ms (in case onvoiceschanged does not fire or already fired)
    const pollTimer = setInterval(() => attemptResolve(false), 50);

    // 3. Timeout fallback: 100% guarantee universal voice selection on all devices
    const failTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        const voices = window.speechSynthesis.getVoices();
        const voice = findVoiceFromList(voices, true) || (voices && voices[0]) || null;
        resolve(voice);
      }
    }, timeoutMs);
  });
}

/**
 * Synchronous voice resolver using currently cached voices.
 */
export function getSerafinaVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return findVoiceFromList(voices);
}



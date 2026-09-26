// src/lib/mascotAudio.js
// Cute WebAudio API procedural sound effects for the Mascot Puppet

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!audioCtx) {
      audioCtx = new AudioCtxClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// User interaction audio unlock
if (typeof window !== 'undefined') {
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

/**
 * Cheerful, sparkling entrance chime (C6 -> E6 -> G6)
 */
export function playEntranceSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [
    { freq: 1046.5, time: 0, duration: 0.12 },     // C6
    { freq: 1318.5, time: 0.08, duration: 0.14 },  // E6
    { freq: 1567.98, time: 0.16, duration: 0.28 }, // G6
  ];

  const now = ctx.currentTime;
  notes.forEach(({ freq, time, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + time);

    gain.gain.setValueAtTime(0.0001, now + time);
    gain.gain.exponentialRampToValueAtTime(0.12, now + time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + duration);
  });
}

/**
 * Cartoonish slide-down whoosh/exit whistle
 */
export function playExitSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(950, now);
  // Slide down frequency
  osc.frequency.exponentialRampToValueAtTime(280, now + 0.32);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.13, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.36);

  // Soft secondary pop at the bottom
  const popOsc = ctx.createOscillator();
  const popGain = ctx.createGain();
  popOsc.type = 'triangle';
  popOsc.frequency.setValueAtTime(260, now + 0.22);
  popOsc.frequency.exponentialRampToValueAtTime(140, now + 0.35);

  popGain.gain.setValueAtTime(0.0001, now + 0.22);
  popGain.gain.linearRampToValueAtTime(0.09, now + 0.25);
  popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

  popOsc.connect(popGain);
  popGain.connect(ctx.destination);

  popOsc.start(now + 0.22);
  popOsc.stop(now + 0.37);
}

/**
 * Cute dialogue / message bubble chirp
 */
export function playMessageSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  // Quick upward chirp
  osc.frequency.setValueAtTime(580, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.09, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.13);
}

/**
 * Feminine, sweet, and cute melodic anime sparkle / chime when tapped or clicked
 */
export function playTapSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Primary sweet tone (cute ascending cheerful anime chirp: D6 -> A6 -> G6)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(1174.66, now); // D6
  osc1.frequency.exponentialRampToValueAtTime(1760.0, now + 0.08); // A6
  osc1.frequency.exponentialRampToValueAtTime(1567.98, now + 0.2); // G6 gentle settle

  gain1.gain.setValueAtTime(0.0001, now);
  gain1.gain.linearRampToValueAtTime(0.13, now + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.26);

  // Secondary soft sparkle (high airy bell overtone: C7 -> E7)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(2093.0, now + 0.03); // C7
  osc2.frequency.exponentialRampToValueAtTime(2637.0, now + 0.1); // E7

  gain2.gain.setValueAtTime(0.0001, now + 0.03);
  gain2.gain.linearRampToValueAtTime(0.07, now + 0.06);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.03);
  osc2.stop(now + 0.27);
}

/**
 * Satisfying crisp chime when opening server modal from bubble
 */
export function playBubbleClickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.23);
}

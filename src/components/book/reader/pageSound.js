// Authentic studio-recorded physical book page turn sound engine.
// Combines pre-decoded Web Audio buffers for instant 0ms latency with
// natural acoustic variations and organic micro-pitch variations.

const SOUND_FILES = [
  '/sounds/page-flip-1.mp3',
  '/sounds/page-flip-2.mp3',
  '/sounds/page-flip-3.mp3',
];

let audioCtx = null;
const audioBuffers = [];
let audioPool = [];
let currentVariation = 0;
let isUnlocked = false;
let lastPlayTime = 0;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

// Pre-load and decode audio into in-memory Web Audio buffers
async function loadAudioBuffers() {
  const ctx = getAudioContext();
  if (!ctx || audioBuffers.length > 0) return;

  SOUND_FILES.forEach(async (url, idx) => {
    try {
      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();
      ctx.decodeAudioData(arrayBuffer, (decoded) => {
        audioBuffers[idx] = decoded;
      }, () => {});
    } catch {
      // Fallback handled by audioPool
    }
  });
}

function buildAudioPool() {
  if (audioPool.length > 0 || typeof Audio === 'undefined') return;
  try {
    SOUND_FILES.forEach((src) => {
      for (let i = 0; i < 2; i++) {
        const a = new Audio(src);
        a.preload = 'auto';
        audioPool.push({ audio: a, src });
      }
    });
  } catch {
    /* fallback to dynamic creation */
  }
}

/** Pre-warms audio context and pool on the very first user interaction */
export function unlockAudio() {
  if (isUnlocked) return;
  isUnlocked = true;

  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    loadAudioBuffers();
    buildAudioPool();

    // Trigger zero-volume playback to unblock mobile Safari audio autoplay
    if (audioPool.length > 0) {
      const first = audioPool[0].audio;
      first.volume = 0.001;
      const p = first.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          first.pause();
          first.currentTime = 0;
        }).catch(() => {});
      }
    }
  } catch {
    /* ignore */
  }
}

/** Plays an authentic, crisp physical book page turn sound */
export function playFlipSound(volume = 0.85) {
  try {
    const now = performance.now();
    // Strict debounce: a page turn takes ~400ms, prevent double-firing
    if (now - lastPlayTime < 340) return;
    lastPlayTime = now;

    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const varIdx = currentVariation % SOUND_FILES.length;
    currentVariation = (currentVariation + 1) % SOUND_FILES.length;

    // Prefer high-fidelity Web Audio API buffer with instant zero-delay playback
    const buffer = audioBuffers[varIdx];
    if (ctx && buffer && ctx.state === 'running') {
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // Subtle organic pitch shift (+/- 3%) so consecutive flips feel physical & unique
      const microPitch = 0.97 + Math.random() * 0.06;
      source.playbackRate.setValueAtTime(microPitch, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0.1, Math.min(1, volume)), ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
      return;
    }

    // HTML5 Audio fallback
    buildAudioPool();
    const selectedSrc = SOUND_FILES[varIdx];
    const available = audioPool.find((item) => item.src === selectedSrc && item.audio.paused) ||
      audioPool.find((item) => item.src === selectedSrc) ||
      audioPool[0];

    if (available && available.audio) {
      const sound = available.audio;
      sound.volume = Math.max(0, Math.min(1, volume));
      sound.currentTime = 0;
      sound.play().catch(() => {});
    } else {
      const fresh = new Audio(selectedSrc);
      fresh.volume = Math.max(0, Math.min(1, volume));
      fresh.play().catch(() => {});
    }
  } catch {
    /* best effort */
  }
}

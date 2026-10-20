export type GameSound = 'click' | 'deal' | 'cards' | 'chips' | 'check' | 'fold' | 'turn' | 'win' | 'splitWin';
export type SoundSettings = { enabled: boolean; volume: number };
const STORAGE_KEY = 'omaha-game-sounds';
const defaults: SoundSettings = { enabled: true, volume: 0.5 };

function readSettings(): SoundSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      enabled: typeof saved.enabled === 'boolean' ? saved.enabled : defaults.enabled,
      volume: typeof saved.volume === 'number' && Number.isFinite(saved.volume)
        ? Math.min(1, Math.max(0, saved.volume)) : defaults.volume,
    };
  } catch { return defaults; }
}

let settings = readSettings();
let context: AudioContext | undefined;
let master: GainNode | undefined;
let ducked = false;
let generation = 0;
const listeners = new Set<() => void>();
const sources = new Set<AudioScheduledSourceNode>();
export const getSoundSettings = () => settings;
export const subscribeSoundSettings = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

function updateGain() {
  if (master && context) master.gain.setValueAtTime(
    settings.enabled ? settings.volume * (ducked ? 0.3 : 1) : 0, context.currentTime,
  );
}

export function stopSounds() {
  generation++;
  for (const source of sources) { try { source.stop(); } catch { /* already ended */ } }
  sources.clear();
}

export function setSoundSettings(patch: Partial<SoundSettings>) {
  settings = { ...settings, ...patch };
  settings.volume = Number.isFinite(settings.volume) ? Math.min(1, Math.max(0, settings.volume)) : defaults.volume;
  if (!settings.enabled || settings.volume === 0) stopSounds();
  updateGain();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* private browsing */ }
  listeners.forEach(listener => listener());
}

export function setSoundsDucked(value: boolean) {
  ducked = value;
  updateGain();
}

/** Called only from a user gesture. Never queue old game events behind autoplay. */
export async function unlockSounds() {
  if (!settings.enabled || settings.volume === 0) return;
  try {
    if (!context || context.state === 'closed') {
      context = new AudioContext();
      master = context.createGain();
      master.connect(context.destination);
      updateGain();
    }
    if (context.state !== 'running') await context.resume();
  } catch { /* Audio is optional; controls must keep working. */ }
}

function attach(source: AudioScheduledSourceNode, gain: GainNode, start: number, duration: number) {
  source.connect(gain);
  gain.connect(master!);
  sources.add(source);
  source.onended = () => { sources.delete(source); source.disconnect(); gain.disconnect(); };
  source.start(start);
  source.stop(start + duration);
}

function tone(at: number, frequency: number, end: number, duration: number, volume: number) {
  const oscillator = context!.createOscillator();
  const gain = context!.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, at);
  oscillator.frequency.exponentialRampToValueAtTime(end, at + duration);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration - 0.003);
  gain.gain.linearRampToValueAtTime(0, at + duration);
  attach(oscillator, gain, at, duration);
}

function rustle(at: number, duration: number, volume: number) {
  const buffer = context!.createBuffer(1, Math.ceil(context!.sampleRate * duration), context!.sampleRate);
  const samples = buffer.getChannelData(0);
  // Smoothed noise gives cards a soft, papery texture without a sharp hiss.
  let sample = 0;
  for (let i = 0; i < samples.length; i++) samples[i] = sample = sample * 0.6 + (Math.random() * 2 - 1) * 0.4;
  const source = context!.createBufferSource();
  source.buffer = buffer;
  const gain = context!.createGain();
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  attach(source, gain, at, duration);
}

export async function playSound(sound: GameSound, gesture = false, delay = 0) {
  const currentGeneration = generation;
  if (gesture) await unlockSounds();
  if (!settings.enabled || settings.volume === 0 || document.hidden || context?.state !== 'running'
    || currentGeneration !== generation) return;
  try {
    const at = context.currentTime + delay;
    switch (sound) {
      case 'click': tone(at, 850, 350, 0.022, 0.036); break;
      case 'check': tone(at, 420, 230, 0.045, 0.045); break;
      case 'fold': rustle(at, 0.075, 0.045); break;
      case 'deal':
        for (let i = 0; i < 4; i++) rustle(at + i * 0.065, 0.05, 0.055);
        break;
      case 'cards': rustle(at, 0.11, 0.065); break;
      case 'chips':
        tone(at, 1800, 1200, 0.035, 0.025);
        tone(at + 0.035, 1400, 950, 0.045, 0.022);
        break;
      case 'turn':
        tone(at, 660, 660, 0.13, 0.05);
        tone(at + 0.1, 880, 880, 0.16, 0.04);
        break;
      case 'win':
        [523, 659, 784].forEach((frequency, i) => tone(at + i * 0.09, frequency, frequency, 0.24, 0.04));
        break;
      case 'splitWin':
        [523, 659].forEach((frequency, i) => tone(at + i * 0.08, frequency, frequency, 0.18, 0.03));
        break;
    }
  } catch { /* Unsupported or interrupted audio must not affect the game. */ }
}

export function installSoundLifecycle() {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    settings = readSettings();
    if (!settings.enabled || settings.volume === 0) stopSounds();
    updateGain();
    listeners.forEach(listener => listener());
  };
  const onVisibility = () => { if (document.hidden) stopSounds(); };
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVisibility);
    stopSounds();
    if (context) void context.close().catch(() => {});
    context = undefined;
    master = undefined;
  };
}

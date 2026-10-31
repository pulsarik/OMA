import { useCallback, useEffect, useRef, useState } from 'react';
import { canPresentCommentary, CommentaryLocale, CommentaryMessage, CommentaryMode, CommentaryState, readCommentary } from './protocol';

function savedSettings(): { mode: CommentaryMode; locale: CommentaryLocale; volume: number } {
  try {
    const saved = JSON.parse(localStorage.getItem('omaha-commentary') || '{}');
    return { mode: ['off', 'text', 'voice'].includes(saved.mode) ? saved.mode : 'off',
      locale: saved.locale === 'ru' ? 'ru' : 'en',
      volume: typeof saved.volume === 'number' && Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : 0.65 };
  } catch { return { mode: 'off', locale: 'en', volume: 0.65 }; }
}

export function useCommentary(handId: string, serverUrl: string, featureEnabled = true) {
  const [settings, setSettings] = useState(savedSettings);
  const [availability, setAvailability] = useState({ enabled: false, voiceEnabled: false });
  const [pending, setPending] = useState<(CommentaryMessage & { localExpiry: number }) | null>(null);
  const [state, setState] = useState<CommentaryState | null>(null);
  const [humanSpeaking, setHumanSpeaking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const seen = useRef(new Set<string>());
  const attempted = useRef('');
  const audio = useRef<HTMLAudioElement | null>(null);
  const humanSpeakingRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const disconnected = useCallback(() => {
    audio.current?.pause(); setPending(null); setBlocked(false); socketRef.current = null;
  }, []);
  const updateHumanSpeaking = useCallback((value: boolean) => {
    humanSpeakingRef.current = value;
    setHumanSpeaking(value);
  }, []);
  const interrupt = useCallback(() => {
    audio.current?.pause();
    setPending(null); setSpeaking(false); setBlocked(false);
  }, []);

  function subscribe(socket: WebSocket) {
    if (!featureEnabled) return;
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({
      action: 'commentary_preferences', preference: { mode: settingsRef.current.mode, locale: settingsRef.current.locale },
    }));
  }

  function onMessage(message: any, socket: WebSocket) {
    if (!featureEnabled) return;
    if (message.type === 'player_state' && message.data?.handId === handId) {
      socketRef.current = socket;
      setAvailability({ enabled: message.data.commentary?.enabled === true, voiceEnabled: message.data.commentary?.voiceEnabled === true });
      setState({ handId, partyId: message.data.partyId, revision: message.data.revision, stage: message.data.stage });
      if (message.data.commentary?.enabled) subscribe(socket);
    }
    if (message.type !== 'commentary_ready' || settingsRef.current.mode === 'off') return;
    const value = readCommentary(message.data, handId, settingsRef.current.locale);
    if (!value || seen.current.has(value.id)) return;
    seen.current.add(value.id);
    if (seen.current.size > 200) seen.current.delete(seen.current.values().next().value!);
    // Keep the caption and pending audio while someone is talking. Playback
    // waits below until the human speaker stops.
    if (document.hidden) return;
    setBlocked(false);
    setPending({ ...value, localExpiry: Date.now() + value.expiresAt - value.serverNow });
  }

  useEffect(() => {
    try { localStorage.setItem('omaha-commentary', JSON.stringify(settings)); } catch { /* private browsing */ }
    if (featureEnabled && socketRef.current) subscribe(socketRef.current);
  }, [featureEnabled, settings]);

  useEffect(() => {
    setPending(null); setBlocked(false);
    audio.current?.pause();
  }, [handId, settings.mode, settings.locale]);

  useEffect(() => {
    const hide = () => { if (document.hidden) { audio.current?.pause(); setPending(null); } };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); audio.current?.pause(); };
  }, []);

  useEffect(() => {
    if (!pending) return;
    // The event deadline limits the start of playback, not the end of a spoken sentence.
    // Still bound a broken/stalled audio element; hand changes and human speech interrupt immediately.
    const expiry = pending.localExpiry + (speaking ? 15_000 : 0);
    const timer = window.setTimeout(() => setPending(null), Math.max(0, expiry - Date.now()));
    return () => window.clearTimeout(timer);
  }, [pending, speaking]);

  const present = featureEnabled && pending && pending.locale === settings.locale && pending.handId === handId
    && canPresentCommentary(pending, state) && availability.enabled && settings.mode !== 'off' ? pending : null;

  useEffect(() => {
    if (!present?.audioUrl || settings.mode !== 'voice' || !availability.voiceEnabled
      || humanSpeaking || document.hidden || attempted.current === present.id) return;
    let cancelled = false;
    let release: (() => void) | undefined;
    const player = new Audio(`${serverUrl.replace(/\/$/, '')}${present.audioUrl}`);
    player.volume = settingsRef.current.volume;
    audio.current = player;
    const play = async () => {
      if (cancelled || Date.now() >= present.localExpiry) { release?.(); return; }
      attempted.current = present.id;
      try { await player.play(); if (!cancelled) { setSpeaking(true); setBlocked(false); } }
      catch { if (!cancelled) setBlocked(true); release?.(); }
    };
    const finished = () => { setSpeaking(false); release?.(); };
    player.onended = finished;
    player.onerror = finished;
    // Hold a same-origin Web Lock for the duration of audio, so duplicate tabs stay quiet.
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      if (navigator.locks) {
        void navigator.locks.request(`omaha-commentary:${present.partyId}`, { ifAvailable: true }, async lock => {
          if (!lock || cancelled) return;
          await new Promise<void>(resolve => { release = resolve; void play(); });
        });
      } else { void play(); }
    }, 250);
    return () => {
      cancelled = true; window.clearTimeout(timer); player.pause(); player.onended = null; player.onerror = null;
      release?.(); setSpeaking(false);
    };
  }, [present, settings.mode, humanSpeaking, availability.voiceEnabled, serverUrl]);

  useEffect(() => { if (audio.current) audio.current.volume = settings.volume; }, [settings.volume]);

  return { ...settings, ...availability, speaking, blocked, text: present?.text ?? '', onMessage,
    setHumanSpeaking: updateHumanSpeaking, interrupt, disconnected,
    setMode: (mode: CommentaryMode) => setSettings(s => ({ ...s, mode })),
    setLocale: (locale: CommentaryLocale) => setSettings(s => ({ ...s, locale })),
    setVolume: (volume: number) => setSettings(s => ({ ...s, volume })),
    retryAudio: () => {
      // Call play directly inside the user gesture (important on mobile Safari).
      if (!audio.current || humanSpeaking || !present || Date.now() >= present.localExpiry) return;
      void audio.current.play().then(() => { setBlocked(false); setSpeaking(true); }).catch(() => setBlocked(true));
    },
  };
}

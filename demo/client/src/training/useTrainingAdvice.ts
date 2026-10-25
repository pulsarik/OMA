import { useEffect, useRef, useState } from 'react';
import { parseTrainingAdvice, type Advice } from './protocol';

type TurnState = {
  handId: string;
  revision: number;
  playerId: string;
  currentPlayerId?: string;
  stage: string;
  folded: boolean;
  turnDeadline?: number;
  turnDurationMs?: number;
  players: Array<{ isBot?: boolean }>;
};

function savedEnabled() {
  try { return localStorage.getItem('omaha-training-advice') !== 'off'; }
  catch { return true; }
}

export function useTrainingAdvice(handId: string, player: TurnState | null, locale: 'en' | 'ru',
  onAdviceStart: () => void, onSpeakingChange: (speaking: boolean) => void) {
  const [enabled, setEnabledState] = useState(savedEnabled);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const playerRef = useRef(player);
  const enabledRef = useRef(enabled);
  const requestedRef = useRef('');
  playerRef.current = player;
  enabledRef.current = enabled;
  const available = Boolean(player?.players.some(candidate => candidate.isBot));
  const turnKey = player && player.currentPlayerId === player.playerId && player.stage !== 'showdown'
    ? `${player.handId}:${player.stage}:${player.currentPlayerId}:${player.turnDeadline ?? player.revision}`
    : '';
  const requestKey = turnKey ? `${turnKey}:${locale}` : '';

  const setEnabled = (next: boolean) => {
    setEnabledState(next);
    try { localStorage.setItem('omaha-training-advice', next ? 'on' : 'off'); } catch { /* private browsing */ }
    if (!next) setAdvice(null);
  };

  function onMessage(message: any, socket: WebSocket) {
    if (message.type === 'player_state' && message.data?.handId === handId) socketRef.current = socket;
    if (message.type !== 'training_advice' || !enabledRef.current) return;
    const value = parseTrainingAdvice(message.data);
    const current = playerRef.current;
    if (!value || !current || value.handId !== current.handId || value.playerId !== current.playerId
      || value.stage !== current.stage || value.revision !== current.revision || value.locale !== locale
      || current.currentPlayerId !== current.playerId) return;
    onAdviceStart();
    setAdvice(value);
  }

  useEffect(() => {
    setAdvice(null);
    if (!enabled || !available || !turnKey || !player || player.folded) return undefined;
    const elapsed = typeof player.turnDeadline === 'number' && typeof player.turnDurationMs === 'number'
      ? player.turnDurationMs - (player.turnDeadline - Date.now())
      : 0;
    const timer = window.setTimeout(() => {
      const socket = socketRef.current;
      if (requestedRef.current === requestKey || !socket || socket.readyState !== WebSocket.OPEN) return;
      requestedRef.current = requestKey;
      socket.send(JSON.stringify({ action: 'training_advice', locale }));
    }, Math.max(0, 10_000 - elapsed));
    return () => window.clearTimeout(timer);
  }, [available, enabled, locale, player?.folded, player?.turnDeadline, player?.turnDurationMs, requestKey, turnKey]);

  useEffect(() => {
    if (!enabled || !advice || document.hidden || !('speechSynthesis' in window)) return undefined;
    const utterance = new SpeechSynthesisUtterance(advice.text);
    utterance.lang = locale === 'ru' ? 'ru-RU' : 'en-US';
    utterance.rate = 1.08;
    utterance.onend = () => onSpeakingChange(false);
    utterance.onerror = () => onSpeakingChange(false);
    onSpeakingChange(true);
    try { window.speechSynthesis.speak(utterance); }
    catch { onSpeakingChange(false); }
    return () => {
      if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
      onSpeakingChange(false);
    };
  }, [advice, enabled, locale, onSpeakingChange]);

  useEffect(() => { setAdvice(null); }, [handId, turnKey]);

  return { enabled, available, advice, setEnabled, onMessage };
}

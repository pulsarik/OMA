import { useEffect, useRef, useState } from 'react';

type Advice = {
  handId: string;
  revision: number;
  playerId: string;
  stage: string;
  move: 'fold' | 'check' | 'call' | 'bet' | 'raise';
  amount?: number;
  text: string;
};

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

export function useTrainingAdvice(handId: string, player: TurnState | null, locale: 'en' | 'ru') {
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

  const setEnabled = (next: boolean) => {
    setEnabledState(next);
    try { localStorage.setItem('omaha-training-advice', next ? 'on' : 'off'); } catch { /* private browsing */ }
    if (!next) setAdvice(null);
  };

  function onMessage(message: any, socket: WebSocket) {
    if (message.type === 'player_state' && message.data?.handId === handId) socketRef.current = socket;
    if (message.type !== 'training_advice' || !enabledRef.current) return;
    const value = message.data as Advice;
    const current = playerRef.current;
    if (!current || value.handId !== current.handId || value.playerId !== current.playerId
      || value.stage !== current.stage || value.revision !== current.revision
      || current.currentPlayerId !== current.playerId) return;
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
      if (requestedRef.current === turnKey || !socket || socket.readyState !== WebSocket.OPEN) return;
      requestedRef.current = turnKey;
      socket.send(JSON.stringify({ action: 'training_advice', locale }));
    }, Math.max(0, 10_000 - elapsed));
    return () => window.clearTimeout(timer);
  }, [available, enabled, locale, player?.folded, player?.turnDeadline, player?.turnDurationMs, turnKey]);

  useEffect(() => {
    if (!enabled || !advice || document.hidden || !('speechSynthesis' in window)) return undefined;
    const utterance = new SpeechSynthesisUtterance(advice.text);
    utterance.lang = locale === 'ru' ? 'ru-RU' : 'en-US';
    utterance.rate = 1.08;
    window.speechSynthesis.speak(utterance);
    return () => {
      if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    };
  }, [advice, enabled, locale]);

  useEffect(() => { setAdvice(null); }, [handId, turnKey]);

  return { enabled, available, advice, setEnabled, onMessage };
}

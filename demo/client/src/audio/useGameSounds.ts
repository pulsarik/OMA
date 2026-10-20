import { useEffect, useRef } from 'react';
import { gameSoundEvents, openingSounds, type SoundState } from './gameSoundEvents';
import { playSound, setSoundsDucked } from './sounds';

export function useGameSounds(handId: string, speaking: boolean) {
  const previous = useRef<SoundState | null>(null);
  const lastSocket = useRef<WebSocket | null>(null);
  useEffect(() => {
    setSoundsDucked(speaking);
    return () => setSoundsDucked(false);
  }, [speaking]);

  return (message: { type: string; data?: SoundState }, socket: WebSocket) => {
    const next = message.data;
    if (message.type !== 'player_state' || !next || next.handId !== handId) return;
    const synchronizing = lastSocket.current !== socket;
    lastSocket.current = socket;
    const before = previous.current;
    if (before?.handId === next.handId && next.revision <= before.revision) return;
    previous.current = next;
    let sounds = before && !synchronizing ? gameSoundEvents(before, next) : [];
    // The first fresh deal may arrive after navigation. Reloads and reconnections
    // establish a silent baseline instead of replaying missed actions or winnings.
    const key = `omaha-sound-hand:${next.partyId}:${next.playerId}`;
    try {
      const seenHand = sessionStorage.getItem(key);
      sessionStorage.setItem(key, next.handId);
      if (!before && seenHand !== next.handId) sounds = openingSounds(next);
    } catch { /* Without storage, prefer a silent initial snapshot. */ }
    sounds.forEach((sound, index) => { void playSound(sound, false, index * 0.14); });
  };
}

import React, { useEffect, useRef, useState } from 'react';
import { Participant, RemoteTrack, Room, RoomEvent, Track } from 'livekit-client';

export type VoiceChatLabels = {
  title: string;
  join: string;
  joining: string;
  leave: string;
  microphoneOn: string;
  microphoneOff: string;
  soundOn: string;
  soundOff: string;
  connected: string;
  participant: string;
  participants: string;
  speaking: string;
  genericError: string;
};

type VoiceChatProps = {
  endpoint: string;
  handId: string;
  playerId: string;
  playerToken: string;
  labels: VoiceChatLabels;
};

type VoiceStatus = 'idle' | 'connecting' | 'connected';

export function VoiceChat({
  endpoint,
  handId,
  playerId,
  playerToken,
  labels,
}: VoiceChatProps) {
  const roomRef = useRef<Room | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);
  const soundEnabledRef = useRef(true);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function removeAttachedAudio(track: RemoteTrack) {
    track.detach().forEach(element => element.remove());
  }

  async function leave() {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      room.removeAllListeners();
      await room.disconnect();
    }
    audioContainerRef.current?.replaceChildren();
    if (!mountedRef.current) return;
    soundEnabledRef.current = true;
    setStatus('idle');
    setMicrophoneEnabled(false);
    setSoundEnabled(true);
    setParticipantCount(0);
    setSpeakers([]);
  }

  useEffect(() => () => {
    mountedRef.current = false;
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      room.removeAllListeners();
      void room.disconnect();
    }
  }, []);

  async function join() {
    if (status !== 'idle') return;
    setStatus('connecting');
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ handId, playerId, token: playerToken }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || labels.genericError);
      if (typeof data.serverUrl !== 'string' || typeof data.token !== 'string') {
        throw new Error(labels.genericError);
      }

      const room = new Room({ adaptiveStream: true });
      roomRef.current = room;
      const updateParticipantCount = () => {
        if (mountedRef.current) setParticipantCount(room.remoteParticipants.size + 1);
      };
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        participant.setVolume(soundEnabledRef.current ? 1 : 0);
        updateParticipantCount();
      });
      room.on(RoomEvent.ParticipantDisconnected, updateParticipantCount);
      room.on(RoomEvent.ActiveSpeakersChanged, (activeSpeakers: Participant[]) => {
        if (!mountedRef.current) return;
        setSpeakers(activeSpeakers.map(speaker => speaker.name || speaker.identity).slice(0, 3));
      });
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;
        const element = track.attach();
        element.autoplay = true;
        audioContainerRef.current?.appendChild(element);
      });
      room.on(RoomEvent.TrackUnsubscribed, removeAttachedAudio);
      room.on(RoomEvent.Disconnected, () => {
        if (!mountedRef.current || roomRef.current !== room) return;
        roomRef.current = null;
        setStatus('idle');
        setMicrophoneEnabled(false);
        setParticipantCount(0);
        setSpeakers([]);
      });

      await room.connect(data.serverUrl, data.token);
      await room.startAudio();
      if (!mountedRef.current || roomRef.current !== room) {
        await room.disconnect();
        return;
      }
      setParticipantCount(room.remoteParticipants.size + 1);
      setStatus('connected');
    } catch (caught) {
      const failedRoom = roomRef.current;
      roomRef.current = null;
      if (failedRoom) {
        failedRoom.removeAllListeners();
        await failedRoom.disconnect();
      }
      if (!mountedRef.current) return;
      setStatus('idle');
      setError(caught instanceof Error ? caught.message : labels.genericError);
    }
  }

  async function toggleMicrophone() {
    const room = roomRef.current;
    if (!room) return;
    setError(null);
    try {
      const enabled = !room.localParticipant.isMicrophoneEnabled;
      await room.localParticipant.setMicrophoneEnabled(enabled);
      if (mountedRef.current) setMicrophoneEnabled(room.localParticipant.isMicrophoneEnabled);
    } catch (caught) {
      if (mountedRef.current) {
        setError(caught instanceof Error ? caught.message : labels.genericError);
      }
    }
  }

  function toggleSound() {
    const room = roomRef.current;
    if (!room) return;
    const enabled = !soundEnabled;
    soundEnabledRef.current = enabled;
    room.remoteParticipants.forEach(participant => participant.setVolume(enabled ? 1 : 0));
    setSoundEnabled(enabled);
  }

  const participantLabel = participantCount === 1 ? labels.participant : labels.participants;

  return (
    <aside
      data-testid="voice-chat"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexWrap: 'wrap',
        margin: '8px 0',
        padding: '8px 10px',
        border: '1px solid #cbd5e1',
        borderRadius: 12,
        background: '#f8fafc',
        fontSize: 12,
      }}
    >
      <div style={{ display: 'grid', gap: 2 }}>
        <strong>{labels.title}</strong>
        {status === 'connected' ? (
          <span>
            {labels.connected} · {participantCount} {participantLabel}
            {speakers.length ? ` · ${labels.speaking}: ${speakers.join(', ')}` : ''}
          </span>
        ) : null}
        {error ? <span role="alert" style={{ color: '#b91c1c' }}>{error}</span> : null}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {status === 'idle' ? (
          <button type="button" onClick={join}>{labels.join}</button>
        ) : status === 'connecting' ? (
          <button type="button" disabled>{labels.joining}</button>
        ) : (
          <>
            <button type="button" aria-pressed={microphoneEnabled} onClick={toggleMicrophone}>
              {microphoneEnabled ? labels.microphoneOn : labels.microphoneOff}
            </button>
            <button type="button" aria-pressed={!soundEnabled} onClick={toggleSound}>
              {soundEnabled ? labels.soundOn : labels.soundOff}
            </button>
            <button type="button" onClick={() => void leave()}>{labels.leave}</button>
          </>
        )}
      </div>
      <div ref={audioContainerRef} hidden aria-hidden="true" />
    </aside>
  );
}

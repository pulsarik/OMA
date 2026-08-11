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
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
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
    setStatus('idle');
    setMicrophoneEnabled(false);
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
        participant.setVolume(1);
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
      await room.localParticipant.setMicrophoneEnabled(false);
      room.remoteParticipants.forEach(participant => participant.setVolume(1));
      setParticipantCount(room.remoteParticipants.size + 1);
      setStatus('connected');
      setMicrophoneEnabled(room.localParticipant.isMicrophoneEnabled);
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

  const participantLabel = participantCount === 1 ? labels.participant : labels.participants;

  return (
    <aside className="voice-chat" data-testid="voice-chat">
      <div className="voice-chat__info">
        <strong className="voice-chat__title"><span aria-hidden="true">🎙</span>{labels.title}</strong>
        {status === 'connected' ? (
          <span className="voice-chat__status">
            <span className="voice-chat__status-dot" aria-hidden="true" />
            {labels.connected} · {participantCount} {participantLabel}
            {speakers.length ? ` · ${labels.speaking}: ${speakers.join(', ')}` : ''}
          </span>
        ) : null}
        {error ? <span className="voice-chat__error" role="alert">{error}</span> : null}
      </div>
      <div className="voice-chat__actions">
        {status !== 'connected' ? (
          <button className="voice-chat__button voice-chat__button--primary" type="button" onClick={join} disabled={status !== 'idle'}>
            {status === 'idle' ? labels.join : labels.joining}
          </button>
        ) : (
          <>
            <button
              className="voice-chat__button voice-chat__button--icon"
              type="button"
              aria-pressed={microphoneEnabled}
              aria-label={microphoneEnabled ? labels.microphoneOn : labels.microphoneOff}
              title={microphoneEnabled ? labels.microphoneOn : labels.microphoneOff}
              onClick={toggleMicrophone}
            >
              <span aria-hidden="true">{microphoneEnabled ? '🎙' : '🔇'}</span>
            </button>
            <button className="voice-chat__button" type="button" onClick={() => void leave()}>{labels.leave}</button>
          </>
        )}
      </div>
      <div ref={audioContainerRef} hidden aria-hidden="true" />
    </aside>
  );
}

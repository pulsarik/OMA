import { AccessToken, TrackSource } from 'livekit-server-sdk';

export type VoiceConfig = {
  serverUrl: string;
  apiKey: string;
  apiSecret: string;
};

export type VoiceParticipant = {
  partyId: string;
  playerId: string;
  playerName: string;
};

export function voiceConfigFromEnv(env: NodeJS.ProcessEnv = process.env): VoiceConfig | undefined {
  const serverUrl = env.LIVEKIT_URL?.trim();
  const apiKey = env.LIVEKIT_API_KEY?.trim();
  const apiSecret = env.LIVEKIT_API_SECRET?.trim();
  if (!serverUrl || !apiKey || !apiSecret) return undefined;
  return { serverUrl, apiKey, apiSecret };
}

export function voiceRoomName(partyId: string) {
  return `omaha-${partyId}`;
}

export async function createVoiceJoinToken(
  config: VoiceConfig,
  participant: VoiceParticipant,
) {
  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: participant.playerId,
    name: participant.playerName,
    ttl: '10m',
    metadata: JSON.stringify({
      partyId: participant.partyId,
      playerId: participant.playerId,
    }),
  });
  token.addGrant({
    roomJoin: true,
    room: voiceRoomName(participant.partyId),
    canSubscribe: true,
    canPublish: true,
    canPublishData: false,
    canPublishSources: [TrackSource.MICROPHONE],
  });

  return {
    serverUrl: config.serverUrl,
    token: await token.toJwt(),
  };
}

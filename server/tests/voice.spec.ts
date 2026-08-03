import { TokenVerifier } from 'livekit-server-sdk';
import {
  createVoiceJoinToken,
  voiceConfigFromEnv,
  voiceRoomName,
} from '../src/voice';

describe('voice chat tokens', () => {
  test('stays disabled until every LiveKit setting is present', () => {
    expect(voiceConfigFromEnv({})).toBeUndefined();
    expect(voiceConfigFromEnv({ LIVEKIT_URL: 'wss://example.livekit.cloud' })).toBeUndefined();
    expect(voiceConfigFromEnv({
      LIVEKIT_URL: ' wss://example.livekit.cloud ',
      LIVEKIT_API_KEY: ' key ',
      LIVEKIT_API_SECRET: ' secret ',
    })).toEqual({
      serverUrl: 'wss://example.livekit.cloud',
      apiKey: 'key',
      apiSecret: 'secret',
    });
  });

  test('grants one player microphone-only access to the party room', async () => {
    const config = {
      serverUrl: 'wss://example.livekit.cloud',
      apiKey: 'test-key',
      apiSecret: 'a-test-secret-that-is-long-enough-for-signing',
    };
    const result = await createVoiceJoinToken(config, {
      partyId: 'party-1',
      playerId: 'P1',
      playerName: 'Dima',
    });
    const claims = await new TokenVerifier(config.apiKey, config.apiSecret).verify(result.token);

    expect(result.serverUrl).toBe(config.serverUrl);
    expect(claims.sub).toBe('P1');
    expect(claims.name).toBe('Dima');
    expect(claims.video).toMatchObject({
      roomJoin: true,
      room: voiceRoomName('party-1'),
      canSubscribe: true,
      canPublish: true,
      canPublishData: false,
      canPublishSources: ['microphone'],
    });
  });
});

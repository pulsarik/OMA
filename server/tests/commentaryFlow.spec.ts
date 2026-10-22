import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { WebSocket } from 'ws';

// Real server + SQLite + authenticated sockets. Only the external providers are replaced.
test.each(['result', 'betting'])('%s moves publish shared commentary; reconnect and repeated commands do not regenerate', async kind => {
  let child: ChildProcess | undefined;
  let serverLog = '';
  const sockets: WebSocket[] = [];
  const preload = `
    const auth = require('google-auth-library');
    auth.GoogleAuth.prototype.getAccessToken = async () => 'test-google-token';
    global.fetch = async (url, options) => {
      if (url === 'https://api.groq.com/openai/v1/chat/completions') {
        const request = JSON.parse(options.body);
        const facts = JSON.parse(request.messages[1].content).facts;
        const player = facts.find(f => f.player)?.player;
        return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: {
          content: JSON.stringify({ speak: true,
            text: player + (facts[0].kind === 'reraised' ? ' raises again.' : ' wins the hand.'), factIds: [facts[0].id] })
        }}], usage: { total_tokens: 400 } }) };
      }
      if (url === 'https://texttospeech.googleapis.com/v1/text:synthesize') {
        return { ok: true, json: async () => ({ audioContent: Buffer.from('test audio').toString('base64') }) };
      }
      throw new Error('Unexpected external request');
    };
    require('ts-node/register/transpile-only');
    require('./src/index.ts');
  `;
  const connect = async (port: number) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    sockets.push(ws);
    const messages: any[] = [];
    ws.on('message', data => messages.push(JSON.parse(data.toString())));
    await new Promise<void>((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
    const waitFor = async (type: string) => {
      for (let i = 0; i < 100; i++) {
        const index = messages.findIndex(m => m.type === type);
        if (index !== -1) return messages.splice(index, 1)[0];
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new Error(`Missing ${type}: ${JSON.stringify(messages)}`);
    };
    return { ws, messages, waitFor, send: (data: unknown) => ws.send(JSON.stringify(data)) };
  };
  try {
    // Reserve a port in the test, not in the user's running server.
    const net = await import('net');
    const probe = net.createServer();
    await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
    const port = (probe.address() as import('net').AddressInfo).port;
    await new Promise<void>(resolve => probe.close(() => resolve()));
    child = spawn(process.execPath, ['-e', preload], { cwd: path.resolve(__dirname, '..'), windowsHide: true,
      env: { ...process.env, PORT: String(port), DATA_FILE: ':memory:', COMMENTARY_ENABLED: 'true',
        GROQ_API_KEY: 'test', COMMENTARY_GOOGLE_TTS: 'true', COMMENTARY_COOLDOWN_SECONDS: '1',
        HUMAN_TURN_MS: '60000' }, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout!.on('data', data => { serverLog += String(data); });
    child.stderr!.on('data', data => { serverLog += String(data); });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server did not start')), 10_000);
      child!.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}`)); });
      child!.stdout!.on('data', data => { if (String(data).includes('Server listening')) { clearTimeout(timer); resolve(); } });
    });
    const host = await connect(port);
    host.send({ action: 'deal', players: 2, playerNames: ['Anna', 'Ivan'] });
    const dealt = (await host.waitFor('hand_dealt')).data;
    const credentials = (link: any) => {
      const segments = link.url.split('/');
      return { handId: segments[2], playerId: segments[3], token: segments[4] };
    };
    const first = credentials(dealt.playerLinks[0]);
    const second = credentials(dealt.playerLinks[1]);
    host.send({ action: 'join_player', ...first });
    expect((await host.waitFor('player_state')).data.commentary.enabled).toBe(true);
    const guest = await connect(port);
    guest.send({ action: 'join_player', ...second }); await guest.waitFor('player_state');
    for (const client of [host, guest]) {
      client.send({ action: 'commentary_preferences', preference: { mode: 'voice', locale: 'en' } });
      client.send({ action: 'client_ping' }); await client.waitFor('server_pong');
    }
    let mover = dealt.currentPlayerId === first.playerId ? host : guest;
    if (kind === 'betting') {
      mover.send({ action: 'player_move', ...(mover === host ? first : second), move: 'raise', amount: 8, commandId: 'first-raise' });
      await mover.waitFor('command_ack');
      mover = mover === host ? guest : host;
    }
    const access = mover === host ? first : second;
    const move = { action: 'player_move', ...access, move: kind === 'betting' ? 'raise' : 'fold', amount: 16, commandId: 'commented-move' };
    mover.send(move);
    const a = (await host.waitFor('commentary_ready')).data;
    const b = (await guest.waitFor('commentary_ready')).data;
    expect(a.id).toBe(b.id); expect(a.text).toBe(b.text); expect(a.audioUrl).toBe(b.audioUrl);
    expect(a.stage).toBe(kind === 'betting' ? 'preflop' : undefined);
    const audio = await fetch(`http://127.0.0.1:${port}${a.audioUrl}`);
    expect(audio.status).toBe(200); expect(await audio.text()).toBe('test audio');
    expect((await fetch(`http://127.0.0.1:${port}${a.audioUrl}bad`)).status).toBe(404);
    mover.send(move); await mover.waitFor('command_ack');
    if (kind === 'betting') {
      await new Promise(resolve => setTimeout(resolve, 1100));
      const finisher = mover === host ? guest : host;
      const fold = { action: 'player_move', ...(finisher === host ? first : second), move: 'fold', commandId: 'finish-after-call' };
      finisher.send(fold);
      const resultA = (await host.waitFor('commentary_ready')).data;
      const resultB = (await guest.waitFor('commentary_ready')).data;
      expect(resultA.id).toBe(`${a.handId}:complete`);
      expect(resultA.stage).toBeUndefined();
      expect(resultA.text).toBe(resultB.text);
      finisher.send(fold); await finisher.waitFor('command_ack');
    }
    host.send({ action: 'join_player', ...first }); await host.waitFor('player_state');
    const fresh = await connect(port); fresh.send({ action: 'join_player', ...second }); await fresh.waitFor('player_state');
    fresh.send({ action: 'commentary_preferences', preference: { mode: 'voice', locale: 'en' } });
    fresh.send({ action: 'client_ping' }); await fresh.waitFor('server_pong');
    await new Promise(resolve => setTimeout(resolve, 200));
    expect([...host.messages, ...guest.messages, ...fresh.messages].filter(m => m.type === 'commentary_ready')).toHaveLength(0);
    for (const status of ['Commentary configured', 'Commentary subscription', 'Commentary generation started',
      'Commentary speech started', 'Commentary published']) expect(serverLog).toContain(status);
    for (const secret of [first.token, second.token, 'test-google-token', a.text, 'Anna', 'Ivan']) {
      expect(serverLog).not.toContain(secret);
    }
  } finally {
    sockets.forEach(ws => ws.terminate());
    if (child && child.exitCode === null) {
      const exited = new Promise<void>(resolve => child!.once('exit', () => resolve()));
      child.kill(); await exited;
    }
  }
}, 20_000);

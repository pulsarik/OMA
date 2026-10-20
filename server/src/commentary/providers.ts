import { GoogleAuth } from 'google-auth-library';
import { CommentaryEvent, CommentaryLocale } from './types';

export type CommentaryConfig = {
  enabled: boolean; groqKey: string; model: string; speechEnabled: boolean;
  voiceRu: string; voiceEn: string; project?: string;
  dailyTokens: number; monthlyCharacters: number; cooldownMs: number; handGap: number;
};
const positive = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
};
export function commentaryConfig(env = process.env): CommentaryConfig {
  return {
    enabled: env.COMMENTARY_ENABLED === 'true' && Boolean(env.GROQ_API_KEY),
    groqKey: env.GROQ_API_KEY || '', model: env.COMMENTARY_TEXT_MODEL || 'qwen/qwen3.8-27b',
    speechEnabled: env.COMMENTARY_GOOGLE_TTS === 'true',
    voiceRu: env.COMMENTARY_VOICE_RU || 'ru-RU-Chirp3-HD-Charon',
    voiceEn: env.COMMENTARY_VOICE_EN || 'en-US-Chirp3-HD-Charon',
    project: env.GOOGLE_CLOUD_PROJECT,
    dailyTokens: positive(env.COMMENTARY_DAILY_TOKENS, 180_000),
    monthlyCharacters: positive(env.COMMENTARY_MONTHLY_CHARACTERS, 900_000),
    cooldownMs: 90_000, handGap: 3,
  };
}

export function commentaryMessages(event: CommentaryEvent, locale: CommentaryLocale, history: string[]) {
  return [
    { role: 'system', content: `You are a calm, warm Omaha Hi-Lo TV commentator. Write in ${locale === 'ru' ? 'Russian' : 'English'}. Reply JSON: {"speak":boolean,"text":string,"factIds":string[]}. Use ONLY supplied facts. 1-2 sentences, at most 180 characters. You may stay silent (false, empty text and factIds). Use player markers exactly as supplied. No cards, hand ranks, odds, amounts, advice, bluff accusations or invented motives. No markdown. Do not repeat recent comments. A scoop means winning high AND low of all contested pots; do not call returned bets winnings.` },
    { role: 'user', content: JSON.stringify({ facts: event.facts, recent: history.slice(0, 3) }) },
  ];
}

export function validateCommentary(raw: unknown, event: CommentaryEvent, locale: CommentaryLocale, history: string[],
  onRejected?: (reason: string) => void): string | undefined {
  const reject = (reason: string): undefined => { onRejected?.(reason); return undefined; };
  const r = raw as { speak?: unknown; text?: unknown; factIds?: unknown } | null;
  if (r?.speak === false) return reject('model_silent');
  if (!r || r.speak !== true || typeof r.text !== 'string' || !Array.isArray(r.factIds)) return reject('invalid_schema');
  if (!r.factIds.length || !r.factIds.every(id => event.facts.some(f => f.id === id))) return reject('invalid_fact_ids');
  let text = r.text.trim();
  if (!text) return reject('empty_text');
  if (text.length > 180) return reject('text_too_long');
  if (/[<>`{}\n]/.test(text)) return reject('markup_or_newline');
  const allowedPlayers = new Set(event.facts.map(f => f.player).filter(Boolean));
  const markers = text.match(/\[P\d+\]/g) ?? [];
  if (markers.some(m => !allowedPlayers.has(m))) return reject('unknown_player_marker');
  const plain = text.replace(/\[P\d+\]/g, '');
  if (/[\[\]\d]/.test(plain)) return reject('numbers_or_brackets');
  if (locale === 'ru' ? !/[а-яё]/i.test(plain) : /[а-яё]/i.test(plain)) return reject('wrong_language');
  if (/блеф|вероятност|флеш|стрит|фулл|каре|туз|корол|bluff|odds|flush|straight|full house|aces|kings|should|совету|следует/i.test(plain)) return reject('forbidden_claim');
  const normalized = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  if (history.some(h => normalized(h) === normalized(text))) return reject('repeated_text');
  for (const marker of markers) text = text.split(marker).join(event.names[marker]);
  if (text.length > 220) return reject('rendered_text_too_long');
  if (history.some(h => normalized(h) === normalized(text))) return reject('repeated_text');
  return text;
}

export function createProviders(config: CommentaryConfig) {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  return {
    async generate(messages: ReturnType<typeof commentaryMessages>, signal: AbortSignal) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', signal,
        headers: { Authorization: `Bearer ${config.groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: config.model, messages, reasoning_effort: 'none',
          max_completion_tokens: 256, temperature: 0.7, response_format: { type: 'json_object' } }),
      });
      if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);
      const body = await response.json() as any;
      if (body.choices?.[0]?.finish_reason !== 'stop') throw new Error('Incomplete commentary');
      return { result: JSON.parse(body.choices[0].message.content), tokens: Number(body.usage?.total_tokens) };
    },
    async synthesize(text: string, locale: CommentaryLocale, signal: AbortSignal): Promise<Buffer> {
      const token = await auth.getAccessToken();
      signal.throwIfAborted();
      if (!token) throw new Error('Google credentials unavailable');
      const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
        method: 'POST', signal,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
          ...(config.project ? { 'x-goog-user-project': config.project } : {}) },
        body: JSON.stringify({ input: { text }, voice: {
          languageCode: locale === 'ru' ? 'ru-RU' : 'en-US', name: locale === 'ru' ? config.voiceRu : config.voiceEn,
        }, audioConfig: { audioEncoding: 'MP3' } }),
      });
      if (!response.ok) throw new Error(`Google TTS HTTP ${response.status}`);
      const body = await response.json() as any;
      if (typeof body.audioContent !== 'string' || body.audioContent.length > 1_400_000) throw new Error('Invalid audio');
      const audio = Buffer.from(body.audioContent, 'base64');
      if (!audio.length) throw new Error('Empty audio');
      return audio;
    },
  };
}

import { GoogleAuth } from 'google-auth-library';
import { CommentaryEvent, CommentaryLocale } from './types';
import { commentaryGrammaticalGender } from './grammar';

export type CommentaryConfig = {
  enabled: boolean; groqKey: string; model: string; speechEnabled: boolean;
  voiceRu: string; voiceEn: string; project?: string;
  dailyTokens: number; monthlyCharacters: number; cooldownMs: number; handGap: number; hourlyAttempts: number;
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
    cooldownMs: Math.min(positive(env.COMMENTARY_COOLDOWN_SECONDS, 12), 3600) * 1000,
    handGap: positive(env.COMMENTARY_HAND_GAP, 1),
    hourlyAttempts: positive(env.COMMENTARY_HOURLY_ATTEMPTS, 60),
  };
}

export function isGarikEvent(event: CommentaryEvent, locale: CommentaryLocale): boolean {
  if (locale !== 'ru' || event.facts.some(f => f.kind === 'eliminated' || f.kind === 'match_winner')) return false;
  let hash = 0;
  for (const char of event.id) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return hash % 4 === 0;
}

export function commentaryMessages(event: CommentaryEvent, locale: CommentaryLocale, history: string[]) {
  const markers = new Set([...event.facts.map(f => f.player), ...(event.actions ?? []).map(a => a.player)]
    .filter((player): player is string => Boolean(player)));
  // Keep names private while giving the model enough context to agree with them.
  const playerGrammar = Object.fromEntries([...markers].map(marker =>
    [marker, commentaryGrammaticalGender(event.names[marker] ?? '')]));
  const grammar = locale === 'ru'
    ? 'Follow playerGrammar for every player marker, including players in the action history and epigrams. Agree past-tense verbs, adjectives and pronouns: feminine uses выиграла, повысила, пошла, она; masculine uses выиграл, повысил, пошёл, он. For unknown use gender-neutral present-tense wording such as забирает or повышает, without gendered pronouns. Never default unknown players to masculine. Keep markers unchanged and use them as subjects so names need no declension.'
    : 'Follow playerGrammar when using pronouns: feminine she/her, masculine he/him. For unknown use the player marker or singular they. Keep markers unchanged.';
  const serious = event.facts.some(f => f.kind === 'eliminated' || f.kind === 'match_winner');
  const garik = isGarikEvent(event, locale);
  const delivery = garik
    ? 'short original Russian four-line poker epigram that directly reflects the supplied fact'
    : serious
    ? 'calm, concise factual poker commentary; no joke about the losing player'
    : 'concise factual poker commentary in plain language';
  const plainStyle = 'Use plain, literal poker language. No metaphors, jokes, poetry, personification, vague atmosphere, invented jargon or claims that players exchange signals. Describe only the supplied fact directly.';
  const style = garik
    ? 'Write an original Russian four-line poker epigram, called a гарик. Exactly four short lines separated by newlines, no more than 45 characters per line and 180 total. It must clearly and literally reflect the supplied game fact, with one light punchline. Do not imitate or mention any author. No vague metaphors, personification, invented jargon or claims that players exchange signals.'
    : plainStyle;
  const focus = event.stage
    ? 'This hand is still in progress. Briefly call the supplied significant action or public board texture in one short sentence. No winner or result yet. went_all_in means the player committed their remaining chips; reraised means a raise after an earlier raise on this street; large_bet_or_raise means a substantial increase relative to the pot. paired_board means the community board paired; three_to_one_suit_board means at least three community cards share a suit; connected_board means the board has several nearby ranks; low_possible_on_board means the public board contains three distinct low ranks, so a qualifying low is possible but not guaranteed. Do not claim anyone has a made hand and do not predict the response or outcome.'
    : 'Report the result directly; when useful, connect it to the supplied betting history.';
  const terminology = locale === 'ru'
    ? 'Use standard Russian poker terms, not literal dictionary translations: колл/коллирует, чек/чекает, фолд/фолдит, бет/ставит, рейз/рейзит, ререйз/ререйзит, олл-ин. In particular, call is колл or коллирует, never вызов or вызвал.'
    : 'Use standard English poker terms: call, check, fold, bet, raise, re-raise and all-in.';
  return [
    { role: 'system', content: `You are a lively Omaha Hi-Lo TV commentator with wit and poker irony. Write in ${locale === 'ru' ? 'natural Russian' : 'natural English'}. Reply JSON: {"speak":boolean,"text":string,"factIds":string[]}. Ground every game claim in supplied facts/context; cite used fact IDs. 1-2 short sentences, at most 180 characters. Follow the supplied focus: call a significant live action or public board development, or report a completed result. Silence is fine when there is nothing fresh to say. Keep live calls to one short sentence. Tease the situation, never a player's intelligence, losses or identity. Vary openings, rhythm and metaphors against recent comments; no stock catchphrase. Use player markers exactly. No exact cards, private hand ranks, odds, amounts, strategy advice, bluff accusations, invented motives or encouragement to chase losses. You may describe only the supplied public board texture, including a paired board, shared suit, connected ranks or a possible qualifying low; never say a player made a hand. No markdown. A scoop means high AND low of ALL contested pots. won_high_share/won_low_share mean a share, not necessarily the whole pot or a sole winner. won_without_showdown means opponents folded. Never call returned bets winnings. Context describes this hand only, not a streak or past play. Actions are the last five public moves in chronological order. Use them to name the players in an actual raise/call/fold sequence when relevant; do not infer why they acted. wagerLevel describes the total street wager as small/medium/large, not the raise increment or pot size. Betting counts describe public actions, not strength or motives. No raises alone does not mean everyone checked; calls may be present.` },
    { role: 'user', content: JSON.stringify({ facts: event.facts, context: event.context, actions: event.actions, playerGrammar,
      focus: `${style} ${terminology} ${focus}`, delivery, recent: history.slice(0, 3) }) },
    { role: 'system', content: `${style} ${grammar}` },
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
  const lines = text.split('\n');
  const garik = isGarikEvent(event, locale);
  if (/[<>`{}\r]/.test(text) || (garik
    ? lines.length !== 4 || lines.some(line => !line.trim() || line.length > 45)
    : lines.length > 1)) {
    return reject('markup_or_newline');
  }
  const allowedPlayers = new Set([...event.facts.map(f => f.player), ...(event.actions ?? []).map(a => a.player)].filter(Boolean));
  const markers = text.match(/\[P\d+\]/g) ?? [];
  if (markers.some(m => !allowedPlayers.has(m))) return reject('unknown_player_marker');
  const plain = text.replace(/\[P\d+\]/g, '');
  if (/[\[\]\d]/.test(plain)) return reject('numbers_or_brackets');
  if (locale === 'ru' ? !/[а-яё]/i.test(plain) : /[а-яё]/i.test(plain)) return reject('wrong_language');
  if (/блеф|вероятност|флеш|стрит|фулл|каре|туз|корол|bluff|odds|flush|straight|full house|aces|kings|should|совету|следует/i.test(plain)) return reject('forbidden_claim');
  if (/коннектор|шепч|обмен\w* сигнал|connector|whisper|exchange\w* signals/i.test(plain)) return reject('figurative_filler');
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

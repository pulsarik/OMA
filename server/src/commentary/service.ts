import { randomBytes, randomUUID } from 'crypto';
import HandStore from '../handStore';
import { CommentaryConfig, commentaryMessages, createProviders, validateCommentary } from './providers';
import { CommentaryEvent, CommentaryLocale, CommentaryPreference, CommentaryReady } from './types';
import { commentaryErrorDetails, commentaryLog } from './diagnostics';

type Audience = { preference: CommentaryPreference; send: (message: CommentaryReady) => void };
type Providers = ReturnType<typeof createProviders>;

async function deadline<T>(operation: (signal: AbortSignal) => Promise<T>, milliseconds: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('Commentary timeout')); }, Math.max(1, milliseconds));
  });
  try { return await Promise.race([operation(controller.signal), expired]); }
  finally { clearTimeout(timer!); controller.abort(); }
}

export class CommentaryService {
  private busy = new Set<string>();
  private audio = new Map<string, { key: string; expiresAt: number; data: Buffer }>();
  private failures = 0;
  private retryAt = 0;
  private speechFailures = 0;
  private speechRetryAt = 0;
  constructor(private config: CommentaryConfig, private store: HandStore,
    private audience: (event: CommentaryEvent) => Audience[],
    private providers: Providers = createProviders(config), private now = Date.now) {}

  get enabled() { return this.config.enabled; }
  get voiceEnabled() { return this.enabled && this.config.speechEnabled; }

  private skipped(event: CommentaryEvent, reason: string, locale?: CommentaryLocale) {
    commentaryLog('Commentary skipped', { eventId: event.id, handNumber: event.handNumber, locale, reason });
  }

  private pruneAudio() {
    for (const [id, item] of this.audio) if (item.expiresAt <= this.now()) this.audio.delete(id);
    let size = [...this.audio.values()].reduce((sum, item) => sum + item.data.length, 0);
    for (const [id, item] of this.audio) {
      if (size <= 10_000_000) break;
      this.audio.delete(id); size -= item.data.length;
    }
  }

  getAudio(id: string, key: string): Buffer | undefined {
    this.pruneAudio();
    const item = this.audio.get(id);
    return item && key === item.key ? item.data : undefined;
  }

  async consider(event: CommentaryEvent): Promise<void> {
    if (!this.enabled) return;
    if (this.now() >= event.expiresAt) return this.skipped(event, 'expired');
    if (this.now() < this.retryAt) return this.skipped(event, 'text_provider_backoff');
    if (this.busy.has(event.partyId) || this.busy.size >= 3) return this.skipped(event, 'busy');
    const listeners = this.audience(event).filter(a => a.preference.mode !== 'off');
    if (!listeners.length) return this.skipped(event, 'no_listeners');
    this.busy.add(event.partyId);
    try {
      if (!await this.store.claimCommentary(event, this.config.cooldownMs, this.config.handGap)) return this.skipped(event, 'duplicate_or_cooldown');
      if (!await this.store.reserveCommentaryUsage(`hour:${Math.floor(this.now() / 3_600_000)}:${event.partyId}`, 1, this.config.hourlyAttempts)) return this.skipped(event, 'hourly_limit');
      const locales = [...new Set(listeners.map(a => a.preference.locale))];
      await Promise.all(locales.map(locale => this.generate(event, locale)));
    } catch (error) {
      // Never log provider responses or game state (they can contain credentials).
      commentaryLog('Commentary skipped: storage or service unavailable', { eventId: event.id, ...commentaryErrorDetails(error) }, 'warn');
    } finally { this.busy.delete(event.partyId); }
  }

  private async generate(event: CommentaryEvent, locale: CommentaryLocale) {
    const audience = () => this.audience(event).filter(a => a.preference.locale === locale && a.preference.mode !== 'off');
    if (!audience().length) return this.skipped(event, 'no_listeners', locale);
    if (this.now() >= event.expiresAt) return this.skipped(event, 'expired', locale);
    const history = await this.store.commentaryHistory(event.partyId, locale);
    const messages = commentaryMessages(event, locale, history);
    // UTF-8 byte count + output cap is a conservative token reservation, reconciled on success.
    const reservation = Buffer.byteLength(JSON.stringify(messages)) + 384;
    const today = new Date(this.now()).toISOString().slice(0, 10);
    const minute = `tokens-minute:${Math.floor(this.now() / 60_000)}`;
    const day = `tokens-day:${today}`;
    if (!await this.store.reserveCommentaryUsage(minute, reservation, 7_000)) return this.skipped(event, 'minute_token_limit', locale);
    if (!await this.store.reserveCommentaryUsage(day, reservation, this.config.dailyTokens)) {
      await this.store.releaseCommentaryUsage(minute, reservation);
      return this.skipped(event, 'daily_token_limit', locale);
    }
    try {
      commentaryLog('Commentary generation started', { eventId: event.id, locale });
      const generated = await deadline(signal => this.providers.generate(messages, signal), Math.min(5_000, event.expiresAt - this.now()));
      if (Number.isSafeInteger(generated.tokens) && generated.tokens > 0 && generated.tokens < reservation) {
        await this.store.releaseCommentaryUsage(day, reservation - generated.tokens);
        await this.store.releaseCommentaryUsage(minute, reservation - generated.tokens);
      }
      const text = validateCommentary(generated.result, event, locale, history,
        reason => this.skipped(event, reason, locale));
      if (!text) return;
      if (this.now() >= event.expiresAt) return this.skipped(event, 'expired_after_text', locale);
      if (!audience().length) return this.skipped(event, 'listeners_left_after_text', locale);
      let audioUrl: string | undefined;
      if (this.config.speechEnabled && this.now() >= this.speechRetryAt && audience().some(a => a.preference.mode === 'voice')) {
        const month = `tts-month:${today.slice(0, 7)}`;
        if (await this.store.reserveCommentaryUsage(month, [...text].length, this.config.monthlyCharacters)) {
          try {
            commentaryLog('Commentary speech started', { eventId: event.id, locale });
            const data = await deadline(signal => this.providers.synthesize(text, locale, signal), Math.min(6_000, event.expiresAt - this.now()));
            if (data.length <= 1_000_000 && this.now() < event.expiresAt && audience().length) {
              const id = randomUUID();
              const key = randomBytes(24).toString('hex');
              this.audio.set(id, { key, data, expiresAt: event.expiresAt });
              this.pruneAudio();
              audioUrl = `/api/commentary/audio/${id}/${key}`;
              this.speechFailures = 0;
            } else {
              commentaryLog('Commentary audio discarded', { eventId: event.id, locale,
                reason: data.length > 1_000_000 ? 'audio_too_large' : this.now() >= event.expiresAt ? 'expired' : 'no_listeners' });
            }
          } catch (error) {
            if (++this.speechFailures >= 3) { this.speechRetryAt = this.now() + 60_000; this.speechFailures = 0; }
            commentaryLog('Commentary speech unavailable; using subtitles', { eventId: event.id, locale, ...commentaryErrorDetails(error) }, 'warn');
          }
        } else {
          commentaryLog('Commentary subtitles only', { eventId: event.id, locale, reason: 'monthly_character_limit' });
        }
      } else {
        commentaryLog('Commentary subtitles only', { eventId: event.id, locale,
          reason: !this.config.speechEnabled ? 'speech_disabled' : this.now() < this.speechRetryAt ? 'speech_provider_backoff' : 'no_voice_listeners' });
      }
      if (this.now() >= event.expiresAt) return this.skipped(event, 'expired_before_publish', locale);
      if (!audience().length) return this.skipped(event, 'listeners_left_before_publish', locale);
      // Keep the model's validated markers in history: nicknames must never return to the prompt.
      await this.store.saveCommentaryLine(event.id, locale, generated.result.text.trim());
      for (const listener of audience()) listener.send({
        id: event.id, handId: event.handId, partyId: event.partyId, revision: event.revision, locale, text,
        ...(listener.preference.mode === 'voice' && audioUrl ? { audioUrl } : {}),
        expiresAt: event.expiresAt, serverNow: this.now(),
      });
      this.failures = 0;
      commentaryLog('Commentary published', { eventId: event.id, locale, tokens: generated.tokens, characters: text.length,
        audio: Boolean(audioUrl), elapsedMs: this.now() - event.createdAt });
    } catch (error) {
      this.failures++;
      if (this.failures >= 3) { this.retryAt = this.now() + 60_000; this.failures = 0; }
      commentaryLog('Commentary generation unavailable; skipping event', { eventId: event.id, locale, ...commentaryErrorDetails(error) }, 'warn');
    }
  }
}

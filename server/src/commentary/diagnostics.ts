/** Keep metadata on the same line so a Render filter for Commentary retains the reason. */
export function commentaryLog(message: string, details: Record<string, string | number | boolean | undefined>, level: 'info' | 'warn' = 'info') {
  console[level](message, JSON.stringify(details));
}

/** Only allowlisted codes reach logs. Error messages/bodies can contain credentials or prompts. */
export function commentaryErrorDetails(error: unknown): { reason: string; provider?: string; status?: number } {
  if (!(error instanceof Error)) return { reason: 'unknown_error' };
  const http = /^(Groq|Google TTS) HTTP ([1-5]\d\d)$/.exec(error.message);
  if (http) return { reason: 'provider_http', provider: http[1] === 'Groq' ? 'groq' : 'google_tts', status: Number(http[2]) };
  if (error.message === 'Commentary timeout' || error.name === 'TimeoutError') return { reason: 'timeout' };
  if (error.name === 'AbortError') return { reason: 'aborted' };
  if (error.message === 'Incomplete commentary') return { reason: 'incomplete_response' };
  if (error.message === 'Google credentials unavailable') return { reason: 'google_credentials_unavailable' };
  if (error.message === 'Invalid audio' || error.message === 'Empty audio') return { reason: 'invalid_audio' };
  if (error instanceof SyntaxError) return { reason: 'invalid_json' };
  return { reason: 'request_or_storage_error' };
}

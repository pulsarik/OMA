import { emailProblem, problemEmailConfig } from '../src/problemEmail';

test('email delivery is disabled unless both destination and API key are configured', () => {
  expect(problemEmailConfig({ PROBLEM_EMAIL_TO: 'pulsarik@gmail.com' })).toBeUndefined();
  expect(problemEmailConfig({ RESEND_API_KEY: 'secret' })).toBeUndefined();
});

test('sends the complete reproducible report without exposing the API key in the body', async () => {
  const fetcher = jest.fn().mockResolvedValue({ ok: true, status: 200 });
  const problem = { id: 1000, description: 'Raise failed', hand: { actions: [] } };

  await emailProblem({
    apiKey: 'secret',
    to: 'pulsarik@gmail.com',
    from: 'reports@example.com',
  }, problem, fetcher as unknown as typeof fetch);

  expect(fetcher).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
    method: 'POST',
  }));
  const request = fetcher.mock.calls[0][1];
  const body = JSON.parse(request.body);
  expect(body.to).toEqual(['pulsarik@gmail.com']);
  expect(body.subject).toBe('Omaha problem #1000');
  expect(body.text).toContain('Raise failed');
  expect(body.text).not.toContain('secret');
});

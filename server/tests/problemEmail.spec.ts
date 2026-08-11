import { emailProblem, problemEmailConfig } from '../src/problemEmail';

test('email delivery is disabled unless Gmail credentials are configured', () => {
  expect(problemEmailConfig({ GMAIL_USER: 'pulsarik@gmail.com' })).toBeUndefined();
  expect(problemEmailConfig({ GMAIL_APP_PASSWORD: 'secret' })).toBeUndefined();
});

test('sends the complete reproducible report without exposing the app password', async () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'sent' });
  const problem = { id: 1000, description: 'Raise failed', hand: { actions: [] } };

  await emailProblem({
    user: 'pulsarik@gmail.com',
    appPassword: 'secret',
    to: 'pulsarik@gmail.com',
  }, problem, sendMail);

  expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
    from: 'Omaha problem reports <pulsarik@gmail.com>',
    to: 'pulsarik@gmail.com',
    subject: 'Omaha problem #1000',
  }));
  const message = sendMail.mock.calls[0][0];
  expect(message.text).toContain('Raise failed');
  expect(message.text).not.toContain('secret');
});

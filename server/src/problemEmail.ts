export type ProblemEmailConfig = {
  apiKey: string;
  to: string;
  from: string;
};

export function problemEmailConfig(env: NodeJS.ProcessEnv): ProblemEmailConfig | undefined {
  const apiKey = env.RESEND_API_KEY?.trim();
  const to = env.PROBLEM_EMAIL_TO?.trim();
  if (!apiKey || !to) return undefined;
  return {
    apiKey,
    to,
    from: env.PROBLEM_EMAIL_FROM?.trim() || 'Omaha problem reports <onboarding@resend.dev>',
  };
}

export async function emailProblem(
  config: ProblemEmailConfig,
  problem: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
) {
  const id = problem.id;
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [config.to],
      subject: `Omaha problem #${id}`,
      text: JSON.stringify(problem, null, 2),
    }),
  });
  if (!response.ok) {
    throw new Error(`problem email failed with status ${response.status}`);
  }
}

import nodemailer from 'nodemailer';

export type ProblemEmailConfig = {
  user: string;
  appPassword: string;
  to: string;
};

export function problemEmailConfig(env: NodeJS.ProcessEnv): ProblemEmailConfig | undefined {
  const user = env.GMAIL_USER?.trim();
  const appPassword = env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  if (!user || !appPassword) return undefined;
  return {
    user,
    appPassword,
    to: env.PROBLEM_EMAIL_TO?.trim() || user,
  };
}

export async function emailProblem(
  config: ProblemEmailConfig,
  problem: Record<string, unknown>,
  sendMail?: (message: nodemailer.SendMailOptions) => Promise<unknown>,
) {
  const id = problem.id;
  const transport = sendMail ? undefined : nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.user, pass: config.appPassword },
  });
  const deliver = sendMail ?? transport!.sendMail.bind(transport);
  await deliver({
    from: `Omaha problem reports <${config.user}>`,
    to: config.to,
    subject: `Omaha problem #${id}`,
    text: JSON.stringify(problem, null, 2),
  });
}

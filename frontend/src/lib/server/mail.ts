import nodemailer from "nodemailer";

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
};

export function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function getSmtpConfig(): SmtpConfig | null {
  const host = getEnv("SMTP_HOST");
  const port = Number(getEnv("SMTP_PORT") ?? "587");
  const user = getEnv("SMTP_USER");
  const pass = getEnv("SMTP_PASS");

  if (!host || !user || !pass || !Number.isFinite(port)) {
    return null;
  }

  return { host, port, user, pass };
}

export function createSmtpTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

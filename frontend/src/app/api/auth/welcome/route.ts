import { createSmtpTransport, EMAIL_PATTERN, getEnv, getSmtpConfig } from "@/lib/server/mail";

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

const RATE_LIMIT_WINDOW_MS = 10 * 60_000;
const RATE_LIMIT_MAX = 3;
const rateBuckets = new Map<string, number[]>();

function requestId(req: Request): string {
  return req.headers.get("x-request-id") || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `req-${Date.now()}`);
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  return real?.trim() || "unknown";
}

function allowRateLimit(key: string): boolean {
  const now = Date.now();
  const minTs = now - RATE_LIMIT_WINDOW_MS;
  const existing = rateBuckets.get(key) || [];
  const kept = existing.filter((ts) => ts >= minTs);
  if (kept.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(key, kept);
    return false;
  }
  kept.push(now);
  rateBuckets.set(key, kept);
  return true;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildWelcomeLetter(email: string, signInUrl: string) {
  const subject = getEnv("WELCOME_EMAIL_SUBJECT") ?? "Welcome to MouseFit";
  const safeEmail = escapeHtml(email);
  const text = [
    `Hi ${email},`,
    "",
    "Welcome to MouseFit.",
    "Your account is ready. If email verification is enabled for your project, verify your address first, then sign in here:",
    signInUrl,
    "",
    "We are glad to have you here.",
    "",
    "MouseFit",
  ].join("\n");

  const html = `
    <div style="margin:0;padding:32px 20px;background:#eef4fb;font-family:Arial,sans-serif;color:#122033;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d9e3f0;border-radius:20px;padding:32px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${safeEmail},</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#122033;">Welcome to MouseFit</h1>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#41556d;">
          Your account is ready. If email verification is enabled for your project, verify your address first and then continue to your account.
        </p>
        <p style="margin:24px 0;">
          <a href="${signInUrl}" style="display:inline-block;background:#122033;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:14px;font-weight:600;">
            Sign in to MouseFit
          </a>
        </p>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7c91;">
          We are glad to have you here.
        </p>
      </div>
    </div>
  `.trim();

  return { subject, text, html };
}

export async function POST(req: Request) {
  const rid = requestId(req);
  const ip = clientIp(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { code: "invalid_request", message: "Invalid JSON body", request_id: rid });
  }

  if (!body || typeof body !== "object") {
    return json(400, { code: "invalid_request", message: "Invalid request body", request_id: rid });
  }

  const rawEmail = (body as Record<string, unknown>).email;
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return json(400, { code: "invalid_email", message: "Valid email is required", request_id: rid });
  }

  if (!allowRateLimit(`welcome:${ip}:${email}`)) {
    return json(429, { code: "rate_limited", message: "Too many welcome email requests. Try again later.", request_id: rid });
  }

  const smtpConfig = getSmtpConfig();
  if (!smtpConfig) {
    return json(503, {
      code: "email_not_configured",
      message: "Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and optionally WELCOME_EMAIL_FROM.",
      request_id: rid,
    });
  }

  const fromEmail = getEnv("WELCOME_EMAIL_FROM") ?? getEnv("CONTACT_FROM") ?? smtpConfig.user;
  const replyTo = getEnv("WELCOME_EMAIL_REPLY_TO") ?? fromEmail;
  const signInUrl = new URL("/auth/sign-in", req.url).toString();
  const message = buildWelcomeLetter(email, signInUrl);
  const transporter = createSmtpTransport(smtpConfig);

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } catch (err) {
    console.error("Welcome email send failed:", err);
    return json(500, { code: "email_send_failed", message: "Failed to send welcome email", request_id: rid });
  }

  return json(200, { ok: true, request_id: rid });
}

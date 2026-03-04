import nodemailer from "nodemailer";

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
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

export async function POST(req: Request) {
  const rid = requestId(req);
  const ip = clientIp(req);
  if (!allowRateLimit(`contact:${ip}`)) {
    return json(429, { code: "rate_limited", message: "Too many contact requests. Try again later.", request_id: rid });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { code: "invalid_request", message: "Invalid JSON body", request_id: rid });
  }

  if (!body || typeof body !== "object") {
    return json(400, { code: "invalid_request", message: "Invalid request body", request_id: rid });
  }

  const { name, email, message } = body as Record<string, unknown>;

  const safeName = typeof name === "string" ? name.trim() : "";
  const safeEmail = typeof email === "string" ? email.trim() : "";
  const safeMessage = typeof message === "string" ? message.trim() : "";

  if (!safeName || safeName.length > 120) {
    return json(400, { code: "invalid_name", message: "Name is required", request_id: rid });
  }
  if (!safeEmail || safeEmail.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(safeEmail)) {
    return json(400, { code: "invalid_email", message: "Valid email is required", request_id: rid });
  }
  if (!safeMessage || safeMessage.length > 5000) {
    return json(400, { code: "invalid_message", message: "Message is required", request_id: rid });
  }

  const toEmail = getEnv("CONTACT_TO") ?? "lanbodikai@gmail.com";

  const smtpHost = getEnv("SMTP_HOST");
  const smtpPort = Number(getEnv("SMTP_PORT") ?? "587");
  const smtpUser = getEnv("SMTP_USER");
  const smtpPass = getEnv("SMTP_PASS");

  // You must configure SMTP credentials; we don't hardcode secrets.
  if (!smtpHost || !smtpUser || !smtpPass || !Number.isFinite(smtpPort)) {
    return json(500, {
      code: "email_not_configured",
      message:
        "Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optionally CONTACT_TO).",
      request_id: rid,
    });
  }

  const fromEmail = getEnv("CONTACT_FROM") ?? smtpUser;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      replyTo: safeEmail,
      subject: `MouseFit contact: ${safeName}`,
      text: `Name: ${safeName}\nEmail: ${safeEmail}\n\n${safeMessage}\n`,
    });
  } catch (err) {
    console.error("Contact email send failed:", err);
    return json(500, { code: "email_send_failed", message: "Failed to send email", request_id: rid });
  }

  return json(200, { ok: true, request_id: rid });
}


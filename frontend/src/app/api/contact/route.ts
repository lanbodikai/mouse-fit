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

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }

  if (!body || typeof body !== "object") {
    return json(400, { ok: false, error: "Invalid request body" });
  }

  const { name, email, message } = body as Record<string, unknown>;

  const safeName = typeof name === "string" ? name.trim() : "";
  const safeEmail = typeof email === "string" ? email.trim() : "";
  const safeMessage = typeof message === "string" ? message.trim() : "";

  if (!safeName || safeName.length > 120) {
    return json(400, { ok: false, error: "Name is required" });
  }
  if (!safeEmail || safeEmail.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(safeEmail)) {
    return json(400, { ok: false, error: "Valid email is required" });
  }
  if (!safeMessage || safeMessage.length > 5000) {
    return json(400, { ok: false, error: "Message is required" });
  }

  const toEmail = getEnv("CONTACT_TO") ?? "lanbodikai@gmail.com";

  const smtpHost = getEnv("SMTP_HOST");
  const smtpPort = Number(getEnv("SMTP_PORT") ?? "587");
  const smtpUser = getEnv("SMTP_USER");
  const smtpPass = getEnv("SMTP_PASS");

  // You must configure SMTP credentials; we don't hardcode secrets.
  if (!smtpHost || !smtpUser || !smtpPass || !Number.isFinite(smtpPort)) {
    return json(500, {
      ok: false,
      error:
        "Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optionally CONTACT_TO).",
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
    return json(500, { ok: false, error: "Failed to send email" });
  }

  return json(200, { ok: true });
}


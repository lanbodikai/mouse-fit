// Vercel Serverless Function: POST /api/chat
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing GROQ_API_KEY on server" });
  }

  let body = {};
  try {
    body = req.body || {};
    // If body might be a string (older setups), parse it:
    if (typeof body === "string") body = JSON.parse(body);
  } catch (_) {}

  const {
    messages,
    model = "llama-3.3-70b-versatile",
    temperature = 0.6,
  } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages[] is required" });
    }

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature }),
    });

    const txt = await r.text();
    if (!r.ok) {
      let err;
      try { err = JSON.parse(txt); } catch { err = { raw: txt }; }
      return res.status(r.status).json({ error: err.error || err.raw || r.statusText });
    }

    let data = {};
    try { data = JSON.parse(txt); } catch {}
    const reply = data?.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ reply, raw: data });
  } catch (e) {
    console.error("Vercel /api/chat error:", e);
    return res.status(500).json({ error: "Server error" });
  }
}

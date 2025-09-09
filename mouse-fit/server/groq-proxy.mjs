// server/groq-proxy.mjs
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
// import dotenv from "dotenv"; dotenv.config(); // uncomment if you want .env auto-load here

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: (origin, cb) => cb(null, true), // dev uses Vite proxy (same origin to the browser)
    credentials: false,
  })
);
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Health check to verify proxy wiring from the browser
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    port: PORT,
    node_env: process.env.NODE_ENV || "development",
    hasKey: Boolean(process.env.GROQ_API_KEY),
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY on server" });
    }

    const {
      messages,
      model = "llama-3.3-70b-versatile",
      temperature = 0.6,
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages[] is required" });
    }

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    });

    const text = await r.text(); // read once
    if (!r.ok) {
      // return Groq’s exact body to the browser so you see the real error
      let body;
      try { body = JSON.parse(text); } catch { body = { raw: text }; }
      return res.status(r.status).json({ error: body.error || body.raw || r.statusText });
    }

    // success
    let data;
    try { data = JSON.parse(text); } catch { data = {}; }
    const reply = data?.choices?.[0]?.message?.content ?? "";
    return res.json({ reply, raw: data });
  } catch (e) {
    console.error("Proxy /api/chat error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Groq proxy listening on http://localhost:${PORT}`);
});

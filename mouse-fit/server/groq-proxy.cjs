// server/groq-proxy.cjs  (CommonJS, uses Node's native fetch)
const express = require("express");

const app = express();
app.use(express.json({ limit: "1mb" }));

const MODEL = process.env.MF_MODEL || "llama-3.1-8b-instant";
const API_KEY = process.env.GROQ_API_KEY;

app.post("/api/chat", async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).end("GROQ_API_KEY not set.");
    const { messages = [], temperature = 0.6 } = req.body || {};

    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages.map(m => ({ role: m.role, content: String(m.content || "") })),
        temperature,
        stream: true,              // keep streaming enabled
      }),
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");

    if (!upstream.ok || !upstream.body) {
      const err = await upstream.text().catch(() => "");
      return res.status(500).end(err || "Upstream error");
    }

    // Web ReadableStream (Node >= 18)
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse OpenAI/Groq SSE: lines starting with "data: "
      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data:")) continue;

        const payload = line.slice(5).trim();
        if (payload === "[DONE]") { res.end(); return; }
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content ?? "";
          if (delta) res.write(delta);
        } catch {
          // ignore partial/invalid JSON chunks
        }
      }
    }
    res.end();
  } catch (e) {
    res.status(500).end(String(e?.message || e));
  }
});

const PORT = process.env.PORT || 8788;
app.listen(PORT, () => console.log(`[MF] Groq proxy listening http://localhost:${PORT}`));

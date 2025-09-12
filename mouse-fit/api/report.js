const REPORT_SYSTEM = `
You are generating recommendations for COMPUTER MICE.

Hard rules:
- Choose ONLY from CANDIDATES provided. Do not invent or import other products.
- Output must be about computer mice only. Never mention colorways, colors, editions, or hand measurements.

Format (exactly two paragraphs):
P1: Bullet list (•) of 4–8 mice from CANDIDATES. Each bullet: "Brand Model — short spec (e.g., 58 g, sym)".
P2: ONE best pick: "Brand Model — one concise reason grounded in CONTEXT or known specs".
No headings. No extra lines.
`.trim();

app.post("/api/report", async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing GROQ_API_KEY on server" });

    const { profile = {}, candidates: incoming = [] } = req.body || {};
    let candidates = Array.isArray(incoming) ? incoming.slice() : [];

    // Fallback to RAG candidates if none were provided
    if (!candidates.length) {
      try {
        const query = [
          profile.grip ? `grip ${profile.grip}` : "",
          profile.length_mm ? `length ${profile.length_mm}mm` : "",
          profile.width_mm ? `width ${profile.width_mm}mm` : "",
          "mouse"
        ].filter(Boolean).join(", ");
        const raw = await retrieve(query, { grip: profile.grip ?? null }, 48);
        candidates = raw.filter(d => isMouseDoc(d.text))
                        .map(normalizeDoc)
                        .filter(c => c.brand && c.model);
      } catch {}
    }

    if (!candidates.length) {
      return res.status(400).json({ error: "No candidates available (RAG and client were empty)." });
    }

    // Optional context for reasons
    let ctx = "";
    try {
      const query = [
        profile.grip ? `grip ${profile.grip}` : "",
        profile.length_mm ? `length ${profile.length_mm}mm` : "",
        profile.width_mm ? `width ${profile.width_mm}mm` : "",
        "mouse"
      ].filter(Boolean).join(", ");
      const ret = await retrieve(query, { grip: profile.grip ?? null }, 12);
      ctx = ret.slice(0, 8)
               .map(r => `[#${r.id}]\n${String(r.text||"").split("\n").slice(0,24).join("\n")}`)
               .join("\n\n---\n\n");
    } catch {}

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.2,
        messages: [
          { role: "system", content: REPORT_SYSTEM },
          { role: "system", content: ctx ? `CONTEXT:\n${ctx}` : "CONTEXT: (none)" },
          {
            role: "user",
            content:
              "CANDIDATES (choose ONLY from these; computer mice only):\n" +
              JSON.stringify(candidates.slice(0, 40), null, 2) +
              "\n\nWrite exactly two paragraphs as specified. Never output items not in CANDIDATES."
          }
        ]
      })
    });

    const text = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: text });

    const data = JSON.parse(text);
    let out = data?.choices?.[0]?.message?.content || "";

    // ---- Hard sanitizer: remove measurements & colorways, reject off-domain words ----
    out = out.replace(/(^|\n).*?\b(hand|palm)\s*(length|width|size)\b.*$\n?/gim, "");
    out = out.replace(/(^|\n).*?\b(colorway|colorways|color|edition)\b.*$\n?/gim, "");
    if (/(tennis|racket|knife|goggle|headset|keyboard|chair|monitor|phone|laptop)/i.test(out)) {
      return res.status(422).json({ error: "Detected off-domain content in LLM output." });
    }

    // If P1 ended up empty, synthesize from candidates (first 6)
    const paras = out.split(/\n\s*\n/);
    if (!/•/.test(paras[0] || "")) {
      const bullets = candidates.slice(0, 6).map(c => {
        const spec = [
          (c.weight_g || c.weight) ? `${c.weight_g || c.weight} g` : "",
          c.shape || ""
        ].filter(Boolean).join(", ");
        return `• ${c.brand} ${c.model}${spec ? ` — ${spec}` : ""}`;
      }).join(" ");
      paras[0] = bullets || "• No suitable models found.";
      out = paras.join("\n\n");
    }

    res.json({ report: out.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

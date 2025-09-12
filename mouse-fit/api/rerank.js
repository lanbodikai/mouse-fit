// ---- shared (put near top of your server file) ----
import fetch from "node-fetch"; // if on Node < 18; safe no-op polyfill below
if (typeof globalThis.fetch !== "function") globalThis.fetch = fetch;

import { retrieve } from "./rag/index.mjs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const RERANK_MODEL = "llama-3.1-8b-instant";  // fast + good enough for ranking/report

function profileToQuery(p = {}) {
  const b = [];
  if (p.length_mm) b.push(`hand length ${p.length_mm}mm`);
  if (p.width_mm)  b.push(`hand width ${p.width_mm}mm`);
  if (p.grip)      b.push(`grip ${p.grip}`);
  if (p.wireless === true)  b.push("wireless");
  if (p.wireless === false) b.push("wired");
  if (p.budget)    b.push(`budget $${p.budget}`);
  return b.join(", ");
}

// ---- system prompts ----
const RERANK_SYSTEM = `
You are Mouse-Fit Re-Ranker. Re-score candidates for the user's grip/hand.
Fingertip: prefer very light, compact, low rear mass; penalize heavy/tall rear hump.
Claw: prefer medium length, defined center/rear hump, narrow waist; avoid very flat shells.
Palm: prefer fuller rear hump and volume; penalize low/flat humps.
Return STRICT JSON only.
`.trim();

const REPORT_SYSTEM = `
You are Mouse-Fit Report Generator.
Output EXACTLY two paragraphs:
P1: a short list of matching types/models (use bullet dots • separated by space).
P2: ONE best pick with suggested grips, brand, notable colorways if known, and a one-sentence reason grounded in context.
If unknown, omit rather than guessing. No headings, no tables, no extra lines.
`.trim();
// ---------- /api/rerank ----------
app.post("/api/rerank", async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing GROQ_API_KEY on server" });

    const { profile = {}, candidates = [] } = req.body || {};
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: "No candidates" });
    }

    const query = profileToQuery(profile);
    const prefs = {
      grip: profile.grip || null,
      wireless: profile.wireless ?? null,
      targetWeight: profile.targetWeight || null
    };

    // Retrieve context docs (your RAG)
    const ret = await retrieve(query, prefs, 24);

    // Build short context only for the allowed candidate IDs
    const allow = new Set(candidates.map(c => (c.id || "").toLowerCase()));
    const ctxDocs = ret.filter(r => allow.has(r.id)).slice(0, 12);
    const ctx = ctxDocs
      .map(d => `[#${d.id}]\n${(d.text || "").split("\n").slice(0, 28).join("\n")}`)
      .join("\n\n---\n\n");

    const userMsg = {
      role: "user",
      content:
        `Profile: ${query || "(unspecified)"}\n\n` +
        `CANDIDATES:\n${JSON.stringify(candidates.slice(0, 12), null, 2)}\n\n` +
        `CONTEXT:\n${ctx}\n\n` +
        `Return JSON {grip, ranked:[{id,score,reason,flags:[]},...], best_id}. No prose.`
    };

    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: RERANK_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: RERANK_SYSTEM },
          { role: "system", content: "Use [#id] only inside reason if citing a doc." },
          userMsg
        ]
      })
    });

    if (!r.ok) return res.status(500).json({ error: await r.text() });

    const data = await r.json();
    const payload = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    // Keep only ids we sent, sort by score desc
    const idset = new Set(candidates.map(c => c.id));
    const ranked =
      (payload.ranked || [])
        .filter(x => idset.has(x.id))
        .sort((a, b) => (b.score || 0) - (a.score || 0));

    const best_id = ranked[0]?.id || candidates[0].id;

    return res.json({
      grip: payload.grip ?? profile.grip ?? null,
      ranked,
      best_id
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

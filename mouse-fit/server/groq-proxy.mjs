// server/groq-proxy.mjs  (merged all-in-one server)

import 'dotenv/config';

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import fetch from "node-fetch"; // guarantees fetch in all Node versions
import { retrieve } from "./rag/index.mjs";
import path from "path";
import { fileURLToPath } from "url";

// -----------------------------------------------------
// Setup
// -----------------------------------------------------
if (typeof globalThis.fetch !== "function") {
  globalThis.fetch = fetch;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// JSON & CORS & Limits
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: (origin, cb) => cb(null, true), // OK for dev; tighten for prod if needed
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

// Static hosting for your built assets or public files
app.use(express.static(path.resolve(__dirname, "../public")));

// -----------------------------------------------------
// Shared constants
// -----------------------------------------------------
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant"; // proxy default
const RERANK_MODEL = "llama-3.1-8b-instant";     // reranker/report default

// -----------------------------------------------------
// Health check
// -----------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    port: PORT,
    node_env: process.env.NODE_ENV || "development",
    hasKey: Boolean(process.env.GROQ_API_KEY),
  });
});

// -----------------------------------------------------
// /api/chat — transparent Groq proxy
// -----------------------------------------------------
app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY on server" });
    }

    const {
      messages,
      model = DEFAULT_MODEL,
      temperature = 0.6,
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages[] is required" });
    }

    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature }),
    });

    const text = await r.text();
    if (!r.ok) {
      let body;
      try { body = JSON.parse(text); } catch { body = { raw: text }; }
      return res
        .status(r.status)
        .json({ error: body.error || body.raw || r.statusText });
    }

    let data;
    try { data = JSON.parse(text); } catch { data = {}; }
    const reply = data?.choices?.[0]?.message?.content ?? "";
    return res.json({ reply, raw: data });
  } catch (e) {
    console.error("Proxy /api/chat error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

// -----------------------------------------------------
// Helpers for Mouse-Fit endpoints
// -----------------------------------------------------
function profileToQuery(p) {
  const b = [];
  if (p.length_mm) b.push(`hand length ${p.length_mm}mm`);
  if (p.width_mm) b.push(`hand width ${p.width_mm}mm`);
  if (p.grip) b.push(`grip ${p.grip}`);
  if (p.wireless === true) b.push("wireless");
  if (p.wireless === false) b.push("wired");
  if (p.budget) b.push(`budget $${p.budget}`);
  return b.join(", ");
}

// ---------- AI re-ranker ----------
const RERANK_SYSTEM = `
You are Mouse-Fit Re-Ranker. Re-score candidates for the user's grip/hand.
Fingertip: prefer very light, compact, low rear mass; penalize heavy/tall rear hump.
Claw: prefer medium length, defined center/rear hump, narrow waist; avoid very flat shells.
Palm: prefer fuller rear hump and volume; penalize low/flat humps.
Return STRICT JSON only.
`.trim();

app.post("/api/rerank", async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing GROQ_API_KEY on server" });

    const { profile = {}, candidates = [] } = req.body || {};
    if (!Array.isArray(candidates) || !candidates.length) {
      return res.status(400).json({ error: "No candidates" });
    }

    const query = profileToQuery(profile);
    const prefs = {
      grip: profile.grip || null,
      wireless: profile.wireless ?? null,
      targetWeight: profile.targetWeight || null,
    };

    const ret = await retrieve(query, prefs, 24);
    const allow = new Set(candidates.map((c) => (c.id || "").toLowerCase()));
    const ctxDocs = ret.filter((r) => allow.has(r.id)).slice(0, 12);
    const ctx = ctxDocs
      .map((d) => `[#${d.id}]\n${d.text.split("\n").slice(0, 28).join("\n")}`)
      .join("\n\n---\n\n");

    const userMsg = {
      role: "user",
      content: `Profile: ${query || "(unspecified)"}\n\nCANDIDATES:\n${JSON.stringify(
        candidates.slice(0, 12),
        null,
        2
      )}\n\nCONTEXT:\n${ctx}\n\nReturn JSON {grip, ranked:[{id,score,reason,flags:[]},...], best_id}. No prose.`,
    };

    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: RERANK_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: RERANK_SYSTEM },
          { role: "system", content: "Use [#id] only inside reason if citing a doc." },
          userMsg,
        ],
      }),
    });

    if (!r.ok) {
      return res.status(500).json({ error: await r.text() });
    }

    const data = await r.json();
    const payload = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    const idset = new Set(candidates.map((c) => c.id));
    const ranked = (payload.ranked || [])
      .filter((x) => idset.has(x.id))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    const best_id = ranked[0]?.id || candidates[0].id;

    res.json({ grip: payload.grip ?? profile.grip ?? null, ranked, best_id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Two-paragraph report ----------
const REPORT_SYSTEM = `
You are Mouse-Fit Report Generator.
Output EXACTLY two paragraphs:
P1: a short list of matching types/models (use bullet dots • separated by space).
P2: ONE best pick with suggested grips, brand, notable colorways if known, and a one-sentence reason grounded in context.
If unknown, omit rather than guessing. No headings, no tables, no extra lines.
`.trim();

app.post("/api/report", async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing GROQ_API_KEY on server" });

    const { profile = {}, candidates = [] } = req.body || {};
    const query = profileToQuery(profile);
    const prefs = {
      grip: profile.grip || null,
      wireless: profile.wireless ?? null,
      targetWeight: profile.targetWeight || null,
    };

    const ret = await retrieve(query, prefs, 12);
    const allow = new Set(candidates.map((c) => (c.id || "").toLowerCase()));
    const narrowed = allow.size ? ret.filter((r) => allow.has(r.id)) : ret;

    const ctx = (narrowed.length ? narrowed : ret)
      .slice(0, 8)
      .map((r) => `[#${r.id}]\n${r.text.split("\n").slice(0, 24).join("\n")}`)
      .join("\n\n---\n\n");

    const candidateSummary = candidates
      .slice(0, 5)
      .map((c) => `• ${c.brand} ${c.model}`)
      .join(" ");

    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: RERANK_MODEL,
        temperature: 0.3,
        messages: [
          { role: "system", content: REPORT_SYSTEM },
          { role: "system", content: `CONTEXT:\n${ctx}` },
          {
            role: "user",
            content: `User profile: ${query || "(unspecified)"}\nCandidates: ${
              candidateSummary || "(none)"
            }\nWrite exactly two paragraphs.`,
          },
        ],
      }),
    });

    if (!r.ok) {
      return res.status(500).json({ error: await r.text() });
    }

    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || "";
    res.json({ report: reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Start (local) + export (Vercel/serverless)
// -----------------------------------------------------
const IS_SERVERLESS = !!process.env.VERCEL; // Vercel sets this

if (!IS_SERVERLESS) {
  app.listen(PORT, () => {
    const masked = (process.env.GROQ_API_KEY || "").slice(0,4) + "…" + (process.env.GROQ_API_KEY || "").slice(-4);
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`GROQ key present: ${Boolean(process.env.GROQ_API_KEY)} (${process.env.GROQ_API_KEY ? masked : "missing"})`);
  });
}

// IMPORTANT: always export the Express app for serverless platforms
export default app;


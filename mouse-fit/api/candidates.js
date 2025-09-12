// ---- RAG → candidates (from server/rag/sources) ----
import { retrieve } from "./rag/index.mjs"; // you already have this

function isMouseDoc(txt = "") {
  const t = String(txt).toLowerCase();
  // must mention “mouse” somewhere; reject obvious non-mouse domains
  if (!t.includes("mouse")) return false;
  if (/(keyboard|keycap|switch|headset|earbud|monitor|chair|tennis|racket|knife|goggles|phone|laptop)/i.test(t)) {
    return false;
  }
  return true;
}

function parseDims(txt = "") {
  const m = txt.match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/);
  return m ? { length_mm: +m[1], width_mm: +m[2], height_mm: +m[3] } : {};
}
function parseWeight(txt = "") {
  const m = txt.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  return m ? +m[1] : undefined;
}
function parseShape(txt = "") {
  const t = txt.toLowerCase();
  if (/(sym|ambidex)/.test(t)) return "sym";
  if (/ergo/.test(t)) return "ergo";
  return undefined;
}
function parseBrandModel(titleOrFirstLine = "") {
  // expects lines like "Razer Viper V2 Pro" or similar
  const s = titleOrFirstLine.trim().replace(/[#*>\-•]+/g, "").trim();
  const parts = s.split(/\s+/);
  if (parts.length < 2) return { brand: "", model: "" };
  return { brand: parts[0], model: parts.slice(1).join(" ") };
}

function normalizeDoc(r) {
  // r: { id, text, title? }
  const firstLine = (r.title || r.text.split("\n")[0] || "").trim();
  const { brand, model } = parseBrandModel(firstLine);
  const t = r.text || "";
  const dims = parseDims(t);
  const weight_g = parseWeight(t);
  const shape = parseShape(t);
  const id = (r.id || `${brand}-${model}`).toLowerCase();
  return { id, brand, model, ...dims, weight_g, shape };
}

app.post("/api/candidates", async (req, res) => {
  try {
    const { profile = {}, k = 48 } = req.body || {};
    const query = [
      profile.grip ? `grip ${profile.grip}` : "",
      profile.length_mm ? `length ${profile.length_mm}mm` : "",
      profile.width_mm ? `width ${profile.width_mm}mm` : "",
      "mouse"
    ].filter(Boolean).join(", ");

    const raw = await retrieve(query, { grip: profile.grip ?? null }, k);
    const filtered = raw.filter(d => isMouseDoc(d.text));
    const normalized = filtered.map(normalizeDoc)
      .filter(c => c.brand && c.model);

    // de-dupe by id
    const map = new Map();
    for (const c of normalized) if (!map.has(c.id)) map.set(c.id, c);

    const candidates = Array.from(map.values());
    if (!candidates.length) return res.status(404).json({ error: "No mouse candidates found from RAG." });
    res.json({ candidates });
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

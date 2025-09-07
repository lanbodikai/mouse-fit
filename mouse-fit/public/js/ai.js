// ai_local.js — Uses local Ollama (http://localhost:11434) with Llama 3.2
// Loads your MICE DB, prunes to good candidates, and asks the LLM to pick + explain.

const OLLAMA_API = "http://localhost:11434/api";
const MODEL = "llama3.2";

let MICE = [];
try {
  const mod = await import("./mice.js");
  MICE = mod.MICE || [];
} catch {
  console.warn("mice.js missing — candidate list will be empty.");
}

const $ = (id) => document.getElementById(id);
const statusEl = $("llamaStatus");
const setupCard = $("setup");
const picksEl = $("picks");
const whyEl = $("why");
const goBtn = $("go");
const testBtn = $("test");

// ---- small heuristics to keep prompt short & relevant ----
function roughPass(m, grip){
  const L = m.length_mm ?? m.length ?? 999;
  const WT= m.weight_g  ?? m.weight ?? 999;
  if (grip === "fingertip") return L <= 121 && WT <= 70;
  if (grip === "claw")      return L >= 112 && L <= 130;
  if (grip === "palm")      return L >= 116;
  return true;
}

function preScore(m, grip, lenMm, widMm){
  const L = m.length_mm ?? m.length ?? 120;
  const W = m.width_mm  ?? m.width  ?? 62;
  const WT= m.weight_g  ?? m.weight ?? 65;
  const ideal = {palm:0.63*lenMm, claw:0.61*lenMm, fingertip:0.54*lenMm}[grip];
  const tol   = {palm:0.09*lenMm, claw:0.10*lenMm, fingertip:0.11*lenMm}[grip];
  const sLen = 100*Math.max(0, 1 - Math.abs(L-ideal)/tol);
  const sWid = 90 - Math.abs(W - widMm*0.9)*0.8;
  let bonus = 0;
  if ((m.shape||"").toLowerCase()==="ergo" && (grip==="palm"||grip==="claw")) bonus+=3;
  if ((m.shape||"").toLowerCase()==="sym") bonus+=2;
  if (WT<=60) bonus+=4;
  return Math.round(0.55*sLen + 0.2*sWid + bonus);
}

function topCandidates(grip, lenMm, widMm, max=18){
  return MICE
    .filter(m => roughPass(m, grip))
    .sort((a,b)=> preScore(b,grip,lenMm,widMm) - preScore(a,grip,lenMm,widMm))
    .slice(0, max);
}

// ---- Ollama helpers ----
async function ollamaUp(timeoutMs=800){
  const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${OLLAMA_API}/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    clearTimeout(t);
    return false;
  }
}

function sysPrompt(){
  return `You are MouseFit AI. Choose the best gaming mice from OPTIONS.
Return STRICT JSON only (no extra text):
{
  "picks":[{"name":"<brand model>", "score": <0-100>, "reason":"one-liner"}],
  "reasoning":"1-3 short sentences"
}
Guidelines:
• Respect hand size, grip, and preferences (smaller/larger, lighter/heavier, lower/higher hump, narrower/wider).
• Prefer high-quality/popular picks when tied (Logitech, Razer; then Vaxee, Lamzu, Pulsar, Zowie; then WLmouse/ATK/etc.).
• Sym ambi can work in palm/claw; ergo is fine for palm and many claw users.
• Avoid obviously too large/small or heavy vs the ask.`;
}

function userPrompt(lenCm, widCm, grip, currentMouse, prefs, options){
  const lines = [];
  lines.push("USER:");
  lines.push(`hand_len_cm=${lenCm}, hand_wid_cm=${widCm}`);
  lines.push(`grip=${grip.includes("relaxed") ? "claw" : grip}`);
  lines.push(`current_mouse=${currentMouse || "none"}`);
  lines.push(`preferences=${prefs.length? prefs.join(", "): "none"}`);
  lines.push("");
  lines.push("OPTIONS (pick up to 6):");
  options.forEach((m,i)=>{
    const name = `${m.brand||""} ${m.model||m.name||""}`.trim();
    const L=m.length_mm??m.length??"?", W=m.width_mm??m.width??"?", H=m.height_mm??m.height??"?", WT=m.weight_g??m.weight??"?";
    const tags = Array.isArray(m.tags)&&m.tags.length? ` — tags:${m.tags.join("/")}`:"";
    lines.push(`${i+1}) ${name} — ${WT} g — ${L}×${W}×${H} mm — ${m.shape||"?"}${tags}`);
  });
  lines.push("");
  lines.push("Return JSON only.");
  return lines.join("\n");
}

async function chatOllama(system, user){
  const body = {
    model: MODEL,
    stream: false,
    options: { temperature: 0.2, num_ctx: 4096 },
    messages: [
      { role:"system", content: system },
      { role:"user",   content: user }
    ]
  };
  const r = await fetch(`${OLLAMA_API}/chat`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Ollama HTTP ${r.status}`);
  const data = await r.json();  // {message:{content:"..."}}
  return (data?.message?.content) || "{}";
}

// ---- UI wiring ----
async function refreshStatus(){
  const ok = await ollamaUp();
  if (ok) {
    statusEl.innerHTML = `Local Llama: <span class="ok">connected</span>`;
    setupCard.classList.add("hidden");
  } else {
    statusEl.innerHTML = `Local Llama: <span class="err">not found</span>`;
    setupCard.classList.remove("hidden");
  }
}
await refreshStatus();
testBtn.onclick = refreshStatus;

goBtn.onclick = async () => {
  picksEl.innerHTML = ""; whyEl.textContent = "";
  const lenCm = parseFloat($("len").value);
  const widCm = parseFloat($("wid").value);
  let grip = $("grip").value.toLowerCase();
  if (grip.includes("relaxed")) grip = "claw";
  const cur = $("cur").value.trim();
  const prefs = ($("prefs").value||"").split(",").map(s=>s.trim()).filter(Boolean);

  if (Number.isNaN(lenCm) || Number.isNaN(widCm)) return alert("Enter valid cm numbers.");

  // Build options for the prompt
  const options = topCandidates(grip, lenCm*10, widCm*10, 18);

  // If Ollama is down, show setup help
  if (!(await ollamaUp())) {
    setupCard.classList.remove("hidden");
    alert("Local Llama not reachable. See setup panel.");
    return;
  }

  try {
    const content = await chatOllama(sysPrompt(), userPrompt(lenCm, widCm, grip, cur, prefs, options));
    let parsed;
    try { parsed = JSON.parse(content); }
    catch { throw new Error("Model returned non-JSON. Ensure OLLAMA_ORIGINS is set and try again."); }

    const picks = parsed.picks || [];
    picks.slice(0,6).forEach(p=>{
      const li = document.createElement("li");
      li.innerHTML = `<b>${p.name}</b> <small>(${Math.round(p.score||0)})</small> — ${p.reason||""}`;
      picksEl.appendChild(li);
    });
    whyEl.textContent = parsed.reasoning || "";
  } catch (e) {
    console.error(e);
    alert("Error talking to local Llama. Check Ollama is running and CORS is configured.");
  }
};

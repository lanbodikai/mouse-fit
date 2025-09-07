// ai.js — neat UI + resilient Ollama call (llama3.2)
// Works from localhost (http) and GitHub Pages (https) with clear status.

const $ = (id) => document.getElementById(id);

const statusPill = $("status");
const modelPill  = $("modelPill");
const chatEl     = $("chat");

const lenEl = $("len");
const widEl = $("wid");
const gripEl = $("grip");
const curEl = $("current");
const prefsEl = $("prefs");

// Try to detect if Ollama is reachable at http://localhost:11434
const OLLAMA_URL = "http://localhost:11434";
const MODEL = "llama3.2";

async function checkOllama() {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { method: "GET" });
    if (!r.ok) throw new Error(r.statusText);
    statusPill.textContent = "Local AI: ready";
    statusPill.classList.remove("status-bad");
    statusPill.classList.add("status-ok");
    modelPill.textContent = `Model: ${MODEL} via Ollama (local)`;
    return true;
  } catch {
    statusPill.textContent = "Local AI unavailable (run: ollama run llama3.2)";
    statusPill.classList.remove("status-ok");
    statusPill.classList.add("status-bad");
    modelPill.textContent = "Model: (not connected)";
    return false;
  }
}

function fromLastMeasurement() {
  // your existing keys
  const measure = JSON.parse(localStorage.getItem("mousefit:measure") || "{}");
  if (measure.len_cm) lenEl.value = measure.len_cm;
  if (measure.wid_cm) widEl.value = measure.wid_cm;

  const prefGrip = JSON.parse(localStorage.getItem("mousefit:grip_pref") || "{}");
  if (prefGrip.grip) {
    const v = (prefGrip.relaxed && prefGrip.grip === "claw") ? "relaxed claw" : prefGrip.grip;
    gripEl.value = v;
  }
}

function clearAll() {
  lenEl.value = "";
  widEl.value = "";
  gripEl.value = "";
  curEl.value = "";
  prefsEl.value = "";
  chatEl.textContent = "Tell me your hand, grip and constraints, then hit “Get suggestions”.";
}

function buildPrompt() {
  const len = lenEl.value.trim();
  const wid = widEl.value.trim();
  const grip = gripEl.value.trim();
  const cur = curEl.value.trim();
  const prefs = prefsEl.value.trim();

  return `
You are MouseFit AI, a concise and practical mouse-fitting assistant.
User hand length: ${len || "?"} cm
User palm width: ${wid || "?"} cm
User grip: ${grip || "?"}
Current mouse: ${cur || "?"}
Preferences/notes: ${prefs || "-"}

Return:
1) 6–10 recommended mice ordered by fit quality (best first). Prefer big brands first (Razer, Logitech), then Vaxee/Lamzu/Pulsar/Zowie/G-Wolves, then small makers (WLmouse/ATK/Steelseries).
2) For each: one-line why it fits (length/width/height/weight/shape relevant to the user).
3) Keep it tight, bullet points only. Avoid discontinued/obscure models unless highly relevant.
`;
}

async function askOllama(prompt) {
  // stream = false → simpler implementation, reliable in browsers
  const body = { model: MODEL, prompt, stream: false, options: { temperature: 0.2 } };
  const r = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const data = await r.json();
  return data.response || "(no response)";
}

$("fill").addEventListener("click", () => {
  fromLastMeasurement();
});

$("clear").addEventListener("click", () => {
  clearAll();
});

$("go").addEventListener("click", async () => {
  const ok = await checkOllama();
  if (!ok) {
    chatEl.textContent = "Local AI is not reachable. Start it with:\n\n  ollama run llama3.2\n\nOr open this page from http://localhost (not https).";
    return;
  }
  const prompt = buildPrompt();
  chatEl.textContent = "Thinking…";
  try {
    const text = await askOllama(prompt);
    chatEl.textContent = text;
  } catch (e) {
    chatEl.textContent = "Request failed. If you are on HTTPS (GitHub Pages), browsers block http://localhost calls.\nOpen the site from http://localhost or use a small local proxy.";
  }
});

// init
checkOllama();
// helpful if user has just measured
fromLastMeasurement();

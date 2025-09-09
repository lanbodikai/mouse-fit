// public/js/ai.js  (drop-in)
// Works with /api/chat served by your Node proxy (server/groq-proxy.mjs).

const $ = (q) => document.querySelector(q);
const messagesEl = $("#messages");
const inputEl = $("#prompt");
const sendBtn = $("#sendBtn");
const clearBtn = $("#clearChat");

const LS_KEY = "mousefit:ai_history";
let history = [];
try { history = JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch {}

function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(history)); } catch {}
}

function el(tag, cls) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
}

function renderMsg(role, content) {
  const wrap = el("div", `msg ${role}`);
  const roleEl = el("div", "role");
  roleEl.textContent = role === "user" ? "You" : "Assistant";
  const textEl = el("div", "text");
  textEl.textContent = content;
  wrap.appendChild(roleEl);
  wrap.appendChild(textEl);
  messagesEl.appendChild(wrap);
}

function push(role, content) {
  const m = { role, content };
  history.push(m);
  renderMsg(role, content);
  persist();
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function boot() {
  if (history.length === 0) {
    push("assistant", "Hi! Ask me about mouse sizing, grip style, or anything else.");
  } else {
    for (const m of history) renderMsg(m.role, m.content);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

async function sendToServer(messages, opts = {}) {
  // Relative path works locally (Vite proxy -> http://localhost:3000)
  // and in production (same origin: https://mousefit.pro/api/chat).
  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      ...(opts.model ? { model: opts.model } : {}),
      ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
    }),
  });

  if (!r.ok) {
    let err = "Request failed";
    try {
      const body = await r.json();
      err = body?.error || err;
    } catch (_) {}
    throw new Error(err);
  }

  // Support both streaming plaintext and JSON `{ reply }`
  const ctype = r.headers.get("content-type") || "";
  const canStream = r.body && !ctype.includes("application/json");

  if (canStream) {
    const wrap = el("div", "msg assistant");
    const roleEl = el("div", "role");
    roleEl.textContent = "Assistant";
    const textEl = el("div", "text");
    wrap.appendChild(roleEl);
    wrap.appendChild(textEl);
    messagesEl.appendChild(wrap);

    const placeholder = { role: "assistant", content: "" };
    history.push(placeholder); // update as chunks arrive

    const reader = r.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      textEl.textContent += chunk;
      placeholder.content += chunk;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    persist();
    return placeholder.content;
  } else {
    const data = await r.json();
    return data?.reply ?? "";
  }
}

async function onSend() {
  const text = (inputEl.value || "").trim();
  if (!text) return;

  inputEl.value = "";
  push("user", text);

  // Build message list with a short window so we don't send giant histories
  const windowSize = 12;
  const recent = history.slice(-windowSize);

  try {
    const reply = await sendToServer(recent, { temperature: 0.6 });
    // If non-stream path, display the assistant reply now:
    if (reply && (history.length === 0 || history[history.length - 1].role !== "assistant" || history[history.length - 1].content !== reply)) {
      push("assistant", reply);
    }
  } catch (e) {
    push("assistant", `(error) ${e.message || String(e)}`);
  }
}

function onKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    onSend();
  }
}

function onClear() {
  history = [];
  persist();
  messagesEl.innerHTML = "";
  push("assistant", "Chat cleared. What would you like to ask next?");
}

sendBtn?.addEventListener("click", onSend);
inputEl?.addEventListener("keydown", onKeydown);
clearBtn?.addEventListener("click", onClear);

boot();

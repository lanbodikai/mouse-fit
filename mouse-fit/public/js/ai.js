// public/htmls/js/ai.js
const $ = (q) => document.querySelector(q);
const messagesEl = $("#messages");
const inputEl = $("#prompt");
const sendBtn = $("#sendBtn");
const clearBtn = $("#clearChat");

const LS_KEY = "mousefit:ai_history";
let history = [];
try { history = JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch {}

function renderMsg(role, content) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${role}`;
  wrap.innerHTML = `<div class="role">${role === "user" ? "You" : "Assistant"}</div><div class="text"></div>`;
  wrap.querySelector(".text").textContent = content;
  messagesEl.appendChild(wrap);
}

function persist() { localStorage.setItem(LS_KEY, JSON.stringify(history.slice(-50))); }

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
boot();

clearBtn?.addEventListener("click", () => {
  history = [];
  localStorage.removeItem(LS_KEY);
  messagesEl.innerHTML = "";
  push("assistant", "Chat cleared. How can I help?");
});

sendBtn?.addEventListener("click", send);
inputEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
});

async function send() {
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = "";

  // user message
  push("user", text);

  // streaming placeholder
  const placeholder = { role: "assistant", content: "" };
  history.push(placeholder);
  const bubble = document.createElement("div");
  bubble.className = "msg assistant";
  bubble.innerHTML = `<div class="role">Assistant</div><div class="text" id="__stream"></div>`;
  messagesEl.appendChild(bubble);
  const streamEl = $("#__stream");

  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) })
    });
    if (!resp.ok || !resp.body) throw new Error((await resp.text().catch(() => "")) || "Network error");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      streamEl.textContent += chunk;
      placeholder.content += chunk;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    persist();
  } catch (err) {
    streamEl.textContent = `(error) ${err.message || err}`;
  }
}

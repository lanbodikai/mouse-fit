import { apiJson } from "./api-client.js";

const $ = (selector) => document.querySelector(selector);
const messagesEl = $("#messages");
const inputEl = $("#prompt");
const sendBtn = $("#sendBtn");
const clearBtn = $("#clearChat");
const badgeEl = $("#modelBadge");

const chatHistory = [];

function scrollToBottom() {
  if (!messagesEl) return;
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendMessage(role, content) {
  if (!messagesEl) return;
  const wrapper = document.createElement("div");
  wrapper.className = `msg ${role}`;

  const roleEl = document.createElement("div");
  roleEl.className = "role";
  roleEl.textContent = role === "user" ? "You" : "Assistant";

  const textEl = document.createElement("div");
  textEl.className = "text";
  textEl.textContent = content;

  wrapper.appendChild(roleEl);
  wrapper.appendChild(textEl);
  messagesEl.appendChild(wrapper);
  scrollToBottom();
}

function resetChat() {
  chatHistory.length = 0;
  if (messagesEl) messagesEl.innerHTML = "";
  appendMessage(
    "assistant",
    "Tell me your hand size, grip style, and budget, and I will recommend the best mouse options from the backend model."
  );
}

function toMessagesPayload() {
  const recent = chatHistory.slice(-12);
  return recent.map((item) => ({ role: item.role, content: item.content }));
}

async function sendMessage(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return;

  if (/^\s*(restart|reset|clear)\s*$/i.test(text)) {
    resetChat();
    return;
  }

  appendMessage("user", text);
  chatHistory.push({ role: "user", content: text });
  if (sendBtn) sendBtn.setAttribute("disabled", "true");

  try {
    const data = await apiJson("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: toMessagesPayload(),
        temperature: 0.5,
      }),
    });
    const reply = String(data?.reply || "I couldn't generate a response right now.");
    appendMessage("assistant", reply);
    chatHistory.push({ role: "assistant", content: reply });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    appendMessage("assistant", `Request failed: ${msg}`);
  } finally {
    if (sendBtn) sendBtn.removeAttribute("disabled");
  }
}

function onSend() {
  if (!inputEl) return;
  const text = inputEl.value;
  inputEl.value = "";
  sendMessage(text);
}

function onKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    onSend();
  }
}

function boot() {
  if (badgeEl) badgeEl.textContent = "Backend chat endpoint: /api/chat";
  resetChat();
}

sendBtn?.addEventListener("click", onSend);
inputEl?.addEventListener("keydown", onKeydown);
clearBtn?.addEventListener("click", resetChat);

boot();

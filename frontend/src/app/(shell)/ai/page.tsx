"use client";

import Script from "next/script";
import { ShellNav } from "@/components/shell/ShellNav";

const styles = `
:root {
  --bg: var(--bg0);
  --fg: var(--text-primary);
  --sub: var(--text-secondary);
  --border: var(--border-color);
  --accent: var(--accent-gamer);
  --accent-soft: var(--accent-gamer-fill);
  --accent-soft-strong: var(--accent-gamer-fill-strong);
  --surface: var(--surface-soft);
  --surface-elevated: var(--surface-strong);
  --surface-focused: var(--surface-veil);
  --on-surface: var(--overlay-text);
  --glow: var(--accent-gamer-glow);
}

.tool-shell, .tool-shell * { box-sizing: border-box; }

.tool-shell {
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  font-family: 'Sora', system-ui, Arial;
  color: var(--fg);
  max-width: 1040px;
  padding: clamp(12px, 1.8vw, 20px) clamp(12px, 1.8vw, 22px) clamp(14px, 2vw, 24px);
}

.main-content {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}

.ai-grid {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(250px, 310px) minmax(0, 1fr);
  gap: 18px;
  padding: 14px 0;
}

.agent-panel {
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  backdrop-filter: blur(10px);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
}

.kicker {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.kicker::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}

.agent-panel h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.15;
  font-weight: 600;
}

.agent-panel p {
  margin: 0;
  color: var(--sub);
  font-size: 13px;
  line-height: 1.5;
}

#modelBadge {
  margin-top: 2px;
  font-size: 11px;
  color: var(--accent);
  opacity: 0.85;
}

.quick-title {
  margin-top: 2px;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.quick-prompts {
  display: grid;
  gap: 8px;
}

.prompt-chip {
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--on-surface);
  font-size: 12px;
  text-align: left;
  line-height: 1.45;
  padding: 9px 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.prompt-chip:nth-child(2) { border-left-color: var(--accent-violet, #8b5cf6); }
.prompt-chip:nth-child(3) { border-left-color: var(--accent-amber, #f59e0b); }

.prompt-chip:hover {
  background: var(--accent-soft-strong);
  border-color: var(--accent);
}

.chat-wrap {
  min-width: 0;
  display: flex;
}

.chat-card {
  width: 100%;
  min-height: 0;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  position: relative;
}

.card-head::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 60px;
  height: 2px;
  border-radius: 1px;
  background: linear-gradient(90deg, var(--accent), var(--accent-violet, #8b5cf6));
}

.title {
  font-weight: 600;
  font-size: 13px;
  color: var(--accent);
}

.clear-btn {
  padding: 6px 11px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--accent-soft);
  color: var(--on-surface);
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: var(--accent-soft-strong);
  border-color: var(--accent);
}

.messages {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.msg {
  max-width: 86%;
  padding: 12px 16px;
  border-radius: 14px;
  line-height: 1.45;
  font-size: 12px;
}

.msg.user {
  margin-left: auto;
  background: var(--accent-soft-strong);
  border: 1px solid var(--border);
  border-bottom-right-radius: 5px;
}

.msg.assistant {
  margin-right: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-bottom-left-radius: 5px;
}

.msg .role {
  font-size: 10px;
  opacity: 0.55;
  margin-bottom: 3px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.inputbar {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  padding: 14px;
  border-top: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
}

textarea {
  flex: 1;
  min-height: 40px;
  max-height: 130px;
  padding: 10px 11px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--on-surface);
  outline: none;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s;
  font-size: 12px;
}

textarea:focus {
  border-color: var(--accent);
  background: var(--surface-focused);
}

textarea::placeholder { color: var(--sub); }

.send {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--border);
  cursor: pointer;
  background: var(--accent-soft-strong);
  color: var(--accent);
  font-size: 14px;
  display: grid;
  place-items: center;
  transition: all 0.2s;
}

.send:hover {
  background: var(--accent);
  color: var(--bg);
  box-shadow: 0 0 12px var(--accent-soft-strong);
}

.recommendations {
  padding-left: 18px;
  margin: 8px 0;
}

.recommendations li { margin-bottom: 10px; }

.recommendations .detail {
  font-size: 0.82em;
  color: var(--sub);
  margin-bottom: 3px;
}

.foot {
  flex-shrink: 0;
  padding: 10px;
  text-align: center;
  font-size: 11px;
  color: var(--sub);
}

@media (max-width: 980px) {
  .tool-shell { max-width: 100%; }
  .ai-grid {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 6px 0;
  }
  .agent-panel { max-height: none; }
  .chat-wrap { min-height: 0; }
  .chat-card { min-height: 420px; }
}
`;

const bodyHtml = `
  <div class="main-content">
    <div class="ai-grid">
      <aside class="agent-panel">
        <div class="kicker">MSF Agent</div>
        <h1>AI Mouse Coach</h1>
        <p>Get fit-aware recommendations from your hand size, grip style, and budget.</p>
        <div id="modelBadge"></div>
        <div class="quick-title">Quick Starters</div>
        <div class="quick-prompts">
          <button class="prompt-chip" type="button" data-prompt="I have 19x10cm hands, claw grip, and a $80 budget. Suggest top choices.">
            19x10cm, claw grip, budget $80
          </button>
          <button class="prompt-chip" type="button" data-prompt="I use fingertip grip for FPS and prefer lighter mice.">
            Fingertip FPS, lightweight preference
          </button>
          <button class="prompt-chip" type="button" data-prompt="I want an ergonomic shape for long sessions and less wrist fatigue.">
            Ergonomic options for long sessions
          </button>
        </div>
      </aside>

      <section id="chat" class="chat-wrap">
        <div class="chat-card">
          <div class="card-head">
            <div class="title">MouseFit Assistant</div>
            <button class="clear-btn" id="clearChat">Restart</button>
          </div>
          <div id="messages" class="messages"></div>
          <div class="inputbar">
            <textarea id="prompt" placeholder="Describe your hand size, grip, and goals..."></textarea>
            <button class="send" id="sendBtn">➤</button>
          </div>
        </div>
      </section>
    </div>
  </div>

  <footer class="foot">
    <span>© <span id="y"></span> MouseFit</span>
  </footer>
`;

export default function AiPage() {
  return (
    <>
      <ShellNav currentPage="ai" />
      <div className="h-full min-h-0">
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="tool-shell" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        <Script
          id="ai-year"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: "document.getElementById('y').textContent = new Date().getFullYear();" }}
        />
        <Script
          id="ai-prompt-chips"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `document.querySelectorAll('.prompt-chip').forEach((btn) => {
  btn.addEventListener('click', () => {
    const prompt = document.getElementById('prompt');
    if (!prompt) return;
    const text = btn.getAttribute('data-prompt') || '';
    prompt.value = text;
    prompt.focus();
  });
});`,
          }}
        />
        <Script type="module" src="/src/js/ai.js" strategy="afterInteractive" />
      </div>
    </>
  );
}

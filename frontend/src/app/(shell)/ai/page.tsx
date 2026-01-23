"use client";

import Script from "next/script";
import { ShellNav } from "@/components/shell/ShellNav";

const styles = `
:root {
  --bg: #030806;
  --fg: #eaf0ff;
  --sub: #6b8068;
  --border: rgba(34, 197, 94, 0.15);
  --accent: #22c55e;
  --g1: #22c55e;
  --g2: #10b981;
  --g3: #14b8a6;
}

.tool-shell, .tool-shell * { box-sizing: border-box; }

.tool-shell {
  height: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  font-family: 'Sora', system-ui, Arial;
  color: #fff;
  overflow: hidden;
}

.main-content {
  flex: 1 1 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  overflow: hidden;
}

.hero {
  flex: 0 0 auto;
  max-width: 560px;
  margin: 0;
  padding: 0;
  text-align: left;
}

.hero h1 {
  margin: 4px 0 8px;
  font-size: 36px;
  letter-spacing: -0.02em;
  line-height: 1.1;
  font-weight: 300;
}

.hero h1 .ai {
  background: linear-gradient(90deg, var(--accent), var(--g3));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-weight: 600;
}

.hero p {
  margin: 0;
  color: var(--sub);
  line-height: 1.55;
  font-size: 14px;
}

.hero .note {
  margin-top: 10px;
  font-size: 13px;
  color: var(--sub);
  font-family: 'JetBrains Mono', monospace;
  opacity: 0.8;
  padding: 12px 16px;
  background: rgba(34, 197, 94, 0.05);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.chat-wrap {
  flex: 1 1 auto;
  width: 100%;
  max-width: 600px;
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: flex-end;
}

.chat-card {
  border: 1px solid var(--border);
  border-radius: 24px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: rgba(34, 197, 94, 0.05);
}

.card-head .title {
  font-weight: 600;
  font-size: 14px;
  color: var(--accent);
}

.clear-btn {
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(34, 197, 94, 0.1);
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: rgba(34, 197, 94, 0.2);
  border-color: var(--accent);
}

.messages {
  height: min(50vh, 500px);
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.msg {
  max-width: 85%;
  padding: 14px 18px;
  border-radius: 16px;
  line-height: 1.5;
  font-size: 14px;
}

.msg.user {
  margin-left: auto;
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid var(--border);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.msg.assistant {
  margin-right: auto;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border);
  color: var(--fg);
  border-bottom-left-radius: 4px;
}

.msg .role {
  font-size: 0.7rem;
  opacity: 0.5;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.inputbar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 16px;
  border-top: 1px solid var(--border);
  background: rgba(34, 197, 94, 0.05);
}

textarea {
  flex: 1;
  min-height: 48px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  outline: none;
  font-family: inherit;
  resize: none;
  transition: all 0.2s;
  font-size: 14px;
}

textarea:focus {
  border-color: var(--accent);
  background: rgba(0, 0, 0, 0.6);
}

textarea::placeholder {
  color: var(--sub);
}

.send {
  width: 50px;
  height: 50px;
  border-radius: 16px;
  border: 1px solid var(--border);
  cursor: pointer;
  background: rgba(34, 197, 94, 0.2);
  color: var(--accent);
  font-size: 18px;
  display: grid;
  place-items: center;
  transition: all 0.2s;
}

.send:hover {
  background: var(--accent);
  color: #000;
}

.recommendations {
  padding-left: 20px;
  margin: 10px 0;
}

.recommendations li {
  margin-bottom: 12px;
}

.recommendations .detail {
  font-size: 0.85em;
  color: var(--sub);
  margin-bottom: 4px;
}

.ai-flex {
  flex: 1 1 auto;
  width: 100%;
  margin: 0;
  padding: 24px clamp(24px, 5vw, 80px) 24px;
  display: flex;
  gap: 40px;
  align-items: flex-start;
  justify-content: space-between;
}

@media (max-width: 1000px) {
  .ai-flex {
    flex-direction: column;
    margin-top: 16px;
    gap: 32px;
    padding: 24px 20px 40px;
  }
  .hero, .chat-wrap {
    max-width: 100%;
  }
  .chat-wrap {
    justify-content: center;
  }
  .chat-card {
    max-width: 100%;
  }
}

.foot {
  flex-shrink: 0;
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: var(--sub);
}
`;

const bodyHtml = `
  <div class="main-content">
    <div class="ai-flex">
      <section class="hero">
        <h1>Chat with <span class="ai">AI</span></h1>
        <p>Natural language recommendations powered by Llama 3.3</p>
        <p class="note">"I have 19x10cm hands and use claw grip. Budget $80."</p>
        <div id="modelBadge" style="margin-top:12px; font-size:12px; color:var(--accent); opacity:0.8;"></div>
      </section>

      <section id="chat" class="chat-wrap">
        <div class="chat-card">
          <div class="card-head">
            <div class="title">MouseFit Assistant</div>
            <div class="controls">
              <button class="clear-btn" id="clearChat">Restart</button>
            </div>
          </div>
          <div id="messages" class="messages"></div>
          <div class="inputbar">
            <textarea id="prompt" placeholder="Describe your needs..."></textarea>
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
      <div className="h-full">
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="tool-shell" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        <Script
          id="ai-year"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: "document.getElementById('y').textContent = new Date().getFullYear();" }}
        />
        <Script type="module" src="/src/js/ai.js" strategy="afterInteractive" />
      </div>
    </>
  );
}

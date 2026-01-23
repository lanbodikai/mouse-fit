"use client";

import { useEffect } from "react";
import Script from "next/script";
import ReportStoreSync from "@/components/shell/ReportStoreSync";
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
  --neon: linear-gradient(90deg, #22c55e 0%, #10b981 50%, #14b8a6 100%);
}

.tool-shell, .tool-shell * { box-sizing: border-box; }

.tool-shell {
  height: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  font-family: 'Lexend', 'Sora', system-ui, Arial;
  color: var(--fg);
}

.main-content {
  flex: 1 0 auto;
  width: 100%;
}

.hero {
  max-width: 1200px;
  margin: 24px auto 0;
  padding: 0 20px;
  display: grid;
  grid-template-columns: minmax(280px, 480px) 1fr;
  gap: 32px;
  align-items: center;
  position: relative;
}

@media (max-width: 980px) {
  .hero { grid-template-columns: 1fr; gap: 20px; }
}

.blob {
  aspect-ratio: 4/3;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
}

.blob::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 120% at 30% 20%, rgba(34, 197, 94, 0.1), transparent 55%);
  mix-blend-mode: screen;
  pointer-events: none;
}

#snapshot {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: filter 0.3s ease, opacity 0.3s ease;
}

.report-copy {
  position: relative;
  padding: 8px 0;
}

.h1 {
  font-size: 28px;
  margin: 8px 0 12px;
  font-weight: 600;
  color: #fff;
}

.kicker {
  letter-spacing: 0.2em;
  font-size: 11px;
  opacity: 0.9;
  color: var(--accent);
  margin-bottom: 8px;
  text-transform: uppercase;
  font-weight: 600;
}

.ghost {
  position: absolute;
  right: 0;
  top: -10px;
  font-size: 80px;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 1px rgba(34, 197, 94, 0.1);
  text-stroke: 1px rgba(34, 197, 94, 0.1);
  pointer-events: none;
  user-select: none;
}

.stats {
  margin-top: 12px;
  display: grid;
  gap: 8px;
  transition: filter 0.25s ease, opacity 0.25s ease;
}

.stats .row {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 14px;
  color: var(--fg);
}

.stats .row strong {
  color: var(--sub);
}

.pill {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid var(--border);
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
}

.grip-thumbs {
  display: none;
  gap: 10px;
  margin-top: 16px;
}

.grip-thumbs img {
  width: 80px;
  height: 54px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(34, 197, 94, 0.05);
  transition: filter 0.25s ease;
}

.btn {
  background: rgba(34, 197, 94, 0.1);
  color: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 12px 18px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 13px;
}

.btn:hover {
  background: rgba(34, 197, 94, 0.2);
  border-color: var(--accent);
}

.btn.neon {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid var(--accent);
  color: var(--accent);
}

.btn.neon:hover {
  background: var(--accent);
  color: #000;
}

.reveal-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 16px;
  flex-wrap: wrap;
}

body[data-revealed="false"] #snapshot { filter: blur(18px) saturate(0.9); }
body[data-revealed="true"] #snapshot { filter: none; }
body[data-revealed="false"] .stats,
body[data-revealed="false"] .grip-thumbs img { filter: blur(12px); }
body[data-revealed="true"] .stats,
body[data-revealed="true"] .grip-thumbs img { filter: none; }

.ai-wrap {
  max-width: 1200px;
  margin: 40px auto 100px;
  padding: 0 20px;
}

.ai-title {
  font-size: 22px;
  margin: 10px 0 8px;
  font-weight: 600;
  color: #fff;
}

.ai-sub {
  color: var(--sub);
  margin: 0 0 16px;
  font-size: 13px;
}

.controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 12px 0 8px;
}

.status {
  font-size: 12px;
  color: var(--sub);
  min-height: 18px;
  white-space: pre-wrap;
}

.ai-card {
  margin-top: 16px;
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 24px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
}

.ai-card h3 {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent);
}

.para {
  white-space: pre-wrap;
  line-height: 1.6;
  color: var(--fg);
  font-size: 14px;
}

.hr {
  height: 1px;
  background: var(--border);
  margin: 16px 0;
  opacity: 0.7;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.chip {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  font-weight: 600;
  color: #fff;
  min-height: 80px;
  background: rgba(0, 0, 0, 0.3);
}

.chip > * { position: relative; z-index: 1; }
.chip .meta { font-weight: 500; color: var(--sub); margin-top: 8px; font-size: 12px; }
.chip .pct { position: absolute; right: 12px; top: 12px; font-weight: 700; font-size: 14px; color: var(--accent); }

.bg-palm::before, .bg-claw::before, .bg-tip::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.4;
  z-index: 0;
  pointer-events: none;
}

.bg-palm::before { background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.2)); }
.bg-claw::before { background: linear-gradient(135deg, rgba(20, 184, 166, 0.3), rgba(6, 182, 212, 0.2)); }
.bg-tip::before { background: linear-gradient(135deg, rgba(34, 211, 238, 0.3), rgba(56, 189, 248, 0.2)); }

.foot {
  flex-shrink: 0;
  padding: 24px;
  text-align: center;
  font-size: 12px;
  color: var(--sub);
}

@media (max-width: 720px) {
  .hero { max-width: 100%; margin: 16px auto 0; padding: 0 16px; grid-template-columns: 1fr; gap: 16px; }
  .blob { aspect-ratio: 3/2; }
  .report-copy { padding: 4px 0; }
  .h1 { font-size: 22px; }
  .stats .row { font-size: 13px; }
  .reveal-bar { gap: 8px; }
  .reveal-bar .btn { flex: 1 1 auto; min-width: 120px; }
  .ai-wrap { margin: 24px auto 80px; padding: 0 16px; }
}
`;

const bodyHtml = `
  <div class="main-content">
    <section class="hero">
      <div class="blob">
        <img id="snapshot" alt="Hand snapshot">
      </div>

      <div class="report-copy">
        <div class="ghost">REPORT</div>
        <div class="kicker">Your Results</div>
        <div class="h1">Hand Measurement & Grip Insight</div>

        <div class="stats" id="measurements">
          <div class="row"><strong>Hand length:</strong> <span id="handLength">—</span> cm</div>
          <div class="row"><strong>Palm width:</strong> <span id="handWidth">—</span> cm</div>
          <div class="row"><strong>Hand size:</strong> <span id="handSize">—</span></div>
          <div class="row"><strong>Suggested grip:</strong> <span id="suggestedGrip">—</span></div>
          <div class="row"><span id="gripPill" class="pill">Grip: not checked</span></div>
        </div>

        <div id="gripThumbs" class="grip-thumbs">
          <img id="gripTop" alt="Top view">
          <img id="gripRight" alt="Right view">
          <img id="gripLeft" alt="Left view">
        </div>

        <div class="reveal-bar">
          <button id="toggleReveal" class="btn neon">Reveal measurements</button>
          <a href="/grip" class="btn">Grip Checker</a>
          <button id="redoBtn" class="btn" onclick="location.href='/measure'">Redo test</button>
        </div>
      </div>
    </section>

    <section class="ai-wrap">
      <div class="ai-title">AI Recommendations</div>
      <p class="ai-sub">Ranked per grip based on your measurements & our RAG-augmented matching rules.</p>

      <div class="controls">
        <button class="btn neon" id="btn-generate">Generate AI Report</button>
        <button class="btn" id="btn-copy">Copy Summary</button>
      </div>
      <div class="status" id="status"></div>

      <div class="ai-card">
        <h3>Summary</h3>
        <div id="p1" class="para"></div>
        <div class="hr"></div>
        <div id="p2" class="para"></div>
      </div>

      <div class="ai-card">
        <h3>Palm Grip</h3>
        <div id="grid-palm" class="grid"></div>
      </div>

      <div class="ai-card">
        <h3>Claw Grip</h3>
        <div id="grid-claw" class="grid"></div>
      </div>

      <div class="ai-card">
        <h3>Fingertip Grip</h3>
        <div id="grid-tip" class="grid"></div>
      </div>
    </section>
  </div>

  <footer class="foot">
    <span>© <span id="y"></span> MouseFit</span>
  </footer>
`;

export default function ReportPage() {
  useEffect(() => {
    document.body.setAttribute("data-revealed", "false");
    return () => document.body.removeAttribute("data-revealed");
  }, []);

  return (
    <>
      <ShellNav currentPage="report" />
      <div className="h-full">
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <ReportStoreSync />
        <div className="tool-shell" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        <Script src="/src/js/report-inline.js" strategy="afterInteractive" />
        <Script type="module" src="/src/js/report-module.js" strategy="afterInteractive" />
      </div>
    </>
  );
}

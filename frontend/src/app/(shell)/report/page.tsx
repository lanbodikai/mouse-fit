"use client";

import Script from "next/script";
import ReportStoreSync from "@/components/shell/ReportStoreSync";
import { ShellNav } from "@/components/shell/ShellNav";

const styles = `
:root {
  --bg: var(--bg0);
  --fg: var(--text-primary);
  --sub: var(--text-secondary);
  --border: var(--border-color);
  --surface: var(--surface-soft);
  --surface-elevated: var(--surface-strong);
  --card: var(--surface);
  --card-strong: var(--surface-elevated);
  --on-surface: var(--overlay-text);
  --accent: var(--accent-gamer);
  --accent-strong: var(--accent-gamer-strong);
  --accent-soft: var(--accent-gamer-fill);
  --accent-soft-strong: var(--accent-gamer-fill-strong);
  --highlight: var(--accent-highlight);
  --highlight-soft: var(--accent-highlight-fill);
  --glow: var(--accent-gamer-glow);
}

.tool-shell, .tool-shell * { box-sizing: border-box; }

.tool-shell {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  font-family: "Sora", "Lexend", system-ui, Arial;
  color: var(--fg);
  padding: clamp(10px, 1.4vw, 16px);
}

.main-content {
  flex: 1 0 auto;
  width: 100%;
  padding: 4px clamp(18px, 2.2vw, 26px) 100px;
}

.btn {
  background: var(--panel2);
  color: var(--on-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 11px 18px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 13px;
}

.btn:hover {
  border-color: var(--accent-gamer-line);
  transform: translateY(-1px);
}

.btn.neon {
  background: var(--accent-gamer-fill);
  border-color: var(--accent-gamer-line);
  color: var(--on-surface);
}

.btn.neon:hover {
  background: var(--accent-soft-strong);
  border-color: var(--accent-gamer-line-strong);
}

.status {
  font-size: 13px;
  color: var(--sub);
  min-height: 20px;
  white-space: pre-wrap;
}

.report-wrap {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  gap: 28px;
}

.top-card {
  position: relative;
  overflow: hidden;
  border-radius: 30px;
  border: 1px solid var(--border);
  background:
    radial-gradient(120% 100% at 8% -16%, var(--accent-soft) 0%, rgba(0, 0, 0, 0) 65%),
    radial-gradient(110% 90% at 90% -20%, var(--highlight-soft) 0%, rgba(0, 0, 0, 0) 66%),
    var(--card-strong);
  padding: 36px;
}

.kicker {
  letter-spacing: 0.22em;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--accent-strong);
  display: flex;
  align-items: center;
  gap: 7px;
}

.kicker::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
}

.h1 {
  margin: 10px 0 10px;
  font-size: clamp(28px, 3.5vw, 44px);
  line-height: 1.1;
  color: var(--on-surface);
  font-weight: 600;
}

.lead {
  margin: 0;
  color: var(--sub);
  font-size: 14px;
  max-width: 720px;
  line-height: 1.55;
}

.top-meta {
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.stats {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
}

.stat {
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--panel);
  padding: 18px 20px;
  min-height: 94px;
  display: grid;
  gap: 6px;
  border-top: 2px solid var(--border);
}

.stat:nth-child(1) { border-top-color: var(--accent); }
.stat:nth-child(2) { border-top-color: var(--accent-violet, #8b5cf6); }
.stat:nth-child(3) { border-top-color: var(--accent-amber, #f59e0b); }
.stat:nth-child(4) { border-top-color: var(--accent-emerald, #34d399); }

.stat-label {
  font-size: 11px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.stat-value {
  font-size: clamp(18px, 2.2vw, 25px);
  line-height: 1.15;
  font-weight: 600;
  color: var(--on-surface);
}

.results-card {
  border-radius: 26px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  background: var(--card);
  padding: 30px;
  backdrop-filter: blur(10px);
}

.results-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.results-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--on-surface);
}

.chosen-grip {
  margin-top: 6px;
  font-size: 14px;
  color: var(--sub);
}

.chosen-grip b {
  color: var(--accent);
  text-transform: capitalize;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.chip {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 18px 18px 16px;
  font-weight: 600;
  color: var(--on-surface);
  min-height: 80px;
  background: var(--surface-elevated);
}

.chip > * { position: relative; z-index: 1; }
.chip .meta { font-weight: 500; color: var(--text-secondary); margin-top: 8px; font-size: 12px; line-height: 1.5; }
.chip .pct {
  position: absolute;
  right: 11px;
  top: 11px;
  font-weight: 700;
  font-size: 14px;
  color: var(--accent);
  padding: 2px 8px;
  border-radius: 8px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-soft-strong);
}
.chip .reason {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-tertiary);
}

.bg-palm::before, .bg-claw::before, .bg-tip::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.3;
  z-index: 0;
  pointer-events: none;
}

.bg-palm::before { background: linear-gradient(135deg, var(--accent-soft), rgba(255, 255, 255, 0.06)); }
.bg-claw::before { background: linear-gradient(135deg, var(--accent-soft), var(--highlight-soft)); }
.bg-tip::before { background: linear-gradient(135deg, var(--highlight-soft), rgba(255, 255, 255, 0.08)); }

.foot {
  flex-shrink: 0;
  padding: 24px 16px;
  text-align: center;
  font-size: 12px;
  color: var(--sub);
}

@media (max-width: 720px) {
  .main-content { padding: 0 14px 80px; }
  .top-card { padding: 20px; border-radius: 24px; }
  .results-card { padding: 18px; border-radius: 22px; }
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .top-meta { justify-content: stretch; }
  .top-meta .btn { width: 100%; }
  .results-title { font-size: 20px; }
  .grid { grid-template-columns: 1fr; }
}
`;

const bodyHtml = `
  <div class="main-content">
    <div class="report-wrap">
      <section class="top-card">
        <div class="kicker">Survey Report</div>
        <h1 class="h1">Your Mouse Fit Analysis</h1>
        <p class="lead">Generated automatically from your latest survey + measurement data, using fit-aware filtering, scoring, and optional chat rerank.</p>

        <div class="stats">
          <div class="stat">
            <div class="stat-label">Hand Length</div>
            <div class="stat-value" id="handLength">—</div>
          </div>
          <div class="stat">
            <div class="stat-label">Palm Width</div>
            <div class="stat-value" id="handWidth">—</div>
          </div>
          <div class="stat">
            <div class="stat-label">Hand Size</div>
            <div class="stat-value" id="handSize">—</div>
          </div>
          <div class="stat">
            <div class="stat-label">Chosen Grip</div>
            <div class="stat-value" id="chosenGrip">—</div>
          </div>
        </div>

        <div class="top-meta">
          <a id="redoBtn" class="btn neon" href="/survey">Redo Test</a>
        </div>
      </section>

      <section class="results-card">
        <div class="results-head">
          <div>
            <h2 class="results-title" id="chosenGripTitle">Chosen Grip Recommendations</h2>
            <div class="chosen-grip">Selected in survey: <b id="chosenGripInline">—</b></div>
          </div>
          <div class="status" id="status"></div>
        </div>
        <div id="grid-grip" class="grid"></div>
      </section>
    </div>
  </div>

  <footer class="foot">
    <span>© <span id="y"></span> MouseFit</span>
  </footer>
`;

export default function ReportPage() {
  const reportScriptVersion = "20260226-survey-matcher-v2";
  return (
    <>
      <ShellNav currentPage="report" />
      <div className="h-full">
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <ReportStoreSync />
        <div className="tool-shell" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        <Script type="module" src={`/src/js/report-module.js?v=${reportScriptVersion}`} strategy="afterInteractive" />
      </div>
    </>
  );
}

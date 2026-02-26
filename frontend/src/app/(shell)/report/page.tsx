"use client";

import Script from "next/script";
import ReportStoreSync from "@/components/shell/ReportStoreSync";
import { ShellNav } from "@/components/shell/ShellNav";

const styles = `
:root {
  --bg: #02040c;
  --fg: #f4f8ff;
  --sub: #a8b3d1;
  --border: rgba(255, 255, 255, 0.14);
  --card: rgba(10, 12, 26, 0.78);
  --card-strong: rgba(8, 10, 20, 0.9);
  --accent: #67f6ff;
  --accent-soft: rgba(103, 246, 255, 0.15);
  --neon: linear-gradient(90deg, #f97316 0%, #d946ef 48%, #22d3ee 100%);
  --glow: 0 0 30px rgba(217, 70, 239, 0.24);
}

.tool-shell, .tool-shell * { box-sizing: border-box; }

.tool-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: "Sora", "Lexend", system-ui, Arial;
  color: var(--fg);
}

.main-content {
  flex: 1 0 auto;
  width: 100%;
  padding: 0 24px 100px;
}

.btn {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
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
  border-color: rgba(255, 255, 255, 0.26);
  transform: translateY(-1px);
}

.btn.neon {
  background: var(--neon);
  border-color: transparent;
  color: #05010b;
  box-shadow: var(--glow);
}

.btn.neon:hover {
  filter: saturate(1.05);
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
  gap: 20px;
}

.top-card {
  position: relative;
  overflow: hidden;
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background:
    radial-gradient(120% 100% at 8% -16%, rgba(217, 70, 239, 0.24) 0%, rgba(217, 70, 239, 0) 65%),
    radial-gradient(110% 90% at 90% -20%, rgba(34, 211, 238, 0.24) 0%, rgba(34, 211, 238, 0) 66%),
    var(--card-strong);
  box-shadow: var(--glow);
  padding: 30px;
}

.kicker {
  letter-spacing: 0.22em;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #f8b4fe;
}

.h1 {
  margin: 10px 0 10px;
  font-size: clamp(28px, 3.5vw, 44px);
  line-height: 1.1;
  color: #fff;
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
  background: rgba(255, 255, 255, 0.02);
  padding: 14px 15px;
  min-height: 94px;
  display: grid;
  gap: 6px;
}

.stat-label {
  font-size: 11px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: #cbd5f5;
}

.stat-value {
  font-size: clamp(18px, 2.2vw, 25px);
  line-height: 1.15;
  font-weight: 600;
  color: #fff;
}

.results-card {
  border-radius: 26px;
  border: 1px solid var(--border);
  background: var(--card);
  padding: 24px;
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
  color: #fff;
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
  gap: 12px;
  margin-top: 18px;
}

.chip {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 15px 15px 13px;
  font-weight: 600;
  color: #fff;
  min-height: 80px;
  background: rgba(7, 9, 20, 0.72);
}

.chip > * { position: relative; z-index: 1; }
.chip .meta { font-weight: 500; color: #b0bbda; margin-top: 8px; font-size: 12px; line-height: 1.5; }
.chip .pct { position: absolute; right: 11px; top: 11px; font-weight: 700; font-size: 14px; color: var(--accent); }
.chip .reason {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.45;
  color: #f4d7ff;
}

.bg-palm::before, .bg-claw::before, .bg-tip::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.3;
  z-index: 0;
  pointer-events: none;
}

.bg-palm::before { background: linear-gradient(135deg, rgba(34, 197, 94, 0.26), rgba(6, 182, 212, 0.12)); }
.bg-claw::before { background: linear-gradient(135deg, rgba(168, 85, 247, 0.26), rgba(6, 182, 212, 0.15)); }
.bg-tip::before { background: linear-gradient(135deg, rgba(56, 189, 248, 0.28), rgba(99, 102, 241, 0.14)); }

.foot {
  flex-shrink: 0;
  padding: 24px 16px;
  text-align: center;
  font-size: 12px;
  color: var(--sub);
}

@media (max-width: 720px) {
  .main-content { padding: 0 16px 80px; }
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
        <p class="lead">Generated automatically from your latest survey + measurement data, then reranked with RAG for fit-aware recommendations.</p>

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
          <a id="redoBtn" class="btn neon" href="/mousefit">Redo Test</a>
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
  const reportScriptVersion = "20260224-rag-v2";
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

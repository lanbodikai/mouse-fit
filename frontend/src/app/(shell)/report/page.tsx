"use client";

import { useEffect } from "react";
import Script from "next/script";
import ReportStoreSync from "@/components/shell/ReportStoreSync";

const styles = `
:root{
  --bg:#06080b; --fg:#eaf0ff; --sub:#a6b0c8; --border:rgba(255,255,255,.10);
  --g1:#7c3aed; --g2:#22d3ee; --g3:#a78bfa;
  --neon:linear-gradient(90deg,#7c3aed 0%,#22d3ee 50%,#a78bfa 100%);
}
.tool-shell, .tool-shell *{box-sizing:border-box}

/* Flexbox Layout */
.tool-shell {
  height: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  font-family: 'Lexend', 'Sora', system-ui, Arial;
  color: var(--fg);
}
.nav-placeholder{
  min-height:72px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:24px;
  padding:16px 28px;
  border:1px solid rgba(255,255,255,.1);
  border-radius:30px;
  background:var(--bg);
  backdrop-filter:blur(16px);
  color:#fff;
  margin:12px auto;
  max-width:1200px;
}
.nav-placeholder__logo{
  font-weight:800;
  letter-spacing:0.18em;
  font-size:.95rem;
}
.nav-placeholder__links{
  display:flex;
  gap:16px;
  flex-wrap:wrap;
  font-size:.9rem;
  color:rgba(255,255,255,.7);
}
.nav-placeholder__hint{
  font-size:.85rem;
  color:rgba(255,255,255,.6);
}

/* Main Content Wrapper */
.main-content { flex: 1 0 auto; width: 100%; }

/* ===== HERO layout ===== */
.hero{
  max-width:1200px; margin:24px auto 0; padding:0 20px;
  display:grid; grid-template-columns: minmax(280px,520px) 1fr; gap:28px; align-items:center;
  position:relative;
}
@media (max-width:980px){ .hero{grid-template-columns:1fr; gap:18px} }

.blob{
  aspect-ratio: 4/3; border-radius:30px; position:relative; overflow:hidden;
  border:1px solid rgba(255,255,255,.1);
  background: var(--bg);
}
.blob::after{
  content:""; position:absolute; inset:0;
  background: radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,.12), transparent 55%);
  mix-blend-mode: screen; pointer-events:none;
}

/* snapshot sits above blob */
#snapshot{
  position:absolute; inset:0; width:100%; height:100%; object-fit:cover;
  display:block; transition:filter .3s ease, opacity .3s ease;
}

/* Right text block */
.report-copy{ position:relative; padding:8px 6px 8px 6px }
.h1{ font-size:28px; margin:8px 0 8px; font-weight: 700; }
.kicker{ letter-spacing:.16em; font-size:12px; opacity:.9; color:#cfe1ff; margin-bottom:8px; text-transform: uppercase; font-weight: 700; }
.ghost{
  position:absolute; right:6px; top:-6px; font-size:96px; line-height:1;
  color:transparent; -webkit-text-stroke:1px rgba(255,255,255,.06);
  text-stroke:1px rgba(255,255,255,.06); pointer-events:none; user-select:none;
}
.stats{  margin-top:8px; display:grid; gap:6px; transition:filter .25s ease, opacity .25s ease; }
.stats .row{ display:flex; gap:10px; align-items:center; font-size:14px }
.pill{padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);font-size:12px;color:#fff}

/* Grip thumbs */
.grip-thumbs{display:none; gap:10px; margin-top:12px}
.grip-thumbs img{width:84px;height:56px;object-fit:cover;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);transition:filter .25s ease}

/* Action buttons */
.btn{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:10px 14px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;transition:all 0.2s;}
.btn:hover{background:rgba(255,255,255,.2);}
.btn.neon{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);}
.btn.neon:hover{background:rgba(255,255,255,.2);}
.reveal-bar{ display:flex; gap:10px; align-items:center; margin-top:12px; flex-wrap:wrap }

/* Reveal/Hide blur states */
body[data-revealed="false"] #snapshot{ filter:blur(18px) saturate(.9) }
body[data-revealed="true"]  #snapshot{ filter:none }
body[data-revealed="false"] .stats,
body[data-revealed="false"] .grip-thumbs img{ filter:blur(12px) }
body[data-revealed="true"]  .stats,
body[data-revealed="true"]  .grip-thumbs img{ filter:none }

/* ===== AI REPORT SECTION ===== */
.ai-wrap{ max-width:1200px; margin:30px auto 90px; padding:0 20px }
.ai-title{ font-size:22px; margin:10px 0 6px; font-weight: 700; }
.ai-sub{ color:var(--sub); margin:0 0 10px; font-size:13px }
.controls{ display:flex; gap:10px; flex-wrap:wrap; margin: 10px 0 6px; }
.status{ font-size:12px; color:var(--sub); min-height:18px; white-space:pre-wrap }

.ai-card{
  margin-top: 14px; border: 1px solid rgba(255,255,255,.1); border-radius: 30px;
  padding: 20px; background: var(--bg);
}
.ai-card h3{ margin:0 0 6px; font-size:18px; font-weight: 700; }
.para{ white-space: pre-wrap; line-height: 1.5; }
.hr{ height:1px; background: var(--border); margin: 10px 0; opacity:.7; }

.grid{ display:grid; grid-template-columns: repeat(auto-fit, minmax(230px,1fr)); gap:12px; margin-top:12px }
.chip{
  position:relative; overflow:hidden;
  border:1px solid rgba(255,255,255,.14); border-radius:16px; padding:12px 14px;
  font-weight:700; color:#fff; min-height:78px; background: rgba(255,255,255,.06);
}
.chip > *{ position:relative; z-index:1 }
.chip .meta{ font-weight:600; color:var(--sub); margin-top:6px; font-size: 12px; }
.chip .pct{ position:absolute; right:10px; top:10px; font-weight:800; font-size: 14px; }

.bg-palm::before, .bg-claw::before, .bg-tip::before{
  content:""; position:absolute; inset:0; opacity:.5; z-index:0; pointer-events:none;
}
.bg-palm::before { background: linear-gradient(135deg, rgba(82,0,163,1), rgba(167,94,246,1)); }
.bg-claw::before { background: linear-gradient(135deg, rgba(14,98,255,1), rgba(104,169,255,1)); }
.bg-tip::before  { background: linear-gradient(135deg, rgba(214,31,105,1), rgba(255,139,197,1)); }

/* Footer */
.foot { flex-shrink: 0; padding: 20px; text-align: center; font-size: 12px; color: var(--sub); }

/* Mobile */
@media (max-width: 720px){
  .hero{ max-width: 100%; margin: 16px auto 0; padding: 0 12px; grid-template-columns: 1fr; gap: 12px }
  .blob{ aspect-ratio: 3 / 2; }
  .report-copy{ padding: 4px 2px 8px 2px }
  .h1{ font-size: 22px; }
  .stats .row{ font-size: 13px }
  .reveal-bar{ gap:8px }
  .reveal-bar .btn{ flex:1 1 auto; min-width: 140px }
  .ai-wrap{ margin: 20px auto 60px; padding: 0 12px }
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
        <div class="kicker">YOUR RESULTS</div>
        <div class="h1">Hand measurement & grip insight</div>

        <div class="stats" id="measurements">
          <div class="row"><strong>Hand length:</strong> <span id="handLength">—</span> cm</div>
          <div class="row"><strong>Palm width:</strong> <span id="handWidth">—</span> cm</div>
          <div class="row"><strong>Hand size category:</strong> <span id="handSize">—</span></div>
          <div class="row"><strong>Suggested grip style(s):</strong> <span id="suggestedGrip">—</span></div>
          <div class="row"><span id="gripPill" class="pill">Grip: not checked</span></div>
        </div>

        <div id="gripThumbs" class="grip-thumbs">
          <img id="gripTop"   alt="Top view">
          <img id="gripRight" alt="Right view">
          <img id="gripLeft"  alt="Left view">
        </div>

        <div class="reveal-bar">
          <button id="toggleReveal" class="btn neon">Reveal measurements</button>
          <a href="/grip" class="btn neon">Open Grip Checker</a>
          <button id="redoBtn" class="btn neon" onclick="location.href='/measure'">Redo test</button>
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
        <h3>Two-Paragraph Summary</h3>
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
    <div class="foot-inner"><span>© <span id="y"></span> Mouse-Fit</span></div>
  </footer>
`;

export default function ReportPage() {
  useEffect(() => {
    document.body.setAttribute("data-revealed", "false");
    return () => document.body.removeAttribute("data-revealed");
  }, []);

  return (
    <div className="h-full">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <ReportStoreSync />
      <div className="tool-shell" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <Script src="/src/js/report-inline.js" strategy="afterInteractive" />
      <Script type="module" src="/src/js/report-module.js" strategy="afterInteractive" />
    </div>
  );
}

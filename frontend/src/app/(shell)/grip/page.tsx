"use client";

import Script from "next/script";
import { useEffect } from "react";
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
  overflow: hidden;
  overscroll-behavior: none;
  display: flex;
  flex-direction: column;
  font-family: 'Sora', system-ui, Arial;
  color: var(--fg);
  position: relative;
}

.wrap {
  flex: 1 1 auto;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 24px;
  overflow: hidden;
  height: 100%;
}

.stage {
  position: relative;
  width: min(1000px, 65vw);
  min-height: 500px;
  max-height: 80vh;
  aspect-ratio: 16/9;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.stage > video, .stage > canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stage > video { z-index: 0; }
canvas#frame { z-index: 1; }
.stage > .gripGuide { z-index: 2; }
canvas#overlay { z-index: 3; pointer-events: none; }

.stage .gripGuide {
  position: absolute;
  left: 4%;
  right: 4%;
  top: 4%;
  bottom: 4%;
  border: 2px dashed rgba(34, 197, 94, 0.6);
  border-radius: 16px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage.guide-hidden .gripGuide { opacity: 0; visibility: hidden; }

.stage .label {
  position: absolute;
  top: -12px;
  left: 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
}

.stage .badge {
  position: absolute;
  right: 12px;
  top: 12px;
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid var(--border);
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  z-index: 6;
}

.stage .toast {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid var(--border);
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  display: none;
  z-index: 7;
}

.stage .countdown {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  font-size: 20vmin;
  font-weight: 900;
  color: var(--accent);
  text-shadow: 0 2px 20px rgba(34, 197, 94, 0.5);
  pointer-events: none;
  z-index: 8;
}

.control-dock {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 50;
  padding: 0;
  background: none;
  flex-shrink: 0;
  height: 70%;
  max-height: 600px;
}

.panel {
  width: 340px;
  flex: 1;
  overflow: auto;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 20px;
  scrollbar-width: none;
}

.panel::-webkit-scrollbar { width: 0; height: 0; }

.coach {
  width: 340px;
  padding: 20px;
  border-radius: 24px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  color: var(--fg);
  z-index: 60;
}

.coach.hidden { display: none; }
.coach-bar { display: flex; align-items: center; padding: 0; margin: 0 0 12px 0; border: none; background: none; }
.coach-bar strong { font-size: 14px; font-weight: 700; color: var(--accent); }
.coach-close { display: none; }
.coach-content p { margin: 6px 0; color: var(--sub); line-height: 1.5; font-size: 13px; }
.coach-content b { color: var(--accent); }

.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; min-width: 0; }
.row > * { min-width: 0; flex-shrink: 1; }

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: rgba(34, 197, 94, 0.05);
}

.btn-group { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.btn-group button, .btn-group .btn-link { width: 100%; min-height: 36px; }

.meta { display: flex; flex-direction: row; gap: 8px; flex-wrap: wrap; }
.meta .pill { flex: 1; text-align: center; min-width: 0; }

.pill {
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid var(--border);
  font-size: 11px;
  color: var(--fg);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

button, .btn-link {
  background: rgba(34, 197, 94, 0.1);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
  transition: all 0.2s;
  font-size: 12px;
}

button:hover, .btn-link:hover { background: rgba(34, 197, 94, 0.2); border-color: var(--accent); }
button.primary { background: rgba(34, 197, 94, 0.2); border-color: var(--accent); }

select {
  background: rgba(0, 0, 0, 0.4);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 13px;
}

.thumbs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
  align-items: center;
}

.thumb {
  position: relative;
  width: 100%;
  height: 52px;
  max-width: 90px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(34, 197, 94, 0.05);
  overflow: hidden;
  display: grid;
  place-items: center;
  font-size: 11px;
  color: var(--sub);
}

.thumb span { position: absolute; left: 6px; right: 6px; bottom: 4px; text-align: center; font-size: 10px; }
.thumb.has-img span { display: none; }
.thumb img { width: 100%; height: 100%; object-fit: contain; display: none; }
.thumb.has-img img { display: block; }

.hint { font-size: 12px; color: var(--sub); margin: 6px 0 10px; line-height: 1.5; }
.hint b { color: var(--accent); }

label { font-size: 13px; color: var(--sub); }

.dock-handle { display: none; }

@media (max-width: 900px) {
  .tool-shell { overflow: auto; overscroll-behavior: y contain; display: block; }
  .wrap { height: auto; min-height: calc(100dvh - 120px); padding: 16px; flex-direction: column; gap: 16px; }
  .stage { width: 100%; max-width: 100%; height: auto; aspect-ratio: 16/9; }
  .control-dock { width: 100%; height: auto; flex-direction: column; }
  .coach, .panel { width: 100%; }
}
`;

const bodyHtml = `
  <div class="wrap">
    <div class="stage">
      <video id="cam" playsinline autoplay muted></video>
      <canvas id="frame"></canvas>
      <div class="gripGuide"><span class="label" id="guideLabel">Step 1/3 — TOP view</span></div>
      <canvas id="overlay"></canvas>
      <div id="status" class="badge">Live</div>
      <div id="toast" class="toast"></div>
      <div id="countdown" class="countdown">5</div>
    </div>

    <div class="control-dock">
      <div class="coach" id="coach" data-key="mf:coach:grip" role="dialog">
        <div class="coach-bar"><strong>Quick Guide</strong></div>
        <div class="coach-content">
          <p>1. Position hand (holding mouse) inside box</p>
          <p>2. Capture <b>Top</b>, <b>Right</b>, then <b>Left</b> views</p>
          <p>3. Click <b>Classify</b> to detect grip style</p>
        </div>
      </div>

      <div class="panel">
        <div class="row" style="gap:10px; margin-bottom:8px;">
          <label>Camera:</label>
          <select id="cameraSelect"></select>
          <button id="refreshCams">Refresh</button>
        </div>
        <span id="camName" class="pill" style="display:block; margin-bottom:8px;">—</span>
        <div id="hint" class="hint">Capture 3 angles: <b>Top</b>, <b>Right</b>, <b>Left</b>.</div>

        <div class="thumbs">
          <div class="thumb"><img id="thumbTop" alt="Top"><span>Top</span></div>
          <div class="thumb"><img id="thumbRight" alt="Right"><span>Right</span></div>
          <div class="thumb"><img id="thumbLeft" alt="Left"><span>Left</span></div>
        </div>

        <div class="toolbar" id="liveBtns">
          <div class="btn-group">
            <button id="timer" class="primary">Capture (Space)</button>
            <button id="snap">Capture now</button>
            <button id="toggleSkel">Toggle skeleton</button>
            <button type="button" data-toggle-guide>Hide guide</button>
            <button id="retakeAll">Retake all</button>
          </div>
        </div>

        <div class="toolbar" id="frozenBtns" style="display:none;">
          <div class="btn-group">
            <button id="accept">Use This Angle</button>
            <button id="retake">Retake</button>
            <button type="button" data-toggle-guide>Hide guide</button>
            <button id="classify" disabled>Classify Grip</button>
            <a id="gotoReport" class="btn-link" href="/report">Report</a>
          </div>
          <div class="meta"><span id="resultPill" class="pill">Result: —</span></div>
        </div>
      </div>
    </div>
  </div>

  <button id="startCamBtn" style="position:absolute; inset:auto 16px 16px auto; z-index:30; background:linear-gradient(90deg,var(--g1),var(--g2)); color:#000; font-weight:600; border:0; padding:12px 16px; border-radius:16px; display:none;">Tap to start</button>
`;

export default function GripPage() {
  useEffect(() => {
    const ensureCoachVisible = () => {
      const coach = document.getElementById('coach');
      if (coach) {
        coach.classList.remove('hidden');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('grip-page-ready'));
        }
      }
    };

    const timeoutId = setTimeout(ensureCoachVisible, 100);
    ensureCoachVisible();

    return () => {
      clearTimeout(timeoutId);
      if (typeof window !== 'undefined' && (window as any).stopCamGrip) {
        try { (window as any).stopCamGrip(); } catch (e) {}
      }
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => stream.getTracks().forEach(track => track.stop()))
          .catch(() => {});
      }
    };
  }, []);

  return (
    <>
      <ShellNav currentPage="grip" />
      <div className="h-full">
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="tool-shell" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        <Script
          id="grip-thumbs"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `['thumbTop','thumbRight','thumbLeft'].forEach(id => {\n  const img = document.getElementById(id);\n  const box = img?.closest('.thumb');\n  if (!img || !box) return;\n  const showIfLoaded = () => { if (img.currentSrc && img.naturalWidth > 0) box.classList.add('has-img'); };\n  img.addEventListener('load', showIfLoaded);\n  if (img.complete) showIfLoaded();\n});`,
          }}
        />
        <Script type="module" src="/src/js/grip.js" strategy="afterInteractive" key="grip-js" />
        <Script
          id="grip-finish"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.finishGrip = (grip) => {\n  sessionStorage.setItem('mf:grip', grip);\n  location.href = '/report';\n};`,
          }}
        />
      </div>
    </>
  );
}

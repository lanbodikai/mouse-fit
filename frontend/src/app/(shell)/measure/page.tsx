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
  aspect-ratio: 16/10;
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

.stage .guides {
  position: absolute;
  left: 4%;
  right: 4%;
  top: 4%;
  bottom: 4%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  touch-action: none;
  z-index: 2;
}

.stage .guide {
  border: 2px dashed rgba(34, 197, 94, 0.6);
  border-radius: 16px;
  background: transparent;
  position: relative;
}

.stage #handGuide {
  flex: 3 1 0;
  min-height: 94%;
}

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

.point {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--accent);
  background: rgba(34, 197, 94, 0.2);
  transform: translate(-50%, -50%);
  touch-action: none;
  cursor: grab;
  pointer-events: auto;
  display: none;
  z-index: 10;
}

.point.green { border-color: #22c55e; background: rgba(34, 197, 94, 0.3); }
.point.blue { border-color: #3b82f6; background: rgba(59, 130, 246, 0.3); }

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
.btn-group button { width: 100%; min-height: 36px; }

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

button {
  background: rgba(34, 197, 94, 0.1);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}

button:hover { background: rgba(34, 197, 94, 0.2); border-color: var(--accent); }
button.primary { background: rgba(34, 197, 94, 0.2); border-color: var(--accent); }

select {
  background: rgba(0, 0, 0, 0.4);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 13px;
}

.hint { font-size: 12px; color: var(--sub); margin: 6px 0 10px; line-height: 1.5; }
.hint b { color: var(--accent); }

label { font-size: 13px; color: var(--sub); }

@media (max-width: 900px) {
  .tool-shell { overflow: auto; overscroll-behavior: y contain; display: block; }
  .wrap { height: auto; min-height: calc(100dvh - 120px); padding: 16px; flex-direction: column; gap: 16px; }
  .stage { width: 100%; max-width: 100%; height: auto; aspect-ratio: 16/10; }
  .control-dock { width: 100%; height: auto; flex-direction: column; }
  .coach, .panel { width: 100%; }
}
`;

const bodyHtml = `
  <div class="wrap">
    <div class="stage">
      <video id="cam" playsinline autoplay muted></video>
      <canvas id="frame"></canvas>

      <div id="p0" class="point green"></div>
      <div id="p1" class="point green"></div>
      <div id="p2" class="point green"></div>
      <div id="p3" class="point green"></div>
      <div id="wL" class="point green"></div>
      <div id="wR" class="point green"></div>
      <div id="hA" class="point blue"></div>
      <div id="hB" class="point blue"></div>

      <div class="guides">
        <div id="handGuide" class="guide"><span class="label">Hand here</span></div>
        <div id="cardGuide" class="guide" style="display:none; width:22vmin; height:14vmin;">
          <span class="label">Card here (optional)</span>
        </div>
      </div>

      <div id="status" class="badge">Live</div>
      <div id="toast" class="toast"></div>
      <div id="countdown" class="countdown">5</div>
    </div>

    <div class="control-dock">
      <div class="coach" id="coach" data-key="mf:coach:measure" role="dialog">
        <div class="coach-bar"><strong>Quick Guide</strong></div>
        <div class="coach-content">
          <p>1. Position hand & card inside the box</p>
          <p>2. Press <b>Space</b> to capture</p>
          <p>3. Double click card corners if needed</p>
        </div>
      </div>

      <div class="panel">
        <div class="row" style="gap:10px; margin-bottom:8px;">
          <label>Camera:</label>
          <select id="cameraSelect"></select>
          <button id="refreshCams">Refresh</button>
        </div>
        <span id="camName" class="pill" style="display:block; margin-bottom:8px;">—</span>
        <div id="hint" class="hint">Tip: Press <b>Space</b> to capture. Keep hand and card in view.</div>

        <div class="toolbar" id="liveBtns">
          <div class="btn-group">
            <button id="timer" class="primary">Capture (Space)</button>
            <button id="snap">Capture now</button>
            <button id="toggleSkel">Toggle skeleton</button>
            <button id="toggleGuide">Hide guides</button>
            <button id="reset">Reset (Esc)</button>
          </div>
          <div class="meta">
            <span id="guideState" class="pill">Guides: On</span>
          </div>
        </div>

        <div class="toolbar" id="refineRow" style="display:none;">
          <div class="btn-group">
            <button id="snapEdges">Snap palm edges</button>
            <button id="snapTip">Snap fingertip</button>
            <button id="confirm" class="primary">Confirm (Enter)</button>
            <button id="reset2">Reset (Esc)</button>
          </div>
          <div class="meta"><span class="pill">Refine</span></div>
        </div>
      </div>
    </div>
  </div>

  <button id="startCamBtn" style="position:absolute; inset:auto 16px 16px auto; z-index:30; background:linear-gradient(90deg,var(--g1),var(--g2)); color:#000; font-weight:600; border:0; padding:12px 16px; border-radius:16px; display:none;">Tap to start camera</button>
`;

export default function MeasurePage() {
  useEffect(() => {
    const ensureCoachVisible = () => {
      const coach = document.getElementById('coach');
      if (coach) {
        coach.classList.remove('hidden');
        coach.style.display = '';
        coach.style.visibility = 'visible';
        coach.style.opacity = '1';
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('measure-page-ready'));
        }
        return true;
      }
      return false;
    };

    let attempts = 0;
    const maxAttempts = 20;
    const trySetup = () => {
      attempts++;
      const found = ensureCoachVisible();
      if (!found && attempts < maxAttempts) {
        setTimeout(trySetup, 50);
      }
    };
    
    const observer = new MutationObserver(() => {
      const coach = document.getElementById('coach');
      if (coach) {
        ensureCoachVisible();
        observer.disconnect();
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    trySetup();
    const timeoutId1 = setTimeout(trySetup, 100);
    const timeoutId2 = setTimeout(trySetup, 300);
    const timeoutId3 = setTimeout(trySetup, 500);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      if (typeof window !== 'undefined' && (window as any).stopCam) {
        try { (window as any).stopCam(); } catch (e) {}
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
      <ShellNav currentPage="measure" />
      <div className="h-full">
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="tool-shell" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        <Script type="module" src="/src/js/main.js" strategy="afterInteractive" key="main-js" />
        <Script
          id="measure-finish"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.finishMeasurement = (l, w) => {\n  sessionStorage.setItem('mf:length_mm', String(l));\n  sessionStorage.setItem('mf:width_mm', String(w));\n  location.href = '/report';\n};`,
          }}
        />
      </div>
    </>
  );
}

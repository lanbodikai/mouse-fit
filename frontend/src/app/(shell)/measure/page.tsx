"use client";

import Script from "next/script";
import { useEffect } from "react";
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
  --highlight: var(--accent-highlight);
  --highlight-soft: var(--accent-highlight-fill);
  --surface: var(--surface-soft);
  --surface-elevated: var(--surface-strong);
  --surface-focus: var(--surface-veil);
  --on-surface: var(--overlay-text);
  --glow: var(--accent-gamer-glow);
}

.tool-shell, .tool-shell * { box-sizing: border-box; }

.tool-shell {
  height: 100%;
  min-height: 100%;
  margin: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  font-family: 'Sora', system-ui, Arial;
  color: var(--fg);
  position: relative;
  padding: clamp(16px, 2.1vw, 24px) clamp(10px, 1.4vw, 16px) clamp(24px, 3.2vh, 40px);
}

.wrap {
  --capture-shell-height: clamp(500px, 76vh, 860px);
  flex: 1 1 auto;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 336px);
  align-items: start;
  justify-content: center;
  padding: clamp(16px, 2.2vw, 28px) clamp(12px, 1.8vw, 20px) clamp(20px, 2.8vh, 34px);
  gap: clamp(18px, 2.2vw, 26px);
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  overflow: visible;
  min-height: 100%;
}

.stage {
  position: relative;
  width: 100%;
  max-width: 100%;
  min-height: 0;
  height: var(--capture-shell-height);
  max-height: none;
  aspect-ratio: 16/10;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface);
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

.stage > canvas {
  touch-action: none;
}

.stage .guides {
  position: absolute;
  left: 4%;
  right: 4%;
  top: 2.5%;
  bottom: 2.5%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  touch-action: none;
  z-index: 2;
}

.stage .guide {
  border: 0;
  border-radius: 16px;
  background: transparent;
  position: relative;
}

.stage #handGuide {
  flex: 3 1 0;
  min-height: 96%;
}

.stage .label {
  display: none;
}

.stage .badge {
  position: absolute;
  right: 12px;
  top: 12px;
  background: var(--accent-soft);
  border: 1px solid var(--border);
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
  padding: 6px 12px 6px 22px;
  border-radius: 999px;
  z-index: 6;
}

.stage .badge::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-emerald, #34d399);
  box-shadow: 0 0 6px var(--accent-emerald, #34d399);
}

.stage .toast {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface-focus);
  border: 1px solid var(--border);
  color: var(--on-surface);
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
  background: var(--surface-elevated);
  font-size: 20vmin;
  font-weight: 900;
  color: var(--accent);
  text-shadow: 0 2px 20px var(--accent-soft-strong);
  pointer-events: none;
  z-index: 8;
}

.point {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--accent);
  background: var(--accent-soft);
  transform: translate(-50%, -50%);
  touch-action: none;
  cursor: grab;
  pointer-events: auto;
  display: none;
  z-index: 10;
}

.point.green { border-color: var(--accent-emerald, #34d399); background: var(--accent-emerald-fill, rgba(52, 211, 153, 0.14)); }
.point.blue { border-color: var(--accent-violet, #8b5cf6); background: var(--accent-violet-fill, rgba(139, 92, 246, 0.14)); }

.control-dock {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 50;
  padding: 0;
  background: none;
  flex-shrink: 1;
  width: 100%;
  min-width: 0;
  height: var(--capture-shell-height);
}

.panel {
  width: 100%;
  flex: 1 1 auto;
  overflow: auto;
  min-height: 0;
  max-height: none;
  border: 1px solid var(--border);
  background: var(--surface);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 20px;
  scrollbar-width: none;
}

.panel::-webkit-scrollbar { width: 0; height: 0; }

.coach {
  width: 100%;
  padding: 20px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface);
  backdrop-filter: blur(10px);
  color: var(--fg);
  z-index: 60;
}

.coach.hidden { display: none; }
.coach-bar { display: flex; align-items: center; padding: 0; margin: 0 0 12px 0; border: none; background: none; }
.coach-bar strong { font-size: 14px; font-weight: 700; color: var(--accent); display: flex; align-items: center; gap: 8px; }
.coach-bar strong::before { content: ''; width: 3px; height: 18px; border-radius: 2px; background: linear-gradient(to bottom, var(--accent), var(--accent-violet, #8b5cf6)); }
.coach-close { display: none; }
.coach-content p { margin: 6px 0; color: var(--sub); line-height: 1.5; font-size: 13px; }
.coach-content b { color: var(--accent); }

.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; min-width: 0; }
.row > * { min-width: 0; flex-shrink: 1; }
.row label { flex: 0 0 auto; }
.row select { flex: 1 1 160px; }
.row input[type="range"] { flex: 1 1 160px; accent-color: var(--accent); }
.zoom-row .pill { flex: 0 0 auto; min-width: 56px; text-align: center; }

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 10px;
  padding: 18px;
  min-height: 122px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--accent-soft);
}

.capture-bar { min-height: 138px; }

.btn-group { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.btn-group button { width: 100%; min-height: 46px; }
.refine-tools button { width: 100%; min-height: 42px; }

.meta { display: flex; flex-direction: row; gap: 8px; flex-wrap: wrap; }
.meta .pill { flex: 1; text-align: center; min-width: 0; }

.pill {
  padding: 6px 10px;
  border-radius: 12px;
  background: var(--accent-soft);
  border: 1px solid var(--border);
  font-size: 11px;
  color: var(--fg);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

button {
  background: var(--accent-soft);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}

button:hover { background: var(--accent-soft-strong); border-color: var(--accent); }
button.primary { background: var(--accent-soft-strong); border-color: var(--accent); border-bottom: 2px solid var(--accent); }

select {
  background: var(--surface-elevated);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 13px;
}

.hint { font-size: 12px; color: var(--sub); margin: 6px 0 10px; line-height: 1.5; }
.hint b { color: var(--accent); }

label { font-size: 13px; color: var(--sub); }

.result-popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.72);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.result-popup {
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 32px;
  max-width: 380px;
  width: 90%;
  text-align: center;
}

.result-popup .result-label {
  font-size: 11px;
  color: var(--sub);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  margin: 0 0 16px;
}

.result-popup .result-dims {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 16px;
}

.result-popup .result-dim {
  flex: 1;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--accent-soft);
}

.result-popup .result-dim-label {
  display: block;
  font-size: 10px;
  color: var(--sub);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin-bottom: 6px;
}

.result-popup .result-dim-value {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
}

.result-popup .result-desc {
  font-size: 13px;
  color: var(--sub);
  line-height: 1.5;
  margin: 0 0 20px;
}

.result-popup .result-actions {
  display: flex;
  gap: 8px;
}

.result-popup .result-actions > * {
  flex: 1;
}

@media (max-width: 1100px) {
  .tool-shell { display: block; }
  .wrap {
    display: flex;
    height: auto;
    min-height: calc(100dvh - 140px);
    max-width: 100%;
    padding: 18px 14px 24px;
    flex-direction: column;
    gap: 12px;
    overflow: visible;
  }
  .stage { width: 100%; max-width: 100%; height: auto; max-height: none; aspect-ratio: 16/10; }
  .control-dock { width: 100%; min-width: 0; min-height: 0; height: auto; flex-direction: column; }
  .coach, .panel { width: 100%; }
  .panel { max-height: none; }
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
          <p>3. Drag across the card to place its box</p>
          <p>4. Use <b>Auto snap hand</b>, then adjust corners if needed</p>
        </div>
      </div>

      <div class="panel">
        <div class="row" style="gap:10px; margin-bottom:8px;">
          <label>Camera:</label>
          <select id="cameraSelect"></select>
          <button id="refreshCams">Refresh</button>
        </div>
        <div class="row zoom-row" style="gap:10px; margin-bottom:8px;">
          <label for="zoomRange">Zoom:</label>
          <input id="zoomRange" type="range" min="1" max="3" step="0.05" value="1" />
          <span id="zoomValue" class="pill">1.0x</span>
        </div>
        <span id="camName" class="pill" style="display:block; margin-bottom:8px;">—</span>
        <div id="hint" class="hint">Tip: Press <b>Space</b> to capture. After freeze, drag across the card to create its rectangle, then use <b>Auto snap hand</b> to refine fingertip and width.</div>

        <div class="toolbar capture-bar" id="liveBtns">
          <div class="btn-group">
            <button id="timer" class="primary">Capture</button>
            <button id="reset">Reset</button>
          </div>
          <button id="snap" style="display:none;">Capture now</button>
          <button id="toggleSkel" style="display:none;">Toggle skeleton</button>
          <div class="meta">
            <span id="guideState" class="pill" style="display:none;">Guides: On</span>
          </div>
        </div>

        <div class="toolbar capture-bar" id="refineRow" style="display:none;">
          <div class="btn-group">
            <button id="confirm" class="primary">Confirm</button>
            <button id="reset2">Reset</button>
          </div>
          <div class="refine-tools">
            <button id="snapMeasure">Auto snap hand</button>
          </div>
          <div class="meta"><span class="pill">Drag card box, then refine</span></div>
        </div>
      </div>
    </div>
  </div>

  <button id="startCamBtn" style="position:fixed; right:16px; bottom:16px; z-index:30; background:var(--accent-soft-strong); color:var(--on-surface); font-weight:600; border:1px solid var(--accent-gamer-line); padding:12px 16px; border-radius:16px; display:none;">Tap to start camera</button>

  <div id="resultPopup" class="result-popup-overlay">
    <div class="result-popup">
      <p class="result-label">Hand Measurements</p>
      <div class="result-dims">
        <div class="result-dim">
          <span class="result-dim-label">Length</span>
          <span id="resultLength" class="result-dim-value">—</span>
        </div>
        <div class="result-dim">
          <span class="result-dim-label">Width</span>
          <span id="resultWidth" class="result-dim-value">—</span>
        </div>
      </div>
      <p class="result-desc">Your measurements have been saved. You can view your full fit report or continue browsing.</p>
      <div class="result-actions">
        <a href="/report" class="btn-link primary">View Report</a>
        <button onclick="document.getElementById('resultPopup').style.display='none'">Close</button>
      </div>
    </div>
  </div>
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
      if (typeof window !== 'undefined') {
        const windowWithStop = window as Window & { stopCam?: () => void };
        if (windowWithStop.stopCam) {
          try {
            windowWithStop.stopCam();
          } catch {}
        }
      }
    };
  }, []);

  return (
    <>
      <ShellNav currentPage="measure" />
      <div className="h-full min-h-0">
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="tool-shell" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        <Script type="module" src="/src/js/main.js" strategy="afterInteractive" key="main-js" />
        <Script
          id="measure-finish"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.finishMeasurement = async (l, w) => {
  var lenMm = Number(l);
  var widMm = Number(w);
  sessionStorage.setItem('mf:length_mm', String(lenMm));
  sessionStorage.setItem('mf:width_mm', String(widMm));

  // Update wizard state so survey picks up measurements
  var wKeys = ['mousefit:survey_wizard_state', 'mf:survey_wizard_state'];
  wKeys.forEach(function(k) {
    try {
      var raw = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (raw) {
        var obj = JSON.parse(raw);
        obj.lengthMm = lenMm;
        obj.widthMm = widMm;
        var s = JSON.stringify(obj);
        localStorage.setItem(k, s);
        sessionStorage.setItem(k, s);
      }
    } catch {}
  });

  var sessionKey = 'mousefit:v2:session_id';
  var sessionId = localStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('session-' + Date.now());
    localStorage.setItem(sessionKey, sessionId);
  }

  var apiBase = String(window.__MOUSEFIT_API_BASE__ || 'http://127.0.0.1:8000').replace(/\\/+$/, '');
  var headers = { 'Content-Type': 'application/json' };
  try {
    var authRaw = localStorage.getItem('mousefit:auth:session');
    if (authRaw) {
      var parsed = JSON.parse(authRaw);
      if (parsed && parsed.access_token) headers.Authorization = 'Bearer ' + parsed.access_token;
    }
  } catch {}

  try {
    await fetch(apiBase + '/api/measurements', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ session_id: sessionId, length_mm: lenMm, width_mm: widMm }),
    });
  } catch {}

  var params = new URLSearchParams(window.location.search);
  if (params.get('from') === 'survey') {
    location.href = '/survey';
  } else {
    var elL = document.getElementById('resultLength');
    var elW = document.getElementById('resultWidth');
    if (elL) elL.textContent = lenMm.toFixed(1) + ' mm';
    if (elW) elW.textContent = widMm.toFixed(1) + ' mm';
    var popup = document.getElementById('resultPopup');
    if (popup) popup.style.display = 'flex';
  }
};`,
          }}
        />
      </div>
    </>
  );
}


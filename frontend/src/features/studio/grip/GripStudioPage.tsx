"use client";

import Script from "next/script";
import { useEffect } from "react";
import { ShellNav } from "@/components/shell/ShellNav";

const styles = `
.tool-shell {
  --bg: var(--bg0);
  --fg: var(--text-primary);
  --fg-strong: var(--shell-text-primary);
  --sub: var(--text-secondary);
  --border: var(--border-color);
  --accent: var(--accent-gamer);
  --accent-strong: var(--accent-gamer-strong);
  --accent-soft: var(--accent-gamer-fill);
  --accent-soft-strong: var(--accent-gamer-fill-strong);
  --highlight: var(--accent-highlight);
  --highlight-soft: var(--accent-highlight-fill);
  --surface: var(--surface-soft);
  --surface-elevated: var(--surface-strong);
  --surface-focus: var(--surface-veil);
  --on-surface: var(--overlay-text);
  --glow: var(--accent-gamer-glow);
  --shadow-raised: var(--shell-shadow-raised);
  --shadow-soft: var(--shell-shadow-soft);
  --shadow-inset: var(--shell-shadow-inset);
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
  padding: 0;
}

.wrap {
  --capture-shell-height: clamp(520px, calc(100dvh - 190px), 820px);
  flex: 1 1 auto;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 336px);
  align-items: start;
  justify-content: center;
  padding: 0;
  gap: 16px;
  width: 100%;
  max-width: 1560px;
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
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: none;
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
  top: 2.5%;
  bottom: 2.5%;
  border: 0;
  border-radius: 16px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage.guide-hidden .gripGuide { opacity: 0; visibility: hidden; }

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
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent-soft-strong);
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
  border-radius: 8px;
  padding: 16px;
  box-shadow: none;
  scrollbar-width: none;
}

.panel::-webkit-scrollbar { width: 0; height: 0; }

.coach {
  width: 100%;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--fg);
  z-index: 60;
  box-shadow: none;
}

.coach.hidden { display: none; }
.coach-bar { display: flex; align-items: center; padding: 0; margin: 0 0 12px 0; border: none; background: none; }
.coach-bar strong { font-size: 14px; font-weight: 700; color: var(--accent); display: flex; align-items: center; gap: 8px; }
.coach-bar strong::before { content: ''; width: 3px; height: 18px; border-radius: 2px; background: var(--accent); }
.coach-close { display: none; margin-left: auto; min-height: 34px; padding: 7px 10px; }
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
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  box-shadow: none;
}

.capture-bar { min-height: 138px; }

.btn-group { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.btn-group button, .btn-group .btn-link { width: 100%; min-height: 46px; }

.meta { display: flex; flex-direction: row; gap: 8px; flex-wrap: wrap; }
.meta .pill { flex: 1; text-align: center; min-width: 0; }

.pill {
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  font-size: 11px;
  color: var(--fg-strong);
  font-weight: 600;
  box-shadow: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

button, .btn-link {
  background: var(--surface-elevated);
  color: var(--fg-strong);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
  transition: all 0.2s;
  font-size: 13px;
  box-shadow: none;
}

button:hover, .btn-link:hover { border-color: var(--accent); }
button.primary, .btn-link.primary { background: var(--accent); border-color: var(--accent); color: var(--shell-text-inverse); box-shadow: none; }

select {
  background: var(--surface-focus);
  color: var(--fg-strong);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  box-shadow: none;
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
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface-focus);
  overflow: hidden;
  display: grid;
  place-items: center;
  font-size: 11px;
  color: var(--sub);
  box-shadow: none;
}

.thumb span { position: absolute; left: 6px; right: 6px; bottom: 4px; text-align: center; font-size: 10px; }
.thumb.has-img span { display: none; }
.thumb img { width: 100%; height: 100%; object-fit: contain; display: none; }
.thumb.has-img img { display: block; }

.hint { font-size: 12px; color: var(--sub); margin: 6px 0 10px; line-height: 1.5; }
.hint b { color: var(--accent); }

label { font-size: 13px; color: var(--sub); }

.dock-handle { display: none; }

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
  border-radius: 8px;
  padding: 24px;
  max-width: 380px;
  width: 90%;
  text-align: center;
  box-shadow: none;
}

.result-popup .result-label {
  font-size: 11px;
  color: var(--sub);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  margin: 0 0 12px;
}

.result-popup .result-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--accent);
  margin: 0 0 8px;
  text-transform: capitalize;
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
  .stage { width: 100%; max-width: 100%; height: auto; max-height: none; aspect-ratio: 16/9; }
  .control-dock { width: 100%; min-width: 0; min-height: 0; height: auto; flex-direction: column; }
  .coach, .panel { width: 100%; }
  .panel { max-height: none; }
}

@media (min-width: 900px) and (min-aspect-ratio: 159/100) and (max-aspect-ratio: 161/100) {
  .wrap {
    --capture-shell-height: clamp(550px, 83.6vh, 946px);
    max-width: 1018px;
    transform: scale(1.1);
    transform-origin: center top;
  }
}

@media (max-width: 700px) {
  .tool-shell {
    height: 100%;
    min-height: 0;
    padding: 0;
    overflow: hidden;
    display: block;
  }

  .wrap {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 60%) minmax(0, 40%);
    height: 100%;
    min-height: 0;
    max-width: none;
    padding: 0;
    gap: 0;
    overflow: hidden;
  }

  .stage {
    width: 100%;
    height: 100%;
    min-height: 0;
    aspect-ratio: auto;
    border-radius: 22px 22px 12px 12px;
  }

  .stage .badge {
    right: 8px;
    top: 8px;
    font-size: 10px;
    padding: 5px 10px 5px 19px;
  }

  .stage .toast {
    top: 44px;
    width: min(86%, 300px);
    padding: 8px 12px;
    font-size: 12px;
    text-align: center;
  }

  .control-dock {
    width: 100%;
    height: 100%;
    min-height: 0;
    gap: 0;
    overflow: hidden;
  }

  .panel {
    height: 100%;
    max-height: 100%;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 9px;
    border-radius: 12px 12px 22px 22px;
  }

  .panel .row {
    gap: 6px !important;
    margin-bottom: 3px !important;
    flex-wrap: nowrap;
  }

  .row select,
  .row input[type="range"] {
    flex-basis: 0;
  }

  .pill {
    padding: 5px 8px;
    border-radius: 10px;
    font-size: 10px;
  }

  label,
  select,
  button,
  .btn-link {
    font-size: 12px;
  }

  button,
  .btn-link {
    min-height: 36px;
    padding: 8px 10px;
    border-radius: 11px;
  }

  .hint {
    margin: 2px 0 4px;
    max-height: 32px;
    overflow: hidden;
    font-size: 10.5px;
    line-height: 1.35;
  }

  .thumbs {
    gap: 6px;
    margin-top: 2px;
  }

  .thumb {
    height: 34px;
    border-radius: 10px;
    font-size: 10px;
  }

  .thumb span {
    bottom: 3px;
    font-size: 9px;
  }

  .toolbar {
    flex: 1 1 auto;
    min-height: 0;
    margin-top: 2px;
    padding: 8px;
    gap: 6px;
    justify-content: end;
  }

  .capture-bar {
    min-height: 0;
  }

  .btn-group {
    gap: 6px;
  }

  .btn-group button,
  .btn-group .btn-link {
    min-height: 38px;
  }

  .coach {
    position: fixed;
    left: clamp(88px, 24vw, 104px);
    right: 16px;
    width: auto;
    top: 18px;
    max-height: calc(100dvh - 36px);
    overflow: auto;
    padding: 16px;
    border-radius: 20px;
    z-index: 150;
  }

  .coach-bar {
    margin-bottom: 8px;
  }

  .coach-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .coach-content p {
    margin: 5px 0;
    font-size: 12px;
  }
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
        <div class="coach-bar"><strong>Quick Guide</strong><button type="button" class="coach-close" aria-label="Close instructions" onclick="try{window.sessionStorage?.setItem('mf:coach:grip:dismissed','1')}catch(e){};this.closest('.coach').classList.add('hidden')">Close</button></div>
        <div class="coach-content">
          <p>1. Position hand (holding mouse) inside box</p>
          <p>2. Capture <b>Top</b>, <b>Bottom</b>, then <b>Side</b> views</p>
          <p>3. We classify <b>palm</b> vs <b>claw</b> from index and middle finger bend</p>
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
        <div id="hint" class="hint">Capture 3 angles: <b>Top</b>, <b>Bottom</b>, <b>Side</b>.</div>

        <div class="thumbs">
          <div class="thumb"><img id="thumbTop" alt="Top"><span>Top</span></div>
          <div class="thumb"><img id="thumbBottom" alt="Bottom"><span>Bottom</span></div>
          <div class="thumb"><img id="thumbSide" alt="Side"><span>Side</span></div>
        </div>

        <div class="toolbar capture-bar" id="liveBtns">
          <div class="btn-group">
            <button id="timer" class="primary">Capture</button>
            <button id="retakeAll">Reset</button>
          </div>
          <button id="snap" style="display:none;">Capture now</button>
          <button id="toggleSkel" style="display:none;">Toggle skeleton</button>
        </div>

        <div class="toolbar capture-bar" id="frozenBtns" style="display:none;">
          <div class="btn-group">
            <button id="accept" class="primary">Capture</button>
            <button id="retake">Reset</button>
          </div>
          <button id="classify" disabled style="display:none;">Classify Grip</button>
          <a id="gotoReport" class="btn-link" href="/report" style="display:none;">Report</a>
          <div class="meta"><span id="resultPill" class="pill">Result: —</span></div>
        </div>
      </div>
    </div>
  </div>

  <button id="startCamBtn" style="position:fixed; right:16px; bottom:16px; z-index:30; background:var(--accent-soft-strong); color:var(--on-surface); font-weight:600; border:1px solid var(--accent-gamer-line); padding:12px 16px; border-radius:16px; display:none;">Tap to start</button>

  <div id="resultPopup" class="result-popup-overlay">
    <div class="result-popup">
      <p class="result-label">Detected Grip Style</p>
      <p id="resultPopupValue" class="result-value">—</p>
      <p class="result-desc">Your grip has been saved. You can view your full fit report or continue browsing.</p>
      <div class="result-actions">
        <a href="/report" class="btn-link primary">View Report</a>
        <button onclick="document.getElementById('resultPopup').style.display='none'">Close</button>
      </div>
    </div>
  </div>
`;

export default function GripPage() {
  useEffect(() => {
    const ensureCoachVisible = () => {
      const coach = document.getElementById('coach');
      if (coach) {
        const dismissKey = `${coach.dataset.key || 'mf:coach:grip'}:dismissed`;
        const isMobile = window.matchMedia('(max-width: 700px)').matches;
        let dismissed = false;
        try {
          dismissed = window.sessionStorage?.getItem(dismissKey) === '1';
        } catch {}
        const closeButton = coach.querySelector<HTMLButtonElement>('.coach-close');
        if (closeButton && !closeButton.dataset.bound) {
          closeButton.dataset.bound = '1';
          closeButton.addEventListener('click', () => {
            try {
              window.sessionStorage?.setItem(dismissKey, '1');
            } catch {}
            coach.classList.add('hidden');
          });
        }
        if (isMobile && dismissed) {
          coach.classList.add('hidden');
        } else {
          coach.classList.remove('hidden');
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('grip-page-ready'));
        }
      }
    };

    const timeoutId = setTimeout(ensureCoachVisible, 100);
    ensureCoachVisible();

    return () => {
      clearTimeout(timeoutId);
      if (typeof window !== 'undefined') {
        const windowWithGripStop = window as Window & { stopCamGrip?: () => void };
        if (windowWithGripStop.stopCamGrip) {
          try {
            windowWithGripStop.stopCamGrip();
          } catch {}
        }
      }
    };
  }, []);

  return (
    <>
      <ShellNav currentPage="grip" />
      <div className="studio-tool-page mx-auto min-h-0 w-full max-w-[1560px]">
        <header className="shell-content-header shell-tool-header mb-5 border-b border-[var(--shell-border-strong)] pb-5">
          <p className="text-xs font-medium text-[var(--shell-accent-strong)]">Camera tool</p>
          <h1 className="mt-2 text-[2rem] font-semibold text-[var(--shell-text-primary)] sm:text-[2.55rem]">Grip scan</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--shell-text-secondary)]">
            Capture top, bottom, and side views while holding your mouse to classify your grip.
          </p>
        </header>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="tool-shell" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        <Script
          id="grip-thumbs"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `['thumbTop','thumbBottom','thumbSide'].forEach(id => {\n  const img = document.getElementById(id);\n  const box = img?.closest('.thumb');\n  if (!img || !box) return;\n  const showIfLoaded = () => { if (img.currentSrc && img.naturalWidth > 0) box.classList.add('has-img'); };\n  img.addEventListener('load', showIfLoaded);\n  if (img.complete) showIfLoaded();\n});`,
          }}
        />
        <Script type="module" src="/src/js/grip.js?v=2" strategy="afterInteractive" key="grip-js" />
        <Script
          id="grip-finish"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.finishGrip = async (grip) => {
  var g = String(grip || '').toLowerCase();
  sessionStorage.setItem('mf:grip', g);

  // Update wizard state with detected grip so survey picks it up
  var wKeys = ['mousefit:survey_wizard_state', 'mf:survey_wizard_state'];
  wKeys.forEach(function(k) {
    try {
      var raw = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (raw) {
        var obj = JSON.parse(raw);
        obj.primaryGrip = g;
        obj.gripSkipped = false;
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
    await fetch(apiBase + '/api/grip', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ session_id: sessionId, grip: g }),
    });
  } catch {}

  var params = new URLSearchParams(window.location.search);
  if (params.get('from') === 'survey') {
    location.href = '/survey';
  } else {
    var el = document.getElementById('resultPopupValue');
    if (el) el.textContent = g.charAt(0).toUpperCase() + g.slice(1) + ' Grip';
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


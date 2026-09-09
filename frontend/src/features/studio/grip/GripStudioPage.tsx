"use client";

import CaptureStudio from "../CaptureStudio";

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
  flex: 1 1 auto;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(288px, 320px);
  align-items: stretch;
  justify-content: center;
  padding: 0;
  gap: 16px;
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
  overflow: visible;
  min-height: 0;
}

.stage {
  position: relative;
  width: 100%;
  max-width: 100%;
  min-height: 0;
  height: auto;
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
  height: 100%;
  max-height: 100%;
  overflow: hidden;
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

@media (max-width: 960px) {
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

@media (max-width: 700px) {
  .tool-shell {
    height: auto;
    min-height: 0;
    padding: 0;
    overflow: visible;
    display: block;
  }

  .wrap {
    display: flex;
    flex-direction: column;
    height: auto;
    min-height: 0;
    max-width: none;
    padding: 0;
    gap: 10px;
    overflow: visible;
  }

  .stage {
    width: 100%;
    height: auto;
    min-height: 220px;
    aspect-ratio: 4/3;
    border-radius: 14px;
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
    height: auto;
    max-height: none;
    min-height: 0;
    gap: 10px;
    overflow: visible;
  }

  .panel {
    height: auto;
    max-height: none;
    min-height: 0;
    overflow: visible;
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 12px;
    border-radius: 14px;
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
    max-height: none;
    overflow: visible;
    font-size: 10.5px;
    line-height: 1.35;
  }

  .thumbs {
    gap: 6px;
    margin-top: 2px;
  }

  .thumb {
    height: 44px;
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
    padding: 10px;
    gap: 8px;
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
    position: relative;
    inset: auto;
    width: 100%;
    max-height: none;
    overflow: visible;
    padding: 12px;
    border-radius: 14px;
    z-index: 60;
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
      <div id="status" class="badge" role="status">Starting camera</div>
      <div id="toast" class="toast" role="status" aria-live="polite"></div>
      <div id="countdown" class="countdown">5</div>
    </div>

    <div class="control-dock">
      <div class="coach" id="coach" data-key="mf:coach:grip">
        <div class="coach-bar"><strong>Quick Guide</strong><button type="button" class="coach-close" aria-label="Close instructions" onclick="try{window.sessionStorage?.setItem('mf:coach:grip:dismissed','1')}catch(e){};this.closest('.coach').classList.add('hidden')">Close</button></div>
        <div class="coach-content">
          <p>1. Position hand (holding mouse) inside box</p>
          <p>2. Capture <b>Top</b>, <b>Bottom</b>, then <b>Side</b> views</p>
          <p>3. Review the suggested grip. You can correct it before saving.</p>
        </div>
      </div>

      <div class="panel">
        <div class="row" style="gap:10px; margin-bottom:8px;">
          <label for="cameraSelect">Camera:</label>
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
            <button id="timer" class="primary">Capture in 5 seconds</button>
            <button id="retakeAll">Start over</button>
          </div>
          <button id="snap" style="display:none;">Capture now</button>
          <button id="toggleSkel" style="display:none;">Toggle skeleton</button>
        </div>

        <div class="toolbar capture-bar" id="frozenBtns" style="display:none;">
          <div class="btn-group">
            <button id="accept" class="primary">Use this photo</button>
            <button id="retake">Retake this view</button>
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
  return <CaptureStudio kind="grip" cameraStyles={styles} cameraHtml={bodyHtml} />;
}

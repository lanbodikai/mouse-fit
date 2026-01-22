"use client";

import Script from "next/script";
import { useEffect } from "react";

const styles = `
:root{
  --bg:#06080b; --fg:#eaf0ff; --sub:#a6b0c8;
  --border:rgba(255,255,255,.10);
  --g1:#7c3aed; --g2:#22d3ee; --g3:#a78bfa;
  --stage-offset-y: -120px;
  --stage-offset-x: 0px;
  --dock-offset-y: -105px;
  --guides-left:4%; --guides-right:4%; --guides-top:4%; --guides-bottom:4%;
  --dock-scale:1;
}
.tool-shell, .tool-shell *{box-sizing:border-box}

/* Flexbox Layout inside the shell panel */
.tool-shell{
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

/* ===== App Wrapper ===== */
.wrap {
  flex: 1 1 auto;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  gap: 20px;
  overflow: hidden;
  height: 100%;
}

/* Bounded capture area */
.stage{
  position:relative;
  width: min(720px, 70vw);
  height: 72%;
  max-height: 800px;
  aspect-ratio:16/10;
  border-radius:30px;
  overflow:hidden;
  border: 1px solid rgba(255,255,255,.1);
  background: var(--bg);
  flex-shrink: 0;
  transform: translate(var(--stage-offset-x), var(--stage-offset-y));
}

/* Media fills stage */
.stage > video, .stage > canvas{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }

/* Overlays */
.stage .guides{ position:absolute; left:var(--guides-left); right:var(--guides-right); top:var(--guides-top); bottom:var(--guides-bottom); display:flex; align-items:center; justify-content:center; pointer-events:auto; touch-action:none; z-index:2; }
.stage .guide{ border:3px dashed rgba(255,255,255,.65); border-radius:14px; background:transparent; position:relative; }
.stage #handGuide{ flex:3 1 0; min-height:94%; }
.stage .label{ position:absolute; top:-14px; left:14px; background:var(--bg); border:1px solid rgba(255,255,255,.1); color:#fff; font-size:12px; font-weight:700; padding:3px 8px; border-radius:999px; }
.stage .badge{ position:absolute; right:10px; top:10px; background:var(--bg); border:1px solid rgba(255,255,255,.1); color:#fff; font-size:12px; padding:4px 8px; border-radius:999px; z-index:6 }
.stage .toast{ position:absolute; top:12px; left:50%; transform:translateX(-50%); background:var(--bg); border:1px solid rgba(255,255,255,.1); color:#fff; padding:8px 12px; border-radius:20px; font-size:13px; display:none; z-index:7 }
.stage .countdown{ position:absolute; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.35); font-size:22vmin; font-weight:900; color:#fff; text-shadow:0 2px 10px rgba(0,0,0,.6); pointer-events:none; z-index:8 }

/* Draggable points */
.point{ position:absolute; width:18px; height:18px; border-radius:50%; border:2px solid #e5f8ff; background:#0b2a33aa; transform:translate(-50%,-50%); touch-action:none; cursor:grab; pointer-events:auto; display:none; z-index:10 }
.point.green{ border-color:#a3ffb0; background:#0b3316aa }
.point.blue{  border-color:#9fe9ff; background:#0b2b44aa }

/* Control Dock */
.control-dock{ position:relative; display:flex; flex-direction:column; gap:16px; z-index:50; padding:0; background:none; flex-shrink: 0; height: 75%; transform: translateY(var(--dock-offset-y)); }
.panel{ width:380px; flex:0 0 58%; overflow:auto; border:1px solid rgba(255,255,255,.1); background: var(--bg); backdrop-filter: blur(8px); border-radius:30px; padding:20px; transform: scale(var(--dock-scale)); transform-origin: top right; touch-action:none; scrollbar-width: none; }
.panel::-webkit-scrollbar{ width:0; height:0; }
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;min-width:0;}
.row > * {min-width:0;flex-shrink:1;}
.toolbar{display:flex;flex-direction:column;gap:10px;margin-top:10px;padding:10px;border-radius:20px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);}
.btn-group{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.btn-group button{width:100%; min-height:36px}
.meta{display:flex; flex-direction: row; gap: 8px; flex-wrap:wrap;}
.meta .pill { flex:1; text-align: center; min-width:0; }
.pill{padding:6px 10px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);font-size:11px;color:#fff;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;max-width:100%;}
button{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:8px 10px;font-weight:600;cursor:pointer;transition:all 0.2s;font-size:12px;letter-spacing:.1px;}
button:hover{background:rgba(255,255,255,.2);}
button.primary{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);}
select{background:#000;color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:10px 12px;font-size:14px;}
.hint{font-size:13px;color:var(--sub);margin:4px 0 8px;line-height:1.4;}

/* Coach / Handle */
.dock-handle{ display:none; }
.coach{ height: 35%; flex:0 0 35%; position: relative; width: 380px; padding: 16px 20px; border-radius: 30px; border: 1px solid rgba(255,255,255,.1); background: var(--bg); backdrop-filter: blur(10px); color: var(--fg); z-index: 60; display: block !important; visibility: visible !important; opacity: 1 !important; }
.coach.hidden{ display: block !important; visibility: visible !important; }
.coach-bar{ display: flex; align-items: center; padding: 0; margin: 0 0 12px 0; border:none; background: none; user-select: none; }
.coach-bar strong{ font-size:15px; font-weight:700; color:#fff; }
.coach-close{ display:none; }
.coach-content p{ margin: 4px 0; color: #cfd6ee; line-height: 1.5; font-size:13px; }

@media (max-width: 820px){
  .tool-shell{ overflow:auto; overscroll-behavior:y contain; display: block; }
  .wrap{ height:auto; min-height:calc(100dvh - 60px); padding:12px 12px calc(88px + env(safe-area-inset-bottom)); flex-direction:column; }
  .stage{ width:min(100%, 96vw); max-height:none; aspect-ratio: 16/9; }
  .guides{ left:3%; right:3%; top:3%; bottom:3%; }
  .control-dock{ position:sticky; left:0; right:0; bottom:0; top:auto; transform:none; padding:0 8px calc(8px + env(safe-area-inset-bottom)); width:100%; }
  .coach{ width:100%; }
  .panel{ width:auto; max-width:none; max-height:48dvh; border-radius:30px; padding:16px; margin:0 auto; }
  .meta{ flex-direction:column; }
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
        <div class="coach-bar"><strong>Guide</strong></div>
        <div class="coach-content">
          <p>1) Position hand & card inside the box.</p>
          <p>2) Press <b>Space</b> to capture.</p>
          <p>3) Double click card corners if needed.</p>
        </div>
      </div>

      <div class="panel">
        <div class="row" style="gap:12px; margin-bottom:6px;">
          <label>Camera:</label>
          <select id="cameraSelect"></select>
          <button id="refreshCams">Refresh</button>
          <span id="camName" class="pill">—</span>
        </div>
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

  <button id="startCamBtn" style="position:absolute; inset:auto 12px 12px auto; z-index:30; background:linear-gradient(90deg,var(--g1),var(--g2),var(--g3)); color:#fff; border:0; padding:10px 14px; border-radius:12px; display:none;">Tap to start camera</button>

  <footer class="foot" style="text-align:center; padding:10px; font-size:12px; color:var(--sub);">
    <span>© <span id="y"></span> Mouse-Fit</span>
  </footer>
`;

export default function MeasurePage() {
  useEffect(() => {
    // Ensure coach element is visible on navigation
    const ensureCoachVisible = () => {
      const coach = document.getElementById('coach');
      if (coach) {
        // Remove hidden class if present and ensure it's displayed
        coach.classList.remove('hidden');
        coach.style.display = '';
        coach.style.visibility = 'visible';
        coach.style.opacity = '1';
        // Trigger setup if script hasn't run yet
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('measure-page-ready'));
        }
        return true;
      }
      return false;
    };

    // Try multiple times to ensure DOM is ready
    let attempts = 0;
    const maxAttempts = 20;
    const trySetup = () => {
      attempts++;
      const found = ensureCoachVisible();
      if (!found && attempts < maxAttempts) {
        setTimeout(trySetup, 50);
      } else if (found) {
        // Once found, ensure it stays visible
        const coach = document.getElementById('coach');
        if (coach) {
          // Force visibility
          coach.style.display = '';
          coach.style.visibility = 'visible';
          coach.style.opacity = '1';
          coach.classList.remove('hidden');
        }
      }
    };
    
    // Use MutationObserver to watch for coach element being added
    const observer = new MutationObserver((mutations) => {
      const coach = document.getElementById('coach');
      if (coach) {
        ensureCoachVisible();
        observer.disconnect();
      }
    });
    
    // Start observing the document body
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Start immediately and also after delays
    trySetup();
    const timeoutId1 = setTimeout(trySetup, 100);
    const timeoutId2 = setTimeout(trySetup, 300);
    const timeoutId3 = setTimeout(trySetup, 500);

    // Cleanup camera on unmount
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      if (typeof window !== 'undefined' && (window as any).stopCam) {
        try {
          (window as any).stopCam();
        } catch (e) {
          // Ignore errors
        }
      }
      // Also try to stop any active media streams
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            stream.getTracks().forEach(track => track.stop());
          })
          .catch(() => {
            // Ignore errors
          });
      }
    };
  }, []);

  return (
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
  );
}

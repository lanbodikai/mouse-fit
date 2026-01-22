"use client";

import Script from "next/script";
import { useEffect } from "react";

const styles = `
:root.dark{
  --bg:#06080b; --fg:#eaf0ff; --sub:#a6b0c8; --border:rgba(255,255,255,.10);
  --g1:#7c3aed; --g2:#22d3ee; --g3:#a78bfa;
}
:root.light{
  --bg:#f9fafb; --fg:#1a1a1a; --sub:#6b7280; --border:rgba(0,0,0,.10);
  --g1:#7c3aed; --g2:#22d3ee; --g3:#a78bfa;
}
:root{
  --stage-offset-y: -120px;
  --stage-offset-x: 0px;
  --dock-offset-y: -105px;
  --guide-scale: 1;
  --panel-scale: 1;
}
.tool-shell, .tool-shell *{box-sizing:border-box}

/* Flexbox Layout */
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

/* App Wrapper */
.wrap{ flex: 1 1 auto; position:relative; padding:10px; display:flex; align-items:center; justify-content:space-between; gap:20px; overflow:hidden; height: 100%; }

.stage{
  position:relative; width:min(720px, 70vw); height:72%; max-height:800px;
  aspect-ratio:16 / 9; border-radius:30px; overflow:hidden;
  border:1px solid var(--border);
  background: var(--bg);
  flex-shrink: 0;
  transform: translate(var(--stage-offset-x), var(--stage-offset-y));
}
.stage > video, .stage > canvas{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.stage > video { z-index:0; } canvas#frame { z-index:1; } .stage > .gripGuide { z-index:2; } canvas#overlay { z-index:3; pointer-events:none; }

.stage .gripGuide{
  position:absolute; left:4%; right:4%; top:4%; bottom:4%;
  border:3px dashed var(--fg); border-radius:14px; background:transparent;
  display:flex; align-items:center; justify-content:center; transform-origin:center; transform:scale(var(--guide-scale, 1));
}
.stage.guide-hidden .gripGuide{ opacity:0; visibility:hidden; }
.stage .label{ position:absolute; top:-14px; left:14px; background:var(--bg); border:1px solid var(--border); color:var(--fg); font-size:12px; font-weight:700; padding:3px 8px; border-radius:999px; }
.stage .badge{ position:absolute; right:10px; top:10px; background:var(--bg); border:1px solid var(--border); color:var(--fg); font-size:12px; padding:4px 8px; border-radius:999px; z-index:6 }
.stage .toast{ position:absolute; top:12px; left:50%; transform:translateX(-50%); background:var(--bg); border:1px solid var(--border); color:var(--fg); padding:8px 12px; border-radius:20px; font-size:13px; display:none; z-index:7 }
.stage .countdown{ position:absolute; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.35); font-size:22vmin; font-weight:900; color:#fff; text-shadow:0 2px 10px rgba(0,0,0,0.6); pointer-events:none; z-index:8 }

/* Dock */
.control-dock{ position:relative; display:flex; flex-direction:column; gap:16px; z-index:50; padding:0; background:none; flex-shrink: 0; height: 75%; transform: translateY(var(--dock-offset-y)); }
.panel{ width:380px; flex:0 0 58%; overflow:auto; border:1px solid var(--border); background: var(--bg); backdrop-filter: blur(8px); border-radius:30px; padding:18px 18px 16px; transform-origin: top right; transform: scale(var(--panel-scale, 1)); scrollbar-width: none; }
.panel::-webkit-scrollbar{ width:0; height:0; }
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;min-width:0;}
.row > * {min-width:0;flex-shrink:1;}
.toolbar{display:flex;flex-direction:column;gap:10px;margin-top:10px;padding:10px 10px 8px;border-radius:18px;border:1px solid var(--border);background:var(--border);opacity:0.5;}
.btn-group{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.btn-group button,.btn-group .btn-link{width:100%; min-height:36px}
.meta{display:flex; flex-direction: row; gap: 8px; flex-wrap:wrap;}
.meta .pill{ flex:1; text-align: center; min-width:0; }
.pill{padding:6px 10px;border-radius:14px;background:var(--border);border:1px solid var(--border);font-size:11px;color:var(--fg);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;max-width:100%;}
button,.btn-link{background:var(--border);color:var(--fg);border:1px solid var(--border);border-radius:12px;padding:8px 10px;font-weight:600;cursor:pointer;text-decoration:none; text-align:center;transition:all 0.2s;font-size:12px;letter-spacing:.1px;}
button:hover,.btn-link:hover{background:var(--border);opacity:0.8;}
button.primary{background:var(--border);border:1px solid var(--border);opacity:0.9;}
select{background:var(--bg);color:var(--fg);border:1px solid var(--border);border-radius:20px;padding:10px 12px;font-size:14px;}
.thumbs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px;align-items:center}
.thumb{ position: relative; width:100%; height:48px; max-width:90px; border-radius:12px; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.05); overflow:hidden; display:grid; place-items:center; font-size:11px; color:rgba(255,255,255,.8); min-width:0; }
.thumb span{ position:absolute; left:6px; right:6px; bottom:4px; text-align:center; font-size:10px; }
.thumb.has-img span{ display:none; }
.thumb img{ width:100%; height:100%; object-fit:contain; display:none; max-width:100%; max-height:100%; }
.thumb.has-img img{ display:block; }
.hint{font-size:13px;color:var(--sub);margin:4px 0 8px;line-height:1.4;}
.dock-handle{ display:none; }

/* Coach */
.coach{ height: 35%; flex:0 0 35%; position: relative; width: 380px; padding: 16px 20px; border-radius: 30px; border: 1px solid rgba(255,255,255,.1); background: var(--bg); backdrop-filter: blur(10px); color: var(--fg); z-index: 60; }
.coach.hidden{ display:none; }
.coach-bar{ display: flex; align-items: center; padding: 0; margin: 0 0 12px 0; border:none; background: none; user-select: none; }
.coach-bar strong{ font-size:15px; font-weight:700; color:#fff; }
.coach-close{ display:none; }
.coach-content p{ margin: 4px 0; color: var(--sub); line-height: 1.5; font-size:13px; }

@media (max-width: 820px){
  .tool-shell{ overflow:auto; overscroll-behavior:y contain; display:block; }
  .wrap{ height:auto; min-height:calc(100dvh - 60px); padding:12px 12px 88px; flex-direction:column; }
  .stage{ width:min(100%, 96vw); max-height:none; aspect-ratio: 16/9; }
  .control-dock{ position:sticky; left:0; right:0; bottom:0; top:auto; transform:none; padding:0 8px 8px; width:100%; }
  .coach{ width:100%; }
  .panel{ width:auto; max-width:none; max-height:48dvh; margin:0 auto; border-radius:30px; padding:16px; }
  .meta{ flex-direction:column; }
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
        <div class="coach-bar"><strong>Guide</strong></div>
        <div class="coach-content">
          <p>1) Position hand (holding mouse) inside box.</p>
          <p>2) Capture Top, Right, then Left views.</p>
          <p>3) Classify.</p>
        </div>
      </div>

      <div class="panel">
        <div class="row" style="gap:12px; margin-bottom:6px;">
          <label>Camera:</label>
          <select id="cameraSelect"></select>
          <button id="refreshCams">Refresh</button>
          <span id="camName" class="pill">—</span>
        </div>
        <div id="hint" class="hint">Capture 3 angles: <b>Top</b>, <b>Right</b>, <b>Left</b>.</div>

        <div class="thumbs">
          <div class="thumb"><img id="thumbTop"   alt="Top"><span>Top</span></div>
          <div class="thumb"><img id="thumbRight" alt="Right"><span>Right</span></div>
          <div class="thumb"><img id="thumbLeft"  alt="Left"><span>Left</span></div>
        </div>

        <div class="toolbar" id="liveBtns">
          <div class="btn-group">
            <button id="timer" class="primary">Capture (Space)</button>
            <button id="snap">Capture now</button>
            <button id="toggleSkel">Toggle skeleton</button>
            <button type="button" data-toggle-guide>Hide guide</button>
            <button id="retakeAll">Retake all</button>
          </div>
          <div class="meta">
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

  <button id="startCamBtn" style="position:absolute; inset:auto 12px 12px auto; z-index:30; background:linear-gradient(90deg,var(--g1),var(--g2),var(--g3)); color:#fff; border:0; padding:10px 14px; border-radius:12px; display:none;">Tap to start</button>

  <footer class="foot" style="text-align:center; padding:10px; font-size:12px; color:var(--sub);">
    <span>© <span id="y"></span> Mouse-Fit</span>
  </footer>
`;

export default function GripPage() {
  useEffect(() => {
    // Ensure coach element is visible on navigation
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

    // Cleanup camera on unmount
    return () => {
      clearTimeout(timeoutId);
      if (typeof window !== 'undefined' && (window as any).stopCamGrip) {
        try {
          (window as any).stopCamGrip();
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
      <Script
        id="grip-api-base"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.API_BASE_URL = "${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}";`,
        }}
      />
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
  );
}

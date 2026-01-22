/* docs/js/main.js — drop-in fixed build */

// ===== (optional) mouse DB; safe if missing =====
let MICE = [];
try {
  const mod = await import("./mice.js");
  MICE = mod.MICE || [];
} catch (_) {
  console.warn("mice.js not found — recommendations will be skipped (ok for now).");
}
/* ---- DB compatibility shim ---- */
if (!MICE.length) {
  try {
    const mod2 = await import("./mice.js");
    const raw = mod2.MICE || mod2.mice || mod2.default || [];
    const norm = (x) => ({
      brand: x.brand || x.Brand || "",
      model: x.model || x.Model || "",
      length_mm: Number(x.length_mm ?? x.length ?? x.len ?? 0),
      width_mm:  Number(x.width_mm  ?? x.width  ?? x.wid ?? 0),
      height_mm: Number(x.height_mm ?? x.height ?? x.ht  ?? 0),
      weight_g:  Number(x.weight_g  ?? x.weight ?? x.mass ?? 0),
      shape: (() => {
        const s = String(x.shape || x.Shape || "").toLowerCase();
        if (s.includes("sym")) return "sym";
        if (s.includes("ergo")) return "ergo";
        return s || "sym";
      })(),
      hump: x.hump || x.Hump || "",
      tags: x.tags || x.Tags || []
    });
    MICE = Array.isArray(raw) ? raw.map(norm).filter(m => m.length_mm && m.width_mm) : [];
  } catch {}
}

/* ================== constants ================== */
const CARD_W_MM = 85.60, CARD_H_MM = 53.98;        // ISO/IEC 7810 ID-1
const PX_PER_MM = 10;
const DEST_W = Math.round(CARD_W_MM * PX_PER_MM);
const DEST_H = Math.round(CARD_H_MM * PX_PER_MM);

const TASK_URL   = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const VISION_MJS = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";

const EDGE_SEARCH   = 140;  // px to scan outward for palm edges
const TIP_EXTENSION = 0.35; // extra beyond detected middle fingertip

/* ================== DOM ================== */
const video        = document.getElementById("cam");
const canvas       = document.getElementById("frame");
const ctx          = canvas.getContext("2d");

const cameraSelect = document.getElementById("cameraSelect");
const refreshCams  = document.getElementById("refreshCams");
const startCamBtn  = document.getElementById("startCamBtn");
const camName      = document.getElementById("camName");

const statusBadge  = document.getElementById("status");
const toast        = document.getElementById("toast");
const countdownEl  = document.getElementById("countdown");

// NOTE: .guides is a CLASS in your HTML
const guides       = document.querySelector(".guides");
const handGuide    = document.getElementById("handGuide");
const cardGuide    = document.getElementById("cardGuide");

const liveBtns     = document.getElementById("liveBtns");
const refineRow    = document.getElementById("refineRow");
const timerBtn     = document.getElementById("timer");
const snapBtn      = document.getElementById("snap");
const resetBtn     = document.getElementById("reset");
const confirmBtn   = document.getElementById("confirm");
const snapEdgesBtn = document.getElementById("snapEdges");
const snapTipBtn   = document.getElementById("snapTip");

const toggleSkel   = document.getElementById("toggleSkel");
const skelState    = document.getElementById("skelState");
// Correct ID: measure.html uses id="stepPill"
const stepPill     = document.getElementById("stepPill");
const toggleGuide  = document.getElementById("toggleGuide");
const guideState   = document.getElementById("guideState");
const dockPanel    = document.querySelector('.control-dock .panel');
const footerYear   = document.getElementById("y");

if (footerYear) footerYear.textContent = new Date().getFullYear();

// === required draggable handles (must exist in measure.html) ===
const pEls = ["p0","p1","p2","p3"].map(id => document.getElementById(id));
const hA = document.getElementById("hA");
const hB = document.getElementById("hB");
const wL = document.getElementById("wL");
const wR = document.getElementById("wR");

/* ================== state ================== */
let stream = null;
let currentDeviceId = null;

let frameData = null;  // frozen image data
let H = null;          // homography matrix
let wrist = null, tip = null, palmL = null, palmR = null;

let handLandmarker = null, runMode = null;

// live skeleton state + user preference (remember across resets)
let skeletonLive = false;
let userPrefSkeletonOn = true; // default ON

let countdownTimer = null;
let isFrozen = false; // controls live vs frozen rendering
let nextCorner = 0;

/* ================== boot ================== */
(async function boot() {
  await initCameraLayer();       // robust camera start (localhost/iOS safe)
  wireUI();
  restoreGuidesPrefs();
  restoreDockScale();
  resize();
  requestAnimationFrame(loopLive);

  // Start skeleton overlay by default (respect user preference)
  await waitForVideoReady();
  if (userPrefSkeletonOn) await startSkeleton();
  updateSkeletonUI();
})();

function waitForVideoReady(){
  return new Promise(res=>{
    if (video.readyState>=2 && (video.videoWidth||0)>0) return res();
    const done=()=>{ res(); cleanup(); };
    const cleanup=()=>{ video.removeEventListener('loadedmetadata',done); video.removeEventListener('playing',done); };
    video.addEventListener('loadedmetadata',done); video.addEventListener('playing',done);
  });
}

/* ================== CAMERA (robust for localhost/iOS) ================== */
async function ensureCamPermission() {
  try {
    const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    tmp.getTracks().forEach(t => t.stop());
    return true;
  } catch (e) {
    console.warn("Permission error:", e);
    showToast("Please allow camera access in the address bar.");
    return false;
  }
}

async function populateCams(force=false) {
  try {
    if (force) await ensureCamPermission();
    const devs = await navigator.mediaDevices.enumerateDevices();
    const cams = devs.filter(d => d.kind === "videoinput");
    cameraSelect.innerHTML = "";
    cams.forEach((c,i)=>{
      const o=document.createElement("option");
      o.value=c.deviceId; o.textContent=c.label || `Camera ${i+1}`;
      cameraSelect.appendChild(o);
    });
    if (!cams.length) showToast("No cameras found.");
  } catch (e) {
    console.error("enumerateDevices failed:", e);
    showToast("Couldn’t list cameras. Check permissions.");
  }
}

async function startCam(deviceId) {
  stopCam();

  // prefer user-facing @ 1280x720; fallbacks chained below
  let constraints = deviceId
    ? { video: { deviceId: { exact: deviceId } }, audio: false }
    : { video: { facingMode: { ideal: "user" }, width: {ideal:1280}, height: {ideal:720}, frameRate:{ideal:30} }, audio: false };

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (e1) {
    console.warn("Exact/ideal failed:", e1?.name, e1?.message);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio:false });
    } catch (e2) {
      console.warn("Env fallback failed:", e2?.name, e2?.message);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
      } catch (e3) {
        return handleGUMError(e3);
      }
    }
  }

  video.srcObject = stream;

  try {
    await video.play();
    if (startCamBtn) startCamBtn.style.display = "none";
  } catch (playErr) {
    // autoplay blocked (iOS/Safari/strict desktop)
    if (startCamBtn) {
      startCamBtn.style.display = "block";
      startCamBtn.onclick = async () => {
        try { await video.play(); startCamBtn.style.display = "none"; }
        catch (e) { showToast("Tap blocked; click the address-bar camera icon, then try again."); }
      };
    } else {
      const oneTap = async () => { try { await video.play(); } catch {} document.removeEventListener("click", oneTap, true); };
      document.addEventListener("click", oneTap, true);
    }
  }

  const track = stream.getVideoTracks()[0];
  const settings = track.getSettings?.() || {};
  currentDeviceId = settings.deviceId || deviceId || null;
  camName.textContent = track.label || "Camera";

  if (currentDeviceId && cameraSelect) {
    [...cameraSelect.options].some(o => (o.value === currentDeviceId && (cameraSelect.value = o.value, true)));
  }

  // restart if tab returns and stream died
  document.removeEventListener("visibilitychange", onVis);
  document.addEventListener("visibilitychange", onVis);
  async function onVis() {
    if (document.visibilityState === "visible") {
      if (!stream || !stream.active) await startCam(currentDeviceId);
    }
  }
}

function stopCam() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
}

function handleGUMError(e) {
  const name = e?.name || "Error", msg = e?.message || String(e);
  console.warn("getUserMedia error:", name, msg);
  if (name === "NotAllowedError") showToast("Permission denied. Click the camera icon in the address bar and allow.");
  else if (name === "NotFoundError") showToast("No camera found. Check OS privacy settings.");
  else if (name === "NotReadableError") showToast("Camera is busy in another app (Zoom/Teams/OBS).");
  else if (name === "OverconstrainedError") showToast("This camera doesn’t support those settings; falling back…");
  else if (name === "SecurityError") showToast("Blocked by browser. Use http://localhost (not file://).");
  else showToast("Camera error: " + msg);
}

async function initCameraLayer() {
  if (!(location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    showToast("Use HTTPS or localhost (not file://) for camera.");
    return;
  }
  // iOS/Safari-friendly
  video.setAttribute("playsinline",""); video.playsInline = true; video.muted = true;

  await ensureCamPermission();
  await populateCams(true);
  await startCam();

  cameraSelect.onchange = async () => startCam(cameraSelect.value);
  refreshCams.onclick   = () => populateCams(true);
}

/* ================== UI ================== */
function wireUI() {
  timerBtn.onclick   = () => startCountdown(5);
  snapBtn.onclick    = () => capture();
  resetBtn.onclick   = async () => {
    resetAll();
    await startCam(currentDeviceId);
    if (userPrefSkeletonOn && !skeletonLive) await startSkeleton();
    updateSkeletonUI();
  };
  // Also wire the Reset in the refine toolbar
  const resetBtn2 = document.getElementById("reset2");
  if (resetBtn2) {
    resetBtn2.onclick = async () => {
      resetAll();
      await startCam(currentDeviceId);
      if (userPrefSkeletonOn && !skeletonLive) await startSkeleton();
      updateSkeletonUI();
    };
  }
  confirmBtn.onclick = () => confirmCard();

  snapEdgesBtn.onclick = () => { if (frameData) snapPalmEdgesSmart(); };
  snapTipBtn.onclick   = () => snapFingertip();

  toggleSkel.onclick = async () => {
    if (skeletonLive) {
      skeletonLive = false;
      userPrefSkeletonOn = false;
    } else {
      await startSkeleton();
      userPrefSkeletonOn = true;
    }
    updateSkeletonUI();
  };
  if (toggleGuide) {
    toggleGuide.onclick = () => {
      const hidden = guides?.style.display === 'none';
      if (hidden) {
        guides.style.display = '';
        if (guideState) guideState.textContent = 'Guides: On';
        toggleGuide.textContent = 'Hide guides';
        localStorage.setItem('mf:guides:hidden','0');
      } else {
        guides.style.display = 'none';
        if (guideState) guideState.textContent = 'Guides: Off';
        toggleGuide.textContent = 'Show guides';
        localStorage.setItem('mf:guides:hidden','1');
      }
    };
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === " ") { e.preventDefault(); if (!H && !countdownTimer) startCountdown(5); }
    if (e.key === "Enter") { if (!H) confirmCard(); }
    if (e.key === "Escape") { resetBtn.click(); }
  });

  // === make all draggable points work (vars updated while dragging; NO auto-snap)
  const syncVar = (el) => {
    const p = getXY(el);
    if (el === hA) wrist = p;
    else if (el === hB) tip = p;
    else if (el === wL) palmL = p;
    else if (el === wR) palmR = p;
  };

  [...pEls, wL, wR, hA, hB].forEach(el => {
    el.addEventListener("pointerdown", ev => {
      el.setPointerCapture(ev.pointerId);
      el.dataset.drag = "1";
    });

    el.addEventListener("pointermove", ev => {
      if (!el.dataset.drag) return;
      const pt = clientToCanvas(ev.clientX, ev.clientY);
      movePointEl(el, pt);
      syncVar(el);
      redrawFrozen();
    });

    ["pointerup","pointercancel"].forEach(evt =>
      el.addEventListener(evt, () => {
        delete el.dataset.drag;
        syncVar(el);
        redrawFrozen();
      })
    );
  });

  canvas.addEventListener("dblclick", (e) => {
    if (!isFrozen) return;
    const pt = clientToCanvas(e.clientX, e.clientY);
    movePointEl(pEls[nextCorner], pt);
    nextCorner = (nextCorner + 1) % 4;
    redrawFrozen();
  });
}

function updateSkeletonUI() {
  if (skeletonLive) {
    skelState.textContent = "Skeleton: On";
    toggleSkel.textContent = "Turn off skeleton";
  } else {
    skelState.textContent = "Skeleton: Off";
    toggleSkel.textContent = "Turn on skeleton";
  }
}
function updateGuidesUI(){
  const hidden = guides?.style.display === 'none';
  if (guideState) guideState.textContent = hidden ? 'Guides: Off' : 'Guides: On';
  if (toggleGuide) toggleGuide.textContent = hidden ? 'Show guides' : 'Hide guides';
}

/* ================== Live draw loop ================== */
function resize() {
  canvas.width  = video.videoWidth  || 1280;
  canvas.height = video.videoHeight || 720;
}

function loopLive() {
  if (!isFrozen) {
    // live: draw camera + (optional) skeleton
    resize();
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (skeletonLive) drawSkeletonLive();
  } else if (frameData) {
    // frozen: keep showing the captured frame + overlays
    ctx.putImageData(frameData, 0, 0);
    drawCardOverlay();
    drawMeasureLines();

    // Keep handles visible whenever they have coordinates
    for (const el of [...pEls, wL, wR, hA, hB]) {
      if (el.dataset.x) el.style.display = "block";
    }
  }
  requestAnimationFrame(loopLive);
}

/* ================== MediaPipe ================== */
async function mp(mode) {
  if (handLandmarker && runMode === mode) return handLandmarker;
  const vision = await import(/* @vite-ignore */ VISION_MJS);
  const files = await vision.FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  handLandmarker = await vision.HandLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: TASK_URL },
    numHands: 1,
    runningMode: mode
  });
  runMode = mode;
  return handLandmarker;
}

async function startSkeleton() {
  await mp("VIDEO");
  skeletonLive = true;
}

function drawSkeletonLive() {
  try {
    const result = handLandmarker.detectForVideo(video, performance.now());
    const lm = result?.landmarks?.[0];
    if (!lm) return;
    const edges = [ [0,1],[1,2],[2,3],[3,4],
                    [0,5],[5,6],[6,7],[7,8],
                    [0,9],[9,10],[10,11],[11,12],
                    [0,13],[13,14],[14,15],[15,16],
                    [0,17],[17,18],[18,19],[19,20] ];
    const px = i => ({ x: lm[i].x * canvas.width, y: lm[i].y * canvas.height });
    // outline
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    for (const [a,b] of edges) { const A = px(a), B = px(b); ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); }
    // bright
    ctx.lineWidth = 3; ctx.strokeStyle = '#8ef0ff';
    for (const [a,b] of edges) { const A = px(a), B = px(b); ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); }
  } catch { /* ignore */ }
}

/* ================== Capture flow ================== */
function startCountdown(seconds = 5) {
  countdownEl.style.display = "flex";
  countdownEl.textContent = seconds;
  const tick = () => {
    seconds--;
    if (seconds <= 0) {
      countdownEl.style.display = "none";
      countdownTimer = null;
      capture();
    } else {
      countdownEl.textContent = seconds;
      countdownTimer = setTimeout(tick, 1000);
    }
  };
  countdownTimer = setTimeout(tick, 1000);
}

function capture() {
  resize();
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Freeze
  isFrozen = true;
  nextCorner = 0;
  statusBadge.textContent = "Frozen";
  if (guides) guides.style.display = "none";
  liveBtns.style.display = "none";
  refineRow.style.display = "flex";
  if (stepPill) stepPill.textContent = "Step: card";

  // Seed card corners from visible guide (cardGuide if present; else handGuide)
  const rectC = canvas.getBoundingClientRect();
  const guideRect = (cardGuide && cardGuide.getBoundingClientRect()) || handGuide.getBoundingClientRect();
  const toCanvas = (x, y) => ({
    x: (x - rectC.left) * canvas.width  / rectC.width,
    y: (y - rectC.top)  * canvas.height / rectC.height
  });
  const pad = 16;
  const TL = toCanvas(guideRect.left  + pad, guideRect.top    + pad);
  const TR = toCanvas(guideRect.right - pad, guideRect.top    + pad);
  const BR = toCanvas(guideRect.right - pad, guideRect.bottom - pad);
  const BL = toCanvas(guideRect.left  + pad, guideRect.bottom - pad);
  [TL, TR, BR, BL].forEach((pt, i) => {
    pEls[i].style.display = "block";
    movePointEl(pEls[i], pt);
  });
  if (!cardGuide || cardGuide.style.display === "none") {
    showToast("Tip: double-click to place corners TL → TR → BR → BL.", 2600);
  }

  // Default handles for length + width within handGuide
  seedDefaultHandles();

  // Auto seed via AI (frozen frame) — but only snap when user presses buttons
  autoSeedFromImage().catch(()=>{});

  redrawFrozen();
}

function confirmCard() {
  // Ensure all 4 corners are placed
  if (pEls.some(el => !el.dataset.x)) {
    showToast("Place all 4 card corners first.");
    return;
  }
  computeH();             // homography from card
  computeAndStore();      // save results + snapshot
  window.location.href = "./report.html";
}

function resetAll() {
  if (countdownTimer) {
    clearTimeout(countdownTimer);
    countdownTimer = null;
    countdownEl.style.display = "none";
  }
  isFrozen = false;

  H = null;
  frameData = null;
  wrist = tip = palmL = palmR = null;

  statusBadge.textContent = "Live";
  if (guides) guides.style.display = "";
  liveBtns.style.display = "flex";
  refineRow.style.display = "none";
  if (stepPill) stepPill.textContent = "Step: live";

  [...pEls, wL, wR, hA, hB].forEach(el => {
    el.style.display = "none";
    el.removeAttribute("data-x");
    el.removeAttribute("data-y");
  });
}

/* ================== Seeding & snapping ================== */
function seedDefaultHandles() {
  const rc = canvas.getBoundingClientRect();
  const rh = handGuide.getBoundingClientRect();
  const toCanvas = (x, y) => ({
    x: (x - rc.left) * canvas.width  / rc.width,
    y: (y - rc.top)  * canvas.height / rc.height
  });

  const m = 18;
  wrist = toCanvas(rh.left + m,    rh.bottom - m);
  tip   = toCanvas(rh.right - m,   rh.top + m);
  hA.style.display = "block"; hB.style.display = "block";
  movePointEl(hA, wrist); movePointEl(hB, tip);

  const midY = (rh.top + rh.bottom) / 2;
  palmL = toCanvas(rh.left + 2*m, midY);
  palmR = toCanvas(rh.right - 2*m, midY);
  wL.style.display = "block"; wR.style.display = "block";
  movePointEl(wL, palmL); movePointEl(wR, palmR);
}

async function autoSeedFromImage() {
  try {
    await mp("IMAGE");
    const res = handLandmarker.detect(canvas);
    const lm = res?.landmarks?.[0];
    if (!lm) return;
    const toPt = i => ({ x: lm[i].x * canvas.width, y: lm[i].y * canvas.height });

    // Wrist + extended middle fingertip
    const wristPt   = toPt(0);
    const middlePIP = toPt(10);
    const middleTip = toPt(12);
    const dir = unitVec({ x: middleTip.x - middlePIP.x, y: middleTip.y - middlePIP.y });
    const extTip = { x: middleTip.x + TIP_EXTENSION * dir.x * 60,
                     y: middleTip.y + TIP_EXTENSION * dir.y * 60 };
    wrist = wristPt; tip = extTip;
    movePointEl(hA, wrist); movePointEl(hB, tip);

    // Palm width from MCPs
    palmL = toPt(5);  // index MCP
    palmR = toPt(17); // pinky MCP
    movePointEl(wL, palmL); movePointEl(wR, palmR);

    redrawFrozen();
  } catch (err) {
    console.warn("Auto-seed failed:", err);
  }
}

function snapPalmEdgesSmart() {
  // read latest handle positions so visuals == math
  wrist = getXY(hA); tip = getXY(hB);
  if (!frameData) return;

  const useHB = async () => {
    try {
      await mp("IMAGE");
      const res = handLandmarker.detect(canvas);
      const lm = res?.landmarks?.[0];
      if (!lm) return false;

      // HB line ≈ index MCP (5) to pinky MCP (17)
      const p5  = { x: lm[5].x  * canvas.width, y: lm[5].y  * canvas.height };
      const p17 = { x: lm[17].x * canvas.width, y: lm[17].y * canvas.height };

      // center at their midpoint; scan along the knuckle line direction
      const center = { x: (p5.x + p17.x) / 2, y: (p5.y + p17.y) / 2 };
      const dirHB  = unitVec({ x: p17.x - p5.x, y: p17.y - p5.y });

      const leftHB  = searchEdge(center, { x: -dirHB.x, y: -dirHB.y }, EDGE_SEARCH);
      const rightHB = searchEdge(center, { x:  dirHB.x, y:  dirHB.y }, EDGE_SEARCH);

      palmL = leftHB; palmR = rightHB;
      movePointEl(wL, palmL); movePointEl(wR, palmR);
      redrawFrozen();
      return true;
    } catch { return false; }
  };

  useHB().then((ok) => {
    if (ok) return;

    // fallback: original max-span search perpendicular to wrist→tip
    const axis = unitVec({ x: tip.x - wrist.x, y: tip.y - wrist.y });
    const norm = { x: -axis.y, y: axis.x };
    const span = distance(wrist, tip);

    let bestSpan = -1, bestLeft = null, bestRight = null;
    for (let i = 0; i < 7; i++) {
      const t = 0.40 + (i/6) * 0.25; // scan mid-palm region
      const center = { x: wrist.x + axis.x * span * t, y: wrist.y + axis.y * span * t };
      const leftPt  = searchEdge(center, { x: -norm.x, y: -norm.y }, EDGE_SEARCH);
      const rightPt = searchEdge(center, { x:  norm.x, y:  norm.y }, EDGE_SEARCH);
      const widthPixels = distance(leftPt, rightPt);
      if (widthPixels > bestSpan) { bestSpan = widthPixels; bestLeft = leftPt; bestRight = rightPt; }
    }
    palmL = bestLeft; palmR = bestRight;
    movePointEl(wL, palmL); movePointEl(wR, palmR);
    redrawFrozen();
  });
}

async function snapFingertip() {
  wrist = getXY(hA); tip = getXY(hB);
  try {
    await mp("IMAGE");
    const res = handLandmarker.detect(canvas);
    const lm = res?.landmarks?.[0];
    if (!lm) return;
    const middlePIP = { x: lm[10].x * canvas.width, y: lm[10].y * canvas.height };
    const middleTip = { x: lm[12].x * canvas.width, y: lm[12].y * canvas.height };
    const baseDir = unitVec({ x: middleTip.x - middlePIP.x, y: middleTip.y - middlePIP.y });

    const angles = [-30,-20,-10,0,10,20,30].map(a => a * Math.PI/180);
    let bestPoint = middleTip, bestGain = -1;
    for (const angle of angles) {
      const dir = { x: baseDir.x * Math.cos(angle) - baseDir.y * Math.sin(angle),
                    y: baseDir.x * Math.sin(angle) + baseDir.y * Math.cos(angle) };
      const pt = searchEdge(middleTip, dir, 100);
      const gain = Math.hypot(pt.x - middleTip.x, pt.y - middleTip.y);
      if (gain > bestGain) { bestGain = gain; bestPoint = pt; }
    }
    tip = bestPoint;
    movePointEl(hB, tip);
    redrawFrozen();
  } catch (err) {
    console.warn("Fingertip snap failed:", err);
  }
}

function searchEdge(start, dir, maxDist = 120) {
  const { width: W, height: H } = frameData;
  const data = frameData.data;
  const lumAt = (x, y) => {
    const cx = Math.max(0, Math.min(W - 1, Math.round(x)));
    const cy = Math.max(0, Math.min(H - 1, Math.round(y)));
    const i = (cy * W + cx) * 4;
    return 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
  };

  let bestPoint = start, bestScore = -1;
  let prevLum = lumAt(start.x, start.y);
  for (let t = 1; t <= maxDist; t++) {
    const x = start.x + dir.x * t, y = start.y + dir.y * t;
    if (x < 1 || y < 1 || x > W - 2) break;
    if (y < 1 || y > H - 2) break;
    const L = lumAt(x, y);
    const score = Math.abs(L - prevLum);
    if (score > bestScore) { bestScore = score; bestPoint = { x, y }; }
    prevLum = L;
  }
  return bestPoint;
}

/* ================== Homography & measurement ================== */
function computeH() {
  const corners = pEls.map(getXY);
  const src = [ corners[0], corners[1], corners[2], corners[3] ];
  const dst = [ { x: 0,      y: 0      },
                { x: DEST_W, y: 0      },
                { x: DEST_W, y: DEST_H },
                { x: 0,      y: DEST_H } ];
  H = homography(src, dst);
}

function computeAndStore() {
  wrist = getXY(hA); tip = getXY(hB); palmL = getXY(wL); palmR = getXY(wR);
  if (!H || !wrist || !tip || !palmL || !palmR) return;

  const wristW = applyH(wrist);
  const tipW   = applyH(tip);
  const leftW  = applyH(palmL);
  const rightW = applyH(palmR);
  const lengthMm = distance(wristW, tipW) / PX_PER_MM;
  const widthMm  = distance(leftW, rightW) / PX_PER_MM;

  localStorage.setItem("mousefit:measure", JSON.stringify({
    len_mm: lengthMm,
    wid_mm: widthMm,
    len_cm: +(lengthMm / 10).toFixed(1),
    wid_cm: +(widthMm / 10).toFixed(1)
  }));

  const img = canvas.toDataURL("image/jpeg", 0.8);
  localStorage.setItem("mousefit:snapshot", img);

  if (MICE.length) {
    const rec = recommend(lengthMm, widthMm, 6);
    localStorage.setItem("mousefit:recs", JSON.stringify(rec));
  } else {
    localStorage.removeItem("mousefit:recs");
  }
  // fresh session; clear old grip artifacts
  const sess = String(Date.now());
  localStorage.setItem("mousefit:session", sess);
  [
    "mousefit:grip_view_top",
    "mousefit:grip_view_right",
    "mousefit:grip_view_left",
    "mousefit:grip_result",
    "mousefit:grip_pref",
    "mousefit:grip_done_session"
  ].forEach(k => localStorage.removeItem(k));
}

/* ================== Drawing (frozen) ================== */
function redrawFrozen() {
  if (!frameData) return;
  ctx.putImageData(frameData, 0, 0);
  drawCardOverlay();
  drawMeasureLines();

  for (const el of [...pEls, wL, wR, hA, hB]) {
    if (el.dataset.x) el.style.display = "block";
  }
}

function drawCardOverlay() {
  if (!pEls[0].dataset.x) return;
  const c = pEls.map(getXY);
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(110,231,255,0.9)";
  ctx.fillStyle   = "rgba(110,231,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(c[0].x, c[0].y);
  ctx.lineTo(c[1].x, c[1].y);
  ctx.lineTo(c[2].x, c[2].y);
  ctx.lineTo(c[3].x, c[3].y);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

function drawMeasureLines() {
  if (hA.dataset.x && hB.dataset.x) {
    const A = getXY(hA), B = getXY(hB);
    wrist = A; tip = B;
    drawLine(A, B, "#6ee7ff", 4); drawDot(A, "#6ee7ff"); drawDot(B, "#6ee7ff");
  }
  if (wL.dataset.x && wR.dataset.x) {
    const L = getXY(wL), R = getXY(wR);
    palmL = L; palmR = R;
    drawLine(L, R, "#a3ffb0", 4); drawDot(L, "#a3ffb0"); drawDot(R, "#a3ffb0");
  }
}
function drawLine(a, b, color, width) {
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke();
}
function drawDot(p, color) {
  ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
}

function getXY(el) { return { x: parseFloat(el.dataset.x), y: parseFloat(el.dataset.y) }; }
function movePointEl(el, p) {
  el.style.display = "block";
  el.style.left = `${(p.x / canvas.width) * 100}%`;
  el.style.top  = `${(p.y / canvas.height) * 100}%`;
  el.dataset.x = p.x; el.dataset.y = p.y;
}
function clientToCanvas(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return { x: (clientX - rect.left) * canvas.width / rect.width,
           y: (clientY - rect.top)  * canvas.height / rect.height };
}

/* Homography algebra */
function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const { x: xs, y: ys } = src[i];
    const { x: xd, y: yd } = dst[i];
    A.push([ xs, ys, 1, 0,  0,  0, -xs * xd, -ys * xd ]);  b.push(xd);
    A.push([ 0,  0,  0, xs, ys, 1, -xs * yd, -ys * yd ]);  b.push(yd);
  }
  const h = solve(A, b); h.push(1);
  return [ [ h[0], h[1], h[2] ], [ h[3], h[4], h[5] ], [ h[6], h[7], h[8] ] ];
}
function solve(M, b) {
  const n = M.length; const A = M.map((row, i) => [ ...row, b[i] ]);
  for (let c = 0; c < n; c++) {
    let maxR = c; for (let r = c+1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[maxR][c])) maxR = r;
    [A[c], A[maxR]] = [ A[maxR], A[c] ];
    const div = A[c][c]; for (let j = c; j <= n; j++) A[c][j] /= div;
    for (let r = 0; r < n; r++) if (r !== c) {
      const f = A[r][c];
      for (let j = c; j <= n; j++) A[r][j] -= f * A[c][j];
    }
  }
  return A.map(row => row[n]);
}
function applyH(p) {
  const w = H[2][0] * p.x + H[2][1] * p.y + H[2][2];
  return {
    x: (H[0][0] * p.x + H[0][1] * p.y + H[0][2]) / w,
    y: (H[1][0] * p.x + H[1][1] * p.y + H[1][2]) / w
  };
}
const unitVec  = v => { const L = Math.hypot(v.x, v.y) || 1; return { x: v.x / L, y: v.y / L }; };
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ================== Recommendations ================== */
const BRAND_TIERS = {
  big:    ["logitech", "razer"],
  medium: ["vaxee", "lamzu", "pulsar", "zowie", "g-wolves", "endgame gear"],
  small:  ["wlmouse", "atk", "steelseries", "ninjutso", "xtrfy", "finalmouse"]
};
function brandTier(brand) {
  const b = (brand || "").toLowerCase();
  if (BRAND_TIERS.big.includes(b)) return 3;
  if (BRAND_TIERS.medium.includes(b)) return 2;
  if (BRAND_TIERS.small.includes(b)) return 1;
  return 2;
}
function specOf(mouse) {
  const L = mouse.length_mm ?? mouse.length;
  const W = mouse.width_mm  ?? mouse.width;
  const H = mouse.height_mm ?? mouse.height;
  const WT = mouse.weight_g ?? mouse.weight ?? 999;
  const shape = (mouse.shape || "").toLowerCase();
  const hump  = (mouse.hump  || "").toLowerCase();
  const brand = mouse.brand || "";
  const tags  = mouse.tags  || [];
  return { L, W, H, WT, shape, hump, brand, tags };
}
function recommend(handLenMm, handWidMm, topN = 5) {
  const grips = ["palm", "claw", "fingertip"];
  const sizeCategory = handLenMm < 170 ? "small" :
                       handLenMm < 190 ? "medium" :
                       handLenMm < 210 ? "large" : "xlarge";
  const topPicks = {};
  for (const grip of grips) {
    topPicks[grip] = MICE.map(mouse => ({ ...mouse, ...scoreMouse(mouse, grip, handLenMm, handWidMm) }))
                        .sort((a, b) => b.score - a.score)
                        .slice(0, topN);
  }
  return { size: sizeCategory, top: topPicks };
}
const POPULAR_MODELS = {
  palm: [ "deathadder v4 pro", "viper v3 pro", "g pro x superlight 2", "g pro superlight", "lamzu maya", "lamzu maya x" ],
  claw: [ "viper v3 pro", "g pro x superlight 2", "g pro superlight", "lamzu maya", "op1", "x2h", "pulsar x2" ],
  fingertip: [ "finalmouse ulx", "finalmouse starlight", "beast x mini", "x2 mini", "hati s2" ]
};
function nameIncludes(mouse, s) {
  const n = ((mouse.model || mouse.name || "") + " " + (mouse.brand || "")).toLowerCase();
  return n.includes(s.toLowerCase());
}
function scoreMouse(mouse, grip, handLenMm, handWidMm) {
  const { L, W, H, WT, shape, hump, brand, tags } = specOf(mouse);
  const isSym  = shape.includes("sym");
  const isErgo = shape.includes("ergo");

  const PREF = {
    fingertip: { Lmax: 118, Wmin: 56, Wmax: 63, Hmax: 38, wtGood: 55, wtOkay: 62 },
    claw:      { Lmin: 114, Lmax: 124, Wmin: 60, Wmax: 66, Hmin: 37, Hmax: 41, wtGood: 60, wtOkay: 68 },
    palm:      { Lmin: 118, Lmax: 128, Wmin: 65, Wmax: 71, Hmin: 39, Hmax: 44, wtGood: 63, wtOkay: 75 }
  }[grip];

  const idealLenRatio = { palm: 0.63, claw: 0.61, fingertip: 0.54 }[grip];
  const idealLen = idealLenRatio * handLenMm;
  const lenTol   = { palm: 0.09, claw: 0.10, fingertip: 0.11 }[grip] * handLenMm;
  const scoreLen = (L == null) ? 60 : 100 * Math.max(0, 1 - Math.abs(L - idealLen) / lenTol);

  const inRange = (x, a, b) => x >= a && x <= b;
  let scoreWid = 70;
  if (W != null) {
    if (inRange(W, PREF.Wmin, PREF.Wmax)) scoreWid = 95;
    else {
      const d = W < PREF.Wmin ? (PREF.Wmin - W) : (W - PREF.Wmax);
      scoreWid = Math.max(40, 95 - d * 3.2);
    }
  }

  let bonus = 0;

  if (grip === "fingertip") {
    if (L != null) bonus += (L <= PREF.Lmax ? 10 : -Math.max(0, (L - PREF.Lmax) * 0.9));
    if (H != null) bonus += (H <= PREF.Hmax ? 5  : -Math.max(0, (H - PREF.Hmax) * 1.4));
    if (W != null && inRange(W, PREF.Wmin, PREF.Wmax)) bonus += 4;
    if (WT != null) {
      if (WT <= PREF.wtGood) bonus += 8;
      else if (WT <= PREF.wtOkay) bonus += 3;
      else bonus -= 6;
    }
    if (isSym) bonus += 3;
  }

  if (grip === "claw") {
    if (L != null) {
      const mid = (PREF.Lmin + PREF.Lmax) / 2;
      bonus += (L >= PREF.Lmin && L <= PREF.Lmax) ? 6 : -Math.abs(L - mid) * 0.5;
    }
    if (H != null && inRange(H, PREF.Hmin, PREF.Hmax)) bonus += 3;
    if (W != null && inRange(W, PREF.Wmin, PREF.Wmax)) bonus += 3;
    if (WT != null) {
      if (WT <= PREF.wtGood) bonus += 3;
      else if (WT <= PREF.wtOkay) bonus += 1;
      else bonus -= 3;
    }
    if (isSym)  bonus += 2;
    if (isErgo) bonus += 2;
  }

  if (grip === "palm") {
    if (L != null) {
      const mid = (PREF.Lmin + PREF.Lmax) / 2;
      bonus += (L >= PREF.Lmin && L <= PREF.Lmax) ? 8 : -Math.abs(L - mid) * 0.5;
    }
    if (W != null && inRange(W, PREF.Wmin, PREF.Wmax)) bonus += 4;
    if (isErgo) bonus += 3;
    if (isSym)  bonus += 2;
    if (WT != null && WT >= 100) bonus -= 6;
  }

  if (H != null) {
    if (H >= 46) bonus -= 6;
    if (H <= 34) bonus -= 4;
  }
  if (L != null && L >= 135) bonus -= 8;
  if (W != null && W >= 72)  bonus -= 6;

  if (Array.isArray(tags) && tags.includes(grip)) bonus += 4;

  for (const key of (POPULAR_MODELS[grip] || [])) {
    if (nameIncludes(mouse, key)) { bonus += 6; break; }
  }

  if ((grip === "palm" || grip === "claw") && isSym && L != null && W != null) {
    const fitsPalm = L >= 118 && L <= 128 && W >= 64 && W <= 70;
    const fitsClaw = L >= 114 && L <= 124 && W >= 60 && W <= 66;
    if (fitsPalm && fitsClaw) bonus += 3;
  }

  bonus += brandTier(brand) * 2;

  const total = 0.50 * scoreLen + 0.20 * scoreWid + bonus;
  return { score: Math.round(total) };
}

/* ================== Misc ================== */
function showToast(msg, durationMs = 2200) {
  if (!toast) return console.log(msg);
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, durationMs);
}

/* ================== Guides + Dock: restore + pinch ================== */
function restoreGuidesPrefs(){
  try{
    if (!sessionStorage.getItem('mf:guides:seen')) {
      sessionStorage.setItem('mf:guides:seen', '1');
      if (guides) guides.style.display = '';
      localStorage.setItem('mf:guides:hidden', '0');
    }
    const hidden = localStorage.getItem('mf:guides:hidden') === '1';
    if (hidden && guides) guides.style.display = 'none';
    const L = localStorage.getItem('mf:guides:left');
    const R = localStorage.getItem('mf:guides:right');
    const T = localStorage.getItem('mf:guides:top');
    const B = localStorage.getItem('mf:guides:bottom');
    const root = document.documentElement.style;
    if (L) root.setProperty('--guides-left', L);
    if (R) root.setProperty('--guides-right', R);
    if (T) root.setProperty('--guides-top', T);
    if (B) root.setProperty('--guides-bottom', B);
    updateGuidesUI();
  } catch{}
}
function restoreDockScale(){
  const s = parseFloat(localStorage.getItem('mf:dock-scale')||'1');
  document.documentElement.style.setProperty('--dock-scale', String(Math.max(0.7, Math.min(1.6, s))));
}

// Pinch to resize guides
if (guides){
  let startDist=0, startInsets=null;
  const getDist=(t)=> Math.hypot(t[0].clientX-t[1].clientX, t[0].clientY-t[1].clientY);
  guides.addEventListener('touchstart', (e)=>{
    if (e.touches.length===2){
      startDist = getDist(e.touches);
      const cs = getComputedStyle(document.documentElement);
      startInsets = {
        left: parseFloat(cs.getPropertyValue('--guides-left')),
        right: parseFloat(cs.getPropertyValue('--guides-right')),
        top: parseFloat(cs.getPropertyValue('--guides-top')),
        bottom: parseFloat(cs.getPropertyValue('--guides-bottom'))
      };
      e.preventDefault();
    }
  }, {passive:false});
  guides.addEventListener('touchmove', (e)=>{
    if (e.touches.length===2 && startInsets){
      const scale = getDist(e.touches)/(startDist||1);
      const d = (1/scale - 1) * 5;
      const L = Math.max(0, startInsets.left + d);
      const R = Math.max(0, startInsets.right+ d);
      const T = Math.max(0, startInsets.top  + d);
      const B = Math.max(0, startInsets.bottom+ d);
      const root = document.documentElement.style;
      root.setProperty('--guides-left',  L + '%');
      root.setProperty('--guides-right', R + '%');
      root.setProperty('--guides-top',   T + '%');
      root.setProperty('--guides-bottom',B + '%');
      e.preventDefault();
    }
  }, {passive:false});
  guides.addEventListener('touchend', ()=>{
    const cs = getComputedStyle(document.documentElement);
    localStorage.setItem('mf:guides:left', cs.getPropertyValue('--guides-left').trim());
    localStorage.setItem('mf:guides:right',cs.getPropertyValue('--guides-right').trim());
    localStorage.setItem('mf:guides:top',  cs.getPropertyValue('--guides-top').trim());
    localStorage.setItem('mf:guides:bottom',cs.getPropertyValue('--guides-bottom').trim());
    startInsets=null; startDist=0;
  });
}

// Pinch to scale dock panel
if (dockPanel){
  let startDist=0, startScale=1;
  const getDist=(t)=> Math.hypot(t[0].clientX-t[1].clientX, t[0].clientY-t[1].clientY);
  dockPanel.addEventListener('touchstart', (e)=>{
    if (e.touches.length===2){
      startDist = getDist(e.touches);
      startScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-scale'))||1;
      e.preventDefault();
    }
  }, {passive:false});
  dockPanel.addEventListener('touchmove', (e)=>{
    if (e.touches.length===2 && startDist>0){
      const s = Math.max(0.7, Math.min(1.6, startScale * (getDist(e.touches)/(startDist||1))));
      document.documentElement.style.setProperty('--dock-scale', String(s));
      e.preventDefault();
    }
  }, {passive:false});
  dockPanel.addEventListener('touchend', ()=>{
    const s = getComputedStyle(document.documentElement).getPropertyValue('--dock-scale').trim();
    localStorage.setItem('mf:dock-scale', s);
    startDist=0;
  });
}

setupFloatingDock();
setupCoachBox();

function setupFloatingDock(){
  const dock = document.querySelector('.control-dock');
  const handle = dock?.querySelector('.dock-handle');
  makeFloatingDraggable(dock, handle, 'mf:measure:dock-pos');
}

function setupCoachBox(){
  const coach = document.getElementById('coach');
  if (!coach) return;
  const handle = coach.querySelector('.coach-bar') || coach;
  const closeBtn = coach.querySelector('.coach-close');
  makeFloatingDraggable(coach, handle, 'mf:measure:coach-pos');
  if (closeBtn) {
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', () => coach.remove());
  }
}

function makeFloatingDraggable(target, handle, storageKey){
  if (!target || !handle) return;
  handle.style.touchAction = 'none';

  const applyStored = () => {
    const stored = readStoredPosition(storageKey);
    if (!stored) return;
    const clamped = clampToViewport(target, stored.left, stored.top);
    applyFloatingPosition(target, clamped.left, clamped.top);
  };

  applyStored();
  if (storageKey) window.addEventListener('resize', applyStored);

  let pointerId = null;
  let dragStart = null;

  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pointerId = e.pointerId;
    handle.setPointerCapture?.(pointerId);
    const rect = target.getBoundingClientRect();
    applyFloatingPosition(target, rect.left, rect.top);
    dragStart = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
  });

  const onMove = (e) => {
    if (pointerId === null || e.pointerId !== pointerId || !dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const next = clampToViewport(target, dragStart.left + dx, dragStart.top + dy);
    applyFloatingPosition(target, next.left, next.top);
  };

  const endDrag = (e) => {
    if (pointerId === null || (e.pointerId !== undefined && e.pointerId !== pointerId)) return;
    handle.releasePointerCapture?.(pointerId);
    pointerId = null;
    if (storageKey && dragStart) {
      const left = parseFloat(target.style.left) || dragStart.left;
      const top = parseFloat(target.style.top) || dragStart.top;
      writeStoredPosition(storageKey, { left, top });
    }
    dragStart = null;
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
}

function applyFloatingPosition(target, left, top){
  target.style.left = `${left}px`;
  target.style.top = `${top}px`;
  target.style.right = 'auto';
  target.style.bottom = 'auto';
  target.style.transform = 'none';
}

function clampToViewport(target, left, top){
  const margin = 12;
  const width = target.offsetWidth || parseFloat(target.dataset.dragWidth) || 0;
  const height = target.offsetHeight || parseFloat(target.dataset.dragHeight) || 0;
  if (width) target.dataset.dragWidth = String(width);
  if (height) target.dataset.dragHeight = String(height);
  const maxLeft = Math.max(margin, window.innerWidth - width - margin);
  const maxTop = Math.max(margin, window.innerHeight - height - margin);
  return {
    left: Math.min(Math.max(margin, left), maxLeft),
    top: Math.min(Math.max(margin, top), maxTop)
  };
}

function readStoredPosition(key){
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.left === 'number' && typeof parsed?.top === 'number') return parsed;
  } catch {}
  return null;
}

function writeStoredPosition(key, pos){
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(pos)); } catch {}
}

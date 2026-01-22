/// grip.js — full drop-in (overlay above guide, clipped YOLO boxes, solid freeze/unfreeze)
// Works with your current HTML (cam/frame/overlay/guide). Includes:
// - Canvas/overlay size sync with video
// - Guide ROI mapped from CSS px → canvas px
// - YOLO letterbox mapping and clipping to content
// - Live overlay (throttled) and frozen review overlay
// - Robust capture → still image (no black)
// - Clear logging for debugging model output

/* ================== constants ================== */
const TASK_URL   = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const VISION_MJS = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";
const VIEWS = ["Top","Right","Left"];

// ---- YOLO config (edit path if needed) ----
const YOLO_BASE_URL = "/models/mouse/best_web_model";
const YOLO_SIZE    = 640;
let   YOLO_CONF    = 0.22;   // a touch higher = fewer candidates = faster
const YOLO_IOU     = 0.45;
const YOLO_MAX_DET = 50;
const YOLO_CLASSES = 1;

// keep the dashed guide visible; we draw above it
const SHOW_GUIDE_OVERLAY = false;

// Backend-based YOLO - no TFJS needed
// API base URL will be set from Next.js environment or default
const getApiBase = () => {
  if (typeof window !== 'undefined' && window.API_BASE_URL) {
    return window.API_BASE_URL;
  }
  // Try to get from meta tag or default
  const meta = document.querySelector('meta[name="api-base-url"]');
  return meta ? meta.getAttribute('content') : 'http://localhost:8000';
};

/* ================== DOM ================== */
const video        = document.getElementById("cam");
const canvas       = document.getElementById("frame");
const overlay      = document.getElementById("overlay");
const ctx          = canvas.getContext("2d");
const octx         = overlay.getContext("2d");

const cameraSelect = document.getElementById("cameraSelect");
const refreshCams  = document.getElementById("refreshCams");
const startCamBtn  = document.getElementById("startCamBtn");
const camName      = document.getElementById("camName");

const statusBadge  = document.getElementById("status");
const toast        = document.getElementById("toast");
const countdownEl  = document.getElementById("countdown");

const liveBtns     = document.getElementById("liveBtns");
const frozenBtns   = document.getElementById("frozenBtns");
const timerBtn     = document.getElementById("timer");
const snapBtn      = document.getElementById("snap");
const acceptBtn    = document.getElementById("accept");
const retakeBtn    = document.getElementById("retake");
const classifyBtn  = document.getElementById("classify");
const toggleSkel   = document.getElementById("toggleSkel");
const toggleGuideButtons = Array.from(document.querySelectorAll("[data-toggle-guide]"));

const skelState    = null; // Removed from UI
const stepPill     = null; // Removed from UI
const viewPill     = null; // Removed from UI
const resultPill   = document.getElementById("resultPill");
const guideLabel   = document.getElementById("guideLabel");

const thumbTop     = document.getElementById("thumbTop");
const thumbRight   = document.getElementById("thumbRight");
const thumbLeft    = document.getElementById("thumbLeft");

const retakeAllBtn = document.getElementById("retakeAll");
const gotoReport   = document.getElementById("gotoReport");

const gripGuide    = document.querySelector(".gripGuide");
const stageEl      = document.querySelector(".stage");
const controlPanel = document.querySelector(".control-dock .panel");
const rootStyle    = document.documentElement.style;
const footerYear   = document.getElementById("y");

if (footerYear) footerYear.textContent = new Date().getFullYear();

/* thumbnails helper (avoid black, handle large images) */
function setThumbImage(imgEl, dataUrl) {
  if (!imgEl || !dataUrl) return;
  const box = imgEl.closest('.thumb');
  
  // If dataUrl is very long (likely base64), convert to blob URL to reduce memory
  if (dataUrl.length > 100000) {
    try {
      // Convert base64 to blob
      const byteString = atob(dataUrl.split(',')[1] || dataUrl);
      const mimeString = dataUrl.split(',')[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const blobUrl = URL.createObjectURL(blob);
      
      // Revoke old URL if exists
      if (imgEl.dataset.blobUrl) {
        URL.revokeObjectURL(imgEl.dataset.blobUrl);
      }
      
      imgEl.dataset.blobUrl = blobUrl;
      imgEl.src = blobUrl;
    } catch (e) {
      console.warn('Failed to convert to blob URL, using data URL:', e);
      imgEl.src = dataUrl;
    }
  } else {
    imgEl.src = dataUrl;
  }
  
  // Constrain image size
  imgEl.style.maxWidth = '100%';
  imgEl.style.maxHeight = '100%';
  imgEl.style.objectFit = 'contain';
  
  if (box) box.classList.add('has-img');
}

/* ================== storage helpers ================== */
function saveGripKV(key, value){
  sessionStorage.setItem(key, value);
  localStorage.setItem(key.replace(/^mf:/, "mousefit:"), value);
}
function getGripKV(key){
  return sessionStorage.getItem(key) ||
         localStorage.getItem(key.replace(/^mf:/, "mousefit:")) || null;
}
function clearGripK(keys){
  keys.forEach(k => {
    sessionStorage.removeItem(k);
    localStorage.removeItem(k.replace(/^mf:/, "mousefit:"));
  });
}
const setText = (el, txt) => { if (el) el.textContent = txt; };
const PREF_SKELETON    = "mf:pref:skeleton-live";
const PREF_GUIDE_VIS   = "mf:pref:guide-visible";
const PREF_GUIDE_SCALE = "mf:pref:guide-scale";
const PREF_PANEL_SCALE = "mf:pref:panel-scale";

function getStoredBool(key, fallback = false){
  const value = localStorage.getItem(key);
  if (value === null) return fallback;
  return value === '1' || value === 'true';
}
function getStoredNumber(key, fallback = 1, min, max){
  const raw = parseFloat(localStorage.getItem(key));
  if (!Number.isFinite(raw)) return fallback;
  let val = raw;
  if (typeof min === 'number') val = Math.max(min, val);
  if (typeof max === 'number') val = Math.min(max, val);
  return val;
}

/* ================== state ================== */
let stream = null, currentDeviceId = null;
let frameData = null;
let handLandmarker = null, runMode = null;
let skeletonLive = getStoredBool(PREF_SKELETON, true);
let guideVisible = getStoredBool(PREF_GUIDE_VIS, true);
let guideScale   = getStoredNumber(PREF_GUIDE_SCALE, 1, 0.6, 1.4);
let panelScale   = getStoredNumber(PREF_PANEL_SCALE, 1, 0.7, 1.25);
let countdownTimer = null;
let isFrozen = false;

let currentView = 0; // 0=Top, 1=Right, 2=Left
let shots = { top:null, right:null, left:null };

let lastFrozenDataURL = null;

/* keep last detection so the box persists a tick */
let __lastDet = null;           // { box:[x1,y1,x2,y2], score:number }
let __lastDetAt = 0;
const __DET_TTL_MS = 900;
// MOD: allow easy tuning of live detect FPS
const DETECT_INTERVAL_MS = 300;

/* ================== helpers ================== */
function ensureCanvasSizes(){
  const w = video.videoWidth  || 1280;
  const h = video.videoHeight || 720;
  if (canvas.width !== w || canvas.height !== h){
    canvas.width = w; canvas.height = h;
  }
  if (overlay.width !== canvas.width || overlay.height !== canvas.height){
    overlay.width = canvas.width; overlay.height = canvas.height;
  }
}

/* ================== YOLO ================== */
let yoloModel = null;

async function loadMouseModel(baseUrl = YOLO_BASE_URL) {
  // Backend-based YOLO - no TFJS needed
  try {
    console.log('[YOLO] Using backend TensorFlow API');
    yoloModel = { backend: true }; // Mark as backend model
    window.yoloModel = yoloModel;
    console.log('[YOLO] Backend model ready');
    return yoloModel;
  } catch (e) {
    console.error('[YOLO] Backend init error:', e);
    yoloModel = null;
    return null;
  }
}

async function yoloDetectBackend(imageLike, { preferGuide = true } = {}) {
  try {
    // Convert image to base64
    const prep = document.createElement('canvas');
    const { scale, dx, dy, nw, nh } = yoloLetterbox(imageLike, prep);
    const content = { x1: dx, y1: dy, x2: dx + nw, y2: dy + nh };
    
    const imageBase64 = prep.toDataURL('image/jpeg', 0.9).split(',')[1];
    const API_BASE = getApiBase();
    
    // Call backend API
    const response = await fetch(`${API_BASE}/api/ml/yolo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64,
        conf: YOLO_CONF,
        iou: YOLO_IOU,
        max_det: YOLO_MAX_DET,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    const detections = data.detections || [];

    // Convert backend detections (in 640x640 space) back to original coordinates
    const dets = detections.map(d => {
      const [x1, y1, x2, y2] = d.box;
      // Back-map from 640x640 letterbox space to original image space
      return {
        box: [
          (x1 - dx) / (scale || 1),
          (y1 - dy) / (scale || 1),
          (x2 - dx) / (scale || 1),
          (y2 - dy) / (scale || 1),
        ],
        score: d.score || 0,
        class: d.class || 0,
      };
    });

    // Prefer guide ROI (if provided)
    if (preferGuide && dets.length) {
      const g = getGuideMouseBox();
      if (g) {
        const guideDets = dets.filter(d => {
          const [x1, y1, x2, y2] = d.box;
          const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
          return cx >= g.x1 && cx <= g.x2 && cy >= g.y1 && cy <= g.y2;
        });
        if (guideDets.length) return guideDets.sort((a, b) => b.score - a.score);
      }
    }

    return dets.sort((a, b) => b.score - a.score);
  } catch (e) {
    console.error('[YOLO] Backend detection error:', e);
    showToast('Backend detection failed');
    return [];
  }
}

/* --- helpers for letterbox & math --- */
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
function rectIntersect(a, b){
  const x1 = Math.max(a.x1, b.x1), y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2), y2 = Math.min(a.y2, b.y2);
  const w = Math.max(0, x2 - x1), h = Math.max(0, y2 - y1);
  return w * h;
}

function yoloLetterbox(source, dstCanvas) {
  const c = dstCanvas.getContext('2d');
  dstCanvas.width = YOLO_SIZE; dstCanvas.height = YOLO_SIZE;
  const s = Math.min(YOLO_SIZE / source.width, YOLO_SIZE / source.height);
  const nw = Math.round(source.width * s);
  const nh = Math.round(source.height * s);
  const dx = Math.floor((YOLO_SIZE - nw) / 2);
  const dy = Math.floor((YOLO_SIZE - nh) / 2);
  c.fillStyle = '#000'; c.fillRect(0,0,YOLO_SIZE,YOLO_SIZE);
  c.drawImage(source, dx, dy, nw, nh);
  return { scale:s, dx, dy, nw, nh };
}

/* Parse "raw grid" heads (fallback) */
async function parseRawGridDetections(arr, dx, dy, scale) {
  const head = arr[0];
  function normalizeYoloHead(h) {
    if (h.shape.length !== 3 || h.shape[0] !== 1) throw new Error(`[YOLO] Unexpected head shape: ${h.shape}`);
    const a=h.shape[1], b=h.shape[2];
    const m = h.squeeze([0]);
    return (a>=b) ? m : m.transpose();
  }
  const pred = normalizeYoloHead(head);
  const boxes_xywh = pred.slice([0,0], [-1,4]);
  const cls        = pred.slice([0,4], [-1,YOLO_CLASSES]).squeeze();
  const confMask   = tf.greaterEqual(cls, YOLO_CONF);
  const selIdx     = await tf.whereAsync(confMask);
  if (!selIdx.size) { tf.dispose([pred, boxes_xywh, cls, confMask, selIdx]); return []; }
  const idx    = selIdx.squeeze([1]);
  const scores = tf.gather(cls, idx);
  const xywh   = tf.gather(boxes_xywh, idx);
  const half = xywh.slice([0,2], [-1,2]).div(2);
  const xy1  = xywh.slice([0,0], [-1,2]).sub(half);
  const xy2  = xywh.slice([0,0], [-1,2]).add(half);
  const xyxy = tf.concat([xy1, xy2], 1);
  const yxxy = tf.stack([
    xyxy.slice([0,1],[-1,1]).squeeze(),
    xyxy.slice([0,0],[-1,1]).squeeze(),
    xyxy.slice([0,3],[-1,1]).squeeze(),
    xyxy.slice([0,2],[-1,1]).squeeze()
  ],1);
  const keep = await tf.image.nonMaxSuppressionAsync(yxxy, scores, YOLO_MAX_DET, YOLO_IOU, YOLO_CONF);
  const kept         = keep.size ? keep : tf.tensor1d([], 'int32');
  const finalBoxes64 = tf.gather(xyxy, kept);
  const finalScores  = tf.gather(scores, kept);
  const boxes640 = await finalBoxes64.array();
  const scoreArr = await finalScores.array();
  const dets = boxes640.map((b,i) => {
    const [x1,y1,x2,y2] = b;
    return {
      box: [(x1-dx)/ (scale||1), (y1-dy)/ (scale||1), (x2-dx)/ (scale||1), (y2-dy)/ (scale||1)],
      score: scoreArr[i]
    };
  });
  tf.dispose([pred, boxes_xywh, cls, confMask, selIdx, idx, scores, xywh, half, xy1, xy2, xyxy, yxxy, keep, kept, finalBoxes64, finalScores]);
  return dets;
}

/* === MAIN detection with clipping to content & guide preference === */
/* === MAIN detection for YOLOv8-seg (proto + det head) === */
// Replace your existing yoloDetectBoxes with this version.
async function yoloDetectBoxes(imageLike, { preferGuide = true } = {}) {
  if (!yoloModel) return [];
  
  // Use backend if available
  if (yoloModel.backend) {
    return await yoloDetectBackend(imageLike, { preferGuide });
  }
  
  // Fallback to TFJS (if still needed)
  if (typeof tf === 'undefined') {
    console.error('[YOLO] TFJS missing and backend not available');
    return [];
  }

  // 1) Letterbox to 640x640 and remember content rect
  const prep = document.createElement('canvas');
  const { scale, dx, dy, nw, nh } = yoloLetterbox(imageLike, prep);
  const content = { x1: dx, y1: dy, x2: dx + nw, y2: dy + nh };

  // 2) Run graph (static graph → execute is fine)
  tf.engine().startScope();
  const input = tf.tidy(() =>
    tf.browser.fromPixels(prep).toFloat().div(255).expandDims(0)
  );
  const outs = yoloModel.execute(input);
  const arr = Array.isArray(outs) ? outs : Object.values(outs);

  // 3) Pick heads: proto [1,H,W,32], det [1, D, N]
  let detHead = null, protoHead = null;
  for (const t of arr) {
    const s = t.shape;
    if (s.length === 4) protoHead = t;  // [1,160,160,32] typically
    if (s.length === 3) detHead = t;    // [1,37,8400] for seg
  }
  if (!detHead) {
    // Fallback: old raw-grid parser
    const tmp = await parseRawGridDetections(arr, dx, dy, scale);
    tf.dispose([input]); tf.dispose(arr);
    tf.engine().endScope();
    const W = imageLike.width, H = imageLike.height;
    return tmp.map(d => {
      let [x1,y1,x2,y2] = d.box;
      const cx=(x1+x2)/2, cy=(y1+y2)/2;
      if (cx < 0 || cx > W || cy < 0 || cy > H) return null;
      x1 = clamp(x1, 0, W-1); y1 = clamp(y1, 0, H-1);
      x2 = clamp(x2, 0, W-1); y2 = clamp(y2, 0, H-1);
      return { box:[x1,y1,x2,y2], score:d.score };
    }).filter(Boolean).sort((a,b)=>b.score-a.score);
  }

  // 4) Normalize det head to [N, D]
  // detHead is [1, D, N] or [1, N, D]; make it [N, D]
  let det = detHead.shape[1] <= detHead.shape[2]
    ? detHead.transpose([0, 2, 1]).squeeze([0])   // [N, D]
    : detHead.squeeze([0]);                       // [N, D]

  const N = det.shape[0];
  const D = det.shape[1];

  // YOLOv8-seg layout: [cx,cy,w,h, obj, classes?, mask(32)]
  // If proto exists, assume 32 mask coeffs at the end.
  const MASK_COEF = protoHead ? 32 : 0;
  const afterObj  = D - 5;
  const numCls    = Math.max(0, afterObj - MASK_COEF);

  const xywh = det.slice([0, 0], [-1, 4]);                 // [N,4]
  const obj  = det.slice([0, 4], [-1, 1]).squeeze();       // [N]
  let score;
  if (numCls > 0) {
    const cls = det.slice([0, 5], [-1, numCls]);           // [N, numCls]
    const clsBest = cls.max(1);                            // [N]
    score = tf.mul(obj, clsBest);
    tf.dispose([cls, clsBest]);
  } else {
    score = obj; // single-class (your case)
  }

  // 5) Filter by confidence
  const keepMask = tf.greaterEqual(score, YOLO_CONF);
  const keepIdx  = await tf.whereAsync(keepMask);
  if (!keepIdx.size) {
    tf.dispose([det, xywh, obj, score, keepMask, keepIdx]);
    tf.dispose([input]); tf.dispose(arr);
    tf.engine().endScope();
    return [];
  }
  const idx = keepIdx.squeeze([1]);
  const selXYWH = tf.gather(xywh, idx);  // [M,4]
  const selScr  = tf.gather(score, idx); // [M]

  // 6) xywh → xyxy (handle normalized vs pixel units)
  // Heuristic: if most widths/heights ≤ 1, treat as normalized in 640 space.
  const wh = selXYWH.slice([0,2], [-1,2]);
  const whArr = await wh.data();
  let normalized = 0; for (let i=0;i<whArr.length;i++) if (whArr[i] <= 1.0001) normalized++;
  const isNorm = normalized >= Math.max(1, whArr.length * 0.6);
  tf.dispose(wh);

  const scaleVec = tf.scalar(isNorm ? YOLO_SIZE : 1);
  const xywhPix  = isNorm ? selXYWH.mul(scaleVec) : selXYWH;
  const half     = xywhPix.slice([0,2], [-1,2]).div(2);
  const xy1      = xywhPix.slice([0,0], [-1,2]).sub(half);
  const xy2      = xywhPix.slice([0,0], [-1,2]).add(half);
  const xyxy     = tf.concat([xy1, xy2], 1);               // [M,4]

  // 7) NMS (expects [y1,x1,y2,x2])
  const yxxy = tf.stack([
    xyxy.slice([0,1],[-1,1]).squeeze(),
    xyxy.slice([0,0],[-1,1]).squeeze(),
    xyxy.slice([0,3],[-1,1]).squeeze(),
    xyxy.slice([0,2],[-1,1]).squeeze()
  ],1);

  const keep = await tf.image.nonMaxSuppressionAsync(
    yxxy, selScr, YOLO_MAX_DET, YOLO_IOU, YOLO_CONF
  );
  const kept = keep.size ? keep : tf.tensor1d([], 'int32');

  const finalBoxes = tf.gather(xyxy, kept);
  const finalScores= tf.gather(selScr, kept);

  // 8) Collect, clip to letterboxed content, back-map to original coords
  const boxes640 = await finalBoxes.array();
  const scoreArr = await finalScores.array();
  const dets640 = [];
  for (let i = 0; i < boxes640.length; i++) {
    let [x1, y1, x2, y2] = boxes640[i];

    // reject centers in padding
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    const centerInContent = (cx >= content.x1 && cx <= content.x2 && cy >= content.y1 && cy <= content.y2);
    if (!centerInContent) continue;

    // clip to content
    x1 = clamp(x1, content.x1, content.x2);
    y1 = clamp(y1, content.y1, content.y2);
    x2 = clamp(x2, content.x1, content.x2);
    y2 = clamp(y2, content.y1, content.y2);

    dets640.push({ xyxy: [x1, y1, x2, y2], score: scoreArr[i] });
  }

  // cleanup tensors
  tf.dispose([det, xywh, obj, score, keepMask, keepIdx, idx, selXYWH, selScr, scaleVec, half, xy1, xy2, xyxy, yxxy, keep, kept, finalBoxes, finalScores]);
  tf.dispose([input]); tf.dispose(arr);
  tf.engine().endScope();

  // 9) Back-map to original coordinates (unletterbox)
  const dets = dets640.map(d => {
    const [x1, y1, x2, y2] = d.xyxy;
    return {
      box: [
        (x1 - dx) / (scale || 1),
        (y1 - dy) / (scale || 1),
        (x2 - dx) / (scale || 1),
        (y2 - dy) / (scale || 1),
      ],
      score: d.score
    };
  });

  // Prefer guide ROI (if provided)
  if (preferGuide && dets.length) {
    const g = getGuideMouseBox();
    if (g) {
      const roi = { x1:g.x, y1:g.y, x2:g.x+g.width, y2:g.y+g.height };
      dets.sort((a,b) => {
        const A=a.box,B=b.box;
        const ia = rectIntersect({x1:A[0],y1:A[1],x2:A[2],y2:A[3]}, roi);
        const ib = rectIntersect({x1:B[0],y1:B[1],x2:B[2],y2:B[3]}, roi);
        return (ib - ia) || (b.score - a.score);
      });
    } else dets.sort((a,b)=>b.score-a.score);
  } else dets.sort((a,b)=>b.score-a.score);

  if (dets.length) { __lastDet = dets[0]; __lastDetAt = performance.now(); }
  if (!dets.length) console.log('[YOLO] No dets (seg head path)');

  return dets;
}


/* ================== loop / drawing ================== */
// Disable any live detection; only detect after capture
let SHOW_LIVE_BOX = false;
let __lastLiveDraw = 0;
let __lastFrozenDraw = 0;

// Lightweight tracker after first detection
let trackingMode = false;     // true once we lock on the object
let trackedBox   = null;      // [x1,y1,x2,y2]
let lostFrames   = 0;
const MAX_LOST_FRAMES = 24;   // tolerate brief occlusions
const SEARCH_PAD      = 64;   // pixels around previous box to search
let whiteSig = { sMax: 0.30, vMin: 0.70 }; // HSV signature for “white-ish” object
let trackTemplate = null;                   // Float32[ts*ts] grayscale template
const TEMPLATE_SIZE = 32;
let trackArea0 = null, trackAspect0 = null; // initial size prior
let trackGuideRect = null;                  // guide region at lock time

async function drawLiveOverlayThrottled(){
  if (!yoloModel || isFrozen) return;
  const now = performance.now();
  if (now - __lastLiveDraw < DETECT_INTERVAL_MS) return;  // MOD: central interval knob
  __lastLiveDraw = now;

  ensureCanvasSizes();
  octx.clearRect(0, 0, overlay.width, overlay.height);

  // If already locked, run the lightweight tracker instead of YOLO
  if (trackingMode && trackedBox) {
    const tb = runTrackingStep(canvas, trackedBox);
    if (tb) {
      trackedBox = tb;
      drawBox(tb[0], tb[1], tb[2], tb[3], null);
      return;
    }
    // Lost this frame. While still in tracking mode, keep showing last box and DON'T YOLO yet.
    if (trackingMode && trackedBox) {
      drawBox(trackedBox[0], trackedBox[1], trackedBox[2], trackedBox[3], null);
      return;
    }
    // If trackingMode has been dropped due to repeated loss, we will fall through to YOLO re-acquire below.
  }

  // Use YOLO to acquire the object (first time or after repeated loss)
  const dets = await yoloDetectBoxes(canvas, {preferGuide:guideVisible});
  let det = dets?.[0] || null;
  if (det) {
    __lastDet = det; __lastDetAt = now;
    drawBox(det.box[0], det.box[1], det.box[2], det.box[3], det.score);
    // Initialize tracker if not already tracking
    if (!trackingMode) startTrackingFromDetection(det);
  } else if (__lastDet && (now - __lastDetAt) < __DET_TTL_MS) {
    const [x1,y1,x2,y2] = __lastDet.box;
    drawBox(x1,y1,x2,y2,__lastDet.score);
  }
}

async function drawFrozenOverlayThrottled(){
  if (!yoloModel || !isFrozen) return;
  const now = performance.now();
  if (now - __lastFrozenDraw < DETECT_INTERVAL_MS) return;
  __lastFrozenDraw = now;

  ensureCanvasSizes();
  octx.clearRect(0, 0, overlay.width, overlay.height);

  if (trackingMode && trackedBox) {
    const tb = runTrackingStep(canvas, trackedBox);
    if (tb) {
      trackedBox = tb; drawBox(tb[0], tb[1], tb[2], tb[3], null); return;
    }
    if (trackingMode && trackedBox) { drawBox(trackedBox[0], trackedBox[1], trackedBox[2], trackedBox[3], null); return; }
  }

  // Fall back to YOLO on frozen frame
  const dets = await yoloDetectBoxes(canvas, {preferGuide:guideVisible});
  let det = dets?.[0] || null;
  if (det) { __lastDet = det; __lastDetAt = now; drawBox(det.box[0], det.box[1], det.box[2], det.box[3], det.score); }
}

function loopLive(){
  ensureCanvasSizes();

  if (!isFrozen){
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // No mouse detection pre-capture; optional hand skeleton OK
    if (skeletonLive) drawSkeletonLive();
  } else if (frameData){
    ctx.putImageData(frameData, 0, 0);
    // After capture we draw a single outline in capture(); no continuous detection here
  }

  requestAnimationFrame(loopLive);
}

/* ================== boot ================== */
(async function boot() {
  await initCameraLayer();
  applyGuideScale();
  applyPanelScale();
  if (!sessionStorage.getItem('mf:grip:guide:seen')) {
    sessionStorage.setItem('mf:grip:guide:seen', '1');
    guideVisible = true;
    localStorage.setItem(PREF_GUIDE_VIS, '1');
  }
  setGuideVisibility(guideVisible);
  wireUI();
  updateViewUI();
  updateSkeletonUI();
  initPinchGestures();
  requestAnimationFrame(loopLive);
  ensureSkeletonReady();
  video?.addEventListener('loadeddata', ensureSkeletonReady);
  video?.addEventListener('loadedmetadata', ensureSkeletonReady);

  // restore thumbs
  const sTop   = getGripKV("mf:grip_view_top");
  const sRight = getGripKV("mf:grip_view_right");
  const sLeft  = getGripKV("mf:grip_view_left");
  if (sTop)   { shots.top   = sTop;   setThumbImage(thumbTop,   sTop); }
  if (sRight) { shots.right = sRight; setThumbImage(thumbRight, sRight); }
  if (sLeft)  { shots.left  = sLeft;  setThumbImage(thumbLeft,  sLeft); }
  updateClassifyEnabled();

  if (new URLSearchParams(location.search).get("fresh") === "1") clearAllShots();

  await loadMouseModel(YOLO_BASE_URL);
})();

/* ================== CAMERA ================== */
async function ensureCamPermission() {
  try { const tmp = await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
        tmp.getTracks().forEach(t=>t.stop()); return true; }
  catch { showToast("Please allow camera access in the address bar."); return false; }
}
async function populateCams(force=false) {
  try {
    if (force) await ensureCamPermission();
    const devs = await navigator.mediaDevices.enumerateDevices();
    const cams = devs.filter(d => d.kind === "videoinput");
    cameraSelect.innerHTML = "";
    cams.forEach((c,i)=>{ const o=document.createElement("option");
      o.value=c.deviceId; o.textContent=c.label || `Camera ${i+1}`; cameraSelect.appendChild(o); });
    if (!cams.length) showToast("No cameras found.");
  } catch { showToast("Couldn’t list cameras. Check permissions."); }
}
async function startCam(deviceId) {
  stopCam();
  let constraints = deviceId
    ? { video: { deviceId: { exact: deviceId } }, audio: false }
    : { video: { facingMode: { ideal: "user" }, width:{ideal:1280}, height:{ideal:720}, frameRate:{ideal:30} }, audio:false };
  try { stream = await navigator.mediaDevices.getUserMedia(constraints); }
  catch { try { stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:false }); }
          catch (e3) { return handleGUMError(e3); } }
  video.srcObject = stream;
  try { await video.play(); if (startCamBtn) startCamBtn.style.display="none"; }
  catch {
    if (startCamBtn) {
      startCamBtn.style.display="block";
      startCamBtn.onclick = async () => { try { await video.play(); startCamBtn.style.display="none"; } catch {} };
    }
  }
  const track = stream.getVideoTracks()[0]; const settings = track.getSettings?.() || {};
  currentDeviceId = settings.deviceId || deviceId || null; 
  if (camName) {
    const label = track.label || "Camera";
    // Truncate long camera names to prevent UI overflow
    const maxLength = 30;
    camName.textContent = label.length > maxLength ? label.substring(0, maxLength - 3) + '...' : label;
    camName.title = label; // Show full name on hover
  }
  if (currentDeviceId && cameraSelect) { [...cameraSelect.options].some(o => (o.value===currentDeviceId && (cameraSelect.value=o.value,true))); }
}
function stopCam(){ 
  if (stream) { 
    stream.getTracks().forEach(t=>t.stop()); 
    stream=null; 
  }
  if (video) {
    video.srcObject = null;
    video.pause();
  }
}

// Expose stopCam globally for cleanup
if (typeof window !== 'undefined') {
  window.stopCamGrip = stopCam;
}
function handleGUMError(e){ showToast("Camera error: " + (e?.message || e)); }
async function initCameraLayer() {
  if (!(location.protocol==="https:" || location.hostname==="localhost" || location.hostname==="127.0.0.1")) {
    showToast("Use HTTPS or localhost (not file://) for camera."); return;
  }
  video.setAttribute("playsinline",""); video.playsInline = true; video.muted = true;
  await ensureCamPermission();
  await populateCams(true);
  await startCam();
  cameraSelect.onchange = async () => startCam(cameraSelect.value);
  refreshCams.onclick   = () => populateCams(true);
}

/* ================== UI ================== */
function wireUI(){
  if (timerBtn)   timerBtn.onclick = () => startCountdown(5);
  if (snapBtn)    snapBtn.onclick  = () => capture();
  if (acceptBtn)  acceptBtn.onclick= () => acceptShot();
  if (retakeBtn)  retakeBtn.onclick= () => onRetake();
  if (classifyBtn) classifyBtn.onclick = () => classifyGrip();
  if (toggleSkel)  toggleSkel.onclick  = async () => {
    skeletonLive = !skeletonLive;
    if (skeletonLive) {
      await mp("VIDEO");
      ensureSkeletonReady();
    }
    updateSkeletonUI();
  };
  toggleGuideButtons.forEach(btn => btn.onclick = () => setGuideVisibility(!guideVisible));
  if (retakeAllBtn) retakeAllBtn.onclick = () => clearAllShots();

  document.addEventListener("keydown", (e) => {
    if (e.key === " ") { e.preventDefault(); if (!countdownTimer && !isFrozen) startCountdown(5); }
    if (e.key === "Escape") { retakeBtn?.click(); }
  });
}
function updateSkeletonUI(){
  if (skelState) setText(skelState, skeletonLive ? "Skeleton: On" : "Skeleton: Off");
  if (toggleSkel) toggleSkel.textContent = skeletonLive ? "Turn off skeleton" : "Turn on skeleton";
  localStorage.setItem(PREF_SKELETON, skeletonLive ? "1" : "0");
}
function updateViewUI(){
  const name = VIEWS[currentView];
  if (viewPill) viewPill.textContent = "View: " + name;
  if (guideLabel) guideLabel.textContent = `Step ${currentView+1}/3 — ${name.toUpperCase()} view`;
}
function updateClassifyEnabled(){
  const ready = Boolean(getGripKV("mf:grip_view_top") && getGripKV("mf:grip_view_right") && getGripKV("mf:grip_view_left"));
  if (classifyBtn) classifyBtn.disabled = !ready;
}
function applyGuideScale(){
  rootStyle.setProperty('--guide-scale', guideScale.toFixed(3));
}
function applyPanelScale(){
  rootStyle.setProperty('--panel-scale', panelScale.toFixed(3));
}
function setGuideScale(next){
  guideScale = clamp(Number(next) || 1, 0.6, 1.4);
  applyGuideScale();
  localStorage.setItem(PREF_GUIDE_SCALE, guideScale.toFixed(3));
}
function setPanelScale(next){
  panelScale = clamp(Number(next) || 1, 0.7, 1.25);
  applyPanelScale();
  localStorage.setItem(PREF_PANEL_SCALE, panelScale.toFixed(3));
}
function updateGuideUI(){
  if (gripGuide) {
    gripGuide.style.visibility = guideVisible ? 'visible' : 'hidden';
    gripGuide.style.opacity = guideVisible ? '1' : '0';
  }
  if (stageEl) stageEl.classList.toggle('guide-hidden', !guideVisible);
  toggleGuideButtons.forEach(btn => {
    btn.textContent = guideVisible ? 'Hide guide' : 'Show guide';
    btn.setAttribute('aria-pressed', guideVisible ? 'false' : 'true');
  });
  if (guideLabel) guideLabel.style.display = guideVisible ? 'inline-flex' : 'none';
  localStorage.setItem(PREF_GUIDE_VIS, guideVisible ? '1' : '0');
}
function setGuideVisibility(show){
  guideVisible = Boolean(show);
  trackGuideRect = null;
  updateGuideUI();
}
function initPinchGestures(){
  if (!(window.navigator?.maxTouchPoints > 0)) return;
  const handlers = [
    { el: gripGuide, get: () => guideScale, set: setGuideScale, min:0.6, max:1.4 },
    { el: controlPanel, get: () => panelScale, set: setPanelScale, min:0.7, max:1.25 }
  ];
  handlers.forEach(({ el, get, set, min, max }) => addPinchHandler(el, get, set, { min, max }));
}
function touchDist(t0, t1){
  const dx = t1.clientX - t0.clientX;
  const dy = t1.clientY - t0.clientY;
  return Math.hypot(dx, dy);
}
function addPinchHandler(el, getCurrent, setScale, opts = {}){
  if (!el) return;
  let startDist = 0;
  let startScale = 1;
  const { min = 0.5, max = 1.6 } = opts;
  el.addEventListener('touchstart', (ev) => {
    if (ev.touches.length === 2) {
      startDist = touchDist(ev.touches[0], ev.touches[1]);
      startScale = getCurrent();
    }
  }, { passive:true });
  el.addEventListener('touchmove', (ev) => {
    if (ev.touches.length === 2 && startDist) {
      const currentDist = touchDist(ev.touches[0], ev.touches[1]);
      if (currentDist > 0) {
        const scale = clamp(startScale * (currentDist / startDist), min, max);
        setScale(scale);
      }
      if (ev.cancelable) ev.preventDefault();
    }
  }, { passive:false });
  const handleEnd = (ev) => {
    if (ev.touches && ev.touches.length === 2) {
      startDist = touchDist(ev.touches[0], ev.touches[1]);
      startScale = getCurrent();
    } else {
      startDist = 0;
    }
  };
  el.addEventListener('touchend', handleEnd, { passive:true });
  el.addEventListener('touchcancel', () => { startDist = 0; }, { passive:true });
}

setupFloatingDock();
setupCoachPanel();

// Listen for navigation events to ensure coach is visible
if (typeof window !== 'undefined') {
  window.addEventListener('grip-page-ready', () => {
    setupCoachPanel();
    const coach = document.getElementById('coach');
    if (coach) {
      coach.classList.remove('hidden');
    }
  });
}

function setupFloatingDock(){
  const dock = document.querySelector('.control-dock');
  const handle = dock?.querySelector('.dock-handle');
  makeFloatingDraggable(dock, handle, 'mf:grip:dock-pos');
}

function setupCoachPanel(){
  const coach = document.getElementById('coach');
  if (!coach) {
    // Retry if coach element doesn't exist yet
    setTimeout(setupCoachPanel, 100);
    return;
  }
  // Ensure coach is visible
  coach.classList.remove('hidden');
  const handle = coach.querySelector('.coach-bar') || coach;
  const closeBtn = coach.querySelector('.coach-close');
  makeFloatingDraggable(coach, handle, 'mf:grip:coach-pos');
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

/* ================== countdown / capture ================== */
function startCountdown(seconds=5){
  if (!countdownEl) return;
  countdownEl.style.display="flex"; countdownEl.textContent=seconds;
  const tick=()=>{ seconds--; if (seconds<=0){ countdownEl.style.display="none"; countdownTimer=null; capture(); }
                   else { countdownEl.textContent=seconds; countdownTimer=setTimeout(tick,1000); } };
  countdownTimer=setTimeout(tick,1000);
}
function waitForFrame(){
  return new Promise(res => {
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype && typeof video.requestVideoFrameCallback === 'function') {
      try { video.requestVideoFrameCallback(()=>res()); return; } catch {}
    }
    if (video.readyState >= 2) return res();
    const onData = () => { video.removeEventListener('loadeddata', onData); res(); };
    video.addEventListener('loadeddata', onData, { once:true });
  });
}
function offscreenCopyToDataURL() {
  if (!canvas.width || !canvas.height) return null;
  const snap = document.createElement('canvas');
  snap.width = canvas.width; snap.height = canvas.height;
  snap.getContext('2d').drawImage(canvas, 0, 0);
  try { return snap.toDataURL("image/jpeg", 0.9); } catch { return null; }
}

async function capture(){
  isFrozen = true;

  await waitForFrame();
  ensureCanvasSizes();

  // draw the current camera frame to #frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // draw red outline (mask/box) to #overlay
  await drawMouseOutlineRedOnFrozen(); // one-time detection after freeze

  // bake the still so Accept saves a non-black image
  try { frameData = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch {}
  lastFrozenDataURL = offscreenCopyToDataURL();

  try { await video.pause?.(); } catch {}

  if (statusBadge) statusBadge.textContent = "Frozen";
  if (liveBtns)   liveBtns.style.display  = "none";
  if (frozenBtns) frozenBtns.style.display= "flex";
  if (stepPill) setText(stepPill, "Step: review");
}

function onRetake(){
  isFrozen = false;
  frameData = null;
  lastFrozenDataURL = null;
  octx.clearRect(0, 0, overlay.width, overlay.height);
  try { video.play?.(); } catch {}
  setText(stepPill, "Step: live");
  if (liveBtns)   liveBtns.style.display  = "flex";
  if (frozenBtns) frozenBtns.style.display= "none";
  // Reset tracker so we can re-acquire per view
  trackingMode = false;
  trackedBox   = null;
  lostFrames   = 0;
}

function acceptShot(){
  // Create a smaller preview image to avoid huge base64 strings
  const MAX_PREVIEW_SIZE = 800; // Max width/height for preview
  let img = null;
  
  try {
    const snap = document.createElement('canvas');
    const scale = Math.min(1, MAX_PREVIEW_SIZE / Math.max(canvas.width, canvas.height));
    snap.width = Math.round(canvas.width * scale);
    snap.height = Math.round(canvas.height * scale);
    const ctx = snap.getContext('2d');
    ctx.drawImage(canvas, 0, 0, snap.width, snap.height);
    img = snap.toDataURL("image/jpeg", 0.85); // Slightly lower quality for smaller size
  } catch (e) {
    console.warn('Failed to create preview image:', e);
    img = lastFrozenDataURL || canvas.toDataURL("image/jpeg", 0.85);
  }
  
  if (!img) img = canvas.toDataURL("image/jpeg", 0.85);

  const vName = VIEWS[currentView].toLowerCase();

  if (vName === "top")   { shots.top   = img; setThumbImage(thumbTop,   img); }
  if (vName === "right") { shots.right = img; setThumbImage(thumbRight, img); }
  if (vName === "left")  { shots.left  = img; setThumbImage(thumbLeft,  img); }

  saveGripKV("mf:grip_view_" + vName, img);
  try { saveGripKV(`mf:grip_view_${vName}_size`, JSON.stringify({ w: canvas.width, h: canvas.height })); } catch {}

  const haveAll = Boolean(getGripKV("mf:grip_view_top") && getGripKV("mf:grip_view_right") && getGripKV("mf:grip_view_left"));
  if (currentView < 2) {
    currentView++;
    updateViewUI();
    // Return to live for next capture
    onRetake();
    updateClassifyEnabled();
    return;
  }

  // Third shot accepted: stay frozen and move to Detect Grip tab
  updateClassifyEnabled();
  if (stepPill) setText(stepPill, "Step: detect");
  if (liveBtns)   liveBtns.style.display  = "none";
  if (frozenBtns) frozenBtns.style.display= "flex";
  if (!haveAll && currentView >= 2) {
    // Safety: if somehow not all present, allow retake
    return;
  }
  // Auto-run grip classification; navigation handled in classifyGrip
  if (classifyBtn && !classifyBtn.disabled) classifyGrip();
}

/* ================== MediaPipe (hand skeleton) ================== */
async function mp(mode){
  if (handLandmarker && runMode===mode) return handLandmarker;
  const vision = await import(/* @vite-ignore */ VISION_MJS);
  const files  = await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
  handLandmarker = await vision.HandLandmarker.createFromOptions(files, { baseOptions:{ modelAssetPath:TASK_URL }, numHands:1, runningMode:mode });
  runMode = mode; return handLandmarker;
}
async function startSkeleton(){ await mp("VIDEO"); }
function ensureSkeletonReady(){
  if (!skeletonLive || handLandmarker) return;
  startSkeleton().catch(err => console.warn("[Skeleton] init failed", err));
}
function drawSkeletonLive(){
  if (!handLandmarker || video.readyState < 2) return;
  let saved = false;
  try {
    const result = handLandmarker.detectForVideo(video, performance.now());
    const lm = result?.landmarks?.[0];
    if (!lm) return;
    ctx.save();
    saved = true;
    const edges = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20]];
    const px = i => ({ x: lm[i].x * canvas.width, y: lm[i].y * canvas.height });
    const thickness = Math.max(2, Math.round(canvas.width / 480));
    ctx.lineWidth = thickness;
    ctx.strokeStyle = 'rgba(34,211,238,0.9)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(5,17,34,0.6)';
    ctx.shadowBlur = Math.max(2, thickness * 1.2);
    for (const [a,b] of edges){ const A=px(a), B=px(b); ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke(); }
    ctx.shadowBlur = 0;
    if (SHOW_GUIDE_OVERLAY) {
      const g = getGuideMouseBox(); if (g) {
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.setLineDash([6,6]);
        ctx.strokeRect(g.x, g.y, g.width, g.height); ctx.restore();
      }
    }
  } catch (err) {
    if (console?.debug) console.debug('[Skeleton] draw error', err);
  } finally {
    if (saved) {
      try { ctx.restore(); } catch {}
    }
  }
}
async function getImageLandmarks(){
  try { await mp("IMAGE"); const res = handLandmarker.detect(canvas); const lm = res?.landmarks?.[0] || null; if (skeletonLive) await mp("VIDEO"); return lm; }
  catch { try { if (skeletonLive) await mp("VIDEO"); } catch {} return null; }
}

/* ================== Fallback: hand + held object box (post-capture only) ================== */
async function drawHandHeldFallback(){
  let lm = null;
  try { await mp("IMAGE"); const res = handLandmarker.detect(canvas); lm = res?.landmarks?.[0] || null; } catch {}
  try { if (skeletonLive) await mp("VIDEO"); } catch {}
  if (!lm) return false;
  // Landmarks are normalized [0,1]; compute pixel bbox
  const xs = lm.map(p => p.x * canvas.width);
  const ys = lm.map(p => p.y * canvas.height);
  let x1 = Math.max(0, Math.min(...xs));
  let y1 = Math.max(0, Math.min(...ys));
  let x2 = Math.min(canvas.width - 1, Math.max(...xs));
  let y2 = Math.min(canvas.height - 1, Math.max(...ys));
  const w = x2 - x1, h = y2 - y1;
  // Expand bbox to include what the hand is holding, but keep it reasonably tight
  const margin = Math.max(8, Math.round(Math.max(w, h) * 0.12)); // tighter box
  x1 = Math.max(0, x1 - margin);
  y1 = Math.max(0, y1 - margin);
  x2 = Math.min(canvas.width - 1, x2 + margin);
  y2 = Math.min(canvas.height - 1, y2 + margin);
  // Keep within the guide if present to avoid huge boxes
  const guide = getGuideMouseBox();
  if (guide) {
    const gx1 = guide.x, gy1 = guide.y, gx2 = guide.x + guide.width, gy2 = guide.y + guide.height;
    x1 = Math.max(x1, gx1); y1 = Math.max(y1, gy1);
    x2 = Math.min(x2, gx2); y2 = Math.min(y2, gy2);
  }
  drawBox(x1,y1,x2,y2,null);
  return true;
}

/* ================== Guide helpers (CSS px → canvas px) ================== */
function pointInBox(pt, box) {
  if (!pt || !box) return false;
  return (pt.x >= box.x && pt.x <= box.x + box.width && pt.y >= box.y && pt.y <= box.y + box.height);
}
function getGuideMouseBox() {
  const guide = gripGuide;
  if (!guide || !guideVisible) return null;
  const rect  = guide.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const stage = canvas.getBoundingClientRect();
  // scale from CSS pixels to canvas pixel coords
  const sx = canvas.width  / stage.width;
  const sy = canvas.height / stage.height;
  return {
    x: (rect.left - stage.left) * sx,
    y: (rect.top  - stage.top ) * sy,
    width:  rect.width  * sx,
    height: rect.height * sy
  };
}
function clampRectToCanvas(x1, y1, x2, y2, W, H){
  if (x2 < x1) [x1, x2] = [x2, x1];
  if (y2 < y1) [y1, y2] = [y2, y1];
  const nx1 = Math.max(0, Math.min(W - 1, x1));
  const ny1 = Math.max(0, Math.min(H - 1, y1));
  const nx2 = Math.max(0, Math.min(W - 1, x2));
  const ny2 = Math.max(0, Math.min(H - 1, y2));
  return {
    x: nx1,
    y: ny1,
    w: Math.max(1, nx2 - nx1),
    h: Math.max(1, ny2 - ny1),
    wasClamped: (nx1 !== x1 || ny1 !== y1 || nx2 !== x2 || ny2 !== y2)
  };
}

/* ================== Frozen outline ================== */
async function drawMouseOutlineRedOnFrozen() {
  if (!yoloModel) return;

  ensureCanvasSizes();

  octx.clearRect(0, 0, overlay.width, overlay.height);

  const dets = await yoloDetectBoxes(canvas, {preferGuide:guideVisible});
  if (dets?.length) {
    let [x1, y1, x2, y2] = dets[0].box;
    const refined = await refineBoxWithHand([x1,y1,x2,y2]);
    if (refined) { [x1,y1,x2,y2] = refined; }
    drawBox(x1,y1,x2,y2,dets[0].score);
    return;
  }

  // Fallback: box out the hand and what it's holding
  const ok = await drawHandHeldFallback();
  if (ok) return;

  // As a last resort, use last detection if available
  const now = performance.now();
  if (__lastDet && (now - __lastDetAt) < __DET_TTL_MS) {
    const [x1,y1,x2,y2] = __lastDet.box;
    drawBox(x1,y1,x2,y2,__lastDet.score);
  }
}

/* Merge YOLO mouse box with detected hand bbox and tighten to guide */
async function refineBoxWithHand(mouseBox){
  const hand = await getHandBBox();
  const guide = getGuideMouseBox();
  if (!hand && !guide) return mouseBox;
  let [mx1,my1,mx2,my2] = mouseBox;
  let x1 = mx1, y1 = my1, x2 = mx2, y2 = my2;
  if (hand) {
    x1 = Math.min(x1, hand.x1); y1 = Math.min(y1, hand.y1);
    x2 = Math.max(x2, hand.x2); y2 = Math.max(y2, hand.y2);
  }
  // small padding, then clamp to guide if present
  const pad = Math.round(Math.max(6, 0.10 * Math.max(x2-x1, y2-y1)));
  x1 = Math.max(0, x1 - pad); y1 = Math.max(0, y1 - pad);
  x2 = Math.min(canvas.width-1,  x2 + pad); y2 = Math.min(canvas.height-1, y2 + pad);
  if (guide) {
    const gx1 = guide.x, gy1 = guide.y, gx2 = guide.x + guide.width, gy2 = guide.y + guide.height;
    x1 = Math.max(x1, gx1); y1 = Math.max(y1, gy1);
    x2 = Math.min(x2, gx2); y2 = Math.min(y2, gy2);
  }
  // Avoid vanishingly small
  if (x2 - x1 < 8 || y2 - y1 < 8) return mouseBox;
  return [x1,y1,x2,y2];
}

async function getHandBBox(){
  try {
    await mp("IMAGE");
    const res = handLandmarker.detect(canvas);
    const lm = res?.landmarks?.[0];
    if (!lm) return null;
    const xs = lm.map(p => p.x * canvas.width);
    const ys = lm.map(p => p.y * canvas.height);
    let x1 = Math.max(0, Math.min(...xs));
    let y1 = Math.max(0, Math.min(...ys));
    let x2 = Math.min(canvas.width - 1, Math.max(...xs));
    let y2 = Math.min(canvas.height - 1, Math.max(...ys));
    // slight inward trim to avoid forearm/background
    const trim = Math.round(0.06 * Math.max(x2-x1, y2-y1));
    x1 = Math.min(x2-4, Math.max(0, x1 + trim));
    y1 = Math.min(y2-4, Math.max(0, y1 + trim));
    x2 = Math.max(x1+4, Math.min(canvas.width-1, x2 - Math.floor(trim*0.5)));
    y2 = Math.max(y1+4, Math.min(canvas.height-1, y2 - Math.floor(trim*0.5)));
    try { if (skeletonLive) await mp("VIDEO"); } catch {}
    return { x1,y1,x2,y2 };
  } catch {
    try { if (skeletonLive) await mp("VIDEO"); } catch {}
    return null;
  }
}

function drawBox(x1,y1,x2,y2,score){
  // Detect if the raw box hits canvas borders (partial object)
  const W = overlay.width, H = overlay.height;
  const hitLeft   = x1 < 0;
  const hitTop    = y1 < 0;
  const hitRight  = x2 > (W - 1);
  const hitBottom = y2 > (H - 1);

  const { x, y, w, h, wasClamped } = clampRectToCanvas(
    x1, y1, x2, y2, W, H
  );
  octx.save();
  octx.lineWidth = 3;
  octx.strokeStyle = '#FF2B2B';
  octx.setLineDash(wasClamped ? [8, 6] : []);
  octx.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  const cx = Math.max(0, Math.min(overlay.width  - 1, x + w / 2));
  const cy = Math.max(0, Math.min(overlay.height - 1, y + h / 2));
  octx.fillStyle = '#FF2B2B';
  octx.fillRect(Math.round(cx) - 2, Math.round(cy) - 2, 4, 4);
  if (score != null) {
    octx.font = '12px sans-serif';
    octx.fillText(`score: ${Number(score).toFixed(3)}`, Math.round(x)+6, Math.round(y)-6);
  }

  // If any side is clamped (partial object), draw a red line along that canvas border
  octx.lineWidth = 4;
  octx.setLineDash([]);
  if (hitLeft)   { octx.beginPath(); octx.moveTo(0, 0);     octx.lineTo(0, H);     octx.stroke(); }
  if (hitRight)  { octx.beginPath(); octx.moveTo(W-1, 0);   octx.lineTo(W-1, H);   octx.stroke(); }
  if (hitTop)    { octx.beginPath(); octx.moveTo(0, 0);     octx.lineTo(W, 0);     octx.stroke(); }
  if (hitBottom) { octx.beginPath(); octx.moveTo(0, H-1);   octx.lineTo(W, H-1);   octx.stroke(); }
  octx.restore();
}

/* ================== Tracking: init + step ================== */
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) h = 0; else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, v };
}

function startTrackingFromDetection(det){
  trackedBox = det.box.slice();
  lostFrames = 0; trackingMode = true;
  trackArea0   = Math.max(1, (trackedBox[2]-trackedBox[0]) * (trackedBox[3]-trackedBox[1]));
  trackAspect0 = Math.max(0.01, (trackedBox[2]-trackedBox[0]) / Math.max(1,(trackedBox[3]-trackedBox[1])));
  trackGuideRect = getGuideMouseBox();
  // Analyze HSV signature inside the detected box to learn "white-ish" thresholds
  try {
    const [x1,y1,x2,y2] = trackedBox.map(Math.round);
    const W = canvas.width, H = canvas.height;
    const rx1 = Math.max(0, Math.min(W-1, x1));
    const ry1 = Math.max(0, Math.min(H-1, y1));
    const rw  = Math.max(1, Math.min(W-1, x2) - rx1);
    const rh  = Math.max(1, Math.min(H-1, y2) - ry1);
    const img = ctx.getImageData(rx1, ry1, rw, rh);
    let sSum=0, vSum=0, n=0;
    for (let i=0;i<img.data.length;i+=4){
      const r=img.data[i], g=img.data[i+1], b=img.data[i+2];
      const {s,v} = rgbToHsv(r,g,b);
      sSum+=s; vSum+=v; n++;
    }
    if (n>0){
      const sMean = sSum/n, vMean = vSum/n;
      whiteSig.sMax = Math.min(0.40, Math.max(0.15, sMean + 0.08));
      whiteSig.vMin = Math.min(0.95, Math.max(0.55, vMean - 0.10));
    }
    // Build grayscale template (downsampled)
    const tw = TEMPLATE_SIZE, th = TEMPLATE_SIZE;
    const tcanvas = document.createElement('canvas'); tcanvas.width = tw; tcanvas.height = th;
    const tctx = tcanvas.getContext('2d');
    tctx.drawImage(canvas, rx1, ry1, rw, rh, 0, 0, tw, th);
    const tp = tctx.getImageData(0, 0, tw, th).data;
    trackTemplate = new Float32Array(tw*th);
    for (let i=0, j=0; i<tp.length; i+=4, j++){
      // simple luma
      trackTemplate[j] = 0.299*tp[i] + 0.587*tp[i+1] + 0.114*tp[i+2];
    }
  } catch {}
}

function runTrackingStep(imageLike, prevBox){
  const W = canvas.width, H = canvas.height;
  const [px1,py1,px2,py2] = prevBox;
  const cx = (px1+px2)/2, cy=(py1+py2)/2;
  let sx1 = Math.round(px1 - SEARCH_PAD), sy1 = Math.round(py1 - SEARCH_PAD);
  let sx2 = Math.round(px2 + SEARCH_PAD), sy2 = Math.round(py2 + SEARCH_PAD);
  sx1 = Math.max(0, sx1); sy1 = Math.max(0, sy1);
  sx2 = Math.min(W-1, sx2); sy2 = Math.min(H-1, sy2);
  const sw = Math.max(1, sx2 - sx1), sh = Math.max(1, sy2 - sy1);

  let img;
  try { img = ctx.getImageData(sx1, sy1, sw, sh); } catch { return null; }

  // Segment white-ish pixels using learned HSV signature, then pick the largest
  // connected component near the previous box to be rotation-robust.
  const { sMax, vMin } = whiteSig;
  const expand = 0.30; // 30% grow around previous box
  const ex1 = Math.max(0, Math.floor(px1 - (px2-px1)*expand));
  const ey1 = Math.max(0, Math.floor(py1 - (py2-py1)*expand));
  const ex2 = Math.min(W-1, Math.ceil (px2 + (px2-px1)*expand));
  const ey2 = Math.min(H-1, Math.ceil (py2 + (py2-py1)*expand));

  const totalPx = sw * sh;
  const mask = new Uint8Array(totalPx); // 0/1 mask
  for (let y=0, idx=0; y<sh; y++){
    const ay = sy1 + y;
    for (let x=0; x<sw; x++, idx++){
      const ax = sx1 + x;
      const insideExpand = (ax >= ex1 && ax <= ex2 && ay >= ey1 && ay <= ey2);
      if (!insideExpand) { mask[idx] = 0; continue; }
      const i = (y*sw + x) * 4;
      const r=img.data[i], g=img.data[i+1], b=img.data[i+2];
      const {s,v} = rgbToHsv(r,g,b);
      mask[idx] = (s <= sMax && v >= vMin) ? 1 : 0;
    }
  }

  const visited = new Uint8Array(totalPx);
  let best = null; // {area, minx,miny,maxx,maxy, cx,cy, score}
  const queueX = new Int16Array(totalPx);
  const queueY = new Int16Array(totalPx);

  function considerComponent(seedX, seedY){
    let head=0, tail=0;
    queueX[tail] = seedX; queueY[tail] = seedY; tail++;
    visited[seedY*sw + seedX] = 1;
    let minx=seedX, maxx=seedX, miny=seedY, maxy=seedY, area=0, sx=0, sy=0;
    while (head < tail){
      const x = queueX[head], y = queueY[head]; head++;
      area++; sx += x; sy += y;
      if (x<minx) minx=x; if (x>maxx) maxx=x; if (y<miny) miny=y; if (y>maxy) maxy=y;
      // 4-neighborhood
      const neigh = [ [x-1,y], [x+1,y], [x,y-1], [x,y+1] ];
      for (let k=0;k<4;k++){
        const nx = neigh[k][0], ny = neigh[k][1];
        if (nx<0 || ny<0 || nx>=sw || ny>=sh) continue;
        const id = ny*sw + nx;
        if (!visited[id] && mask[id]) { visited[id]=1; queueX[tail]=nx; queueY[tail]=ny; tail++; }
      }
    }
    if (area < 40) return; // ignore tiny blobs
    const ccx = (minx+maxx)/2, ccy = (miny+maxy)/2;
    const ccxAbs = sx1 + ccx, ccyAbs = sy1 + ccy;
    const dist2 = (ccxAbs - cx)*(ccxAbs - cx) + (ccyAbs - cy)*(ccyAbs - cy);
    const score = area - 0.002 * dist2; // prefer large, near previous center
    if (!best || score > best.score){ best = { area, minx, miny, maxx, maxy, cx:ccxAbs, cy:ccyAbs, score }; }
  }

  for (let y=0; y<sh; y++){
    for (let x=0; x<sw; x++){
      const id = y*sw + x;
      if (mask[id] && !visited[id]) considerComponent(x, y);
    }
  }

  if (!best){
    lostFrames++;
    if (lostFrames > MAX_LOST_FRAMES){ trackingMode = false; trackedBox = null; }
    return null;
  }
  lostFrames = 0;
  const nx1 = sx1 + best.minx;
  const ny1 = sy1 + best.miny;
  const nx2 = sx1 + best.maxx;
  const ny2 = sy1 + best.maxy;

  // Gating checks to ensure we stick to the mouse
  const candArea   = Math.max(1, (nx2-nx1)*(ny2-ny1));
  const candAspect = Math.max(0.01, (nx2-nx1)/Math.max(1,(ny2-ny1)));
  const prevArea   = Math.max(1, (px2-px1)*(py2-py1));
  const areaRatio  = candArea / (trackArea0 || prevArea);
  const aspectDev  = Math.abs(Math.log(candAspect/(trackAspect0 || candAspect)));
  const dist       = Math.hypot(((nx1+nx2)/2 - cx), ((ny1+ny2)/2 - cy));
  const iouPrev    = iouBoxes([px1,py1,px2,py2],[nx1,ny1,nx2,ny2]);

  // Guide constraint: center must be inside the guide (if available)
  const guide = trackGuideRect || getGuideMouseBox();
  const ccx_abs = (nx1+nx2)/2, ccy_abs = (ny1+ny2)/2;
  const centerInsideGuide = guide ? (
    ccx_abs >= guide.x && ccx_abs <= (guide.x + guide.width) &&
    ccy_abs >= guide.y && ccy_abs <= (guide.y + guide.height)
  ) : true;

  // Template similarity (looser, rotation tolerant)
  let simOk = true;
  if (trackTemplate){
    const sim = templateSimilarity(nx1,ny1,nx2,ny2);
    simOk = sim >= 0.25; // lower threshold to allow rotation/lighting changes
  }

  const areaOk   = (areaRatio >= 0.4 && areaRatio <= 2.5);
  const aspectOk = (aspectDev <= Math.log(2.0)); // within ~100%
  const motionOk = (dist <= SEARCH_PAD*0.9) || (iouPrev >= 0.15);
  const gateOK   = areaOk && aspectOk && motionOk && simOk && centerInsideGuide;
  if (!gateOK){
    // reject this candidate; keep previous box until we can re‑acquire
    return null;
  }

  // Smooth with a small EMA to reduce jitter
  const alpha = 0.6;
  if (trackedBox){
    trackedBox[0] = alpha*trackedBox[0] + (1-alpha)*nx1;
    trackedBox[1] = alpha*trackedBox[1] + (1-alpha)*ny1;
    trackedBox[2] = alpha*trackedBox[2] + (1-alpha)*nx2;
    trackedBox[3] = alpha*trackedBox[3] + (1-alpha)*ny2;
    // slowly adapt size/aspect priors as the object rotates/scales
    const newArea = Math.max(1, (trackedBox[2]-trackedBox[0])*(trackedBox[3]-trackedBox[1]));
    const newAsp  = Math.max(0.01,(trackedBox[2]-trackedBox[0]) / Math.max(1,(trackedBox[3]-trackedBox[1])));
    const a2 = 0.9; trackArea0 = a2*trackArea0 + (1-a2)*newArea; trackAspect0 = a2*trackAspect0 + (1-a2)*newAsp;
    return trackedBox.slice();
  }
  return [nx1, ny1, nx2, ny2];
}

function iouBoxes(a, b){
  const ax1=a[0], ay1=a[1], ax2=a[2], ay2=a[3];
  const bx1=b[0], by1=b[1], bx2=b[2], by2=b[3];
  const x1 = Math.max(ax1,bx1), y1 = Math.max(ay1,by1);
  const x2 = Math.min(ax2,bx2), y2 = Math.min(ay2,by2);
  const iw = Math.max(0, x2-x1), ih = Math.max(0, y2-y1);
  const inter = iw*ih;
  const ua = Math.max(1,(ax2-ax1)*(ay2-ay1)) + Math.max(1,(bx2-bx1)*(by2-by1)) - inter;
  return inter/ua;
}

function templateSimilarity(x1,y1,x2,y2){
  try {
    const tw=TEMPLATE_SIZE, th=TEMPLATE_SIZE;
    const w = Math.max(1, Math.round(x2-x1));
    const h = Math.max(1, Math.round(y2-y1));
    const tcanvas = document.createElement('canvas'); tcanvas.width = tw; tcanvas.height = th;
    const tctx = tcanvas.getContext('2d');
    tctx.drawImage(canvas, Math.round(x1), Math.round(y1), w, h, 0, 0, tw, th);
    const tp = tctx.getImageData(0, 0, tw, th).data;
    const buf = new Float32Array(tw*th);
    for (let i=0, j=0; i<tp.length; i+=4, j++) buf[j] = 0.299*tp[i] + 0.587*tp[i+1] + 0.114*tp[i+2];
    // cosine similarity
    let dot=0, na=0, nb=0;
    for (let i=0;i<buf.length;i++){ const a=trackTemplate[i]; const b=buf[i]; dot+=a*b; na+=a*a; nb+=b*b; }
    return dot / (Math.sqrt(na)*Math.sqrt(nb) + 1e-6);
  } catch { return 0; }
}

/* ================== Offline / Classifier (unchanged core) ================== */
async function detectBestMouseBoxFromDataUrl(dataUrl, size) {
  if (!dataUrl || !size?.w || !size?.h || !yoloModel) return null;
  const img = new Image(); img.crossOrigin = 'anonymous';
  return new Promise((resolve) => {
    img.onload = async () => {
      const c = document.createElement('canvas'); c.width = size.w; c.height = size.h;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const dets = await yoloDetectBoxes(c);
      if (!dets.length) return resolve(null);
      dets.sort((a,b) => b.score - a.score);
      const [x1,y1,x2,y2] = dets[0].box;
      resolve({ x: Math.max(0, Math.round(x1)), y: Math.max(0, Math.round(y1)), width: Math.max(1, Math.round(x2-x1)), height: Math.max(1, Math.round(y2-y1)), _score: dets[0].score });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function pipAngle(lm, mcp, pip, tip){
  const a = { x: lm[mcp].x, y: lm[mcp].y }, b = { x: lm[pip].x, y: lm[pip].y }, c = { x: lm[tip].x, y: lm[tip].y };
  const v1 = { x: a.x - b.x, y: a.y - b.y }, v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x*v2.x + v1.y*v2.y; const L1 = Math.hypot(v1.x,v1.y), L2 = Math.hypot(v2.x,v2.y);
  const cos = Math.max(-1, Math.min(1, dot/(L1*L2||1))); return Math.acos(cos) * 180/Math.PI;
}
function mapGripPreference(grip){
  const g = String(grip || "").toLowerCase().trim();
  if (g.includes("relaxed") && g.includes("claw")) return { grip: "claw", relaxed: true };
  if (g.includes("claw"))       return { grip: "claw", relaxed: false };
  if (g.includes("fingertip"))  return { grip: "fingertip", relaxed: false };
  if (g.includes("palm"))       return { grip: "palm", relaxed: false };
  return { grip: "", relaxed: false };
}

async function detectLandmarksFromDataUrl(dataUrl, size) {
  return new Promise(async (resolve) => {
    if (!dataUrl || !size?.w || !size?.h) return resolve(null);
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = async () => {
      const c = document.createElement('canvas'); c.width = size.w; c.height = size.h;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      try { await mp("IMAGE"); const res = handLandmarker.detect(c); const lm = res?.landmarks?.[0] || null; if (skeletonLive) await mp("VIDEO"); resolve(lm); }
      catch { try { if (skeletonLive) await mp("VIDEO"); } catch {} resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
function denormalizeGuideBox(norm, size) {
  if (!norm || !size) return null;
  return { x: Math.round(norm.x * size.w), y: Math.round(norm.y * size.h), width: Math.round(norm.w * size.w), height: Math.round(norm.h * size.h) };
}

async function classifyFrom3Views() {
  const tUrl = getGripKV("mf:grip_view_top");
  const rUrl = getGripKV("mf:grip_view_right");
  const lUrl = getGripKV("mf:grip_view_left");
  if (!tUrl || !rUrl || !lUrl) { showToast("Need Top, Right and Left shots."); return null; }
  const tSize = JSON.parse(getGripKV("mf:grip_view_top_size") || "{}");
  const rSize = JSON.parse(getGripKV("mf:grip_view_right_size") || "{}");
  const lSize = JSON.parse(getGripKV("mf:grip_view_left_size") || "{}");
  const tGuideNorm = JSON.parse(getGripKV("mf:grip_view_top_guide") || "null");
  const rGuideNorm = JSON.parse(getGripKV("mf:grip_view_right_guide") || "null");
  const lGuideNorm = JSON.parse(getGripKV("mf:grip_view_left_guide") || "null");
  const [lmTop, lmRight, lmLeft] = await Promise.all([
    detectLandmarksFromDataUrl(tUrl, tSize),
    detectLandmarksFromDataUrl(rUrl, rSize),
    detectLandmarksFromDataUrl(lUrl, lSize),
  ]);
  const [yTop, yRight, yLeft] = await Promise.all([
    detectBestMouseBoxFromDataUrl(tUrl, tSize),
    detectBestMouseBoxFromDataUrl(rUrl, rSize),
    detectBestMouseBoxFromDataUrl(lUrl, lSize),
  ]);
  const topBox   = yTop   || (tGuideNorm ? denormalizeGuideBox(tGuideNorm, tSize) : null);
  const rightBox = yRight || (rGuideNorm ? denormalizeGuideBox(rGuideNorm, rSize) : null);
  const leftBox  = yLeft  || (lGuideNorm ? denormalizeGuideBox(lGuideNorm, lSize) : null);

  function lmToPx(lm, idx, size) { return { x: lm[idx].x * size.w, y: lm[idx].y * size.h }; }
  function sideMetrics(lm, size, box, viewName){
    if (!lm || !size || !box) return { viewName, ok:false };
    const wrist  = lmToPx(lm, 0, size);
    const mcpIdx = [5,9,13,17].map(i => lmToPx(lm, i, size));
    const mcpY   = mcpIdx.reduce((s,p)=>s+p.y,0) / mcpIdx.length;
    const mouseTop = box.y; // y-axis grows downwards
    const tol = Math.max(4, box.height * 0.12);
    const touchingBack = Math.abs(mcpY - mouseTop) <= tol; // dorsum near mouse top
    const wristLifted  = (mouseTop - wrist.y) >= (box.height * 0.10);
    const angIndex = pipAngle(lm, 5, 6, 8);
    const angMiddle= pipAngle(lm, 9,10,12);
    const curl = (angIndex + angMiddle) / 2; // 180=straight
    return { viewName, ok:true, touchingBack, wristLifted, curl, wristY:wrist.y, mouseTop };
  }

  const rightA = sideMetrics(lmRight, rSize, rightBox, "right");
  const leftA  = sideMetrics(lmLeft,  lSize, leftBox,  "left");

  // Aggregate side cues
  const sides = [rightA, leftA].filter(v=>v.ok);
  let scorePalm=0, scoreClaw=0, scoreFingertip=0;
  for (const s of sides){
    const straight = s.curl >= 155;
    const curved   = s.curl < 155 && s.curl >= 125;
    const veryCurved = s.curl < 125;
    if (s.touchingBack && !s.wristLifted && straight)      { scorePalm     += 1.0; }
    if (s.touchingBack && !s.wristLifted && (curved||veryCurved)) { scoreClaw += curved ? 1.0 : 1.2; }
    if (!s.touchingBack && s.wristLifted)                   { scoreFingertip+= 1.2; }
  }

  // If no side views are valid, fallback to top finger curl
  if (!sides.length && lmTop && tSize){
    const topCurl = (pipAngle(lmTop,5,6,8) + pipAngle(lmTop,9,10,12))/2;
    if (topCurl >= 160) scorePalm += 0.6; else if (topCurl >= 135) scoreClaw += 0.6; else scoreFingertip += 0.6;
  }

  let final = { grip: "unknown", score: 0.6 };
  if (scoreFingertip >= scoreClaw && scoreFingertip >= scorePalm) {
    final.grip = "fingertip"; final.score = Math.min(0.98, 0.6 + 0.2*scoreFingertip);
  } else if (scorePalm >= scoreClaw) {
    final.grip = "palm"; final.score = Math.min(0.98, 0.6 + 0.2*scorePalm);
  } else {
    final.grip = "claw"; final.score = Math.min(0.98, 0.6 + 0.2*scoreClaw);
  }
  final.grip = String(final.grip).toLowerCase();
  return final;
}

async function classifyGrip(){
  const t0 = getGripKV("mf:grip_view_top"), r0 = getGripKV("mf:grip_view_right"), l0 = getGripKV("mf:grip_view_left");
  if (!t0 || !r0 || !l0){ showToast("Capture Top, Right and Left first."); return; }
  setText(resultPill, "Result: analysing…");
  try {
    const complex = await classifyFrom3Views();
    if (complex) {
      const finalGrip = complex.grip; const finalConf = Math.round(100 * (complex.score ?? 0.7));
      saveGripKV("mf:grip_result", JSON.stringify({ grip: finalGrip, confidence: finalConf/100 }));
      saveGripKV("mf:grip", finalGrip);
      saveGripKV("mf:grip_pref", JSON.stringify(mapGripPreference(finalGrip)));
      setText(resultPill, `Result: ${finalGrip} (${finalConf}%)`);
      if (gotoReport) gotoReport.style.display = "inline-block";
      try { if (typeof window.finishGrip === 'function') window.finishGrip(finalGrip); } catch {}
      return;
    }
  } catch (e) { console.warn("3-view classifier error:", e); }
  const lm = await getImageLandmarks();
  const localGuess = classifyFromLandmarks(lm);
  const finalGrip = String(localGuess.grip || 'unknown').toLowerCase();
  const finalConf = Math.round(100 * (localGuess.confidence ?? 0.4));
  saveGripKV("mf:grip_result", JSON.stringify({ grip: finalGrip, confidence: finalConf/100 }));
  saveGripKV("mf:grip", finalGrip);
  saveGripKV("mf:grip_pref", JSON.stringify(mapGripPreference(finalGrip)));
  setText(resultPill, `Result: ${finalGrip} (${finalConf}%)`);
  if (gotoReport) gotoReport.style.display = "inline-block";
  try { if (typeof window.finishGrip === 'function') window.finishGrip(finalGrip); } catch {}
}
function classifyFromLandmarks(lm){
  if (!lm) return { grip:"unknown", confidence:0.4 };
  const angIndex  = pipAngle(lm, 5, 6, 8);
  const angMiddle = pipAngle(lm, 9,10,12);
  const curl = (angIndex + angMiddle)/2;
  let grip = "unknown", score = 0.5;
  if (curl >= 160) { grip = "palm"; score = 0.7; }
  else if (curl >= 135) { grip = "claw"; score = 0.65; }
  else { grip = "fingertip"; score = 0.65; }
  return { grip, confidence: score };
}

/* ================== Clear / Retake All ================== */
function clearAllShots(){
  shots = { top:null, right:null, left:null };
  [thumbTop, thumbRight, thumbLeft].forEach(el=>{
    if (!el) return;
    // Revoke blob URLs to prevent memory leaks
    if (el.dataset.blobUrl) {
      URL.revokeObjectURL(el.dataset.blobUrl);
      delete el.dataset.blobUrl;
    }
    el.removeAttribute('src');
    const box = el.closest('.thumb');
    if (box) box.classList.remove('has-img');
  });
  clearGripK([
    "mf:grip_view_top","mf:grip_view_right","mf:grip_view_left",
    "mf:grip_view_top_size","mf:grip_view_right_size","mf:grip_view_left_size",
    "mf:grip_view_top_guide","mf:grip_view_right_guide","mf:grip_view_left_guide",
    "mf:grip_result","mf:grip_pref","mf:grip"
  ]);
  currentView = 0; updateViewUI();
  onRetake();
  setText(resultPill, "Result: —");
  updateClassifyEnabled();
}

/* ================== Misc ================== */
function showToast(msg, durationMs = 2200) {
  if (!toast) return console.log(msg);
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, durationMs);
}

/* DevTools helpers */
window.YOLO = {
  model: () => yoloModel,
  detect: (img = canvas) => yoloDetectBoxes(img, {preferGuide:true}),
  draw: async () => drawMouseOutlineRedOnFrozen(),
  conf: () => YOLO_CONF,
  setConf: (v) => { YOLO_CONF = Number(v); console.log('YOLO_CONF =', YOLO_CONF); }
};





















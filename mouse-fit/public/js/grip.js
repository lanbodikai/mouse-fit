/* ================== constants ================== */
const TASK_URL   = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const VISION_MJS = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";

const VIEWS = ["Top","Right","Left"];

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

const liveBtns     = document.getElementById("liveBtns");
const frozenBtns   = document.getElementById("frozenBtns");
const timerBtn     = document.getElementById("timer");
const snapBtn      = document.getElementById("snap");
const acceptBtn    = document.getElementById("accept");
const retakeBtn    = document.getElementById("retake");
const classifyBtn  = document.getElementById("classify");
const toggleSkel   = document.getElementById("toggleSkel");
const skelState    = document.getElementById("skelState");
const stepPill     = document.getElementById("stepPill");
const viewPill     = document.getElementById("viewPill");
const resultPill   = document.getElementById("resultPill");
const guideLabel   = document.getElementById("guideLabel");

const thumbTop     = document.getElementById("thumbTop");
const thumbRight   = document.getElementById("thumbRight");
const thumbLeft    = document.getElementById("thumbLeft");

const retakeAllBtn = document.getElementById("retakeAll");
const gotoReport   = document.getElementById("gotoReport");


/* ================== state ================== */
let stream = null, currentDeviceId = null;
let frameData = null;
let handLandmarker = null, runMode = null;
let skeletonLive = true;
let countdownTimer = null;
let isFrozen = false;

let currentView = 0; // 0=Top, 1=Right, 2=Left
let shots = { top:null, right:null, left:null }; // base64 strings

/* ================== boot ================== */
(async function boot() {
  await initCameraLayer();
  wireUI();
  resize();
  requestAnimationFrame(loopLive);
  if (skeletonLive) await startSkeleton();
  updateViewUI();
  updateSkeletonUI();
    // If opened with ?fresh=1, clear any old grip shots/results
  if (new URLSearchParams(location.search).get("fresh") === "1") {
    clearAllShots();
  }
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
  catch { if (startCamBtn) { startCamBtn.style.display="block"; startCamBtn.onclick = async () => { try { await video.play(); startCamBtn.style.display="none"; } catch {} }; } }
  const track = stream.getVideoTracks()[0]; const settings = track.getSettings?.() || {};
  currentDeviceId = settings.deviceId || deviceId || null; camName.textContent = track.label || "Camera";
  if (currentDeviceId && cameraSelect) { [...cameraSelect.options].some(o => (o.value===currentDeviceId && (cameraSelect.value=o.value,true))); }
}
function stopCam(){ if (stream) { stream.getTracks().forEach(t=>t.stop()); stream=null; } }
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
  timerBtn.onclick = () => startCountdown(5);
  snapBtn.onclick  = () => capture();
  acceptBtn.onclick= () => acceptShot();
  retakeBtn.onclick= () => { isFrozen=false; frameData=null; stepPill.textContent="Step: live"; liveBtns.style.display="flex"; frozenBtns.style.display="none"; }
  classifyBtn.onclick = () => classifyGrip();
  toggleSkel.onclick  = async () => { skeletonLive = !skeletonLive; if (skeletonLive && !handLandmarker) await startSkeleton(); updateSkeletonUI(); };
  retakeAllBtn.onclick = () => clearAllShots();

  document.addEventListener("keydown", (e) => {
    if (e.key === " ") { e.preventDefault(); if (!countdownTimer && !isFrozen) startCountdown(5); }
    if (e.key === "Escape") { retakeBtn.click(); }
  });
}
function updateSkeletonUI(){
  skelState.textContent = skeletonLive ? "Skeleton: On" : "Skeleton: Off";
  toggleSkel.textContent = skeletonLive ? "Turn off skeleton" : "Turn on skeleton";
}
function updateViewUI(){
  const name = VIEWS[currentView];
  viewPill.textContent = "View: " + name;
  guideLabel.textContent = `Step ${currentView+1}/3 — ${name.toUpperCase()} view`;
}

/* ================== loop ================== */
function resize(){ canvas.width=video.videoWidth||1280; canvas.height=video.videoHeight||720; }
function loopLive(){
  if (!isFrozen){ resize(); ctx.drawImage(video,0,0,canvas.width,canvas.height); if (skeletonLive) drawSkeletonLive(); }
  else if (frameData){ ctx.putImageData(frameData,0,0); if (skeletonLive) drawSkeletonFrozen(); }
  requestAnimationFrame(loopLive);
}

/* ================== MediaPipe ================== */
async function mp(mode){
  if (handLandmarker && runMode===mode) return handLandmarker;
  const vision = await import(/* @vite-ignore */ VISION_MJS);
  const files  = await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
  handLandmarker = await vision.HandLandmarker.createFromOptions(files, { baseOptions:{ modelAssetPath:TASK_URL }, numHands:1, runningMode:mode });
  runMode = mode; return handLandmarker;
}
async function startSkeleton(){ await mp("VIDEO"); }
function drawSkeletonLive(){
  try {
    const result = handLandmarker.detectForVideo(video, performance.now());
    const lm = result?.landmarks?.[0]; if (!lm) return;
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.6)";
    const edges = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20]];
    const px = i => ({ x: lm[i].x * canvas.width, y: lm[i].y * canvas.height });
    for (const [a,b] of edges){ const A=px(a), B=px(b); ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke(); }
  } catch {}
}
async function getImageLandmarks(){
  try {
    await mp("IMAGE");
    const res = handLandmarker.detect(canvas);
    return res?.landmarks?.[0] || null;
  } catch { return null; }
}
function drawSkeletonFrozen(){ /* optional */ }

/* ================== Capture & accept ================== */
function startCountdown(seconds=5){
  countdownEl.style.display="flex"; countdownEl.textContent=seconds;
  const tick=()=>{ seconds--; if (seconds<=0){ countdownEl.style.display="none"; countdownTimer=null; capture(); }
                   else { countdownEl.textContent=seconds; countdownTimer=setTimeout(tick,1000); } };
  countdownTimer=setTimeout(tick,1000);
}
function capture(){
  resize();
  ctx.drawImage(video,0,0,canvas.width,canvas.height);
  frameData = ctx.getImageData(0,0,canvas.width,canvas.height);
  isFrozen = true;
  statusBadge.textContent = "Frozen";
  liveBtns.style.display = "none";
  frozenBtns.style.display = "flex";
  stepPill.textContent = "Step: review";
}
function acceptShot(){
  const img = canvas.toDataURL("image/jpeg", 0.9);
  if (currentView===0){ shots.top = img;  thumbTop.src   = img; }
  if (currentView===1){ shots.right = img; thumbRight.src = img; }
  if (currentView===2){ shots.left = img;  thumbLeft.src  = img; }
  // persist for later
  localStorage.setItem("mousefit:grip_view_"+VIEWS[currentView].toLowerCase(), img);

  // move to next or enable classify
  if (currentView < 2){
    currentView++;
    updateViewUI();
    // reset to live
    isFrozen=false; frameData=null; stepPill.textContent="Step: live";
    liveBtns.style.display="flex"; frozenBtns.style.display="none";
  } else {
    classifyBtn.disabled = false;
    showToast("All 3 views captured. You can classify now.");
  }
}

function clearAllShots(){
  shots = { top:null, right:null, left:null };
  thumbTop.src = thumbRight.src = thumbLeft.src = "";
  localStorage.removeItem("mousefit:grip_view_top");
  localStorage.removeItem("mousefit:grip_view_right");
  localStorage.removeItem("mousefit:grip_view_left");
  localStorage.removeItem("mousefit:grip_result");
  localStorage.removeItem("mousefit:grip_pref");
  classifyBtn.disabled = true;
  gotoReport.style.display = "none";
  currentView = 0;
  updateViewUI();
  isFrozen = false; frameData = null;
  stepPill.textContent = "Step: live";
  liveBtns.style.display = "flex";
  frozenBtns.style.display = "none";
  resultPill.textContent = "Result: —";
}

/* ============== Heuristic classification (works offline) ============== */
// angle at PIP: between (MCP->PIP) and (PIP->TIP) — straighter ≈ 180°, curled smaller
function pipAngle(lm, mcp, pip, tip){
  const a = { x: lm[mcp].x, y: lm[mcp].y };
  const b = { x: lm[pip].x, y: lm[pip].y };
  const c = { x: lm[tip].x, y: lm[tip].y };
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x*v2.x + v1.y*v2.y;
  const L1 = Math.hypot(v1.x,v1.y), L2 = Math.hypot(v2.x,v2.y);
  const cos = Math.max(-1, Math.min(1, dot/(L1*L2||1)));
  return Math.acos(cos) * 180/Math.PI;
}

function classifyFromLandmarks(lm){
  if (!lm) return { grip:"unknown", confidence:0.0 };

  // Fingers: index(5-8), middle(9-12), ring(13-16), pinky(17-20)
  const angIndex  = pipAngle(lm, 5, 6, 8);
  const angMiddle = pipAngle(lm, 9,10,12);
  const angRing   = pipAngle(lm,13,14,16);
  const angPinky  = pipAngle(lm,17,18,20);

  const avgIM = (angIndex + angMiddle)/2;
  const avgRP = (angRing + angPinky)/2;

  // thresholds tuned for top-ish views
  let grip = "unknown", score = 0.4;

  if (avgIM >= 155 && avgRP >= 150){
    grip = "palm";
    score = Math.min(0.99, ((avgIM-150)+(avgRP-145))/50);
  } else if (avgIM >= 140 && avgIM < 155){
    grip = "relaxed claw";
    score = 0.6 + (avgIM-140)/30 * 0.25;
  } else if (avgIM >= 115 && avgIM < 140){
    grip = "claw";
    score = 0.6 + (140-avgIM)/25 * 0.3;
  } else if (avgIM < 115){
    grip = "fingertip";
    score = 0.6 + (115-avgIM)/40 * 0.3;
  }

  return { grip, confidence: Math.max(0, Math.min(0.99, score)) };
}

// simple red contact overlay: tips always, and palm base if palmish
function overlayContact(grip, lm){
  if (!lm) return;
  const W = canvas.width, H = canvas.height;
  const px = i => ({ x: lm[i].x*W, y: lm[i].y*H });

  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.fillStyle = "#ff3b30";

  // finger tips
  [4,8,12,16,20].forEach(i => {
    const p = px(i);
    ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI*2); ctx.fill();
  });

  if (grip==="palm" || grip==="relaxed claw"){
    // rough palm patch: midpoint of 5 and 17 (knuckles), expanded towards wrist (0)
    const k5 = px(5), k17 = px(17), w = px(0);
    const center = { x:(k5.x+k17.x+w.x)/3, y:(k5.y+k17.y+w.y)/3 };
    ctx.beginPath();
    ctx.ellipse(center.x, center.y+20, 60, 40, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

function mapGripPreference(grip){
  const g = String(grip || "").toLowerCase().trim();
  // normalize some phrasing
  if (g.includes("relaxed") && g.includes("claw")) return { grip: "claw", relaxed: true };
  if (g.includes("claw"))       return { grip: "claw", relaxed: false };
  if (g.includes("fingertip"))  return { grip: "fingertip", relaxed: false };
  if (g.includes("palm"))       return { grip: "palm", relaxed: false };
  return { grip: "", relaxed: false };
}

/* ================== Classify ================== */
async function classifyGrip(){
  if (!shots.top || !shots.right || !shots.left){
    showToast("Capture Top, Right and Left first."); return;
  }

  resultPill.textContent = "Result: analysing…";

  // Try local heuristic on the frozen frame (top view most reliable)
  const lm = await getImageLandmarks();
  let localGuess = classifyFromLandmarks(lm);

  // draw contact overlay on the frozen view for instant feedback
  if (lm) overlayContact(localGuess.grip, lm);

  // Prefer backend if available (send all three views)
  try {
    const res = await fetch("/api/grip", {
      method:"POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ top:shots.top, right:shots.right, left:shots.left, local_guess:localGuess })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json(); // { grip, confidence }
    localStorage.setItem("mousefit:grip_result", JSON.stringify(data));
    const label = String(data.grip||localGuess.grip).toLowerCase();
    const conf  = Math.round(100*(data.confidence ?? localGuess.confidence));
    resultPill.textContent = `Result: ${label} (${conf}%)`;
    
    const currentSession = localStorage.getItem("mousefit:session") || "legacy";
    localStorage.setItem("mousefit:grip_done_session", currentSession);
    gotoReport.style.display = "inline-block";

    const pref = mapGripPreference(label);
    localStorage.setItem("mousefit:grip_pref", JSON.stringify(pref));
    gotoReport.style.display = "inline-block";
  } catch {
    // fallback to local
    localStorage.setItem("mousefit:grip_result", JSON.stringify(localGuess));
    const conf = Math.round(localGuess.confidence*100);
    resultPill.textContent = `Result: ${localGuess.grip} (${conf}%)`;
    showToast("No AI server at /api/grip — used local heuristic.");

    const currentSession = localStorage.getItem("mousefit:session") || "legacy";
    localStorage.setItem("mousefit:grip_done_session", currentSession);
    gotoReport.style.display = "inline-block";

    const pref = mapGripPreference(localGuess.grip);
    localStorage.setItem("mousefit:grip_pref", JSON.stringify(pref));
    gotoReport.style.display = "inline-block";
  }
}

/* ================== Misc ================== */
function showToast(msg, durationMs = 2200) {
  if (!toast) return console.log(msg);
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, durationMs);
}

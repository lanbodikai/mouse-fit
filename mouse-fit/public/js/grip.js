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

const skelState    = document.getElementById("skelState"); // may be null in your HTML
const stepPill     = document.getElementById("stepPill");  // may be null in your HTML
const viewPill     = document.getElementById("viewPill");
const resultPill   = document.getElementById("resultPill");
const guideLabel   = document.getElementById("guideLabel");

const thumbTop     = document.getElementById("thumbTop");
const thumbRight   = document.getElementById("thumbRight");
const thumbLeft    = document.getElementById("thumbLeft");

const retakeAllBtn = document.getElementById("retakeAll");
const gotoReport   = document.getElementById("gotoReport");

/* ================== helpers (storage + safe text) ================== */
// Write to BOTH storages and BOTH key families for compatibility
function saveGripKV(key, value){
  // sessionStorage preferred by some report.html builds
  sessionStorage.setItem(key, value);
  // mirror to localStorage with mousefit: namespace
  localStorage.setItem(key.replace(/^mf:/, "mousefit:"), value);
}
function getGripKV(key){
  // prefer fresh sessionStorage, fall back to localStorage
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

/* ================== state ================== */
let stream = null, currentDeviceId = null;
let frameData = null;
let handLandmarker = null, runMode = null;
let skeletonLive = true;
let countdownTimer = null;
let isFrozen = false;

let currentView = 0; // 0=Top, 1=Right, 2=Left
let shots = { top:null, right:null, left:null }; // data URLs

/* ================== boot ================== */
(async function boot() {
  await initCameraLayer();
  wireUI();
  resize();
  requestAnimationFrame(loopLive);
  if (skeletonLive) await startSkeleton();
  updateViewUI();
  updateSkeletonUI();

  // Restore shots from previous session (either storage)
  const sTop   = getGripKV("mf:grip_view_top");
  const sRight = getGripKV("mf:grip_view_right");
  const sLeft  = getGripKV("mf:grip_view_left");
  if (sTop)   { shots.top   = sTop;   if (thumbTop)   thumbTop.src   = sTop; }
  if (sRight) { shots.right = sRight; if (thumbRight) thumbRight.src = sRight; }
  if (sLeft)  { shots.left  = sLeft;  if (thumbLeft)  thumbLeft.src  = sLeft; }
  updateClassifyEnabled();

  // ?fresh=1 clears old shots/results (optional)
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
  catch {
    if (startCamBtn) {
      startCamBtn.style.display="block";
      startCamBtn.onclick = async () => { try { await video.play(); startCamBtn.style.display="none"; } catch {} };
    }
  }
  const track = stream.getVideoTracks()[0]; const settings = track.getSettings?.() || {};
  currentDeviceId = settings.deviceId || deviceId || null; if (camName) camName.textContent = track.label || "Camera";
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
  if (timerBtn)   timerBtn.onclick = () => startCountdown(5);
  if (snapBtn)    snapBtn.onclick  = () => capture();
  if (acceptBtn)  acceptBtn.onclick= () => acceptShot();
  if (retakeBtn)  retakeBtn.onclick= () => {
    isFrozen=false; frameData=null;
    setText(stepPill, "Step: live");
    if (liveBtns)   liveBtns.style.display  = "flex";
    if (frozenBtns) frozenBtns.style.display= "none";
  };
  if (classifyBtn) classifyBtn.onclick = () => classifyGrip();
  if (toggleSkel)  toggleSkel.onclick  = async () => {
    skeletonLive = !skeletonLive;
    if (skeletonLive) await mp("VIDEO"); // ensure back to video mode
    updateSkeletonUI();
  };
  if (retakeAllBtn) retakeAllBtn.onclick = () => clearAllShots();

  document.addEventListener("keydown", (e) => {
    if (e.key === " ") { e.preventDefault(); if (!countdownTimer && !isFrozen) startCountdown(5); }
    if (e.key === "Escape") { retakeBtn?.click(); }
  });
}
function updateSkeletonUI(){
  setText(skelState, skeletonLive ? "Skeleton: On" : "Skeleton: Off");
  if (toggleSkel) toggleSkel.textContent = skeletonLive ? "Turn off skeleton" : "Turn on skeleton";
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

/* ================== loop ================== */
function resize(){ canvas.width=video.videoWidth||1280; canvas.height=video.videoHeight||720; }
function loopLive(){
  if (!isFrozen){ resize(); ctx.drawImage(video,0,0,canvas.width,canvas.height); if (skeletonLive) drawSkeletonLive(); }
  else if (frameData){ ctx.putImageData(frameData,0,0); /* optional frozen overlays */ }
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

// IMAGE detect but then switch back to VIDEO so live skeleton keeps working
async function getImageLandmarks(){
  try {
    await mp("IMAGE");
    const res = handLandmarker.detect(canvas);
    const lm = res?.landmarks?.[0] || null;
    if (skeletonLive) await mp("VIDEO"); // ensure back to video
    return lm;
  } catch {
    try { if (skeletonLive) await mp("VIDEO"); } catch {}
    return null;
  }
}

/* ================== Capture & accept ================== */
function startCountdown(seconds=5){
  if (!countdownEl) return;
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
  if (statusBadge) statusBadge.textContent = "Frozen";
  if (liveBtns)   liveBtns.style.display = "none";
  if (frozenBtns) frozenBtns.style.display = "flex";
  setText(stepPill, "Step: review");
}
function acceptShot(){
  const img = canvas.toDataURL("image/jpeg", 0.9);
  const vName = VIEWS[currentView].toLowerCase();
  // Update in-memory + thumbs
  if (vName === "top")   { shots.top   = img; if (thumbTop)   thumbTop.src   = img; }
  if (vName === "right") { shots.right = img; if (thumbRight) thumbRight.src = img; }
  if (vName === "left")  { shots.left  = img; if (thumbLeft)  thumbLeft.src  = img; }
  // Persist for both key families
  saveGripKV("mf:grip_view_" + vName, img);

  // Next view or ready to classify
  if (currentView < 2){
    currentView++;
    updateViewUI();
    isFrozen=false; frameData=null;
    setText(stepPill, "Step: live");
    if (liveBtns)   liveBtns.style.display = "flex";
    if (frozenBtns) frozenBtns.style.display = "none";
  }
  updateClassifyEnabled();
}

/* ============== Heuristic classification ================= */
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
  if (!lm) return { grip:"unknown", confidence:0.4 };
  const angIndex  = pipAngle(lm, 5, 6, 8);
  const angMiddle = pipAngle(lm, 9,10,12);
  const angRing   = pipAngle(lm,13,14,16);
  const angPinky  = pipAngle(lm,17,18,20);
  const avgIM = (angIndex + angMiddle)/2;
  const avgRP = (angRing + angPinky)/2;
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
function mapGripPreference(grip){
  const g = String(grip || "").toLowerCase().trim();
  if (g.includes("relaxed") && g.includes("claw")) return { grip: "claw", relaxed: true };
  if (g.includes("claw"))       return { grip: "claw", relaxed: false };
  if (g.includes("fingertip"))  return { grip: "fingertip", relaxed: false };
  if (g.includes("palm"))       return { grip: "palm", relaxed: false };
  return { grip: "", relaxed: false };
}

/* ================== Classify ================== */
async function classifyGrip(){
  // ----- sanity: need all 3 views -----
  const t0 = getGripKV("mf:grip_view_top");
  const r0 = getGripKV("mf:grip_view_right");
  const l0 = getGripKV("mf:grip_view_left");
  if (!t0 || !r0 || !l0){
    showToast("Capture Top, Right and Left first.");
    return;
  }
  setText(resultPill, "Result: analysing…");

  // ----- downscale to keep payload small -----
  async function downscale(dataUrl, maxW = 800){
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(dataUrl); // fall back
      img.src = dataUrl;
    });
  }
  const [top, right, left] = await Promise.all([downscale(t0), downscale(r0), downscale(l0)]);

  // ----- local heuristic (always compute) -----
  const lm = await getImageLandmarks();
  const localGuess = classifyFromLandmarks(lm);

  // ----- try backend -----
  const API_URL = '/api/grip'; // change to 'https://api.yoursite.com/grip' if different origin
  try {
    console.debug('POST', API_URL, { top: top.slice(0,64)+'…', right: right.slice(0,64)+'…', left: left.slice(0,64)+'…', local_guess: localGuess });

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      // if cross-origin with cookies: credentials:'include', and ensure CORS allows it
      body: JSON.stringify({ top, right, left, local_guess: localGuess }),
      // keepalive helps when navigating right after:
      keepalive: true
    });

    if (!res.ok) {
      const txt = await res.text().catch(()=> '');
      console.error('Grip API non-OK', res.status, txt);
      throw new Error(`Grip API ${res.status}: ${txt || 'no body'}`);
    }

    const data = await res.json(); // { grip, confidence }
    console.debug('Grip API OK', data);

    const finalGrip = String(data.grip || localGuess.grip || 'unknown').toLowerCase();
    const finalConf = Math.round(100 * (data.confidence ?? localGuess.confidence ?? 0.4));

    // persist (both key families)
    saveGripKV("mf:grip_result", JSON.stringify({ grip: finalGrip, confidence: finalConf/100 }));
    saveGripKV("mf:grip", finalGrip);
    saveGripKV("mf:grip_pref", JSON.stringify(mapGripPreference(finalGrip)));

    setText(resultPill, `Result: ${finalGrip} (${finalConf}%)`);
    if (gotoReport) gotoReport.style.display = "inline-block";
  } catch (err) {
    console.warn('Grip API failed — using local heuristic', err);

    const finalGrip = String(localGuess.grip || 'unknown').toLowerCase();
    const finalConf = Math.round(100 * (localGuess.confidence ?? 0.4));

    saveGripKV("mf:grip_result", JSON.stringify({ grip: finalGrip, confidence: finalConf/100 }));
    saveGripKV("mf:grip", finalGrip);
    saveGripKV("mf:grip_pref", JSON.stringify(mapGripPreference(finalGrip)));

    setText(resultPill, `Result: ${finalGrip} (${finalConf}%)`);
    if (gotoReport) gotoReport.style.display = "inline-block";

    // Optional: surface why it failed to you
    showToast("AI server not reachable — used local guess. See console for details.");
  }
}


/* ================== Clear / Retake All ================== */
function clearAllShots(){
  shots = { top:null, right:null, left:null };
  if (thumbTop)   thumbTop.src   = "";
  if (thumbRight) thumbRight.src = "";
  if (thumbLeft)  thumbLeft.src  = "";

  clearGripK([
    "mf:grip_view_top",
    "mf:grip_view_right",
    "mf:grip_view_left",
    "mf:grip_result",
    "mf:grip_pref",
    "mf:grip"
  ]);

  updateClassifyEnabled();
  if (gotoReport) gotoReport.style.display = "none";

  currentView = 0;
  updateViewUI();

  isFrozen = false; frameData = null;
  setText(stepPill, "Step: live");
  if (liveBtns)   liveBtns.style.display = "flex";
  if (frozenBtns) frozenBtns.style.display = "none";
  setText(resultPill, "Result: —");
}

/* ================== Misc ================== */
function showToast(msg, durationMs = 2200) {
  if (!toast) return console.log(msg);
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, durationMs);
}

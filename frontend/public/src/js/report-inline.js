document.getElementById('y').textContent = new Date().getFullYear();

/* ============================================================
   COMPAT SHIM: read either mousefit:* or mf:* keys and normalize
============================================================ */
function getFirst(keys){ for (const k of keys){ const v=localStorage.getItem(k) || sessionStorage.getItem(k); if(v!=null && v!=="") return v; } return null; }
function getJSON(keys){ const raw=getFirst(keys); if(!raw) return null; try{return JSON.parse(raw);}catch{return null;} }

function normalizeMeasure(m){
  if(!m) return {};
  const len_mm = m.len_mm ?? m.length_mm ?? (m.len_cm ? Math.round(Number(m.len_cm)*10) : undefined);
  const wid_mm = m.wid_mm ?? m.width_mm ?? (m.wid_cm ? Math.round(Number(m.wid_cm)*10) : undefined);
  const out = { ...m };
  if(len_mm!=null){ out.len_mm=Number(len_mm); out.len_cm=(Number(len_mm)/10).toFixed(1); }
  if(wid_mm!=null){ out.wid_mm=Number(wid_mm); out.wid_cm=(Number(wid_mm)/10).toFixed(1); }
  return out;
}

const MF = {
  measure: normalizeMeasure(getJSON(['mousefit:measure','mf:measure'])),
  recs:    getJSON(['mousefit:recs','mf:recs']) || {},
  snapshot:getFirst(['mousefit:snapshot','mf:snapshot']),
  grips: {
    top:   getFirst(['mousefit:grip_view_top','mf:grip_view_top']),
    right: getFirst(['mousefit:grip_view_right','mf:grip_view_right']),
    left:  getFirst(['mousefit:grip_view_left','mf:grip_view_left']),
    result:getJSON(['mousefit:grip_result','mf:grip_result']) || {}
  }
};

// Make global for the module script below
window.MF = MF;

/* ============================================================
   REVEAL / HIDE (blur by default with persistence)
============================================================ */
(function restoreRevealToggle(){
  const REVEAL_KEY = 'mousefit:revealed';
  const btn = document.getElementById('toggleReveal');
  if (!btn) return;

  const setReveal = (flag) => {
    document.body.setAttribute('data-revealed', flag ? 'true' : 'false');
    btn.textContent = flag ? 'Hide measurements' : 'Reveal measurements';
    try { localStorage.setItem(REVEAL_KEY, flag ? '1' : '0'); } catch {}
  };

  let initial = false;
  try { initial = localStorage.getItem(REVEAL_KEY) === '1'; } catch {}
  setReveal(initial);

  btn.addEventListener('click', () => {
    const current = document.body.getAttribute('data-revealed') === 'true';
    setReveal(!current);
  });
})();

/* ============================================================
   RENDER SNAPSHOT + NUMBERS + GRIP
============================================================ */
(function render(){
  // snapshot
  const img = document.getElementById('snapshot');
  if (MF.snapshot) img.src = MF.snapshot; else img.style.opacity = '0';

  // numbers
  const m = MF.measure || {};
  if (m.len_cm) document.getElementById('handLength').textContent = m.len_cm;
  if (m.wid_cm) document.getElementById('handWidth').textContent  = m.wid_cm;

  const rec = MF.recs || {};
  if (rec.size) document.getElementById('handSize').textContent = rec.size;
  let gripSuggestion = "";
  const size = rec.size;
  if (size === "small") gripSuggestion = "Claw often works well for small hands; palm can also be comfy.";
  else if (size === "medium") gripSuggestion = "Palm is versatile; try claw or fingertip based on preference.";
  else if (size === "large" || size === "xlarge") gripSuggestion = "Fingertip may feel natural; palm can still be comfortable.";
  else gripSuggestion = "Any grip style can work — pick what feels most natural.";
  document.getElementById('suggestedGrip').textContent = gripSuggestion;

  // thumbs
  if (MF.grips.top || MF.grips.right || MF.grips.left){
    const box = document.getElementById('gripThumbs'); box.style.display = 'flex';
    if (MF.grips.top)   document.getElementById('gripTop').src   = MF.grips.top;
    if (MF.grips.right) document.getElementById('gripRight').src = MF.grips.right;
    if (MF.grips.left)  document.getElementById('gripLeft').src  = MF.grips.left;
  }
  const r = MF.grips.result || {};
  const grip = (r.grip || r.local_guess?.grip || "").toLowerCase();
  const conf = Math.round(100 * (r.confidence ?? r.local_guess?.confidence ?? 0));
  if (grip) document.getElementById('gripPill').textContent = conf ? `Grip: ${grip} (${conf}%)` : `Grip: ${grip}`;
})();

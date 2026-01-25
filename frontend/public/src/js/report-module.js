import { loadMice as loadMiceApi } from "./mice-api.js";

const $status = document.getElementById("status");
const $p1 = document.getElementById("p1");
const $p2 = document.getElementById("p2");
const setStatus = (m)=>($status.textContent = m || "");

// ---- profile from page ----
function scrapeProfileFromPage(){
  const mmTextToMm = (txt) => {
    const t = String(txt||"").toLowerCase();
    let m = t.match(/(\d+(?:\.\d+)?)\s*mm\b/); if (m) return +m[1];
    m = t.match(/(\d+(?:\.\d+)?)\s*cm\b/); if (m) return Math.round(+m[1]*10);
    m = t.match(/(\d+(?:\.\d+)?)/); if (!m) return undefined;
    const v = +m[1]; return v>=30 ? v : Math.round(v*10);
  };

  const profile = {};
  try {
    const ms = window.MF?.measure;
    if (ms?.len_mm) profile.length_mm = +ms.len_mm;
    if (ms?.wid_mm) profile.width_mm  = +ms.wid_mm;
  } catch {}

  // Fallback to reading DOM if MF obj isn't perfect
  if (!profile.length_mm) profile.length_mm = mmTextToMm(document.getElementById("handLength")?.textContent);
  if (!profile.width_mm)  profile.width_mm  = mmTextToMm(document.getElementById("handWidth")?.textContent);

  const g = window.MF?.grips?.result?.grip;
  if (g) profile.grip = String(g).toLowerCase();

  return profile;
}

const profile = scrapeProfileFromPage();
let handLength = profile.length_mm || 180;
let handWidth  = profile.width_mm  || 90;

// ---- load mice from the backend API ----
async function loadMice(){
  try {
    const mice = await loadMiceApi();
    if (Array.isArray(mice) && mice.length) return mice;
  } catch (e) {
    console.warn("Mice API fetch failed", e);
  }
  // fallback to global if already loaded via another script
  return window.MICE || window.mice || [];
}

// ---- normalize mice ----
const toName = (m)=> m.name || [m.brand||m.make||m.maker||"", m.model||m.title||""].filter(Boolean).join(" ").trim() || "Unknown";
const getDims = (m)=>{
  let L = m.length ?? m.length_mm ?? m.L ?? m.dimL;
  let W = m.width  ?? m.width_mm  ?? m.W ?? m.dimW;
  let H = m.height ?? m.height_mm ?? m.H ?? m.dimH;
  if ((!L || !W || !H) && m.spec){
    const dm = String(m.spec).match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/);
    if (dm){ L=+dm[1]; W=+dm[2]; H=+dm[3]; }
  }
  return { L:+L||0, W:+W||0, H:+H||0 };
};
const getWeight = (m)=>{
  let g = m.weight ?? m.weight_g;
  if (!g && m.spec){
    const mw = String(m.spec).match(/(\d+(?:\.\d+)?)\s*g\b/i);
    if (mw) g = +mw[1];
  }
  return +g || 0;
};
const getShape = (m)=>{
  const s = (m.shape||m.type||"").toString().toLowerCase();
  if (s.includes("ergo")) return "ergonomic";
  if (s.includes("sym") || s.includes("ambi")) return "symmetrical";
  return s || "symmetrical";
};
const slug = (s)=> String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$|/g,"");

function normalize(m){
  const name = toName(m);
  const {L,W,H} = getDims(m);
  const weight = getWeight(m);
  const shape = getShape(m);
  const id = m.id || slug(name);
  return { id, name, length:L, width:W, height:H, weight, shape };
}

// ---- scoring (latest spec) ----
const idealRatio = { palm: 0.70, claw: 0.62, fingertip: 0.55 };
const weightBase = { palm: 65, claw: 65, fingertip: 45 };
const heavyKnee  = 81;

function collectFlags(ranked){
  const map = new Map();
  for (const r of ranked||[]){
    map.set(r.id, (Array.isArray(r.flags)? r.flags.map(x=>String(x).toLowerCase()) : []));
  }
  return map;
}
const hasAny = (flags, arr)=> arr.some(a=> flags.includes(a));

function gripSubscore(mouse, grip){
  const Lm = mouse.length||0;
  const target = idealRatio[grip] * handLength;
  const diffMM = Math.abs(Lm - target);
  return Math.max(0, 100 - diffMM);
}

function weightSubscore(mouse, grip){
  const w = mouse.weight||0;
  const base = weightBase[grip];
  if (!w) return 60;
  if (w <= base) return 100;
  const over = w - base;
  const slope = (grip==="fingertip") ? 2.0 : (grip==="claw" ? 1.4 : 1.0);
  let penalty = over * slope;
  if (w > heavyKnee){
    const extra = w - heavyKnee;
    const extraSlope = (grip==="fingertip") ? 2.5 : (grip==="claw" ? 1.5 : 1.0);
    penalty += extra * extraSlope;
  }
  return Math.max(0, 100 - penalty);
}

function humpSubscore(mouse, grip, flags){
  const H = mouse.height||0;
  let s = 70;
  const f = flags || [];

  const highHumpKeys = ["high_hump","tall_hump","large_hump","huge_hump"];
  const rearHumpKeys = ["rear_hump","back_hump","rear-biased","back-biased"];
  const inclinedKeys = ["inclined_side","angled_side","tilted_side"];

  const hasHigh = (f || []).some(x => highHumpKeys.includes(x));
  const hasRear = (f || []).some(x => rearHumpKeys.includes(x));

  if (grip === "palm") {
    if (H <= 40) s -= 20;
  } else if (grip==="claw"){
        if (H >= 36 && H <= 42) s += 15;
        if (H >= 42) s -= 30;
        if (hasHigh) s += 15;
        if (hasRear) s += 12;
        if (hasAny(f, inclinedKeys)) s += 3;
  } else { // fingertip
    if (H >= 40) s -= 30;
    if (H <= 36) s += 10;
    if (hasHigh) s -= 15;
    if (hasRear) s -= 8;
  }
  return Math.max(0, Math.min(100, s));
}

function shapePenalty(mouse, grip){
  if (grip!=="fingertip") return 0;
  return (mouse.shape==="ergonomic") ? -50 : 0;
}

function extraBonus(flags, grip){
  if (grip!=="claw") return 0;
  const inclinedKeys = ["inclined_side","angled_side","tilted_side"];
  return hasAny(flags||[], inclinedKeys) ? 3 : 0;
}

function overallScore(mouse, grip, flags){
  const gripS   = gripSubscore(mouse, grip);
  const weightS = weightSubscore(mouse, grip);
  const humpS   = humpSubscore(mouse, grip, flags);
  let total = 0.40*gripS + 0.20*weightS + 0.40*humpS;
  total += shapePenalty(mouse, grip);
  total += extraBonus(flags, grip);
  return Math.max(0, total);
}

async function fetchFlags(mice){
  try{
    const candidates = mice.map(m=>({ id:m.id, brand:"", model:m.name }));
    const body = { profile: { grip: profile.grip||null, length_mm: handLength, width_mm: handWidth }, candidates };
    const r = await fetch("/api/rerank", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "rerank failed");
    return collectFlags(data.ranked||[]);
  }catch(e){
    console.warn("RAG flags unavailable:", e.message||e);
    return new Map();
  }
}

function chipClass(grip){ return grip==="palm"?"bg-palm":grip==="claw"?"bg-claw":"bg-tip"; }
function renderGrid(el, items, grip){
  el.innerHTML = "";
  if(!items.length) { el.innerHTML = `<div style="grid-column:1/-1; opacity:0.6;">No matches found.</div>`; return; }
  items.forEach((it, idx)=>{
    const div = document.createElement("div");
    div.className = `chip ${chipClass(grip)} ${idx===0?"best":""}`;
    const shapeName = it.shape ? it.shape.charAt(0).toUpperCase()+it.shape.slice(1) : "N/A";
    div.innerHTML = `
      <div class="pct">${Math.round(it.score)}%</div>
      <div>${it.name}</div>
      <div class="meta">Weight: ${it.weight||"?"} g, Shape: ${shapeName}</div>
    `;
    el.appendChild(div);
  });
}

function sanitizeReport(text){
  const [a0="", b0=""] = (text||"").trim().split(/\n\s*\n/);
  const strip = s => s.split(/\n+/).filter(line=>
    !/\b(hand|palm)\s*(length|width|size)\b/i.test(line) &&
    !/\b(colorway|colorways|color|edition)\b/i.test(line)
  ).join("\n");
  return [strip(a0).trim(), strip(b0).trim()];
}

async function generateReport(){
  try{
    setStatus("Loading mice…");
    const baseRaw = await loadMice();
    const mice = baseRaw.map(normalize).filter(m=> m.length && m.width && m.height);
    if (!mice.length){ setStatus("No mice with dimensions found. Check mice.js"); return; }

    setStatus("Reading flags…");
    const flagMap = await fetchFlags(mice);

    setStatus("Scoring…");
    const grips = ["palm","claw","fingertip"];
    const results = {};
    for (const g of grips){
      const list = mice.map(m=>{
        const flags = flagMap.get(m.id) || [];
        return { ...m, flags, score: overallScore(m, g, flags) };
      }).sort((a,b)=> (b.score - a.score)).slice(0, 12);
      results[g] = list;
    }

    renderGrid(document.getElementById("grid-palm"), results.palm, "palm");
    renderGrid(document.getElementById("grid-claw"), results.claw, "claw");
    renderGrid(document.getElementById("grid-tip"),  results.fingertip, "fingertip");

    // Two-paragraph summary
    setStatus("Summarizing…");
    try{
      const body = { profile, candidates: mice.map(({id,name})=>({id,brand:"",model:name})) };
      const r = await fetch("/api/report",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
      if(r.ok) {
           const data = await r.json();
           const [a,b] = sanitizeReport(data.report||"");
           $p1.textContent = a; $p2.textContent = b;
      } else {
           // Fallback text if API fails or isn't set up
           $p1.textContent = "Analysis complete. Review the ranked lists below for your best mouse options.";
      }
      setStatus("");
    }catch(e){
      $p1.textContent = "Analysis complete.";
      setStatus("");
    }
  } catch (e) {
    console.error(e);
    setStatus(String(e?.message||e||"Error"));
  }
}

// Wire up buttons
document.getElementById("btn-generate")?.addEventListener("click", generateReport);
document.getElementById("btn-copy")?.addEventListener("click", async ()=>{
  const t = [$p1.textContent.trim(), $p2.textContent.trim()].filter(Boolean).join("\n\n");
  try{ await navigator.clipboard.writeText(t); setStatus("Copied."); setTimeout(()=>setStatus(""),1200);}catch{ setStatus("Copy failed."); }
});

// Auto-run on load
generateReport();

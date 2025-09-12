// public/js/report.js
let MICE = [];
try {
  const mod = await import("/js/mice.js");
  MICE = mod.MICE || mod.default || [];
} catch { console.warn("mice.js not found"); }

const profile = {
  length_mm: Number(sessionStorage.getItem("mf:length_mm") || 0),
  width_mm:  Number(sessionStorage.getItem("mf:width_mm")  || 0),
  grip:      sessionStorage.getItem("mf:grip") || null,
  wireless:  null,
  budget:    null
};

function score(m,p){
  const len=Number(m.length_mm||0), wid=Number(m.width_mm||0), wt=Number(m.weight_g||0);
  const shp=(m.shape||"").toLowerCase(), wr=(m.wireless||"").toLowerCase();
  let s=0;
  if(p.length_mm&&len) s+=Math.max(0,40-Math.abs(p.length_mm-len));
  if(p.width_mm&&wid)  s+=Math.max(0,35-Math.abs(p.width_mm-wid));
  if(p.grip==="fingertip" && wt && wt<=60) s+=12;
  if(p.grip==="claw" && shp.includes("sym")) s+=10;
  if(p.grip==="palm" && shp.includes("ergo")) s+=10;
  if(p.wireless===true && /wireless|2\.4|bluetooth/.test(wr)) s+=6;
  return s;
}
function shortlist(p,k=8){
  return (MICE||[]).map(m=>({m,s:score(m,p)})).sort((a,b)=>b.s-a.s).slice(0,k).map(x=>x.m);
}
let candidates = shortlist(profile, 8);

const listEl = document.getElementById("candidateList");
function idKey(c){ return `${(c.brand||"").toLowerCase()}_${(c.model||"").toLowerCase().replace(/\s+/g,'_').replace(/[^\w_]/g,"")}`; }

function render(list, title="Matching Models"){
  listEl.innerHTML = `<h3>${title}</h3><ol>` + list.map(c=>{
    const brand=c.brand||"", model=c.model||"", len=c.length_mm??"?", wid=c.width_mm??"?", ht=c.height_mm??"?";
    const wt=c.weight_g??"?", shape=c.shape??"", conn=c.wireless??"";
    const reason = c._ai?.reason ? ` — <em>${c._ai.reason}</em>` : "";
    return `<li><strong>${brand} ${model}</strong> — ${len}×${wid}×${ht} mm, ${wt} g, ${shape}, ${conn}${reason}</li>`;
  }).join("") + `</ol>`;
}
render(candidates);

// AI re-rank
async function aiReRank(){
  const payload = candidates.map(c=>({
    id:idKey(c), brand:c.brand, model:c.model,
    length_mm:c.length_mm, width_mm:c.width_mm, height_mm:c.height_mm,
    weight_g:c.weight_g, shape:c.shape, wireless:c.wireless, price_usd:c.price_usd
  }));
  const r = await fetch("/api/rerank", {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ profile, candidates: payload })
  });
  const data = await r.json();
  if(!r.ok) throw new Error(data.error||"rerank failed");

  const map = new Map(candidates.map(c=>[idKey(c), c]));
  const newOrder = data.ranked.map(r=>{ const c=map.get(r.id); if(c){ c._ai=r; return c; } }).filter(Boolean);
  if (newOrder.length) { candidates = newOrder; render(candidates, "Matching Models (AI-refined)"); }
}
document.getElementById("rerankBtn")?.addEventListener("click", async ()=>{
  try { await aiReRank(); } catch(e){ alert(e.message); }
});

// Two-paragraph report
document.getElementById("reportBtn")?.addEventListener("click", async ()=>{
  const aiEl = document.getElementById("aiReport");
  aiEl.textContent = "Generating…";
  const payload = candidates.map(c=>({ id:idKey(c), brand:c.brand, model:c.model }));
  const r = await fetch("/api/report", {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ profile, candidates: payload })
  });
  const data = await r.json();
  aiEl.textContent = r.ok ? data.report : `Error: ${data.error || "failed"}`;
});

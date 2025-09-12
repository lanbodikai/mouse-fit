import fs from "fs";
import path from "path";
import { pipeline } from "@xenova/transformers";

const EFILE = path.resolve("server/rag/embeddings.json");
export const DOCS = fs.existsSync(EFILE) ? JSON.parse(fs.readFileSync(EFILE,"utf-8")) : [];

const embedderPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

function meanPool(t){const a=t.data,[n,d]=t.dims,o=new Float32Array(d);for(let i=0;i<n;i++)for(let j=0;j<d;j++)o[j]+=a[i*d+j];for(let j=0;j<d;j++)o[j]/=n;return Array.from(o)}
function cos(a,b){let dot=0,na=0,nb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i]}return dot/(Math.sqrt(na)*Math.sqrt(nb)+1e-9)}

function hardFilter(d,p){
  const m=d.meta||{};
  if (p.shape && !String(m.shape).toLowerCase().includes(p.shape)) return false;
  if (p.wireless===true && !/wireless|2\.4|bluetooth/i.test(String(m.wireless))) return false;
  if (p.wireless===false && /wireless|bluetooth/i.test(String(m.wireless))) return false;
  if (p.targetWeight?.max && m.weight_g && m.weight_g>p.targetWeight.max) return false;
  return true;
}

export async function retrieve(text, prefs={}, k=8){
  if (!DOCS.length) return [];
  const emb = await embedderPromise;
  const q = await emb(text||"", { pooling: "mean", normalize: true });
  const qv = meanPool(q);
  return DOCS
    .filter(d=>hardFilter(d,prefs))
    .map(d=>({ d, sim: cos(qv,d.vector) }))
    .sort((a,b)=>b.sim-a.sim).slice(0,k)
    .map(x=>({ id:x.d.id, text:x.d.text, meta:x.d.meta, score:x.sim }));
}

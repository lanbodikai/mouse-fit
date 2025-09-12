import fs from "fs";
import path from "path";
import { pipeline } from "@xenova/transformers";

const miceModule = await import(path.resolve("public/mice.js")).catch(() => ({}));
const MICE = miceModule.MICE || miceModule.default || [];

const SRC_DIR = path.resolve("server/rag/sources");
fs.mkdirSync(SRC_DIR, { recursive: true });
const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith(".md"));

const read = (p) => fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : "";

const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
const docs = [];

function keyFor(m) {
  return `${(m.brand||"").toLowerCase()}_${(m.model||"").toLowerCase().replace(/\s+/g,"_").replace(/[^\w_]/g,"")}`;
}
function meanPool(t) {
  const arr = t.data, [tokens, dim] = t.dims;
  const out = new Float32Array(dim);
  for (let i=0;i<tokens;i++) for (let j=0;j<dim;j++) out[j]+=arr[i*dim+j];
  for (let j=0;j<dim;j++) out[j]/=tokens;
  return Array.from(out);
}

for (const m of MICE) {
  const id = keyFor(m);
  const mdPath = path.join(SRC_DIR, `${id}.md`);
  const spec = `${m.brand} ${m.model} — ${m.length_mm}×${m.width_mm}×${m.height_mm} mm, ${m.weight_g} g, ${m.shape}, ${m.wireless}`;
  const colorways = Array.isArray(m.colorways) ? m.colorways.join(", ") : (m.colorways || "");
  const txt = [
    `MODEL: ${m.brand} ${m.model}`,
    `COMPANY: ${m.brand}`,
    `COLORWAYS: ${colorways}`,
    `SPECS: ${spec}`,
    read(mdPath)
  ].filter(Boolean).join("\n\n");
  const em = await embedder(txt, { pooling: "mean", normalize: true });
  docs.push({ id, text: txt, meta: m, vector: meanPool(em) });
}

fs.mkdirSync(path.resolve("server/rag"), { recursive: true });
fs.writeFileSync(path.resolve("server/rag/embeddings.json"), JSON.stringify(docs));
console.log("Wrote server/rag/embeddings.json with", docs.length, "docs");

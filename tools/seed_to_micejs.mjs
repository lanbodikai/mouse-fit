// tools/seed_to_micejs.mjs
import fs from "node:fs";

const inPath = process.argv[2]; // mice_seed.csv or mice_seed.json
const outPath = process.argv[3] || "mice.js";

function csvToRows(csv){
  const lines = csv.trim().split(/\r?\n/);
  const head = lines.shift().split(",").map(s=>s.trim());
  return lines.map(line=>{
    const cells = line.split(",").map(s=>s.trim());
    const row = {};
    head.forEach((h,i)=> row[h] = cells[i]);
    return row;
  });
}

function normalize(row){
  const n = s => s===""||s==null ? null : Number(s);
  return {
    brand: row.brand || row.Brand || "",
    model: row.model || row.Model || "",
    length_mm: n(row.length_mm || row.Length),
    width_mm:  n(row.width_mm  || row.Width),
    height_mm: n(row.height_mm || row.Height),
    weight_g:  n(row.weight_g  || row.Weight_g),
    shape: (row.shape || row.Shape || "").toLowerCase() || "symmetrical",
    hump:  (row.hump  || row.Hump  || "").toLowerCase() || "",
    tags: (row.tags || row.Tags || "").split("|").map(x=>x.trim()).filter(Boolean),
    product_url: row.product_url || "",
    image_url:   row.image_url   || ""
  };
}

const input = fs.readFileSync(inPath, "utf8");
let rows;
if (inPath.toLowerCase().endsWith(".json")) {
  rows = JSON.parse(input);
} else {
  rows = csvToRows(input);
}
const mice = rows.map(normalize).filter(m => m.brand && m.model);

const code = `// AUTO-GENERATED. Do not edit by hand.
export const MICE = ${JSON.stringify(mice, null, 2)};
`;

fs.writeFileSync(outPath, code, "utf8");
console.log(`Wrote ${mice.length} mice to ${outPath}`);

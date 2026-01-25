// Sync the legacy frontend dataset (frontend/public/src/js/mice.js) into backend/data/mice.json
// so the backend becomes the source of truth.

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..", "..");
const frontendMicePath = path.join(repoRoot, "frontend", "public", "src", "js", "mice.js");
const backendMiceJsonPath = path.join(repoRoot, "backend", "data", "mice.json");

async function main() {
  if (!fs.existsSync(frontendMicePath)) {
    throw new Error(`Frontend mice dataset not found: ${frontendMicePath}`);
  }

  const mod = await import(pathToFileURL(frontendMicePath).toString());
  const mice = Array.isArray(mod.MICE) ? mod.MICE : [];

  const out = mice.map((m) => ({
    brand: m.brand || "",
    model: m.model || "",
    variant: null,
    length_mm: Number(m.length_mm ?? 0) || null,
    width_mm: Number(m.width_mm ?? 0) || null,
    height_mm: Number(m.height_mm ?? 0) || null,
    weight_g: Number(m.weight_g ?? 0) || null,
    shape: m.shape || null,
    hump: m.hump || null,
    grips: [],
    hands: [],
    product_url: null,
    image_url: null,
  }));

  fs.writeFileSync(backendMiceJsonPath, JSON.stringify(out, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${out.length} mice -> ${backendMiceJsonPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { BufferGeometry, Matrix4, Mesh, Vector3 } from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..", "..");
const mappingPath = join(projectRoot, "backend", "data", "findmymouse-model-map.json");
const databasePath = join(projectRoot, "backend", "data", "mousefit.db");
const outputDir = join(projectRoot, "frontend", "public", "models", "mice", "sources", "findmymouse");
const sourceBaseUrl = "https://findmymouse.com";
const userAgent = "MouseFit FindMyMouse importer (authorized source use)";
const force = process.argv.includes("--force");
const meshFileNames = new Map([
  ["gpx2-superstrike", "GPX2%20Superstrike"],
  ["gpx2c", "GPX2C"],
]);

function jacobiEigenvectors(covariance) {
  const a = covariance.map((row) => [...row]);
  const vectors = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  for (let iteration = 0; iteration < 50; iteration += 1) {
    let p = 0;
    let q = 1;
    for (const [left, right] of [[0, 1], [0, 2], [1, 2]]) {
      if (Math.abs(a[left][right]) > Math.abs(a[p][q])) {
        p = left;
        q = right;
      }
    }
    if (Math.abs(a[p][q]) < 1e-10) break;

    const angle = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];

    for (let k = 0; k < 3; k += 1) {
      if (k === p || k === q) continue;
      const akp = a[k][p];
      const akq = a[k][q];
      a[k][p] = a[p][k] = cosine * akp - sine * akq;
      a[k][q] = a[q][k] = sine * akp + cosine * akq;
    }
    a[p][p] = cosine ** 2 * app - 2 * sine * cosine * apq + sine ** 2 * aqq;
    a[q][q] = sine ** 2 * app + 2 * sine * cosine * apq + cosine ** 2 * aqq;
    a[p][q] = a[q][p] = 0;

    for (let k = 0; k < 3; k += 1) {
      const vkp = vectors[k][p];
      const vkq = vectors[k][q];
      vectors[k][p] = cosine * vkp - sine * vkq;
      vectors[k][q] = sine * vkp + cosine * vkq;
    }
  }

  return [0, 1, 2]
    .map((index) => ({
      value: a[index][index],
      axis: new Vector3(vectors[0][index], vectors[1][index], vectors[2][index]).normalize(),
    }))
    .sort((left, right) => right.value - left.value);
}

function projectionRange(position, center, axis) {
  let minimum = Infinity;
  let maximum = -Infinity;
  for (let index = 0; index < position.count; index += 1) {
    const value =
      (position.getX(index) - center.x) * axis.x +
      (position.getY(index) - center.y) * axis.y +
      (position.getZ(index) - center.z) * axis.z;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  return { minimum, maximum, size: maximum - minimum };
}

function countNearExtremes(position, center, axis, range, bandMm = 1) {
  let nearMinimum = 0;
  let nearMaximum = 0;
  for (let index = 0; index < position.count; index += 1) {
    const value =
      (position.getX(index) - center.x) * axis.x +
      (position.getY(index) - center.y) * axis.y +
      (position.getZ(index) - center.z) * axis.z;
    if (value <= range.minimum + bandMm) nearMinimum += 1;
    if (value >= range.maximum - bandMm) nearMaximum += 1;
  }
  return { nearMinimum, nearMaximum };
}

function orientMouseGeometry(sourceGeometry) {
  const geometry = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
  const position = geometry.getAttribute("position");
  if (!position || position.count < 3) throw new Error("PLY has no usable vertex positions.");

  const center = new Vector3();
  for (let index = 0; index < position.count; index += 1) {
    center.x += position.getX(index);
    center.y += position.getY(index);
    center.z += position.getZ(index);
  }
  center.multiplyScalar(1 / position.count);

  const covariance = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let index = 0; index < position.count; index += 1) {
    const values = [
      position.getX(index) - center.x,
      position.getY(index) - center.y,
      position.getZ(index) - center.z,
    ];
    for (let row = 0; row < 3; row += 1) {
      for (let column = row; column < 3; column += 1) {
        covariance[row][column] += values[row] * values[column];
      }
    }
  }
  for (let row = 0; row < 3; row += 1) {
    for (let column = row; column < 3; column += 1) {
      covariance[row][column] /= position.count;
      covariance[column][row] = covariance[row][column];
    }
  }

  const eigenvectors = jacobiEigenvectors(covariance);
  const lengthAxis = eigenvectors[0].axis;
  const widthAxis = eigenvectors[1].axis;
  const heightAxis = eigenvectors[2].axis;

  const heightRange = projectionRange(position, center, heightAxis);
  const heightEnds = countNearExtremes(position, center, heightAxis, heightRange);
  if (heightEnds.nearMaximum > heightEnds.nearMinimum) heightAxis.negate();

  const handedness = new Vector3().crossVectors(widthAxis, lengthAxis).dot(heightAxis);
  if (handedness < 0) widthAxis.negate();

  const transform = new Matrix4().set(
    widthAxis.x, widthAxis.y, widthAxis.z, -center.dot(widthAxis),
    lengthAxis.x, lengthAxis.y, lengthAxis.z, -center.dot(lengthAxis),
    heightAxis.x, heightAxis.y, heightAxis.z, -center.dot(heightAxis),
    0, 0, 0, 1,
  );
  geometry.applyMatrix4(transform);
  geometry.deleteAttribute("uv");
  geometry.deleteAttribute("color");
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const size = geometry.boundingBox.getSize(new Vector3());
  if (!(size.y > size.x && size.x > size.z && size.y < 250 && size.z > 20)) {
    throw new Error(`Unexpected normalized bounds ${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)} mm.`);
  }
  return { geometry, size };
}

async function downloadMesh(configId) {
  const destination = join(outputDir, `${configId}.stl`);
  if (!force) {
    try {
      const existing = await readFile(destination);
      if (existing.length > 84) return { destination, bytes: existing };
    } catch {
      // Download missing files.
    }
  }

  const sourceUrl = `${sourceBaseUrl}/meshes/${meshFileNames.get(configId) ?? configId}.ply`;
  const response = await fetch(sourceUrl, {
    headers: { "User-Agent": userAgent, Referer: `${sourceBaseUrl}/compare` },
  });
  if (!response.ok) throw new Error(`${sourceUrl} returned HTTP ${response.status}.`);
  const source = await response.arrayBuffer();
  const parsed = new PLYLoader().parse(source);
  const { geometry, size } = orientMouseGeometry(parsed);
  const exported = new STLExporter().parse(new Mesh(geometry), { binary: true });
  const bytes = Buffer.from(exported.buffer, exported.byteOffset, exported.byteLength);
  await writeFile(destination, bytes);
  console.log(`[mesh] ${configId}: ${size.y.toFixed(1)}×${size.x.toFixed(1)}×${size.z.toFixed(1)} mm, ${bytes.length.toLocaleString()} bytes`);
  return { destination, bytes };
}

function ensureAssetSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS mouse_model_assets (
      id INTEGER PRIMARY KEY,
      mouse_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      asset_url TEXT,
      local_path TEXT,
      file_format TEXT,
      license TEXT,
      status TEXT NOT NULL,
      sha256 TEXT,
      bytes INTEGER,
      length_mm REAL,
      width_mm REAL,
      height_mm REAL,
      notes TEXT NOT NULL DEFAULT '',
      discovered_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(mouse_id, source_url)
    );
    CREATE INDEX IF NOT EXISTS mouse_model_assets_mouse_id_idx ON mouse_model_assets(mouse_id);
    CREATE INDEX IF NOT EXISTS mouse_model_assets_status_idx ON mouse_model_assets(status);
  `);
  const columns = new Set(
    database.prepare("PRAGMA table_info(mouse_model_assets)").all().map((row) => row.name),
  );
  for (const column of ["length_mm", "width_mm", "height_mm"]) {
    if (!columns.has(column)) database.exec(`ALTER TABLE mouse_model_assets ADD COLUMN ${column} REAL`);
  }
}

async function main() {
  const mapping = JSON.parse(await readFile(mappingPath, "utf8"));
  const matches = mapping.matches.filter((match) => match.config_id);
  const configIds = [...new Set(matches.map((match) => match.config_id))].sort();
  await mkdir(outputDir, { recursive: true });

  const files = new Map();
  for (const configId of configIds) files.set(configId, await downloadMesh(configId));

  const database = new DatabaseSync(databasePath);
  ensureAssetSchema(database);
  const mouseExists = database.prepare("SELECT 1 FROM mice WHERE id = ?");
  const upsertAsset = database.prepare(`
    INSERT INTO mouse_model_assets (
      mouse_id, source_name, source_url, asset_url, local_path, file_format,
      license, status, sha256, bytes, length_mm, width_mm, height_mm,
      notes, discovered_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(mouse_id, source_url) DO UPDATE SET
      asset_url=excluded.asset_url,
      local_path=excluded.local_path,
      file_format=excluded.file_format,
      license=excluded.license,
      status=excluded.status,
      sha256=excluded.sha256,
      bytes=excluded.bytes,
      length_mm=excluded.length_mm,
      width_mm=excluded.width_mm,
      height_mm=excluded.height_mm,
      notes=excluded.notes,
      updated_at=excluded.updated_at
  `);
  const now = new Date().toISOString();

  database.exec("BEGIN IMMEDIATE");
  try {
    for (const match of matches) {
      if (!mouseExists.get(match.mouse_id)) throw new Error(`Unknown local mouse id: ${match.mouse_id}`);
      const file = files.get(match.config_id);
      const relativePath = relative(projectRoot, file.destination).replaceAll("\\", "/");
      const publicUrl = `/${relativePath.replace(/^frontend\/public\//, "")}`;
      const digest = createHash("sha256").update(file.bytes).digest("hex");
      const sourceUrl = `${sourceBaseUrl}/mouse/${match.site_mouse_id}`;
      let notes = "FindMyMouse scan normalized by PCA and converted from binary PLY to binary STL.";
      if (match.relationship === "same_shape") {
        notes = `FindMyMouse explicitly marks this catalog entry as the same shape as ${match.config_id}. PLY scan normalized by PCA and converted to binary STL.`;
      } else if (match.relationship === "variant_alias") {
        notes = `Local color, edition, or connectivity variant mapped to the matching FindMyMouse shell scan ${match.config_id}. PLY scan normalized by PCA and converted to binary STL.`;
      }
      upsertAsset.run(
        match.mouse_id,
        "FindMyMouse",
        sourceUrl,
        publicUrl,
        relativePath,
        "stl",
        mapping.permission,
        "ready",
        digest,
        file.bytes.length,
        ...match.dimensions_mm,
        notes,
        now,
        now,
      );
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  } finally {
    database.close();
  }

  console.log(`Imported ${configIds.length} unique FindMyMouse scans for ${matches.length} local mouse records.`);
}

await main();

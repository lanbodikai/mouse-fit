import type { MouseModelManifest, MouseModelManifestEntry } from "../types";

const MANIFEST_URL = "/models/mice/manifest.json";
const MAX_MOUSE_DIMENSION_MM = 250;

function isTuple(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === "number");
}

function hasPlausibleDimensions(value: MouseModelManifestEntry["dimensionsMm"] | undefined): boolean {
  if (!value) return false;
  return [value.lengthMm, value.widthMm, value.heightMm].every(
    (dimension) =>
      typeof dimension === "number" &&
      Number.isFinite(dimension) &&
      dimension > 0 &&
      dimension <= MAX_MOUSE_DIMENSION_MM,
  );
}

function isModelEntry(value: unknown): value is MouseModelManifestEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<MouseModelManifestEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.brand === "string" &&
    typeof entry.name === "string" &&
    typeof entry.assetUrl === "string" &&
    entry.assetUrl.startsWith("/models/mice/") &&
    (entry.assetFormat === undefined || entry.assetFormat === "glb" || entry.assetFormat === "gltf" || entry.assetFormat === "stl") &&
    typeof entry.sourceUrl === "string" &&
    Boolean(entry.transform) &&
    isTuple(entry.transform?.scale) &&
    isTuple(entry.transform?.rotation) &&
    isTuple(entry.transform?.position) &&
    hasPlausibleDimensions(entry.dimensionsMm)
  );
}

export async function loadMouseModelManifest(): Promise<MouseModelManifest> {
  const response = await fetch(MANIFEST_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("The mouse model manifest could not be loaded.");
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new Error("The mouse model manifest is invalid.");
  const manifest = payload as Partial<MouseModelManifest>;
  return {
    version: typeof manifest.version === "number" ? manifest.version : 1,
    source: typeof manifest.source === "string" ? manifest.source : "Imported mouse models",
    generatedAt: typeof manifest.generatedAt === "string" ? manifest.generatedAt : null,
    models: Array.isArray(manifest.models) ? manifest.models.filter(isModelEntry) : [],
    failures: Array.isArray(manifest.failures) ? manifest.failures : [],
  };
}

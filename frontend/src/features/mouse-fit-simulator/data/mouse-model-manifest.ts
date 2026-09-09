import type { MouseModelManifest, MouseModelManifestEntry } from "../types";
import type { Mouse } from "@/types/api";
import { getMice } from "@/services/api";

const MANIFEST_URL = "/models/mice/manifest.json";
const MAX_MOUSE_DIMENSION_MM = 250;

function isTuple(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

function hasPlausibleDimensions(
  value: MouseModelManifestEntry["dimensionsMm"] | undefined,
): boolean {
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
    (entry.assetFormat === undefined ||
      entry.assetFormat === "glb" ||
      entry.assetFormat === "gltf" ||
      entry.assetFormat === "stl") &&
    typeof entry.sourceUrl === "string" &&
    Boolean(entry.transform) &&
    isTuple(entry.transform?.scale) &&
    isTuple(entry.transform?.rotation) &&
    isTuple(entry.transform?.position) &&
    hasPlausibleDimensions(entry.dimensionsMm)
  );
}

const catalogKey = (brand: string, model: string) =>
  `${brand}|${model}`.toLowerCase().replace(/[^a-z0-9|]/g, "");

// The asset library is not a product catalog. Only exact catalog identities may
// select a model; fuzzy matching can resurrect a removed product or variant.
export function reconcileMouseModels(
  models: MouseModelManifestEntry[],
  catalog: Mouse[],
): MouseModelManifestEntry[] {
  const byName = new Map(
    models.map((model) => [catalogKey(model.brand, model.name), model]),
  );
  const byHandle = new Map(
    models
      .filter((model) => model.sourceHandle)
      .map((model) => [model.sourceHandle, model]),
  );
  const seen = new Set<string>();
  return catalog
    .flatMap((mouse) => {
      const identity = catalogKey(mouse.brand, mouse.model);
      const model =
        (mouse.source_handle ? byHandle.get(mouse.source_handle) : undefined) ??
        byName.get(catalogKey(mouse.brand, mouse.model));
      if (!model || seen.has(identity)) return [];
      const dimensionsMm = {
        lengthMm: mouse.length_mm ?? null,
        widthMm: mouse.width_mm ?? null,
        heightMm: mouse.height_mm ?? null,
      };
      if (!hasPlausibleDimensions(dimensionsMm)) return [];
      seen.add(identity);
      return [
        {
          ...model,
          id: mouse.id,
          brand: mouse.brand,
          name: mouse.model,
          shape: mouse.shape ?? model.shape,
          dimensionsMm,
        },
      ];
    })
    .sort((a, b) =>
      `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`),
    );
}

export async function loadMouseModelManifest(): Promise<MouseModelManifest> {
  const [response, catalog] = await Promise.all([
    fetch(MANIFEST_URL, { cache: "no-store" }),
    getMice(),
  ]);
  if (!Array.isArray(catalog))
    throw new Error("The mouse catalog could not be loaded.");
  if (!response.ok)
    throw new Error("The mouse model manifest could not be loaded.");
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object")
    throw new Error("The mouse model manifest is invalid.");
  const manifest = payload as Partial<MouseModelManifest>;
  return {
    version: typeof manifest.version === "number" ? manifest.version : 1,
    source:
      typeof manifest.source === "string"
        ? manifest.source
        : "Imported mouse models",
    generatedAt:
      typeof manifest.generatedAt === "string" ? manifest.generatedAt : null,
    models: reconcileMouseModels(
      Array.isArray(manifest.models)
        ? manifest.models.filter(isModelEntry)
        : [],
      catalog,
    ),
    failures: Array.isArray(manifest.failures) ? manifest.failures : [],
  };
}

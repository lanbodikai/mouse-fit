// Shared loader for the mice dataset from the backend API.
// This replaces bundling a large mice list into the frontend bundle.

import { apiJson } from "./api-client.js";

export async function loadMice() {
  const data = await apiJson("/api/mice", { credentials: "omit" });
  const mice = Array.isArray(data) ? data : [];

  // Normalize backend -> legacy front-end shape used by existing JS tools.
  const normalized = mice.map((m) => ({
    id: m.id || `${m.brand || ""}-${m.model || ""}`,
    brand: m.brand || "",
    model: m.model || "",
    length_mm: Number(m.length_mm ?? 0) || 0,
    width_mm: Number(m.width_mm ?? 0) || 0,
    height_mm: Number(m.height_mm ?? 0) || 0,
    weight_g: Number(m.weight_g ?? 0) || 0,
    shape: m.shape || "",
    hump: m.hump || "",
    // Optional/legacy fields
    tags: m.tags || [],
  }));

  if (typeof window !== "undefined") {
    // Provide a global for older code paths.
    window.MICE = normalized;
  }

  return normalized;
}

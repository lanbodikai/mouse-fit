// Shared loader for the mice dataset from the backend API.
// This replaces bundling a large mice list into the frontend bundle.

function apiBase() {
  // `window.__MOUSEFIT_API_BASE__` is injected by Next.js layout.tsx.
  if (typeof window !== "undefined" && window.__MOUSEFIT_API_BASE__) {
    return String(window.__MOUSEFIT_API_BASE__);
  }
  return "http://localhost:8000";
}

export async function loadMice() {
  const base = apiBase().replace(/\/+$/, "");
  const res = await fetch(`${base}/api/mice`, { credentials: "omit" });
  if (!res.ok) throw new Error(`Failed to fetch mice: ${res.status}`);
  const data = await res.json();
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
    price: m.price ?? null,
    tags: m.tags || [],
  }));

  if (typeof window !== "undefined") {
    // Provide a global for older code paths.
    window.MICE = normalized;
  }

  return normalized;
}


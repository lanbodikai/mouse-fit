// Shared fetch helpers for public/ESM tools (served from /public).
// Uses `window.__MOUSEFIT_API_BASE__` injected by Next.js `src/app/layout.tsx`.

export const API_BASE = (() => {
  try {
    if (typeof window !== "undefined") {
      const base = window.__MOUSEFIT_API_BASE__ || window.API_BASE_URL;
      if (base) return String(base).trim().replace(/\/+$/, "");
    }
  } catch {}
  return "https://api.mousefit.pro";
})();

function joinUrl(base, path) {
  const baseTrimmed = String(base || "").replace(/\/+$/, "");
  const pathTrimmed = String(path || "").startsWith("/") ? String(path || "") : `/${path || ""}`;
  return `${baseTrimmed}${pathTrimmed}`;
}

export async function apiFetch(path, options = {}) {
  const url = /^https?:\/\//.test(path) ? path : joinUrl(API_BASE, path);

  const headers = new Headers(options.headers || {});
  if (options.body != null && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const statusText = res.statusText ? ` ${res.statusText}` : "";
    throw new Error(`API request failed (${res.status}${statusText}): ${text || "(empty response body)"}`);
  }

  return res;
}

export async function apiJson(path, options) {
  const res = await apiFetch(path, options);
  return await res.json();
}


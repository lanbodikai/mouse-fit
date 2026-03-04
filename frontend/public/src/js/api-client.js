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
  if (!headers.has("X-Request-ID")) {
    headers.set("X-Request-ID", (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `req-${Date.now()}`);
  }
  if (!headers.has("Authorization")) {
    try {
      const raw = localStorage.getItem("mousefit:auth:session");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.access_token === "string" && parsed.access_token) {
          headers.set("Authorization", `Bearer ${parsed.access_token}`);
        }
      }
    } catch {}
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const statusText = res.statusText ? ` ${res.statusText}` : "";
    let message = text || "(empty response body)";
    try {
      const parsed = JSON.parse(text || "{}");
      if (parsed && typeof parsed.message === "string" && parsed.message) {
        message = parsed.message;
      }
    } catch {}
    throw new Error(`API request failed (${res.status}${statusText}): ${message}`);
  }

  return res;
}

export async function apiJson(path, options) {
  const res = await apiFetch(path, options);
  return await res.json();
}

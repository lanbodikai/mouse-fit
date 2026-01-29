import type { Grip, Measurement, Mouse, Report } from "./types";

declare global {
  interface Window {
    __MOUSEFIT_API_BASE__?: string;
  }
}

function normalizeBase(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const runtime = window.__MOUSEFIT_API_BASE__;
    if (typeof runtime === "string" && runtime.trim()) return normalizeBase(runtime);
  }

  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof envBase === "string" && envBase.trim()) return normalizeBase(envBase);

  if (process.env.NODE_ENV === "development") return "http://localhost:8000";

  return "https://api.mousefit.pro";
}

function joinUrl(base: string, path: string) {
  const baseTrimmed = base.replace(/\/+$/, "");
  const pathTrimmed = path.startsWith("/") ? path : `/${path}`;
  return `${baseTrimmed}${pathTrimmed}`;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const apiBase = getApiBase();
  const url = /^https?:\/\//.test(path) ? path : joinUrl(apiBase, path);

  const headers = new Headers(options.headers);
  if (options.body != null && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`API request failed (network error) for ${url}: ${message}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const statusText = res.statusText ? ` ${res.statusText}` : "";
    throw new Error(`API request failed (${res.status}${statusText}): ${text || "(empty response body)"}`);
  }

  return res;
}

export async function apiJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(path, options);
  return (await res.json()) as T;
}

export function getHealth(): Promise<{ ok: boolean }> {
  return apiJson("/api/health");
}

export function getMice(): Promise<Mouse[]> {
  return apiJson("/api/mice");
}

export function getMouse(id: string): Promise<Mouse> {
  return apiJson(`/api/mice/${id}`);
}

export function saveMeasurement(payload: {
  session_id: string;
  length_mm: number;
  width_mm: number;
}): Promise<Measurement> {
  return apiJson("/api/measurements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveGrip(payload: {
  session_id: string;
  grip: string;
  confidence?: number;
}): Promise<Grip> {
  return apiJson("/api/grip", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generateReport(sessionId: string): Promise<Report> {
  const encoded = encodeURIComponent(sessionId);
  return apiJson(`/api/report/generate?session_id=${encoded}`, { method: "POST" });
}

export function getLatestReport(sessionId: string): Promise<Report> {
  const encoded = encodeURIComponent(sessionId);
  return apiJson(`/api/report/latest?session_id=${encoded}`);
}

export function chatAgent(payload: Record<string, unknown>): Promise<{ reply: string }> {
  return apiJson("/api/agent/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function ragQuery(payload: {
  session_id: string;
  query: string;
  top_k?: number;
  prefs?: Record<string, unknown>;
}): Promise<{ answer: string; sources: Array<Record<string, unknown>> }> {
  return apiJson("/api/rag/query", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function mlPredict(payload: {
  session_id: string;
  payload: Record<string, unknown>;
}): Promise<{ prediction: string; confidence: number; metadata?: Record<string, unknown> }> {
  return apiJson("/api/ml/predict", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function yoloPredict(imageData: string | HTMLCanvasElement | ImageData, options?: {
  conf?: number;
  iou?: number;
  maxDet?: number;
}): Promise<Array<{
  box: [number, number, number, number]; // x1, y1, x2, y2
  score: number;
  class: number;
}>> {
  let imageBase64: string;
  
  if (typeof imageData === 'string') {
    imageBase64 = imageData;
  } else if (imageData instanceof HTMLCanvasElement) {
    imageBase64 = imageData.toDataURL('image/jpeg', 0.9).split(',')[1];
  } else {
    // ImageData - convert to canvas first
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
      imageBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    } else {
      throw new Error('Could not create canvas context');
    }
  }

  const response = await apiJson<{
    detections: Array<{
      box: [number, number, number, number];
      score: number;
      class: number;
    }>;
  }>("/api/ml/yolo", {
    method: "POST",
    body: JSON.stringify({
      image: imageBase64,
      conf: options?.conf ?? 0.22,
      iou: options?.iou ?? 0.45,
      max_det: options?.maxDet ?? 50,
    }),
  });

  return response.detections;
}

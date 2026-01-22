import type { Grip, Measurement, Mouse, Report } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

export function getHealth(): Promise<{ ok: boolean }> {
  return request("/api/health");
}

export function getMice(): Promise<Mouse[]> {
  return request("/api/mice");
}

export function getMouse(id: string): Promise<Mouse> {
  return request(`/api/mice/${id}`);
}

export function saveMeasurement(payload: {
  session_id: string;
  length_mm: number;
  width_mm: number;
}): Promise<Measurement> {
  return request("/api/measurements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveGrip(payload: {
  session_id: string;
  grip: string;
  confidence?: number;
}): Promise<Grip> {
  return request("/api/grip", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generateReport(sessionId: string): Promise<Report> {
  const encoded = encodeURIComponent(sessionId);
  return request(`/api/report/generate?session_id=${encoded}`, { method: "POST" });
}

export function getLatestReport(sessionId: string): Promise<Report> {
  const encoded = encodeURIComponent(sessionId);
  return request(`/api/report/latest?session_id=${encoded}`);
}

export function chatAgent(payload: Record<string, unknown>): Promise<{ reply: string }> {
  return request("/api/agent/chat", {
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
  return request("/api/rag/query", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function mlPredict(payload: {
  session_id: string;
  payload: Record<string, unknown>;
}): Promise<{ prediction: string; confidence: number; metadata?: Record<string, unknown> }> {
  return request("/api/ml/predict", {
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

  const response = await request<{
    detections: Array<{
      box: [number, number, number, number];
      score: number;
      class: number;
    }>;
  }>("/api/ml/yolo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: imageBase64,
      conf: options?.conf ?? 0.22,
      iou: options?.iou ?? 0.45,
      max_det: options?.maxDet ?? 50,
    }),
  });

  return response.detections;
}

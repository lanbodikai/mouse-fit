"use client";

import { useSyncExternalStore } from "react";

export type BestMouse = {
  name: string;
  score: number;
  size: string;
  recommendedGrip: string;
  notes: string;
  alternatives: string[];
};

type ReportState = {
  bestMouse: BestMouse | null;
};

type ReportStore = {
  getState: () => ReportState;
  setBestMouse: (bestMouse: BestMouse | null) => void;
  subscribe: (listener: () => void) => () => void;
};

let state: ReportState = { bestMouse: null };
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

export const reportStore: ReportStore = {
  getState: () => state,
  setBestMouse: (bestMouse) => {
    state = { ...state, bestMouse };
    emit();
  },
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useReportStore() {
  return useSyncExternalStore(reportStore.subscribe, reportStore.getState, reportStore.getState);
}

type StoredPick = {
  brand?: string;
  model?: string;
  name?: string;
  score?: number;
};

type StoredRecs = {
  size?: string;
  top?: Record<string, StoredPick[]>;
};

type StoredGrip = {
  grip?: string;
};

const readStorageValue = (keys: string[]) => {
  if (typeof window === "undefined") return null;
  for (const key of keys) {
    try {
      const value = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
      if (value) return value;
    } catch {
      return null;
    }
  }
  return null;
};

const readStorageJson = <T,>(keys: string[]) => {
  const raw = readStorageValue(keys);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const joinName = (pick: StoredPick) => {
  const name = [pick.brand, pick.model].filter(Boolean).join(" ").trim();
  return name || pick.name || "Unknown";
};

export function buildBestMouseFromStorage(): BestMouse | null {
  const recs = readStorageJson<StoredRecs>(["mousefit:recs", "mf:recs"]);
  if (!recs?.top) return null;

  const grip = readStorageJson<StoredGrip>(["mousefit:grip_result", "mf:grip_result"]);
  const recommendedGrip = grip?.grip ? String(grip.grip).toLowerCase() : "palm";
  const size = recs.size ?? "medium";
  const topList = recs.top[recommendedGrip] ?? recs.top.palm ?? [];

  if (!topList.length) return null;

  const pick = topList[0];
  const alternatives = topList.slice(1, 4).map(joinName).filter(Boolean);
  const score = typeof pick.score === "number" ? pick.score : 0;

  return {
    name: joinName(pick),
    score,
    size,
    recommendedGrip,
    notes: `Sized for ${size} hands with a ${recommendedGrip} grip focus.`,
    alternatives,
  };
}

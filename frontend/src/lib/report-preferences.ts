export type ReportPreferences = {
  primaryGrip?: string; shellShape?: string; humpPosition?: string; sideShape?: string;
  fingerDirection?: string; thumbPosition?: string; dominantFinger?: string;
  palmFingerCurved?: string; clawRelaxed?: string; clawBackHandTouch?: string;
  budgetMin?: number; budgetMax?: number;
};

const stringKeys = ["primaryGrip", "shellShape", "humpPosition", "sideShape", "fingerDirection", "thumbPosition", "dominantFinger", "palmFingerCurved", "clawRelaxed", "clawBackHandTouch"] as const;

/** Reads the canonical profile saved by the survey for the legacy matcher. */
export function getStoredReportPreferences(): ReportPreferences | undefined {
  if (typeof window === "undefined") return undefined;
  for (const key of ["mousefit:survey_draft", "mf:survey_draft"]) {
    try {
      const raw = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
      if (!raw) continue;
      const source: Record<string, unknown> = JSON.parse(raw);
      const preferences: ReportPreferences = {};
      for (const field of stringKeys) {
        if (typeof source[field] === "string" && source[field].trim()) preferences[field] = source[field].trim().toLowerCase();
      }
      for (const field of ["budgetMin", "budgetMax"] as const) {
        const value = Number(source[field]);
        if (Number.isFinite(value)) preferences[field] = value;
      }
      return preferences;
    } catch { /* Try the compatibility key. */ }
  }
  return undefined;
}

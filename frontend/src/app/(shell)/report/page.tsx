"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Hand,
  Loader2,
  MousePointer2,
  RefreshCw,
  Ruler,
  Sparkles,
  Target,
} from "lucide-react";
import { generateReport, getLatestReport } from "@/lib/api";
import { ShellPage, ShellPanel } from "@/components/layout/ShellPage";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { buildBestMouseFromStorage, reportStore } from "@/lib/reportStore";
import { getOrCreateSessionId } from "@/lib/session";
import type { Grip, Measurement, Report } from "@/lib/types";

const REPORT_STORAGE_KEY = "mousefit:latest_report";
const MEASURE_KEYS = ["mousefit:measure", "mf:measure"] as const;
const GRIP_KEYS = ["mousefit:grip_result", "mf:grip_result"] as const;

type LocalMeasure = {
  len_mm?: number;
  wid_mm?: number;
};

type LocalGrip = {
  grip?: string;
  confidence?: number;
};

function readLocalJson<T>(keys: readonly string[]): T | null {
  if (typeof window === "undefined") return null;

  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw) as T;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function writeLatestReport(report: Report) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(report);
  window.localStorage.setItem(REPORT_STORAGE_KEY, payload);
  window.sessionStorage.setItem(REPORT_STORAGE_KEY, payload);
  reportStore.setBestMouse(buildBestMouseFromStorage());
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes("could not find");
}

function formatGripLabel(grip: string | null | undefined): string {
  if (!grip) return "Not recorded";
  if (grip.toLowerCase() === "fingertip") return "Fingertip";
  return grip.charAt(0).toUpperCase() + grip.slice(1);
}

function formatScore(score: number): string {
  if (!Number.isFinite(score)) return "---";
  return `${score <= 1 ? Math.round(score * 100) : Math.round(score)}%`;
}

function measurementSummary(measurement: Measurement | null, localMeasurement: LocalMeasure | null): string {
  if (measurement) {
    return `${measurement.length_mm} x ${measurement.width_mm} mm`;
  }
  if (localMeasurement?.len_mm && localMeasurement?.wid_mm) {
    return `${localMeasurement.len_mm} x ${localMeasurement.wid_mm} mm`;
  }
  return "Not recorded";
}

function gripSummary(grip: Grip | null | undefined, localGrip: LocalGrip | null): string {
  if (grip?.grip) return formatGripLabel(grip.grip);
  if (localGrip?.grip) return formatGripLabel(localGrip.grip);
  return "Not recorded";
}

function LoadingPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mf-glass-pill inline-flex items-center gap-3 rounded-2xl px-5 py-4 text-sm text-[var(--shell-text-secondary)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading report...
      </div>
    </div>
  );
}

export default function ReportPage() {
  const authReady = useRequireAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localMeasurement, setLocalMeasurement] = useState<LocalMeasure | null>(null);
  const [localGrip, setLocalGrip] = useState<LocalGrip | null>(null);

  useEffect(() => {
    if (!authReady) return;

    const storedReport = readLocalJson<Report>([REPORT_STORAGE_KEY]);
    const storedMeasurement = readLocalJson<LocalMeasure>(MEASURE_KEYS);
    const storedGrip = readLocalJson<LocalGrip>(GRIP_KEYS);

    setLocalMeasurement(storedMeasurement);
    setLocalGrip(storedGrip);
    if (storedReport) {
      setReport(storedReport);
      reportStore.setBestMouse(buildBestMouseFromStorage());
    }

    let cancelled = false;

    async function loadLatest() {
      try {
        const latest = await getLatestReport(getOrCreateSessionId());
        if (cancelled) return;
        writeLatestReport(latest);
        setReport(latest);
      } catch (loadError) {
        if (!cancelled && !storedReport && !isNotFoundError(loadError)) {
          setError(loadError instanceof Error ? loadError.message : "Could not load the latest report.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLatest();

    return () => {
      cancelled = true;
    };
  }, [authReady]);

  const primaryRecommendation = report?.recommendations[0] ?? null;
  const latestFitLabel = primaryRecommendation
    ? `${primaryRecommendation.brand} ${primaryRecommendation.model}`.trim()
    : "No report yet";

  const statCards = useMemo(
    () => [
      {
        label: "Measurement",
        value: measurementSummary(report?.measurement ?? null, localMeasurement),
        icon: Ruler,
      },
      {
        label: "Grip",
        value: gripSummary(report?.grip, localGrip),
        icon: Hand,
      },
      {
        label: "Top Match",
        value: latestFitLabel,
        icon: MousePointer2,
      },
      {
        label: "Fit Score",
        value: primaryRecommendation ? formatScore(primaryRecommendation.score) : "---",
        icon: Target,
      },
    ],
    [latestFitLabel, localGrip, localMeasurement, primaryRecommendation, report],
  );

  async function handleGenerateReport() {
    setRunning(true);
    setError(null);

    try {
      const nextReport = await generateReport(getOrCreateSessionId());
      writeLatestReport(nextReport);
      setReport(nextReport);
      setLocalMeasurement({
        len_mm: nextReport.measurement.length_mm,
        wid_mm: nextReport.measurement.width_mm,
      });
      setLocalGrip(
        nextReport.grip
          ? {
              grip: nextReport.grip.grip,
              confidence: nextReport.grip.confidence,
            }
          : null,
      );
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Could not generate the report.");
    } finally {
      setRunning(false);
      setLoading(false);
    }
  }

  if (!authReady) {
    return <LoadingPage />;
  }

  return (
    <ShellPage
      title="Fit Report"
      description=""
      actions={
        <button
          type="button"
          onClick={() => void handleGenerateReport()}
          disabled={running}
          className="mf-glass-button mf-glass-button-primary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {report ? "Refresh report" : "Generate report"}
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="shell-surface-raised rounded-[26px] p-5">
            <div className="shell-surface-soft flex h-11 w-11 items-center justify-center rounded-full">
              <card.icon className="h-5 w-5 text-[var(--shell-text-secondary)]" />
            </div>
            <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--shell-text-tertiary)]">{card.label}</p>
            <p className="mt-2 text-base font-semibold leading-7 text-[var(--shell-text-primary)]">{card.value}</p>
          </div>
        ))}
      </div>

      {error ? (
        <ShellPanel title="Report issue" description={error} />
      ) : null}

      {loading && !report ? (
        <ShellPanel title="Loading report" description="">
          <div className="mf-glass-pill inline-flex items-center gap-3 rounded-full px-4 py-3 text-sm text-[var(--shell-text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Looking for the latest report...
          </div>
        </ShellPanel>
      ) : null}

      {report ? (
        <>
          <ShellPanel
            title="Summary"
            description={report.summary || "Your latest MouseFit recommendation is ready below."}
          >
            <div className="shell-surface-soft rounded-[24px] px-5 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--shell-text-tertiary)]">Session</p>
              <p className="mt-2 text-sm leading-7 text-[var(--shell-text-secondary)]">
                Created {new Date(report.created_at).toLocaleString()}
              </p>
            </div>
          </ShellPanel>

          <ShellPanel
            title="Recommendations"
            description=""
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {report.recommendations.map((recommendation, index) => (
                <div key={recommendation.id} className="shell-surface-soft rounded-[24px] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--shell-text-tertiary)]">
                        Option {index + 1}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold tracking-tight text-[var(--shell-text-primary)]">
                        {[recommendation.brand, recommendation.model].filter(Boolean).join(" ")}
                      </h3>
                    </div>
                    <div className="mf-glass-pill rounded-full px-3 py-2 text-sm font-semibold text-[var(--shell-text-primary)]">
                      {formatScore(recommendation.score)}
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[var(--shell-text-secondary)]">{recommendation.reason}</p>
                </div>
              ))}
            </div>
          </ShellPanel>
        </>
      ) : !loading ? (
        <ShellPanel
          title="No report yet"
          description="Measure your hand and capture your grip first, then generate the shortlist here."
        >
          <div className="flex flex-wrap gap-3">
            <div className="mf-glass-pill inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm text-[var(--shell-text-secondary)]">
              <Sparkles className="h-4 w-4" />
              Complete the fit steps first.
            </div>
          </div>
        </ShellPanel>
      ) : null}
    </ShellPage>
  );
}

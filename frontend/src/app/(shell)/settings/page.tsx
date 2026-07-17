"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  Camera,
  Download,
  Loader2,
  Moon,
  SlidersHorizontal,
  Sun,
  Trash2,
} from "lucide-react";
import { ShellPage, ShellPanel } from "@/components/layout/ShellPage";
import { useAuthState } from "@/hooks/useAuthState";
import { useTheme } from "@/lib/theme";

type CameraMode = "auto" | "front" | "rear";
type CountdownMode = "2" | "3" | "5";

type AppSettings = {
  notifications: boolean;
  productTips: boolean;
  autoSaveResults: boolean;
  reduceMotion: boolean;
  showGuides: boolean;
  cameraMode: CameraMode;
  captureCountdown: CountdownMode;
};

const SETTINGS_KEY = "mousefit:settings:v1";

const DEFAULT_SETTINGS: AppSettings = {
  notifications: true,
  productTips: true,
  autoSaveResults: true,
  reduceMotion: false,
  showGuides: true,
  cameraMode: "auto",
  captureCountdown: "3",
};

const EXPORT_KEYS = [
  SETTINGS_KEY,
  "mousefit:latest_report",
  "mousefit:recs",
  "mf:recs",
  "mousefit:survey_draft",
  "mf:survey_draft",
  "mousefit:measure",
  "mf:measure",
  "mousefit:grip_result",
  "mf:grip_result",
  "mf:length_mm",
  "mf:width_mm",
  "mousefit:v2:session_id",
] as const;

function ToggleRow({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="shell-surface-soft flex items-center justify-between gap-4 rounded-md px-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--shell-text-primary)]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--shell-text-secondary)]">{description}</p>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        aria-label={title}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
          enabled
            ? "shell-accent-surface"
            : "border-[var(--shell-border-soft)] bg-[var(--shell-surface-inset)] shadow-[var(--shell-shadow-inset)]"
        }`}
      >
        <span
          className={`absolute top-[3px] h-5 w-5 rounded-full bg-[var(--shell-text-inverse)] transition ${
            enabled ? "left-[24px]" : "left-[3px]"
          }`}
        />
      </button>
    </div>
  );
}

function ChoiceButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-4 py-2 text-sm font-medium transition ${
        active
          ? "shell-accent-surface"
          : "shell-surface-soft text-[var(--shell-text-secondary)] hover:text-[var(--shell-text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

function LoadingPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mf-glass-pill inline-flex items-center gap-3 rounded-2xl px-5 py-4 text-sm text-[var(--shell-text-secondary)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading settings...
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { ready: authReady } = useAuthState();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        setSettings(DEFAULT_SETTINGS);
      } else {
        const parsed = JSON.parse(raw) as Partial<AppSettings>;
        setSettings({
          notifications:
            typeof parsed.notifications === "boolean" ? parsed.notifications : DEFAULT_SETTINGS.notifications,
          productTips:
            typeof parsed.productTips === "boolean" ? parsed.productTips : DEFAULT_SETTINGS.productTips,
          autoSaveResults:
            typeof parsed.autoSaveResults === "boolean" ? parsed.autoSaveResults : DEFAULT_SETTINGS.autoSaveResults,
          reduceMotion:
            typeof parsed.reduceMotion === "boolean" ? parsed.reduceMotion : DEFAULT_SETTINGS.reduceMotion,
          showGuides:
            typeof parsed.showGuides === "boolean" ? parsed.showGuides : DEFAULT_SETTINGS.showGuides,
          cameraMode:
            parsed.cameraMode === "front" || parsed.cameraMode === "rear" || parsed.cameraMode === "auto"
              ? parsed.cameraMode
              : DEFAULT_SETTINGS.cameraMode,
          captureCountdown:
            parsed.captureCountdown === "2" || parsed.captureCountdown === "3" || parsed.captureCountdown === "5"
              ? parsed.captureCountdown
              : DEFAULT_SETTINGS.captureCountdown,
        });
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.documentElement.classList.toggle("shell-reduce-motion", settings.reduceMotion);
  }, [hydrated, settings]);

  const summary = useMemo(() => {
    const cameraLabel =
      settings.cameraMode === "auto"
        ? "Auto camera"
        : settings.cameraMode === "front"
          ? "Front camera"
          : "Rear camera";

    return `${cameraLabel} • ${settings.captureCountdown}s timer • ${settings.showGuides ? "Guides on" : "Guides off"}`;
  }, [settings.cameraMode, settings.captureCountdown, settings.showGuides]);

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function exportLocalData() {
    if (typeof window === "undefined") return;

    const payload: Record<string, string | null> = {};
    for (const key of EXPORT_KEYS) {
      payload[key] = window.localStorage.getItem(key);
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `mousefit-settings-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus("Settings and browser-side MouseFit data exported.");
  }

  function clearFitData() {
    if (typeof window === "undefined") return;

    for (const key of EXPORT_KEYS) {
      if (key === SETTINGS_KEY) continue;
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }

    setStatus("Stored fit history cleared from this browser.");
  }

  if (!authReady || !hydrated) {
    return <LoadingPage />;
  }

  return (
    <ShellPage
      title="Settings"
      description="Manage display, capture defaults, experience preferences, and browser-side data."
      actions={
        <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--shell-text-secondary)]">
          <SlidersHorizontal className="h-4 w-4" />
          {summary}
        </div>
      }
    >
      {status ? <ShellPanel title="Status" description={status} /> : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <ShellPanel title="Display" description="">
          <div className="flex flex-wrap gap-3">
            <ChoiceButton active={theme === "dark"} onClick={() => setTheme("dark")}>
              <span className="inline-flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Dark
              </span>
            </ChoiceButton>
            <ChoiceButton active={theme === "light"} onClick={() => setTheme("light")}>
              <span className="inline-flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Light
              </span>
            </ChoiceButton>
          </div>
        </ShellPanel>

        <ShellPanel title="Capture" description="">
          <div className="space-y-4">
            <div className="shell-surface-soft rounded-md px-4 py-4">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[var(--shell-text-tertiary)]">
                <Camera className="h-3.5 w-3.5" />
                Camera Mode
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {(["auto", "front", "rear"] as CameraMode[]).map((mode) => (
                  <ChoiceButton
                    key={mode}
                    active={settings.cameraMode === mode}
                    onClick={() => updateSetting("cameraMode", mode)}
                  >
                    {mode === "auto" ? "Auto" : mode === "front" ? "Front" : "Rear"}
                  </ChoiceButton>
                ))}
              </div>
            </div>

            <div className="shell-surface-soft rounded-md px-4 py-4">
              <p className="text-xs font-medium text-[var(--shell-text-tertiary)]">Capture countdown</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {(["2", "3", "5"] as CountdownMode[]).map((countdown) => (
                  <ChoiceButton
                    key={countdown}
                    active={settings.captureCountdown === countdown}
                    onClick={() => updateSetting("captureCountdown", countdown)}
                  >
                    {countdown}s
                  </ChoiceButton>
                ))}
              </div>
            </div>

            <ToggleRow
              title="Show guides"
              description="Keep on-screen guide overlays visible while measuring and scanning grip."
              enabled={settings.showGuides}
              onToggle={() => updateSetting("showGuides", !settings.showGuides)}
            />

            <ToggleRow
              title="Reduce motion"
              description="Use calmer motion across pages and interactive states."
              enabled={settings.reduceMotion}
              onToggle={() => updateSetting("reduceMotion", !settings.reduceMotion)}
            />
          </div>
        </ShellPanel>

        <ShellPanel title="Experience" description="">
          <div className="space-y-4">
            <ToggleRow
              title="Notifications"
              description="Show reminders when follow-up steps or saved results are ready."
              enabled={settings.notifications}
              onToggle={() => updateSetting("notifications", !settings.notifications)}
            />

            <ToggleRow
              title="Product tips"
              description="Show short hints while using the survey, measure, and report flows."
              enabled={settings.productTips}
              onToggle={() => updateSetting("productTips", !settings.productTips)}
            />

            <ToggleRow
              title="Auto-save results"
              description="Keep measurement, grip, and report outputs stored in this browser."
              enabled={settings.autoSaveResults}
              onToggle={() => updateSetting("autoSaveResults", !settings.autoSaveResults)}
            />
          </div>
        </ShellPanel>

        <ShellPanel title="Browser Data" description="Export or clear saved data.">
          <div className="space-y-3">
            <button
              type="button"
              onClick={exportLocalData}
              className="shell-surface-soft flex w-full items-center justify-between rounded-md px-4 py-4 text-left transition hover:border-[var(--shell-accent-outline)]"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--shell-text-primary)]">Export settings and fit data</p>
                <p className="mt-1 text-sm text-[var(--shell-text-secondary)]">Download the current browser-side settings, report, and session data.</p>
              </div>
              <Download className="h-4 w-4 text-[var(--shell-text-secondary)]" />
            </button>

            <button
              type="button"
              onClick={clearFitData}
              className="flex w-full items-center justify-between rounded-md border border-[rgba(187,88,104,0.24)] bg-[rgba(187,88,104,0.08)] px-4 py-4 text-left transition hover:bg-[rgba(187,88,104,0.12)]"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--tone-danger-text)]">Clear fit history</p>
                <p className="mt-1 text-sm text-[var(--tone-danger-text)] opacity-80">Remove saved measurement, grip, report, and session records from this browser.</p>
              </div>
              <Trash2 className="h-4 w-4 text-[var(--tone-danger-text)]" />
            </button>

            <div className="inline-flex items-center gap-2 text-sm text-[var(--shell-text-secondary)]">
              <Bell className="h-4 w-4" />
              Changes save automatically while you edit this page.
            </div>
          </div>
        </ShellPanel>
      </div>
    </ShellPage>
  );
}

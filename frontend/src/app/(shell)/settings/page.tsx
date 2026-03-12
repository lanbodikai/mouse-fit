"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Camera,
  Download,
  Gauge,
  Info,
  Moon,
  Palette,
  Shield,
  SlidersHorizontal,
  Sun,
  Trash2,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { ShellNav } from "@/components/shell/ShellNav";

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

function SettingCard({
  icon: Icon,
  title,
  subtitle,
  children,
  delay,
  accentColor = "gamer",
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: ReactNode;
  delay: number;
  accentColor?: "gamer" | "amber" | "emerald" | "violet";
}) {
  const colorMap = {
    gamer: { text: "text-accent-gamer", bg: "bg-accent-gamer-soft", border: "border-accent-gamer" },
    amber: { text: "text-accent-amber", bg: "bg-accent-amber-soft", border: "border-accent-amber" },
    emerald: { text: "text-accent-emerald", bg: "bg-accent-emerald-soft", border: "border-accent-emerald" },
    violet: { text: "text-accent-violet", bg: "bg-accent-violet-soft", border: "border-accent-violet" },
  };
  const c = colorMap[accentColor];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6 border-l-2 ${c.border}`}
    >
        <div className="mb-4 flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${c.border} ${c.bg}`}>
          <Icon className={`h-5 w-5 ${c.text}`} />
          </div>
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="text-sm text-white/50">{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

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
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white/85">{title}</p>
        <p className="text-xs text-white/45">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
          enabled
            ? "border-accent-gamer-strong bg-accent-gamer-strong"
            : "border-white/20 bg-white/10"
        }`}
        aria-pressed={enabled}
        aria-label={title}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            enabled ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppSettings>;
        setSettings({
          notifications:
            typeof parsed.notifications === "boolean"
              ? parsed.notifications
              : DEFAULT_SETTINGS.notifications,
          productTips:
            typeof parsed.productTips === "boolean"
              ? parsed.productTips
              : DEFAULT_SETTINGS.productTips,
          autoSaveResults:
            typeof parsed.autoSaveResults === "boolean"
              ? parsed.autoSaveResults
              : DEFAULT_SETTINGS.autoSaveResults,
          reduceMotion:
            typeof parsed.reduceMotion === "boolean"
              ? parsed.reduceMotion
              : DEFAULT_SETTINGS.reduceMotion,
          showGuides:
            typeof parsed.showGuides === "boolean"
              ? parsed.showGuides
              : DEFAULT_SETTINGS.showGuides,
          cameraMode:
            parsed.cameraMode === "front" ||
            parsed.cameraMode === "rear" ||
            parsed.cameraMode === "auto"
              ? parsed.cameraMode
              : DEFAULT_SETTINGS.cameraMode,
          captureCountdown:
            parsed.captureCountdown === "2" ||
            parsed.captureCountdown === "3" ||
            parsed.captureCountdown === "5"
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
  }, [hydrated, settings]);

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const summary = useMemo(() => {
    const cam =
      settings.cameraMode === "auto"
        ? "Auto"
        : settings.cameraMode === "front"
          ? "Front"
          : "Rear";
    return `${cam} camera • ${settings.captureCountdown}s timer • ${
      settings.showGuides ? "Guides on" : "Guides off"
    }`;
  }, [settings.cameraMode, settings.captureCountdown, settings.showGuides]);

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
    setStatus("Settings and fit data exported.");
  }

  function clearFitData() {
    if (typeof window === "undefined") return;
    for (const key of EXPORT_KEYS) {
      if (key === SETTINGS_KEY) continue;
      window.localStorage.removeItem(key);
    }
    setStatus("Fit history cleared from this browser.");
  }

  return (
    <>
      <ShellNav currentPage="settings" />
      <div className="mx-auto w-full max-w-5xl px-3 pb-14 pt-4 sm:px-5 lg:px-8">
        <h1 className="sr-only">Settings</h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-5 rounded-2xl border border-accent-gamer bg-white/[0.04] p-4 sm:p-5"
        >
          <p className="text-sm font-medium text-white/90">Settings overview</p>
          <p className="mt-1 text-xs text-white/55">{summary}</p>
          {status && <p className="mt-2 text-xs text-accent-gamer-strong">{status}</p>}
        </motion.div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SettingCard
            icon={Palette}
            title="Appearance"
            subtitle="Control theme and visual behavior."
            delay={0.05}
            accentColor="violet"
          >
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    theme === "light"
                      ? "bg-white/20 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Sun className="h-3.5 w-3.5 text-yellow-400" />
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    theme === "dark"
                      ? "bg-white/20 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Moon className="h-3.5 w-3.5 text-accent-highlight" />
                  Dark
                </button>
              </div>

              <ToggleRow
                title="Reduce motion"
                description="Use simpler transitions across dashboard cards."
                enabled={settings.reduceMotion}
                onToggle={() =>
                  updateSetting("reduceMotion", !settings.reduceMotion)
                }
              />
            </div>
          </SettingCard>

          <SettingCard
            icon={Camera}
            title="Capture Setup"
            subtitle="Defaults used in grip and measurement pages."
            delay={0.1}
            accentColor="amber"
          >
            <div className="space-y-3">
              <label className="block space-y-1.5 text-sm text-white/75">
                Preferred camera
                <select
                  value={settings.cameraMode}
                  onChange={(e) =>
                    updateSetting("cameraMode", e.target.value as CameraMode)
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="auto">Auto</option>
                  <option value="front">Front-facing</option>
                  <option value="rear">Rear-facing</option>
                </select>
              </label>

              <label className="block space-y-1.5 text-sm text-white/75">
                Capture countdown
                <select
                  value={settings.captureCountdown}
                  onChange={(e) =>
                    updateSetting(
                      "captureCountdown",
                      e.target.value as CountdownMode,
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="2">2 seconds</option>
                  <option value="3">3 seconds</option>
                  <option value="5">5 seconds</option>
                </select>
              </label>

              <ToggleRow
                title="Show capture guides"
                description="Keep framing boxes visible by default."
                enabled={settings.showGuides}
                onToggle={() => updateSetting("showGuides", !settings.showGuides)}
              />
            </div>
          </SettingCard>

          <SettingCard
            icon={Bell}
            title="Notifications"
            subtitle="Adjust reminders and product update alerts."
            delay={0.15}
            accentColor="emerald"
          >
            <div className="space-y-3">
              <ToggleRow
                title="Measurement reminders"
                description="Show reminders to refresh fit results regularly."
                enabled={settings.notifications}
                onToggle={() =>
                  updateSetting("notifications", !settings.notifications)
                }
              />
              <ToggleRow
                title="Product tips"
                description="Highlight new peripherals matching your profile."
                enabled={settings.productTips}
                onToggle={() => updateSetting("productTips", !settings.productTips)}
              />
            </div>
          </SettingCard>

          <SettingCard
            icon={Shield}
            title="Privacy & Data"
            subtitle="Control local data lifecycle on this device."
            delay={0.2}
            accentColor="gamer"
          >
            <div className="space-y-3">
              <ToggleRow
                title="Auto-save fit results"
                description="Store latest grip and measurement results locally."
                enabled={settings.autoSaveResults}
                onToggle={() =>
                  updateSetting("autoSaveResults", !settings.autoSaveResults)
                }
              />

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={exportLocalData}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 transition-colors hover:bg-white/10"
                >
                  <Download className="h-4 w-4" />
                  Export data
                </button>
                <button
                  type="button"
                  onClick={clearFitData}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors hover:opacity-90"
                  style={{ borderColor: "var(--tone-warning-line)", background: "var(--tone-warning-fill)", color: "var(--tone-warning-text)" }}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear fit data
                </button>
              </div>
            </div>
          </SettingCard>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.22 }}
          className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-gamer bg-accent-gamer-soft">
              <SlidersHorizontal className="h-5 w-5 text-accent-gamer" />
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-violet bg-accent-violet-soft">
              <Gauge className="h-5 w-5 text-accent-violet" />
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-amber bg-accent-amber-soft">
              <Info className="h-5 w-5 text-accent-amber" />
            </div>
            <p className="text-sm text-white/55">
              MouseFit v2.1 • Settings are stored per browser profile.
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  Hand,
  LogOut,
  Moon,
  Ruler,
  Send,
  Settings,
  Sun,
  Target,
  User,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getMe } from "@/lib/api";
import { signOut } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useReportStore, buildBestMouseFromStorage, reportStore } from "@/lib/reportStore";
import type { CurrentUser } from "@/lib/types";

/* ─── animation presets ─── */

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
};

/* ─── helpers ─── */

const toneStyles = {
  neutral: {
    iconClass: "border-line-soft bg-fill-soft text-support-strong",
    chipClass: "border-line-soft bg-fill-soft text-support-strong",
    line: "var(--line-soft)",
    fill: "var(--fill-soft)",
    glow: "none",
  },
  gamer: {
    iconClass: "border-accent-gamer bg-accent-gamer-soft text-accent-gamer",
    chipClass: "border-accent-gamer bg-accent-gamer-soft text-accent-gamer-strong",
    line: "var(--accent-gamer-line)",
    fill: "var(--accent-gamer-fill)",
    glow: "var(--accent-gamer-glow)",
  },
  violet: {
    iconClass: "border-accent-violet bg-accent-violet-soft text-accent-violet",
    chipClass: "border-accent-violet bg-accent-violet-soft text-accent-violet",
    line: "var(--accent-violet-line)",
    fill: "var(--accent-violet-fill)",
    glow: "none",
  },
  amber: {
    iconClass: "border-accent-amber bg-accent-amber-soft text-accent-amber",
    chipClass: "border-accent-amber bg-accent-amber-soft text-accent-amber",
    line: "var(--accent-amber-line)",
    fill: "var(--accent-amber-fill)",
    glow: "none",
  },
  emerald: {
    iconClass: "border-accent-emerald bg-accent-emerald-soft text-accent-emerald",
    chipClass: "border-accent-emerald bg-accent-emerald-soft text-accent-emerald",
    line: "var(--accent-emerald-line)",
    fill: "var(--accent-emerald-fill)",
    glow: "none",
  },
  info: {
    iconClass: "border-tone-info bg-tone-info text-tone-info",
    chipClass: "border-tone-info bg-tone-info text-tone-info",
    line: "var(--tone-info-line)",
    fill: "var(--tone-info-fill)",
    glow: "none",
  },
  warning: {
    iconClass: "border-tone-warning bg-tone-warning text-tone-warning",
    chipClass: "border-tone-warning bg-tone-warning text-tone-warning",
    line: "var(--tone-warning-line)",
    fill: "var(--tone-warning-fill)",
    glow: "none",
  },
  success: {
    iconClass: "border-tone-success bg-tone-success text-tone-success",
    chipClass: "border-tone-success bg-tone-success text-tone-success",
    line: "var(--tone-success-line)",
    fill: "var(--tone-success-fill)",
    glow: "none",
  },
} as const;

type ToneKey = keyof typeof toneStyles;

type ActionTarget = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: ToneKey;
};

type QuickTool = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: ToneKey;
};

type JourneyBoardItem = {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: LucideIcon;
  tone: ToneKey;
  ready: boolean;
  featured?: boolean;
};

const panelSurface = {
  borderColor: "var(--line-soft)",
  background: "linear-gradient(160deg, var(--surface-strong) 0%, var(--surface-soft) 100%)",
  boxShadow: "0 28px 80px rgba(0, 0, 0, 0.18)",
};

const heroSurface = {
  borderColor: "var(--line-soft)",
  background:
    "radial-gradient(circle at 82% 16%, var(--accent-highlight-fill) 0%, transparent 32%), radial-gradient(circle at 10% 16%, var(--accent-gamer-fill) 0%, transparent 30%), linear-gradient(160deg, var(--surface-strong) 0%, var(--surface-soft) 100%)",
  boxShadow: "0 30px 90px rgba(0, 0, 0, 0.22)",
};

const innerPanelSurface = {
  borderColor: "var(--line-subtle)",
  background: "linear-gradient(160deg, var(--fill-hover) 0%, var(--fill-soft) 100%)",
};

function readLocalJson<T>(keys: string[]): T | null {
  if (typeof window === "undefined") return null;
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch { /* skip */ }
  }
  return null;
}

const NOOP_SUBSCRIBE = () => () => {};
const DEFAULT_GREETING = "Welcome back";
const EMPTY_LOCAL_FIT_SNAPSHOT = {
  handData: null,
  gripData: null,
} as const;

function getGreetingSnapshot() {
  if (typeof window === "undefined") return DEFAULT_GREETING;
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getLocalFitSnapshot() {
  const report = readLocalJson<{
    measurement?: { length_mm?: number; width_mm?: number };
    grip?: { grip?: string; confidence?: number };
  }>(["mousefit:latest_report"]);
  const gripFallback = readLocalJson<{ grip?: string; confidence?: number }>(["mousefit:grip_result", "mf:grip_result"]);

  return {
    handData:
      report?.measurement?.length_mm && report?.measurement?.width_mm
        ? { length: report.measurement.length_mm, width: report.measurement.width_mm }
        : null,
    gripData: report?.grip?.grip
      ? { grip: report.grip.grip, confidence: report.grip.confidence ?? 0 }
      : gripFallback?.grip
        ? { grip: gripFallback.grip, confidence: gripFallback.confidence ?? 0 }
        : null,
  };
}

function scoreColor(s: number) {
  return s >= 90 ? "var(--accent-emerald)" : s >= 70 ? "var(--accent-gamer)" : "var(--accent-amber)";
}

function scoreTone(score: number): ToneKey {
  return score >= 90 ? "emerald" : score >= 70 ? "gamer" : "amber";
}

function formatGrip(grip?: string | null) {
  if (!grip) return "Pending";
  return grip.charAt(0).toUpperCase() + grip.slice(1);
}

function initialsFromName(name?: string | null) {
  const source = name?.trim() || "User";
  return source.split(/\s+/).map((part) => part[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "U";
}

function StatusBadge({ tone, children }: { tone: ToneKey; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.18em] ${toneStyles[tone].chipClass}`}
    >
      {children}
    </span>
  );
}

function ProgressRing({ value, size = 64, stroke = 3.5, color }: { value: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-white/5" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (c * value) / 100 }}
        transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
        strokeLinecap="round"
      />
    </svg>
  );
}

function CompactToolTile({
  title,
  description,
  icon: Icon,
  tone,
  onClick,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: ToneKey;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-[20px] border p-3 text-left transition"
      style={{
        borderColor: "var(--line-subtle)",
        background: "linear-gradient(160deg, var(--fill-soft) 0%, transparent 100%)",
      }}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${toneStyles[tone].iconClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="truncate text-xs text-white/50">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/30 transition group-hover:text-white/65" />
    </motion.button>
  );
}

function JourneyTile({
  label,
  value,
  detail,
  href,
  icon: Icon,
  tone,
  ready,
  featured,
  onSelect,
}: JourneyBoardItem & { onSelect: (href: string) => void }) {
  const badgeTone: ToneKey = ready ? "success" : featured ? tone : "neutral";

  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(href)}
      className="group rounded-[24px] border p-4 text-left transition"
      style={{
        borderColor: featured ? toneStyles[tone].line : "var(--line-subtle)",
        background: `linear-gradient(160deg, ${featured ? toneStyles[tone].fill : "var(--fill-soft)"} 0%, var(--fill-soft) 100%)`,
        boxShadow: featured ? toneStyles[tone].glow : "none",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${toneStyles[tone].iconClass}`}>
          {ready ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>
        <StatusBadge tone={badgeTone}>{ready ? "Ready" : featured ? "Next" : "Pending"}</StatusBadge>
      </div>
      <div className="mt-4">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white/30">{label}</p>
        <p className="mt-2 text-sm font-semibold text-white">{value}</p>
        <p className="mt-1 text-xs leading-5 text-white/45">{detail}</p>
      </div>
      <div className="mt-4 inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/40 transition group-hover:text-white/65">
        Open <ChevronRight className="h-3 w-3" />
      </div>
    </motion.button>
  );
}

/* ─── main component ─── */

export default function MouseFitDashboard() {
  const router = useRouter();
  const authReady = useRequireAuth();
  const { bestMouse } = useReportStore();
  const { theme, toggleTheme } = useTheme();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const greeting = useSyncExternalStore(NOOP_SUBSCRIBE, getGreetingSnapshot, () => DEFAULT_GREETING);
  const localFitSnapshot = useSyncExternalStore(NOOP_SUBSCRIBE, getLocalFitSnapshot, () => EMPTY_LOCAL_FIT_SNAPSHOT);
  const handData = localFitSnapshot.handData;
  const gripData = localFitSnapshot.gripData;

  /* ── lifecycle ── */

  useEffect(() => {
    if (!authReady || reportStore.getState().bestMouse) return;
    const stored = buildBestMouseFromStorage();
    if (stored) reportStore.setBestMouse(stored);
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    getMe()
      .then((me) => { if (!cancelled) setUser(me); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [authReady]);

  useEffect(() => {
    function outside(e: MouseEvent) { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false); }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  /* ── derived ── */

  const displayName = user?.display_name?.trim() || "there";
  const initials = initialsFromName(user?.display_name);
  const hasMatch = Boolean(bestMouse);
  const fitScore = Math.round(bestMouse?.score ?? 0);
  const matchTone = hasMatch ? scoreTone(fitScore) : "neutral";
  const matchColor = scoreColor(fitScore);
  const gripLabel = gripData?.grip
    ? formatGrip(gripData.grip)
    : bestMouse?.recommendedGrip
      ? formatGrip(bestMouse.recommendedGrip)
      : "Pending";
  const handLabel = handData
    ? `${handData.length} x ${handData.width} mm`
    : bestMouse?.size && bestMouse.size !== "server"
      ? `${bestMouse.size} hand profile`
      : "Awaiting measurement";
  const completionCount = [Boolean(handData), Boolean(gripData), hasMatch].filter(Boolean).length;
  const profileCompletion = Math.round((completionCount / 3) * 100);
  const inputSummary =
    handData && gripData
      ? "Two fit signals recorded"
      : handData || gripData
        ? "One fit signal recorded"
        : "No fit signals recorded";
  const nextAction: ActionTarget = !handData
      ? {
          label: "Measure your hand",
          description: "Capture your length and width so the shortlist can size itself correctly.",
          href: "/measure",
          icon: Ruler,
          tone: "violet",
        }
      : !gripData
        ? {
            label: "Detect your grip",
            description: "We need your grip style before the recommendation logic can finish the stack.",
            href: "/grip",
            icon: Hand,
            tone: "amber",
          }
        : !hasMatch
          ? {
              label: "Open your report",
              description: "Your inputs are ready. Generate the recommendation and review the reasoning.",
              href: "/report",
              icon: Target,
              tone: "gamer",
            }
          : {
              label: "Review full report",
              description: "Your main pick is locked. Open the report to inspect the reasoning and alternatives.",
              href: "/report",
              icon: Target,
              tone: matchTone,
            };

  const NextActionIcon = nextAction.icon;

  const quickTools: QuickTool[] = [
    {
      href: "/measure",
      title: "Hand Measure",
      description: "Capture width and length without leaving the shell.",
      icon: Ruler,
      tone: "violet",
    },
    {
      href: "/grip",
      title: "Grip Checker",
      description: "Classify your grip and feed the report pipeline.",
      icon: Hand,
      tone: "amber",
    },
    {
      href: "/database",
      title: "Mouse Database",
      description: "Scan shapes, sizes, and shortlist candidates.",
      icon: Database,
      tone: "gamer",
    },
    {
      href: "/report",
      title: "Report View",
      description: "Review your current recommendation stack and notes.",
      icon: FileText,
      tone: "emerald",
    },
    {
      href: "/dashboard?assistant=open",
      title: "AI Agent",
      description: "Ask for comparisons, budget filters, or fit explanations.",
      icon: Bot,
      tone: "info",
    },
  ];

  const boardItems: JourneyBoardItem[] = [
    {
      label: "Measurement",
      value: handData ? handLabel : "Not captured",
      detail: handData ? "Length and width are available for sizing." : "Measure once to seed the fit engine.",
      href: "/measure",
      icon: Ruler,
      tone: handData ? "violet" : "neutral",
      ready: Boolean(handData),
      featured: nextAction.href === "/measure",
    },
    {
      label: "Grip",
      value: gripData
        ? `${formatGrip(gripData.grip)}${gripData.confidence > 0 ? ` ${Math.round(gripData.confidence * 100)}%` : ""}`
        : "Not detected",
      detail: gripData ? "Grip signal is ready for recommendation logic." : "Run the grip checker to improve the recommendation.",
      href: "/grip",
      icon: Hand,
      tone: gripData ? "amber" : "neutral",
      ready: Boolean(gripData),
      featured: nextAction.href === "/grip",
    },
    {
      label: "Report",
      value: bestMouse ? `${fitScore}% fit` : handData && gripData ? "Ready to generate" : "Awaiting inputs",
      detail: bestMouse ? bestMouse.name : handData && gripData ? "All inputs are ready for the recommendation stage." : "Hand size and grip need to be present first.",
      href: "/report",
      icon: Target,
      tone: bestMouse ? matchTone : handData && gripData ? "gamer" : "neutral",
      ready: hasMatch,
      featured: nextAction.href === "/report" && !hasMatch,
    },
  ];

  const heroSecondaryHref = bestMouse
    ? `/dashboard?assistant=open&q=${encodeURIComponent(`Why does ${bestMouse.name} fit me?`)}`
    : handData
      ? "/grip"
      : "/database";
  const heroSecondaryLabel = bestMouse ? "Ask AI about this fit" : handData ? "Open grip checker" : "Browse mouse database";
  const HeroSecondaryIcon = bestMouse ? Bot : handData ? Hand : Database;

  const notificationTarget = hasMatch ? "/report" : nextAction.href;
  const showNotificationDot = !hasMatch;

  const promptSuggestions = bestMouse
    ? [
        `Why does ${bestMouse.name} fit me?`,
        bestMouse.alternatives[0]
          ? `Compare ${bestMouse.name} vs ${bestMouse.alternatives[0]}`
          : "Best mouse under $80",
        handData
          ? `Best shapes for ${handData.length} x ${handData.width} mm hands`
          : "Small hand recommendations",
      ]
    : [
        "Best mouse under $80",
        "Compare Viper V3 vs G Pro X2",
        handData ? `What grip suits ${handData.length} x ${handData.width} mm hands?` : "Small hand recommendations",
      ];

  /* ── render ── */

  return (
    <>
      <motion.div
        className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <div className="min-w-0 space-y-5">
          <motion.div variants={rise} className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/30">{greeting}</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  Hi, {displayName !== "there" ? displayName : "there"}
                </h1>
                <StatusBadge tone={hasMatch ? "success" : nextAction.tone}>
                  {hasMatch ? "Fit ready" : nextAction.label}
                </StatusBadge>
              </div>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <div className="rounded-full border border-line-soft bg-fill-soft px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/40">
                Profile {profileCompletion}%
              </div>
              <div className="rounded-full border border-line-soft bg-fill-soft px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/40">
                {bestMouse ? gripLabel : inputSummary}
              </div>
            </div>
          </motion.div>

          <motion.div variants={rise}>
            <Card className="overflow-hidden" style={heroSurface}>
              <div className="absolute inset-0 pointer-events-none opacity-90">
                <div className="absolute -right-12 top-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute bottom-0 left-1/2 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>

              <CardContent className="relative p-6 pt-6 lg:p-7 lg:pt-7">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={hasMatch ? matchTone : nextAction.tone}>
                      {hasMatch ? "Your top pick" : "Let\u2019s find your fit"}
                    </StatusBadge>
                  </div>

                  <div className="space-y-3">
                    <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-[2.6rem]">
                      {bestMouse
                        ? bestMouse.name
                        : "Your perfect mouse is one scan away."}
                    </h2>
                    <p className="max-w-2xl text-sm leading-6 text-white/60">
                      {bestMouse
                        ? bestMouse.notes
                        : "Take a quick hand measurement, let AI detect your grip style, and we\u2019ll match you with the best mouse from hundreds of shapes and sizes \u2014 backed by data, not guesswork."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={bestMouse ? matchTone : nextAction.tone}>
                      {bestMouse ? `${fitScore}% fit` : nextAction.label}
                    </StatusBadge>
                    <StatusBadge tone="violet">{handLabel}</StatusBadge>
                    <StatusBadge tone={gripData ? "amber" : "neutral"}>{gripLabel}</StatusBadge>
                    {bestMouse && (
                      <StatusBadge tone="info">
                        {bestMouse.alternatives.length ? `${bestMouse.alternatives.length} alternatives` : "No alternatives"}
                      </StatusBadge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => router.push(bestMouse ? "/report" : nextAction.href)}
                      className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-white transition"
                      style={{
                        borderColor: toneStyles[bestMouse ? matchTone : nextAction.tone].line,
                        background: `linear-gradient(160deg, ${toneStyles[bestMouse ? matchTone : nextAction.tone].fill} 0%, var(--fill-soft) 100%)`,
                        boxShadow: toneStyles[bestMouse ? matchTone : nextAction.tone].glow,
                      }}
                    >
                      <NextActionIcon className="h-4 w-4" />
                      {bestMouse ? "Open full report" : nextAction.label}
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push(heroSecondaryHref)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-line-soft bg-fill-soft px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-fill-hover hover:text-white"
                    >
                      <HeroSecondaryIcon className="h-4 w-4" />
                      {heroSecondaryLabel}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={rise}>
            <Card style={panelSurface}>
              <CardContent className="p-5 pt-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/30">Fit board</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">Stored profile signals</h3>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {boardItems.map((item) => (
                    <JourneyTile key={item.label} {...item} onSelect={(href) => router.push(href)} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={rise}>
            <Card style={panelSurface}>
              <CardContent className="p-5 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${toneStyles.info.iconClass}`}>
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/30">Command deck</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">Ask MouseFit AI</h3>
                    </div>
                  </div>
                  <StatusBadge tone="info">Compare, budget, shape</StatusBadge>
                </div>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
                  Use the agent for fit explanations, side-by-side comparisons, or tighter budget filters without leaving the dashboard shell.
                </p>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const query = aiQuery.trim();
                    router.push(
                      query
                        ? `/dashboard?assistant=open&q=${encodeURIComponent(query)}`
                        : "/dashboard?assistant=open",
                    );
                  }}
                  className="mt-4 rounded-[28px] border border-line-soft bg-fill-soft p-2 sm:flex sm:items-center sm:gap-2"
                >
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={(event) => setAiQuery(event.target.value)}
                    placeholder="What mouse is best for claw grip?"
                    className="h-12 w-full rounded-[20px] border border-transparent bg-transparent px-4 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-line-soft focus:bg-fill-hover"
                  />
                  <button
                    type="submit"
                    className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[20px] border border-accent-gamer bg-accent-gamer-soft px-4 text-sm font-semibold text-white transition hover:bg-accent-gamer-strong sm:mt-0 sm:w-auto"
                  >
                    <Send className="h-4 w-4" />
                    Run query
                  </button>
                </form>

                <div className="mt-4 flex flex-wrap gap-2">
                  {promptSuggestions.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() =>
                        router.push(`/dashboard?assistant=open&q=${encodeURIComponent(prompt)}`)
                      }
                      className="rounded-full border border-line-soft bg-fill-soft px-3 py-2 text-[0.72rem] font-medium text-white/55 transition hover:bg-fill-hover hover:text-white/75"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="space-y-5 min-w-0">
          <motion.div variants={rise} className="flex h-[52px] items-center justify-end gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-line-soft bg-fill-soft text-white/50 transition hover:bg-fill-hover hover:text-white"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => router.push(notificationTarget)}
              aria-label="Open the next dashboard task"
              className="relative flex h-9 w-9 items-center justify-center rounded-2xl border border-line-soft bg-fill-soft text-white/50 transition hover:bg-fill-hover hover:text-white"
            >
              <Bell className="h-4 w-4" />
              {showNotificationDot && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent-gamer" />}
            </button>

            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
                onClick={() => setDropdownOpen((open) => !open)}
                className="flex h-9 items-center gap-2 rounded-2xl border border-line-soft bg-fill-soft px-2 text-white/60 transition hover:bg-fill-hover hover:text-white"
              >
                {user?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-accent-gamer bg-accent-gamer-soft text-[0.65rem] font-bold text-accent-gamer">
                    {initials}
                  </div>
                )}
                <ChevronDown className={`h-3 w-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] shadow-xl backdrop-blur-xl"
                  >
                    <div className="border-b border-white/5 px-3 py-2.5">
                      <p className="truncate text-xs font-medium text-white">{displayName !== "there" ? displayName : "Guest"}</p>
                      <p className="truncate text-[0.65rem] text-white/25">{user?.email || "Loading account"}</p>
                    </div>
                    {[{ label: "Profile", icon: User, href: "/user" }, { label: "Settings", icon: Settings, href: "/settings" }].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          router.push(item.href);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/50 transition hover:bg-white/5 hover:text-white"
                      >
                        <item.icon className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    ))}
                    <div className="border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          signOut();
                          router.push("/auth/sign-in");
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-400/70 transition hover:bg-white/5 hover:text-red-400"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div variants={rise}>
            <Card className="overflow-hidden" style={panelSurface}>
              <div
                className="absolute inset-x-0 top-0 h-24"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent-gamer-fill) 0%, var(--accent-highlight-fill) 52%, transparent 100%)",
                }}
              />
              <CardContent className="relative p-5 pt-5">
                <div className="space-y-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/30">How it works</p>
                  <h3 className="text-lg font-semibold text-white">MouseFit in 3 steps</h3>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    {
                      icon: Ruler,
                      tone: "violet" as ToneKey,
                      title: "Measure your hand",
                      desc: "Use your camera to capture precise hand length and width in seconds.",
                    },
                    {
                      icon: Hand,
                      tone: "amber" as ToneKey,
                      title: "Detect your grip",
                      desc: "Our AI classifies your natural grip style \u2014 claw, palm, or fingertip.",
                    },
                    {
                      icon: Target,
                      tone: "gamer" as ToneKey,
                      title: "Get your match",
                      desc: "Receive a ranked shortlist of mice tailored to your hand and grip profile.",
                    },
                  ].map((step) => (
                    <div key={step.title} className="flex items-start gap-3 rounded-[20px] border p-3" style={innerPanelSurface}>
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border ${toneStyles[step.tone].iconClass}`}>
                        <step.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{step.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-white/45">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => router.push(nextAction.href)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-white transition"
                  style={{
                    borderColor: toneStyles[nextAction.tone].line,
                    background: `linear-gradient(160deg, ${toneStyles[nextAction.tone].fill} 0%, var(--fill-soft) 100%)`,
                  }}
                >
                  <NextActionIcon className="h-4 w-4" />
                  {nextAction.label}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={rise}>
            <Card style={panelSurface}>
              <CardContent className="p-5 pt-5">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/30">Workbench</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Quick tools</h3>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {quickTools.map((tool) => (
                    <CompactToolTile
                      key={tool.href}
                      title={tool.title}
                      description={tool.description}
                      icon={tool.icon}
                      tone={tool.tone}
                      onClick={() => router.push(tool.href)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {bestMouse && (
            <motion.div variants={rise}>
              <Card style={panelSurface}>
                <CardContent className="p-5 pt-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/30">Shortlist</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">Recommendation stack</h3>
                    </div>
                  </div>

                  <div
                    className="mt-4 rounded-[24px] border p-4"
                    style={{
                      borderColor: toneStyles[matchTone].line,
                      background: `linear-gradient(160deg, ${toneStyles[matchTone].fill} 0%, var(--fill-soft) 100%)`,
                      boxShadow: toneStyles[matchTone].glow,
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        <ProgressRing value={fitScore} size={64} stroke={4} color={matchColor} />
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white">
                          {fitScore}%
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/30">Primary pick</p>
                        <p className="mt-2 text-lg font-semibold text-white">{bestMouse.name}</p>
                        <p className="mt-2 text-xs leading-5 text-white/50">{bestMouse.notes}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {bestMouse.alternatives.length ? (
                      bestMouse.alternatives.map((alternative, index) => (
                        <div
                          key={alternative}
                          className="flex items-center justify-between rounded-[20px] border px-3 py-3"
                          style={innerPanelSurface}
                        >
                          <div>
                            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/25">Option {index + 2}</p>
                            <p className="mt-1 text-sm font-semibold text-white">{alternative}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-white/25" />
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[20px] border px-3 py-3 text-sm text-white/45" style={innerPanelSurface}>
                        No alternatives have been stored yet. The report still contains the primary recommendation.
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push("/report")}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line-soft bg-fill-soft px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-fill-hover hover:text-white"
                  >
                    Open report
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </motion.div>

    </>
  );
}

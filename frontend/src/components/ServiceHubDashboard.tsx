"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CircleDot,
  Database,
  FileText,
  Keyboard,
  MousePointer2,
  Ruler,
  Sparkles,
  Square,
  Target,
  type LucideIcon,
} from "lucide-react";
import { getMe, getMice } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  PLATFORM_SERVICES,
  type PlatformService,
  type ServiceAccent,
  type ServiceIconKey,
} from "@/data/services";
import type { CurrentUser, Mouse as MouseType } from "@/lib/types";

const serviceIcons: Record<ServiceIconKey, LucideIcon> = {
  mousefit: MousePointer2,
  keyboard: Keyboard,
  mousepad: Square,
  desk: Ruler,
};

const accentStyles: Record<
  ServiceAccent,
  {
    iconWrap: string;
    badge: string;
    dot: string;
  }
> = {
  gamer: {
    iconWrap: "bg-[#151515] text-white",
    badge: "bg-[#d9ff74] text-[#111111]",
    dot: "bg-[#b4f22f]",
  },
  amber: {
    iconWrap: "bg-[#fff2d9] text-[#d17d14]",
    badge: "bg-[#fff1d1] text-[#b96b10]",
    dot: "bg-[#efb54a]",
  },
  emerald: {
    iconWrap: "bg-[#dff6eb] text-[#13855f]",
    badge: "bg-[#e5f8ee] text-[#10714f]",
    dot: "bg-[#3bc78f]",
  },
  info: {
    iconWrap: "bg-[#e6f2ff] text-[#2570c8]",
    badge: "bg-[#e8f1ff] text-[#1d62b0]",
    dot: "bg-[#5ea1f1]",
  },
};

const workflowCards = [
  {
    title: "Run Mouse Fit Survey",
    detail: "Launch the live intake flow for hand size, grip, and fit preference.",
    meta: "3 minute workflow",
    status: "Ready now",
    href: "/survey",
    icon: Sparkles,
    tone: "lime" as const,
  },
  {
    title: "Capture Hand Profile",
    detail: "Measure hand length and width before the recommendation engine scores shapes.",
    meta: "Camera + ruler",
    status: "Input step",
    href: "/measure",
    icon: Ruler,
    tone: "white" as const,
  },
  {
    title: "Open Latest Report",
    detail: "Review the shortlist, notes, and next recommendations after the survey is complete.",
    meta: "Recommendation review",
    status: "Report view",
    href: "/report",
    icon: FileText,
    tone: "white" as const,
  },
] as const;

const summaryDocuments = [
  { label: "Survey", detail: "Intake flow", href: "/survey", icon: Sparkles },
  { label: "Database", detail: "Shape library", href: "/database", icon: Database },
  { label: "Report", detail: "Fit output", href: "/report", icon: FileText },
] as const;

function resolveDisplayName(user: CurrentUser | null): string {
  const rawName = user?.display_name?.trim();
  if (rawName) return rawName;

  const rawEmail = user?.email?.trim();
  if (rawEmail) {
    const [localPart] = rawEmail.split("@");
    if (localPart) return localPart;
  }

  return "there";
}

function latestMouseTimestamp(mouse: MouseType): number {
  const timestamps = [mouse.updated_at, mouse.created_at]
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter((value) => Number.isFinite(value));

  return timestamps.length > 0 ? Math.max(...timestamps) : 0;
}

function getNewestMouse(mice: MouseType[]): MouseType | null {
  const datedMice = mice.filter((mouse) => latestMouseTimestamp(mouse) > 0);
  if (datedMice.length === 0) return null;

  return datedMice.reduce<MouseType | null>((current, candidate) => {
    if (!current) return candidate;

    const candidateTime = latestMouseTimestamp(candidate);
    const currentTime = latestMouseTimestamp(current);
    return candidateTime > currentTime ? candidate : current;
  }, null);
}

function formatShortDate(value?: string | null): string | undefined {
  if (!value) return undefined;

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return undefined;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(parsed));
}

function StatBlock({
  value,
  label,
  delta,
  compact = false,
}: {
  value: string;
  label: string;
  delta?: string;
  compact?: boolean;
}) {
  return (
    <div className={`min-w-[108px] ${compact ? "max-w-[240px]" : ""}`}>
      <div className="flex items-start gap-2">
        <span
          className={`font-semibold tracking-tight text-[#111111] ${
            compact
              ? "max-w-[15ch] text-[1.35rem] leading-[1.06] sm:text-[1.75rem]"
              : "text-[2.55rem] leading-none"
          }`}
        >
          {value}
        </span>
        {delta ? (
          <span className="rounded-full bg-[#e5f8c2] px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#406100]">
            {delta}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-black/45">{label}</p>
    </div>
  );
}

function ServiceTile({ service }: { service: PlatformService }) {
  const Icon = serviceIcons[service.icon];
  const accent = accentStyles[service.accent];
  const isLive = service.status === "available";

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`h-full rounded-[32px] border p-5 shadow-[0_18px_36px_rgba(0,0,0,0.06)] ${
        isLive ? "border-[#c8ed67] bg-[#d7ff72]" : "border-black/6 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${accent.iconWrap}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${accent.badge}`}>
            {service.statusLabel}
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/6 text-black/60">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-black/35">{service.shortName}</p>
        <h3 className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-[#111111]">
          {service.name}
        </h3>
      </div>

      <div className="mt-7 flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-black/35">Availability</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} />
            <span className="text-xs text-black/52">{service.availabilityNote}</span>
          </div>
        </div>

        {service.studioHref ? (
          <Link
            href={service.studioHref}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#111111] px-4 text-sm font-semibold text-white transition hover:bg-black"
          >
            {isLive ? "Open studio" : "View studio"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-black/8 bg-[#f6f3ee] px-4 text-sm font-medium text-black/55"
          >
            Coming soon
          </button>
        )}
      </div>
    </motion.article>
  );
}

function WorkflowTile({
  title,
  detail,
  meta,
  status,
  href,
  icon: Icon,
  tone,
}: {
  title: string;
  detail: string;
  meta: string;
  status: string;
  href: string;
  icon: LucideIcon;
  tone: "lime" | "white";
}) {
  const isPrimary = tone === "lime";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42 }}
      className={`h-full rounded-[34px] border p-5 shadow-[0_18px_36px_rgba(0,0,0,0.06)] ${
        isPrimary ? "border-[#c8ed67] bg-[#d7ff72]" : "border-black/6 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-black/35">
            {isPrimary ? "Live workflow" : "Task"}
          </p>
          <p className="mt-2 text-sm font-medium text-black/55">{meta}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${isPrimary ? "bg-black text-white" : "bg-black/6 text-black/62"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-12">
        <h3 className="max-w-[15ch] text-[2rem] font-semibold leading-[1.02] tracking-tight text-[#111111]">
          {title}
        </h3>
        <p className="mt-3 max-w-[28ch] text-sm leading-6 text-black/60">{detail}</p>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/70 px-3 py-2 text-xs text-black/60">
          <CircleDot className="h-3.5 w-3.5" />
          {status}
        </div>
        <Link
          href={href}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#111111] text-white transition hover:bg-black"
          aria-label={`Open ${title}`}
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}

function LiveServicePanel({ service }: { service: PlatformService }) {
  const Icon = serviceIcons[service.icon];

  return (
    <div className="overflow-hidden rounded-[36px] bg-[#0f0f10] p-3 text-white shadow-[0_24px_48px_rgba(0,0,0,0.16)]">
      <div className="rounded-[30px] bg-gradient-to-br from-[#d7ff72] via-[#e7ffae] to-[#bff67c] p-5 text-[#111111]">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-black/8 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em]">
            Live service
          </span>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/8">
              <Bell className="h-4 w-4" />
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/8">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-black/42">MouseFit workspace</p>
            <h2 className="mt-2 text-[2.1rem] font-semibold leading-none tracking-tight">{service.name}</h2>
            <p className="mt-3 max-w-[22ch] text-sm leading-6 text-black/62">{service.description}</p>
          </div>
          <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[24px] bg-[#111111] text-white shadow-[0_20px_30px_rgba(0,0,0,0.18)]">
            <Icon className="h-7 w-7" />
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          {[
            { label: "Survey", icon: Sparkles },
            { label: "Measure", icon: Ruler },
            { label: "Report", icon: Target },
          ].map((step) => (
            <div
              key={step.label}
              className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/72 px-3 py-2 text-xs font-medium text-black/68"
            >
              <step.icon className="h-3.5 w-3.5" />
              {step.label}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link
          href="/survey"
          className="inline-flex items-center justify-center rounded-[24px] bg-white px-4 py-3 text-sm font-semibold text-[#111111] transition hover:bg-[#f4f2ed]"
        >
          Launch now
        </Link>
        <Link
          href="/database"
          className="inline-flex items-center justify-center rounded-[24px] bg-white/8 px-4 py-3 text-sm font-medium text-white/78 transition hover:bg-white/12"
        >
          Browse data
        </Link>
      </div>
    </div>
  );
}

function SummaryPanel() {
  const timeline = [
    {
      stage: "Live now",
      title: "Mouse Fit",
      detail: "Hand size, grip, and recommendation flow are already active.",
      dot: "bg-[#d7ff72]",
    },
    {
      stage: "Next",
      title: "Keyboard Finder",
      detail: "Layout, switch, and typing feel will plug into the same workspace.",
      dot: "bg-[#ffb84a]",
    },
    {
      stage: "After",
      title: "Mousepad Match",
      detail: "Surface speed and stopping power will follow the mouse recommendation.",
      dot: "bg-[#3bc78f]",
    },
    {
      stage: "Later",
      title: "Desk Height Tune",
      detail: "The setup layer expands into posture and desk-position tuning.",
      dot: "bg-[#5ea1f1]",
    },
  ] as const;

  return (
    <div className="rounded-[36px] bg-[#0f0f10] p-5 text-white shadow-[0_24px_48px_rgba(0,0,0,0.16)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/35">Summary</p>
          <h2 className="mt-2 text-[2rem] font-semibold tracking-tight">Summary</h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-5 rounded-[28px] bg-white/5 p-4">
        <p className="text-sm font-medium text-white/82">Documents</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {summaryDocuments.map((doc) => (
            <Link
              key={doc.label}
              href={doc.href}
              className="rounded-[22px] bg-white/6 p-3 transition hover:bg-white/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-white text-[#111111]">
                <doc.icon className="h-4 w-4" />
              </div>
              <p className="mt-4 text-sm font-semibold text-white">{doc.label}</p>
              <p className="mt-1 text-xs text-white/45">{doc.detail}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-[28px] bg-white/5 p-4">
        <p className="text-sm font-medium text-white/82">Launch order</p>
        <div className="relative mt-5 pl-6">
          <div className="absolute bottom-0 left-[8px] top-1 w-px bg-white/10" />
          <div className="space-y-5">
            {timeline.map((item) => (
              <div key={item.title} className="relative">
                <span className={`absolute left-[-24px] top-1.5 h-4 w-4 rounded-full border border-white/10 ${item.dot}`} />
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/35">{item.stage}</p>
                <p className="mt-1 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-white/48">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[28px] bg-white/5 p-4">
        <p className="text-sm font-medium text-white/82">Goal</p>
        <p className="mt-3 text-sm leading-6 text-white/58">
          Turn MouseFit into a full setup workspace where a user can size the mouse, choose the keyboard, match the
          mousepad, and tune the desk from one dashboard.
        </p>
      </div>
    </div>
  );
}

export default function ServiceHubDashboard() {
  const authReady = useRequireAuth();
  const liveService = PLATFORM_SERVICES.find((service) => service.status === "available");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [mice, setMice] = useState<MouseType[]>([]);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    Promise.allSettled([getMe(), getMice()]).then(([userResult, miceResult]) => {
      if (cancelled) return;

      if (userResult.status === "fulfilled") {
        setUser(userResult.value);
      }

      if (miceResult.status === "fulfilled") {
        setMice(miceResult.value);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authReady]);

  const displayName = useMemo(() => resolveDisplayName(user), [user]);
  const newestMouse = useMemo(() => getNewestMouse(mice), [mice]);
  const newestReleaseLabel = newestMouse
    ? [newestMouse.brand, newestMouse.model, newestMouse.variant].filter(Boolean).join(" ")
    : "--";
  const newestReleaseDate = newestMouse ? formatShortDate(newestMouse.updated_at ?? newestMouse.created_at) : undefined;

  if (!authReady || !liveService) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-2xl bg-black px-5 py-4 text-sm text-white shadow-[0_18px_36px_rgba(0,0,0,0.14)]">
          <Sparkles className="h-4 w-4 text-[#d7ff72]" />
          Loading workspace...
        </div>
      </section>
    );
  }

  return (
    <motion.div
      className="mx-auto w-full max-w-[1380px] space-y-6 text-[#111111]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-7">
          <section className="rounded-[36px] border border-black/6 bg-[#f5f1ea] p-4 shadow-[0_18px_36px_rgba(0,0,0,0.04)] sm:p-5 xl:p-6">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 lg:flex-1">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-black/35">Dashboard</p>
                    <h1 className="mt-3 text-[2.5rem] font-semibold leading-none tracking-tight sm:text-[3.5rem] xl:text-[4.2rem]">
                      Hi, {displayName}
                    </h1>
                    <Link
                      href="/survey"
                      className="mt-4 inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-[#111111] px-5 text-sm font-semibold text-white transition hover:bg-black"
                    >
                      Launch Mouse Fit
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-start gap-x-8 gap-y-4 lg:ml-6 lg:shrink-0 lg:justify-end lg:pt-2">
                    <StatBlock
                      value={mice.length > 0 ? String(mice.length) : "--"}
                      label="mice in data"
                    />
                    <StatBlock
                      value={newestReleaseLabel}
                      label="newest release"
                      delta={newestReleaseDate}
                      compact
                    />
                  </div>
                </div>
              </div>

              <section>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-[2rem] font-semibold tracking-tight">Services</h2>
                  <span className="text-sm font-medium text-black/42">{PLATFORM_SERVICES.length} service pages</span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {PLATFORM_SERVICES.map((service) => (
                    <ServiceTile key={service.id} service={service} />
                  ))}
                </div>
              </section>

              <section>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <h2 className="text-[2rem] font-semibold tracking-tight">Current Flows</h2>
                    <span className="text-sm font-medium text-black/42">{workflowCards.length} active shortcuts</span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                  {workflowCards.map((card) => (
                    <WorkflowTile key={card.title} {...card} />
                  ))}
                </div>
              </section>
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-5 xl:self-start">
          <LiveServicePanel service={liveService} />
          <SummaryPanel />
        </aside>
      </div>
    </motion.div>
  );
}

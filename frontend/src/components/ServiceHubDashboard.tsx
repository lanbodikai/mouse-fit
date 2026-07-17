"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileText,
  Hand,
  Keyboard,
  MousePointer2,
  Ruler,
  Sparkles,
  Square,
  type LucideIcon,
} from "lucide-react";
import { ShellPage, ShellPanel } from "@/components/layout/ShellPage";
import { PLATFORM_SERVICES, type PlatformService, type ServiceIconKey } from "@/data/services";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getMe, getMice } from "@/lib/api";
import { buildBestMouseFromStorage } from "@/lib/reportStore";
import type { CurrentUser, Mouse as MouseType } from "@/lib/types";

const serviceIcons: Record<ServiceIconKey, LucideIcon> = {
  mousefit: MousePointer2,
  keyboard: Keyboard,
  mousepad: Square,
  desk: Ruler,
};

const workflows = [
  {
    title: "Complete fit survey",
    description: "Capture hand size, grip style, and preference signals.",
    href: "/survey",
    icon: Sparkles,
    status: "Start here",
  },
  {
    title: "Measure your hand",
    description: "Use the camera workflow to record length and width.",
    href: "/measure",
    icon: Ruler,
    status: "Camera",
  },
  {
    title: "Classify your grip",
    description: "Add a grip profile before recommendation scoring.",
    href: "/grip",
    icon: Hand,
    status: "Camera",
  },
  {
    title: "Review recommendations",
    description: "Open your latest ranked shortlist and fit reasoning.",
    href: "/report",
    icon: FileText,
    status: "Output",
  },
] as const;

function displayName(user: CurrentUser | null): string {
  if (user?.display_name?.trim()) return user.display_name.trim();
  return user?.email?.split("@")[0] || "your workspace";
}

function newestMouse(mice: MouseType[]): MouseType | null {
  return [...mice].sort((left, right) => {
    const leftTime = Date.parse(left.updated_at || left.created_at || "") || 0;
    const rightTime = Date.parse(right.updated_at || right.created_at || "") || 0;
    return rightTime - leftTime;
  })[0] ?? null;
}

function ServiceRow({ service }: { service: PlatformService }) {
  const Icon = serviceIcons[service.icon];
  const isLive = service.status === "available";

  return (
    <Link
      href={service.studioHref || "/dashboard"}
      className="grid gap-3 rounded-lg border border-[var(--shell-border-strong)] bg-[var(--shell-surface-soft)] p-4 transition hover:border-[var(--shell-accent-outline)] sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--shell-surface-inset)]">
        <Icon className="h-4 w-4 text-[var(--shell-accent-strong)]" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--shell-text-primary)]">{service.name}</h3>
          <span className={isLive ? "text-xs text-[var(--shell-accent-strong)]" : "text-xs text-[var(--shell-text-tertiary)]"}>
            {service.statusLabel}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--shell-text-secondary)]">{service.availabilityNote}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-[var(--shell-text-tertiary)]" />
    </Link>
  );
}

export default function ServiceHubDashboard() {
  const authReady = useRequireAuth();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [mice, setMice] = useState<MouseType[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    Promise.allSettled([getMe(), getMice()]).then(([userResult, miceResult]) => {
      if (cancelled) return;
      if (userResult.status === "fulfilled") setUser(userResult.value);
      if (miceResult.status === "fulfilled") setMice(miceResult.value);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [authReady]);

  const latestFit = useMemo(() => buildBestMouseFromStorage(), []);
  const newest = useMemo(() => newestMouse(mice), [mice]);

  if (!authReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-[var(--shell-text-secondary)]">
        Loading workspace...
      </div>
    );
  }

  return (
    <ShellPage
      layout="wide"
      eyebrow="Workspace overview"
      title={`Welcome to ${displayName(user)}`}
      description="Continue your fit workflow, review the catalog, and track the services available in MouseFit."
      actions={
        <Link
          href="/survey"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--shell-accent)] px-4 text-sm font-semibold text-[var(--shell-text-inverse)] hover:bg-[var(--shell-accent-strong)]"
        >
          Start fit survey
          <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      <div className="grid gap-px overflow-hidden rounded-lg border border-[var(--shell-border-strong)] bg-[var(--shell-border-strong)] sm:grid-cols-3">
        <div className="bg-[var(--shell-surface-raised)] p-4">
          <p className="text-2xl font-semibold text-[var(--shell-text-primary)]">{loaded ? mice.length : "--"}</p>
          <p className="mt-1 text-sm text-[var(--shell-text-secondary)]">catalog entries</p>
        </div>
        <div className="min-w-0 bg-[var(--shell-surface-raised)] p-4">
          <p className="truncate text-base font-semibold text-[var(--shell-text-primary)]">
            {latestFit?.name || "No result yet"}
          </p>
          <p className="mt-1 text-sm text-[var(--shell-text-secondary)]">latest fit</p>
        </div>
        <div className="min-w-0 bg-[var(--shell-surface-raised)] p-4">
          <p className="truncate text-base font-semibold text-[var(--shell-text-primary)]">
            {newest ? [newest.brand, newest.model].filter(Boolean).join(" ") : loaded ? "No recent entry" : "Loading"}
          </p>
          <p className="mt-1 text-sm text-[var(--shell-text-secondary)]">newest catalog entry</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ShellPanel title="Current workflow" description="Complete these steps in order for the strongest recommendation signal.">
          <div className="divide-y divide-[var(--shell-border-strong)]">
            {workflows.map((workflow, index) => (
              <Link
                key={workflow.href}
                href={workflow.href}
                className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--shell-surface-soft)]">
                  <workflow.icon className="h-4 w-4 text-[var(--shell-accent-strong)]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--shell-text-primary)]">{workflow.title}</h3>
                    <span className="text-xs text-[var(--shell-text-tertiary)]">{workflow.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--shell-text-secondary)]">{workflow.description}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--shell-accent-strong)]">
                  Step {index + 1}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </ShellPanel>

        <div className="space-y-5">
          <ShellPanel tone="accent">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-[var(--shell-accent-strong)]" />
              <h2 className="text-base font-semibold text-[var(--shell-text-primary)]">Mouse Fit is live</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-text-secondary)]">
              Survey, camera measurement, grip classification, catalog, and report generation are available.
            </p>
            <Link href="/mouse-fit" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--shell-accent-strong)]">
              Open workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </ShellPanel>

          <ShellPanel title="Quick access">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <Link href="/database" className="flex items-center gap-3 rounded-md bg-[var(--shell-surface-soft)] p-3 text-sm font-medium text-[var(--shell-text-primary)]">
                <Database className="h-4 w-4 text-[var(--shell-text-tertiary)]" />
                Browse mouse database
              </Link>
              <Link href="/report" className="flex items-center gap-3 rounded-md bg-[var(--shell-surface-soft)] p-3 text-sm font-medium text-[var(--shell-text-primary)]">
                <FileText className="h-4 w-4 text-[var(--shell-text-tertiary)]" />
                Open latest report
              </Link>
            </div>
          </ShellPanel>
        </div>
      </div>

      <ShellPanel title="Services" description="One active workflow and three clearly scoped previews.">
        <div className="grid gap-3 md:grid-cols-2">
          {PLATFORM_SERVICES.map((service) => (
            <ServiceRow key={service.id} service={service} />
          ))}
        </div>
      </ShellPanel>
    </ShellPage>
  );
}

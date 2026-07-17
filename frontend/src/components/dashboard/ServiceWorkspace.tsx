"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock3, type LucideIcon } from "lucide-react";
import { ShellPage, ShellPanel } from "@/components/layout/ShellPage";

type StatItem = {
  value: string;
  label: string;
  delta?: string;
};

type FeatureCard = {
  eyebrow: string;
  title: string;
  detail: string;
  chips: string[];
  ctaLabel: string;
  href?: string;
  tone: "lime" | "white";
  icon: LucideIcon;
  note: string;
};

type WorkflowCard = {
  title: string;
  detail: string;
  meta: string;
  status: string;
  href?: string;
  icon: LucideIcon;
  tone: "lime" | "white";
};

type AssetCard = {
  label: string;
  detail: string;
  href?: string;
  icon: LucideIcon;
};

type TimelineItem = {
  stage: string;
  title: string;
  detail: string;
  dotClass: string;
};

export type ServiceWorkspaceConfig = {
  status: "live" | "coming_soon";
  badge: string;
  headline: string;
  description: string;
  ctaLabel: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  stats: readonly StatItem[];
  sectionTitle: string;
  sectionCountLabel: string;
  sectionFilters: readonly string[];
  featureCards: readonly FeatureCard[];
  workflowTitle: string;
  workflowCountLabel: string;
  workflowFilters: readonly string[];
  workflowCards: readonly WorkflowCard[];
  panelEyebrow: string;
  panelTitle: string;
  panelDescription: string;
  panelChips: ReadonlyArray<{ label: string; icon: LucideIcon }>;
  panelPrimaryLabel: string;
  panelPrimaryHref?: string;
  panelSecondaryLabel?: string;
  panelSecondaryHref?: string;
  panelIcon: LucideIcon;
  summaryAssets: readonly AssetCard[];
  summaryTimeline: readonly TimelineItem[];
  summaryGoal: string;
};

function Action({
  href,
  label,
  primary = false,
}: {
  href?: string;
  label: string;
  primary?: boolean;
}) {
  const className = `inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${
    primary
      ? "border-[var(--shell-accent)] bg-[var(--shell-accent)] text-[var(--shell-text-inverse)] hover:bg-[var(--shell-accent-strong)]"
      : "border-[var(--shell-border-strong)] bg-[var(--shell-surface-soft)] text-[var(--shell-text-primary)] hover:border-[var(--shell-accent-outline)]"
  }`;

  if (!href) {
    return (
      <span className={`${className} cursor-default opacity-70`}>
        {label}
      </span>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export default function ServiceWorkspace({ config }: { config: ServiceWorkspaceConfig }) {
  const reduceMotion = useReducedMotion();
  const isLive = config.status === "live";
  const StatusIcon = isLive ? CheckCircle2 : Clock3;

  return (
    <ShellPage
      layout="wide"
      eyebrow={config.badge}
      title={config.panelTitle}
      description={config.description}
      actions={
        <>
          {config.secondaryLabel ? (
            <Action href={config.secondaryHref} label={config.secondaryLabel} />
          ) : null}
          <Action href={config.ctaHref} label={config.ctaLabel} primary={isLive} />
        </>
      }
    >
      <div className="grid gap-px overflow-hidden rounded-lg border border-[var(--shell-border-strong)] bg-[var(--shell-border-strong)] sm:grid-cols-2 xl:grid-cols-4">
        {config.stats.map((stat) => (
          <div key={`${stat.label}-${stat.value}`} className="bg-[var(--shell-surface-raised)] p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-2xl font-semibold text-[var(--shell-text-primary)]">{stat.value}</p>
              {stat.delta ? (
                <span className="text-xs font-medium text-[var(--shell-accent-strong)]">{stat.delta}</span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-[var(--shell-text-secondary)]">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <ShellPanel
            title={isLive ? config.sectionTitle : "Service preview"}
            description={
              isLive
                ? config.sectionCountLabel
                : "This service is not active yet. These modules describe the planned scope."
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
              {config.featureCards.map((card, index) => (
                <motion.article
                  key={card.title}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : index * 0.045, duration: 0.25 }}
                  className={`rounded-lg border p-4 ${
                    isLive && card.tone === "lime"
                      ? "border-[var(--shell-accent-outline)] bg-[var(--shell-accent-soft)]"
                      : "border-[var(--shell-border-strong)] bg-[var(--shell-surface-soft)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--shell-surface-inset)] text-[var(--shell-accent-strong)]">
                      <card.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs text-[var(--shell-text-tertiary)]">
                      {isLive ? card.eyebrow : "Planned"}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-[var(--shell-text-primary)]">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--shell-text-secondary)]">
                    {card.detail}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--shell-text-tertiary)]">
                    {card.chips.slice(0, 3).map((chip) => (
                      <span key={chip}>{chip}</span>
                    ))}
                  </div>
                  {card.href ? (
                    <Link
                      href={card.href}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--shell-accent-strong)]"
                    >
                      {card.ctaLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </motion.article>
              ))}
            </div>
          </ShellPanel>

          <ShellPanel title={config.workflowTitle} description={config.workflowCountLabel}>
            <div className="divide-y divide-[var(--shell-border-strong)]">
              {config.workflowCards.map((card) => (
                <div key={card.title} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--shell-surface-soft)] text-[var(--shell-text-secondary)]">
                    <card.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--shell-text-primary)]">{card.title}</h3>
                      <span className="text-xs text-[var(--shell-accent-strong)]">{card.status}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[var(--shell-text-secondary)]">{card.detail}</p>
                  </div>
                  {card.href ? (
                    <Link
                      href={card.href}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--shell-border-strong)] px-3 text-sm font-medium text-[var(--shell-text-primary)] hover:border-[var(--shell-accent-outline)]"
                    >
                      Open
                    </Link>
                  ) : (
                    <span className="text-xs text-[var(--shell-text-tertiary)]">{card.meta}</span>
                  )}
                </div>
              ))}
            </div>
          </ShellPanel>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-0 xl:self-start">
          <ShellPanel tone={isLive ? "accent" : "default"}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--shell-surface-inset)]">
                <StatusIcon className="h-5 w-5 text-[var(--shell-accent-strong)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--shell-text-primary)]">
                  {isLive ? "Available now" : "Coming soon"}
                </p>
                <p className="text-xs text-[var(--shell-text-secondary)]">{config.panelEyebrow}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--shell-text-secondary)]">
              {config.panelDescription}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              {config.panelChips.map((chip) => (
                <span key={chip.label} className="inline-flex items-center gap-2 text-xs text-[var(--shell-text-secondary)]">
                  <chip.icon className="h-3.5 w-3.5" />
                  {chip.label}
                </span>
              ))}
            </div>
          </ShellPanel>

          <ShellPanel title="Related workspace" description={config.summaryGoal}>
            <div className="divide-y divide-[var(--shell-border-strong)]">
              {config.summaryAssets.map((asset) => {
                const content = (
                  <>
                    <asset.icon className="h-4 w-4 text-[var(--shell-text-tertiary)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-[var(--shell-text-primary)]">{asset.label}</span>
                      <span className="block text-xs text-[var(--shell-text-tertiary)]">{asset.detail}</span>
                    </span>
                    {asset.href ? <ArrowRight className="h-4 w-4 text-[var(--shell-text-tertiary)]" /> : null}
                  </>
                );

                return asset.href ? (
                  <Link key={asset.label} href={asset.href} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    {content}
                  </Link>
                ) : (
                  <div key={asset.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    {content}
                  </div>
                );
              })}
            </div>
          </ShellPanel>
        </aside>
      </div>
    </ShellPage>
  );
}

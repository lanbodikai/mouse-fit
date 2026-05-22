"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CircleDot,
  type LucideIcon,
} from "lucide-react";

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

function StatBlock({ value, label, delta }: StatItem) {
  return (
    <div className="min-w-[108px]">
      <div className="flex items-start gap-2">
        <span className="text-[2.55rem] font-semibold leading-none tracking-tight text-[#111111]">{value}</span>
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

function FeatureTile({ card }: { card: FeatureCard }) {
  const live = card.tone === "lime";

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`h-full rounded-[32px] border p-5 shadow-[0_18px_36px_rgba(0,0,0,0.06)] ${
        live ? "border-[#c8ed67] bg-[#d7ff72]" : "border-black/6 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${live ? "bg-[#111111] text-white" : "bg-black/6 text-black/65"}`}>
          <card.icon className="h-5 w-5" />
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/6 text-black/60">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-8">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-black/35">{card.eyebrow}</p>
        <h3 className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-[#111111]">{card.title}</h3>
        <p className="mt-3 text-sm leading-6 text-black/60">{card.detail}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {card.chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-black/8 bg-white/72 px-3 py-1.5 text-[0.72rem] font-medium text-black/60"
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="mt-7 flex justify-end">
        {card.href ? (
          <Link
            href={card.href}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#111111] px-4 text-sm font-semibold text-white transition hover:bg-black"
          >
            {card.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-black/8 bg-[#f6f3ee] px-4 text-sm font-medium text-black/55"
          >
            {card.ctaLabel}
          </button>
        )}
      </div>
    </motion.article>
  );
}

function WorkflowTile({ card }: { card: WorkflowCard }) {
  const primary = card.tone === "lime";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42 }}
      className={`h-full rounded-[34px] border p-5 shadow-[0_18px_36px_rgba(0,0,0,0.06)] ${
        primary ? "border-[#c8ed67] bg-[#d7ff72]" : "border-black/6 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-black/35">
            {primary ? "Primary flow" : "Task"}
          </p>
          <p className="mt-2 text-sm font-medium text-black/55">{card.meta}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${primary ? "bg-black text-white" : "bg-black/6 text-black/62"}`}>
          <card.icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-12">
        <h3 className="max-w-[16ch] text-[2rem] font-semibold leading-[1.02] tracking-tight text-[#111111]">
          {card.title}
        </h3>
        <p className="mt-3 max-w-[28ch] text-sm leading-6 text-black/60">{card.detail}</p>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/70 px-3 py-2 text-xs text-black/60">
          <CircleDot className="h-3.5 w-3.5" />
          {card.status}
        </div>
        {card.href ? (
          <Link
            href={card.href}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#111111] text-white transition hover:bg-black"
            aria-label={`Open ${card.title}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/6 text-black/55">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function HeroPanel({ config }: { config: ServiceWorkspaceConfig }) {
  return (
    <div className="overflow-hidden rounded-[36px] bg-[#0f0f10] p-3 text-white shadow-[0_24px_48px_rgba(0,0,0,0.16)]">
      <div className="rounded-[30px] bg-gradient-to-br from-[#d7ff72] via-[#e7ffae] to-[#bff67c] p-5 text-[#111111]">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-black/8 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em]">
            {config.panelEyebrow}
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/8">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[2.1rem] font-semibold leading-none tracking-tight">{config.panelTitle}</h2>
            <p className="mt-3 max-w-[22ch] text-sm leading-6 text-black/62">{config.panelDescription}</p>
          </div>
          <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[24px] bg-[#111111] text-white shadow-[0_20px_30px_rgba(0,0,0,0.18)]">
            <config.panelIcon className="h-7 w-7" />
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          {config.panelChips.map((chip) => (
            <div
              key={chip.label}
              className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/72 px-3 py-2 text-xs font-medium text-black/68"
            >
              <chip.icon className="h-3.5 w-3.5" />
              {chip.label}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {config.panelPrimaryHref ? (
          <Link
            href={config.panelPrimaryHref}
            className="inline-flex items-center justify-center rounded-[24px] bg-white px-4 py-3 text-sm font-semibold text-[#111111] transition hover:bg-[#f4f2ed]"
          >
            {config.panelPrimaryLabel}
          </Link>
        ) : (
          <div className="inline-flex items-center justify-center rounded-[24px] bg-white px-4 py-3 text-sm font-semibold text-[#111111]">
            {config.panelPrimaryLabel}
          </div>
        )}

        {config.panelSecondaryLabel ? (
          config.panelSecondaryHref ? (
            <Link
              href={config.panelSecondaryHref}
              className="inline-flex items-center justify-center rounded-[24px] bg-white/8 px-4 py-3 text-sm font-medium text-white/78 transition hover:bg-white/12"
            >
              {config.panelSecondaryLabel}
            </Link>
          ) : (
            <div className="inline-flex items-center justify-center rounded-[24px] bg-white/8 px-4 py-3 text-sm font-medium text-white/78">
              {config.panelSecondaryLabel}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function SummaryPanel({ config }: { config: ServiceWorkspaceConfig }) {
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
        <p className="text-sm font-medium text-white/82">Assets</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {config.summaryAssets.map((asset) =>
            asset.href ? (
              <Link
                key={asset.label}
                href={asset.href}
                className="rounded-[22px] bg-white/6 p-3 transition hover:bg-white/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-white text-[#111111]">
                  <asset.icon className="h-4 w-4" />
                </div>
                <p className="mt-4 text-sm font-semibold text-white">{asset.label}</p>
                <p className="mt-1 text-xs text-white/45">{asset.detail}</p>
              </Link>
            ) : (
              <div key={asset.label} className="rounded-[22px] bg-white/6 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-white text-[#111111]">
                  <asset.icon className="h-4 w-4" />
                </div>
                <p className="mt-4 text-sm font-semibold text-white">{asset.label}</p>
                <p className="mt-1 text-xs text-white/45">{asset.detail}</p>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="mt-4 rounded-[28px] bg-white/5 p-4">
        <p className="text-sm font-medium text-white/82">Launch order</p>
        <div className="relative mt-5 pl-6">
          <div className="absolute bottom-0 left-[8px] top-1 w-px bg-white/10" />
          <div className="space-y-5">
            {config.summaryTimeline.map((item) => (
              <div key={item.title} className="relative">
                <span className={`absolute left-[-24px] top-1.5 h-4 w-4 rounded-full border border-white/10 ${item.dotClass}`} />
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
        <p className="mt-3 text-sm leading-6 text-white/58">{config.summaryGoal}</p>
      </div>
    </div>
  );
}

function ComingSoonPreviewCard({ card }: { card: FeatureCard }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36 }}
      className="h-full rounded-[30px] border border-black/6 bg-white p-5 shadow-[0_18px_36px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-black/6 text-black/65">
          <card.icon className="h-5 w-5" />
        </div>
        <span className="rounded-full border border-black/8 bg-[#f6f3ee] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-black/52">
          Coming soon
        </span>
      </div>

      <div className="mt-8">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-black/35">{card.eyebrow}</p>
        <h3 className="mt-3 text-[1.85rem] font-semibold leading-none tracking-tight text-[#111111]">{card.title}</h3>
        <p className="mt-3 text-sm leading-6 text-black/58">{card.note}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {card.chips.slice(0, 3).map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-black/8 bg-[#f6f3ee] px-3 py-1.5 text-[0.72rem] font-medium text-black/58"
          >
            {chip}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function ComingSoonPanel({ config }: { config: ServiceWorkspaceConfig }) {
  return (
    <div className="overflow-hidden rounded-[36px] bg-[#0f0f10] p-3 text-white shadow-[0_24px_48px_rgba(0,0,0,0.16)]">
      <div className="rounded-[30px] bg-gradient-to-br from-[#f3efe7] via-[#f8f5ef] to-[#ece4d6] p-5 text-[#111111]">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-black/8 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em]">
            Coming soon
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/8">
            <config.panelIcon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-[2.05rem] font-semibold leading-none tracking-tight">{config.panelTitle}</h2>
          <p className="mt-3 max-w-[24ch] text-sm leading-6 text-black/62">{config.panelDescription}</p>
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          {config.panelChips.map((chip) => (
            <div
              key={chip.label}
              className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/72 px-3 py-2 text-xs font-medium text-black/68"
            >
              <chip.icon className="h-3.5 w-3.5" />
              {chip.label}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link
          href="/mouse-fit"
          className="inline-flex items-center justify-center rounded-[24px] bg-white px-4 py-3 text-sm font-semibold text-[#111111] transition hover:bg-[#f4f2ed]"
        >
          Open Mouse Fit
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-[24px] bg-white/8 px-4 py-3 text-sm font-medium text-white/78 transition hover:bg-white/12"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

function ComingSoonWorkspace({ config }: { config: ServiceWorkspaceConfig }) {
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
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-black/35">{config.badge}</p>
                    <h1 className="mt-3 text-[2.5rem] font-semibold leading-none tracking-tight sm:text-[3.5rem] xl:text-[4.2rem]">
                      {config.headline}
                    </h1>
                    <span className="mt-4 inline-flex h-11 items-center whitespace-nowrap rounded-full border border-black/8 bg-white px-4 text-sm font-semibold text-[#111111] shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                      Coming soon
                    </span>
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-black/58 sm:text-base">{config.description}</p>
                  </div>

                  <div className="flex flex-wrap items-start gap-x-8 gap-y-4 lg:ml-6 lg:shrink-0 lg:justify-end lg:pt-2">
                    {config.stats.slice(0, 2).map((stat) => (
                      <StatBlock key={`${stat.label}-${stat.value}`} {...stat} />
                    ))}
                  </div>
                </div>
              </div>

              <section>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-[2rem] font-semibold tracking-tight">Preview</h2>
                    <p className="mt-2 text-sm text-black/45">This service page is reserved. Mouse Fit is the only live service dashboard right now.</p>
                  </div>
                  <Link
                    href="/mouse-fit"
                    className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
                  >
                    Open Mouse Fit
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {config.featureCards.slice(0, 3).map((card) => (
                    <ComingSoonPreviewCard key={card.title} card={card} />
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-black/6 bg-white/72 p-5 shadow-[0_18px_36px_rgba(0,0,0,0.04)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-black/35">Available Now</p>
                <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#111111]">Mouse Fit is the active dashboard</h2>
                <p className="mt-3 max-w-[58ch] text-sm leading-6 text-black/58">
                  Survey, measurement, grip classification, database browsing, and report output all live under Mouse Fit today. The other service tabs stay in preview until they are ready.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/mouse-fit"
                    className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
                  >
                    Open Mouse Fit
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-[#f6f3ee] px-5 py-3 text-sm font-medium text-black/62 transition hover:bg-white"
                  >
                    View Dashboard
                  </Link>
                </div>
              </section>
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-5 xl:self-start">
          <ComingSoonPanel config={config} />
          <SummaryPanel config={config} />
        </aside>
      </div>
    </motion.div>
  );
}

export default function ServiceWorkspace({ config }: { config: ServiceWorkspaceConfig }) {
  if (config.status === "coming_soon") {
    return <ComingSoonWorkspace config={config} />;
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
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-black/35">
                      {config.badge}
                    </p>
                    <h1 className="mt-3 text-[2.5rem] font-semibold leading-none tracking-tight sm:text-[3.5rem] xl:text-[4.2rem]">
                      {config.headline}
                    </h1>
                    {config.ctaHref ? (
                      <Link
                        href={config.ctaHref}
                        className="mt-4 inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-[#111111] px-5 text-sm font-semibold text-white transition hover:bg-black"
                      >
                        {config.ctaLabel}
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <div className="mt-4 inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-[#111111] px-5 text-sm font-semibold text-white">
                        {config.ctaLabel}
                      </div>
                    )}
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-black/58 sm:text-base">
                      {config.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-start gap-x-8 gap-y-4 lg:ml-6 lg:shrink-0 lg:justify-end lg:pt-2">
                    {config.stats.map((stat) => (
                      <StatBlock key={`${stat.label}-${stat.value}`} {...stat} />
                    ))}
                  </div>
                </div>
              </div>

              <section>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <h2 className="text-[2rem] font-semibold tracking-tight">{config.sectionTitle}</h2>
                    <span className="text-sm font-medium text-black/42">{config.sectionCountLabel}</span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {config.featureCards.map((card) => (
                    <FeatureTile key={card.title} card={card} />
                  ))}
                </div>
              </section>

              <section>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <h2 className="text-[2rem] font-semibold tracking-tight">{config.workflowTitle}</h2>
                    <span className="text-sm font-medium text-black/42">{config.workflowCountLabel}</span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                  {config.workflowCards.map((card) => (
                    <WorkflowTile key={card.title} card={card} />
                  ))}
                </div>
              </section>
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-5 xl:self-start">
          <HeroPanel config={config} />
          <SummaryPanel config={config} />
        </aside>
      </div>
    </motion.div>
  );
}

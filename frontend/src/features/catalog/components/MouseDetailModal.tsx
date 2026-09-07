"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import Link from "next/link";
import type { MouseCatalogItem } from "../catalog.types";
import { buildSpecEntries, formatMatchDisplay } from "../catalog.utils";
import { PlaceholderImage } from "./PlaceholderImage";

export function MouseDetailModal({
  item,
  onClose,
}: {
  item: MouseCatalogItem;
  onClose: () => void;
}) {
  const { core, additional } = buildSpecEntries(item.data);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end justify-end">
        <motion.button
          type="button"
          aria-label="Close mouse details"
          className="absolute inset-0 bg-[var(--shell-overlay)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mouse-detail-title"
          className="mf-glass-modal relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-lg md:h-full md:max-h-none md:max-w-[760px] md:rounded-none md:border-y-0 md:border-r-0"
        >
          <div className="flex items-center justify-between border-b border-[var(--shell-border-strong)] px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--shell-text-tertiary)]">Mouse details</p>
              <h2 id="mouse-detail-title" className="mt-1 truncate text-xl font-semibold text-[var(--shell-text-primary)]">{item.displayTitle}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mf-glass-button inline-flex h-10 w-10 items-center justify-center rounded-md"
              aria-label="Close mouse details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mf-glass-scroll grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="border-b border-[var(--shell-border-strong)] p-4 lg:border-b-0 lg:border-r lg:border-[var(--shell-border-strong)] lg:p-5">
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-white p-4">
                <PlaceholderImage title={item.displayTitle} imageUrl={item.imageUrl} />
              </div>

              <div className="mt-5 grid gap-3">
                <div className="mf-glass-panel-soft rounded-md px-4 py-4">
                  <p className="text-xs font-medium text-[var(--shell-text-tertiary)]">Survey score</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--shell-text-primary)]">
                    {formatMatchDisplay(item.matchPercentLabel)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--shell-text-secondary)]">Available once fit scoring is wired to survey results.</p>
                </div>
                <div className="mf-glass-panel-soft rounded-md px-4 py-4">
                  <p className="text-xs font-medium text-[var(--shell-text-tertiary)]">Quick read</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--shell-text-secondary)]">
                    {item.data.shape || "Shape data pending"}, {item.data.hand_compatibility || "hand fit notes pending"}.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <section>
                <h3 className="text-sm font-semibold text-[var(--shell-text-primary)]">Geometry and fit</h3>
                <Link
                  href={`/mouse-fit/simulator?mouse=${encodeURIComponent(item.data.id)}`}
                  className="mf-glass-button mt-4 inline-flex items-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-[var(--shell-text-primary)]"
                >
                  Open 3D model in Mouse Fit Simulator
                  <ExternalLink className="h-4 w-4 text-[var(--shell-text-secondary)]" />
                </Link>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {core.map((entry) =>
                    entry.label === "Product Link" ? (
                      <a
                        key={entry.label}
                        href={entry.value}
                        target="_blank"
                        rel="noreferrer"
                        className="mf-glass-button flex items-center justify-between rounded-md px-4 py-3 text-sm font-medium text-[var(--shell-text-primary)]"
                      >
                        <span>{entry.label}</span>
                        <ExternalLink className="h-4 w-4 text-[var(--shell-text-secondary)]" />
                      </a>
                    ) : (
                      <div key={entry.label} className="mf-glass-panel-soft rounded-md px-4 py-3">
                        <p className="text-xs font-medium text-[var(--shell-text-tertiary)]">
                          {entry.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[var(--shell-text-primary)]">{entry.value}</p>
                      </div>
                    ),
                  )}
                </div>
              </section>

              {additional.length > 0 ? (
                <section>
                  <h3 className="text-sm font-semibold text-[var(--shell-text-primary)]">Availability and source data</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {additional.map((entry) => (
                      <div key={entry.label} className="mf-glass-panel-soft rounded-md px-4 py-3">
                        <p className="text-xs font-medium text-[var(--shell-text-tertiary)]">
                          {entry.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[var(--shell-text-primary)]">{entry.value}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

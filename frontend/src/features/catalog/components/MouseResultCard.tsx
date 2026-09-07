"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import {
  buildCardTags,
  formatDimension,
  formatMatchDisplay,
  hasEloShapes3dModel,
} from "../catalog.utils";
import type { MouseCatalogItem } from "../catalog.types";
import { PlaceholderImage } from "./PlaceholderImage";

export function MouseResultCard({
  item,
  onSelect,
}: {
  item: MouseCatalogItem;
  onSelect: (item: MouseCatalogItem) => void;
}) {
  const tags = buildCardTags(item.data).slice(0, 3);
  const has3dModel = hasEloShapes3dModel(item.data);

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(item)}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="mf-glass-card group flex h-full min-w-0 flex-col rounded-lg p-3 text-left"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
          <span className="text-xs font-medium text-[var(--shell-text-secondary)]">
            {item.data.brand || "Unknown brand"}
          </span>
          {item.data.availability_status ? (
            <span className="text-xs text-[var(--shell-text-tertiary)]">
              {item.data.availability_status}
            </span>
          ) : null}
          {has3dModel ? (
            <span className="rounded-full border border-[var(--shell-border-strong)] bg-[var(--shell-surface-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--shell-text-primary)]">
              3D on EloShapes
            </span>
          ) : null}
        </div>
        <span className="text-xs text-[var(--shell-text-tertiary)]">Details</span>
      </div>

      <div className="relative mt-3 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-white p-3">
        <PlaceholderImage
          title={item.displayTitle}
          imageUrl={item.showImagePlaceholder ? null : item.imageUrl}
        />
      </div>

      <h3 className="mt-3 line-clamp-2 min-h-10 text-base font-semibold leading-5 text-[var(--shell-text-primary)]">
        {item.displayTitle}
      </h3>

      <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-md bg-[var(--shell-border-strong)]">
        {[
          ["L", formatDimension(item.data.length_mm)],
          ["W", formatDimension(item.data.width_mm)],
          ["H", formatDimension(item.data.height_mm)],
        ].map(([label, value]) => (
          <div key={label} className="bg-[var(--shell-surface-soft)] px-2 py-2">
            <p className="text-[10px] text-[var(--shell-text-tertiary)]">{label}</p>
            <p className="truncate text-xs font-medium text-[var(--shell-text-primary)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span key={tag} className="text-xs text-[var(--shell-text-secondary)]">{tag}</span>
          ))
        ) : (
          <span className="text-xs text-[var(--shell-text-secondary)]">Raw specs available</span>
        )}
        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-xs text-[var(--shell-text-secondary)]">
          <span className="text-[var(--shell-text-tertiary)]">Match</span>
          <span className="font-semibold text-[var(--shell-text-primary)]">
            {formatMatchDisplay(item.matchPercentLabel)}
          </span>
        </span>
      </div>

      <div className="mt-auto border-t border-[var(--shell-border-strong)] pt-3">
        <div className="flex items-center justify-between text-sm text-[var(--shell-text-secondary)]">
          <span>Open spec sheet</span>
          <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </motion.button>
  );
}

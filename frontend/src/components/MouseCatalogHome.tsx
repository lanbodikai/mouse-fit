"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ExternalLink,
  ImageOff,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { getMice } from "@/lib/api";
import type { Mouse } from "@/lib/types";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import DashboardAiAssistant from "@/components/dashboard/DashboardAiAssistant";
import { ShellPage, ShellPanel } from "@/components/layout/ShellPage";

type SortKey = "name" | "weight";

type MouseCatalogItem = {
  id: string;
  displayTitle: string;
  matchPercentLabel: string;
  showImagePlaceholder: boolean;
  imageUrl: string | null;
  searchText: string;
  data: Mouse;
};

type SpecEntry = {
  label: string;
  value: string;
};

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "name", label: "Name" },
  { value: "weight", label: "Weight" },
];

function toMouseCatalogItem(mouse: Mouse): MouseCatalogItem {
  const displayTitle = [mouse.brand, mouse.model, mouse.variant].filter(Boolean).join(" ").trim() || "Unnamed mouse";
  const searchText = [
    mouse.brand,
    mouse.model,
    mouse.variant,
    mouse.shape,
    mouse.hump,
    mouse.side_profile,
    mouse.hand_compatibility,
    mouse.availability_status,
    ...(mouse.grips ?? []),
    ...(mouse.hands ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    id: mouse.id,
    displayTitle,
    matchPercentLabel: "---",
    showImagePlaceholder: !mouse.image_url,
    imageUrl: mouse.image_url ?? null,
    searchText,
    data: mouse,
  };
}

function compareMaybeNumber(a: number | null | undefined, b: number | null | undefined): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

function formatDimension(value: number | null | undefined): string {
  return value != null ? `${value} mm` : "—";
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(parsed));
}

function formatMatchDisplay(value: string): string {
  return value === "---" ? "Pending" : value;
}

function buildCardTags(mouse: Mouse): string[] {
  return [
    mouse.weight_g != null ? `${mouse.weight_g} g` : null,
    mouse.shape ?? null,
  ].filter((value): value is string => Boolean(value));
}

function buildSpecEntries(mouse: Mouse): { core: SpecEntry[]; additional: SpecEntry[] } {
  const core: SpecEntry[] = [
    { label: "Brand", value: mouse.brand },
    { label: "Model", value: mouse.model },
    { label: "Variant", value: mouse.variant ?? "" },
    { label: "Availability", value: mouse.availability_status ?? "" },
    { label: "Weight", value: mouse.weight_g != null ? `${mouse.weight_g} g` : "" },
    { label: "Length", value: mouse.length_mm != null ? formatDimension(mouse.length_mm) : "" },
    { label: "Width", value: mouse.width_mm != null ? formatDimension(mouse.width_mm) : "" },
    { label: "Height", value: mouse.height_mm != null ? formatDimension(mouse.height_mm) : "" },
    { label: "Shape", value: mouse.shape ?? "" },
    { label: "Hump", value: mouse.hump ?? "" },
    { label: "Side Profile", value: mouse.side_profile ?? "" },
    { label: "Hand Compatibility", value: mouse.hand_compatibility ?? "" },
    { label: "Compatible Grips", value: mouse.grips?.join(", ") ?? "" },
    { label: "Hand Sizes", value: mouse.hands?.join(", ") ?? "" },
    { label: "Source", value: mouse.source_handle ?? "" },
    { label: "Product Link", value: mouse.product_url ?? "" },
  ].filter((entry) => entry.value);

  const additional: SpecEntry[] = [
    { label: "Shape Raw", value: mouse.shape_raw ?? "" },
    { label: "Hump Raw", value: mouse.hump_raw ?? "" },
    { label: "Hump Bucket", value: mouse.hump_bucket ?? "" },
    { label: "Front Flare", value: mouse.front_flare_raw ?? "" },
    { label: "Side Curvature", value: mouse.side_curvature_raw ?? "" },
    { label: "Brand Discount", value: mouse.brand_discount ?? "" },
    { label: "Discount Code", value: mouse.discount_code ?? "" },
    { label: "Created", value: formatDate(mouse.created_at) ?? "" },
    { label: "Updated", value: formatDate(mouse.updated_at) ?? "" },
  ].filter((entry) => entry.value);

  return { core, additional };
}

function PlaceholderImage({ title, imageUrl }: { title: string; imageUrl: string | null }) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const showPending = !imageUrl || failedImageUrl === imageUrl;

  if (!showPending) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          onError={() => setFailedImageUrl(imageUrl)}
          className="h-full w-full object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
        />
      </>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-white text-[var(--shell-text-tertiary)]">
      <span className="mf-glass-pill absolute right-3 top-3 rounded-full px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[var(--shell-text-secondary)]">
        Image Pending
      </span>
      <div className="shell-surface-soft flex h-14 w-14 items-center justify-center rounded-[18px]">
        <ImageOff className="h-6 w-6" />
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--shell-text-tertiary)]">Image Pending</p>
        <p className="mt-1 text-sm text-[var(--shell-text-secondary)]">No rendered image available yet</p>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="mf-glass-card rounded-[28px] p-4">
          <div className="shell-surface-inset aspect-[5/4] animate-pulse rounded-[22px]" />
          <div className="mt-4 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-[var(--shell-accent-soft)]" />
            <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--shell-border-strong)]" />
            <div className="mt-4 flex gap-2">
              <div className="h-7 w-20 animate-pulse rounded-full bg-[var(--shell-border-soft)]" />
              <div className="h-7 w-24 animate-pulse rounded-full bg-[var(--shell-border-soft)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MouseResultCard({
  item,
  onSelect,
}: {
  item: MouseCatalogItem;
  onSelect: (item: MouseCatalogItem) => void;
}) {
  const tags = buildCardTags(item.data).slice(0, 3);

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(item)}
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="mf-glass-card group rounded-[28px] p-4 text-left"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-2">
          <span className="mf-glass-pill rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--shell-text-secondary)]">
            {item.data.brand || "Unknown Brand"}
          </span>
          {item.data.availability_status ? (
            <span className="shell-surface-soft rounded-full px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-[var(--shell-text-tertiary)]">
              {item.data.availability_status}
            </span>
          ) : null}
        </div>
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--shell-text-tertiary)]">Spec deck</span>
      </div>

      <div className="relative mt-4 flex aspect-[5/4] items-center justify-center overflow-hidden rounded-[22px] bg-white p-4">
        <PlaceholderImage title={item.displayTitle} imageUrl={item.showImagePlaceholder ? null : item.imageUrl} />
      </div>

      <div className="mt-4 min-w-0">
        <h3 className="text-lg font-semibold leading-tight tracking-tight text-[var(--shell-text-primary)]">
          {item.displayTitle}
        </h3>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span key={tag} className="shell-surface-soft rounded-full px-3 py-1.5 text-xs text-[var(--shell-text-secondary)]">
              {tag}
            </span>
          ))
        ) : (
          <span className="shell-surface-soft rounded-full px-3 py-1.5 text-xs text-[var(--shell-text-secondary)]">
            Open for raw specs
          </span>
        )}
        <span className="shell-surface-soft ml-auto inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs text-[var(--shell-text-secondary)]">
          <span className="font-medium uppercase tracking-[0.14em] text-[var(--shell-text-tertiary)]">Survey</span>
          <span className="font-semibold text-[var(--shell-text-primary)]">{formatMatchDisplay(item.matchPercentLabel)}</span>
        </span>
      </div>

      <div className="mt-5 border-t border-[var(--shell-border-strong)] pt-4">
        <div className="flex items-center justify-between text-sm text-[var(--shell-text-secondary)]">
          <span>Open full spec sheet</span>
          <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </motion.button>
  );
}

function MouseDetailModal({
  item,
  onClose,
}: {
  item: MouseCatalogItem;
  onClose: () => void;
}) {
  const { core, additional } = buildSpecEntries(item.data);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
        <motion.button
          type="button"
          aria-label="Close mouse details"
          className="absolute inset-0 bg-[var(--shell-overlay)] backdrop-blur-[8px]"
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
          className="mf-glass-modal relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-[32px] sm:max-w-5xl"
        >
          <div className="flex items-center justify-between border-b border-[var(--shell-border-strong)] px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--shell-text-tertiary)]">Mouse Details</p>
              <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-[var(--shell-text-primary)]">{item.displayTitle}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mf-glass-button inline-flex h-10 w-10 items-center justify-center rounded-2xl"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mf-glass-scroll grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="border-b border-[var(--shell-border-strong)] p-5 lg:border-b-0 lg:border-r lg:border-[var(--shell-border-strong)] lg:p-6">
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[24px] bg-white p-5">
                <PlaceholderImage title={item.displayTitle} imageUrl={item.imageUrl} />
              </div>

              <div className="mt-5 grid gap-3">
                <div className="mf-glass-panel-soft rounded-[22px] px-4 py-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--shell-text-tertiary)]">Survey Score</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--shell-text-primary)]">
                    {formatMatchDisplay(item.matchPercentLabel)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--shell-text-secondary)]">Available once fit scoring is wired to survey results.</p>
                </div>
                <div className="mf-glass-panel-soft rounded-[22px] px-4 py-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--shell-text-tertiary)]">Quick Read</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--shell-text-secondary)]">
                    {item.data.shape || "Shape data pending"}, {item.data.hand_compatibility || "hand fit notes pending"}.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--shell-text-tertiary)]">Specs</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {core.map((entry) =>
                    entry.label === "Product Link" ? (
                      <a
                        key={entry.label}
                        href={entry.value}
                        target="_blank"
                        rel="noreferrer"
                        className="mf-glass-button flex items-center justify-between rounded-[22px] px-4 py-3 text-sm font-medium text-[var(--shell-text-primary)]"
                      >
                        <span>{entry.label}</span>
                        <ExternalLink className="h-4 w-4 text-[var(--shell-text-secondary)]" />
                      </a>
                    ) : (
                      <div key={entry.label} className="mf-glass-panel-soft rounded-[22px] px-4 py-3">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--shell-text-tertiary)]">
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
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--shell-text-tertiary)]">Additional Data</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {additional.map((entry) => (
                      <div key={entry.label} className="mf-glass-panel-soft rounded-[22px] px-4 py-3">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--shell-text-tertiary)]">
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

export default function MouseCatalogHome() {
  const authReady = useRequireAuth();
  const searchParams = useSearchParams();
  const [mice, setMice] = useState<MouseCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [selectedItem, setSelectedItem] = useState<MouseCatalogItem | null>(null);
  const deferredQuery = useDeferredValue(query);
  const assistantPrompt = searchParams.get("q")?.trim() ?? "";

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    async function loadMice() {
      try {
        setLoading(true);
        setError(null);
        const response = await getMice();
        if (cancelled) return;
        setMice(response.map(toMouseCatalogItem));
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "MouseFit could not load mice. Start the backend server, then try again.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMice();

    return () => {
      cancelled = true;
    };
  }, [authReady, reloadToken]);

  useEffect(() => {
    if (!selectedItem) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedItem(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedItem]);

  const visibleMice = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const filtered = normalizedQuery
      ? mice.filter((mouse) => mouse.searchText.includes(normalizedQuery))
      : mice;

    return [...filtered].sort((left, right) => {
      if (sortKey === "name") {
        return left.displayTitle.localeCompare(right.displayTitle);
      }

      if (sortKey === "weight") {
        return compareMaybeNumber(left.data.weight_g, right.data.weight_g);
      }

      return 0;
    });
  }, [deferredQuery, mice, sortKey]);

  if (!authReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mf-glass-pill inline-flex items-center gap-3 rounded-full px-5 py-4 text-sm text-[var(--shell-text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading MouseFit...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex w-full min-w-0 flex-col lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <ShellPage
            variant="glass"
            eyebrow="MouseFit"
            title="Database"
            description=""
          >
            <div className="min-w-0 space-y-5">
              <ShellPanel variant="glass" className="space-y-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-text-tertiary)]" />
                    <input
                      type="text"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by brand, model, shape, grip, or hand size"
                      className="mf-glass-input w-full rounded-[22px] px-12 py-3 text-sm outline-none"
                    />
                    {query ? (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="mf-glass-button absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[16px]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="mf-glass-pill inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm text-[var(--shell-text-secondary)]">
                      <span className="font-medium text-[var(--shell-text-secondary)]">Sort</span>
                      <select
                        value={sortKey}
                        onChange={(event) => setSortKey(event.target.value as SortKey)}
                        className="bg-transparent font-semibold text-[var(--shell-text-primary)] outline-none"
                      >
                        {SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </ShellPanel>

              {loading ? <LoadingGrid /> : null}

              {!loading && error ? (
                <ShellPanel variant="glass" title="Unable to load mice" description={error}>
                  <button
                    type="button"
                    onClick={() => setReloadToken((value) => value + 1)}
                    className="mf-glass-button mf-glass-button-primary inline-flex items-center rounded-[20px] px-5 py-3 text-sm font-semibold"
                  >
                    Retry
                  </button>
                </ShellPanel>
              ) : null}

              {!loading && !error ? (
                visibleMice.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleMice.map((mouse) => (
                      <MouseResultCard
                        key={mouse.id}
                        item={mouse}
                        onSelect={setSelectedItem}
                      />
                    ))}
                  </div>
                ) : (
                  <ShellPanel
                    variant="glass"
                    title="No mice match this search"
                    description="Try a different model name, grip type, or measurement keyword."
                  >
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="mf-glass-button mf-glass-button-primary inline-flex items-center rounded-[20px] px-5 py-3 text-sm font-semibold"
                      >
                        Clear search
                      </button>
                    </div>
                  </ShellPanel>
                )
              ) : null}
            </div>
          </ShellPage>
        </div>

        <aside className="mt-5 flex min-w-0 flex-col border-t border-[var(--shell-border-strong)] pt-5 lg:mt-0 lg:w-[360px] lg:shrink-0 lg:self-stretch lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 xl:pl-6">
          <div className="flex min-h-[min(620px,72dvh)] flex-1 flex-col lg:sticky lg:top-5 lg:max-h-[calc(100vh-7rem)]">
            <DashboardAiAssistant
              initialPrompt={assistantPrompt}
              className="h-full min-h-0 max-h-full"
            />
          </div>
        </aside>
      </div>

      {selectedItem ? <MouseDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} /> : null}
    </>
  );
}

"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthState } from "@/hooks/useAuthState";
import { ShellPage, ShellPanel } from "@/components/layout/ShellPage";
import { getMice } from "@/services/api";
import { DragonCatalogAssistant } from "./components/DragonCatalogAssistant";
import { LoadingGrid } from "./components/LoadingGrid";
import { MouseDetailModal } from "./components/MouseDetailModal";
import { MouseResultCard } from "./components/MouseResultCard";
import type { MouseCatalogItem, SortKey } from "./catalog.types";
import {
  compareMaybeNumber,
  hasEloShapes3dModel,
  SORT_OPTIONS,
  toMouseCatalogItem,
} from "./catalog.utils";

export default function MouseCatalogPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { ready: authReady } = useAuthState();
  const [mice, setMice] = useState<MouseCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [showOnlyThreeD, setShowOnlyThreeD] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MouseCatalogItem | null>(null);
  const deferredQuery = useDeferredValue(query);
  const assistantPrompt = searchParams.get("q")?.trim() ?? "";
  const assistantOpen = searchParams.get("assistant") === "open";
  const selectedMouseId = searchParams.get("mouse")?.trim() ?? "";

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    async function loadMice() {
      try {
        setLoading(true);
        setError(null);
        const response = await getMice();
        if (!cancelled) setMice(response.map(toMouseCatalogItem));
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "MouseFit could not load mice. Start the backend server, then try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadMice();
    return () => {
      cancelled = true;
    };
  }, [authReady, reloadToken]);

  useEffect(() => {
    if (!selectedMouseId || mice.length === 0) return;
    const nextSelectedItem = mice.find((mouse) => mouse.id === selectedMouseId) ?? null;
    if (nextSelectedItem) setSelectedItem(nextSelectedItem);
  }, [mice, selectedMouseId]);

  const visibleMice = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const searched = normalizedQuery
      ? mice.filter((mouse) => mouse.searchText.includes(normalizedQuery))
      : mice;
    const filtered = showOnlyThreeD
      ? searched.filter((mouse) => hasEloShapes3dModel(mouse.data))
      : searched;

    return [...filtered].sort((left, right) => {
      if (sortKey === "name") return left.displayTitle.localeCompare(right.displayTitle);
      return compareMaybeNumber(left.data.weight_g, right.data.weight_g);
    });
  }, [deferredQuery, mice, showOnlyThreeD, sortKey]);
  const threeDModelCount = useMemo(
    () => mice.filter((mouse) => hasEloShapes3dModel(mouse.data)).length,
    [mice],
  );

  const buildPathWithParam = useCallback(
    (key: string, value?: string): string => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      const nextQuery = params.toString();
      return nextQuery ? `${pathname}?${nextQuery}` : pathname;
    },
    [pathname, searchParams],
  );

  const handleMouseClose = useCallback(() => {
    setSelectedItem(null);
    if (selectedMouseId) router.replace(buildPathWithParam("mouse"));
  }, [buildPathWithParam, router, selectedMouseId]);

  useEffect(() => {
    if (!selectedItem) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") handleMouseClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleMouseClose, selectedItem]);

  const handleMouseSelect = useCallback(
    (item: MouseCatalogItem) => {
      setSelectedItem(item);
    },
    [],
  );

  if (!authReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="inline-flex items-center gap-3 text-sm text-[var(--shell-text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading MouseFit...
        </div>
      </div>
    );
  }

  return (
    <>
      <ShellPage
        layout="wide"
        eyebrow="Mouse catalog"
        title="Database"
        description="Search the current mouse catalog by model, dimensions, shape, grip, or hand compatibility."
      >
        <div className="min-w-0 space-y-5">
            <section className="rounded-lg border border-[var(--shell-border-strong)] bg-[var(--shell-surface-raised)] p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-text-tertiary)]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search brand, model, shape, grip, or hand size"
                    className="mf-glass-input h-11 w-full rounded-md pl-10 pr-11 text-sm outline-none"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--shell-text-secondary)] hover:bg-[var(--shell-surface-soft)]"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  <p className="whitespace-nowrap text-sm text-[var(--shell-text-secondary)]">
                    <span className="font-semibold text-[var(--shell-text-primary)]">{visibleMice.length}</span>{" "}
                    {visibleMice.length === 1 ? "mouse" : "mice"}
                  </p>
                  <p className="hidden whitespace-nowrap text-xs text-[var(--shell-text-tertiary)] xl:block">
                    {threeDModelCount} with 3D on EloShapes
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowOnlyThreeD((value) => !value)}
                    aria-pressed={showOnlyThreeD}
                    className={`h-11 whitespace-nowrap rounded-md border px-3 text-xs font-semibold transition-colors ${
                      showOnlyThreeD
                        ? "border-[var(--shell-text-primary)] bg-[var(--shell-text-primary)] text-[var(--shell-text-inverse)]"
                        : "border-[var(--shell-border-strong)] bg-[var(--shell-surface-soft)] text-[var(--shell-text-secondary)]"
                    }`}
                  >
                    3D on EloShapes
                  </button>
                  <label className="inline-flex h-11 items-center gap-3 rounded-md border border-[var(--shell-border-strong)] bg-[var(--shell-surface-soft)] px-3 text-sm text-[var(--shell-text-secondary)]">
                    <span>Sort</span>
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
            </section>

            {loading ? <LoadingGrid /> : null}

            {!loading && error ? (
              <ShellPanel title="Unable to load mice" description={error}>
                <button
                  type="button"
                  onClick={() => setReloadToken((value) => value + 1)}
                  className="inline-flex h-10 items-center rounded-md bg-[var(--shell-accent)] px-4 text-sm font-semibold text-[var(--shell-text-inverse)]"
                >
                  Retry
                </button>
              </ShellPanel>
            ) : null}

            {!loading && !error ? (
              visibleMice.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleMice.map((mouse) => (
                    <MouseResultCard key={mouse.id} item={mouse} onSelect={handleMouseSelect} />
                  ))}
                </div>
              ) : (
                <ShellPanel
                  title="No mice match this search"
                  description="Try a different model name, grip type, or measurement keyword."
                >
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="inline-flex h-10 items-center rounded-md bg-[var(--shell-accent)] px-4 text-sm font-semibold text-[var(--shell-text-inverse)]"
                  >
                    Clear search
                  </button>
                </ShellPanel>
              )
            ) : null}
        </div>
      </ShellPage>

      <DragonCatalogAssistant
        initialPrompt={assistantPrompt}
        autoRunInitialPrompt={assistantOpen}
      />

      {selectedItem ? <MouseDetailModal item={selectedItem} onClose={handleMouseClose} /> : null}
    </>
  );
}

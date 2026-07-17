"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ExternalLink,
  Filter,
  Grid3X3,
  Layers,
  List,
  Mouse,
  Ruler,
  Scale,
  Search,
  SlidersHorizontal,
  Sparkles,
  Weight,
  X,
} from "lucide-react";
import { getMice } from "@/lib/api";
import type { Mouse as MouseType } from "@/lib/types";

type SortKey = "brand" | "weight_g" | "length_mm" | "width_mm" | "height_mm" | "price_usd";
type SortDir = "asc" | "desc";
type ViewMode = "grid" | "list";

const SHAPE_OPTIONS = ["Ergonomic", "Symmetrical", "Ambidextrous"];
const GRIP_OPTIONS = ["Palm", "Claw", "Fingertip"];
const WEIGHT_RANGES = [
  { label: "Ultralight (<60g)", min: 0, max: 60 },
  { label: "Light (60-80g)", min: 60, max: 80 },
  { label: "Medium (80-100g)", min: 80, max: 100 },
  { label: "Heavy (100g+)", min: 100, max: 999 },
];

function formatDimension(val: number | null | undefined): string {
  return val != null ? `${val}mm` : "—";
}

function matchesSearch(mouse: MouseType, query: string): boolean {
  const q = query.toLowerCase();
  const fields = [
    mouse.brand,
    mouse.model,
    mouse.variant,
    mouse.shape,
    mouse.hump,
    ...(mouse.grips ?? []),
    ...(mouse.hands ?? []),
  ];
  return fields.some((f) => f && f.toLowerCase().includes(q));
}

function ShapeIcon({ shape }: { shape: string | null | undefined }) {
  if (!shape) return null;
  const s = shape.toLowerCase();
  if (s.includes("ergo"))
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12c0-4 3-8 8-8s8 4 8 8-1 8-5 8c-2 0-3-2-5-2s-3 2-6 2" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="12" rx="7" ry="9" strokeLinecap="round" />
    </svg>
  );
}

function WeightBadge({ weight }: { weight: number | null | undefined }) {
  if (weight == null) return null;
  let color = "text-accent-emerald border-accent-emerald bg-accent-emerald-soft";
  let label = "Ultra";
  if (weight >= 100) {
    color = "text-accent-amber border-accent-amber bg-accent-amber-soft";
    label = "Heavy";
  } else if (weight >= 80) {
    color = "text-accent-violet border-accent-violet bg-accent-violet-soft";
    label = "Med";
  } else if (weight >= 60) {
    color = "text-accent-gamer border-accent-gamer bg-accent-gamer-soft";
    label = "Light";
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      <Scale className="w-3 h-3" />
      {weight}g · {label}
    </span>
  );
}

function DimensionBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="relative h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

export default function MouseDatabase() {
  const [mice, setMice] = useState<MouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("brand");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [shapeFilter, setShapeFilter] = useState<string[]>([]);
  const [gripFilter, setGripFilter] = useState<string[]>([]);
  const [weightFilter, setWeightFilter] = useState<{ min: number; max: number } | null>(null);

  const [selectedMouse, setSelectedMouse] = useState<MouseType | null>(null);
  const [compareList, setCompareList] = useState<MouseType[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getMice()
      .then((data) => {
        if (!cancelled) {
          setMice(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "MouseFit could not load mice. Start the backend server, then try again.");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let result = mice;
    if (query) result = result.filter((m) => matchesSearch(m, query));
    if (shapeFilter.length) {
      result = result.filter((m) =>
        shapeFilter.some((sf) => m.shape?.toLowerCase().includes(sf.toLowerCase()))
      );
    }
    if (gripFilter.length) {
      result = result.filter((m) =>
        gripFilter.some((gf) => m.grips?.some((g) => g.toLowerCase().includes(gf.toLowerCase())))
      );
    }
    if (weightFilter) {
      result = result.filter(
        (m) => m.weight_g != null && m.weight_g >= weightFilter.min && m.weight_g < weightFilter.max
      );
    }
    result = [...result].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [mice, query, shapeFilter, gripFilter, weightFilter, sortKey, sortDir]);

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  const toggleCompare = useCallback((mouse: MouseType) => {
    setCompareList((prev) => {
      const exists = prev.some((m) => m.id === mouse.id);
      if (exists) return prev.filter((m) => m.id !== mouse.id);
      if (prev.length >= 3) return prev;
      return [...prev, mouse];
    });
  }, []);

  const activeFilterCount = (shapeFilter.length > 0 ? 1 : 0) + (gripFilter.length > 0 ? 1 : 0) + (weightFilter ? 1 : 0);

  const clearFilters = () => {
    setShapeFilter([]);
    setGripFilter([]);
    setWeightFilter(null);
  };

  if (loading) {
    return (
      <div className="studio-page flex min-h-[60vh] items-center justify-center rounded-[36px] border border-black/6 bg-[#f5f1ea] shadow-[0_18px_36px_rgba(0,0,0,0.04)]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[color:var(--accent-gamer)]"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="studio-page flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-[36px] border border-black/6 bg-[#f5f1ea] p-6 text-center shadow-[0_18px_36px_rgba(0,0,0,0.04)]">
        <div className="text-lg font-medium text-white/80">Could not load database</div>
        <div className="text-sm text-white/50">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl border border-accent-gamer bg-accent-gamer-soft px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-gamer-strong"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="studio-page mx-auto flex w-full max-w-7xl flex-col gap-5 rounded-[36px] border border-black/6 bg-[#f5f1ea] px-3 pb-8 pt-3 shadow-[0_18px_36px_rgba(0,0,0,0.04)] sm:px-5 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-1 pt-2">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent-gamer bg-accent-gamer-soft">
            <Mouse className="h-5 w-5 text-accent-gamer" />
          </div>
          Mouse Database
        </h1>
        <p className="text-sm text-white/50 pl-12">
          {mice.length} mice · Search, filter, compare
        </p>
      </div>

      {/* Search + Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brand, model, shape, grip..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/30 transition focus:outline-none focus:border-[color:var(--accent-gamer)] focus:bg-white/8"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
              filtersOpen || activeFilterCount > 0
                ? "border-accent-gamer bg-accent-gamer-soft text-accent-gamer-strong"
                : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--accent-gamer)] text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center justify-center rounded-xl p-2.5 transition ${
                viewMode === "grid" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center justify-center rounded-xl p-2.5 transition ${
                viewMode === "list" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {(["brand", "weight_g", "length_mm", "price_usd"] as SortKey[]).map((key) => {
              const labels: Record<SortKey, string> = {
                brand: "Name",
                weight_g: "Weight",
                length_mm: "Length",
                width_mm: "Width",
                height_mm: "Height",
                price_usd: "Price",
              };
              const active = sortKey === key;
              return (
                <button
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition ${
                    active
                      ? "border border-accent-gamer bg-accent-gamer-soft text-accent-gamer-strong"
                      : "border border-white/10 bg-white/5 text-white/50 hover:text-white/80"
                  }`}
                >
                  {labels[key]}
                  {active && (
                    <ChevronDown className={`h-3 w-3 transition-transform ${sortDir === "asc" ? "rotate-180" : ""}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap gap-8">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                      <Sparkles className="h-3 w-3" /> Shape
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SHAPE_OPTIONS.map((s) => {
                        const active = shapeFilter.includes(s);
                        return (
                          <button
                            key={s}
                            onClick={() =>
                              setShapeFilter((prev) =>
                                active ? prev.filter((x) => x !== s) : [...prev, s]
                              )
                            }
                            className={`rounded-xl border px-3.5 py-1.5 text-xs font-medium transition ${
                              active
                                ? "border-accent-violet bg-accent-violet-soft text-accent-violet"
                                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                      <Filter className="h-3 w-3" /> Grip
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {GRIP_OPTIONS.map((g) => {
                        const active = gripFilter.includes(g);
                        return (
                          <button
                            key={g}
                            onClick={() =>
                              setGripFilter((prev) =>
                                active ? prev.filter((x) => x !== g) : [...prev, g]
                              )
                            }
                            className={`rounded-xl border px-3.5 py-1.5 text-xs font-medium transition ${
                              active
                                ? "border-accent-emerald bg-accent-emerald-soft text-accent-emerald"
                                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                            }`}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                      <Weight className="h-3 w-3" /> Weight
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {WEIGHT_RANGES.map((w) => {
                        const active = weightFilter?.min === w.min && weightFilter?.max === w.max;
                        return (
                          <button
                            key={w.label}
                            onClick={() => setWeightFilter(active ? null : { min: w.min, max: w.max })}
                            className={`rounded-xl border px-3.5 py-1.5 text-xs font-medium transition ${
                              active
                                ? "border-accent-amber bg-accent-amber-soft text-accent-amber"
                                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                            }`}
                          >
                            {w.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <div className="mt-4 flex items-center gap-3 border-t border-white/5 pt-4">
                    <span className="text-xs text-white/40">{filtered.length} results</span>
                    <button
                      onClick={clearFilters}
                      className="text-xs text-accent-gamer hover:text-accent-gamer-strong transition"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Compare Bar */}
      <AnimatePresence>
        {compareList.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="studio-page-dark fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-accent-gamer bg-[#111111]/95 px-5 py-3 text-white shadow-[0_24px_48px_rgba(0,0,0,0.18)] backdrop-blur-xl"
          >
            <Layers className="h-4 w-4 text-accent-gamer" />
            <span className="text-sm font-medium text-white">
              {compareList.length}/3 selected
            </span>
            <div className="flex items-center gap-2">
              {compareList.map((m) => (
                <span key={m.id} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80">
                  {m.brand} {m.model}
                  <button onClick={() => toggleCompare(m)} className="text-white/40 hover:text-white/80">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <button
              onClick={() => setCompareOpen(true)}
              className="ml-2 rounded-xl border border-accent-gamer bg-accent-gamer-soft px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-gamer-strong"
            >
              Compare
            </button>
            <button
              onClick={() => setCompareList([])}
              className="text-white/40 hover:text-white/70 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Grid / List */}
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Search className="h-10 w-10 text-white/20" />
              <p className="text-sm text-white/40">No mice match your search</p>
              <button
                onClick={() => { setQuery(""); clearFilters(); }}
                className="text-xs text-accent-gamer hover:text-accent-gamer-strong transition"
              >
                Clear search &amp; filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              initial="hidden"
              animate="show"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }}
            >
              {filtered.map((mouse) => (
                <MouseGridCard
                  key={mouse.id}
                  mouse={mouse}
                  isSelected={selectedMouse?.id === mouse.id}
                  isComparing={compareList.some((m) => m.id === mouse.id)}
                  onSelect={() => setSelectedMouse(mouse)}
                  onToggleCompare={() => toggleCompare(mouse)}
                  compareDisabled={compareList.length >= 3 && !compareList.some((m) => m.id === mouse.id)}
                />
              ))}
            </motion.div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((mouse) => (
                <MouseListRow
                  key={mouse.id}
                  mouse={mouse}
                  isSelected={selectedMouse?.id === mouse.id}
                  isComparing={compareList.some((m) => m.id === mouse.id)}
                  onSelect={() => setSelectedMouse(mouse)}
                  onToggleCompare={() => toggleCompare(mouse)}
                  compareDisabled={compareList.length >= 3 && !compareList.some((m) => m.id === mouse.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedMouse && (
            <motion.div
              ref={detailRef}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="hidden lg:flex w-[340px] shrink-0 sticky top-24"
            >
              <MouseDetailPanel mouse={selectedMouse} onClose={() => setSelectedMouse(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile detail sheet */}
      <AnimatePresence>
        {selectedMouse && (
          <div className="lg:hidden fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setSelectedMouse(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl"
            >
              <MouseDetailPanel mouse={selectedMouse} onClose={() => setSelectedMouse(null)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compare Modal */}
      <AnimatePresence>
        {compareOpen && compareList.length >= 2 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70"
              onClick={() => setCompareOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="studio-page-dark relative max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-[#111111] p-6 text-white shadow-[0_28px_56px_rgba(0,0,0,0.24)]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-accent-gamer" />
                  Compare Mice
                </h2>
                <button onClick={() => setCompareOpen(false)} className="text-white/40 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <CompareTable mice={compareList} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MouseGridCard({
  mouse,
  isSelected,
  isComparing,
  onSelect,
  onToggleCompare,
  compareDisabled,
}: {
  mouse: MouseType;
  isSelected: boolean;
  isComparing: boolean;
  onSelect: () => void;
  onToggleCompare: () => void;
  compareDisabled: boolean;
}) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -3 }}
      onClick={onSelect}
      className={`group relative flex flex-col gap-3 rounded-2xl border p-5 cursor-pointer transition-all ${
        isSelected
          ? "border-accent-gamer bg-accent-gamer-soft"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
      }`}
    >
      {/* Compare checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleCompare(); }}
        disabled={compareDisabled && !isComparing}
        className={`absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-lg border transition ${
          isComparing
            ? "border-accent-gamer bg-accent-gamer-soft text-accent-gamer"
            : "border-white/10 bg-white/5 text-white/30 opacity-0 group-hover:opacity-100 hover:text-white/60"
        } ${compareDisabled && !isComparing ? "cursor-not-allowed opacity-30" : ""}`}
        title="Add to compare"
      >
        <Layers className="h-3.5 w-3.5" />
      </button>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">
          {mouse.brand}
        </div>
        <h3 className="text-base font-semibold text-white leading-tight">
          {mouse.model}
          {mouse.variant && (
            <span className="ml-1.5 text-xs font-normal text-white/40">{mouse.variant}</span>
          )}
        </h3>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <WeightBadge weight={mouse.weight_g} />
        {mouse.shape && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-accent-violet bg-accent-violet-soft px-2 py-0.5 text-[10px] font-medium text-accent-violet">
            <ShapeIcon shape={mouse.shape} />
            {mouse.shape}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-auto pt-2 border-t border-white/5">
        {[
          { label: "L", value: mouse.length_mm, unit: "mm" },
          { label: "W", value: mouse.width_mm, unit: "mm" },
          { label: "H", value: mouse.height_mm, unit: "mm" },
        ].map((d) => (
          <div key={d.label} className="text-center">
            <div className="text-[10px] text-white/30 mb-0.5">{d.label}</div>
            <div className="text-xs font-mono font-medium text-white/70">
              {d.value != null ? `${d.value}` : "—"}
            </div>
          </div>
        ))}
      </div>

      {mouse.grips && mouse.grips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {mouse.grips.map((g) => (
            <span key={g} className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
              {g}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function MouseListRow({
  mouse,
  isSelected,
  isComparing,
  onSelect,
  onToggleCompare,
  compareDisabled,
}: {
  mouse: MouseType;
  isSelected: boolean;
  isComparing: boolean;
  onSelect: () => void;
  onToggleCompare: () => void;
  compareDisabled: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-4 rounded-2xl border p-4 cursor-pointer transition-all ${
        isSelected
          ? "border-accent-gamer bg-accent-gamer-soft"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
      }`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggleCompare(); }}
        disabled={compareDisabled && !isComparing}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
          isComparing
            ? "border-accent-gamer bg-accent-gamer-soft text-accent-gamer"
            : "border-white/10 bg-white/5 text-white/30 hover:text-white/60"
        }`}
      >
        <Layers className="h-3.5 w-3.5" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">{mouse.brand}</span>
          <span className="text-sm font-semibold text-white truncate">{mouse.model}</span>
          {mouse.variant && <span className="text-xs text-white/40">{mouse.variant}</span>}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-3">
        <WeightBadge weight={mouse.weight_g} />
        {mouse.shape && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-accent-violet bg-accent-violet-soft px-2 py-0.5 text-[10px] font-medium text-accent-violet">
            {mouse.shape}
          </span>
        )}
      </div>

      <div className="hidden md:flex items-center gap-4 text-xs font-mono text-white/50">
        <span>{formatDimension(mouse.length_mm)}</span>
        <span className="text-white/15">×</span>
        <span>{formatDimension(mouse.width_mm)}</span>
        <span className="text-white/15">×</span>
        <span>{formatDimension(mouse.height_mm)}</span>
      </div>

      {mouse.price_usd != null && (
        <span className="text-xs font-medium text-accent-emerald">${mouse.price_usd}</span>
      )}
    </div>
  );
}

function MouseDetailPanel({ mouse, onClose }: { mouse: MouseType; onClose: () => void }) {
  const maxDim = 140;
  return (
    <div className="studio-page-dark flex w-full flex-col gap-5 rounded-3xl border border-white/10 bg-[#111111] p-6 text-white shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-accent-gamer mb-1">
            {mouse.brand}
          </div>
          <h2 className="text-xl font-bold text-white">
            {mouse.model}
            {mouse.variant && (
              <span className="ml-2 text-sm font-normal text-white/40">{mouse.variant}</span>
            )}
          </h2>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white transition p-1">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="h-px bg-white/5" />

      {/* Dimensions visual */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2">
          <Ruler className="h-3 w-3" /> Dimensions
        </h3>
        {[
          { label: "Length", value: mouse.length_mm, color: "var(--accent-gamer)" },
          { label: "Width", value: mouse.width_mm, color: "var(--accent-violet)" },
          { label: "Height", value: mouse.height_mm, color: "var(--accent-emerald)" },
        ].map((d) => (
          <div key={d.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">{d.label}</span>
              <span className="font-mono font-medium text-white/80">
                {d.value != null ? `${d.value}mm` : "—"}
              </span>
            </div>
            {d.value != null && <DimensionBar value={d.value} max={maxDim} color={d.color} />}
          </div>
        ))}
      </div>

      <div className="h-px bg-white/5" />

      {/* Specs */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Specifications</h3>
        <div className="grid grid-cols-2 gap-3">
          {mouse.weight_g != null && (
            <SpecItem label="Weight" value={`${mouse.weight_g}g`} />
          )}
          {mouse.shape && <SpecItem label="Shape" value={mouse.shape} />}
          {mouse.hump && <SpecItem label="Hump" value={mouse.hump} />}
          {mouse.side_profile && <SpecItem label="Side Profile" value={mouse.side_profile} />}
          {mouse.hand_compatibility && <SpecItem label="Hand Size" value={mouse.hand_compatibility} />}
          {mouse.price_usd != null && <SpecItem label="Price" value={`$${mouse.price_usd}`} />}
          {mouse.availability_status && <SpecItem label="Status" value={mouse.availability_status} />}
        </div>
      </div>

      {mouse.grips && mouse.grips.length > 0 && (
        <>
          <div className="h-px bg-white/5" />
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Compatible Grips</h3>
            <div className="flex flex-wrap gap-1.5">
              {mouse.grips.map((g) => (
                <span key={g} className="rounded-lg border border-accent-emerald bg-accent-emerald-soft px-2.5 py-1 text-xs font-medium text-accent-emerald">
                  {g}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {mouse.hands && mouse.hands.length > 0 && (
        <>
          <div className="h-px bg-white/5" />
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Hand Sizes</h3>
            <div className="flex flex-wrap gap-1.5">
              {mouse.hands.map((h) => (
                <span key={h} className="rounded-lg border border-accent-amber bg-accent-amber-soft px-2.5 py-1 text-xs font-medium text-accent-amber">
                  {h}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {mouse.product_url && (
        <>
          <div className="h-px bg-white/5" />
          <a
            href={mouse.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl border border-accent-gamer bg-accent-gamer-soft px-4 py-3 text-sm font-medium text-white transition hover:bg-accent-gamer-strong"
          >
            View Product <ExternalLink className="h-4 w-4" />
          </a>
        </>
      )}
    </div>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="text-[10px] text-white/30 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-white/80 leading-tight">{value}</div>
    </div>
  );
}

function CompareTable({ mice }: { mice: MouseType[] }) {
  const rows: { label: string; getValue: (m: MouseType) => string }[] = [
    { label: "Brand", getValue: (m) => m.brand },
    { label: "Model", getValue: (m) => m.model },
    { label: "Weight", getValue: (m) => m.weight_g != null ? `${m.weight_g}g` : "—" },
    { label: "Length", getValue: (m) => m.length_mm != null ? `${m.length_mm}mm` : "—" },
    { label: "Width", getValue: (m) => m.width_mm != null ? `${m.width_mm}mm` : "—" },
    { label: "Height", getValue: (m) => m.height_mm != null ? `${m.height_mm}mm` : "—" },
    { label: "Shape", getValue: (m) => m.shape ?? "—" },
    { label: "Hump", getValue: (m) => m.hump ?? "—" },
    { label: "Grips", getValue: (m) => m.grips?.join(", ") ?? "—" },
    { label: "Hands", getValue: (m) => m.hands?.join(", ") ?? "—" },
    { label: "Price", getValue: (m) => m.price_usd != null ? `$${m.price_usd}` : "—" },
  ];

  const numericRows = ["Weight", "Length", "Width", "Height", "Price"];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-white/30 w-28" />
            {mice.map((m) => (
              <th key={m.id} className="p-3 text-left">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-accent-gamer">{m.brand}</div>
                <div className="text-sm font-bold text-white">{m.model}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const values = mice.map((m) => row.getValue(m));
            const isNumeric = numericRows.includes(row.label);
            let bestIdx = -1;
            if (isNumeric) {
              const nums = values.map((v) => parseFloat(v));
              const valid = nums.filter((n) => !isNaN(n));
              if (valid.length > 1) {
                const best = row.label === "Weight" ? Math.min(...valid) : Math.min(...valid);
                bestIdx = nums.indexOf(best);
              }
            }

            return (
              <tr key={row.label} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                <td className="p-3 text-xs font-medium text-white/40">{row.label}</td>
                {values.map((v, j) => (
                  <td
                    key={mice[j].id}
                    className={`p-3 text-sm font-medium ${
                      bestIdx === j ? "text-accent-emerald" : "text-white/70"
                    }`}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

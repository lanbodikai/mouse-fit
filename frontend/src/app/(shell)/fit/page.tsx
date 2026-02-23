"use client";

import { useMemo, useState } from "react";
import { ShellNav } from "@/components/shell/ShellNav";
import { fitRecommend } from "@/lib/api";
import type { FitResponse } from "@/lib/types";

type Grip = "palm" | "claw" | "fingertip";
type WeightPreference = "balanced" | "lighter" | "heavier";
type RatingState = Record<Grip, number>;

type FormState = {
  lengthMm: string;
  widthMm: string;
  wireless: "any" | "wireless" | "wired";
  budgetMin: string;
  budgetMax: string;
  weightPreference: WeightPreference;
  ratings: RatingState;
};

const initialForm: FormState = {
  lengthMm: "",
  widthMm: "",
  wireless: "any",
  budgetMin: "",
  budgetMax: "",
  weightPreference: "balanced",
  ratings: { palm: 3, claw: 4, fingertip: 2 },
};

const gripDescriptions: Record<Grip, string> = {
  palm: "Full palm contact for stability and comfort.",
  claw: "Arched fingers with palm support for control and speed.",
  fingertip: "Only fingertips touch mouse for quick micro-adjustments.",
};

function getSuggestedGrip(lengthMm: number, widthMm: number): Grip {
  if (lengthMm >= 195 || widthMm >= 100) return "fingertip";
  if (lengthMm <= 175 || widthMm <= 85) return "claw";
  return "palm";
}

function getTopRatedGrip(ratings: RatingState): Grip {
  let best: Grip = "claw";
  let bestScore = -1;
  (Object.keys(ratings) as Grip[]).forEach((grip) => {
    if (ratings[grip] > bestScore) {
      best = grip;
      bestScore = ratings[grip];
    }
  });
  return best;
}

export default function FitWizardPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedLength = Number(form.lengthMm);
  const parsedWidth = Number(form.widthMm);

  const canGoStep2 = useMemo(() => {
    return Number.isFinite(parsedLength) && parsedLength > 0 && Number.isFinite(parsedWidth) && parsedWidth > 0;
  }, [parsedLength, parsedWidth]);

  const suggestedGrip = useMemo<Grip | null>(() => {
    if (!canGoStep2) return null;
    return getSuggestedGrip(parsedLength, parsedWidth);
  }, [canGoStep2, parsedLength, parsedWidth]);

  const chosenGrip = useMemo(() => getTopRatedGrip(form.ratings), [form.ratings]);

  const canSubmit = canGoStep2;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setRating = (grip: Grip, value: number) => {
    setForm((prev) => ({
      ...prev,
      ratings: { ...prev.ratings, [grip]: value },
    }));
  };

  const onGenerate = async () => {
    if (!canSubmit) return;
    setError(null);
    setIsLoading(true);
    try {
      const response = await fitRecommend({
        top_k: 3,
        candidate_k: 36,
        llm_mode: "auto",
        allow_fallback: true,
        profile: {
          length_mm: parsedLength,
          width_mm: parsedWidth,
          grip: chosenGrip,
          wireless: form.wireless === "any" ? null : form.wireless === "wireless",
          budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
          budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
          weightPreference: form.weightPreference,
        },
      });
      setResult(response);
      setStep(4);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const sourceMap = useMemo(() => {
    const map = new Map<string, FitResponse["sources"][number]>();
    for (const source of result?.sources ?? []) {
      map.set(source.id, source);
    }
    return map;
  }, [result]);

  return (
    <>
      <ShellNav currentPage="fit" />
      <div className="px-5 md:px-8 pb-28">
        <div className="mx-auto max-w-[1500px] min-h-[calc(100vh-150px)] rounded-3xl border border-emerald-400/20 bg-black/35 backdrop-blur-xl overflow-hidden">
          <div className="grid lg:grid-cols-[380px_minmax(0,1fr)] min-h-[calc(100vh-150px)]">
            <aside className="border-r border-emerald-400/15 bg-gradient-to-b from-emerald-500/10 via-transparent to-cyan-500/10 p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/90">MouseFit</p>
              <h1 className="mt-3 text-3xl md:text-4xl font-semibold text-white">Fit Wizard</h1>
              <p className="mt-3 text-sm text-emerald-100/75 leading-6">
                Full-screen fitting flow with grip rating, style suggestion, price range, and top 3 source-backed picks.
              </p>
              <div className="mt-8 space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                      step === n
                        ? "border-emerald-300 bg-emerald-300/20 text-white"
                        : "border-emerald-200/20 bg-white/5 text-emerald-100/70"
                    }`}
                    onClick={() => {
                      if (n <= 3) setStep(n);
                      if (n === 4 && result) setStep(4);
                    }}
                  >
                    Step {n}: {n === 1 ? "Hand Size" : n === 2 ? "Preferences" : n === 3 ? "Review" : "Results"}
                  </button>
                ))}
              </div>
            </aside>

            <section className="p-6 md:p-10">
              {step === 1 && (
                <div className="max-w-3xl">
                  <h2 className="text-2xl font-semibold text-white">Step 1: Hand Dimensions</h2>
                  <p className="mt-2 text-emerald-100/70">Enter your measured hand size in millimeters.</p>
                  <div className="mt-8 grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm text-emerald-100/80">Hand length (mm)</span>
                      <input
                        className="w-full rounded-xl border border-emerald-200/30 bg-black/40 px-4 py-3 text-white outline-none focus:border-emerald-300"
                        type="number"
                        placeholder="e.g. 190"
                        value={form.lengthMm}
                        onChange={(e) => update("lengthMm", e.target.value)}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-emerald-100/80">Hand width (mm)</span>
                      <input
                        className="w-full rounded-xl border border-emerald-200/30 bg-black/40 px-4 py-3 text-white outline-none focus:border-emerald-300"
                        type="number"
                        placeholder="e.g. 95"
                        value={form.widthMm}
                        onChange={(e) => update("widthMm", e.target.value)}
                      />
                    </label>
                  </div>
                  {suggestedGrip && (
                    <div className="mt-5 rounded-xl border border-emerald-300/35 bg-emerald-500/10 p-4 text-sm text-emerald-50">
                      Suggested holding style: <span className="font-semibold capitalize">{suggestedGrip}</span> ({gripDescriptions[suggestedGrip]})
                    </div>
                  )}
                  <div className="mt-8">
                    <button
                      className="rounded-xl border border-emerald-300 bg-emerald-300/20 px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
                      disabled={!canGoStep2}
                      onClick={() => setStep(2)}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="max-w-5xl">
                  <h2 className="text-2xl font-semibold text-white">Step 2: Preferences</h2>
                  <p className="mt-2 text-emerald-100/70">Rate your holding styles and set purchase constraints.</p>

                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {(["palm", "claw", "fingertip"] as Grip[]).map((grip) => (
                      <div key={grip} className="rounded-2xl border border-emerald-200/20 bg-white/5 p-4">
                        <p className="text-sm font-semibold capitalize text-white">{grip}</p>
                        <p className="mt-1 text-xs text-emerald-100/70">{gripDescriptions[grip]}</p>
                        <div className="mt-3 flex gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              onClick={() => setRating(grip, rating)}
                              className={`h-8 w-8 rounded-full border text-xs transition ${
                                form.ratings[grip] === rating
                                  ? "border-emerald-200 bg-emerald-300/30 text-white"
                                  : "border-emerald-100/20 bg-black/30 text-emerald-100/75 hover:border-emerald-200/50"
                              }`}
                              aria-pressed={form.ratings[grip] === rating}
                            >
                              {rating}
                            </button>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-emerald-100/70">
                          Selected: <span className="font-semibold text-emerald-50">{form.ratings[grip]}/5</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm text-emerald-100/80">Connection</span>
                      <select
                        className="w-full rounded-xl border border-emerald-200/30 bg-black/40 px-4 py-3 text-white outline-none focus:border-emerald-300"
                        value={form.wireless}
                        onChange={(e) => update("wireless", e.target.value as FormState["wireless"])}
                      >
                        <option value="any">Any connection</option>
                        <option value="wireless">Wireless only</option>
                        <option value="wired">Wired only</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-emerald-100/80">Weight preference</span>
                      <select
                        className="w-full rounded-xl border border-emerald-200/30 bg-black/40 px-4 py-3 text-white outline-none focus:border-emerald-300"
                        value={form.weightPreference}
                        onChange={(e) => update("weightPreference", e.target.value as WeightPreference)}
                      >
                        <option value="balanced">Balanced</option>
                        <option value="lighter">Prefer lighter</option>
                        <option value="heavier">Prefer heavier</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-emerald-100/80">Target price min (USD)</span>
                      <input
                        className="w-full rounded-xl border border-emerald-200/30 bg-black/40 px-4 py-3 text-white outline-none focus:border-emerald-300"
                        type="number"
                        placeholder="optional"
                        value={form.budgetMin}
                        onChange={(e) => update("budgetMin", e.target.value)}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-emerald-100/80">Target price max (USD)</span>
                      <input
                        className="w-full rounded-xl border border-emerald-200/30 bg-black/40 px-4 py-3 text-white outline-none focus:border-emerald-300"
                        type="number"
                        placeholder="optional"
                        value={form.budgetMax}
                        onChange={(e) => update("budgetMax", e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="mt-8 flex gap-3">
                    <button
                      className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </button>
                    <button
                      className="rounded-xl border border-emerald-300 bg-emerald-300/20 px-5 py-3 text-sm font-medium text-white"
                      onClick={() => setStep(3)}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="max-w-4xl">
                  <h2 className="text-2xl font-semibold text-white">Step 3: Review & Run</h2>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200/20 bg-white/5 p-4 text-emerald-100/85">
                      <p>Length: {form.lengthMm || "-"} mm</p>
                      <p>Width: {form.widthMm || "-"} mm</p>
                      <p>Suggested style: {suggestedGrip || "-"}</p>
                      <p>Connection: {form.wireless}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200/20 bg-white/5 p-4 text-emerald-100/85">
                      <p>Palm rating: {form.ratings.palm}/5</p>
                      <p>Claw rating: {form.ratings.claw}/5</p>
                      <p>Fingertip rating: {form.ratings.fingertip}/5</p>
                      <p>Weight preference: {form.weightPreference}</p>
                      <p>Price range: {form.budgetMin || "-"} to {form.budgetMax || "-"} USD</p>
                    </div>
                  </div>
                  {error && (
                    <div className="mt-5 rounded-xl border border-red-300/40 bg-red-900/20 p-3 text-sm text-red-100">
                      {error}
                    </div>
                  )}
                  <div className="mt-8 flex gap-3">
                    <button
                      className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white"
                      onClick={() => setStep(2)}
                    >
                      Back
                    </button>
                    <button
                      className="rounded-xl border border-emerald-300 bg-emerald-300/20 px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
                      disabled={isLoading || !canSubmit}
                      onClick={onGenerate}
                    >
                      {isLoading ? "Generating..." : "Generate Top 3"}
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold text-white">Top 3 Fit Results</h2>
                    <div className="rounded-xl border border-emerald-200/20 bg-white/5 px-3 py-2 text-xs text-emerald-100/70">
                      Provider: {result?.provider || "n/a"} | Model: {result?.model || "n/a"}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 xl:grid-cols-3">
                    {result?.recommendations.map((item, idx) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-white/10 to-white/5 p-5"
                      >
                        <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/80">Rank {idx + 1}</p>
                        <h3 className="mt-2 text-xl font-semibold text-white">
                          {item.brand} {item.model}
                        </h3>
                        <p className="mt-2 text-sm text-emerald-100/80">Score: {Math.round(item.score)} / 100</p>
                        <p className="mt-3 text-sm leading-6 text-emerald-50/90">{item.reason}</p>
                        <div className="mt-4 text-xs text-emerald-100/70">
                          {item.length_mm ? `${item.length_mm}mm` : "?"} x {item.width_mm ? `${item.width_mm}mm` : "?"} x{" "}
                          {item.height_mm ? `${item.height_mm}mm` : "?"} | {item.weight_g ? `${item.weight_g}g` : "weight n/a"}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.citations.slice(0, 3).map((cid) => {
                            const src = sourceMap.get(cid);
                            const label = src?.kind === "web" ? "WEB" : "RAG";
                            if (!src) return null;
                            return src.url ? (
                              <a
                                key={cid}
                                href={src.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-emerald-300/35 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100"
                              >
                                {label}: {src.title}
                              </a>
                            ) : (
                              <span
                                key={cid}
                                className="rounded-full border border-emerald-300/35 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100"
                              >
                                {label}: {src.title}
                              </span>
                            );
                          })}
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="mt-8">
                    <button
                      className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white"
                      onClick={() => {
                        setResult(null);
                        setStep(1);
                      }}
                    >
                      Start Over
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

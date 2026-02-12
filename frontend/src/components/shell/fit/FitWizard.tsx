"use client";

import { useEffect, useMemo, useState } from "react";
import { getOrCreateSessionId } from "@/lib/session";
import { saveUserProfile } from "@/lib/api";
import type { GripRatings, UsageIntent, UserProfileInput, WeightPreference } from "@/lib/types";
import GripRatingCards from "./GripRatingCards";
import BudgetRangeInputs from "./BudgetRangeInputs";
import UsageIntentSelect from "./UsageIntentSelect";
import WeightPreferenceInput from "./WeightPreference";

type FitDraft = {
  hand_length_mm: number;
  hand_width_mm: number;
  grip_ratings: GripRatings;
  budget_min: number;
  budget_target: number;
  budget_max: number;
  usage_intents: UsageIntent[];
  weight_pref: WeightPreference;
  notes: string;
};

const DRAFT_KEY = "mf:fit:draft";

const DEFAULT_DRAFT: FitDraft = {
  hand_length_mm: 180,
  hand_width_mm: 90,
  grip_ratings: {
    palm: 3,
    claw: 3,
    fingertip: 3,
  },
  budget_min: 50,
  budget_target: 100,
  budget_max: 150,
  usage_intents: ["gaming"],
  weight_pref: "balanced",
  notes: "",
};

const STEPS = [
  "Hand Size",
  "Grip Ratings",
  "Budget",
  "Usage",
  "Weight",
  "Extra Notes",
];

function readStoredMeasurement(key: string): number | null {
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeParseInput(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function FitWizard() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<FitDraft>(DEFAULT_DRAFT);
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FitDraft>;
        setDraft((prev) => ({
          ...prev,
          ...parsed,
          grip_ratings: { ...prev.grip_ratings, ...(parsed.grip_ratings ?? {}) },
          usage_intents: Array.isArray(parsed.usage_intents) ? parsed.usage_intents : prev.usage_intents,
        }));
      } else {
        const len = readStoredMeasurement("mf:length_mm");
        const wid = readStoredMeasurement("mf:width_mm");
        if (len || wid) {
          setDraft((prev) => ({
            ...prev,
            hand_length_mm: len ?? prev.hand_length_mm,
            hand_width_mm: wid ?? prev.hand_width_mm,
          }));
        }
      }
    } catch {
      // Ignore invalid draft payloads.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);

  const setNextDraft = (partial: Partial<FitDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  const validate = (): string => {
    if (!Number.isFinite(draft.hand_length_mm) || !Number.isFinite(draft.hand_width_mm)) {
      return "Hand measurements must be valid numbers.";
    }
    if (draft.hand_length_mm < 100 || draft.hand_length_mm > 260) {
      return "Hand length must be between 100 and 260 mm.";
    }
    if (draft.hand_width_mm < 50 || draft.hand_width_mm > 130) {
      return "Hand width must be between 50 and 130 mm.";
    }
    const gripValues = Object.values(draft.grip_ratings);
    if (gripValues.some((n) => !Number.isInteger(n) || n < 1 || n > 5)) {
      return "Each grip rating must be an integer from 1 to 5.";
    }
    const budgets = [draft.budget_min, draft.budget_target, draft.budget_max];
    if (budgets.some((n) => !Number.isFinite(n))) {
      return "Budget values must be valid numbers.";
    }
    if (
      draft.budget_min < 5 ||
      draft.budget_target < 5 ||
      draft.budget_max < 5 ||
      draft.budget_min > 500 ||
      draft.budget_target > 500 ||
      draft.budget_max > 500
    ) {
      return "Budget values must stay between $5 and $500.";
    }
    if (!(draft.budget_min <= draft.budget_target && draft.budget_target <= draft.budget_max)) {
      return "Budget order must be min <= target <= max.";
    }
    if (draft.notes.length > 1000) {
      return "Additional notes must be 1000 characters or less.";
    }
    return "";
  };

  const onSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!sessionId) {
      setError("Session is not ready yet. Try again.");
      return;
    }

    const payload: UserProfileInput = {
      session_id: sessionId,
      hand_length_mm: draft.hand_length_mm,
      hand_width_mm: draft.hand_width_mm,
      grip_ratings: draft.grip_ratings,
      budget_min: draft.budget_min,
      budget_target: draft.budget_target,
      budget_max: draft.budget_max,
      usage_intents: draft.usage_intents,
      weight_pref: draft.weight_pref,
      notes: draft.notes.trim() || undefined,
    };

    try {
      setSaving(true);
      setError("");
      setStatus("Saving profile...");
      const result = await saveUserProfile(payload);
      setStatus(`Profile saved at ${new Date(result.saved_at).toLocaleString()}.`);
    } catch (e) {
      setStatus("");
      setError(e instanceof Error ? e.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 text-white md:px-8">
      <header className="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-green-300/90">Mouse Fit Wizard</p>
        <h1 className="mt-2 text-2xl font-semibold">Build your recommendation profile</h1>
        <p className="mt-2 text-sm text-white/65">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
        <div className="mt-4 h-2 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur">
        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-white/80">Hand Length (mm)</span>
              <input
                type="number"
                min={100}
                max={260}
                value={draft.hand_length_mm}
                onChange={(e) => setNextDraft({ hand_length_mm: safeParseInput(e.target.value, draft.hand_length_mm) })}
                className="w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-green-400"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-white/80">Hand Width (mm)</span>
              <input
                type="number"
                min={50}
                max={130}
                value={draft.hand_width_mm}
                onChange={(e) => setNextDraft({ hand_width_mm: safeParseInput(e.target.value, draft.hand_width_mm) })}
                className="w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-green-400"
              />
            </label>
          </div>
        )}

        {step === 1 && <GripRatingCards value={draft.grip_ratings} onChange={(next) => setNextDraft({ grip_ratings: next })} />}

        {step === 2 && (
          <BudgetRangeInputs
            min={draft.budget_min}
            target={draft.budget_target}
            max={draft.budget_max}
            onChange={(next) => setNextDraft({ budget_min: next.min, budget_target: next.target, budget_max: next.max })}
          />
        )}

        {step === 3 && <UsageIntentSelect value={draft.usage_intents} onChange={(next) => setNextDraft({ usage_intents: next })} />}

        {step === 4 && <WeightPreferenceInput value={draft.weight_pref} onChange={(next) => setNextDraft({ weight_pref: next })} />}

        {step === 5 && (
          <label className="block space-y-2">
            <span className="text-sm text-white/80">Additional notes (optional, max 1000 chars)</span>
            <textarea
              rows={7}
              maxLength={1000}
              value={draft.notes}
              onChange={(e) => setNextDraft({ notes: e.target.value })}
              className="w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-green-400"
              placeholder="Anything else we should consider? games, hand pain concerns, specific models you like or dislike..."
            />
          </label>
        )}
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      {status ? <p className="mt-4 text-sm text-green-300">{status}</p> : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setStep((prev) => Math.max(0, prev - 1))}
          disabled={step === 0 || saving}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              setError("");
              setStep((prev) => Math.min(STEPS.length - 1, prev + 1));
            }}
            disabled={saving}
            className="rounded-xl border border-green-300/40 bg-green-400/20 px-4 py-2 text-sm font-semibold text-green-200 disabled:opacity-50"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="rounded-xl border border-green-300/40 bg-green-400/20 px-4 py-2 text-sm font-semibold text-green-200 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        )}
      </div>
    </section>
  );
}

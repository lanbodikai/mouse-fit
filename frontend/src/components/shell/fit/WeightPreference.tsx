"use client";

import type { WeightPreference } from "@/lib/types";

const OPTIONS: Array<{ id: WeightPreference; label: string; hint: string }> = [
  { id: "light", label: "Light", hint: "Fast movement, low inertia." },
  { id: "balanced", label: "Balanced", hint: "Middle weight for mixed use." },
  { id: "heavy", label: "Heavy", hint: "More planted and stable feel." },
];

type WeightPreferenceProps = {
  value: WeightPreference;
  onChange: (next: WeightPreference) => void;
};

export default function WeightPreferenceInput({ value, onChange }: WeightPreferenceProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {OPTIONS.map((option) => {
        const active = option.id === value;
        return (
          <button
            type="button"
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              active
                ? "border-green-400 bg-green-400/20"
                : "border-white/20 bg-black/20 hover:border-white/40"
            }`}
          >
            <div className="text-sm font-semibold text-white">{option.label}</div>
            <div className="mt-1 text-xs text-white/60">{option.hint}</div>
          </button>
        );
      })}
    </div>
  );
}

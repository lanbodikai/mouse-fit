"use client";

import type { UsageIntent } from "@/lib/types";

const OPTIONS: Array<{ id: UsageIntent; label: string }> = [
  { id: "gaming", label: "Gaming" },
  { id: "coding", label: "Coding" },
  { id: "office", label: "Office Work" },
  { id: "creative", label: "Creative" },
  { id: "school", label: "School" },
  { id: "general", label: "General Use" },
];

type UsageIntentSelectProps = {
  value: UsageIntent[];
  onChange: (next: UsageIntent[]) => void;
};

export default function UsageIntentSelect({ value, onChange }: UsageIntentSelectProps) {
  const toggle = (id: UsageIntent) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
      return;
    }
    onChange([...value, id]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => {
        const active = value.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              active
                ? "border-green-400 bg-green-400/20 text-green-300"
                : "border-white/20 bg-white/5 text-white/75 hover:border-white/40"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

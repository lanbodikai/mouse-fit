"use client";

type BudgetRangeInputsProps = {
  min: number;
  target: number;
  max: number;
  onChange: (next: { min: number; target: number; max: number }) => void;
};

function toSafeNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function BudgetRangeInputs({ min, target, max, onChange }: BudgetRangeInputsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <label className="space-y-2">
        <span className="text-sm text-white/80">Minimum ($)</span>
        <input
          type="number"
          min={5}
          max={500}
          value={min}
          onChange={(e) => onChange({ min: toSafeNumber(e.target.value, min), target, max })}
          className="w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-green-400"
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm text-white/80">Target ($)</span>
        <input
          type="number"
          min={5}
          max={500}
          value={target}
          onChange={(e) => onChange({ min, target: toSafeNumber(e.target.value, target), max })}
          className="w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-green-400"
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm text-white/80">Maximum ($)</span>
        <input
          type="number"
          min={5}
          max={500}
          value={max}
          onChange={(e) => onChange({ min, target, max: toSafeNumber(e.target.value, max) })}
          className="w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-green-400"
        />
      </label>
    </div>
  );
}

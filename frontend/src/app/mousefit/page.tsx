"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Check, ChevronLeft, MousePointer2, Ruler, Target } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Grip = "claw" | "palm" | "fingertip";
type ClawStyle = "relaxed" | "aggressive";
type ClawContact = "left" | "right" | "whole" | "none";
type ClawPos = "back" | "top";
type PalmFinger = "whole" | "fingertip";
type PalmThumb = "inward" | "flat";
type FingerPos = "top" | "middle" | "bottom";
type BudgetTier = "entry" | "balanced" | "performance" | "premium";
type Purpose = "gaming" | "casual-work";
type HandPreset = "small" | "medium" | "large";
type ChoiceKey =
  | "primaryGrip"
  | "clawStyle"
  | "clawPalmContact"
  | "clawHandPosition"
  | "palmFingerContact"
  | "palmThumbPlacement"
  | "fingerStackPosition"
  | "budgetTier"
  | "purpose";

type Answers = {
  primaryGrip: Grip | null;
  clawStyle: ClawStyle | null;
  clawPalmContact: ClawContact | null;
  clawHandPosition: ClawPos | null;
  palmFingerContact: PalmFinger | null;
  palmThumbPlacement: PalmThumb | null;
  fingerStackPosition: FingerPos | null;
  budgetTier: BudgetTier | null;
  purpose: Purpose | null;
  handPreset: HandPreset | null;
  lengthMm: number;
  widthMm: number;
};

type Opt = { value: string; badge: string; title: string; subtitle: string };
type OptionStep = {
  id: string;
  type: "options";
  title: string;
  key: ChoiceKey;
  value: string | null;
  options: Opt[];
  cols: "two" | "three" | "four";
};
type MeasureStep = { id: "measure"; type: "measure"; title: string };
type Step = OptionStep | MeasureStep;

const SURVEY_KEYS = ["mousefit:survey_draft", "mf:survey_draft"] as const;
const WIZARD_KEYS = ["mousefit:survey_wizard_state", "mf:survey_wizard_state"] as const;
const MEASURE_KEYS = ["mousefit:measure", "mf:measure"] as const;
const RECS_KEYS = ["mousefit:recs", "mf:recs"] as const;

const DEFAULT: Answers = {
  primaryGrip: null,
  clawStyle: null,
  clawPalmContact: null,
  clawHandPosition: null,
  palmFingerContact: null,
  palmThumbPlacement: null,
  fingerStackPosition: null,
  budgetTier: null,
  purpose: null,
  handPreset: null,
  lengthMm: 180,
  widthMm: 90,
};

const RANGES: Record<BudgetTier, { min: number; max: number }> = {
  entry: { min: 0, max: 80 },
  balanced: { min: 80, max: 160 },
  performance: { min: 160, max: 260 },
  premium: { min: 260, max: 400 },
};

const PRESETS: Record<HandPreset, { lengthMm: number; widthMm: number }> = {
  small: { lengthMm: 165, widthMm: 82 },
  medium: { lengthMm: 180, widthMm: 90 },
  large: { lengthMm: 195, widthMm: 98 },
};

const GRADIENTS = [
  "from-orange-400 via-fuchsia-500 to-violet-500",
  "from-violet-500 via-fuchsia-500 to-cyan-400",
  "from-cyan-400 via-blue-500 to-emerald-400",
  "from-emerald-400 via-cyan-400 to-violet-500",
];

const OPTS = {
  grip: [
    { value: "claw", badge: "C", title: "Claw Grip", subtitle: "Arched fingers, control-focused posture" },
    { value: "palm", badge: "P", title: "Palm Grip", subtitle: "Full-hand support and comfort-first handling" },
    { value: "fingertip", badge: "F", title: "Fingertip Grip", subtitle: "Light touch with fast micro-adjusts" },
  ] as Opt[],
  clawStyle: [
    { value: "relaxed", badge: "R", title: "Relaxed Claw", subtitle: "Softer curl and lower finger tension" },
    { value: "aggressive", badge: "A", title: "Aggressive Claw", subtitle: "Sharper curl and higher tension" },
  ] as Opt[],
  clawContact: [
    { value: "left", badge: "L", title: "Left Side", subtitle: "Palm pressure leans left" },
    { value: "right", badge: "R", title: "Right Side", subtitle: "Palm pressure leans right" },
    { value: "whole", badge: "W", title: "Whole Palm", subtitle: "Wide palm support" },
    { value: "none", badge: "N", title: "No Contact", subtitle: "Minimal palm anchor" },
  ] as Opt[],
  clawPos: [
    { value: "back", badge: "B", title: "Back of Mouse", subtitle: "Support near rear hump" },
    { value: "top", badge: "T", title: "Top of Mouse", subtitle: "Support near center shell" },
  ] as Opt[],
  palmFinger: [
    { value: "whole", badge: "W", title: "Whole Finger", subtitle: "Buttons under full finger" },
    { value: "fingertip", badge: "F", title: "Fingertip", subtitle: "Front fingertip pressure" },
  ] as Opt[],
  palmThumb: [
    { value: "inward", badge: "I", title: "Thumb Inward", subtitle: "Thumb curls toward side wall" },
    { value: "flat", badge: "F", title: "Thumb Flat", subtitle: "Thumb rests neutral" },
  ] as Opt[],
  fingerPos: [
    { value: "top", badge: "1", title: "Top", subtitle: "Thumb above ring/little" },
    { value: "middle", badge: "2", title: "Middle", subtitle: "Thumb aligned in middle" },
    { value: "bottom", badge: "3", title: "Bottom", subtitle: "Thumb below ring/little" },
  ] as Opt[],
  budget: [
    { value: "entry", badge: "$", title: "Entry", subtitle: "$0 - $80" },
    { value: "balanced", badge: "$$", title: "Balanced", subtitle: "$80 - $160" },
    { value: "performance", badge: "$$$", title: "Performance", subtitle: "$160 - $260" },
    { value: "premium", badge: "$$$$", title: "Premium", subtitle: "$260 - $400" },
  ] as Opt[],
  purpose: [
    { value: "gaming", badge: "G", title: "Gaming", subtitle: "Speed, control and precision" },
    { value: "casual-work", badge: "W", title: "Casual Work", subtitle: "All-day comfort and productivity" },
  ] as Opt[],
  hand: [
    { value: "small", badge: "S", title: "Small Hand", subtitle: "~165mm x 82mm" },
    { value: "medium", badge: "M", title: "Medium Hand", subtitle: "~180mm x 90mm" },
    { value: "large", badge: "L", title: "Large Hand", subtitle: "~195mm x 98mm" },
  ] as Opt[],
};

function readJson<T>(keys: readonly string[]): T | null {
  if (typeof window === "undefined") return null;
  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
      if (!raw) continue;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  return null;
}

function writeJson(keys: readonly string[], value: unknown) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(value);
  for (const key of keys) {
    window.localStorage.setItem(key, raw);
    window.sessionStorage.setItem(key, raw);
  }
}

function toNum(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sizeFromLen(lengthMm: number): "small" | "medium" | "large" | "xlarge" {
  if (lengthMm < 170) return "small";
  if (lengthMm < 190) return "medium";
  if (lengthMm < 210) return "large";
  return "xlarge";
}

function nearBudget(min: number, max: number): BudgetTier {
  const center = (min + max) / 2;
  let best: BudgetTier = "balanced";
  let dist = Number.POSITIVE_INFINITY;
  (Object.keys(RANGES) as BudgetTier[]).forEach((tier) => {
    const c = (RANGES[tier].min + RANGES[tier].max) / 2;
    const d = Math.abs(center - c);
    if (d < dist) {
      dist = d;
      best = tier;
    }
  });
  return best;
}

function loadInitial(): Answers {
  if (typeof window === "undefined") return DEFAULT;
  const wizard = readJson<Record<string, unknown>>(WIZARD_KEYS);
  const draft = readJson<Record<string, unknown>>(SURVEY_KEYS);
  const src = wizard ?? draft ?? {};
  const measure = readJson<Record<string, unknown>>(MEASURE_KEYS);

  const l1 = toNum(window.sessionStorage.getItem("mf:length_mm"));
  const w1 = toNum(window.sessionStorage.getItem("mf:width_mm"));
  const l2 = toNum(measure?.len_mm);
  const w2 = toNum(measure?.wid_mm);
  const l3 = toNum(src?.handLengthMm);
  const w3 = toNum(src?.handWidthMm);

  const bTier =
    (src?.budgetTier as BudgetTier | null) ??
    (toNum(src?.budgetMin) !== null && toNum(src?.budgetMax) !== null
      ? nearBudget(toNum(src?.budgetMin) as number, toNum(src?.budgetMax) as number)
      : null);

  return {
    primaryGrip: (src?.primaryGrip as Grip | null) ?? null,
    clawStyle: (src?.clawStyle as ClawStyle | null) ?? null,
    clawPalmContact: (src?.clawPalmContact as ClawContact | null) ?? null,
    clawHandPosition: (src?.clawHandPosition as ClawPos | null) ?? null,
    palmFingerContact: (src?.palmFingerContact as PalmFinger | null) ?? null,
    palmThumbPlacement: (src?.palmThumbPlacement as PalmThumb | null) ?? null,
    fingerStackPosition: (src?.fingerStackPosition as FingerPos | null) ?? null,
    budgetTier: bTier,
    purpose: (src?.purpose as Purpose | null) ?? null,
    handPreset: (src?.handPreset as HandPreset | null) ?? null,
    lengthMm: clamp(l1 ?? l2 ?? l3 ?? DEFAULT.lengthMm, 100, 260),
    widthMm: clamp(w1 ?? w2 ?? w3 ?? DEFAULT.widthMm, 50, 130),
  };
}

function toDraft(a: Answers) {
  const grip = (a.primaryGrip ?? "palm") as Grip;
  const budget = RANGES[(a.budgetTier ?? "balanced") as BudgetTier];
  const fingerDirection =
    a.fingerStackPosition === "top" ? "left" : a.fingerStackPosition === "bottom" ? "right" : "center";

  return {
    primaryGrip: grip,
    shellShape: grip === "palm" ? "ergo" : "sym",
    humpPosition: grip === "claw" ? (a.clawHandPosition === "back" ? "back" : "center") : "center",
    sideShape:
      grip === "palm"
        ? a.palmThumbPlacement === "inward"
          ? "inward"
          : "flat"
        : grip === "claw"
          ? a.clawPalmContact === "whole"
            ? "flat"
            : "inward"
          : "inward",
    fingerDirection,
    thumbPosition:
      grip === "palm"
        ? a.palmThumbPlacement === "inward"
          ? "inward"
          : "relaxed"
        : grip === "claw"
          ? a.clawPalmContact === "none"
            ? "relaxed"
            : "inward"
          : "relaxed",
    dominantFinger: a.fingerStackPosition === "top" ? "index" : "ring",
    palmFingerCurved: grip === "palm" ? (a.palmFingerContact === "fingertip" ? "yes" : "no") : "",
    clawRelaxed: grip === "claw" ? (a.clawStyle === "relaxed" ? "yes" : "no") : "",
    clawBackHandTouch: grip === "claw" ? (a.clawPalmContact === "none" ? "no" : "yes") : "",
    budgetTier: a.budgetTier,
    budgetMin: budget.min,
    budgetMax: budget.max,
    purpose: a.purpose,
    handPreset: a.handPreset,
    handLengthMm: Math.round(a.lengthMm),
    handWidthMm: Math.round(a.widthMm),
    clawStyle: a.clawStyle,
    clawPalmContact: a.clawPalmContact,
    clawHandPosition: a.clawHandPosition,
    palmFingerContact: a.palmFingerContact,
    palmThumbPlacement: a.palmThumbPlacement,
    fingerStackPosition: a.fingerStackPosition,
  };
}

function validate(a: Answers): string {
  if (!a.primaryGrip) return "Choose your preferred grip.";
  if (a.primaryGrip === "claw" && (!a.clawStyle || !a.clawPalmContact || !a.clawHandPosition)) {
    return "Complete all claw follow-up questions.";
  }
  if (a.primaryGrip === "palm" && (!a.palmFingerContact || !a.palmThumbPlacement)) {
    return "Complete all palm follow-up questions.";
  }
  if (!a.fingerStackPosition) return "Choose your finger positioning.";
  if (!a.budgetTier) return "Choose your budget range.";
  if (!a.purpose) return "Choose your purpose.";
  if (!Number.isFinite(a.lengthMm) || a.lengthMm < 100 || a.lengthMm > 260) {
    return "Hand length must be between 100 and 260 mm.";
  }
  if (!Number.isFinite(a.widthMm) || a.widthMm < 50 || a.widthMm > 130) {
    return "Hand width must be between 50 and 130 mm.";
  }
  return "";
}

function persist(a: Answers) {
  const draft = toDraft(a);
  writeJson(SURVEY_KEYS, draft);
  writeJson(WIZARD_KEYS, a);

  const lengthMm = Math.round(a.lengthMm);
  const widthMm = Math.round(a.widthMm);
  writeJson(MEASURE_KEYS, {
    len_mm: lengthMm,
    wid_mm: widthMm,
    len_cm: Number((lengthMm / 10).toFixed(1)),
    wid_cm: Number((widthMm / 10).toFixed(1)),
  });

  window.sessionStorage.setItem("mf:length_mm", String(lengthMm));
  window.sessionStorage.setItem("mf:width_mm", String(widthMm));

  const range = RANGES[(a.budgetTier ?? "balanced") as BudgetTier];
  const recs = readJson<Record<string, unknown>>(RECS_KEYS) ?? {};
  writeJson(RECS_KEYS, {
    ...recs,
    size: sizeFromLen(lengthMm),
    budget_min: range.min,
    budget_max: range.max,
  });
}

function colsClass(cols: OptionStep["cols"]) {
  if (cols === "four") return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  if (cols === "three") return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return "grid-cols-1 sm:grid-cols-2";
}

function ChoiceGrid({
  step,
  pulse,
  onChoose,
}: {
  step: OptionStep;
  pulse: string | null;
  onChoose: (value: string) => void;
}) {
  return (
    <div className={`mx-auto grid w-full max-w-6xl gap-4 ${colsClass(step.cols)}`}>
      {step.options.map((opt, index) => {
        const selected = step.value === opt.value;
        const glow = GRADIENTS[index % GRADIENTS.length];
        const active = pulse === `${step.id}:${opt.value}`;
        return (
          <motion.button
            key={opt.value}
            type="button"
            onClick={() => onChoose(opt.value)}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: index * 0.04 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.985 }}
            className={`rounded-[18px] p-[1px] text-left transition ${selected ? `bg-gradient-to-r ${glow} shadow-[0_0_38px_rgba(217,70,239,0.28)]` : "bg-white/20 hover:bg-white/35"}`}
          >
            <motion.div
              animate={active ? { scale: [1, 0.986, 1] } : { scale: 1 }}
              transition={{ duration: 0.22 }}
              className="relative min-h-[150px] rounded-[17px] border border-white/10 bg-black/95 px-4 py-5 md:min-h-[168px]"
            >
              {selected ? (
                <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-emerald-400/10 p-1 text-emerald-300">
                  <Check className="h-3.5 w-3.5" />
                </div>
              ) : null}
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-white/5 text-[11px] font-semibold text-white">
                {opt.badge}
              </div>
              <p className="mt-10 text-base font-semibold text-white">{opt.title}</p>
            </motion.div>
          </motion.button>
        );
      })}
    </div>
  );
}

export default function MousefitSurveyPage() {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);

  const [answers, setAnswers] = useState<Answers>(() => loadInitial());
  const [stepIndex, setStepIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [pulse, setPulse] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => writeJson(WIZARD_KEYS, answers), [answers]);
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    []
  );

  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [
      {
        id: "grip",
        type: "options",
        title: "Current / Preferred Mouse Grip",
        key: "primaryGrip",
        value: answers.primaryGrip,
        options: OPTS.grip,
        cols: "three",
      },
    ];

    if (answers.primaryGrip === "claw") {
      list.push(
        {
          id: "claw-style",
          type: "options",
          title: "Claw Style",
          key: "clawStyle",
          value: answers.clawStyle,
          options: OPTS.clawStyle,
          cols: "two",
        },
        {
          id: "claw-contact",
          type: "options",
          title: "Palm Contact Point",
          key: "clawPalmContact",
          value: answers.clawPalmContact,
          options: OPTS.clawContact,
          cols: "four",
        },
        {
          id: "claw-position",
          type: "options",
          title: "Hand Position on Mouse",
          key: "clawHandPosition",
          value: answers.clawHandPosition,
          options: OPTS.clawPos,
          cols: "two",
        },
      );
    }

    if (answers.primaryGrip === "palm") {
      list.push(
        {
          id: "palm-finger",
          type: "options",
          title: "Finger Contact",
          key: "palmFingerContact",
          value: answers.palmFingerContact,
          options: OPTS.palmFinger,
          cols: "two",
        },
        {
          id: "palm-thumb",
          type: "options",
          title: "Thumb Placement",
          key: "palmThumbPlacement",
          value: answers.palmThumbPlacement,
          options: OPTS.palmThumb,
          cols: "two",
        },
      );
    }

    list.push(
      {
        id: "finger-pos",
        type: "options",
        title: "Relative Finger Positioning",
        key: "fingerStackPosition",
        value: answers.fingerStackPosition,
        options: OPTS.fingerPos,
        cols: "three",
      },
      {
        id: "budget",
        type: "options",
        title: "Budget Range",
        key: "budgetTier",
        value: answers.budgetTier,
        options: OPTS.budget,
        cols: "four",
      },
      {
        id: "purpose",
        type: "options",
        title: "General Purpose",
        key: "purpose",
        value: answers.purpose,
        options: OPTS.purpose,
        cols: "two",
      },
      {
        id: "measure",
        type: "measure",
        title: "Hand Measurements",
      },
    );

    return list;
  }, [answers.primaryGrip, answers.clawStyle, answers.clawPalmContact, answers.clawHandPosition, answers.palmFingerContact, answers.palmThumbPlacement, answers.fingerStackPosition, answers.budgetTier, answers.purpose]);

  const safeStepIndex = Math.min(stepIndex, Math.max(0, steps.length - 1));
  const current = steps[safeStepIndex];
  const progress = Math.round(((safeStepIndex + 1) / steps.length) * 100);

  const next = () => {
    setDir(1);
    setStepIndex((p) => Math.min(Math.min(p, steps.length - 1) + 1, steps.length - 1));
  };

  const choose = (step: OptionStep, value: string) => {
    setAnswers((prev) => ({ ...prev, [step.key]: value }));
    setPulse(`${step.id}:${value}`);
    setError("");
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setPulse(null);
      next();
    }, 230);
  };

  const back = () => {
    if (safeStepIndex === 0) return;
    setDir(-1);
    setError("");
    setStepIndex((p) => Math.max(Math.min(p, steps.length - 1) - 1, 0));
  };

  const preset = (name: HandPreset) => {
    const p = PRESETS[name];
    setAnswers((prev) => ({ ...prev, handPreset: name, lengthMm: p.lengthMm, widthMm: p.widthMm }));
    setError("");
  };

  const submit = () => {
    const msg = validate(answers);
    if (msg) {
      setError(msg);
      return;
    }
    try {
      setSubmitting(true);
      persist(answers);
      router.push("/report");
    } catch (e) {
      setSubmitting(false);
      setError(e instanceof Error ? e.message : "Failed to save survey.");
    }
  };

  const panel: Variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 56 : -56, filter: "blur(8px)" }),
    center: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -56 : 56, filter: "blur(8px)", transition: { duration: 0.24 } }),
  };

  return (
    <section className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black px-4 text-white md:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[4%] top-[8%] h-72 w-72 rounded-full bg-fuchsia-600/18 blur-[120px]" />
        <div className="absolute right-[6%] top-[16%] h-72 w-72 rounded-full bg-cyan-500/16 blur-[130px]" />
      </div>

      <div className="w-full max-w-7xl">
        <div className="flex min-h-[72vh] flex-col items-center justify-center">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={current.id} custom={dir} variants={panel} initial="enter" animate="center" exit="exit" className="w-full">
              <h1 className="mb-9 text-center text-2xl font-semibold text-white md:text-4xl">{current.title}</h1>
              {current.type === "options" ? (
                <ChoiceGrid step={current} pulse={pulse} onChoose={(v) => choose(current, v)} />
              ) : (
                <div className="mx-auto w-full max-w-5xl space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    {OPTS.hand.map((opt, idx) => {
                      const active = answers.handPreset === opt.value;
                      const glow = GRADIENTS[idx % GRADIENTS.length];
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => preset(opt.value as HandPreset)}
                          className={`rounded-[18px] p-[1px] text-left transition ${active ? `bg-gradient-to-r ${glow} shadow-[0_0_30px_rgba(217,70,239,0.22)]` : "bg-white/20 hover:bg-white/35"}`}
                        >
                          <div className="rounded-[17px] border border-white/10 bg-black/95 px-4 py-4">
                            <div className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/20 bg-white/5 text-[11px] font-semibold text-white">
                              {opt.badge}
                            </div>
                            <p className="mt-4 text-sm font-semibold text-white">{opt.title}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/55">
                        <Ruler className="h-3.5 w-3.5 text-fuchsia-300" />
                        Hand Length (mm)
                      </span>
                      <input
                        type="number"
                        min={100}
                        max={260}
                        value={answers.lengthMm}
                        onChange={(e) => {
                          const n = clamp(Number(e.target.value || answers.lengthMm), 100, 260);
                          setAnswers((p) => ({ ...p, lengthMm: Number.isFinite(n) ? n : p.lengthMm }));
                        }}
                        className="w-full rounded-xl border border-white/20 bg-black/65 px-3 py-2 text-white outline-none transition focus:border-fuchsia-300"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/55">
                        <Ruler className="h-3.5 w-3.5 text-cyan-300" />
                        Hand Width (mm)
                      </span>
                      <input
                        type="number"
                        min={50}
                        max={130}
                        value={answers.widthMm}
                        onChange={(e) => {
                          const n = clamp(Number(e.target.value || answers.widthMm), 50, 130);
                          setAnswers((p) => ({ ...p, widthMm: Number.isFinite(n) ? n : p.widthMm }));
                        }}
                        className="w-full rounded-xl border border-white/20 bg-black/65 px-3 py-2 text-white outline-none transition focus:border-cyan-300"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={submit}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-2xl border border-fuchsia-400/60 bg-gradient-to-r from-orange-400/20 via-fuchsia-500/20 to-cyan-400/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:border-fuchsia-300 disabled:opacity-60"
                    >
                      <Target className="h-3.5 w-3.5" />
                      {submitting ? "Generating..." : "Generate Report"}
                    </button>

                    <Link
                      href="/measure"
                      onClick={() => writeJson(WIZARD_KEYS, answers)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/80 transition hover:border-cyan-300/50 hover:text-cyan-100"
                    >
                      <MousePointer2 className="h-3.5 w-3.5" />
                      Open Measure Tool
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 w-full max-w-4xl">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-orange-400 via-fuchsia-500 to-cyan-400 shadow-[0_0_24px_rgba(217,70,239,0.7)]"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        <footer className="mt-5 flex items-center justify-start">
          <button
            type="button"
            onClick={back}
            disabled={safeStepIndex === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white/75 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </footer>

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
        ) : null}
      </div>
    </section>
  );
}

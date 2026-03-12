"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, DollarSign, Hand, Loader2, MousePointer2, Ruler, SkipForward, Target } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { completeSurvey } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type Grip = "claw" | "palm" | "fingertip";
type ClawStyle = "relaxed" | "aggressive";
type ClawContact = "left" | "right" | "whole" | "none";
type ClawPos = "back" | "top";
type PalmFinger = "whole" | "fingertip";
type PalmThumb = "inward" | "flat";
type FingerPos = "top" | "middle" | "bottom";
type BudgetTier = "entry" | "balanced" | "performance" | "premium";
type HandPreset = "small" | "medium" | "large";
type ChoiceKey =
  | "primaryGrip"
  | "clawStyle"
  | "clawPalmContact"
  | "clawHandPosition"
  | "palmFingerContact"
  | "palmThumbPlacement"
  | "fingerStackPosition";

type Answers = {
  primaryGrip: Grip | null;
  gripSkipped: boolean;
  clawStyle: ClawStyle | null;
  clawPalmContact: ClawContact | null;
  clawHandPosition: ClawPos | null;
  palmFingerContact: PalmFinger | null;
  palmThumbPlacement: PalmThumb | null;
  fingerStackPosition: FingerPos | null;
  budgetMin: number;
  budgetMax: number;
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
type BudgetStep = { id: "budget"; type: "budget"; title: string };
type MeasureStep = { id: "measure"; type: "measure"; title: string };
type Step = OptionStep | BudgetStep | MeasureStep;

const SURVEY_KEYS = ["mousefit:survey_draft", "mf:survey_draft"] as const;
const WIZARD_KEYS = ["mousefit:survey_wizard_state", "mf:survey_wizard_state"] as const;
const MEASURE_KEYS = ["mousefit:measure", "mf:measure"] as const;
const RECS_KEYS = ["mousefit:recs", "mf:recs"] as const;

const DEFAULT: Answers = {
  primaryGrip: null,
  gripSkipped: false,
  clawStyle: null,
  clawPalmContact: null,
  clawHandPosition: null,
  palmFingerContact: null,
  palmThumbPlacement: null,
  fingerStackPosition: null,
  budgetMin: 0,
  budgetMax: 400,
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

  const savedBudgetMin = toNum(src?.budgetMin);
  const savedBudgetMax = toNum(src?.budgetMax);
  const savedTier = src?.budgetTier as BudgetTier | null;
  let bMin = DEFAULT.budgetMin;
  let bMax = DEFAULT.budgetMax;
  if (savedBudgetMin !== null && savedBudgetMax !== null) {
    bMin = savedBudgetMin;
    bMax = savedBudgetMax;
  } else if (savedTier && RANGES[savedTier]) {
    bMin = RANGES[savedTier].min;
    bMax = RANGES[savedTier].max;
  }

  return {
    primaryGrip: (src?.primaryGrip as Grip | null) ?? null,
    gripSkipped: (src?.gripSkipped as boolean) ?? false,
    clawStyle: (src?.clawStyle as ClawStyle | null) ?? null,
    clawPalmContact: (src?.clawPalmContact as ClawContact | null) ?? null,
    clawHandPosition: (src?.clawHandPosition as ClawPos | null) ?? null,
    palmFingerContact: (src?.palmFingerContact as PalmFinger | null) ?? null,
    palmThumbPlacement: (src?.palmThumbPlacement as PalmThumb | null) ?? null,
    fingerStackPosition: (src?.fingerStackPosition as FingerPos | null) ?? null,
    budgetMin: clamp(bMin, 0, 400),
    budgetMax: clamp(bMax, 0, 400),
    handPreset: (src?.handPreset as HandPreset | null) ?? null,
    lengthMm: clamp(l1 ?? l2 ?? l3 ?? DEFAULT.lengthMm, 100, 260),
    widthMm: clamp(w1 ?? w2 ?? w3 ?? DEFAULT.widthMm, 50, 130),
  };
}

function toDraft(a: Answers) {
  const grip = (a.primaryGrip ?? "palm") as Grip;
  const fingerDirection =
    a.fingerStackPosition === "top" ? "left" : a.fingerStackPosition === "bottom" ? "right" : "center";

  return {
    primaryGrip: grip,
    gripSkipped: a.gripSkipped,
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
    budgetTier: nearBudget(a.budgetMin, a.budgetMax),
    budgetMin: a.budgetMin,
    budgetMax: a.budgetMax,
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
  if (!a.gripSkipped) {
    if (!a.primaryGrip) return "Choose your preferred grip.";
    if (a.primaryGrip === "claw" && (!a.clawStyle || !a.clawPalmContact || !a.clawHandPosition)) {
      return "Complete all claw follow-up questions.";
    }
    if (a.primaryGrip === "palm" && (!a.palmFingerContact || !a.palmThumbPlacement)) {
      return "Complete all palm follow-up questions.";
    }
  }
  if (!a.fingerStackPosition) return "Choose your finger positioning.";
  if (a.budgetMin > a.budgetMax) return "Budget minimum cannot exceed maximum.";
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

  const recs = readJson<Record<string, unknown>>(RECS_KEYS) ?? {};
  writeJson(RECS_KEYS, {
    ...recs,
    size: sizeFromLen(lengthMm),
    budget_min: a.budgetMin,
    budget_max: a.budgetMax,
  });
}

function colsClass(cols: OptionStep["cols"]) {
  if (cols === "four") return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  if (cols === "three") return "grid-cols-1 sm:grid-cols-3";
  return "grid-cols-1 sm:grid-cols-2";
}

function maxWidthClass(cols: OptionStep["cols"]) {
  if (cols === "four") return "max-w-4xl";
  if (cols === "three") return "max-w-3xl";
  return "max-w-2xl";
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
    <div className={`mx-auto grid w-full gap-4 ${maxWidthClass(step.cols)} ${colsClass(step.cols)}`}>
      {step.options.map((opt, index) => {
        const selected = step.value === opt.value;
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
            className={`rounded-[18px] p-[1px] text-left transition ${selected ? "border border-[color:var(--accent-violet-line)] bg-[color:var(--accent-violet-fill)]" : "bg-white/20 hover:bg-white/35"}`}
          >
            <motion.div
              animate={active ? { scale: [1, 0.986, 1] } : { scale: 1 }}
              transition={{ duration: 0.22 }}
              className="relative min-h-[150px] rounded-[17px] border border-white/10 bg-black/95 px-4 py-5 md:min-h-[168px]"
            >
              {selected ? (
                <div className="absolute right-3 top-3 rounded-full border border-[color:var(--accent-emerald-line)] bg-[color:var(--accent-emerald-fill)] p-1 text-[color:var(--accent-emerald)]">
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
  const authReady = useRequireAuth();

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
        type: "budget",
        title: "Budget Range",
      },
      {
        id: "measure",
        type: "measure",
        title: "Hand Measurements",
      },
    );

    return list;
  }, [answers.primaryGrip, answers.clawStyle, answers.clawPalmContact, answers.clawHandPosition, answers.palmFingerContact, answers.palmThumbPlacement, answers.fingerStackPosition]);

  const safeStepIndex = Math.min(stepIndex, Math.max(0, steps.length - 1));
  const current = steps[safeStepIndex];
  const progress = Math.round(((safeStepIndex + 1) / steps.length) * 100);

  const next = () => {
    setDir(1);
    setStepIndex((p) => Math.min(Math.min(p, steps.length - 1) + 1, steps.length - 1));
  };

  const choose = (step: OptionStep, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [step.key]: value,
      ...(step.key === "primaryGrip" ? { gripSkipped: false } : {}),
    }));
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

  const skipGrip = () => {
    setAnswers((prev) => ({ ...prev, gripSkipped: true, primaryGrip: null }));
    setError("");
    next();
  };

  const submit = () => {
    void (async () => {
      const msg = validate(answers);
      if (msg) {
        setError(msg);
        return;
      }
      try {
        setSubmitting(true);
        persist(answers);
        await completeSurvey();
        router.push("/dashboard");
      } catch (e) {
        setSubmitting(false);
        setError(e instanceof Error ? e.message : "Failed to save survey.");
      }
    })();
  };

  if (!authReady) {
    return (
      <section className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black px-4 text-white md:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-[4%] top-[8%] h-72 w-72 rounded-full blur-[120px]" style={{ background: "rgba(139, 92, 246, 0.18)" }} />
          <div className="absolute right-[6%] top-[16%] h-72 w-72 rounded-full blur-[130px]" style={{ background: "rgba(0, 168, 232, 0.16)" }} />
        </div>
        <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/75">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading survey...
        </div>
      </section>
    );
  }

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
        <div className="absolute left-[4%] top-[8%] h-72 w-72 rounded-full blur-[120px]" style={{ background: "rgba(139, 92, 246, 0.18)" }} />
        <div className="absolute right-[6%] top-[16%] h-72 w-72 rounded-full blur-[130px]" style={{ background: "rgba(0, 168, 232, 0.16)" }} />
      </div>

      <div className="w-full max-w-7xl">
        <div className="flex min-h-[72vh] flex-col items-center justify-center">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={current.id} custom={dir} variants={panel} initial="enter" animate="center" exit="exit" className="w-full">
              <h1 className="mb-9 text-center text-2xl font-semibold text-white md:text-4xl">{current.title}</h1>
              {current.type === "options" ? (
                <>
                  <ChoiceGrid step={current} pulse={pulse} onChoose={(v) => choose(current, v)} />
                  {current.id === "grip" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="mx-auto mt-6 flex max-w-3xl items-center justify-center gap-3"
                    >
                      <Link
                        href="/grip?from=survey"
                        onClick={() => writeJson(WIZARD_KEYS, answers)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--accent-gamer-line)] bg-[color:var(--accent-gamer-fill)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/80 transition hover:bg-[color:var(--accent-gamer)] hover:text-white"
                      >
                        <Hand className="h-3.5 w-3.5" />
                        Test your grip
                      </Link>
                      <button
                        type="button"
                        onClick={skipGrip}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/60 transition hover:border-white/25 hover:text-white/80"
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                        Skip
                      </button>
                    </motion.div>
                  )}
                </>
              ) : current.type === "budget" ? (
                <div className="mx-auto w-full max-w-lg space-y-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--accent-amber-line)] bg-[color:var(--accent-amber-fill)]">
                        <DollarSign className="h-4 w-4 text-[color:var(--accent-amber)]" />
                      </div>
                      <span className="text-2xl font-semibold text-white">${answers.budgetMin}</span>
                    </div>
                    <span className="text-sm text-white/30">to</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-semibold text-white">${answers.budgetMax}</span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--accent-violet-line)] bg-[color:var(--accent-violet-fill)]">
                        <DollarSign className="h-4 w-4 text-[color:var(--accent-violet)]" />
                      </div>
                    </div>
                  </div>

                  <div className="relative h-2">
                    <div className="absolute inset-0 rounded-full bg-white/10" />
                    <div
                      className="absolute top-0 h-full rounded-full"
                      style={{
                        left: `${(answers.budgetMin / 400) * 100}%`,
                        right: `${100 - (answers.budgetMax / 400) * 100}%`,
                        background: "linear-gradient(90deg, var(--accent-amber), var(--accent-violet))",
                      }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={400}
                      step={10}
                      value={answers.budgetMin}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setAnswers((p) => ({ ...p, budgetMin: Math.min(v, p.budgetMax - 10) }));
                      }}
                      className="budget-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent"
                      style={{ zIndex: answers.budgetMin > 350 ? 5 : 3 }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={400}
                      step={10}
                      value={answers.budgetMax}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setAnswers((p) => ({ ...p, budgetMax: Math.max(v, p.budgetMin + 10) }));
                      }}
                      className="budget-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent"
                      style={{ zIndex: 4 }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/30">
                    <span>$0</span>
                    <span>$100</span>
                    <span>$200</span>
                    <span>$300</span>
                    <span>$400</span>
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={next}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--accent-violet-line)] bg-[color:var(--accent-violet-fill)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[color:var(--accent-violet)]"
                    >
                      Confirm
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mx-auto w-full max-w-xl space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {OPTS.hand.map((opt) => {
                      const active = answers.handPreset === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => preset(opt.value as HandPreset)}
                          className={`rounded-[18px] p-[1px] text-left transition ${active ? "border border-[color:var(--accent-violet-line)] bg-[color:var(--accent-violet-fill)]" : "bg-white/20 hover:bg-white/35"}`}
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/55">
                        <Ruler className="h-3.5 w-3.5 text-[color:var(--accent-violet)]" />
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
                        className="w-full rounded-xl border border-white/20 bg-black/65 px-3 py-2 text-white outline-none transition focus:border-[color:var(--accent-violet)]"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/55">
                        <Ruler className="h-3.5 w-3.5 text-[color:var(--accent-gamer)]" />
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
                        className="w-full rounded-xl border border-white/20 bg-black/65 px-3 py-2 text-white outline-none transition focus:border-[color:var(--accent-gamer)]"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={submit}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--accent-violet-line)] bg-[color:var(--accent-violet-fill)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[color:var(--accent-violet)] disabled:opacity-60"
                    >
                      <Target className="h-3.5 w-3.5" />
                      {submitting ? "Generating..." : "Generate Report"}
                    </button>

                    <Link
                      href="/measure?from=survey"
                      onClick={() => writeJson(WIZARD_KEYS, answers)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/80 transition hover:border-[color:var(--accent-gamer-line)] hover:text-[color:var(--accent-gamer)]"
                    >
                      <MousePointer2 className="h-3.5 w-3.5" />
                      Open Measure Tool
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex w-full max-w-2xl items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, var(--accent-amber), var(--accent-violet), var(--accent-gamer))" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-white/40">{progress}%</span>
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
          <p className="mt-3 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--tone-warning-line)", background: "var(--tone-warning-fill)", color: "var(--tone-warning-text)" }}>{error}</p>
        ) : null}
      </div>
    </section>
  );
}

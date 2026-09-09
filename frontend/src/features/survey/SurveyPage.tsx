"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  completeSurvey,
  generateReport,
  saveGrip,
  saveMeasurement,
} from "@/lib/api";
import { useAuthState } from "@/hooks/useAuthState";
import { getOrCreateSessionId } from "@/lib/session";
import { getStoredReportPreferences } from "@/lib/report-preferences";
import { HandMeasurementGuide } from "./HandMeasurementGuide";
import styles from "./SurveyPage.module.css";

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
type Step =
  | OptionStep
  | BudgetStep
  | MeasureStep
  | { id: "review"; type: "review"; title: string };

const SURVEY_KEYS = ["mousefit:survey_draft", "mf:survey_draft"] as const;
const WIZARD_KEYS = [
  "mousefit:survey_wizard_state",
  "mf:survey_wizard_state",
] as const;
const MEASURE_KEYS = ["mousefit:measure", "mf:measure"] as const;
const GRIP_KEYS = ["mousefit:grip_result", "mf:grip_result"] as const;
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
  lengthMm: 0,
  widthMm: 0,
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
    {
      value: "claw",
      badge: "C",
      title: "Claw Grip",
      subtitle:
        "Your fingers arch over the buttons. The back of your palm helps anchor the mouse.",
    },
    {
      value: "palm",
      badge: "P",
      title: "Palm Grip",
      subtitle:
        "Most of your palm rests on the mouse. Your fingers lie fairly flat on the buttons.",
    },
    {
      value: "fingertip",
      badge: "F",
      title: "Fingertip Grip",
      subtitle:
        "Only your fingertips touch the mouse. Your palm stays clear of the shell.",
    },
  ] as Opt[],
  clawStyle: [
    {
      value: "relaxed",
      badge: "R",
      title: "Relaxed Claw",
      subtitle: "Softer curl and lower finger tension",
    },
    {
      value: "aggressive",
      badge: "A",
      title: "Aggressive Claw",
      subtitle: "Sharper curl and higher tension",
    },
  ] as Opt[],
  clawContact: [
    {
      value: "left",
      badge: "L",
      title: "Left Side",
      subtitle: "Palm pressure leans left",
    },
    {
      value: "right",
      badge: "R",
      title: "Right Side",
      subtitle: "Palm pressure leans right",
    },
    {
      value: "whole",
      badge: "W",
      title: "Whole Palm",
      subtitle: "Wide palm support",
    },
    {
      value: "none",
      badge: "N",
      title: "No Contact",
      subtitle: "Minimal palm anchor",
    },
  ] as Opt[],
  clawPos: [
    {
      value: "back",
      badge: "B",
      title: "Back of Mouse",
      subtitle: "Support near rear hump",
    },
    {
      value: "top",
      badge: "T",
      title: "Top of Mouse",
      subtitle: "Support near center shell",
    },
  ] as Opt[],
  palmFinger: [
    {
      value: "whole",
      badge: "W",
      title: "Whole Finger",
      subtitle: "Buttons under full finger",
    },
    {
      value: "fingertip",
      badge: "F",
      title: "Fingertip",
      subtitle: "Front fingertip pressure",
    },
  ] as Opt[],
  palmThumb: [
    {
      value: "inward",
      badge: "I",
      title: "Thumb Inward",
      subtitle: "Thumb curls toward side wall",
    },
    {
      value: "flat",
      badge: "F",
      title: "Thumb Flat",
      subtitle: "Thumb rests neutral",
    },
  ] as Opt[],
  fingerPos: [
    {
      value: "top",
      badge: "1",
      title: "Top",
      subtitle: "Thumb above ring/little",
    },
    {
      value: "middle",
      badge: "2",
      title: "Middle",
      subtitle: "Thumb aligned in middle",
    },
    {
      value: "bottom",
      badge: "3",
      title: "Bottom",
      subtitle: "Thumb below ring/little",
    },
  ] as Opt[],
  hand: [
    {
      value: "small",
      badge: "S",
      title: "Small Hand",
      subtitle: "~165mm x 82mm",
    },
    {
      value: "medium",
      badge: "M",
      title: "Medium Hand",
      subtitle: "~180mm x 90mm",
    },
    {
      value: "large",
      badge: "L",
      title: "Large Hand",
      subtitle: "~195mm x 98mm",
    },
  ] as Opt[],
};

function readJson<T>(keys: readonly string[]): T | null {
  if (typeof window === "undefined") return null;
  for (const key of keys) {
    try {
      const raw =
        window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
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
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sizeFromLen(
  lengthMm: number,
): "small" | "medium" | "large" | "xlarge" {
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
    lengthMm: toNum(src?.lengthMm) ?? l1 ?? l2 ?? l3 ?? DEFAULT.lengthMm,
    widthMm: toNum(src?.widthMm) ?? w1 ?? w2 ?? w3 ?? DEFAULT.widthMm,
  };
}

function toDraft(a: Answers) {
  const grip = (a.primaryGrip ?? "palm") as Grip;
  const fingerDirection =
    a.fingerStackPosition === "top"
      ? "left"
      : a.fingerStackPosition === "bottom"
        ? "right"
        : "center";

  return {
    primaryGrip: grip,
    gripSkipped: a.gripSkipped,
    shellShape: grip === "palm" ? "ergo" : "sym",
    humpPosition:
      grip === "claw"
        ? a.clawHandPosition === "back"
          ? "back"
          : "center"
        : "center",
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
    palmFingerCurved:
      grip === "palm"
        ? a.palmFingerContact === "fingertip"
          ? "yes"
          : "no"
        : "",
    clawRelaxed:
      grip === "claw" ? (a.clawStyle === "relaxed" ? "yes" : "no") : "",
    clawBackHandTouch:
      grip === "claw" ? (a.clawPalmContact === "none" ? "no" : "yes") : "",
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
    if (
      a.primaryGrip === "claw" &&
      (!a.clawStyle || !a.clawPalmContact || !a.clawHandPosition)
    ) {
      return "Complete all claw follow-up questions.";
    }
    if (
      a.primaryGrip === "palm" &&
      (!a.palmFingerContact || !a.palmThumbPlacement)
    ) {
      return "Complete all palm follow-up questions.";
    }
  }
  if (!a.fingerStackPosition) return "Choose your finger positioning.";
  if (
    !Number.isFinite(a.budgetMin) ||
    !Number.isFinite(a.budgetMax) ||
    a.budgetMin < 0 ||
    a.budgetMax > 400 ||
    a.budgetMin > a.budgetMax
  )
    return "Enter a budget between $0 and $400, with the minimum no greater than the maximum.";
  if (!Number.isFinite(a.lengthMm) || a.lengthMm < 100 || a.lengthMm > 260) {
    return "Hand length must be between 100 and 260 mm.";
  }
  if (!Number.isFinite(a.widthMm) || a.widthMm < 50 || a.widthMm > 130) {
    return "Hand width must be between 50 and 130 mm.";
  }
  if (a.widthMm >= a.lengthMm)
    return "Palm width must be less than hand length.";
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

  if (a.primaryGrip && !a.gripSkipped) {
    writeJson(GRIP_KEYS, { grip: a.primaryGrip });
    window.sessionStorage.setItem("mf:grip", a.primaryGrip);
  } else {
    for (const key of GRIP_KEYS) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }
    window.sessionStorage.removeItem("mf:grip");
  }

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

const subscribe = () => () => {};
export default function MousefitSurveyPage() {
  const { ready } = useAuthState();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const search = useSearchParams();
  if (!ready || !mounted)
    return (
      <div className={styles.loading}>
        <Loader2 aria-hidden="true" /> Loading your fit survey…
      </div>
    );
  return (
    <SurveyFlow
      key={search.get("step") ?? "start"}
      initialStep={search.get("step") ?? "measure"}
    />
  );
}

function SurveyFlow({ initialStep }: { initialStep: string }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(loadInitial);
  const [stepId, setStepId] = useState(initialStep);
  const [direction, setDirection] = useState("forward");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(stepId);
  useEffect(() => writeJson(WIZARD_KEYS, answers), [answers]);
  useEffect(() => {
    if (previousStep.current !== stepId) {
      heading.current?.focus();
      previousStep.current = stepId;
    }
  }, [stepId]);
  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [
      { id: "measure", type: "measure", title: "Measure your hand" },
      {
        id: "grip",
        type: "options",
        title: "Find your grip style",
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
        id: "review",
        type: "review",
        title: "Review your fit profile",
      },
    );

    return list;
  }, [
    answers.primaryGrip,
    answers.clawStyle,
    answers.clawPalmContact,
    answers.clawHandPosition,
    answers.palmFingerContact,
    answers.palmThumbPlacement,
    answers.fingerStackPosition,
  ]);

  const index = Math.max(
    0,
    steps.findIndex((step) => step.id === stepId),
  );
  const current = steps[index];
  const stage =
    current.type === "measure"
      ? 0
      : current.type === "options"
        ? 1
        : current.type === "budget"
          ? 2
          : 3;
  const gripQuestions = steps.filter((step) => step.type === "options");
  const jump = (id: string) => {
    if (submitting) return;
    setDirection(
      steps.findIndex((step) => step.id === id) < index ? "back" : "forward",
    );
    setError("");
    setStepId(id);
  };
  const next = () => {
    if (
      current.type === "budget" &&
      (!Number.isFinite(answers.budgetMin) ||
        !Number.isFinite(answers.budgetMax) ||
        answers.budgetMin < 0 ||
        answers.budgetMax > 400 ||
        answers.budgetMin > answers.budgetMax)
    ) {
      setError(
        "Enter a budget between $0 and $400, with the minimum no greater than the maximum.",
      );
      return;
    }
    if (current.type === "measure") {
      if (
        !Number.isFinite(answers.lengthMm) ||
        answers.lengthMm < 100 ||
        answers.lengthMm > 260 ||
        !Number.isFinite(answers.widthMm) ||
        answers.widthMm < 50 ||
        answers.widthMm > 130 ||
        answers.widthMm >= answers.lengthMm
      ) {
        setError(
          "Enter a hand length of 100–260 mm and a palm width of 50–130 mm. Width must be less than length.",
        );
        return;
      }
    }
    if (
      current.type === "options" &&
      !current.value &&
      !(current.id === "grip" && answers.gripSkipped)
    ) {
      setError("Choose the description that fits you before continuing.");
      return;
    }
    jump(steps[Math.min(index + 1, steps.length - 1)].id);
  };
  const choose = (step: OptionStep, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [step.key]: value,
      ...(step.key === "primaryGrip" ? { gripSkipped: false } : {}),
    }));
    setError("");
  };
  const submit = async () => {
    if (submitting) return;
    const msg = validate(answers);
    if (msg) {
      setError(msg);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const sessionId = getOrCreateSessionId();
      await saveMeasurement({
        session_id: sessionId,
        length_mm: Math.round(answers.lengthMm),
        width_mm: Math.round(answers.widthMm),
      });
      if (answers.primaryGrip && !answers.gripSkipped)
        await saveGrip({ session_id: sessionId, grip: answers.primaryGrip });
      persist(answers);
      await completeSurvey();
      await generateReport(sessionId, getStoredReportPreferences());
      router.push("/report");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your fit profile could not be saved. Please try again.",
      );
      setSubmitting(false);
    }
  };
  const description =
    current.type === "measure"
      ? "Two measurements help us compare mouse sizes with your hand. Enter them with a ruler, or use the optional camera tool."
      : current.id === "grip"
        ? "Hold your mouse as you normally would while playing. Choose the contact pattern closest to your usual grip."
        : current.type === "options"
          ? "Keep your usual hold and choose the closest description. These details help us compare mouse shapes."
          : current.type === "budget"
            ? "Set a price range in US dollars for your recommendations."
            : "Check your measurements, grip and budget before generating your recommendations.";

  return (
    <main className={styles.survey} data-direction={direction}>
      <nav className={styles.steps} aria-label="Fit survey stages">
        {[
          { id: "measure", label: "Your hand" },
          { id: "grip", label: "Your grip" },
          { id: "budget", label: "Your budget" },
          { id: "review", label: "Review" },
        ].map((item, i) => (
          <button
            key={item.id}
            type="button"
            aria-current={stage === i ? "step" : undefined}
            onClick={() => jump(item.id)}
            disabled={submitting}
          >
            <span>{i + 1}</span>
            {item.label}
          </button>
        ))}
        <div className={styles.progress} aria-hidden="true">
          <div style={{ transform: `scaleX(${(stage + 1) / 4})` }} />
        </div>
      </nav>
      <header key={`heading-${current.id}`} className={styles.header}>
        <p className={styles.eyebrow}>Find your mouse fit · {stage + 1} of 4</p>
        <h1 ref={heading} tabIndex={-1}>
          {current.title}
        </h1>
        <p>{description}</p>
      </header>
      <section
        key={current.id}
        className={styles.panel}
        aria-label={current.title}
        aria-busy={submitting}
      >
        {current.type === "measure" ? (
          <>
            <div className={styles.measureGrid}>
              <HandMeasurementGuide />
              <div>
                <h2>Use a ruler</h2>
                <p>Lay your hand flat with fingers together and relaxed.</p>
                <label htmlFor="hand-length">Hand length (mm)</label>
                <p id="length-help" className={styles.help}>
                  Wrist crease to the tip of your middle finger.
                </p>
                <input
                  id="hand-length"
                  aria-describedby="length-help"
                  type="number"
                  inputMode="decimal"
                  min="100"
                  max="260"
                  step="0.1"
                  value={answers.lengthMm || ""}
                  placeholder="e.g. 180"
                  onChange={(e) =>
                    setAnswers((p) => ({
                      ...p,
                      handPreset: null,
                      lengthMm: Number(e.target.value),
                    }))
                  }
                />
                <label htmlFor="hand-width">Palm width (mm)</label>
                <p id="width-help" className={styles.help}>
                  Across the widest part of your palm, excluding your thumb.
                </p>
                <input
                  id="hand-width"
                  aria-describedby="width-help"
                  type="number"
                  inputMode="decimal"
                  min="50"
                  max="130"
                  step="0.1"
                  value={answers.widthMm || ""}
                  placeholder="e.g. 90"
                  onChange={(e) =>
                    setAnswers((p) => ({
                      ...p,
                      handPreset: null,
                      widthMm: Number(e.target.value),
                    }))
                  }
                />
                <p className={styles.help}>
                  Using centimeters? Multiply by 10: 18 cm = 180 mm.
                </p>
              </div>
            </div>
            <details className={styles.estimates}>
              <summary>No ruler? Start with an estimate</summary>
              <p>
                Estimates are approximate. Measured values make the size
                comparison more useful.
              </p>
              <div className={styles.estimateOptions}>
                {OPTS.hand.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={answers.handPreset === opt.value}
                    onClick={() =>
                      setAnswers((p) => ({
                        ...p,
                        handPreset: opt.value as HandPreset,
                        ...PRESETS[opt.value as HandPreset],
                      }))
                    }
                  >
                    <strong>{opt.title}</strong>
                    <span>{opt.subtitle}</span>
                  </button>
                ))}
              </div>
            </details>
            <div className={styles.cameraOption}>
              <div>
                <h2>Prefer to measure with a camera?</h2>
                <p>
                  You’ll need a flat surface and a standard 85.6 × 54 mm card.
                </p>
              </div>
              <Link
                href="/measure?from=survey"
                onClick={() => writeJson(WIZARD_KEYS, answers)}
              >
                <Camera aria-hidden="true" /> Measure with camera
              </Link>
            </div>
          </>
        ) : current.type === "options" ? (
          <>
            {current.id !== "grip" ? (
              <p className={styles.help}>
                Grip detail{" "}
                {gripQuestions.findIndex((step) => step.id === current.id)} of{" "}
                {gripQuestions.length - 1}
              </p>
            ) : null}
            <fieldset className={styles.choices} data-cols={current.cols}>
              <legend>
                {current.id === "grip"
                  ? "Which contact pattern feels closest?"
                  : "Choose one option"}
              </legend>
              {current.options.map((opt) => (
                <label
                  key={opt.value}
                  data-selected={current.value === opt.value}
                >
                  <input
                    type="radio"
                    name={current.id}
                    value={opt.value}
                    checked={current.value === opt.value}
                    onChange={() => choose(current, opt.value)}
                  />
                  <strong>{opt.title}</strong>
                  <Check className={styles.selectionCheck} aria-hidden="true" />
                  <span>{opt.subtitle}</span>
                </label>
              ))}
            </fieldset>
            {current.id === "grip" ? (
              <>
                <div className={styles.cameraOption}>
                  <div>
                    <h2>Not sure which grip you use?</h2>
                    <p>
                      The camera can suggest a grip from top, bottom and side
                      views.
                    </p>
                  </div>
                  <Link
                    href="/grip?from=survey"
                    onClick={() => writeJson(WIZARD_KEYS, answers)}
                  >
                    <Camera aria-hidden="true" /> Check grip with camera
                  </Link>
                </div>
                <button
                  className={styles.textButton}
                  type="button"
                  onClick={() => {
                    setAnswers((p) => ({
                      ...p,
                      primaryGrip: null,
                      gripSkipped: true,
                    }));
                    jump("finger-pos");
                  }}
                >
                  I’m not sure — skip grip identification
                </button>
              </>
            ) : null}
          </>
        ) : current.type === "budget" ? (
          <div className={styles.budget}>
            <h2>Your price range</h2>
            <div className={styles.budgetValues}>
              <label>
                Minimum (USD)
                <input
                  type="number"
                  min={0}
                  max={answers.budgetMax}
                  step={10}
                  value={answers.budgetMin}
                  onChange={(e) =>
                    setAnswers((p) => ({
                      ...p,
                      budgetMin: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <span>to</span>
              <label>
                Maximum (USD)
                <input
                  type="number"
                  min={answers.budgetMin}
                  max={400}
                  step={10}
                  value={answers.budgetMax}
                  onChange={(e) =>
                    setAnswers((p) => ({
                      ...p,
                      budgetMax: Number(e.target.value),
                    }))
                  }
                />
              </label>
            </div>
            <label className={styles.rangeLabel}>
              Adjust maximum: ${answers.budgetMax}
              <input
                type="range"
                min={answers.budgetMin}
                max={400}
                step={10}
                value={answers.budgetMax}
                onChange={(e) =>
                  setAnswers((p) => ({
                    ...p,
                    budgetMax: Number(e.target.value),
                  }))
                }
              />
            </label>
            <div className={styles.estimateOptions}>
              {Object.entries(RANGES).map(([tier, range]) => (
                <button
                  key={tier}
                  type="button"
                  aria-pressed={
                    answers.budgetMin === range.min &&
                    answers.budgetMax === range.max
                  }
                  onClick={() =>
                    setAnswers((p) => ({
                      ...p,
                      budgetMin: range.min,
                      budgetMax: range.max,
                    }))
                  }
                >
                  <strong className={styles.capitalize}>{tier}</strong>
                  <span>
                    ${range.min}–${range.max}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <h2>Your fit profile</h2>
            <dl className={styles.review}>
              <div>
                <dt>Hand measurements</dt>
                <dd>
                  {answers.lengthMm && answers.widthMm
                    ? `${answers.lengthMm} mm long · ${answers.widthMm} mm wide${answers.handPreset ? " (estimated)" : ""}`
                    : "Not entered"}
                </dd>
                <button onClick={() => jump("measure")}>
                  Edit measurements
                </button>
              </div>
              <div>
                <dt>Grip style</dt>
                <dd className={styles.capitalize}>
                  {answers.gripSkipped
                    ? "Not sure — skipped"
                    : (answers.primaryGrip ?? "Not selected")}
                </dd>
                <button onClick={() => jump("grip")}>Edit grip</button>
              </div>
              {gripQuestions
                .filter((step) => step.id !== "grip")
                .map((step) =>
                  step.type === "options" ? (
                    <div key={step.id}>
                      <dt>{step.title}</dt>
                      <dd>
                        {step.options.find((opt) => opt.value === step.value)
                          ?.title ?? "Not selected"}
                      </dd>
                      <button onClick={() => jump(step.id)}>
                        Edit {step.title.toLowerCase()}
                      </button>
                    </div>
                  ) : null,
                )}
              <div>
                <dt>Budget</dt>
                <dd>
                  ${answers.budgetMin}–${answers.budgetMax} USD
                </dd>
                <button onClick={() => jump("budget")}>Edit budget</button>
              </div>
            </dl>
            <p className={styles.help}>
              Your answers will be saved when you generate your recommendations.
            </p>
          </>
        )}
        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        <footer className={styles.actions}>
          {index > 0 ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => jump(steps[index - 1].id)}
            >
              <ChevronLeft aria-hidden="true" /> Back
            </button>
          ) : (
            <span className={styles.help}>
              Your draft is saved on this device.
            </span>
          )}
          {current.type === "review" ? (
            <button
              type="button"
              className={styles.primary}
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? (
                <Loader2 className={styles.spin} aria-hidden="true" />
              ) : (
                <Check aria-hidden="true" />
              )}
              {submitting ? "Finding your fit…" : "Find my mouse fit"}
            </button>
          ) : (
            <button type="button" className={styles.primary} onClick={next}>
              Continue <ChevronRight aria-hidden="true" />
            </button>
          )}
        </footer>
      </section>
    </main>
  );
}

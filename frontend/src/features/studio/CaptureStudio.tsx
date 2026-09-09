"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Camera, Check, Ruler } from "lucide-react";
import { ShellNav } from "@/components/shell/ShellNav";
import { getApiBase, saveGrip, saveMeasurement } from "@/services/api";
import { getOrCreateSessionId } from "@/lib/session";
import styles from "./CaptureStudio.module.css";

type Kind = "measure" | "grip";
type Grip = "palm" | "claw" | "fingertip";
const grips: { id: Grip; title: string; detail: string }[] = [
  {
    id: "palm",
    title: "Palm",
    detail:
      "Most of your palm rests on the mouse. Your fingers lie fairly flat on the buttons.",
  },
  {
    id: "claw",
    title: "Claw",
    detail:
      "Your fingers arch over the buttons. The back of your palm helps anchor the mouse.",
  },
  {
    id: "fingertip",
    title: "Fingertip",
    detail:
      "Only your fingertips touch the mouse. Your palm stays clear of the shell.",
  },
];

function CameraCapture({
  kind,
  css,
  html,
  onResult,
}: {
  kind: Kind;
  css: string;
  html: string;
  onResult: (data: Record<string, unknown>) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(650);
  // A document per capture session isolates the legacy modules' DOM references,
  // styles and listeners. Removing it also releases the camera on navigation.
  const documentHtml = useMemo(() => {
    const computed = getComputedStyle(document.documentElement);
    const variables = Array.from(computed)
      .filter((name) => name.startsWith("--"))
      .map((name) => `${name}:${computed.getPropertyValue(name)}`)
      .join(";");
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>:root{${variables}}body{margin:0} ${css}
      .tool-shell{height:auto;min-height:0;overflow:visible}.wrap{min-height:0;transform:none}.stage{min-height:280px}.coach{position:static!important;width:100%!important;max-height:none!important}.coach-close{display:none!important}.panel{overflow:visible}.stage .gripGuide .label{display:block;background:var(--surface);padding:8px;border-radius:6px;align-self:flex-start;margin-top:45px}.btn-group{grid-template-columns:1fr}.hint{font-size:13px!important}.point{width:28px;height:28px}button:disabled{opacity:.45;cursor:not-allowed}button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
      @media(max-width:1100px){.wrap{padding:0;min-height:0}.stage{aspect-ratio:4/3}.control-dock,.panel{height:auto}.coach{display:block!important}}
      </style></head><body><div class="tool-shell">${html}</div><script>
      window.__MOUSEFIT_API_BASE__=${JSON.stringify(getApiBase()).replace(/</g, "\\u003c")};
      window.__MOUSEFIT_CAPTURE_REVIEW__=true;
      const send = data => parent.postMessage({type:'mousefit-capture',kind:${JSON.stringify(kind)},...data},${JSON.stringify(window.location.origin)});
      window.finishMeasurement=(length,width)=>send({length,width});
      window.finishGrip=grip=>send({grip});
      new ResizeObserver(()=>send({height:document.body.scrollHeight})).observe(document.body);
      window.addEventListener('pagehide',()=>{window.stopCam?.();window.stopCamGrip?.()});
      </script><script type="module" src="/src/js/${kind === "measure" ? "main" : "grip"}.js?v=studio-review-1"></script></body></html>`;
  }, [css, html, kind]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== window.location.origin ||
        event.data?.type !== "mousefit-capture" ||
        event.data.kind !== kind
      )
        return;
      if (typeof event.data.height === "number")
        setHeight(Math.max(300, Math.min(1800, event.data.height)));
      else onResult(event.data);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [kind, onResult]);
  return (
    <iframe
      ref={frame}
      title={
        kind === "measure" ? "Hand measurement camera" : "Grip capture camera"
      }
      srcDoc={documentHtml}
      allow="camera"
      className={styles.camera}
      style={{ height }}
    />
  );
}

export default function CaptureStudio({
  kind,
  cameraStyles,
  cameraHtml,
}: {
  kind: Kind;
  cameraStyles: string;
  cameraHtml: string;
}) {
  const measuring = kind === "measure";
  const [mode, setMode] = useState<"choose" | "manual" | "camera" | "review">(
    "choose",
  );
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [grip, setGrip] = useState<Grip | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fromSurvey = useSearchParams().get("from") === "survey";
  const resultRef = useRef<HTMLElement>(null);
  const receiveResult = useCallback(
    (data: Record<string, unknown>) => {
      if (measuring) {
        if (!Number.isFinite(data.length) || !Number.isFinite(data.width)) {
          setError("The photo could not be measured reliably. Enter ruler measurements or change method to retake it.");
          setMode("review");
          return;
        }
        setLength(Number(data.length).toFixed(1));
        setWidth(Number(data.width).toFixed(1));
      } else if (grips.some((item) => item.id === data.grip))
        setGrip(data.grip as Grip);
      else
        setError(
          "The camera could not identify your grip. Choose the description that matches how you hold your mouse.",
        );
      setMode("review");
    },
    [measuring],
  );
  useEffect(() => {
    if (mode === "review" || saved) resultRef.current?.focus();
  }, [mode, saved]);

  async function save() {
    if (saving) return;
    const lengthMm = Number(length),
      widthMm = Number(width);
    if (
      measuring &&
      (!length ||
        !width ||
        !Number.isFinite(lengthMm) ||
        !Number.isFinite(widthMm) ||
        lengthMm < 100 ||
        lengthMm > 260 ||
        widthMm < 50 ||
        widthMm > 130 ||
        widthMm >= lengthMm)
    ) {
      setError(
        "Enter a hand length of 100–260 mm and a palm width of 50–130 mm. Width must be less than length.",
      );
      return;
    }
    if (!measuring && !grip) {
      setError("Choose a grip style before continuing.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const session_id = getOrCreateSessionId();
      if (measuring)
        await saveMeasurement({
          session_id,
          length_mm: lengthMm,
          width_mm: widthMm,
        });
      else await saveGrip({ session_id, grip: grip! });
      // Keep the survey draft and report inputs in sync only after API success.
      const patch = measuring
        ? { lengthMm, widthMm }
        : { primaryGrip: grip, gripSkipped: false };
      for (const key of [
        "mousefit:survey_wizard_state",
        "mf:survey_wizard_state",
      ]) {
        let draft = {};
        try {
          draft = JSON.parse(
            localStorage.getItem(key) || sessionStorage.getItem(key) || "{}",
          );
        } catch {}
        const value = JSON.stringify({ ...draft, ...patch });
        localStorage.setItem(key, value);
        sessionStorage.setItem(key, value);
      }
      if (measuring) {
        sessionStorage.setItem("mf:length_mm", String(lengthMm));
        sessionStorage.setItem("mf:width_mm", String(widthMm));
        const value = JSON.stringify({
          len_mm: lengthMm,
          wid_mm: widthMm,
          len_cm: lengthMm / 10,
          wid_cm: widthMm / 10,
        });
        for (const key of ["mousefit:measure", "mf:measure"]) {
          localStorage.setItem(key, value);
          sessionStorage.setItem(key, value);
        }
      } else {
        sessionStorage.setItem("mf:grip", grip!);
        for (const key of ["mousefit:grip_result", "mf:grip_result"]) {
          const value = JSON.stringify({ grip });
          localStorage.setItem(key, value);
          sessionStorage.setItem(key, value);
        }
      }
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your result could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ShellNav currentPage={kind} />
      <main className={styles.studio}>
        <nav aria-label="Fitting steps" className={styles.steps}>
          <Link href="/measure" aria-current={measuring ? "step" : undefined}>
            1. Measure hand
          </Link>
          <Link href="/grip" aria-current={!measuring ? "step" : undefined}>
            2. Identify grip
          </Link>
          <Link href="/survey">3. Find your fit</Link>
        </nav>
        <header>
          <p className={styles.eyebrow}>
            {measuring ? "Start with your hand" : "How you hold your mouse"}
          </p>
          <h1>{measuring ? "Measure your hand" : "Find your grip style"}</h1>
          <p>
            {measuring
              ? "Two measurements help us compare mouse sizes with your hand. Use a ruler, or capture a photo with a reference card."
              : "Hold your mouse as you normally would while playing. Choose the closest description, or use the camera for a suggestion."}
          </p>
        </header>
        {saved ? (
          <section
            ref={resultRef}
            tabIndex={-1}
            className={styles.panel}
            aria-labelledby="saved-title"
          >
            <Check aria-hidden="true" />
            <h2 id="saved-title">
              {measuring ? "Measurements saved" : "Grip saved"}
            </h2>
            <p>
              {measuring
                ? `${length} mm long · ${width} mm wide`
                : `${grip} grip`}
            </p>
            <p>
              {fromSurvey
                ? "Return to your fitting questions with this result."
                : measuring
                  ? "Next, identify how you hold your mouse."
                  : "Finish your preferences to generate your mouse recommendations."}
            </p>
            <div className={styles.actions}>
              <Link
                className={styles.primary}
                href={
                  fromSurvey
                    ? `/survey?step=${kind}`
                    : measuring
                      ? "/grip"
                      : "/survey"
                }
              >
                {fromSurvey
                  ? "Return to fitting questions"
                  : measuring
                    ? "Continue to grip"
                    : "Find my fit"}
              </Link>
              <button
                onClick={() => {
                  setSaved(false);
                  setMode("manual");
                }}
              >
                Edit result
              </button>
            </div>
          </section>
        ) : (
          <>
            {mode === "choose" ? (
              <div className={styles.methods}>
                <button
                  className={styles.method}
                  onClick={() => setMode("manual")}
                >
                  <Ruler aria-hidden="true" />
                  <strong>
                    {measuring ? "Use a ruler" : "Choose my grip"}
                  </strong>
                  <span>
                    {measuring
                      ? "Enter length and width in millimeters. No camera needed."
                      : "Compare three grip descriptions and choose your usual hold."}
                  </span>
                  <b>{measuring ? "Enter measurements" : "Compare grips"} →</b>
                </button>
                <button
                  className={styles.method}
                  onClick={() => setMode("camera")}
                >
                  <Camera aria-hidden="true" />
                  <strong>
                    {measuring
                      ? "Measure with camera"
                      : "Get a camera suggestion"}
                  </strong>
                  <span>
                    {measuring
                      ? "You’ll need a flat surface and a standard card, 85.6 × 54 mm."
                      : "Capture top, bottom and side views. Review the suggestion before saving."}
                  </span>
                  <b>Open camera →</b>
                </button>
              </div>
            ) : (
              <>
                <div className={styles.actions}>
                  <button
                    onClick={() => {
                      setMode("choose");
                      setError("");
                    }}
                  >
                    ← Change method
                  </button>
                  {mode === "camera" ? (
                    <button onClick={() => setMode("manual")}>
                      {measuring
                        ? "Enter measurements instead"
                        : "Choose grip instead"}
                    </button>
                  ) : null}
                </div>
                {mode === "camera" ? (
                  <CameraCapture
                    kind={kind}
                    css={cameraStyles}
                    html={cameraHtml}
                    onResult={receiveResult}
                  />
                ) : (
                  <section
                    className={styles.panel}
                    ref={resultRef}
                    tabIndex={-1}
                    aria-labelledby="review-title"
                  >
                    <h2 id="review-title">
                      {mode === "review"
                        ? "Review your result"
                        : measuring
                          ? "Measure from wrist to fingertip"
                          : "Choose your usual grip"}
                    </h2>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void save();
                      }}
                    >
                      {measuring ? (
                        <div className={styles.measureGrid}>
                          <svg
                            viewBox="0 0 240 250"
                            role="img"
                            aria-label="Measure hand length from the wrist crease to the middle fingertip, and palm width across the knuckles, excluding the thumb."
                          >
                            <path
                              d="M79 221 L78 179 Q53 163 46 135 Q39 117 49 113 Q57 111 72 136 L74 72 Q75 56 84 58 Q94 59 94 73 L95 109 L99 40 Q100 26 109 29 Q118 29 118 43 L118 104 L125 31 Q127 18 136 22 Q144 24 142 38 L139 108 L148 51 Q151 39 160 44 Q167 48 163 61 L151 149 Q148 173 143 184 L143 221 Z"
                              fill="var(--shell-surface-soft)"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                            <path
                              d="M78 199 L145 199 M73 142 L151 142 M184 23 L184 199 M177 23 L191 23 M177 199 L191 199"
                              fill="none"
                              stroke="var(--shell-accent)"
                              strokeWidth="2"
                            />
                            <text
                              x="192"
                              y="111"
                              fontSize="12"
                              fill="currentColor"
                            >
                              Length
                            </text>
                            <text
                              x="93"
                              y="159"
                              fontSize="12"
                              fill="currentColor"
                            >
                              Width
                            </text>
                          </svg>
                          <div>
                            <p>
                              Lay your hand flat with fingers together and
                              relaxed.
                            </p>
                            <label htmlFor="hand-length">
                              Hand length (mm)
                            </label>
                            <p className={styles.help}>
                              Wrist crease to the tip of your middle finger.
                            </p>
                            <input
                              id="hand-length"
                              type="number"
                              inputMode="decimal"
                              min="100"
                              max="260"
                              step="0.1"
                              required
                              value={length}
                              onChange={(e) => setLength(e.target.value)}
                              placeholder="e.g. 180"
                            />
                            <label htmlFor="hand-width">Palm width (mm)</label>
                            <p className={styles.help}>
                              Across the widest part of your palm, excluding the
                              thumb.
                            </p>
                            <input
                              id="hand-width"
                              type="number"
                              inputMode="decimal"
                              min="50"
                              max="130"
                              step="0.1"
                              required
                              value={width}
                              onChange={(e) => setWidth(e.target.value)}
                              placeholder="e.g. 90"
                            />
                            <p className={styles.help}>
                              Using centimeters? Multiply by 10: 18 cm = 180 mm.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <fieldset className={styles.grips}>
                          <legend>Which contact pattern feels closest?</legend>
                          {grips.map((item) => (
                            <label
                              key={item.id}
                              className={styles.grip}
                              data-selected={grip === item.id}
                            >
                              <input
                                type="radio"
                                name="grip"
                                value={item.id}
                                checked={grip === item.id}
                                onChange={() => setGrip(item.id)}
                              />
                              <strong>{item.title}</strong>
                              <span>{item.detail}</span>
                            </label>
                          ))}
                        </fieldset>
                      )}
                      {error ? (
                        <p role="alert" className={styles.error}>
                          {error}
                        </p>
                      ) : null}
                      <div className={styles.actions}>
                        <button
                          type="submit"
                          className={styles.primary}
                          disabled={saving}
                        >
                          {saving
                            ? "Saving…"
                            : measuring
                              ? "Save measurements"
                              : "Save grip"}
                        </button>
                        <span className={styles.help}>
                          {mode === "review"
                            ? "Adjust anything that doesn’t look right before saving."
                            : "You can update this later."}
                        </span>
                      </div>
                    </form>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}

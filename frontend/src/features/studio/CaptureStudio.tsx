"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Check } from "lucide-react";
import { ShellNav } from "@/components/shell/ShellNav";
import { getApiBase, saveGrip, saveMeasurement } from "@/services/api";
import { getOrCreateSessionId } from "@/lib/session";
import styles from "./CaptureStudio.module.css";

type Kind = "measure" | "grip";
type Grip = "palm" | "claw" | "fingertip";

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
  const [mode, setMode] = useState<"prepare" | "camera" | "review">("prepare");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [grip, setGrip] = useState<Grip | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const returnHref = `/survey?step=${kind}`;
  const resultRef = useRef<HTMLElement>(null);
  const receiveResult = useCallback(
    (data: Record<string, unknown>) => {
      setError("");
      if (measuring) {
        const l = Number(data.length),
          w = Number(data.width);
        if (
          !Number.isFinite(l) ||
          !Number.isFinite(w) ||
          l < 100 ||
          l > 260 ||
          w < 50 ||
          w > 130 ||
          w >= l
        ) {
          setLength("");
          setWidth("");
          setError(
            "The photo could not be measured reliably. Retake it, or enter ruler measurements in the survey.",
          );
        } else {
          setLength(l.toFixed(1));
          setWidth(w.toFixed(1));
        }
      } else if (["palm", "claw", "fingertip"].includes(String(data.grip))) {
        setGrip(data.grip as Grip);
      } else {
        setGrip(null);
        setError(
          "The camera could not identify your grip. Retake the views, or choose your grip in the survey.",
        );
      }
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
        ? { lengthMm, widthMm, handPreset: null }
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
        <nav className={styles.steps} aria-label="Return to fitting survey">
          <Link href={returnHref}>← Back to fit survey</Link>
        </nav>
        <header>
          <p className={styles.eyebrow}>Optional camera capture · Fit survey</p>
          <h1>
            {measuring
              ? "Measure with your camera"
              : "Check your grip with your camera"}
          </h1>
          <p>
            {measuring
              ? "Capture your hand with a reference card, then review the measurements and bring them back to your survey."
              : "Capture your usual mouse grip from three views, then review the suggestion and continue your survey."}
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
              Your result is ready in the survey. You can adjust it there before
              finding your fit.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primary} href={returnHref}>
                Continue survey
              </Link>
            </div>
          </section>
        ) : mode === "prepare" ? (
          <section className={styles.panel} aria-labelledby="prepare-title">
            <Camera aria-hidden="true" />
            <h2 id="prepare-title">
              {measuring
                ? "Set up your hand and reference card"
                : "Hold your mouse as you normally would"}
            </h2>
            <p>
              {measuring
                ? "Place your hand flat beside a standard 85.6 × 54 mm card on the same surface. Use good lighting and keep the camera directly above both."
                : "You’ll capture top, bottom and side views. Keep your normal grip and follow the guide for each view."}
            </p>
            <p>
              Camera access starts when you open the camera. You’ll review the
              result before saving.
            </p>
            <div className={styles.actions}>
              <button
                className={styles.primary}
                onClick={() => setMode("camera")}
              >
                Open camera
              </button>
              <Link href={returnHref}>
                {measuring
                  ? "Enter measurements in survey"
                  : "Choose grip in survey"}
              </Link>
            </div>
          </section>
        ) : mode === "camera" ? (
          <>
            <div className={styles.actions}>
              <Link href={returnHref}>Continue survey without camera</Link>
            </div>
            <CameraCapture
              kind={kind}
              css={cameraStyles}
              html={cameraHtml}
              onResult={receiveResult}
            />
          </>
        ) : (
          <section
            ref={resultRef}
            tabIndex={-1}
            className={styles.panel}
            aria-labelledby="review-title"
          >
            <h2 id="review-title">Review your capture</h2>
            {measuring && length && width ? (
              <p className={styles.result}>
                {length} mm long · {width} mm wide
              </p>
            ) : !measuring && grip ? (
              <p className={styles.result}>{grip} grip</p>
            ) : null}
            <p>
              Keep this result if it looks right. You can make manual
              adjustments in the survey.
            </p>
            {error ? (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            ) : null}
            <div className={styles.actions}>
              <button
                className={styles.primary}
                disabled={saving || (measuring ? !length || !width : !grip)}
                onClick={() => void save()}
              >
                {saving ? "Saving…" : "Use this result"}
              </button>
              <button
                disabled={saving}
                onClick={() => {
                  setError("");
                  setMode("camera");
                }}
              >
                Retake capture
              </button>
              <Link href={returnHref}>Return to survey</Link>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

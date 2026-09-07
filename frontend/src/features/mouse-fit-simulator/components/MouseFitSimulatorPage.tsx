"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useProgress } from "@react-three/drei";
import {
  Move3D,
  Rotate3D,
  ZoomIn,
} from "lucide-react";
import {
  MouseFitSimulatorProvider,
  useMouseFitSimulator,
} from "../store/MouseFitSimulatorStore";
import { loadMouseModelManifest } from "../data/mouse-model-manifest";
import MouseFitScene from "../scene/MouseFitScene";
import type { CameraView } from "../types";
import MouseFitInfoPanel from "./MouseFitInfoPanel";
import MouseFitSidebar from "./MouseFitSidebar";
import SimulatorErrorBoundary from "./SimulatorErrorBoundary";
import styles from "./MouseFitSimulator.module.css";

const QUICK_VIEWS: Array<{ id: Exclude<CameraView, "free">; label: string }> = [
  { id: "perspective", label: "Perspective" },
  { id: "top", label: "Top" },
  { id: "side", label: "Side" },
  { id: "front", label: "Front" },
];

function UrlStateSync() {
  const router = useRouter();
  const pathname = usePathname();
  const { hand, gripStyle, mouseId } = useMouseFitSimulator();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (mouseId) params.set("mouse", mouseId);
    else params.delete("mouse");
    params.set("hand", String(hand.lengthCm));
    params.set("grip", gripStyle);
    params.set("side", hand.handedness);
    const nextSearch = params.toString();
    if (window.location.search.slice(1) === nextSearch) return;
    router.replace(`${pathname}?${nextSearch}`, { scroll: false });
  }, [gripStyle, hand.handedness, hand.lengthCm, mouseId, pathname, router]);

  return null;
}

function AssetProgress() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className={styles.loadingOverlay} role="status" aria-live="polite">
      <span>Loading 3D assets</span>
      <div><span style={{ width: `${progress}%` }} /></div>
      <strong>{Math.round(progress)}%</strong>
    </div>
  );
}

function Viewport() {
  const {
    hand,
    gripStyle,
    selectedMouse,
    mouseModelsLoaded,
    cameraView,
    isInteracting,
    setCameraView,
    resetCamera,
  } = useMouseFitSimulator();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "r" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      resetCamera();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resetCamera]);

  return (
    <section
      className={styles.viewerPanel}
      aria-label="Interactive 3D mouse and hand fit viewer"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className={styles.viewerToolbar}>
        <div className={styles.interactionHints} aria-label="Viewer controls">
          <span><Rotate3D aria-hidden="true" />Drag to rotate</span>
          <span><ZoomIn aria-hidden="true" />Scroll to zoom</span>
          <span><Move3D aria-hidden="true" />Right-click to pan</span>
        </div>
        <div className={styles.quickViews}>
          <span>Quick views</span>
          {QUICK_VIEWS.map((view) => (
            <button
              type="button"
              key={view.id}
              className={cameraView === view.id ? styles.quickViewActive : ""}
              aria-pressed={cameraView === view.id}
              onClick={() => setCameraView(view.id)}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.canvasStage} data-interacting={isInteracting || undefined}>
        <SimulatorErrorBoundary>
          <MouseFitScene />
        </SimulatorErrorBoundary>
        <AssetProgress />
      </div>

      <div className={styles.viewerStatus} aria-live="polite">
        <span>{selectedMouse ? "Imported mouse model" : "Mouse model library"}</span>
        <strong>{selectedMouse ? `${selectedMouse.brand} ${selectedMouse.name}` : mouseModelsLoaded ? "No imported mouse selected" : "Loading model library"}</strong>
        <small>{hand.lengthCm.toFixed(1)} cm · {gripStyle} grip · {hand.handedness} hand</small>
        {selectedMouse ? (
          <a className={styles.modelAttribution} href={selectedMouse.sourceUrl} target="_blank" rel="noreferrer">
            Model source & license
          </a>
        ) : null}
      </div>
      {selectedMouse ? (
        <div className={styles.scaleReference} aria-label="Hand and mouse size comparison">
          <span>SIZE REFERENCE · EXTENDED HAND</span>
          <strong>Hand {hand.lengthCm.toFixed(1)} cm</strong>
          <i style={{ width: "100%", background: "#d4b394" }} />
          <strong>Mouse {((selectedMouse.dimensionsMm.lengthMm ?? 120) / 10).toFixed(1)} cm</strong>
          <i style={{ width: `${Math.min(100, (selectedMouse.dimensionsMm.lengthMm ?? 120) / (hand.lengthCm * 10) * 100)}%`, background: "#87b5d0" }} />
          <small>A bent hand has a shorter reach.</small>
        </div>
      ) : null}
    </section>
  );
}

function SimulatorContent() {
  const { setMouseModels } = useMouseFitSimulator();

  useEffect(() => {
    let cancelled = false;
    void loadMouseModelManifest()
      .then((manifest) => {
        if (!cancelled) setMouseModels(manifest.models);
      })
      .catch(() => {
        if (!cancelled) setMouseModels([]);
      });
    return () => {
      cancelled = true;
    };
  }, [setMouseModels]);

  return (
    <main className={styles.simulatorRoot}>
      <UrlStateSync />
      <MouseFitSidebar />
      <Viewport />
      <MouseFitInfoPanel />
    </main>
  );
}

export default function MouseFitSimulatorPage() {
  const [demoEntered, setDemoEntered] = useState(false);

  return (
    <MouseFitSimulatorProvider>
      <div className={styles.demoGate}>
        <div
          className={styles.demoGateBackground}
          aria-hidden={!demoEntered || undefined}
          inert={!demoEntered ? true : undefined}
        >
          <SimulatorContent />
        </div>

        {!demoEntered ? (
          <div className={styles.demoGateOverlay}>
            <section
              className={styles.demoGateDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="simulator-construction-title"
              aria-describedby="simulator-construction-description"
            >
              <span className={styles.demoGateEyebrow}>Mouse Fit Simulator</span>
              <h1 id="simulator-construction-title">Area under construction</h1>
              <p id="simulator-construction-description">
                We’re still refining the simulator. You can explore the current interactive demo while we finish it.
              </p>
              <button type="button" autoFocus onClick={() => setDemoEntered(true)}>
                Proceed to demo
              </button>
            </section>
          </div>
        ) : null}
      </div>
    </MouseFitSimulatorProvider>
  );
}

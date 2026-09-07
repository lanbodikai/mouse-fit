"use client";

import { useCallback, useEffect, type WheelEvent } from "react";
import { RotateCcw, SunMedium } from "lucide-react";
import { WOOTING_60HE_V2 } from "../assets/wooting60he";
import KeyboardScene from "../scene/KeyboardScene";
import { preloadGateronSwitchModels } from "../scene/GateronSwitchModel";
import { switchPresets } from "../presets/switch-presets";
import {
  KeyboardVisualizerProvider,
  useKeyboardVisualizer,
} from "../store/KeyboardVisualizerStore";
import LayerNavigator from "./LayerNavigator";
import KeyColorEditor from "./KeyColorEditor";
import SwitchPresetPanel from "./SwitchPresetPanel";
import VisualizerErrorBoundary from "./VisualizerErrorBoundary";
import styles from "./KeyboardVisualizer.module.css";

function KeyboardVisualizerContent() {
  const {
    selectedSwitchId,
    selectedCasePresetId,
    assemblyProgress,
    lightingLevel,
    activeLayer,
    isInteracting,
    isKeyColorEditorOpen,
    requestCameraReset,
    adjustAssemblyProgress,
    setLightingLevel,
  } = useKeyboardVisualizer();
  const selectedPreset =
    switchPresets.find((preset) => preset.id === selectedSwitchId) ?? switchPresets[0];
  const assemblyPercent = Math.round(assemblyProgress * 100);
  const assemblyLabel = assemblyPercent <= 1 ? "Fully assembled" : assemblyPercent >= 99 ? "Fully exploded" : `${assemblyPercent}% exploded`;

  const handleAssemblyWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const deltaScale = event.deltaMode === 1 ? 0.018 : event.deltaMode === 2 ? 0.18 : event.ctrlKey ? 0.0032 : 0.00145;
      const delta = Math.max(-0.13, Math.min(0.13, event.deltaY * deltaScale));
      adjustAssemblyProgress(delta);
    },
    [adjustAssemblyProgress],
  );

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key.toLowerCase() !== "r" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      requestCameraReset();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestCameraReset]);

  useEffect(() => {
    const warmModels = () => {
      void preloadGateronSwitchModels(switchPresets.map((preset) => preset.modelPath));
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idleId = idleWindow.requestIdleCallback?.(warmModels, { timeout: 1400 });
    const timeoutId = idleId === undefined ? window.setTimeout(warmModels, 320) : undefined;

    return () => {
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <section className={styles.visualizerRoot} aria-label="Hall Effect keyboard visualizer">
      <SwitchPresetPanel />

      <div
        className={styles.viewer}
        aria-label="Interactive exploded 3D view of a 60 percent Hall Effect keyboard"
        aria-busy={isInteracting}
        onWheelCapture={handleAssemblyWheel}
      >
        <div className={styles.viewerLabel} aria-hidden="true">
          <span>60HE v2 Hall Effect Assembly</span>
          <small>{assemblyLabel}</small>
        </div>
        <button
          type="button"
          className={styles.resetButton}
          onClick={requestCameraReset}
          aria-label="Reset 3D camera. Keyboard shortcut R."
          title="Reset camera (R)"
        >
          <RotateCcw aria-hidden="true" />
          <span>Reset</span>
        </button>

        <label className={styles.lightingControl}>
          <SunMedium aria-hidden="true" />
          <span>Scene light</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(lightingLevel * 100)}
            onChange={(event) => setLightingLevel(Number(event.currentTarget.value) / 100)}
            aria-label="Scene lighting"
          />
          <output>{Math.round(lightingLevel * 100)}%</output>
        </label>

        <VisualizerErrorBoundary>
          <KeyboardScene />
        </VisualizerErrorBoundary>

        <div className={styles.assemblyGestureHint} aria-hidden="true">
          <span>Pinch or scroll</span>
          <strong>{assemblyPercent}%</strong>
          <span>Assembly spread</span>
        </div>

        <div className={styles.selectionStatus} aria-live="polite">
          <span>{selectedPreset.manufacturer}</span>
          <strong>{selectedPreset.name}</strong>
          <small>{`${assemblyLabel} · active layer ${activeLayer === "switches" ? "Hall Effect switches" : activeLayer}`}</small>
        </div>

        <p className={styles.sourceNotice}>
          {selectedCasePresetId === "gateron-gt60" ? (
            <>Case: Gateron GT60 · plate and PCB: <a href={WOOTING_60HE_V2.sourceRepository} target="_blank" rel="noreferrer">Wooting 60HE v2 CAD</a></>
          ) : (
            <>Reference shell, plate, and PCB: <a href={WOOTING_60HE_V2.sourceRepository} target="_blank" rel="noreferrer">Wooting 60HE v2 CAD</a></>
          )}
        </p>
      </div>

      <LayerNavigator />
      {isKeyColorEditorOpen ? <KeyColorEditor /> : null}
    </section>
  );
}

export default function KeyboardVisualizerPage() {
  return (
    <KeyboardVisualizerProvider>
      <KeyboardVisualizerContent />
    </KeyboardVisualizerProvider>
  );
}

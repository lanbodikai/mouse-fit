"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useKeyboardVisualizer } from "../store/KeyboardVisualizerStore";
import { KEYBOARD_LAYER_ORDER, type KeyboardLayerId } from "../types";
import styles from "./KeyboardVisualizer.module.css";

const labels: Record<KeyboardLayerId, string> = {
  keycaps: "Keycaps",
  switches: "Hall Effect Switches",
  plate: "Plate",
  pcb: "PCB",
  case: "Case",
};

export default function LayerNavigator() {
  const {
    assemblyProgress,
    activeLayer,
    adjustAssemblyProgress,
    setActiveLayer,
  } = useKeyboardVisualizer();
  const assemblyPercent = Math.round(assemblyProgress * 100);

  return (
    <aside
      className={styles.layerNavigator}
      tabIndex={0}
      role="group"
      aria-label={`Keyboard layer hierarchy. ${assemblyPercent} percent exploded. Selecting a layer hides layers above it. Use the trackpad or arrow keys to assemble and explode.`}
      onKeyDown={(event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        if (!event.repeat) adjustAssemblyProgress(event.key === "ArrowUp" ? 0.12 : -0.12);
      }}
    >
      <div className={styles.layerHint}>
        <span>Select a layer to inspect</span>
        <ArrowUp aria-hidden="true" />
      </div>

      <div className={styles.layerTrack}>
        <span className={styles.layerLine} aria-hidden="true" />
        <span className={styles.layerProgress} aria-hidden="true">{assemblyPercent}%</span>
        {KEYBOARD_LAYER_ORDER.map((layer) => {
          const isActive = activeLayer === layer;
          return (
            <button
              type="button"
              key={layer}
              className={`${styles.layerItem} ${isActive ? styles.layerItemActive : ""}`}
              aria-pressed={isActive}
              onClick={() => setActiveLayer(layer)}
            >
              <span className={styles.layerDot} aria-hidden="true" />
              <span>{labels[layer]}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.layerHint}>
        <ArrowDown aria-hidden="true" />
        <span>Pinch to spread or assemble</span>
      </div>
    </aside>
  );
}

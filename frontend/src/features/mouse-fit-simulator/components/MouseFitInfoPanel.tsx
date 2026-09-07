"use client";

import {
  ArrowLeftRight,
  Hand,
  Lightbulb,
  MoveVertical,
  Ruler,
} from "lucide-react";
import { GRIP_PRESETS } from "../data/grips";
import { useMouseFitSimulator } from "../store/MouseFitSimulatorStore";
import styles from "./MouseFitSimulator.module.css";

export default function MouseFitInfoPanel() {
  const { hand, gripStyle, selectedMouse } = useMouseFitSimulator();
  const grip = GRIP_PRESETS[gripStyle];
  const measurements = [
    { label: "Hand length", value: `${hand.lengthCm.toFixed(1)} cm`, icon: Ruler },
    { label: "Hand width", value: `${hand.widthCm.toFixed(1)} cm`, icon: ArrowLeftRight },
    { label: "Palm length", value: `${hand.palmLengthCm.toFixed(1)} cm`, icon: Hand },
    {
      label: "Middle finger",
      value: `${hand.middleFingerLengthCm.toFixed(1)} cm`,
      icon: MoveVertical,
    },
    { label: "Grip style", value: grip.label, icon: Hand },
    ...(selectedMouse
      ? [{
          label: "Mouse size",
          value: `${selectedMouse.dimensionsMm.lengthMm ?? "—"} × ${selectedMouse.dimensionsMm.widthMm ?? "—"} × ${selectedMouse.dimensionsMm.heightMm ?? "—"} mm`,
          icon: Ruler,
        }]
      : []),
  ];

  return (
    <section className={styles.infoPanel} aria-label="Selected hand measurements">
      <div className={styles.measurementGrid}>
        {measurements.map((measurement) => (
          <article key={measurement.label} className={styles.measurementItem}>
            <div>
              <span>{measurement.label}</span>
              <strong>{measurement.value}</strong>
            </div>
            <measurement.icon aria-hidden="true" />
          </article>
        ))}
      </div>
      <aside className={styles.fitTip}>
        <Lightbulb aria-hidden="true" />
        <div>
          <strong>Fit tip</strong>
          <p>{grip.tip}</p>
        </div>
      </aside>
    </section>
  );
}

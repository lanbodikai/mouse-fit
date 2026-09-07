"use client";

import type { CSSProperties, KeyboardEvent, Ref } from "react";
import type { SwitchPreset } from "../types";
import styles from "./KeyboardVisualizer.module.css";

type SwitchPresetCardProps = {
  preset: SwitchPreset;
  selected: boolean;
  buttonRef: Ref<HTMLButtonElement>;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

export default function SwitchPresetCard({
  preset,
  selected,
  buttonRef,
  onSelect,
  onKeyDown,
}: SwitchPresetCardProps) {
  const thumbnailStyle = {
    "--switch-stem": preset.visual.stemColor,
    "--switch-housing": preset.visual.housingColor,
  } as CSSProperties;

  return (
    <button
      ref={buttonRef}
      type="button"
      role="option"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      className={`${styles.presetCard} ${selected ? styles.presetCardSelected : ""}`}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      <span
        className={styles.switchThumbnail}
        style={thumbnailStyle}
        role="img"
        aria-label={`${preset.manufacturer} ${preset.name} procedural switch preview`}
      >
        <span className={styles.switchStem} />
        <span className={styles.switchHousing} />
        <span className={styles.switchPins} />
      </span>
      <span className={styles.presetCopy}>
        <span className={styles.presetManufacturer}>{preset.manufacturer}</span>
        <span className={styles.presetName}>{preset.name}</span>
        <span className={styles.presetDescription}>{preset.description}</span>
      </span>
      <span className={styles.selectedMark} aria-hidden="true" />
    </button>
  );
}

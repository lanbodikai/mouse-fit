"use client";

import { Palette } from "lucide-react";
import {
  caseColors,
  casePresets,
  keycapColors,
} from "../presets/appearance-presets";
import { switchPresets } from "../presets/switch-presets";
import { useKeyboardVisualizer } from "../store/KeyboardVisualizerStore";
import styles from "./KeyboardVisualizer.module.css";

function ColorPicker({
  label,
  colors,
  value,
  onChange,
}: {
  label: string;
  colors: readonly { name: string; value: string }[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className={styles.colorPicker}>
      <div className={styles.colorSwatches} role="radiogroup" aria-label={label}>
        {colors.map((color) => (
          <button
            type="button"
            key={color.value}
            className={`${styles.colorSwatch} ${value === color.value ? styles.colorSwatchSelected : ""}`}
            style={{ backgroundColor: color.value }}
            role="radio"
            aria-checked={value === color.value}
            aria-label={color.name}
            title={color.name}
            onClick={() => onChange(color.value)}
          />
        ))}
      </div>
      <label className={styles.customColorControl}>
        <span>Custom</span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          aria-label={`${label} custom color`}
          title="Choose a custom color"
        />
        <code>{value.toUpperCase()}</code>
      </label>
    </div>
  );
}

export default function SwitchPresetPanel() {
  const {
    selectedSwitchId,
    selectedCasePresetId,
    keycapColor,
    keycapOpacity,
    caseColor,
    selectSwitch,
    selectCasePreset,
    setKeycapColor,
    setKeycapOpacity,
    setKeyColorEditorOpen,
    setActiveLayer,
    setCaseColor,
  } = useKeyboardVisualizer();

  return (
    <aside className={styles.presetPanel} aria-label="Keyboard component configuration">
      <div className={styles.presetHeader}>
        <p className={styles.presetEyebrow}>Hall Effect</p>
        <h1>Components</h1>
      </div>

      <div className={styles.componentSections}>
        <section className={styles.componentSection}>
          <h2>Keycaps</h2>
          <ColorPicker label="Keycap color" colors={keycapColors} value={keycapColor} onChange={setKeycapColor} />
          <label className={styles.keycapOpacityControl}>
            <span>Shell opacity</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(keycapOpacity * 100)}
              onInput={(event) => setKeycapOpacity(Number(event.currentTarget.value) / 100)}
              onChange={(event) => setKeycapOpacity(Number(event.currentTarget.value) / 100)}
            />
            <output>{Math.round(keycapOpacity * 100)}%</output>
          </label>
          <button
            type="button"
            className={styles.openKeyEditorButton}
            onClick={() => {
              setActiveLayer("keycaps");
              setKeyColorEditorOpen(true);
            }}
          >
            <Palette aria-hidden="true" />
            <span><strong>Edit key glow</strong><small>Light legends and key edges</small></span>
          </button>
        </section>

        <section className={styles.componentSection}>
          <h2>Switches</h2>
          <div className={styles.simplePresetList} role="radiogroup" aria-label="Hall Effect switch preset">
            {switchPresets.map((preset) => (
              <button
                type="button"
                key={preset.id}
                className={`${styles.simplePresetButton} ${selectedSwitchId === preset.id ? styles.simplePresetButtonSelected : ""}`}
                role="radio"
                aria-checked={selectedSwitchId === preset.id}
                onClick={() => selectSwitch(preset.id)}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.componentSection}>
          <h2>Case</h2>
          <div className={styles.simplePresetList} role="radiogroup" aria-label="Case preset">
            {casePresets.map((preset) => (
              <button
                type="button"
                key={preset.id}
                className={`${styles.simplePresetButton} ${selectedCasePresetId === preset.id ? styles.simplePresetButtonSelected : ""}`}
                role="radio"
                aria-checked={selectedCasePresetId === preset.id}
                onClick={() => selectCasePreset(preset.id)}
              >
                {preset.name}
              </button>
            ))}
          </div>
          <ColorPicker label="Case color" colors={caseColors} value={caseColor} onChange={setCaseColor} />
        </section>
      </div>
    </aside>
  );
}

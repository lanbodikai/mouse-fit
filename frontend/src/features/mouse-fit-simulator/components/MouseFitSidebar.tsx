"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Hand,
  Info,
  MousePointer2,
  RotateCcw,
  Search,
} from "lucide-react";
import { GRIP_ORDER, GRIP_PRESETS } from "../data/grips";
import { HAND_SIZE_PRESETS } from "../data/hand-presets";
import { useMouseFitSimulator } from "../store/MouseFitSimulatorStore";
import styles from "./MouseFitSimulator.module.css";

function SectionTitle({ children, info }: { children: string; info?: string }) {
  return (
    <div className={styles.sectionTitle}>
      <span>{children}</span>
      {info ? <Info aria-label={info} role="img" /> : null}
    </div>
  );
}

export default function MouseFitSidebar() {
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [modelQuery, setModelQuery] = useState("");
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const {
    hand,
    mouseModels,
    mouseModelsLoaded,
    selectedMouse,
    gripStyle,
    showHand,
    handOpacity,
    setHandSize,
    setMouseId,
    setGripStyle,
    setHandedness,
    setShowHand,
    setHandOpacity,
    resetCamera,
  } = useMouseFitSimulator();
  const filteredMouseModels = useMemo(() => {
    const query = modelQuery.trim().toLocaleLowerCase();
    if (!query) return mouseModels;
    return mouseModels.filter((model) =>
      `${model.brand} ${model.name}`.toLocaleLowerCase().includes(query),
    );
  }, [modelQuery, mouseModels]);

  useEffect(() => {
    if (!modelPickerOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!modelPickerRef.current?.contains(event.target as Node)) {
        setModelPickerOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModelPickerOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [modelPickerOpen]);

  const toggleModelPicker = () => {
    setModelPickerOpen((open) => {
      if (!open) setModelQuery("");
      return !open;
    });
  };

  return (
    <aside className={styles.controlPanel} aria-label="Mouse fit configuration">
      <header className={styles.brandHeader}>
        <span className={styles.brandMark} aria-hidden="true">
          <MousePointer2 />
        </span>
        <div>
          <strong>Mouse Fit</strong>
          <span>Simulator</span>
        </div>
      </header>

      <div className={styles.controlScroll}>
        <section className={styles.controlSection} aria-labelledby="mouse-model-label">
          <SectionTitle>Mouse model</SectionTitle>
          <div className={styles.modelPicker} ref={modelPickerRef}>
            <button
              id="mouse-model-search"
              type="button"
              className={styles.modelSearch}
              aria-label="Mouse model"
              aria-haspopup="listbox"
              aria-expanded={modelPickerOpen}
              aria-controls="mouse-model-options"
              disabled={!mouseModelsLoaded || mouseModels.length === 0}
              onClick={toggleModelPicker}
            >
              <span>
                {selectedMouse
                  ? `${selectedMouse.brand} ${selectedMouse.name}`
                  : mouseModelsLoaded
                    ? "No imported models yet"
                    : "Loading models…"}
              </span>
              <ChevronDown aria-hidden="true" />
            </button>
            {modelPickerOpen ? (
              <div className={styles.modelMenu}>
                <label className={styles.modelMenuSearch}>
                  <Search aria-hidden="true" />
                  <span className={styles.srOnly}>Search mouse presets</span>
                  <input
                    autoFocus
                    value={modelQuery}
                    placeholder={`Search ${mouseModels.length} presets…`}
                    onChange={(event) => setModelQuery(event.currentTarget.value)}
                  />
                </label>
                <div
                  id="mouse-model-options"
                  className={styles.modelOptions}
                  role="listbox"
                  aria-label="Mouse presets"
                >
                  {filteredMouseModels.map((model) => {
                    const selected = selectedMouse?.id === model.id;
                    return (
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={styles.modelOption}
                        key={model.id}
                        onClick={() => {
                          setMouseId(model.id);
                          setModelPickerOpen(false);
                        }}
                      >
                        <span>
                          <strong>{model.name}</strong>
                          <small>{model.brand}</small>
                        </span>
                        {selected ? <Check aria-hidden="true" /> : null}
                      </button>
                    );
                  })}
                  {filteredMouseModels.length === 0 ? (
                    <p className={styles.modelEmpty}>No presets match “{modelQuery}”.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          <p className={styles.modelSearchHint}>
            {mouseModelsLoaded ? `${mouseModels.length} imported model${mouseModels.length === 1 ? "" : "s"}` : "Reading imported model library"}
          </p>
        </section>

        <fieldset className={styles.controlSection}>
          <legend>
            <SectionTitle
              info="Hand length is measured from the wrist crease to the middle fingertip."
            >
              Hand size
            </SectionTitle>
          </legend>
          <div className={styles.handSizeList}>
            {HAND_SIZE_PRESETS.map((size) => (
              <label
                key={size}
                className={`${styles.radioRow} ${
                  hand.lengthCm === size ? styles.radioRowSelected : ""
                }`}
              >
                <input
                  type="radio"
                  name="hand-size"
                  value={size}
                  checked={hand.lengthCm === size}
                  onChange={() => setHandSize(size)}
                />
                <span className={styles.radioDot} aria-hidden="true" />
                <span>{size} cm</span>
              </label>
            ))}
            {!HAND_SIZE_PRESETS.some((size) => size === hand.lengthCm) ? (
              <div className={`${styles.radioRow} ${styles.radioRowSelected}`}>
                <span className={styles.radioDot} aria-hidden="true" />
                <span>{hand.lengthCm.toFixed(1)} cm custom</span>
              </div>
            ) : null}
          </div>
        </fieldset>

        <section className={styles.controlSection} aria-labelledby="grip-style-label">
          <SectionTitle>Grip style</SectionTitle>
          <div id="grip-style-label" className={styles.gripGrid} role="group" aria-label="Grip style">
            {GRIP_ORDER.map((id) => {
              const grip = GRIP_PRESETS[id];
              const selected = gripStyle === id;
              return (
                <button
                  type="button"
                  key={id}
                  className={`${styles.gripCard} ${selected ? styles.gripCardSelected : ""}`}
                  aria-pressed={selected}
                  title={grip.description}
                  onClick={() => setGripStyle(id)}
                >
                  <span className={`${styles.gripGlyph} ${styles[`gripGlyph_${id}`]}`}>
                    <Hand aria-hidden="true" />
                  </span>
                  <span>{grip.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <fieldset className={styles.controlSection}>
          <legend>
            <SectionTitle>Handedness</SectionTitle>
          </legend>
          <div className={styles.handednessList}>
            {(["right", "left"] as const).map((side) => (
              <label key={side} className={styles.inlineRadio}>
                <input
                  type="radio"
                  name="handedness"
                  value={side}
                  checked={hand.handedness === side}
                  onChange={() => setHandedness(side)}
                />
                <span className={styles.radioDot} aria-hidden="true" />
                <span>{side === "right" ? "Right Hand" : "Left Hand"}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <section className={`${styles.controlSection} ${styles.compactSection}`}>
          <label className={styles.toggleRow}>
            <span>Show hand</span>
            <input
              type="checkbox"
              checked={showHand}
              onChange={(event) => setShowHand(event.currentTarget.checked)}
            />
            <span className={styles.toggleTrack} aria-hidden="true">
              <span />
            </span>
          </label>
        </section>

        <section className={`${styles.controlSection} ${styles.opacitySection}`}>
          <label className={styles.rangeLabel} htmlFor="hand-opacity">
            <span>Hand opacity</span>
            <output htmlFor="hand-opacity">{Math.round(handOpacity * 100)}%</output>
          </label>
          <input
            id="hand-opacity"
            className={styles.rangeInput}
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(handOpacity * 100)}
            disabled={!showHand}
            onChange={(event) => setHandOpacity(Number(event.currentTarget.value) / 100)}
          />
        </section>
      </div>

      <footer className={styles.controlFooter}>
        <button type="button" className={styles.resetViewButton} onClick={resetCamera}>
          <RotateCcw aria-hidden="true" />
          Reset view
        </button>
      </footer>
    </aside>
  );
}

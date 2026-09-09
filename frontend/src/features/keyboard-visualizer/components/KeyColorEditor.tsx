"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Check, Palette, RotateCcw, X } from "lucide-react";
import { keyGlowColors as paletteColors } from "../presets/appearance-presets";
import { KEY_LAYOUT } from "../scene/keyboard-layout";
import { useKeyboardVisualizer } from "../store/KeyboardVisualizerStore";
import styles from "./KeyboardVisualizer.module.css";

export default function KeyColorEditor() {
  const {
    keyGlowColor,
    keyGlowColorsById,
    keycapOpacity,
    setKeyGlowColor,
    setKeyGlow,
    resetKeyGlows,
    setKeycapOpacity,
    setKeyColorEditorOpen,
  } = useKeyboardVisualizer();
  const [brushColor, setBrushColor] = useState(keyGlowColor);
  const isPaintingRef = useRef(false);
  const dialogRef = useRef<HTMLElement>(null);
  const [lastPaintedKey, setLastPaintedKey] = useState<string | null>(null);
  const rows = useMemo(
    () => Array.from({ length: 5 }, (_, rowIndex) => KEY_LAYOUT.filter((key) => key.rowIndex === rowIndex)),
    [],
  );

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    const stopPainting = () => {
      isPaintingRef.current = false;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setKeyColorEditorOpen(false);
      if (event.key === "Tab") {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), [tabindex='0']");
        const first = controls?.[0], last = controls?.[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("pointerup", stopPainting);
    window.addEventListener("pointercancel", stopPainting);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerup", stopPainting);
      window.removeEventListener("pointercancel", stopPainting);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setKeyColorEditorOpen]);

  const paintKey = (keyId: string) => {
    if ((keyGlowColorsById[keyId] ?? keyGlowColor) === brushColor) return;
    setKeyGlow(keyId, brushColor);
    setLastPaintedKey(keyId);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, keyId: string) => {
    if (event.button !== 0) return;
    event.preventDefault();
    isPaintingRef.current = true;
    paintKey(keyId);
  };

  const customizedCount = Object.keys(keyGlowColorsById).length;
  const lastKey = lastPaintedKey ? KEY_LAYOUT.find((key) => key.id === lastPaintedKey) : null;

  return (
    <div
      className={styles.keyEditorBackdrop}
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) setKeyColorEditorOpen(false);
      }}
    >
      <section ref={dialogRef} className={styles.keyEditorDialog} role="dialog" aria-modal="true" aria-labelledby="key-color-editor-title">
        <header className={styles.keyEditorHeader}>
          <div>
            <span className={styles.keyEditorEyebrow}><Palette aria-hidden="true" /> Key & legend RGB</span>
            <h2 id="key-color-editor-title">Paint key glow</h2>
            <p>Choose a glow colour, then click or drag across the keyboard.</p>
          </div>
          <button type="button" className={styles.keyEditorClose} onClick={() => setKeyColorEditorOpen(false)} aria-label="Close key glow editor">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className={styles.editorKeyboardShell}>
          <div
            className={styles.editorKeyboard}
            aria-label="60 percent keyboard color map"
            onPointerMove={(event) => {
              if (!isPaintingRef.current) return;
              const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-key-id]");
              const keyId = target?.dataset.keyId;
              if (keyId) paintKey(keyId);
            }}
          >
            {rows.map((row, rowIndex) => (
              <div className={styles.editorKeyboardRow} key={rowIndex}>
                {row.map((key) => {
                  const color = keyGlowColorsById[key.id] ?? keyGlowColor;
                  return (
                    <button
                      type="button"
                      key={key.id}
                      className={styles.editorKey}
                      data-key-id={key.id}
                      style={{
                        "--key-width": key.widthUnits,
                        "--key-glow": color,
                      } as CSSProperties}
                      aria-label={`${key.legend} key glow, ${color}`}
                      title={`Paint ${key.legend} glow`}
                      onPointerDown={(event) => handlePointerDown(event, key.id)}
                      onPointerEnter={() => {
                        if (isPaintingRef.current) paintKey(key.id);
                      }}
                      onClick={() => paintKey(key.id)}
                    >
                      {key.legend}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.keyEditorSettings}>
          <section className={styles.keyEditorColorPanel} aria-labelledby="editor-colours-title">
            <div className={styles.editorSectionHeading}>
              <div>
                <span>Brush</span>
                <h3 id="editor-colours-title">Colours</h3>
              </div>
              <code>{brushColor.toUpperCase()}</code>
            </div>
            <div className={styles.editorPalette} role="radiogroup" aria-label="Key glow color">
              {paletteColors.map((color) => (
                <button
                  type="button"
                  key={color.value}
                  className={`${styles.editorColorSwatch} ${brushColor === color.value ? styles.editorColorSwatchSelected : ""}`}
                  style={{ backgroundColor: color.value }}
                  role="radio"
                  aria-checked={brushColor === color.value}
                  aria-label={color.name}
                  title={color.name}
                  onClick={() => setBrushColor(color.value)}
                >
                  {brushColor === color.value ? <Check aria-hidden="true" /> : null}
                </button>
              ))}
              <label className={styles.editorCustomColor} title="Choose a custom glow color">
                <input type="color" value={brushColor} onChange={(event) => setBrushColor(event.currentTarget.value)} aria-label="Custom glow color" />
                <span>+</span>
              </label>
            </div>
          </section>

          <section className={styles.keyEditorControlPanel} aria-labelledby="editor-options-title">
            <div className={styles.editorSectionHeading}>
              <div>
                <span>Keycaps</span>
                <h3 id="editor-options-title">Shell & glow</h3>
              </div>
              <small>{customizedCount} customized</small>
            </div>
            <label className={styles.editorOpacityControl}>
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
            <div className={styles.editorActionRow}>
              <button type="button" onClick={() => setKeycapOpacity(0)}>Glow only</button>
              <button type="button" onClick={() => setKeyGlowColor(brushColor)}>Fill all glows</button>
              <button type="button" onClick={resetKeyGlows}><RotateCcw aria-hidden="true" /> Reset</button>
            </div>
            <p>{lastKey ? `${lastKey.legend} glow: ${(keyGlowColorsById[lastKey.id] ?? keyGlowColor).toUpperCase()}` : "Select a key or drag to paint its glow."}</p>
          </section>
        </div>

        <footer className={styles.keyEditorFooter}>
          <span>Glow changes update the 3D keyboard instantly.</span>
          <button type="button" onClick={() => setKeyColorEditorOpen(false)}>Done</button>
        </footer>
      </section>
    </div>
  );
}

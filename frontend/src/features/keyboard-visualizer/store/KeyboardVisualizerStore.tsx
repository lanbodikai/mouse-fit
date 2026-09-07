"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { defaultSwitchPreset } from "../presets/switch-presets";
import {
  defaultCaseColor,
  defaultCasePreset,
  defaultKeycapColor,
  defaultKeyGlowColor,
  type CasePresetId,
} from "../presets/appearance-presets";
import {
  type KeyboardLayerId,
  type KeyboardVisualizerState,
} from "../types";

type KeyboardVisualizerAction =
  | { type: "select-switch"; switchId: string }
  | { type: "select-case-preset"; presetId: CasePresetId }
  | { type: "set-keycap-color"; color: string }
  | { type: "set-key-glow-color"; color: string }
  | { type: "set-key-glow"; keyId: string; color: string }
  | { type: "reset-key-glows" }
  | { type: "set-keycap-opacity"; opacity: number }
  | { type: "set-key-color-editor-open"; value: boolean }
  | { type: "set-case-color"; color: string }
  | { type: "adjust-assembly-progress"; delta: number }
  | { type: "set-assembly-progress"; progress: number }
  | { type: "set-lighting-level"; level: number }
  | { type: "set-active-layer"; layer: KeyboardLayerId }
  | { type: "request-camera-reset" }
  | { type: "set-interacting"; value: boolean };

const initialState: KeyboardVisualizerState = {
  selectedSwitchId: defaultSwitchPreset.id,
  selectedCasePresetId: defaultCasePreset.id,
  keycapColor: defaultKeycapColor,
  keyGlowColor: defaultKeyGlowColor,
  keyGlowColorsById: {},
  keycapOpacity: 1,
  isKeyColorEditorOpen: false,
  caseColor: defaultCaseColor,
  assemblyProgress: 0,
  lightingLevel: 0.62,
  activeLayer: "keycaps",
  cameraResetToken: 0,
  isInteracting: false,
};

function reducer(
  state: KeyboardVisualizerState,
  action: KeyboardVisualizerAction,
): KeyboardVisualizerState {
  switch (action.type) {
    case "select-switch":
      return { ...state, selectedSwitchId: action.switchId };
    case "select-case-preset":
      return { ...state, selectedCasePresetId: action.presetId };
    case "set-keycap-color":
      return { ...state, keycapColor: action.color };
    case "set-key-glow-color":
      return { ...state, keyGlowColor: action.color, keyGlowColorsById: {} };
    case "set-key-glow":
      return {
        ...state,
        keyGlowColorsById: {
          ...state.keyGlowColorsById,
          [action.keyId]: action.color,
        },
      };
    case "reset-key-glows":
      return { ...state, keyGlowColorsById: {} };
    case "set-keycap-opacity":
      return { ...state, keycapOpacity: Math.min(1, Math.max(0, action.opacity)) };
    case "set-key-color-editor-open":
      return { ...state, isKeyColorEditorOpen: action.value };
    case "set-case-color":
      return { ...state, caseColor: action.color };
    case "adjust-assembly-progress":
      return { ...state, assemblyProgress: Math.min(1, Math.max(0, state.assemblyProgress + action.delta)) };
    case "set-assembly-progress":
      return { ...state, assemblyProgress: Math.min(1, Math.max(0, action.progress)) };
    case "set-lighting-level":
      return { ...state, lightingLevel: Math.min(1, Math.max(0, action.level)) };
    case "set-active-layer":
      return { ...state, activeLayer: action.layer };
    case "request-camera-reset":
      return { ...state, cameraResetToken: state.cameraResetToken + 1 };
    case "set-interacting":
      return { ...state, isInteracting: action.value };
    default:
      return state;
  }
}

type KeyboardVisualizerContextValue = KeyboardVisualizerState & {
  selectSwitch: (switchId: string) => void;
  selectCasePreset: (presetId: CasePresetId) => void;
  setKeycapColor: (color: string) => void;
  setKeyGlowColor: (color: string) => void;
  setKeyGlow: (keyId: string, color: string) => void;
  resetKeyGlows: () => void;
  setKeycapOpacity: (opacity: number) => void;
  setKeyColorEditorOpen: (value: boolean) => void;
  setCaseColor: (color: string) => void;
  adjustAssemblyProgress: (delta: number) => void;
  setAssemblyProgress: (progress: number) => void;
  setLightingLevel: (level: number) => void;
  setActiveLayer: (layer: KeyboardLayerId) => void;
  requestCameraReset: () => void;
  setInteracting: (value: boolean) => void;
};

const KeyboardVisualizerContext =
  createContext<KeyboardVisualizerContextValue | null>(null);

export function KeyboardVisualizerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo<KeyboardVisualizerContextValue>(
    () => ({
      ...state,
      selectSwitch: (switchId) => dispatch({ type: "select-switch", switchId }),
      selectCasePreset: (presetId) => dispatch({ type: "select-case-preset", presetId }),
      setKeycapColor: (color) => dispatch({ type: "set-keycap-color", color }),
      setKeyGlowColor: (color) => dispatch({ type: "set-key-glow-color", color }),
      setKeyGlow: (keyId, color) => dispatch({ type: "set-key-glow", keyId, color }),
      resetKeyGlows: () => dispatch({ type: "reset-key-glows" }),
      setKeycapOpacity: (opacity) => dispatch({ type: "set-keycap-opacity", opacity }),
      setKeyColorEditorOpen: (value) => dispatch({ type: "set-key-color-editor-open", value }),
      setCaseColor: (color) => dispatch({ type: "set-case-color", color }),
      adjustAssemblyProgress: (delta) => dispatch({ type: "adjust-assembly-progress", delta }),
      setAssemblyProgress: (progress) => dispatch({ type: "set-assembly-progress", progress }),
      setLightingLevel: (level) => dispatch({ type: "set-lighting-level", level }),
      setActiveLayer: (layer) => dispatch({ type: "set-active-layer", layer }),
      requestCameraReset: () => dispatch({ type: "request-camera-reset" }),
      setInteracting: (value) => dispatch({ type: "set-interacting", value }),
    }),
    [state],
  );

  return (
    <KeyboardVisualizerContext.Provider value={value}>
      {children}
    </KeyboardVisualizerContext.Provider>
  );
}

export function useKeyboardVisualizer() {
  const context = useContext(KeyboardVisualizerContext);
  if (!context) {
    throw new Error(
      "useKeyboardVisualizer must be used inside KeyboardVisualizerProvider",
    );
  }
  return context;
}

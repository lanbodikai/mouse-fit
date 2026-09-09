"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import { DEFAULT_HAND_SIZE_CM, deriveHandMeasurements } from "../data/hand-presets";
import type {
  CameraView,
  GripStyle,
  Handedness,
  MouseFitState,
  MouseModelManifestEntry,
  SimulatorQuerySelection,
} from "../types";

type Action =
  | { type: "set-mouse"; mouseId: string }
  | { type: "set-mouse-models"; models: MouseModelManifestEntry[] }
  | { type: "set-hand-size"; lengthCm: number }
  | { type: "set-grip"; gripStyle: GripStyle }
  | { type: "set-handedness"; handedness: Handedness }
  | { type: "set-show-hand"; value: boolean }
  | { type: "set-hand-opacity"; value: number }
  | { type: "set-camera-view"; view: CameraView }
  | { type: "reset-camera" }
  | { type: "set-interacting"; value: boolean };

const VALID_GRIPS = new Set<GripStyle>(["palm", "claw", "fingertip"]);
const VALID_SIDES = new Set<Handedness>(["right", "left"]);

function parseHandSize(value: string | null): number {
  if (!value) return DEFAULT_HAND_SIZE_CM;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 12 && parsed <= 25
    ? Math.round(parsed * 10) / 10
    : DEFAULT_HAND_SIZE_CM;
}

export function parseSimulatorQuery(
  params: Pick<URLSearchParams, "get">,
): SimulatorQuerySelection {
  const gripParam = params.get("grip") as GripStyle | null;
  const sideParam = params.get("side") as Handedness | null;

  return {
    mouseId: params.get("mouse")?.trim() || null,
    handSizeCm: parseHandSize(params.get("hand")),
    gripStyle: gripParam && VALID_GRIPS.has(gripParam) ? gripParam : "palm",
    handedness: sideParam && VALID_SIDES.has(sideParam) ? sideParam : "right",
  };
}

function createInitialState(): MouseFitState {
  const query =
    typeof window === "undefined"
      ? {
          mouseId: null,
          handSizeCm: DEFAULT_HAND_SIZE_CM,
          gripStyle: "palm" as const,
          handedness: "right" as const,
        }
      : parseSimulatorQuery(new URLSearchParams(window.location.search));

  let savedWidth: number | undefined;
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    try {
      const length = Number(sessionStorage.getItem("mf:length_mm")) / 10;
      const width = Number(sessionStorage.getItem("mf:width_mm")) / 10;
      const grip = sessionStorage.getItem("mf:grip") as GripStyle | null;
      if (!params.has("hand") && Number.isFinite(length) && length >= 12 && length <= 25) {
        query.handSizeCm = length;
        if (Number.isFinite(width) && width >= 5 && width <= 13) savedWidth = width;
      }
      if (!params.has("grip") && grip && VALID_GRIPS.has(grip)) query.gripStyle = grip;
    } catch { /* Preview remains usable when browser storage is unavailable. */ }
    const width = Number(params.get("width"));
    if (params.has("width") && Number.isFinite(width) && width >= 5 && width <= 13 && width < query.handSizeCm) savedWidth = width;
  }

  return {
    mouseId: query.mouseId,
    mouseModels: [],
    mouseModelsLoaded: false,
    hand: {
      ...deriveHandMeasurements(query.handSizeCm, savedWidth ? { widthCm: savedWidth } : {}),
      handedness: query.handedness,
    },
    gripStyle: query.gripStyle,
    showHand: true,
    handOpacity: 1,
    cameraView: "perspective",
    cameraResetToken: 0,
    isInteracting: false,
  };
}

function reducer(state: MouseFitState, action: Action): MouseFitState {
  switch (action.type) {
    case "set-mouse":
      return {
        ...state,
        mouseId: state.mouseModels.some((model) => model.id === action.mouseId)
          ? action.mouseId
          : state.mouseId,
      };
    case "set-mouse-models": {
      const selected = action.models.some((model) => model.id === state.mouseId)
        ? state.mouseId
        : action.models[0]?.id ?? null;
      return { ...state, mouseModels: action.models, mouseModelsLoaded: true, mouseId: selected };
    }
    case "set-hand-size":
      return {
        ...state,
        hand: {
          ...deriveHandMeasurements(action.lengthCm),
          handedness: state.hand.handedness,
        },
      };
    case "set-grip":
      return { ...state, gripStyle: action.gripStyle };
    case "set-handedness":
      return { ...state, hand: { ...state.hand, handedness: action.handedness } };
    case "set-show-hand":
      return { ...state, showHand: action.value };
    case "set-hand-opacity":
      return { ...state, handOpacity: Math.min(1, Math.max(0, action.value)) };
    case "set-camera-view":
      return { ...state, cameraView: action.view };
    case "reset-camera":
      return {
        ...state,
        cameraView: "perspective",
        cameraResetToken: state.cameraResetToken + 1,
      };
    case "set-interacting":
      return { ...state, isInteracting: action.value };
    default:
      return state;
  }
}

type ContextValue = MouseFitState & {
  selectedMouse: MouseModelManifestEntry | null;
  setMouseId: (mouseId: string) => void;
  setMouseModels: (models: MouseModelManifestEntry[]) => void;
  setHandSize: (lengthCm: number) => void;
  setGripStyle: (gripStyle: GripStyle) => void;
  setHandedness: (handedness: Handedness) => void;
  setShowHand: (value: boolean) => void;
  setHandOpacity: (value: number) => void;
  setCameraView: (view: CameraView) => void;
  resetCamera: () => void;
  setInteracting: (value: boolean) => void;
};

const MouseFitContext = createContext<ContextValue | null>(null);

export function MouseFitSimulatorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const setMouseModels = useCallback((models: MouseModelManifestEntry[]) => dispatch({ type: "set-mouse-models", models }), []);

  const value = useMemo<ContextValue>(
    () => ({
      ...state,
      selectedMouse: state.mouseModels.find((model) => model.id === state.mouseId) ?? null,
      setMouseId: (mouseId) => dispatch({ type: "set-mouse", mouseId }),
      setMouseModels,
      setHandSize: (lengthCm) => dispatch({ type: "set-hand-size", lengthCm }),
      setGripStyle: (gripStyle) => dispatch({ type: "set-grip", gripStyle }),
      setHandedness: (handedness) =>
        dispatch({ type: "set-handedness", handedness }),
      setShowHand: (value) => dispatch({ type: "set-show-hand", value }),
      setHandOpacity: (value) => dispatch({ type: "set-hand-opacity", value }),
      setCameraView: (view) => dispatch({ type: "set-camera-view", view }),
      resetCamera: () => dispatch({ type: "reset-camera" }),
      setInteracting: (value) => dispatch({ type: "set-interacting", value }),
    }),
    [state, setMouseModels],
  );

  return <MouseFitContext.Provider value={value}>{children}</MouseFitContext.Provider>;
}

export function useMouseFitSimulator(): ContextValue {
  const context = useContext(MouseFitContext);
  if (!context) {
    throw new Error("useMouseFitSimulator must be used inside MouseFitSimulatorProvider");
  }
  return context;
}

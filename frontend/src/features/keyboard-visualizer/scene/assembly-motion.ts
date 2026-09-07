import { MathUtils } from "three";
import { KEYBOARD_WIDTH } from "./keyboard-layout";
import type { KeyboardLayerId } from "../types";

const ASSEMBLED_LAYER_Y: Record<KeyboardLayerId, number> = {
  case: 0,
  pcb: -1.28,
  plate: -1.28,
  switches: -1.41,
  keycaps: -0.78,
};

const LAYER_HORIZONTAL_OFFSET: Record<KeyboardLayerId, readonly [number, number]> = {
  case: [0, 0],
  pcb: [0.206, 0.016],
  plate: [0.206, 0.016],
  switches: [0.206, 0.016],
  keycaps: [0.206, 0.016],
};

const EXPLODED_LAYER_Y: Record<KeyboardLayerId, number> = {
  case: 0,
  pcb: 1.15,
  plate: 2.3,
  switches: 3.45,
  keycaps: 4.6,
};

export function assembledLayerY(layer: KeyboardLayerId) {
  return ASSEMBLED_LAYER_Y[layer];
}

export function explodedLayerY(layer: KeyboardLayerId) {
  return EXPLODED_LAYER_Y[layer];
}

export function layerHorizontalOffset(layer: KeyboardLayerId) {
  return LAYER_HORIZONTAL_OFFSET[layer];
}

const LAYER_INTRO_START: Record<KeyboardLayerId, number> = {
  case: 0.05,
  pcb: 0.38,
  plate: 0.78,
  switches: 1.18,
  keycaps: 1.95,
};

const LAYER_INTRO_DURATION: Record<KeyboardLayerId, number> = {
  case: 0.42,
  pcb: 0.55,
  plate: 0.58,
  switches: 0.9,
  keycaps: 0.95,
};

const LAYER_DROP_HEIGHT: Record<KeyboardLayerId, number> = {
  case: 0.18,
  pcb: 1.3,
  plate: 1.5,
  switches: 1.65,
  keycaps: 1.85,
};

const KEY_SWEEP_SECONDS = 0.72;
const KEY_DROP_DURATION = 0.46;

export const INTRO_ANIMATION_END = 3.25;

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

export function layerIntroProgress(elapsed: number, layer: KeyboardLayerId, reduceMotion: boolean) {
  if (reduceMotion) return 1;
  const progress = (elapsed - LAYER_INTRO_START[layer]) / LAYER_INTRO_DURATION[layer];
  return easeOutCubic(MathUtils.clamp(progress, 0, 1));
}

export function layerDropHeight(layer: KeyboardLayerId) {
  return LAYER_DROP_HEIGHT[layer];
}

export function keyIntroProgress(
  elapsed: number,
  layer: "switches" | "keycaps",
  keyX: number,
  reduceMotion = false,
) {
  if (reduceMotion) return 1;
  const horizontalProgress = MathUtils.clamp(keyX / KEYBOARD_WIDTH + 0.5, 0, 1);
  const start = LAYER_INTRO_START[layer] + horizontalProgress * KEY_SWEEP_SECONDS;
  return easeOutCubic(MathUtils.clamp((elapsed - start) / KEY_DROP_DURATION, 0, 1));
}

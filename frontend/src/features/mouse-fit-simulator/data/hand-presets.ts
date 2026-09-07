import type { HandMeasurements } from "../types";

export const HAND_SIZE_PRESETS = [15, 16, 17, 18, 19, 20, 21] as const;
export const DEFAULT_HAND_SIZE_CM = 17;

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

export function deriveHandMeasurements(
  lengthCm: number,
  overrides: Partial<Omit<HandMeasurements, "lengthCm">> = {},
): HandMeasurements {
  const safeLength = Math.min(25, Math.max(12, lengthCm));
  const widthCm = overrides.widthCm ?? safeLength * 0.5;
  const middleFingerLengthCm = roundToTenth(
    overrides.middleFingerLengthCm ?? safeLength * (7.5 / 17),
  );

  return {
    lengthCm: roundToTenth(safeLength),
    widthCm: roundToTenth(widthCm),
    palmLengthCm: roundToTenth(safeLength - middleFingerLengthCm),
    palmWidthCm: roundToTenth(overrides.palmWidthCm ?? widthCm * 0.88),
    middleFingerLengthCm,
    thumbLengthCm: roundToTenth(overrides.thumbLengthCm ?? safeLength * 0.34),
    fingerThicknessCm: roundToTenth(
      overrides.fingerThicknessCm ?? safeLength * 0.075,
    ),
  };
}

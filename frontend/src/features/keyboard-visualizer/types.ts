export const KEYBOARD_LAYER_ORDER = [
  "keycaps",
  "switches",
  "plate",
  "pcb",
  "case",
] as const;

export type KeyboardLayerId = (typeof KEYBOARD_LAYER_ORDER)[number];

export type SwitchVisual = {
  stemColor: string;
  housingColor: string;
  housingOpacity: number;
};

export type SwitchPreset = {
  id: string;
  manufacturer: string;
  name: string;
  description: string;
  imagePath: string | null;
  modelPath: string | null;
  modelScale?: number;
  modelRotationX?: number;
  initialForceG: number | null;
  bottomOutForceG: number | null;
  totalTravelMm: number | null;
  stemMaterial: string | null;
  housingMaterial: string | null;
  compatiblePcbTypes: readonly string[];
  specificationStatus: "verified" | "unverified";
  visual: SwitchVisual;
};

export type KeyboardVisualizerState = {
  selectedSwitchId: string;
  selectedCasePresetId: import("./presets/appearance-presets").CasePresetId;
  keycapColor: string;
  keyGlowColor: string;
  keyGlowColorsById: Record<string, string>;
  keycapOpacity: number;
  isKeyColorEditorOpen: boolean;
  caseColor: string;
  assemblyProgress: number;
  lightingLevel: number;
  activeLayer: KeyboardLayerId;
  cameraResetToken: number;
  isInteracting: boolean;
};

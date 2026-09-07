import type { KeyboardLayerId } from "../types";

export const WOOTING_60HE_V2 = {
  name: "Wooting 60HE v2 ANSI assembly",
  sourceRepository: "https://github.com/WootingKb/wooting-design/tree/main/wooting-60he-v2",
  stepUrl:
    "https://raw.githubusercontent.com/WootingKb/wooting-design/main/wooting-60he-v2/wooting_60he-v2_ansi_asm_260118.stp",
  glbPath: "/models/presets/wooting-60he-v2-reference.glb",
  licenseUrl: "https://github.com/WootingKb/wooting-design/blob/main/LICENSE.md",
  licenseName: "CERN Open Hardware Licence Version 2 - Strongly Reciprocal",
  scale: 0.041,
} as const;

export const wootingMeshGroups: Record<Exclude<KeyboardLayerId, "keycaps" | "switches">, readonly number[]> = {
  plate: [0],
  pcb: [1, 2, 3, 11],
  case: [4, 5, 6, 7, 8, 9, 10, 12, 13],
};

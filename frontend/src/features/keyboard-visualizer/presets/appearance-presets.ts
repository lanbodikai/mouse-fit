export const keyGlowColors = [
  { name: "Ice", value: "#4cc9ff" },
  { name: "Magenta", value: "#ff3d88" },
  { name: "Violet", value: "#7c4dff" },
  { name: "Cyan", value: "#25f4ee" },
  { name: "Lime", value: "#55ff83" },
  { name: "Amber", value: "#ffd447" },
  { name: "Coral", value: "#ff5c5c" },
] as const;

export const keycapColors = [
  { name: "White", value: "#eceef1" },
  { name: "Black", value: "#202328" },
  { name: "Slate", value: "#68717d" },
  { name: "Navy", value: "#30445f" },
  { name: "Forest", value: "#315849" },
  { name: "Burgundy", value: "#713b49" },
  { name: "Lavender", value: "#8a78b8" },
] as const;

export const caseColors = [
  { name: "Black", value: "#16191d" },
  { name: "Silver", value: "#9299a3" },
  { name: "White", value: "#d7d8d4" },
  { name: "Navy", value: "#29384f" },
  { name: "Forest", value: "#29473c" },
  { name: "Burgundy", value: "#542d36" },
] as const;

export const casePresets = [
  { id: "wooting-printed", name: "Wooting 60HE" },
  { id: "gateron-gt60", name: "Gateron GT60" },
] as const;

export type CasePresetId = (typeof casePresets)[number]["id"];

export const defaultKeycapColor = keycapColors[0].value;
export const defaultKeyGlowColor = keyGlowColors[0].value;
export const defaultCaseColor = caseColors[0].value;
export const defaultCasePreset = casePresets[0];

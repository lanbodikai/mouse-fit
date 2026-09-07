import type { KeyboardLayerId } from "../types";
import { WOOTING_60HE_V2 } from "./wooting60he";

export type KeyboardModelManifest = Record<KeyboardLayerId, string | null>;

export const keyboardModelManifest: KeyboardModelManifest = {
  keycaps: null,
  switches: null,
  plate: WOOTING_60HE_V2.glbPath,
  pcb: WOOTING_60HE_V2.glbPath,
  case: WOOTING_60HE_V2.glbPath,
};

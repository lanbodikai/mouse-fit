import type { GripPreset, GripStyle } from "../types";

export const GRIP_PRESETS: Record<GripStyle, GripPreset> = {
  palm: {
    id: "palm",
    label: "Palm",
    description: "Full palm support with relaxed fingers.",
    tip: "Palm grip spreads pressure across the hand for long-session comfort.",
    handRootOffset: [0, 1.25, 1.15],
    wristRotation: [-0.07, 0, 0],
    fingerSpread: 0.08,
    fingerPoses: {
      index: { mcpDeg: 10, pipDeg: 20, dipDeg: 30 },
      middle: { mcpDeg: 9, pipDeg: 19, dipDeg: 29 },
      ring: { mcpDeg: 11, pipDeg: 22, dipDeg: 33 },
      pinky: { mcpDeg: 13, pipDeg: 25, dipDeg: 36 },
    },
    thumbPose: [17, 27, 35],
  },
  claw: {
    id: "claw",
    label: "Claw",
    description: "Raised palm with sharply arched fingers.",
    tip: "Claw grip supports faster clicks while keeping the mouse anchored.",
    handRootOffset: [0, 1.85, 1.75],
    wristRotation: [-0.13, 0, 0],
    fingerSpread: 0.12,
    fingerPoses: {
      index: { mcpDeg: 27, pipDeg: 54, dipDeg: 65 },
      middle: { mcpDeg: 25, pipDeg: 52, dipDeg: 63 },
      ring: { mcpDeg: 29, pipDeg: 57, dipDeg: 68 },
      pinky: { mcpDeg: 32, pipDeg: 60, dipDeg: 71 },
    },
    thumbPose: [21, 38, 48],
  },
  fingertip: {
    id: "fingertip",
    label: "Fingertip",
    description: "Minimal palm contact for quick micro-adjustments.",
    tip: "Fingertip grip leaves the palm free for agile, precise adjustments.",
    handRootOffset: [0, 2.35, 2.8],
    wristRotation: [-0.18, 0, 0],
    fingerSpread: 0.18,
    fingerPoses: {
      index: { mcpDeg: 17, pipDeg: 38, dipDeg: 50 },
      middle: { mcpDeg: 16, pipDeg: 36, dipDeg: 48 },
      ring: { mcpDeg: 19, pipDeg: 41, dipDeg: 53 },
      pinky: { mcpDeg: 22, pipDeg: 44, dipDeg: 57 },
    },
    thumbPose: [25, 42, 54],
  },
};

export const GRIP_ORDER: GripStyle[] = ["palm", "claw", "fingertip"];

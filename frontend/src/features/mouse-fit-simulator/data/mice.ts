import type {
  ModelTransform,
  MouseConfig,
  MouseContactPoints,
  MouseDimensions,
  MouseShapeProfile,
} from "../types";

const DEFAULT_TRANSFORM: ModelTransform = {
  scale: [1, 1, 1],
  rotation: [0, 0, 0],
  position: [0, 0, 0],
};

function makeContactPoints(dimensions: MouseDimensions): MouseContactPoints {
  const length = dimensions.lengthMm / 10;
  const width = dimensions.widthMm / 10;
  const height = dimensions.heightMm / 10;

  return {
    indexTip: [-width * 0.19, height * 0.72, -length * 0.31],
    middleTip: [width * 0.14, height * 0.72, -length * 0.31],
    thumb: [-width * 0.49, height * 0.37, -length * 0.02],
    ringTip: [width * 0.36, height * 0.45, -length * 0.14],
    pinkyTip: [width * 0.49, height * 0.34, length * 0.02],
    palm: [0, height * 0.72, length * 0.17],
  };
}

function createMouse(
  input: Omit<MouseConfig, "modelUrl" | "modelTransform" | "contactPoints"> & {
    modelUrl?: string | null;
    modelTransform?: ModelTransform;
    contactPoints?: MouseContactPoints;
  },
): MouseConfig {
  return {
    ...input,
    modelUrl: input.modelUrl ?? null,
    modelTransform: input.modelTransform ?? DEFAULT_TRANSFORM,
    contactPoints: input.contactPoints ?? makeContactPoints(input.dimensions),
  };
}

const SYMMETRICAL: MouseShapeProfile = {
  frontWidthScale: 0.83,
  rearWidthScale: 0.98,
  humpScale: 1,
  humpShift: 0.08,
  sideBias: 0,
};

export const MOUSE_CONFIGS: MouseConfig[] = [
  createMouse({
    id: "gpx2",
    brand: "Logitech",
    name: "G Pro X Superlight 2",
    dimensions: { lengthMm: 124.2, widthMm: 60.6, heightMm: 39.6 },
    shapeProfile: { ...SYMMETRICAL, humpScale: 1.04, humpShift: 0.12 },
  }),
  createMouse({
    id: "viper-v3-pro",
    brand: "Razer",
    name: "Viper V3 Pro",
    dimensions: { lengthMm: 127.1, widthMm: 63.9, heightMm: 39.9 },
    shapeProfile: { ...SYMMETRICAL, frontWidthScale: 0.88, humpShift: 0.03 },
  }),
  createMouse({
    id: "op1",
    brand: "Endgame Gear",
    name: "OP1",
    dimensions: { lengthMm: 118.2, widthMm: 60.5, heightMm: 37.2 },
    shapeProfile: {
      frontWidthScale: 0.78,
      rearWidthScale: 0.9,
      humpScale: 0.92,
      humpShift: 0.17,
      sideBias: -0.04,
    },
  }),
  createMouse({
    id: "pulsar-x2",
    brand: "Pulsar",
    name: "X2",
    dimensions: { lengthMm: 120, widthMm: 63, heightMm: 38 },
    shapeProfile: {
      frontWidthScale: 0.86,
      rearWidthScale: 1.03,
      humpScale: 1.02,
      humpShift: 0.2,
      sideBias: 0,
    },
  }),
  createMouse({
    id: "custom",
    brand: "Custom",
    name: "Custom Mouse",
    dimensions: { lengthMm: 125, widthMm: 65, heightMm: 40 },
    shapeProfile: {
      frontWidthScale: 0.8,
      rearWidthScale: 1.04,
      humpScale: 1.08,
      humpShift: 0.22,
      sideBias: 0.08,
    },
  }),
];

export const DEFAULT_MOUSE_ID = "gpx2";

export function getMouseConfig(id: string): MouseConfig {
  return MOUSE_CONFIGS.find((mouse) => mouse.id === id) ?? MOUSE_CONFIGS[0];
}

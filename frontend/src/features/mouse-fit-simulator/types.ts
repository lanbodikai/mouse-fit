export type Vector3Tuple = readonly [number, number, number];

export type Handedness = "right" | "left";
export type GripStyle = "palm" | "claw" | "fingertip";
export type CameraView = "perspective" | "top" | "side" | "front" | "free";
export type FingerName = "index" | "middle" | "ring" | "pinky";

export type MouseDimensions = {
  lengthMm: number;
  widthMm: number;
  heightMm: number;
};

export type MouseContactPoints = {
  indexTip: Vector3Tuple;
  middleTip: Vector3Tuple;
  thumb: Vector3Tuple;
  ringTip: Vector3Tuple;
  pinkyTip: Vector3Tuple;
  palm: Vector3Tuple;
};

export type MouseShapeProfile = {
  frontWidthScale: number;
  rearWidthScale: number;
  humpScale: number;
  humpShift: number;
  sideBias: number;
};

export type ModelTransform = {
  scale: Vector3Tuple;
  rotation: Vector3Tuple;
  position: Vector3Tuple;
};

export type MouseConfig = {
  id: string;
  brand: string;
  name: string;
  modelUrl: string | null;
  dimensions: MouseDimensions;
  shapeProfile: MouseShapeProfile;
  modelTransform: ModelTransform;
  contactPoints: MouseContactPoints;
};

export type MouseModelManifestEntry = {
  id: string;
  sourceHandle: string | null;
  brand: string;
  name: string;
  dimensionsMm: {
    lengthMm: number | null;
    widthMm: number | null;
    heightMm: number | null;
  };
  shape: string | null;
  assetUrl: string;
  assetFormat?: "glb" | "gltf" | "stl";
  sourceUrl: string;
  transform: ModelTransform;
};

export type MouseModelManifest = {
  version: number;
  source: string;
  generatedAt: string | null;
  models: MouseModelManifestEntry[];
  failures?: Array<{ id: string; url: string; reason: string }>;
};

export type HandMeasurements = {
  lengthCm: number;
  widthCm: number;
  palmLengthCm: number;
  palmWidthCm: number;
  middleFingerLengthCm: number;
  thumbLengthCm: number;
  fingerThicknessCm: number;
};

export type HandConfiguration = HandMeasurements & {
  handedness: Handedness;
};

export type FingerJointPose = {
  mcpDeg: number;
  pipDeg: number;
  dipDeg: number;
};

export type GripPreset = {
  id: GripStyle;
  label: string;
  description: string;
  tip: string;
  handRootOffset: Vector3Tuple;
  wristRotation: Vector3Tuple;
  fingerSpread: number;
  fingerPoses: Record<FingerName, FingerJointPose>;
  thumbPose: readonly [number, number, number];
};

export type MouseFitState = {
  mouseId: string | null;
  mouseModels: MouseModelManifestEntry[];
  mouseModelsLoaded: boolean;
  hand: HandConfiguration;
  gripStyle: GripStyle;
  showHand: boolean;
  handOpacity: number;
  cameraView: CameraView;
  cameraResetToken: number;
  isInteracting: boolean;
};

export type SimulatorQuerySelection = {
  mouseId: string | null;
  handSizeCm: number;
  gripStyle: GripStyle;
  handedness: Handedness;
};

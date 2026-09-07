import type { SwitchPreset } from "../types";

const unavailableSpecs = {
  imagePath: null,
  modelPath: null,
  initialForceG: null,
  bottomOutForceG: null,
  totalTravelMm: null,
  stemMaterial: null,
  housingMaterial: null,
  compatiblePcbTypes: [] as const,
  specificationStatus: "unverified" as const,
};

export const switchPresets = [
  {
    id: "gateron-magnetic-jade",
    manufacturer: "Gateron",
    name: "Jade Mini",
    description: "KS-33C Hall Effect switch with the supplied Gateron CAD model.",
    visual: { stemColor: "#b9e4c2", housingColor: "#d8eee0", housingOpacity: 0.58 },
    ...unavailableSpecs,
    modelPath: "/models/presets/gateron-low-profile-magnetic-jade-mini.glb",
    modelScale: 0.041,
  },
  {
    id: "gateron-magnetic-jade-pro",
    manufacturer: "Gateron",
    name: "Jade Pro Mini",
    description: "KS-33D full-POM Hall Effect switch with the supplied Gateron CAD model.",
    visual: { stemColor: "#a8d9bd", housingColor: "#d2e9dc", housingOpacity: 0.62 },
    ...unavailableSpecs,
    modelPath: "/models/presets/gateron-low-profile-magnetic-jade-pro-mini.glb",
    modelScale: 0.041,
  },
  {
    id: "gateron-ks20-magnetic-hall-sensor",
    manufacturer: "Gateron",
    name: "KS-20 Hall Sensor",
    description: "Full-size KS-20 Hall Effect switch with the supplied Gateron CAD model.",
    visual: { stemColor: "#d9dce1", housingColor: "#d6dce0", housingOpacity: 0.56 },
    ...unavailableSpecs,
    modelPath: "/models/presets/gateron-ks20-magnetic-hall-sensor.glb",
    modelScale: 0.041,
    modelRotationX: Math.PI,
  },
  {
    id: "gateron-magnetic-jade-ks20",
    manufacturer: "Gateron",
    name: "Magnetic Jade KS-20",
    description: "Full-size KS-20 Magnetic Jade Hall Effect switch with the supplied Gateron CAD model.",
    visual: { stemColor: "#b9e4c2", housingColor: "#8e8144", housingOpacity: 0.58 },
    ...unavailableSpecs,
    modelPath: "/models/presets/gateron-magnetic-jade-ks20.glb",
    modelScale: 0.041,
  },
] satisfies readonly SwitchPreset[];

export const defaultSwitchPreset = switchPresets[0];

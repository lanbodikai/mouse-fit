"use client";

import { Suspense, useMemo, type ReactNode } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Group, Mesh, MeshStandardMaterial, type Object3D } from "three";
import { WOOTING_60HE_V2 } from "../assets/wooting60he";
import { useDeferredDispose } from "../hooks/useDeferredDispose";
import type { KeyboardLayerId } from "../types";
import LayerGroup from "./LayerGroup";

const referenceModelUrl = "/models/presets/wooting-60he-v2-reference.glb";

const layerSources: Record<Exclude<KeyboardLayerId, "keycaps" | "switches">, readonly string[]> = {
  plate: ["60HE-V2_ANSI_SW-PLATE"],
  pcb: ["60HE-V2_SANDWICH-FOAM", "60HE-V2_PET", "60HE-V2_ANSI-PCB", "60HE-V2_TAPE-MOD"],
  case: ["SILICON-PLUG_ASM_ASM", "60HE-V2_BOTTOM-CASE-FOAM", "60HE-V2_BOT-METAL-CASE_REF-ONLY"],
};

const materialColors: Record<Exclude<KeyboardLayerId, "keycaps" | "switches">, string> = {
  plate: "#434950",
  pcb: "#182426",
  case: "#15181c",
};

function makeLayerModel(source: Object3D, names: readonly string[], color: string) {
  const layer = new Group();
  names.forEach((name) => {
    const part = source.getObjectByName(name)?.clone(true);
    if (part) layer.add(part);
  });
  layer.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    child.material = new MeshStandardMaterial({ color, metalness: 0.48, roughness: 0.39 });
  });
  return layer;
}

function CadLayer({
  id,
  baseY,
  source,
}: {
  id: Exclude<KeyboardLayerId, "keycaps" | "switches">;
  baseY: number;
  source: Object3D;
}) {
  const model = useMemo(() => makeLayerModel(source, layerSources[id], materialColors[id]), [id, source]);

  useDeferredDispose(model, (layerModel) => {
      layerModel.traverse((child) => {
        if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) child.material.dispose();
      });
  });

  return (
    <LayerGroup id={id} baseY={baseY}>
      <primitive object={model} scale={WOOTING_60HE_V2.scale} />
    </LayerGroup>
  );
}

function LoadedAssembly({ includeCase }: { includeCase: boolean }) {
  const gltf = useLoader(GLTFLoader, referenceModelUrl);
  return (
    <>
      {includeCase ? <CadLayer id="case" baseY={-1.5} source={gltf.scene} /> : null}
      <CadLayer id="pcb" baseY={-0.7} source={gltf.scene} />
      <CadLayer id="plate" baseY={0.02} source={gltf.scene} />
    </>
  );
}

export default function Wooting60HEAssembly({
  fallback,
  includeCase = true,
}: {
  fallback: ReactNode;
  includeCase?: boolean;
}) {
  return (
    <Suspense fallback={fallback}>
      <LoadedAssembly includeCase={includeCase} />
    </Suspense>
  );
}

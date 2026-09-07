"use client";

import { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { Mesh, MeshPhysicalMaterial, type Object3D } from "three";
import { useDeferredDispose } from "../hooks/useDeferredDispose";
import LayerGroup from "./LayerGroup";
import { useKeyboardVisualizer } from "../store/KeyboardVisualizerStore";

const printedCaseUrl = "/models/cases/3D%20Printed%20Keyboard%20case%20for%20Wooting%2060HE.3mf";
const printedCaseScale = 0.041;

function prepareCase(source: Object3D, color: string) {
  const model = source.clone(true);
  model.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    child.material = new MeshPhysicalMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.12,
      metalness: 0.22,
      roughness: 0.42,
      clearcoat: 0.12,
      clearcoatRoughness: 0.48,
    });
  });
  return model;
}

function LoadedPrintedCase() {
  const source = useLoader(ThreeMFLoader, printedCaseUrl);
  const { caseColor } = useKeyboardVisualizer();
  const model = useMemo(() => prepareCase(source, caseColor), [caseColor, source]);

  useDeferredDispose(model, (caseModel) => {
      caseModel.traverse((child) => {
        if (child instanceof Mesh && child.material instanceof MeshPhysicalMaterial) child.material.dispose();
      });
  });

  return (
    <LayerGroup id="case" baseY={0}>
      <primitive
        object={model}
        position={[-6.0482, -2.216, 2.379]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={printedCaseScale}
      />
    </LayerGroup>
  );
}

export default function WootingPrintedCase() {
  return <LoadedPrintedCase />;
}

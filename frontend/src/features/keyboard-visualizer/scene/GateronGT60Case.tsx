"use client";

import { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { MathUtils, Vector3, type BufferGeometry } from "three";
import { useDeferredDispose } from "../hooks/useDeferredDispose";
import { useKeyboardVisualizer } from "../store/KeyboardVisualizerStore";
import LayerGroup from "./LayerGroup";

const gt60CaseUrl = "/models/cases/obj_1_Keyboard%20Case.stl";
const gt60CaseScale = 0.041;
const gt60PrintRotation = MathUtils.degToRad(46.5);
const gt60PcbSupportHeight = 13.4 * gt60CaseScale;
const gt60VisualFitLift = 0.2;
const pcbBottomY = -1.28 + -5.1 * gt60CaseScale + 0.1;

function prepareGT60Geometry(source: BufferGeometry) {
  const geometry = source.clone();
  geometry.rotateZ(gt60PrintRotation);
  geometry.computeBoundingBox();

  const bounds = geometry.boundingBox;
  if (bounds) {
    const center = bounds.getCenter(new Vector3());
    geometry.translate(-center.x, -center.y, -bounds.min.z);
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export default function GateronGT60Case() {
  const source = useLoader(STLLoader, gt60CaseUrl);
  const { caseColor } = useKeyboardVisualizer();
  const geometry = useMemo(() => prepareGT60Geometry(source), [source]);

  useDeferredDispose(geometry, (caseGeometry) => caseGeometry.dispose());

  return (
    <LayerGroup id="case" baseY={0}>
      <mesh
        geometry={geometry}
        position={[0.206, pcbBottomY - gt60PcbSupportHeight + gt60VisualFitLift, 0.016]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={gt60CaseScale}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color={caseColor}
          emissive={caseColor}
          emissiveIntensity={0.12}
          metalness={0.48}
          roughness={0.34}
          clearcoat={0.18}
          clearcoatRoughness={0.42}
        />
      </mesh>
    </LayerGroup>
  );
}

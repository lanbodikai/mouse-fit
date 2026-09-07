"use client";

import { RoundedBox } from "@react-three/drei";
import LayerGroup from "../scene/LayerGroup";
import { KEYBOARD_DEPTH, KEYBOARD_WIDTH } from "../scene/keyboard-layout";
import { useKeyboardVisualizer } from "../store/KeyboardVisualizerStore";

const MINIMAL_CASE_OFFSET_X = 0.206;
const MINIMAL_CASE_OFFSET_Z = 0.016;
const MINIMAL_CASE_Y = -1.75;
const MINIMAL_CASE_WIDTH = KEYBOARD_WIDTH + 0.5;
const MINIMAL_CASE_DEPTH = KEYBOARD_DEPTH + 0.52;

export default function CaseLayer() {
  const { caseColor } = useKeyboardVisualizer();
  return (
    <LayerGroup id="case" baseY={-1.5}>
      <group position={[MINIMAL_CASE_OFFSET_X, MINIMAL_CASE_Y, MINIMAL_CASE_OFFSET_Z]}>
        <RoundedBox
          args={[MINIMAL_CASE_WIDTH, 0.56, MINIMAL_CASE_DEPTH]}
          radius={0.22}
          smoothness={5}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            color={caseColor}
            metalness={0.72}
            roughness={0.34}
            clearcoat={0.22}
          />
        </RoundedBox>
        <RoundedBox
          args={[KEYBOARD_WIDTH + 0.34, 0.12, KEYBOARD_DEPTH + 0.36]}
          radius={0.17}
          smoothness={4}
          position={[0, 0.3, 0]}
          castShadow
        >
          <meshPhysicalMaterial color={caseColor} metalness={0.82} roughness={0.28} />
        </RoundedBox>
        <mesh position={[0, -0.03, MINIMAL_CASE_DEPTH / 2 + 0.015]}>
          <boxGeometry args={[0.5, 0.16, 0.045]} />
          <meshStandardMaterial color="#050607" roughness={0.74} />
        </mesh>
      </group>
    </LayerGroup>
  );
}

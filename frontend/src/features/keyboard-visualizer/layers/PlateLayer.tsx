"use client";

import { RoundedBox } from "@react-three/drei";
import LayerGroup from "../scene/LayerGroup";
import { KEYBOARD_DEPTH, KEYBOARD_WIDTH, KEY_UNIT } from "../scene/keyboard-layout";

function MetalRail({
  position,
  size,
}: {
  position: [number, number, number];
  size: [number, number, number];
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshPhysicalMaterial color="#25292f" metalness={0.86} roughness={0.32} />
    </mesh>
  );
}

export default function PlateLayer() {
  const verticals = Array.from({ length: 16 }, (_, index) => (
    <MetalRail
      key={`vertical-${index}`}
      position={[-KEYBOARD_WIDTH / 2 + index * KEY_UNIT, 0, 0]}
      size={[0.075, 0.13, KEYBOARD_DEPTH + 0.26]}
    />
  ));
  const horizontals = Array.from({ length: 6 }, (_, index) => (
    <MetalRail
      key={`horizontal-${index}`}
      position={[0, 0, -KEYBOARD_DEPTH / 2 + index * KEY_UNIT]}
      size={[KEYBOARD_WIDTH + 0.26, 0.13, 0.075]}
    />
  ));

  return (
    <LayerGroup id="plate" baseY={0.02}>
      <RoundedBox
        args={[KEYBOARD_WIDTH + 0.52, 0.12, 0.18]}
        radius={0.06}
        smoothness={3}
        position={[0, 0, KEYBOARD_DEPTH / 2 + 0.13]}
        castShadow
      >
        <meshPhysicalMaterial color="#24282e" metalness={0.9} roughness={0.28} />
      </RoundedBox>
      <RoundedBox
        args={[KEYBOARD_WIDTH + 0.52, 0.12, 0.18]}
        radius={0.06}
        smoothness={3}
        position={[0, 0, -KEYBOARD_DEPTH / 2 - 0.13]}
        castShadow
      >
        <meshPhysicalMaterial color="#24282e" metalness={0.9} roughness={0.28} />
      </RoundedBox>
      {verticals}
      {horizontals}
    </LayerGroup>
  );
}

"use client";

import { Instance, Instances, RoundedBox } from "@react-three/drei";
import LayerGroup from "../scene/LayerGroup";
import { KEYBOARD_DEPTH, KEYBOARD_WIDTH, KEY_LAYOUT } from "../scene/keyboard-layout";

export default function PCBLayer() {
  return (
    <LayerGroup id="pcb" baseY={-0.7}>
      <RoundedBox
        args={[KEYBOARD_WIDTH + 0.35, 0.15, KEYBOARD_DEPTH + 0.35]}
        radius={0.12}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial color="#11171a" metalness={0.2} roughness={0.48} />
      </RoundedBox>

      <Instances limit={KEY_LAYOUT.length * 2}>
        <cylinderGeometry args={[0.045, 0.045, 0.032, 12]} />
        <meshPhysicalMaterial color="#b99b57" metalness={0.92} roughness={0.24} />
        {KEY_LAYOUT.flatMap((key) => [
          <Instance key={`pad-a-${key.id}`} position={[key.x - 0.13, 0.095, key.z]} />,
          <Instance key={`pad-b-${key.id}`} position={[key.x + 0.13, 0.095, key.z]} />,
        ])}
      </Instances>

      {[-1.16, -0.39, 0.39, 1.16].map((z) => (
        <mesh key={z} position={[0, 0.086, z]}>
          <boxGeometry args={[KEYBOARD_WIDTH - 0.5, 0.012, 0.014]} />
          <meshStandardMaterial color="#6b5931" roughness={0.58} />
        </mesh>
      ))}
    </LayerGroup>
  );
}

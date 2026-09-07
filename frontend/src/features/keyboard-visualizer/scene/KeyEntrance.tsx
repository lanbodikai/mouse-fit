"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { Group, MathUtils } from "three";
import { keyIntroProgress } from "./assembly-motion";

const KEY_FALL_HEIGHT = 0.86;

type KeyEntranceProps = {
  layer: "switches" | "keycaps";
  keyX: number;
  position: readonly [number, number, number];
  children: ReactNode;
  name?: string;
  userData?: Record<string, unknown>;
};

export default function KeyEntrance({
  layer,
  keyX,
  position,
  children,
  name,
  userData,
}: KeyEntranceProps) {
  const groupRef = useRef<Group>(null);
  const reduceMotion = useReducedMotion();

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const progress = keyIntroProgress(
      clock.elapsedTime,
      layer,
      keyX,
      reduceMotion === true,
    );
    const targetY = position[1] + (1 - progress) * KEY_FALL_HEIGHT;

    if (reduceMotion) {
      group.position.y = position[1];
    } else {
      group.position.y = MathUtils.damp(group.position.y, targetY, 12, delta);
    }

    group.visible = reduceMotion === true || progress > 0.001;
  });

  return (
    <group
      ref={groupRef}
      name={name}
      userData={userData}
      position={[position[0], position[1] + KEY_FALL_HEIGHT, position[2]]}
      visible={reduceMotion === true}
    >
      {children}
    </group>
  );
}

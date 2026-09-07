"use client";

import { useEffect, useMemo } from "react";
import { Object3D } from "three";
import type { GripPreset, HandConfiguration } from "../types";
import { createHandPose } from "./articulated-hand";
import { createHandSurface } from "./hand-surface";

export default function HandModel({ hand, grip, surface, opacity }: {
  hand: HandConfiguration;
  grip: GripPreset;
  surface: Object3D;
  opacity: number;
}) {
  const geometry = useMemo(() => createHandSurface(createHandPose(surface, hand, grip.id)), [surface, hand, grip.id]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        color="#c8b6a3"
        roughness={0.72}
        metalness={0}
        transparent={opacity < 0.999}
        opacity={opacity}
        depthWrite={opacity >= 0.999}
      />
    </mesh>
  );
}

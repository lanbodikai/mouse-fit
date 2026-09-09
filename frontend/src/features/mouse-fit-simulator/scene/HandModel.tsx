"use client";

import { useEffect, useMemo } from "react";
import { Matrix4, Object3D, Quaternion, Vector3 } from "three";
import type { GripPreset, HandConfiguration } from "../types";
import { createHandPose } from "./articulated-hand";
import { createHandSurface } from "./hand-surface";

export default function HandModel({
  hand,
  grip,
  surface,
  opacity,
}: {
  hand: HandConfiguration;
  grip: GripPreset;
  surface: Object3D;
  opacity: number;
}) {
  const pose = useMemo(
    () => createHandPose(surface, hand, grip.id),
    [surface, hand, grip.id],
  );
  const geometry = useMemo(() => createHandSurface(pose), [pose]);
  const nails = useMemo(
    () =>
      pose.digits.map((digit) => {
        const end = digit.joints.at(-1)!;
        const previous = digit.joints.at(-2)!;
        const tangent = end.clone().sub(previous).normalize();
        const dorsal = digit.normal
          .clone()
          .addScaledVector(tangent, -digit.normal.dot(tangent))
          .normalize();
        if (dorsal.lengthSq() < 0.01) dorsal.set(0, 0, -1);
        const across = new Vector3().crossVectors(dorsal, tangent).normalize();
        const rotation = new Quaternion().setFromRotationMatrix(
          new Matrix4().makeBasis(across, dorsal, tangent),
        );
        const length = Math.min(
          end.distanceTo(previous) * 0.55,
          digit.radius * 1.4,
        );
        return {
          name: digit.name,
          radius: digit.radius,
          length,
          rotation,
          position: end
            .clone()
            .addScaledVector(tangent, -length * 0.55)
            .addScaledVector(dorsal, digit.radius * 0.94),
        };
      }),
    [pose],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#c79d83"
          roughness={0.66}
          metalness={0}
          transparent={opacity < 0.999}
          opacity={opacity}
          depthWrite={opacity >= 0.999}
        />
      </mesh>
      {nails.map((nail) => (
        <mesh
          key={nail.name}
          position={nail.position}
          quaternion={nail.rotation}
          scale={[nail.radius * 0.66, nail.radius * 0.1, nail.length * 0.5]}
        >
          <sphereGeometry args={[1, 20, 12]} />
          <meshPhysicalMaterial
            color="#dbc0ac"
            roughness={0.38}
            clearcoat={0.15}
            transparent={opacity < 0.999}
            opacity={opacity}
            depthWrite={opacity >= 0.999}
          />
        </mesh>
      ))}
    </group>
  );
}

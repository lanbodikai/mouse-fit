"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { Box3, Object3D } from "three";

export default function FitRulers({ surface, handLength }: { surface: Object3D; handLength: number }) {
  const bounds = useMemo(() => new Box3().setFromObject(surface, true), [surface]);
  const mouseLength = bounds.max.z - bounds.min.z;
  return <group>
    {[{ length: mouseLength, x: bounds.min.x - 1.2, color: "#87b5d0", label: `Mouse ${mouseLength.toFixed(1)} cm` },
      { length: handLength, x: bounds.min.x - 3, color: "#d4b394", label: `Hand ${handLength.toFixed(1)} cm · extended` }].map((ruler) => (
      <group key={ruler.label}>
        <Line points={[[ruler.x, 0.12, bounds.max.z - ruler.length], [ruler.x, 0.12, bounds.max.z]]} color={ruler.color} lineWidth={1.3} />
        {Array.from({ length: Math.floor(ruler.length) + 1 }, (_, index) => (
          <Line key={index} points={[[ruler.x - 0.16, 0.12, bounds.max.z - index], [ruler.x + 0.16, 0.12, bounds.max.z - index]]} color={ruler.color} lineWidth={1} />
        ))}
      </group>
    ))}
  </group>;
}

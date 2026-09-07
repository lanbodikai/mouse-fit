"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  BufferGeometry,
  Mesh,
  MeshPhysicalMaterial,
  Vector3,
} from "three";
import { KEY_LAYOUT } from "./keyboard-layout";
import KeyEntrance from "./KeyEntrance";
import { useDeferredDispose } from "../hooks/useDeferredDispose";
import type { SwitchPreset } from "../types";

type ModelState =
  | { status: "loading" }
  | { status: "ready"; modelPath: string; geometry: BufferGeometry }
  | { status: "unavailable"; modelPath: string };

const glbModelCache = new Map<string, Promise<BufferGeometry>>();
const switchOffsetY = 0.25;

function loadGlbGeometry(modelPath: string) {
  const cached = glbModelCache.get(modelPath);
  if (cached) return cached;

  const modelPromise = new GLTFLoader().loadAsync(modelPath).then((gltf) => {
    let sourceGeometry: BufferGeometry | null = null;
    gltf.scene.traverse((child) => {
      if (!sourceGeometry && child instanceof Mesh) sourceGeometry = child.geometry;
    });
    if (!sourceGeometry) throw new Error("The switch preset has no renderable mesh.");
    return sourceGeometry;
  });

  glbModelCache.set(modelPath, modelPromise);
  return modelPromise;
}

export async function preloadGateronSwitchModels(modelPaths: readonly (string | null)[]) {
  for (const modelPath of new Set(modelPaths)) {
    if (!modelPath) continue;
    await loadGlbGeometry(modelPath);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }
}

function switchGeometry(source: BufferGeometry, scale: number, rotationX = 0) {
  const geometry = source.clone();
  geometry.computeBoundingBox();
  const center = geometry.boundingBox?.getCenter(new Vector3()) ?? new Vector3();
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.rotateX(-Math.PI / 2 + rotationX);
  geometry.scale(scale, scale, scale);
  geometry.computeBoundingSphere();
  return geometry;
}

function LoadedGateronSwitch({
  geometry: source,
  preset,
}: {
  geometry: BufferGeometry;
  preset: SwitchPreset;
}) {
  const geometry = useMemo(
    () =>
      switchGeometry(
        source,
        preset.modelScale ?? 0.041,
        preset.modelRotationX,
      ),
    [preset.modelRotationX, preset.modelScale, source],
  );
  const material = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: preset.visual.housingColor,
        roughness: 0.25,
        metalness: 0.08,
        clearcoat: 0.16,
        clearcoatRoughness: 0.3,
      }),
    [preset.visual.housingColor],
  );

  useDeferredDispose(geometry, (switchGeometryValue) => switchGeometryValue.dispose());
  useDeferredDispose(material, (switchMaterial) => switchMaterial.dispose());

  return (
    <group dispose={null}>
      {KEY_LAYOUT.map((key) => (
        <KeyEntrance
          key={key.id}
          layer="switches"
          keyX={key.x}
          position={[key.x, switchOffsetY, key.z]}
        >
          <mesh
            geometry={geometry}
            material={material}
            castShadow
            receiveShadow
          />
        </KeyEntrance>
      ))}
    </group>
  );
}

export default function GateronSwitchModel({
  preset,
  fallback,
}: {
  preset: SwitchPreset;
  fallback: ReactNode;
}) {
  const [state, setState] = useState<ModelState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const modelPath = preset.modelPath;
    if (!modelPath) return;

    void loadGlbGeometry(modelPath)
      .then((geometry) => {
        if (!cancelled) setState({ status: "ready", modelPath, geometry });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "unavailable", modelPath });
      });

    return () => {
      cancelled = true;
    };
  }, [preset.modelPath]);

  if (!preset.modelPath || state.status !== "ready" || state.modelPath !== preset.modelPath) return <>{fallback}</>;
  return <LoadedGateronSwitch geometry={state.geometry} preset={preset} />;
}

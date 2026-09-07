"use client";

import { useMemo } from "react";
import {
  BoxGeometry,
  CylinderGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from "three";
import { switchPresets } from "../presets/switch-presets";
import { useDeferredDispose } from "../hooks/useDeferredDispose";
import KeyEntrance from "../scene/KeyEntrance";
import LayerGroup from "../scene/LayerGroup";
import GateronSwitchModel from "../scene/GateronSwitchModel";
import { KEY_LAYOUT } from "../scene/keyboard-layout";
import { useKeyboardVisualizer } from "../store/KeyboardVisualizerStore";

export default function SwitchLayer() {
  const { selectedSwitchId } = useKeyboardVisualizer();
  const preset =
    switchPresets.find((item) => item.id === selectedSwitchId) ?? switchPresets[0];

  return (
    <LayerGroup id="switches" baseY={0.78}>
      <GateronSwitchModel
        preset={preset}
        fallback={<ProceduralSwitch preset={preset} />}
      />
    </LayerGroup>
  );
}

function ProceduralSwitch({
  preset,
}: {
  preset: (typeof switchPresets)[number];
}) {
  const housingGeometry = useMemo(() => new BoxGeometry(0.55, 0.32, 0.55), []);
  const stemGeometry = useMemo(() => new CylinderGeometry(0.115, 0.14, 0.34, 14), []);
  const baseGeometry = useMemo(() => new BoxGeometry(0.43, 0.08, 0.43), []);
  const materials = useMemo(() => {
    const housing = new MeshPhysicalMaterial({
      color: preset.visual.housingColor,
      transparent: true,
      opacity: preset.visual.housingOpacity,
      roughness: 0.24,
      transmission: 0.12,
      thickness: 0.25,
    });
    const stem = new MeshPhysicalMaterial({
      color: preset.visual.stemColor,
      roughness: 0.3,
    });
    const base = new MeshStandardMaterial({ color: "#c9ced1", roughness: 0.48 });
    [housing, stem, base].forEach((material) => {
      material.userData.keyboardBaseOpacity = material.opacity;
      material.userData.keyboardBaseTransparent = material.transparent;
      material.userData.keyboardBaseDepthWrite = material.depthWrite;
    });
    return { housing, stem, base };
  }, [preset.visual.housingColor, preset.visual.housingOpacity, preset.visual.stemColor]);

  useDeferredDispose(housingGeometry, (geometry) => geometry.dispose());
  useDeferredDispose(stemGeometry, (geometry) => geometry.dispose());
  useDeferredDispose(baseGeometry, (geometry) => geometry.dispose());
  useDeferredDispose(materials, ({ housing, stem, base }) => {
    housing.dispose();
    stem.dispose();
    base.dispose();
  });

  return (
    <group>
      {KEY_LAYOUT.map((key) => (
        <KeyEntrance
          key={key.id}
          layer="switches"
          keyX={key.x}
          position={[key.x, 0, key.z]}
        >
          <mesh
            geometry={housingGeometry}
            material={materials.housing}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={stemGeometry}
            material={materials.stem}
            position={[0, 0.3, 0]}
            castShadow
          />
          <mesh
            geometry={baseGeometry}
            material={materials.base}
            position={[0, -0.2, 0]}
            receiveShadow
          />
        </KeyEntrance>
      ))}
    </group>
  );
}

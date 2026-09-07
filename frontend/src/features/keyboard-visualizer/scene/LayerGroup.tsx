"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { Group, MathUtils, type Material, type Object3D } from "three";
import { useKeyboardVisualizer } from "../store/KeyboardVisualizerStore";
import { KEYBOARD_LAYER_ORDER, type KeyboardLayerId } from "../types";
import { assembledLayerY, explodedLayerY, layerDropHeight, layerHorizontalOffset, layerIntroProgress } from "./assembly-motion";

type LayerGroupProps = {
  id: KeyboardLayerId;
  baseY: number;
  children: ReactNode;
};

type MaterialWithOpacity = Material & {
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  userData: {
    keyboardBaseOpacity?: number;
    keyboardBaseTransparent?: boolean;
    keyboardBaseDepthWrite?: boolean;
  };
};

function visitMaterials(object: Object3D, callback: (material: MaterialWithOpacity) => void) {
  object.traverse((child) => {
    if (!("material" in child)) return;
    const materialValue = (child as Object3D & { material: Material | Material[] }).material;
    const materials = Array.isArray(materialValue) ? materialValue : [materialValue];
    materials.forEach((material) => callback(material as MaterialWithOpacity));
  });
}

export default function LayerGroup({ id, children }: LayerGroupProps) {
  const groupRef = useRef<Group>(null);
  const opacityRef = useRef(0);
  const reduceMotion = useReducedMotion();
  const { assemblyProgress, activeLayer, setActiveLayer } = useKeyboardVisualizer();
  const assembledY = assembledLayerY(id);
  const explodedY = explodedLayerY(id);
  const [offsetX, offsetZ] = layerHorizontalOffset(id);
  const isActive = activeLayer === id;
  const layerIndex = KEYBOARD_LAYER_ORDER.indexOf(id);
  const activeLayerIndex = KEYBOARD_LAYER_ORDER.indexOf(activeLayer);
  const isVisibleInHierarchy = layerIndex >= activeLayerIndex;

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    visitMaterials(group, (material) => {
      material.userData.keyboardBaseOpacity ??= material.opacity;
      material.userData.keyboardBaseTransparent ??= material.transparent;
      material.userData.keyboardBaseDepthWrite ??= material.depthWrite;
    });
  }, []);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const intro = layerIntroProgress(clock.elapsedTime, id, reduceMotion === true);
    const layerY = MathUtils.lerp(assembledY, explodedY, assemblyProgress);
    const hierarchyLift = isVisibleInHierarchy
      ? 0
      : 1.45 + (activeLayerIndex - layerIndex) * 0.28;
    const targetY = layerY + (1 - intro) * layerDropHeight(id) + hierarchyLift;
    const targetOpacity = intro * (isVisibleInHierarchy ? 1 : 0);
    const targetScale = isActive && isVisibleInHierarchy ? 1.018 : 1;

    if (reduceMotion) {
      group.position.y = targetY;
      group.scale.setScalar(targetScale);
      opacityRef.current = targetOpacity;
    } else {
      group.position.y = MathUtils.damp(group.position.y, targetY, 5.2, delta);
      const nextScale = MathUtils.damp(group.scale.x, targetScale, 7, delta);
      group.scale.setScalar(nextScale);
      opacityRef.current = MathUtils.damp(opacityRef.current, targetOpacity, 6.4, delta);
    }

    group.visible = opacityRef.current > 0.015;
    visitMaterials(group, (material) => {
      material.userData.keyboardBaseOpacity ??= material.opacity;
      material.userData.keyboardBaseTransparent ??= material.transparent;
      material.userData.keyboardBaseDepthWrite ??= material.depthWrite;
      const baseOpacity = material.userData.keyboardBaseOpacity ?? 1;
      const baseTransparent = material.userData.keyboardBaseTransparent ?? material.transparent;
      const baseDepthWrite = material.userData.keyboardBaseDepthWrite ?? material.depthWrite;
      material.opacity = baseOpacity * opacityRef.current;
      material.transparent = baseTransparent || baseOpacity < 1 || opacityRef.current < 0.999;
      material.depthWrite = baseDepthWrite && baseOpacity > 0.001 && opacityRef.current > 0.35;
    });
  });

  return (
    <group
      ref={groupRef}
      position={[offsetX, assembledY + layerDropHeight(id), offsetZ]}
      visible={reduceMotion === true}
      onClick={(event) => {
        event.stopPropagation();
        setActiveLayer(id);
      }}
    >
      {children}
    </group>
  );
}

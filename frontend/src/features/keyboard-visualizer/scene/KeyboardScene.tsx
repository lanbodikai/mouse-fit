"use client";

import { useEffect, useRef, type ElementRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Color, MathUtils, PerspectiveCamera } from "three";
import { useKeyboardVisualizer } from "../store/KeyboardVisualizerStore";
import KeyboardAssembly from "./KeyboardAssembly";

const CAMERA_POSITION: [number, number, number] = [11.8, 8.7, 13.5];
const MOBILE_CAMERA_POSITION: [number, number, number] = [15.5, 11.5, 18.5];
const CAMERA_TARGET: [number, number, number] = [0, 0.05, 0];

function CameraControls() {
  const controlsRef = useRef<ElementRef<typeof OrbitControls>>(null);
  const { camera, size } = useThree();
  const { cameraResetToken, setInteracting } = useKeyboardVisualizer();

  useEffect(() => {
    const isMobile = size.width < 600;
    camera.position.set(...(isMobile ? MOBILE_CAMERA_POSITION : CAMERA_POSITION));
    if (camera instanceof PerspectiveCamera) {
      camera.setFocalLength(isMobile ? 37.5 : 50.9);
    }
    camera.lookAt(...CAMERA_TARGET);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...CAMERA_TARGET);
      controls.update();
      controls.saveState();
    }
  }, [camera, cameraResetToken, size.width]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      enableZoom={false}
      dampingFactor={0.075}
      minDistance={7.8}
      maxDistance={42}
      minPolarAngle={MathUtils.degToRad(24)}
      maxPolarAngle={MathUtils.degToRad(78)}
      target={CAMERA_TARGET}
      onStart={() => setInteracting(true)}
      onEnd={() => setInteracting(false)}
    />
  );
}

export default function KeyboardScene() {
  const { lightingLevel } = useKeyboardVisualizer();
  const backgroundColor = new Color("#07090c").lerp(new Color("#343b46"), lightingLevel * 0.72);
  const fillIntensity = 0.3 + lightingLevel * 1.05;

  return (
    <Canvas
      dpr={[1, 1.7]}
      camera={{ position: CAMERA_POSITION, fov: 38, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      shadows
    >
      <color attach="background" args={[backgroundColor]} />
      <fog attach="fog" args={[backgroundColor, 17, 32]} />
      <hemisphereLight args={["#dfe4eb", "#090a0c", fillIntensity]} />
      <directionalLight
        castShadow
        position={[7, 11, 8]}
        intensity={0.85 + lightingLevel * 2.2}
        color="#f4f5f7"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-7, 5, -4]} intensity={0.3 + lightingLevel * 1.2} color="#99a7bd" />
      <pointLight position={[0, 1, 7]} intensity={0.8 + lightingLevel * 3.4} distance={17} color="#dce4f0" />

      <KeyboardAssembly />
      <CameraControls />
    </Canvas>
  );
}

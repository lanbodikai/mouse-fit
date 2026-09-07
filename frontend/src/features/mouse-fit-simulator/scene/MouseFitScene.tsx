"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ElementRef,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { MathUtils, MOUSE, Object3D, Vector3 } from "three";
import { GRIP_PRESETS } from "../data/grips";
import { useMouseFitSimulator } from "../store/MouseFitSimulatorStore";
import type { CameraView, Vector3Tuple } from "../types";
import HandModel from "./HandModel";
import ImportedMouseModel from "./ImportedMouseModel";
import FitRulers from "./FitRulers";

const CAMERA_TARGET: Vector3Tuple = [0, 3, -2];
const CAMERA_POSITIONS: Record<Exclude<CameraView, "free">, Vector3Tuple> = {
  perspective: [18, 14, 21],
  top: [0, 36, -1.99],
  side: [32, 8, -2],
  front: [0, 8, 32],
};

function prefersReducedMotion(): boolean {
  return (
    document.documentElement.classList.contains("shell-reduce-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function CameraController() {
  const controlsRef = useRef<ElementRef<typeof OrbitControls>>(null);
  const moving = useRef(false);
  const desiredPosition = useRef(new Vector3(...CAMERA_POSITIONS.perspective));
  const desiredTarget = useRef(new Vector3(...CAMERA_TARGET));
  const { camera, size } = useThree();
  const {
    cameraView,
    cameraResetToken,
    setCameraView,
    setInteracting,
  } = useMouseFitSimulator();

  useEffect(() => {
    if (cameraView === "free") return;
    const position = CAMERA_POSITIONS[cameraView];
    const mobileScale = size.width < 620 ? 1.17 : 1;
    desiredPosition.current.set(
      position[0] * mobileScale,
      position[1] * mobileScale,
      position[2] * mobileScale,
    );
    desiredTarget.current.set(...CAMERA_TARGET);

    const controls = controlsRef.current;
    if (prefersReducedMotion()) {
      camera.position.copy(desiredPosition.current);
      controls?.target.copy(desiredTarget.current);
      controls?.update();
      moving.current = false;
    } else {
      moving.current = true;
    }
  }, [camera, cameraResetToken, cameraView, size.width]);

  useFrame((_, delta) => {
    if (!moving.current) return;
    const controls = controlsRef.current;
    const alpha = 1 - Math.exp(-Math.min(delta, 0.05) * 5.6);
    camera.position.lerp(desiredPosition.current, alpha);
    controls?.target.lerp(desiredTarget.current, alpha);
    controls?.update();

    if (
      camera.position.distanceTo(desiredPosition.current) < 0.025 &&
      (!controls || controls.target.distanceTo(desiredTarget.current) < 0.025)
    ) {
      camera.position.copy(desiredPosition.current);
      controls?.target.copy(desiredTarget.current);
      controls?.update();
      controls?.saveState();
      moving.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.075}
      enablePan
      enableRotate
      enableZoom
      minDistance={10}
      maxDistance={55}
      minPolarAngle={MathUtils.degToRad(2)}
      maxPolarAngle={MathUtils.degToRad(86)}
      target={CAMERA_TARGET}
      mouseButtons={{
        LEFT: MOUSE.ROTATE,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      }}
      onStart={() => {
        moving.current = false;
        setCameraView("free");
        setInteracting(true);
      }}
      onEnd={() => setInteracting(false)}
    />
  );
}

function SceneContent() {
  const [surface, setSurface] = useState<Object3D | null>(null);
  const {
    hand,
    gripStyle,
    showHand,
    handOpacity,
    selectedMouse,
  } = useMouseFitSimulator();
  const grip = GRIP_PRESETS[gripStyle];

  return (
    <>
      {selectedMouse ? <ImportedMouseModel mouse={selectedMouse} onSurfaceReady={setSurface} /> : null}
      {showHand && surface ? (
        <HandModel
          hand={hand}
          grip={grip}
          surface={surface}
          opacity={handOpacity}
        />
      ) : null}
      {surface ? <FitRulers surface={surface} handLength={hand.lengthCm} /> : null}
    </>
  );
}

export default function MouseFitScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: CAMERA_POSITIONS.perspective, fov: 38, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      shadows
    >
      <color attach="background" args={["#090b0f"]} />
      <fog attach="fog" args={["#090b0f", 48, 85]} />
      <hemisphereLight args={["#e2e6ec", "#07080b", 1.2]} />
      <directionalLight
        castShadow
        position={[-7, 13, -8]}
        intensity={2.6}
        color="#f4f5f7"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.00025}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-far={60}
      />
      <directionalLight position={[9, 7, 6]} intensity={1.4} color="#9eacc2" />
      <pointLight position={[0, 8, 11]} intensity={1.25} distance={34} color="#dce4ef" />

      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>

      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial color="#101319" roughness={0.92} metalness={0.04} />
      </mesh>
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.5}
        scale={24}
        blur={2.9}
        far={12}
        resolution={512}
        color="#000000"
      />
      <CameraController />
    </Canvas>
  );
}

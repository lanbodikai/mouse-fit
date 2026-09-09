"use client";

import { RoundedBox } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import {
  BufferGeometry,
  CanvasTexture,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  DoubleSide,
  PlaneGeometry,
  Raycaster,
  SRGBColorSpace,
  Vector3,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useDeferredDispose } from "../hooks/useDeferredDispose";
import KeyEntrance from "../scene/KeyEntrance";
import LayerGroup from "../scene/LayerGroup";
import {
  KEY_GAP,
  KEY_LAYOUT,
  KEY_UNIT,
  type ProceduralKey,
} from "../scene/keyboard-layout";
import { useKeyboardVisualizer } from "../store/KeyboardVisualizerStore";

const keycapProfilesUrl = "/models/presets/cherry-mx-keycap-profiles.glb";
const keycapScale = 0.39;

type ProfileName =
  | "R1_1u"
  | "R1_2u"
  | "R2_1u"
  | "R2_15u"
  | "R3_1u"
  | "R3_175u"
  | "R3_225u"
  | "R4_1u"
  | "R4_225u"
  | "R4_275u"
  | "R5_125u"
  | "Convex_625u";

type PreparedProfile = {
  geometry: BufferGeometry;
  width: number;
  depth: number;
  top: number;
  bottom: number;
};

function profileForKey(key: ProceduralKey): ProfileName {
  switch (key.rowIndex) {
    case 0:
      return key.widthUnits === 2 ? "R1_2u" : "R1_1u";
    case 1:
      return key.widthUnits === 1.5 ? "R2_15u" : "R2_1u";
    case 2:
      if (key.widthUnits === 1.75) return "R3_175u";
      if (key.widthUnits === 2.25) return "R3_225u";
      return "R3_1u";
    case 3:
      if (key.widthUnits === 2.25) return "R4_225u";
      if (key.widthUnits === 2.75) return "R4_275u";
      return "R4_1u";
    default:
      return key.widthUnits === 6.25 ? "Convex_625u" : "R5_125u";
  }
}

function prepareKeycapGeometry(source: BufferGeometry): PreparedProfile {
  const geometry = source.clone();
  geometry.computeBoundingBox();
  const center = geometry.boundingBox?.getCenter(new Vector3()) ?? new Vector3();
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.rotateX(-Math.PI / 2);
  geometry.scale(keycapScale, keycapScale, keycapScale);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const bounds = geometry.boundingBox;

  return {
    geometry,
    width: bounds ? bounds.max.x - bounds.min.x : 1,
    depth: bounds ? bounds.max.z - bounds.min.z : 1,
    top: bounds?.max.y ?? 0.2,
    bottom: bounds?.min.y ?? -0.2,
  };
}

function legendColorFor(background: string) {
  const value = background.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 150 ? "#111419" : "#f7f8fa";
}

function KeyLegend({
  keycap,
  color,
  opacity,
  top,
  glowColor,
  profile,
}: {
  keycap: ProceduralKey;
  color: string;
  opacity: number;
  top: number;
  glowColor: string;
  profile?: PreparedProfile;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context) {
      const fontSize =
        keycap.legend.length > 7 ? 36 : keycap.legend.length > 3 ? 48 : keycap.legend.length > 1 ? 64 : 88;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(
        keycap.legend,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width - 22,
      );
    }

    const legendTexture = new CanvasTexture(canvas);
    legendTexture.colorSpace = SRGBColorSpace;
    legendTexture.minFilter = LinearFilter;
    legendTexture.magFilter = LinearFilter;
    legendTexture.anisotropy = 8;
    return legendTexture;
  }, [keycap.legend]);

  useDeferredDispose(texture, (legendTexture) => legendTexture.dispose());

  const keyWidth = keycap.widthUnits * KEY_UNIT - KEY_GAP;
  const legendWidth = Math.min(Math.max(0.32, keyWidth - 0.16), 0.72);
  const legendHeight = legendWidth / 2;
  const legendGeometry = useMemo(() => {
    const geometry = new PlaneGeometry(legendWidth, legendHeight, 16, 6);
    geometry.rotateX(-Math.PI / 2);
    if (profile) {
      const material = new MeshBasicMaterial({ side: DoubleSide });
      const shell = new Mesh(profile.geometry, material);
      shell.scale.set(keyWidth / profile.width, 1, (KEY_UNIT - KEY_GAP) / profile.depth);
      shell.updateMatrixWorld(true);
      const ray = new Raycaster();
      const positions = geometry.getAttribute("position");
      for (let i = 0; i < positions.count; i++) {
        ray.set(new Vector3(positions.getX(i), top + 1, positions.getZ(i)), new Vector3(0, -1, 0));
        const hit = ray.intersectObject(shell, false)[0];
        positions.setY(i, (hit?.point.y ?? top) + 0.018);
      }
      material.dispose();
    } else geometry.translate(0, top + 0.018, 0);
    geometry.computeVertexNormals();
    return geometry;
  }, [legendWidth, legendHeight, profile, keyWidth, top]);
  useDeferredDispose(legendGeometry, (geometry) => geometry.dispose());

  return (
    <mesh
      name={`key-legend-${keycap.id}`}
      visible={opacity > 0.001}
      geometry={legendGeometry}
      dispose={null}
    >
      <meshStandardMaterial
        map={texture}
        color={legendColorFor(color)}
        emissive={glowColor}
        emissiveMap={texture}
        emissiveIntensity={1.4}
        roughness={0.48}
        metalness={0}
        polygonOffset
        polygonOffsetFactor={-1}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
        userData={{
          keyboardBaseOpacity: opacity,
          keyboardBaseTransparent: true,
          keyboardBaseDepthWrite: false,
        }}
        onUpdate={(material) => {
          material.userData.keyboardBaseOpacity = opacity;
        }}
      />
    </mesh>
  );
}

function KeycapShell({
  keycap,
  profile,
  width,
  depth,
  color,
  opacity,
}: {
  keycap: ProceduralKey;
  profile: PreparedProfile;
  width: number;
  depth: number;
  color: string;
  opacity: number;
}) {
  return (
    <mesh
      name={`key-shell-${keycap.id}`}
      geometry={profile.geometry}
      dispose={null}
      visible={opacity > 0.001}
      scale={[width / profile.width, 1, depth / profile.depth]}
      castShadow={opacity > 0.001}
      receiveShadow
    >
      <meshPhysicalMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity > 0.001}
        roughness={0.62}
        clearcoat={0.035}
        clearcoatRoughness={0.4}
        userData={{
          keyboardBaseOpacity: opacity,
          keyboardBaseTransparent: opacity < 1,
          keyboardBaseDepthWrite: opacity > 0.001,
        }}
        onUpdate={(material) => {
          material.userData.keyboardBaseOpacity = opacity;
          material.userData.keyboardBaseTransparent = opacity < 1;
          material.userData.keyboardBaseDepthWrite = opacity > 0.001;
        }}
      />
    </mesh>
  );
}

function IndividualKeycaps({
  profiles,
  baseGlowColor,
  glowColorsById,
  shellColor,
  shellOpacity,
}: {
  profiles: ReadonlyMap<ProfileName, PreparedProfile>;
  baseGlowColor: string;
  glowColorsById: Readonly<Record<string, string>>;
  shellColor: string;
  shellOpacity: number;
}) {
  return KEY_LAYOUT.map((key) => {
    const profile = profiles.get(profileForKey(key)) ?? profiles.get("R3_1u");
    if (!profile) return null;
    const glowColor = glowColorsById[key.id] ?? baseGlowColor;
    const keyWidth = key.widthUnits * KEY_UNIT - KEY_GAP;
    const keyDepth = KEY_UNIT - KEY_GAP;

    return (
      <KeyEntrance
        key={key.id}
        layer="keycaps"
        keyX={key.x}
        name={`keycap-${key.id}`}
        position={[key.x, 0, key.z]}
        userData={{ keyId: key.id, legend: key.legend }}
      >
        <mesh
          name={`key-glow-${key.id}`}
          position={[0, profile.bottom - 0.035, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[keyWidth + 0.02, keyDepth + 0.02, 1]}
          renderOrder={2}
        >
          <planeGeometry />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={0.5}
            depthWrite={false}
            toneMapped={false}
            userData={{
              keyboardBaseOpacity: 0.5,
              keyboardBaseTransparent: true,
              keyboardBaseDepthWrite: false,
            }}
          />
        </mesh>
        <KeycapShell
          keycap={key}
          profile={profile}
          width={keyWidth}
          depth={keyDepth}
          color={shellColor}
          opacity={shellOpacity}
        />
        <KeyLegend keycap={key} color={shellColor} glowColor={glowColor} opacity={shellOpacity} top={profile.top} profile={profile} />
      </KeyEntrance>
    );
  });
}

function CherryMxKeycapLayer({
  baseGlowColor,
  glowColorsById,
  shellColor,
  shellOpacity,
}: {
  baseGlowColor: string;
  glowColorsById: Readonly<Record<string, string>>;
  shellColor: string;
  shellOpacity: number;
}) {
  const gltf = useLoader(GLTFLoader, keycapProfilesUrl);
  const profiles = useMemo(() => {
    const sourceGeometries = new Map<ProfileName, BufferGeometry>();
    gltf.scene.traverse((child) => {
      if (child instanceof Mesh && child.name) {
        sourceGeometries.set(child.name as ProfileName, child.geometry);
      }
    });

    const prepared = new Map<ProfileName, PreparedProfile>();
    sourceGeometries.forEach((geometry, name) => {
      prepared.set(name, prepareKeycapGeometry(geometry));
    });
    return prepared;
  }, [gltf]);

  useDeferredDispose(
    profiles,
    (preparedProfiles) =>
      preparedProfiles.forEach((profile) => profile.geometry.dispose()),
  );

  return (
    <LayerGroup id="keycaps" baseY={1.72}>
      <IndividualKeycaps
        profiles={profiles}
        baseGlowColor={baseGlowColor}
        glowColorsById={glowColorsById}
        shellColor={shellColor}
        shellOpacity={shellOpacity}
      />
    </LayerGroup>
  );
}

function KeycapFallback({
  baseGlowColor,
  glowColorsById,
  shellColor,
  shellOpacity,
}: {
  baseGlowColor: string;
  glowColorsById: Readonly<Record<string, string>>;
  shellColor: string;
  shellOpacity: number;
}) {
  return (
    <LayerGroup id="keycaps" baseY={1.72}>
      {KEY_LAYOUT.map((key) => {
        const glowColor = glowColorsById[key.id] ?? baseGlowColor;
        const keyWidth = key.widthUnits * KEY_UNIT - KEY_GAP;
        const keyDepth = KEY_UNIT - KEY_GAP;

        return (
          <KeyEntrance
            key={key.id}
            layer="keycaps"
            keyX={key.x}
            name={`keycap-${key.id}`}
            position={[key.x, 0, key.z]}
            userData={{ keyId: key.id, legend: key.legend }}
          >
            <mesh
              position={[0, -0.215, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={[keyWidth + 0.02, keyDepth + 0.02, 1]}
              renderOrder={2}
            >
              <planeGeometry />
              <meshBasicMaterial
                color={glowColor}
                transparent
                opacity={0.5}
                depthWrite={false}
                toneMapped={false}
                userData={{
                  keyboardBaseOpacity: 0.5,
                  keyboardBaseTransparent: true,
                  keyboardBaseDepthWrite: false,
                }}
              />
            </mesh>
            <RoundedBox
              args={[keyWidth, 0.36, keyDepth]}
              radius={0.055}
              smoothness={3}
              visible={shellOpacity > 0.001}
              castShadow={shellOpacity > 0.001}
              receiveShadow
            >
              <meshPhysicalMaterial
                color={shellColor}
                transparent={shellOpacity < 1}
                opacity={shellOpacity}
                depthWrite={shellOpacity > 0.001}
                roughness={0.62}
                clearcoat={0.035}
                clearcoatRoughness={0.45}
                userData={{
                  keyboardBaseOpacity: shellOpacity,
                  keyboardBaseTransparent: shellOpacity < 1,
                  keyboardBaseDepthWrite: shellOpacity > 0.001,
                }}
                onUpdate={(material) => {
                  material.userData.keyboardBaseOpacity = shellOpacity;
                  material.userData.keyboardBaseTransparent = shellOpacity < 1;
                  material.userData.keyboardBaseDepthWrite = shellOpacity > 0.001;
                }}
              />
            </RoundedBox>
            <KeyLegend keycap={key} color={shellColor} glowColor={glowColor} opacity={shellOpacity} top={0.18} />
          </KeyEntrance>
        );
      })}
    </LayerGroup>
  );
}

export default function KeycapLayer() {
  const {
    keycapColor,
    keyGlowColor,
    keyGlowColorsById,
    keycapOpacity,
  } = useKeyboardVisualizer();

  return (
    <Suspense
      fallback={
        <KeycapFallback
          baseGlowColor={keyGlowColor}
          glowColorsById={keyGlowColorsById}
          shellColor={keycapColor}
          shellOpacity={keycapOpacity}
        />
      }
    >
      <CherryMxKeycapLayer
        baseGlowColor={keyGlowColor}
        glowColorsById={keyGlowColorsById}
        shellColor={keycapColor}
        shellOpacity={keycapOpacity}
      />
    </Suspense>
  );
}
